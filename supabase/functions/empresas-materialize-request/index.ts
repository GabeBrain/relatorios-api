// Solicitação pública de materialização de Empresas.
// Sem Supabase Auth e sem login: qualquer visitante pode pedir a atualização de UM município.
// A secret EMPRESAS_MATERIALIZER_SECRET nunca sai daqui — o navegador não a recebe nem a envia.
// Só devolve resultado agregado; nunca HMAC, SQL, CNPJ, payload interno ou dados brutos.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const COMPETENCIA = '2026-07-01';
const QUERY_VERSION = 'empresas-pilot-v1';
const METHODOLOGY_VERSION = 'empresas-pilot-methodology-v1';
const SIMPLES_NOTE =
  'Simples/MEI representa o estado cadastral atual da fonte, não uma foto histórica da competência.';

// Limites públicos de abuso/custo.
const IP_WINDOW_MINUTES = 30;
const IP_MAX_REQUESTS = 3;
const GLOBAL_WINDOW_MINUTES = 10;
const GLOBAL_MAX_REQUESTS = 12;
const GLOBAL_MAX_RUNNING = 2;
const PROCESSING_TIMEOUT_MINUTES = 20;

const DEV_ORIGINS = ['http://localhost:8080', 'http://localhost:5173'];
const PRODUCTION_ORIGIN = 'https://geobrain-relatorios.lovable.app';

function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = DEV_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : PRODUCTION_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

class SafeError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Scope = {
  municipality: { ibgeCode: string; name: string; uf: string };
  establishmentsPartition: string;
  companiesPartition: string;
};

