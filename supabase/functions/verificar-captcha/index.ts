import { corsHeaders, responder } from '../_shared/cors.ts';
import { verificarTurnstile } from '../_shared/turnstile.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    const valido = await verificarTurnstile(token);
    return responder({ valido }, valido ? 200 : 400);
  } catch (error) {
    console.error('verificar-captcha error', error);
    return responder({ valido: false, error: 'Solicitud inválida' }, 400);
  }
});
