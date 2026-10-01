/**
 * Valida un token de Cloudflare Turnstile contra siteverify.
 * Cloudflare espera application/x-www-form-urlencoded (no JSON).
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verificarTurnstile(token: string): Promise<boolean> {
  const responseToken = token?.trim();
  if (!responseToken) {
    console.error('verificarTurnstile: token vacío');
    return false;
  }

  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')?.trim();
  if (!secret) {
    console.error(
      'verificarTurnstile: falta TURNSTILE_SECRET_KEY. Ejecuta: npx supabase secrets set TURNSTILE_SECRET_KEY=...',
    );
    return false;
  }

  // URLSearchParams → application/x-www-form-urlencoded (más fiable en Deno que FormData)
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', responseToken);

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );

    const data = (await res.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    if (!data.success) {
      console.error(
        'verificarTurnstile: Cloudflare rechazó el token',
        data['error-codes'] ?? data,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('verificarTurnstile: error de red', error);
    return false;
  }
}
