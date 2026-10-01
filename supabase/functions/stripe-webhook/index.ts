import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const firma = req.headers.get('stripe-signature');
  const cuerpo = await req.text();

  if (!firma) {
    return new Response('Firma inválida', { status: 400 });
  }

  let evento: Stripe.Event;
  try {
    evento = await stripe.webhooks.constructEventAsync(
      cuerpo,
      firma,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    console.error('stripe-webhook signature verification failed', error);
    return new Response('Firma inválida', { status: 400 });
  }

  try {
    if (evento.type === 'checkout.session.completed') {
      const session = evento.data.object as Stripe.Checkout.Session;
      const { error } = await supabase.rpc('confirmar_venta', {
        p_session_id: session.id,
      });

      if (error) {
        console.error('confirmar_venta RPC failed', error);
      }
    }

    if (evento.type === 'checkout.session.expired') {
      const session = evento.data.object as Stripe.Checkout.Session;
      const { error } = await supabase
        .from('ventas')
        .update({ estado: 'cancelada' })
        .eq('stripe_session_id', session.id)
        .eq('estado', 'pendiente');

      if (error) {
        console.error('cancel venta update failed', error);
      }
    }
  } catch (error) {
    console.error('stripe-webhook handler error', error);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
