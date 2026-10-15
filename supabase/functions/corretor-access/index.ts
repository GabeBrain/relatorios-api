import { createClient } from 'npm:@supabase/supabase-js@2.105.3';
import { authorizeCorretor } from './core.ts';
const defaultOrigin = 'https://geobrain-relatorios.lovable.app';
Deno.serve(async request => {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = [defaultOrigin, 'http://localhost:5176', ...(Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean)];
  const cors = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : defaultOrigin, Vary: 'Origin', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };
  const reply = (data: unknown, status: number) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (origin && !allowed.includes(origin)) return reply({ error: 'Origem não permitida.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405);
  if (Number(request.headers.get('content-length') ?? 0) > 8192) return reply({ error: 'Solicitação inválida.' }, 413);
  try {
    const text = await request.text(); if (text.length > 8192) return reply({ error: 'Solicitação inválida.' }, 413);
    const body = JSON.parse(text);
    const result = await authorizeCorretor(body, {
      geoLogin: async (email, password) => {
        // URL fixa do contrato versionado: nunca aceitar destino passado pelo cliente.
        const response = await fetch('https://geobrain.com.br/public-api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(20000) });
        if (!response.ok) return null;
        const data = await response.json(); return typeof data.token === 'string' && data.token.trim() ? data.token.trim() : null;
      },
      exchange: async email => {
        const url = Deno.env.get('SUPABASE_URL')!, secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
        const admin = createClient(url, secret, options);
        // Gera prova de login apenas após upstream autorizar as credenciais; não envia email.
        const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
        if (error || !link.properties?.hashed_token) return null;
        const { error: permissionError } = await admin.auth.admin.updateUserById(link.user.id, { app_metadata: { ...link.user.app_metadata, corretor_enabled: true, corretor_geo_until: new Date(Date.now() + 180 * 60 * 1000).toISOString() } });
        if (permissionError) return null;
        const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, options);
        const { data, error: verifyError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
        if (verifyError || !data.session || !data.user?.email || data.user.is_anonymous) return null;
        return { access_token: data.session.access_token, refresh_token: data.session.refresh_token, userEmail: data.user.email };
      },
    });
    return reply(result.data, result.status);
  } catch { return reply({ error: 'Não foi possível concluir o acesso. Tente novamente.' }, 503); }
});
