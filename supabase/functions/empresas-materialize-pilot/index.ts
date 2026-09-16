// Materializador manual do piloto Empresas.
// Interno: exige o segredo EMPRESAS_MATERIALIZER_SECRET no header x-empresas-materializer-secret.
// Grava somente agregados; nunca CNPJ, razão social, CPF ou payload bruto.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const COMPETENCIA = '2026-07-01';
const QUERY_VERSION = 'empresas-pilot-v1';
const METHODOLOGY_VERSION = 'empresas-pilot-methodology-v1';
const SIMPLES_NOTE =
  'Simples/MEI representa o estado cadastral atual da fonte, não uma foto histórica de julho/2026.';

const CORS = {
  'Access-Control-Allow-Origin': 'https://geobrain-relatorios.lovable.app',
  'Access-Control-Allow-Headers': 'content-type, x-empresas-materializer-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

class SafeError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function proxySignature(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`))));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Scope = {
  municipality: { ibgeCode: string; name: string; uf: string };
  establishmentsPartition: string;
  companiesPartition: string;
};

function parseScope(raw: unknown): Scope {
  const body = (raw ?? {}) as Record<string, any>;
  const municipality = (body.municipality ?? {}) as Record<string, any>;
  const ibgeCode = String(municipality.ibgeCode ?? '').trim();
  const name = String(municipality.name ?? '').trim();
  const uf = String(municipality.uf ?? '').trim().toUpperCase();
  const establishmentsPartition = String(body.establishmentsPartition ?? '').trim();
  const companiesPartition = String(body.companiesPartition ?? '').trim();
  const allowedKeys = ['municipality', 'establishmentsPartition', 'companiesPartition'];
  if (Object.keys(body).some((key) => !allowedKeys.includes(key))) {
    throw new SafeError('INVALID_PAYLOAD', 400, 'Payload aceita apenas municipality, establishmentsPartition e companiesPartition.');
  }
  if (Object.keys(municipality).some((key) => !['ibgeCode', 'name', 'uf'].includes(key))) {
    throw new SafeError('INVALID_PAYLOAD', 400, 'municipality aceita apenas ibgeCode, name e uf.');
  }
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

type AggregatedRow = {
  id_municipio: string;
  cnae_secao: string;
  porte: string;
  matriz_filial: number;
  regime_simples: string;
  quantidade: number;
};

// Conversão de divisão CNAE (dois dígitos) para seção CNAE 2.0.
const CNAE_DIVISAO_SECAO: ReadonlyArray<readonly [number, number, string]> = [
  [1, 3, 'A'], [5, 9, 'B'], [10, 33, 'C'], [35, 35, 'D'], [36, 39, 'E'], [41, 43, 'F'], [45, 47, 'G'],
  [49, 53, 'H'], [55, 56, 'I'], [58, 63, 'J'], [64, 66, 'K'], [68, 68, 'L'], [69, 75, 'M'], [77, 82, 'N'],
  [84, 84, 'O'], [85, 85, 'P'], [86, 88, 'Q'], [90, 93, 'R'], [94, 96, 'S'], [97, 97, 'T'], [99, 99, 'U'],
];

function cnaeDivisaoToSecao(divisao: string): string {
  if (!/^\d{1,2}$/.test(divisao)) return 'ND';
  const numeric = Number(divisao);
  const match = CNAE_DIVISAO_SECAO.find(([min, max]) => numeric >= min && numeric <= max);
  return match ? match[2] : 'ND';
}

function resolveCnaeSecao(row: Record<string, any>): string {
  const rawSecao = String(row.cnaeSecao ?? row.cnae_secao ?? '').trim().toUpperCase();
  if (/^[A-U]$/.test(rawSecao)) return rawSecao;
  const divisao = String(row.cnaeDivisao ?? row.cnae_divisao ?? '').trim();
  return cnaeDivisaoToSecao(divisao);
}

// Porte canônico da tabela = código da Receita Federal (char(2)):
// '00' não informado, '01' Microempresa, '03' EPP, '05' Demais.
const PORTES_VALIDOS = new Set(['00', '01', '03', '05']);

function resolvePorte(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (PORTES_VALIDOS.has(value)) return value;
  const numeric = value.padStart(2, '0');
  if (PORTES_VALIDOS.has(numeric)) return numeric;
  return '00';
}

function normalizeMatrizFilial(raw: unknown): number | null {
  const value = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
  if (value === '1') return 1;
  if (value === '2') return 2;
  return null;
}

function normalizeRows(raw: unknown, expectedIbge: string): { rows: AggregatedRow[]; discarded: number } {
  if (!Array.isArray(raw) || !raw.length) throw new SafeError('PROXY_EMPTY', 502, 'A ponte não retornou linhas agregadas.');
  const rows: AggregatedRow[] = [];
  let discarded = 0;
  for (const item of raw) {
    const row = (item ?? {}) as Record<string, any>;
    const idMunicipio = String(row.idMunicipio ?? row.id_municipio ?? row.municipalityIbge ?? '').trim();
    if (idMunicipio !== expectedIbge) throw new SafeError('MUNICIPALITY_MISMATCH', 502, 'A ponte retornou município diferente do solicitado.');
    const cnaeSecao = resolveCnaeSecao(row);
    const porte = resolvePorte(row.porte);
    const matrizFilial = normalizeMatrizFilial(row.matrizFilial ?? row.matriz_filial);
    const regimeSimples = String(row.regimeSimples ?? row.regime_simples ?? '').trim().toLowerCase();
    const quantidade = Number(row.quantidade ?? row.total ?? row.count);
    const invalid =
      !/^[A-U]$|^ND$/.test(cnaeSecao) ||
      matrizFilial === null ||
      !['mei', 'simples', 'nenhum'].includes(regimeSimples) ||
      !Number.isInteger(quantidade) ||
      quantidade < 0;
    if (invalid) {
      discarded += 1;
      continue;
    }
    rows.push({ id_municipio: idMunicipio, cnae_secao: cnaeSecao, porte, matriz_filial: matrizFilial, regime_simples: regimeSimples, quantidade });
  }
  if (!rows.length) throw new SafeError('PROXY_EMPTY', 502, 'A ponte não retornou nenhuma linha agregada válida.');
  return { rows, discarded };
}

async function callProxy(scope: Scope) {
  const proxyUrl = Deno.env.get('BIGQUERY_PROXY_URL')?.replace(/\/$/, '');
  const secret = Deno.env.get('BIGQUERY_PROXY_HMAC_SECRET')?.trim();
  if (!proxyUrl || !secret) throw new SafeError('PROXY_CONFIGURATION', 500, 'Ponte BigQuery não configurada.');
  const body = JSON.stringify({
    municipality: scope.municipality,
    establishmentsPartition: scope.establishmentsPartition,
    companiesPartition: scope.companiesPartition,
  });
  const timestamp = String(Date.now());
  let response: Response;
  try {
    response = await fetch(`${proxyUrl}/v1/empresas-pilot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Quanti-Timestamp': timestamp,
        'X-Quanti-Signature': await proxySignature(secret, timestamp, body),
      },
      body,
    });
  } catch {
    throw new SafeError('PROXY_NETWORK', 502, 'Não foi possível alcançar a ponte BigQuery.');
  }
  const data = await response.json().catch(() => ({} as Record<string, any>));
  if (response.status === 401) throw new SafeError('PROXY_HMAC_INVALID', 502, 'A ponte recusou a assinatura da requisição.');
  if (!response.ok) throw new SafeError('PROXY_UPSTREAM', 502, 'A ponte BigQuery não concluiu a consulta de Empresas.');
  return data as Record<string, any>;
}

function integerOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.', code: 'METHOD_NOT_ALLOWED' }, 405);

  const expected = Deno.env.get('EMPRESAS_MATERIALIZER_SECRET') ?? '';
  const provided = req.headers.get('x-empresas-materializer-secret') ?? '';
  if (!expected) return json({ error: 'Materializador não configurado.', code: 'MATERIALIZER_NOT_CONFIGURED' }, 500);
  if (!provided || !timingSafeEqual(provided, expected)) {
    return json({ error: 'Chamada não autorizada.', code: 'UNAUTHORIZED' }, 401);
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let manifestoId: string | null = null;

  try {
    const scope = parseScope(await req.json().catch(() => null));

    const manifestoPayload = {
      competencia: COMPETENCIA,
      estabelecimentos_particao: scope.establishmentsPartition,
      empresas_particao: scope.companiesPartition,
      query_version: QUERY_VERSION,
      methodology_version: METHODOLOGY_VERSION,
      status: 'staging',
      erro_codigo: null,
      publicado_em: null,
      gerado_em: new Date().toISOString(),
    };
    const upserted = await db
      .from('empresas_estab_manifesto')
      .upsert(manifestoPayload, { onConflict: 'competencia,query_version,methodology_version' })
      .select('id')
      .single();
    if (upserted.error || !upserted.data) throw new SafeError('MANIFEST_WRITE', 500, 'Não foi possível preparar o manifesto.');
    manifestoId = upserted.data.id as string;

    const started = Date.now();
    const result = await callProxy(scope);
    const { rows, discarded: linhasDescartadas } = normalizeRows(result.rows ?? result.data ?? result.aggregates, scope.municipality.ibgeCode);

    const cleanup = await db.from('empresas_estab_municipio').delete().eq('manifesto_id', manifestoId);
    if (cleanup.error) throw new SafeError('STAGING_CLEANUP', 500, 'Não foi possível limpar a carga anterior.');

    for (let index = 0; index < rows.length; index += 500) {
      const chunk = rows.slice(index, index + 500).map((row) => ({ ...row, manifesto_id: manifestoId }));
      const inserted = await db.from('empresas_estab_municipio').insert(chunk);
      if (inserted.error) throw new SafeError('FACT_WRITE', 500, 'Não foi possível gravar as linhas agregadas.');
    }

    const totalEstabelecimentos = rows.reduce((sum, row) => sum + row.quantidade, 0);
    const source = (result.source ?? {}) as Record<string, any>;
    const published = await db
      .from('empresas_estab_manifesto')
      .update({
        status: 'ok',
        erro_codigo: null,
        linhas_geradas: rows.length,
        bytes_processados: integerOrNull(result.bytesProcessed ?? result.bytes_processed),
        simples_lido_em: new Date().toISOString(),
        origem_estabelecimentos_modificado_em: source.establishmentsModifiedAt ?? null,
        origem_estabelecimentos_linhas: integerOrNull(source.establishmentsRows),
        origem_estabelecimentos_bytes: integerOrNull(source.establishmentsBytes),
        origem_empresas_modificado_em: source.companiesModifiedAt ?? null,
        origem_empresas_linhas: integerOrNull(source.companiesRows),
        origem_empresas_bytes: integerOrNull(source.companiesBytes),
        publicado_em: new Date().toISOString(),
      })
      .eq('id', manifestoId)
      .select('id')
      .single();
    if (published.error) throw new SafeError('PUBLISH', 500, 'As linhas foram gravadas, mas o manifesto não pôde ser publicado.');

    const jobIds = Array.isArray(result.jobIds) ? result.jobIds.filter((item: unknown) => typeof item === 'string') : [];
    return json({
      ok: true,
      manifesto: {
        id: manifestoId,
        competencia: COMPETENCIA,
        estabelecimentosParticao: scope.establishmentsPartition,
        empresasParticao: scope.companiesPartition,
        queryVersion: QUERY_VERSION,
        methodologyVersion: METHODOLOGY_VERSION,
        status: 'ok',
      },
      municipality: scope.municipality,
      aggregatedRows: rows.length,
      linhasDescartadas,
      totalEstabelecimentos,
      bytesProcessed: integerOrNull(result.bytesProcessed ?? result.bytes_processed),
      jobIds,
      durationMs: Date.now() - started,
      methodologyNote: SIMPLES_NOTE,
    }, 200);
  } catch (error) {
    const safe = error instanceof SafeError ? error : new SafeError('INTERNAL_ERROR', 500, 'Falha inesperada na materialização.');
    if (manifestoId) {
      await db.from('empresas_estab_manifesto').update({ status: 'falha', erro_codigo: safe.code, publicado_em: null }).eq('id', manifestoId);
      await db.from('empresas_estab_municipio').delete().eq('manifesto_id', manifestoId);
    }
    console.error(`empresas-materialize-pilot falhou: ${safe.code}`);
    return json({ ok: false, error: safe.message, code: safe.code, manifestoId }, safe.status);
  }
});
