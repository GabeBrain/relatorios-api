// Edge Function: log-activity
// Registra ações do Studio na tabela activity_log, capturando o IP do
// request no servidor (x-forwarded-for). Escrita via service role — a
// tabela não tem policy de INSERT para anon.
//
// Deploy: supabase functions deploy log-activity

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DEV_ORIGINS = ['http://localhost:8080', 'http://localhost:5173'];

function allowedOrigins(): string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS') ?? '';
  const fromEnv = env.split(',').map((o) => o.trim()).filter(Boolean);
  return [...DEV_ORIGINS, ...fromEnv];
}

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const list = allowedOrigins();
  const allow = list.includes(origin) ? origin : list[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const MAX_LEN = 500;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  let body: { action?: unknown; detail?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }

  if (typeof body.action !== 'string' || body.action.trim().length === 0) {
    return json({ error: 'action é obrigatório.' }, 400);
  }

  const action = body.action.trim().slice(0, MAX_LEN);
  const detail = typeof body.detail === 'string' ? body.detail.trim().slice(0, MAX_LEN) : '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error } = await supabase.from('activity_log').insert({ action, detail, ip });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
