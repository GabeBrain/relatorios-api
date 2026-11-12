// Edge Function: validacao-fechamento-approvals
// Leitura e inclusão imutável de aprovações da Validação do Fechamento.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DEV_ORIGINS = ['http://localhost:8080', 'http://localhost:5173'];
const GEO_API_URL = Deno.env.get('GEOBRAIN_VALIDATE_URL') ?? 'https://geobrain.com.br/public-api/monitored-cities';

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const configured = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  const allowed = [...DEV_ORIGINS, ...configured];
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function isText(value: unknown, max = 1000): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

async function hasValidGeoToken(request: Request): Promise<boolean> {
  const authorization = request.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) return false;
  try {
    const response = await fetch(GEO_API_URL, { headers: { Authorization: authorization, Accept: 'application/json' } });
    return response.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  const cors = corsHeadersFor(request);
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (!(await hasValidGeoToken(request))) return json({ error: 'Autenticação GeoBrain inválida ou expirada.' }, 401);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  if (body.action === 'list') {
    if (!Array.isArray(body.cities) || body.cities.length > 10 || !body.cities.every((city) => isText(city, 160))) return json({ error: 'Cidades inválidas.' }, 400);
    const { data, error } = await db.from('validacao_fechamento_aprovacoes').select('*').in('city', body.cities.map((city) => city.trim()));
    if (error) return json({ error: error.message }, 500);
    return json({ approvals: data ?? [] });
  }

  if (body.action !== 'approve') return json({ error: 'Ação inválida.' }, 400);
  const fields = ['approval_key', 'city', 'building_id', 'typology_id', 'period', 'field', 'divergence', 'rule', 'approved_by_email'] as const;
  if (!fields.every((field) => isText(body[field], field === 'approval_key' ? 3000 : 1000))) return json({ error: 'Dados de aprovação inválidos.' }, 400);
  const approvedByEmail = (body.approved_by_email as string).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approvedByEmail)) return json({ error: 'E-mail de autenticação inválido.' }, 400);

  const record = Object.fromEntries(fields.map((field) => {
    const value = body[field] as string;
    return [field, field === 'approved_by_email' ? approvedByEmail : value.trim()];
  }));
  const { data, error } = await db.from('validacao_fechamento_aprovacoes').insert(record).select('*').single();
  if (error?.code === '23505') {
    const { data: existing, error: existingError } = await db.from('validacao_fechamento_aprovacoes').select('*').eq('approval_key', record.approval_key).single();
    if (existingError) return json({ error: existingError.message }, 500);
    return json({ approval: existing, alreadyApproved: true });
  }
  if (error) return json({ error: error.message }, 500);
  return json({ approval: data, alreadyApproved: false }, 201);
});
