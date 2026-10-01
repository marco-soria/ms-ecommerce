GUIA - SEMANA 10
Flujo de Compra Completo con IA: Captcha, Pagos con Stripe y Registro de Ventas
Curso: Angular de Cero a Experto, Módulo 4, Semana 10 (guía final)
Objetivo: al finalizar esta guía tu e-commerce tendrá un flujo de compra real de punta a punta: el usuario llena sus datos de envío, resuelve un captcha, paga con Stripe, la venta queda registrada en Supabase con su detalle, el stock se descuenta solo cuando el pago se confirma y el usuario puede revisar su historial de compras. Además, la aplicación quedará desplegada en internet con su URL publicada en el repositorio de GitHub. Todo el trabajo sensible (verificar el captcha, crear el pago, confirmar la venta) ocurre en Supabase Edge Functions, nunca en el navegador. Esta guía se trabaja con un agente de IA (Claude Code, Gemini CLI o Copilot en modo agente) usando lo visto en la Sesión 2.
Parte 0: Preparación del Proyecto para Trabajar con IA
0.1 Cómo trabajar esta guía con el agente
Cada parte trae un prompt de partida para el agente, los fragmentos clave que el resultado debe contener y una verificación manual. El agente escribe; tú revisas, pruebas y decides qué se queda.
Regla de trabajo: una parte por conversación, modo plan antes de tocar archivos, commit al terminar cada parte y revisión del diff antes de aceptar. Si el agente da vueltas sin avanzar, detenlo y reformula el prompt.
0.2 Reglas nuevas en CLAUDE.md
Si todavía no lo hiciste en la Sesión 2, ejecuta ng generate ai-config con tu herramienta. Luego agrega al final del archivo de instrucciones estas reglas, que son las que más errores evitan en esta guía:

## Reglas de pagos, captcha y Edge Functions

- Las Edge Functions viven en supabase/functions y corren en Deno.
- En Edge Functions los paquetes se importan con el prefijo npm: (ej. npm:stripe).
- Las claves secretas (STRIPE_SECRET_KEY, TURNSTILE_SECRET_KEY,
  service role de Supabase) solo se configuran con supabase secrets set.
- Nunca escribir claves secretas en environment.ts ni en ningún archivo de Angular.
- El frontend nunca envía precios: el servidor los lee de la tabla product.
- El frontend nunca recibe ni almacena datos de tarjeta: el pago ocurre en Stripe Checkout.
- En Angular las llamadas a Supabase siguen siendo HttpClient directo.

0.3 Supabase CLI y vínculo con tu proyecto
Las Edge Functions se crean y despliegan con el CLI de Supabase. Desde la raíz del proyecto Angular:
npx supabase login
npx supabase init
npx supabase link --project-ref TU_PROJECT_REF

El project ref es el identificador que aparece en la URL de tu proyecto en el dashboard de Supabase. Agrega supabase/.temp y cualquier archivo .env de supabase a tu .gitignore antes del primer commit.
0.4 Cuentas de prueba
Crea una cuenta en Stripe y quédate en modo de prueba (test mode): copia la secret key que empieza con sk_test_. Para el captcha usaremos Cloudflare Turnstile; mientras desarrollas puedes usar las claves de prueba oficiales, que siempre aprueban el desafío:
Site key (frontend): 1x00000000000000000000AA
Secret key (servidor): 1x0000000000000000000000000000000AA

Parte 1: Modelo de Datos de Ventas
1.1 Prompt para el agente
Crea una migración SQL de Supabase con las tablas ventas y detalle_venta
para el e-commerce. ventas guarda usuario, estado (pendiente, pagada,
cancelada), total, datos de envío y el id de sesión de Stripe.
detalle_venta guarda producto, cantidad y precio unitario al momento
de la compra. Activa RLS: cada usuario solo puede leer sus propias
ventas y nadie puede insertar desde el cliente. Muéstrame el plan antes.