function parseScope(raw: unknown): Scope {
  const body = (raw ?? {}) as Record<string, unknown>;
  const municipality = (body.municipality ?? {}) as Record<string, unknown>;
  const allowedKeys = ['municipality', 'establishmentsPartition', 'companiesPartition'];
  if (Object.keys(body).some((key) => !allowedKeys.includes(key))) {
    throw new SafeError('INVALID_PAYLOAD', 400, 'Payload aceita apenas municipality, establishmentsPartition e companiesPartition.');
  }
  if (Object.keys(municipality).some((key) => !['ibgeCode', 'name', 'uf'].includes(key))) {
    throw new SafeError('INVALID_PAYLOAD', 400, 'municipality aceita apenas ibgeCode, name e uf.');
  }
  const ibgeCode = String(municipality.ibgeCode ?? '').trim();
  const name = String(municipality.name ?? '').trim();
  const uf = String(municipality.uf ?? '').trim().toUpperCase();
  const establishmentsPartition = String(body.establishmentsPartition ?? '').trim();
  const companiesPartition = String(body.companiesPartition ?? '').trim();
  if (!/^\d{7}$/.test(ibgeCode)) throw new SafeError('INVALID_SCOPE', 400, 'Código IBGE deve ter 7 dígitos.');
  if (!/^[A-Z]{2}$/.test(uf)) throw new SafeError('INVALID_SCOPE', 400, 'UF deve ter duas letras.');
  if (!name || name.length > 120 || /[;'"\\]/.test(name)) throw new SafeError('INVALID_SCOPE', 400, 'Nome do município inválido.');
  for (const value of [establishmentsPartition, companiesPartition]) {
    if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
      throw new SafeError('INVALID_PARTITION', 400, 'Partições devem estar no formato YYYY-MM-DD.');
    }
  }
  return { municipality: { ibgeCode, name, uf }, establishmentsPartition, companiesPartition };
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const first = forwarded.split(',')[0]?.trim();
  return first || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
}

// Só o hash com sal do lado servidor é persistido — o IP puro nunca é gravado nem devolvido.
async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.', code: 'METHOD_NOT_ALLOWED' }, 405, headers);

  const materializerSecret = Deno.env.get('EMPRESAS_MATERIALIZER_SECRET') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!materializerSecret || !supabaseUrl || !serviceKey) {
    return json({ error: 'Serviço de atualização não configurado.', code: 'NOT_CONFIGURED' }, 500, headers);
  }

  const db = createClient(supabaseUrl, serviceKey);

  try {
    const scope = parseScope(await req.json().catch(() => null));
    const ibge = scope.municipality.ibgeCode;

    // 1) Já publicado? Devolve o que existe, sem custo novo.
    const manifest = await db
      .from('empresas_estab_manifesto')
      .select('id, status, gerado_em, publicado_em, linhas_geradas')
      .eq('id_municipio', ibge)
      .eq('competencia', COMPETENCIA)
      .eq('query_version', QUERY_VERSION)
      .eq('methodology_version', METHODOLOGY_VERSION)
      .maybeSingle();
    if (manifest.error) throw new SafeError('LOOKUP', 500, 'Não foi possível verificar a situação deste município.');

    if (manifest.data?.status === 'ok') {
      return json({
        status: 'published',
        message: 'Este município já possui competência publicada. Nenhuma nova consulta foi disparada.',
        municipality: scope.municipality,
        competencia: COMPETENCIA,
        methodologyNote: SIMPLES_NOTE,
      }, 200, headers);
    }

    // 2) Em processamento? Não inicia uma segunda execução.
    if (manifest.data?.status === 'staging') {
      const startedAt = manifest.data.gerado_em ? Date.parse(String(manifest.data.gerado_em)) : 0;
      const stale = !startedAt || Date.now() - startedAt > PROCESSING_TIMEOUT_MINUTES * 60_000;
      if (!stale) {
        return json({
          status: 'processing',
          message: 'A atualização deste município já está em processamento. Tente novamente em alguns minutos.',
          municipality: scope.municipality,
          competencia: COMPETENCIA,
          methodologyNote: SIMPLES_NOTE,
        }, 200, headers);
      }
    }

    // 3) Limites públicos.
    const ipHash = await hashIp(clientIp(req), materializerSecret);
    const ipCount = await db
      .from('empresas_materialize_pedido')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', minutesAgo(IP_WINDOW_MINUTES));
    if (ipCount.error) throw new SafeError('RATE_LOOKUP', 500, 'Não foi possível validar o limite de solicitações.');
    if ((ipCount.count ?? 0) >= IP_MAX_REQUESTS) {
      return json({
        status: 'rate_limited',
        error: `Limite temporário atingido: até ${IP_MAX_REQUESTS} solicitações a cada ${IP_WINDOW_MINUTES} minutos. Tente novamente mais tarde.`,
        code: 'RATE_LIMITED',
      }, 429, headers);
    }

    const globalCount = await db
      .from('empresas_materialize_pedido')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', minutesAgo(GLOBAL_WINDOW_MINUTES));
    if (globalCount.error) throw new SafeError('RATE_LOOKUP', 500, 'Não foi possível validar o limite de solicitações.');
    if ((globalCount.count ?? 0) >= GLOBAL_MAX_REQUESTS) {
      return json({
        status: 'rate_limited',
        error: 'O serviço está com muitas solicitações agora. Tente novamente em alguns minutos.',
        code: 'RATE_LIMITED_GLOBAL',
      }, 429, headers);
    }

    const running = await db
      .from('empresas_materialize_pedido')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'requested')
      .gte('created_at', minutesAgo(PROCESSING_TIMEOUT_MINUTES));
    if (running.error) throw new SafeError('RATE_LOOKUP', 500, 'Não foi possível validar o limite de solicitações.');
    if ((running.count ?? 0) >= GLOBAL_MAX_RUNNING) {
      return json({
        status: 'rate_limited',
        error: 'Já existem atualizações em andamento. Aguarde a conclusão e tente novamente.',
        code: 'RATE_LIMITED_CONCURRENCY',
      }, 429, headers);
    }

    const pedido = await db
      .from('empresas_materialize_pedido')
      .insert({ ip_hash: ipHash, id_municipio: ibge, competencia: COMPETENCIA, status: 'requested' })
      .select('id')
      .single();
    if (pedido.error || !pedido.data) throw new SafeError('RATE_WRITE', 500, 'Não foi possível registrar a solicitação.');
    const pedidoId = pedido.data.id as string;

    // 4) Chamada interna ao materializador com a secret de servidor.
    let response: Response;
    try {
      response = await fetch(`${supabaseUrl}/functions/v1/empresas-materialize-pilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-empresas-materializer-secret': materializerSecret,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          municipality: scope.municipality,
          establishmentsPartition: scope.establishmentsPartition,
          companiesPartition: scope.companiesPartition,
        }),
      });
    } catch {
      await db.from('empresas_materialize_pedido').update({ status: 'falha' }).eq('id', pedidoId);
      throw new SafeError('MATERIALIZER_NETWORK', 502, 'Não foi possível iniciar a atualização agora.');
    }

    const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || result.ok !== true) {
      await db.from('empresas_materialize_pedido').update({ status: 'falha' }).eq('id', pedidoId);
      console.error(`empresas-materialize-request falhou: ${String(result.code ?? response.status)}`);
      return json({
        status: 'error',
        error: 'A atualização deste município não pôde ser concluída. Tente novamente mais tarde.',
        code: 'MATERIALIZER_FAILED',
      }, 502, headers);
    }

    await db.from('empresas_materialize_pedido').update({ status: 'ok' }).eq('id', pedidoId);

    const manifesto = (result.manifesto ?? {}) as Record<string, unknown>;
    return json({
      status: 'ok',
      message: 'Dados de Empresas atualizados para este município.',
      municipality: scope.municipality,
      competencia: String(manifesto.competencia ?? COMPETENCIA),
      aggregatedRows: Number(result.aggregatedRows ?? 0),
      totalEstabelecimentos: Number(result.totalEstabelecimentos ?? 0),
      methodologyNote: SIMPLES_NOTE,
    }, 200, headers);
  } catch (error) {
    const safe = error instanceof SafeError ? error : new SafeError('INTERNAL_ERROR', 500, 'Falha inesperada na solicitação.');
    console.error(`empresas-materialize-request: ${safe.code}`);
    return json({ status: 'error', error: safe.message, code: safe.code }, safe.status, headers);
  }
});
