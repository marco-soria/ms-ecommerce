## Reglas de pagos, captcha y Edge Functions

- Las Edge Functions viven en supabase/functions y corren en Deno.
- En Edge Functions los paquetes se importan con el prefijo npm: (ej. npm:stripe).
- Las claves secretas (STRIPE_SECRET_KEY, TURNSTILE_SECRET_KEY, service role de Supabase) solo se configuran con supabase secrets set.
- Nunca escribir claves secretas en environment.ts ni en ningún archivo de Angular.
- El frontend nunca envía precios: el servidor los lee de la tabla products.
- El frontend nunca recibe ni almacena datos de tarjeta: el pago ocurre en Stripe Checkout.
- En Angular las llamadas a Supabase siguen siendo HttpClient directo.

## Mapeo de Base de Datos Real

- La tabla de productos se llama exactamente: products
- El id de products es de tipo: bigint (int8)
- El campo del nombre del producto es: name
- El campo del stock es: stock
- El campo del precio es: price
