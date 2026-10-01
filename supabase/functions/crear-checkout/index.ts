import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, responder } from '../_shared/cors.ts';
import { verificarTurnstile } from '../_shared/turnstile.ts';

// En Deno hay que usar el HTTP client basado en fetch (no el de Node).
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecret) {
  console.error('crear-checkout: falta STRIPE_SECRET_KEY');
}

const stripe = new Stripe(stripeSecret ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface CheckoutItem {
  product_id: number;
  cantidad: number;
}

interface CheckoutBody {
  items: CheckoutItem[];
  envio: {
    nombreCompleto: string;
    direccion: string;
  };
  captchaToken: string;
}

interface ProductRow {
  id: number;
  name: string;
  price: number;
  stock: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!stripeSecret) {
      return responder(
        { error: 'Stripe no configurado (STRIPE_SECRET_KEY)' },
        500,
      );
    }

    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      console.error('crear-checkout auth failed', authError);
      return responder({ error: 'No autenticado' }, 401);
    }

    const { items, envio, captchaToken } = (await req.json()) as CheckoutBody;

    if (!Array.isArray(items) || items.length === 0) {
      return responder({ error: 'El carrito está vacío' }, 400);
    }

    if (!envio?.nombreCompleto || !envio?.direccion) {
      return responder({ error: 'Datos de envío incompletos' }, 400);
    }

    if (!(await verificarTurnstile(captchaToken))) {
      return responder({ error: 'Captcha inválido' }, 400);
    }

    const productIds = items.map((item) => item.product_id);
    const { data: productos, error: productosError } = await supabase
      .from('products')
      .select('id, name, price, stock')
      .in('id', productIds);

    if (productosError) {
      console.error('products query failed', productosError);
      return responder({ error: 'No se pudieron leer los productos' }, 500);
    }

    if (!productos || productos.length === 0) {
      return responder({ error: 'Productos no encontrados' }, 400);
    }

    const productosMap = new Map<number, ProductRow>(
      (productos as ProductRow[]).map((p) => [Number(p.id), p]),
    );

    for (const item of items) {
      const prod = productosMap.get(Number(item.product_id));
      if (!prod) {
        return responder(
          { error: `Producto no encontrado: ${item.product_id}` },
          400,
        );
      }
      if (Number(prod.stock) < Number(item.cantidad)) {
        return responder({ error: 'Stock insuficiente' }, 409);
      }
    }

    const lineas = items.map((item) => {
      const prod = productosMap.get(Number(item.product_id))!;
      return {
        quantity: Number(item.cantidad),
        price_data: {
          currency: 'pen',
          unit_amount: Math.round(Number(prod.price) * 100),
          product_data: { name: String(prod.name) },
        },
      };
    });

    const total =
      lineas.reduce(
        (acc, linea) => acc + linea.price_data.unit_amount * linea.quantity,
        0,
      ) / 100;

    const { data: venta, error: ventaError } = await supabase
      .from('ventas')
      .insert({
        user_id: user.id,
        total,
        nombre_completo: envio.nombreCompleto,
        direccion: envio.direccion,
        estado: 'pendiente',
      })
      .select()
      .single();

    if (ventaError || !venta) {
      console.error('venta insert failed', ventaError);
      return responder({ error: 'No se pudo crear la venta' }, 500);
    }

    const { error: detalleError } = await supabase.from('detalle_venta').insert(
      items.map((item) => {
        const prod = productosMap.get(Number(item.product_id))!;
        return {
          venta_id: venta.id,
          product_id: item.product_id,
          cantidad: item.cantidad,
          precio_unitario: Number(prod.price),
        };
      }),
    );

    if (detalleError) {
      console.error('detalle_venta insert failed', detalleError);
      return responder({ error: 'No se pudo crear el detalle de venta' }, 500);
    }

    const origen = req.headers.get('origin') ?? 'http://localhost:4200';

    let sesion: Stripe.Checkout.Session;
    try {
      sesion = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineas,
        success_url: `${origen}/pago/exito?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origen}/pago/cancelado`,
        metadata: { venta_id: String(venta.id) },
      });
    } catch (stripeError) {
      console.error('Stripe checkout.sessions.create failed', stripeError);
      const message =
        stripeError instanceof Error
          ? stripeError.message
          : 'Error al crear sesión de Stripe';
      return responder({ error: message }, 500);
    }

    if (!sesion.url) {
      return responder({ error: 'Stripe no devolvió URL de checkout' }, 500);
    }

    const { error: updateError } = await supabase
      .from('ventas')
      .update({ stripe_session_id: sesion.id })
      .eq('id', venta.id);

    if (updateError) {
      console.error('stripe_session_id update failed', updateError);
      return responder({ error: 'No se pudo guardar la sesión de Stripe' }, 500);
    }

    return responder({ url: sesion.url });
  } catch (error) {
    console.error('crear-checkout error', error);
    const message =
      error instanceof Error ? error.message : 'Error interno al crear el checkout';
    return responder({ error: message }, 500);
  }
});