1.2 Lo que la migración debe contener
Revisa que el resultado se parezca a esto. Ajusta el tipo de product_id al tipo real de la columna id de tu tabla product.
create table ventas (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id),
estado text not null default 'pendiente'
check (estado in ('pendiente', 'pagada', 'cancelada')),
total numeric(10,2) not null,
nombre_completo text not null,
direccion text not null,
stripe_session_id text unique,
created_at timestamptz not null default now()
);

create table detalle_venta (
id bigint generated always as identity primary key,
venta_id uuid not null references ventas(id) on delete cascade,
product_id bigint not null references product(id),
cantidad int not null check (cantidad > 0),
precio_unitario numeric(10,2) not null
);

1.3 Seguridad a nivel de fila (RLS)
Las políticas solo permiten leer. No hay política de insert ni update: las ventas las crea la Edge Function con la service role, que no está sujeta a RLS.
alter table ventas enable row level security;
alter table detalle_venta enable row level security;

create policy "ver mis ventas" on ventas
for select using (auth.uid() = user_id);

create policy "ver mi detalle" on detalle_venta
for select using (
exists (select 1 from ventas v
where v.id = venta_id and v.user_id = auth.uid())
);

1.4 Confirmar la venta y descontar stock en una sola operación
Cuando Stripe confirme el pago, hay que marcar la venta como pagada y descontar el stock de cada producto. Hacerlo en una función SQL garantiza que ambas cosas ocurran juntas y que una venta no se confirme dos veces si Stripe reenvía el evento.
create or replace function confirmar_venta(p_session_id text)
returns void language plpgsql security definer as $$
declare v_venta ventas%rowtype;
begin
select * into v_venta from ventas
where stripe_session_id = p_session_id for update;
if not found or v_venta.estado <> 'pendiente' then return; end if;

update product p set stock = p.stock - d.cantidad
from detalle_venta d
where d.venta_id = v_venta.id and d.product_id = p.id;

update ventas set estado = 'pagada' where id = v_venta.id;
end; $$;

revoke execute on function confirmar_venta(text) from public, anon, authenticated;

El revoke final es importante: sin él, cualquier usuario podría llamar a confirmar_venta vía /rest/v1/rpc y marcar ventas como pagadas sin pagar. Si el agente no lo incluyó, agrégalo tú.
1.5 Verificando
Aplica la migración (npx supabase db push, o pegando el SQL en el SQL Editor del dashboard) y confirma en Table Editor que ambas tablas aparecen con RLS activado.
Parte 2: Captcha con Cloudflare Turnstile
2.1 Por qué el captcha se valida en el servidor
El widget del captcha entrega un token en el navegador, pero ese token no prueba nada hasta que un servidor lo confirma con Cloudflare usando la secret key. Si la validación se hiciera en Angular, la secret key quedaría expuesta y cualquiera podría saltarse el chequeo.
2.2 Prompt para el agente (Edge Function)
Crea en supabase/functions/_shared dos archivos: cors.ts con los headers
CORS y turnstile.ts con una función verificarTurnstile(token) que valide
el token contra el endpoint siteverify de Cloudflare usando la variable
de entorno TURNSTILE_SECRET_KEY. Luego crea la Edge Function
verificar-captcha que reciba { token } y responda { valido }.

2.3 Lo que debe contener la verificación compartida
// supabase/functions/_shared/turnstile.ts
export async function verificarTurnstile(token: string): Promise<boolean> {
const body = new FormData();
body.append('secret', Deno.env.get('TURNSTILE_SECRET_KEY')!);
body.append('response', token);

const res = await fetch(
'https://challenges.cloudflare.com/turnstile/v0/siteverify',
{ method: 'POST', body }
);
const data = await res.json();
return data.success === true;
}

