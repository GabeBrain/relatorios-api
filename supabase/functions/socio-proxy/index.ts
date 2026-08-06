// Edge Function: socio-proxy
// Encaminha somente os endpoints de Sociodemografia para evitar CORS no browser.

const UPSTREAM = 'https://sociodemografia.geobrain.com.br/public-api';
const DEV_ORIGINS = ['http://localhost:8080', 'http://localhost:5173'];
const PRODUCTION_ORIGIN = 'https://geobrain-relatorios.lovable.app';

const ALLOWED_PATHS = new Set([
  '/v1/sociodemografia/populacao-domicilios',
  '/v1/sociodemografia/renda-consumo',
  '/v1/sociodemografia/expansao-urbana',
  '/v1/sociodemografia/area-urbanizada',
  '/v1/sociodemografia/dutovias',
  '/v1/sociodemografia/area-preservacao',
  '/v1/sociodemografia/vazios-urbanos',
  '/v1/sociodemografia/trabalhador',
  '/v1/sociodemografia/indicador-municipio',
  '/v1/sociodemografia/indice-propriedade',
  '/v1/sociodemografia/anos-disponiveis-eu-tr',
]);

function allowedOrigins(): string[] {
  const configured = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [...new Set([...DEV_ORIGINS, PRODUCTION_ORIGIN, ...configured])];
}

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = allowedOrigins();
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : PRODUCTION_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

type ProxyPayload = { path?: unknown; query?: unknown; body?: unknown };

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, corsHeaders);

  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) {
    return json({ error: 'Authorization Bearer é obrigatório.' }, 401, corsHeaders);
  }

  let payload: ProxyPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400, corsHeaders);
  }

  const path = typeof payload.path === 'string' ? payload.path : '';
  if (!ALLOWED_PATHS.has(path)) {
    return json({ error: 'Endpoint de Sociodemografia não permitido.' }, 400, corsHeaders);
  }

  const query = new URLSearchParams();
  if (payload.query && typeof payload.query === 'object' && !Array.isArray(payload.query)) {
    for (const [key, value] of Object.entries(payload.query as Record<string, unknown>)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) value.forEach((item) => query.append(key, String(item)));
      else query.set(key, String(value));
    }
  }

  const upstreamUrl = `${UPSTREAM}${path}${query.size ? `?${query}` : ''}`;
  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload.body ?? {}),
    });

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json');
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return json({ error: 'Não foi possível conectar à API de Sociodemografia.' }, 502, corsHeaders);
  }
});
