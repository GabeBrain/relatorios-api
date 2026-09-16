import { createClient } from 'jsr:@supabase/supabase-js@2';

const DEV_ORIGINS = ['http://localhost:8080', 'http://localhost:5173'];
const PRODUCTION_ORIGIN = 'https://geobrain-relatorios.lovable.app';

function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = DEV_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(origin);
  return { 'Access-Control-Allow-Origin': allowed ? origin : PRODUCTION_ORIGIN, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
}
function json(data: unknown, status: number, headers: Record<string, string>) { return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } }); }

async function validate(req: Request) {
  const authorization = req.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) throw new Error('UNAUTHORIZED');
  const response = await fetch(Deno.env.get('GEOBRAIN_VALIDATE_URL') ?? 'https://geobrain.com.br/public-api/monitored-cities', { headers: { Authorization: authorization, Accept: 'application/json' } });
  if (!response.ok) throw new Error('UNAUTHORIZED');
}

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.', code: 'METHOD_NOT_ALLOWED' }, 405, headers);
  try {
    await validate(req);
    const body = await req.json();
    const municipalityIbge = String(body?.municipalityIbge ?? '');
    if (!/^\d{7}$/.test(municipalityIbge)) return json({ error: 'Código IBGE inválido.', code: 'INVALID_SCOPE' }, 400, headers);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await db.from('empresas_estab_municipio_publicado').select('*').eq('id_municipio', municipalityIbge).order('competencia', { ascending: false });
    if (error) throw error;
    if (!(data ?? []).length) return json({ available: false, message: 'Ainda não há competência de Empresas publicada para este município.' }, 200, headers);
    const latest = data![0];
    const rows = data!.filter((row: any) => row.manifesto_id === latest.manifesto_id);
    return json({ available: true, meta: { competencia: latest.competencia, source: latest.fonte, queryVersion: latest.query_version, methodologyVersion: latest.methodology_version, simplesReadAt: latest.simples_lido_em }, rows }, 200, headers);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status = code === 'UNAUTHORIZED' ? 401 : 500;
    return json({ error: status === 401 ? 'Sessão GeoBrain não autorizada.' : 'Não foi possível consultar Empresas.', code }, status, headers);
  }
});