// supabase/functions/_shared/cors.ts
export const corsHeaders = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function responder(datos: unknown, status = 200) {
return new Response(JSON.stringify(datos), {
status,
headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
}

Con esas dos piezas, la función verificar-captcha queda corta. Toda Edge Function llamada desde el navegador debe responder primero la petición OPTIONS (preflight de CORS):
// supabase/functions/verificar-captcha/index.ts
import { corsHeaders, responder } from '../_shared/cors.ts';
import { verificarTurnstile } from '../_shared/turnstile.ts';

Deno.serve(async (req) => {
if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
const { token } = await req.json();
const valido = await verificarTurnstile(token);
return responder({ valido }, valido ? 200 : 400);
});

La carpeta _shared no se despliega como función: su nombre empieza con guion bajo y sirve para código reutilizable entre funciones. En la Parte 3 la función de pago reutiliza verificarTurnstile().
2.4 Configurando el secreto y desplegando
npx supabase secrets set TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
npx supabase functions deploy verificar-captcha --no-verify-jwt

--no-verify-jwt permite llamar a esta función sin sesión iniciada, porque solo valida un token y no accede a datos del usuario.
2.5 Componente CaptchaComponent en Angular
Carga el script de Turnstile en index.html con render explícito, para que sea el componente quien decida dónde y cuándo dibujar el widget:
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>

El componente dibuja el widget después del primer render y emite el token con output():
declare const turnstile: any;

@Component({
selector: 'app-captcha',
template: `<div #contenedor></div>`,
})
export class CaptchaComponent {
private contenedor = viewChild.required<ElementRef>('contenedor');
tokenGenerado = output<string>();

constructor() {
afterNextRender(() => {
turnstile.render(this.contenedor().nativeElement, {
sitekey: environment.turnstileSiteKey,
callback: (token: string) => this.tokenGenerado.emit(token),
});
});
}
}

La site key es pública y sí va en environment.ts. La secret key nunca.
2.6 Verificando
Coloca temporalmente <app-captcha> en cualquier vista, captura el token emitido y envíalo con HttpClient a /functions/v1/verificar-captcha. Con las claves de prueba la respuesta debe ser { valido: true }. Luego llama a la función con un token inventado y confirma que responde 400.
Reto: agrega a CaptchaComponent un output() de error usando la opción error-callback de turnstile.render(), y muestra un mensaje en la vista cuando el desafío falle.
Importante: verificar-captcha sirve para probar la integración, pero un captcha validado en una función y una acción ejecutada en otra se puede saltar llamando directo a la segunda. La protección real ocurre en la Parte 3, donde la misma función que crea el pago valida el captcha.
Parte 3: Pagos con Stripe Checkout
3.1 El flujo completo
Angular envía a la Edge Function los ids y cantidades del carrito, los datos de envío y el token del captcha. La función valida el captcha, identifica al usuario por su JWT, lee precios y stock reales desde la tabla product, registra la venta como pendiente, crea una sesión de Stripe Checkout y devuelve su URL. Angular redirige al usuario a esa URL y Stripe se encarga de la página de pago.
3.2 Retirando los datos de tarjeta del checkout
En la Semana 8 el sub-grupo pago de checkoutForm tenía numeroTarjeta y cvv. Con Stripe Checkout esos campos desaparecen: tu aplicación nunca debe recibir, validar ni guardar datos de tarjeta. El formulario conserva solo el sub-grupo envio.
Reto: elimina el sub-grupo pago de checkoutForm y sus inputs del template, junto con el validador cruzado de monto de la Semana 8, que ya no aplica porque el total lo calcula el servidor.
3.3 Prompt para el agente (Edge Function)
Crea la Edge Function crear-checkout. Recibe { items: [{ product_id,
cantidad }], envio: { nombreCompleto, direccion }, captchaToken }.
Pasos: validar el captcha con verificarTurnstile de _shared, obtener el
usuario desde el JWT del header Authorization, leer precio y stock de
cada producto desde la tabla product (nunca confiar en precios del
cliente), rechazar si falta stock, insertar la venta pendiente y su
detalle, crear una sesión de Stripe Checkout en moneda pen y guardar el
session id en la venta. Responde { url }. Usa npm:stripe y
npm:@supabase/supabase-js con la service role.

Dentro de la Edge Function sí se usa @supabase/supabase-js: es código de servidor. En Angular seguimos con HttpClient directo.
3.4 Fragmentos clave que debes revisar
Inicialización. SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya existen como variables de entorno en todas las Edge Functions; no hay que configurarlas:
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, responder } from '../_shared/cors.ts';
import { verificarTurnstile } from '../_shared/turnstile.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const supabase = createClient(
Deno.env.get('SUPABASE_URL')!,
Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Usuario y captcha, antes de tocar la base de datos:
const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
const { data: { user } } = await supabase.auth.getUser(jwt);
if (!user) return responder({ error: 'No autenticado' }, 401);

const { items, envio, captchaToken } = await req.json();
if (!(await verificarTurnstile(captchaToken))) {
return responder({ error: 'Captcha inválido' }, 400);
}

Precios desde la base de datos y líneas de Stripe (los montos van en céntimos):
const { data: productos } = await supabase
.from('product').select('id, title, price, stock')
.in('id', items.map((i) => i.product_id));

const lineas = items.map((i) => {
const prod = productos!.find((p) => p.id === i.product_id)!;
return {
quantity: i.cantidad,
price_data: {
currency: 'pen',
unit_amount: Math.round(prod.price * 100),
product_data: { name: prod.title },
},
};
});

Stock y registro de la venta pendiente con su detalle:
const sinStock = items.some((i) =>
productos!.find((p) => p.id === i.product_id)!.stock < i.cantidad
);
if (sinStock) return responder({ error: 'Stock insuficiente' }, 409);

const total = lineas.reduce(
(acc, l) => acc + l.price_data.unit_amount * l.quantity, 0) / 100;

const { data: venta } = await supabase.from('ventas').insert({
user_id: user.id,
total,
nombre_completo: envio.nombreCompleto,
direccion: envio.direccion,
}).select().single();

await supabase.from('detalle_venta').insert(items.map((i) => ({
venta_id: venta.id,
product_id: i.product_id,
cantidad: i.cantidad,
precio_unitario: productos!.find((p) => p.id === i.product_id)!.price,
})));

Sesión de Checkout. origen es la URL de tu app (req.headers.get('origin')), y {CHECKOUT_SESSION_ID} se escribe literal: Stripe lo reemplaza al redirigir.
const sesion = await stripe.checkout.sessions.create({
mode: 'payment',
line_items: lineas,
success_url: `${origen}/pago/exito?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${origen}/pago/cancelado`,
metadata: { venta_id: venta.id },
});

await supabase.from('ventas')
.update({ stripe_session_id: sesion.id }).eq('id', venta.id);

return responder({ url: sesion.url });

Revisa en el código generado que: el captcha se valide antes de insertar nada, exista un chequeo de stock que rechace la compra si no alcanza, el total de la venta se calcule con los precios de la base de datos y que ninguna clave aparezca escrita en el código. Si alguno falta, pídeselo al agente o corrígelo a mano.
3.5 Configurando y desplegando
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_TU_CLAVE
npx supabase functions deploy crear-checkout

Esta función se despliega sin --no-verify-jwt: solo un usuario con sesión iniciada puede crear un pago. Tu interceptor de la Semana 8 ya envía el JWT en el header Authorization.
Parte 4: Confirmación del Pago con Webhook
4.1 Por qué no basta con la página de éxito
Que el usuario llegue a /pago/exito no prueba que pagó: pudo cerrar la pestaña antes de volver, o escribir la URL a mano. Quien confirma el pago es Stripe, enviando un evento firmado a un endpoint tuyo (webhook). Solo ese evento puede marcar la venta como pagada.
4.2 Prompt para el agente
Crea la Edge Function stripe-webhook. Debe leer el body como texto,
verificar la firma del header stripe-signature con
constructEventAsync y STRIPE_WEBHOOK_SECRET (usando
Stripe.createSubtleCryptoProvider porque corre en Deno). Para
checkout.session.completed llama al RPC confirmar_venta con el session
id. Para checkout.session.expired marca la venta como cancelada.
Responde 400 si la firma es inválida y 200 en cualquier otro caso.

4.3 Fragmento clave: la verificación de firma
const firma = req.headers.get('stripe-signature')!;
const cuerpo = await req.text();

let evento;
try {
evento = await stripe.webhooks.constructEventAsync(
cuerpo, firma, Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
undefined, Stripe.createSubtleCryptoProvider()
);
} catch {
return new Response('Firma inválida', { status: 400 });
}

if (evento.type === 'checkout.session.completed') {
await supabase.rpc('confirmar_venta', { p_session_id: evento.data.object.id });
}

El body debe leerse con req.text(), no con req.json(). La firma se calcula sobre el texto exacto que envió Stripe; si lo parseas antes, la verificación falla.
4.4 Registrando el webhook en Stripe
npx supabase functions deploy stripe-webhook --no-verify-jwt

En el dashboard de Stripe (modo de prueba), entra a Developers, Webhooks, agrega un endpoint con la URL https://TU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook y selecciona los eventos checkout.session.completed y checkout.session.expired. Copia el signing secret (empieza con whsec_) y guárdalo:
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_TU_SECRETO

Aquí sí se usa --no-verify-jwt porque quien llama es Stripe, no un usuario. La seguridad la da la verificación de firma.
Parte 5: El Flujo de Compra en Angular
5.1 VentaService
Pídele al agente un servicio con tres métodos: crearCheckout() hacia la Edge Function, obtenerPorSesion() y misVentas() hacia la API REST de Supabase. La base es la misma URL que ya usas en environment.ts.
crearCheckout(items: ItemCarrito[], envio: DatosEnvio, captchaToken: string) {
return this.http.post<{ url: string }>(
`${this.base}/functions/v1/crear-checkout`,
{
items: items.map((i) => ({ product_id: i.id, cantidad: i.cantidad })),
envio,
captchaToken,
}
);
}

obtenerPorSesion(sessionId: string) {
return this.http
.get<Venta[]>(`${this.base}/rest/v1/ventas?stripe_session_id=eq.${sessionId}&select=*,detalle_venta(*)`)
.pipe(map((ventas) => ventas[0]));
}

misVentas() {
return this.http.get<Venta[]>(
`${this.base}/rest/v1/ventas?select=*,detalle_venta(*)&order=created_at.desc`
);
}

Ajusta i.id e i.cantidad a los nombres reales de tu interfaz ItemCarrito de la Semana 8. Observa que solo se envían ids y cantidades, nunca precios.
5.2 Botón de pago en el checkout
Agrega <app-captcha> al final del formulario de checkout y guarda el token en un signal. El botón Pagar con Stripe queda deshabilitado mientras el formulario sea inválido, no haya token o la petición esté en curso. Al recibir la URL, redirige con window.location.href, porque Stripe Checkout es una página externa y no una ruta de Angular.
captchaToken = signal('');
procesando = signal(false);

pagar() {
this.procesando.set(true);
this.ventaService
.crearCheckout(this.cart.itemsCarrito(), this.checkoutForm.value.envio, this.captchaToken())
.subscribe({
next: ({ url }) => (window.location.href = url),
error: () => this.procesando.set(false),
});
}

Reto: muestra en la vista el mensaje de error que devuelve la Edge Function (captcha inválido, stock insuficiente, no autenticado) en lugar de un error genérico.
5.3 Rutas de resultado
Agrega dos rutas lazy-loaded, ambas protegidas con authGuard: pago/exito y pago/cancelado. La de cancelado solo informa y ofrece volver al carrito, que sigue intacto.
5.4 Página de éxito: esperando la confirmación
Al llegar a /pago/exito, el webhook puede tardar unos segundos. La página lee session_id de la URL (withComponentInputBinding de la Semana 5) y consulta la venta cada 2 segundos hasta que deje de estar pendiente, reutilizando los operadores de la Semana 7:
sessionId = input.required<string>({ alias: 'session_id' });

venta = toSignal(
toObservable(this.sessionId).pipe(
switchMap((id) =>
timer(0, 2000).pipe(
switchMap(() => this.ventaService.obtenerPorSesion(id)),
takeWhile((v) => v?.estado === 'pendiente', true)
)
)
)
);

Cuando la venta pase a pagada, vacía el carrito (y con él LocalStorage, gracias al effect() de la Semana 8) y muestra el resumen de la compra.
Reto: resuelve los tres estados con @if como en la Semana 7: procesando pago (con un skeleton o spinner), pago confirmado con el detalle, y un mensaje de ayuda si después de 30 segundos la venta sigue pendiente.
5.5 Mis compras
Crea la ruta mis-compras protegida con authGuard. Lista las ventas del usuario con misVentas(); gracias a RLS la API solo devuelve las suyas, aunque la consulta no filtre por usuario.
Reto: crea un EstadoVentaPipe que convierta pendiente, pagada y cancelada en una etiqueta con estilo distinto, y muestra el detalle de cada venta (producto, cantidad, precio unitario, subtotal) al expandirla.
5.6 Prueba completa del flujo
Con ng serve corriendo y sesión iniciada: agrega productos al carrito, llena el envío, resuelve el captcha y paga en Stripe con la tarjeta de prueba 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC. Confirma en este orden: la página de éxito pasa de procesando a confirmado, el carrito queda vacío, en Supabase la venta figura como pagada con su detalle, el stock de cada producto bajó y la compra aparece en Mis compras.
Prueba también el camino negativo: cancela en la página de Stripe y verifica que el stock no cambió y la venta sigue pendiente. En Stripe, Developers, Webhooks, puedes ver cada evento enviado y su respuesta, útil si algo no se confirma.
Parte 6 (Opcional): Pruebas Generadas con IA
6.1 Tests del VentaService y la página de éxito
Pide al agente los specs de VentaService (con provideHttpClientTesting) y de la página de éxito, incluyendo el caso en que la venta pasa de pendiente a pagada. Antes de aceptarlos, aplica el checklist de revisión de la Sesión 2: que fallen si rompes la lógica, que no llamen a Supabase real, que cubran el camino de error y que no inventen métodos.
Reto: altera a propósito el takeWhile de la página de éxito para que nunca se detenga y confirma que al menos un test generado se pone en rojo. Si ninguno falla, pídele al agente un test que lo detecte.
Parte 7: Despliegue en Vercel o AWS Amplify
7.1 Qué se entrega
El e-commerce debe quedar publicado en internet con el flujo de compra funcionando, desplegado en Vercel o en AWS Amplify según lo visto en clase. La URL del despliegue debe figurar en la sección About del repositorio de GitHub, para que cualquiera que entre al repo pueda abrir la aplicación con un clic.
7.2 Antes de desplegar
Revisa que environment.prod.ts tenga los valores de producción: la URL y la anon key de Supabase y la site key de Turnstile. Todos son valores públicos. Ninguna clave secreta debe estar en el proyecto de Angular; esas viven solo en los secrets de Supabase.
Genera el build de producción en local y confirma que no hay errores antes de subir nada:
ng build

Anota la carpeta de salida que muestra el comando, normalmente dist/NOMBRE_PROYECTO/browser. La necesitarás si la plataforma no la detecta sola.
7.3 Opción A: Vercel
En vercel.com, inicia sesión con GitHub, elige Add New, Project e importa el repositorio. Vercel detecta Angular automáticamente; si te pide el directorio de salida, usa el que anotaste en 7.2. Cada push a la rama principal genera un nuevo despliegue.
Angular maneja las rutas en el navegador, así que al recargar una página como /mis-compras el servidor no encuentra ese archivo y responde 404. Se soluciona redirigiendo todas las rutas a index.html con un vercel.json en la raíz del proyecto:
{
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}

7.4 Opción B: AWS Amplify
En la consola de AWS Amplify, crea una nueva app, elige GitHub como origen y selecciona el repositorio y la rama. Revisa que la configuración de build apunte a la carpeta correcta:
version: 1
frontend:
phases:
preBuild:
commands: - npm ci
build:
commands: - npm run build
artifacts:
baseDirectory: dist/NOMBRE_PROYECTO/browser
files: - '**/*'

Para evitar el mismo 404 al recargar rutas, en Hosting, Rewrites and redirects, agrega una regla de tipo Rewrite (200) que envíe a /index.html todo lo que no sea un archivo estático:
Source: </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>
Target: /index.html
Type: 200 (Rewrite)

7.5 Ajustes después del primer despliegue
La Edge Function crear-checkout arma las URLs de éxito y cancelación con el origen de la petición, así que en producción Stripe devolverá al usuario a tu dominio sin cambios de código. Revisa además:
Si usas claves reales de Turnstile, agrega el dominio del despliegue a la lista de hostnames del widget en Cloudflare; con las claves de prueba no hace falta. Si Supabase Auth tiene configurada una Site URL o URLs de redirección, agrega también el dominio del despliegue.
7.6 La URL en el About de GitHub
En la página principal del repositorio, haz clic en el ícono de engranaje junto a About, pega la URL del despliegue en el campo Website y guarda con Save changes. La URL aparecerá como enlace en la columna derecha del repositorio.
También puedes hacerlo desde la terminal con GitHub CLI:
gh repo edit --homepage https://TU-APP.vercel.app

7.7 Verificando
Abre la URL en una ventana de incógnito y confirma que: el catálogo carga desde Supabase, puedes iniciar sesión, al recargar directamente /mis-compras no aparece un 404, y el flujo de compra completo funciona en producción con la tarjeta de prueba 4242 4242 4242 4242, volviendo a tu dominio y no a localhost.
Reto: agrega al README del repositorio la URL del despliegue, una captura de la app y los pasos para ejecutarla en local.
Checklist de cierre
☐ Reglas de pagos y Edge Functions agregadas al archivo de instrucciones del agente
☐ Supabase CLI vinculado al proyecto y archivos temporales en .gitignore
☐ Tablas ventas y detalle_venta creadas con RLS de solo lectura por usuario
☐ Función confirmar_venta creada y protegida con revoke
☐ Verificación de Turnstile compartida en _shared y función verificar-captcha probada
☐ CaptchaComponent emitiendo el token con output()
☐ Datos de tarjeta eliminados del checkoutForm
☐ Edge Function crear-checkout validando captcha, usuario, precios y stock en el servidor
☐ Ninguna clave secreta en el código de Angular ni en el repositorio
☐ Webhook de Stripe con verificación de firma confirmando la venta
☐ Stock descontado solo cuando el pago se confirma
☐ Botón de pago redirigiendo a Stripe Checkout
☐ Página de éxito esperando la confirmación y vaciando el carrito
☐ Página de cancelado con el carrito intacto
☐ Mis compras listando solo las ventas del usuario
☐ Flujo completo probado con la tarjeta 4242 4242 4242 4242, incluido el camino de cancelación
☐ App desplegada en Vercel o AWS Amplify con el build de producción
☐ Rutas internas funcionando al recargar (rewrite a index.html configurado)
☐ Flujo de compra probado en producción, volviendo al dominio desplegado
☐ URL del despliegue visible en el About del repositorio de GitHub
☐ (Opcional) Tests de VentaService y página de éxito revisados con el checklist de la Sesión 2
