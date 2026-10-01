export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

export function responder(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
