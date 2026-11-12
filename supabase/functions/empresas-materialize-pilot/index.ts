// Materializador manual do piloto Empresas.
// Interno: exige o segredo EMPRESAS_MATERIALIZER_SECRET no header x-empresas-materializer-secret.
// Grava somente agregados; nunca CNPJ, razão social, CPF ou payload bruto.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { empresasMonths, proxyMonthUnavailable } from '../_shared/empresas-fallback.ts';

const DEFAULT_COMPETENCIA = '2026-07-01';
const MAX_MONTHS = 6;
const MAX_PROCESSING_MS = 110_000;
const PROXY_CALL_TIMEOUT_MS = 35_000;
const QUERY_VERSION = 'empresas-pilot-v1';
const METHODOLOGY_VERSION = 'empresas-pilot-methodology-v1';
const SIMPLES_NOTE =
  'Simples/MEI representa o estado cadastral atual da fonte, não uma foto histórica da competência.';

function targetCompetencia(): string {
  const value = Deno.env.get('EMPRESAS_TARGET_COMPETENCIA')?.trim() || DEFAULT_COMPETENCIA;
  if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(value)) throw new SafeError('INVALID_TARGET_COMPETENCIA', 500, 'Competência alvo de Empresas inválida.');
  return value;
}

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
  const rawSecao = String(row.cnaeSecao ?? row.cnae_secao ?? row.cnaeSection ?? '').trim().toUpperCase();
  if (/^[A-U]$/.test(rawSecao)) return rawSecao;
  const divisao = String(row.cnaeDivision ?? row.cnaeDivisao ?? row.cnae_divisao ?? '').trim();
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
  const plain = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (plain.includes('micro') && !plain.includes('pequen')) return '01';
  if (plain.includes('pequen') || plain === 'epp') return '03';
  if (plain.includes('demais') || plain.includes('outros') || plain.includes('medi') || plain.includes('grande')) return '05';
  return '00';
}

function normalizeMatrizFilial(raw: unknown): number | null {
  const value = (typeof raw === 'string' ? raw : String(raw ?? ''))
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!value) return null;
  if (value === '1' || value === 'm' || value === 'true' || value.startsWith('matriz') || value.startsWith('headquarter')) return 1;
  if (value === '2' || value === 'f' || value === 'false' || value.startsWith('filial') || value.startsWith('branch')) return 2;
  return null;
}

function normalizeRegimeSimples(raw: unknown): string | null {
  if (typeof raw === 'boolean') return raw ? 'simples' : 'nenhum';
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!value) return null;
  if (value === 'mei' || value.includes('microempreendedor')) return 'mei';
  if (value === 'simples' || value.includes('simples') || value === 'simple' || value === 'true') return 'simples';
  if (
    ['nenhum', 'none', 'nao', 'n', 'no', 'false', 'outros', 'demais', 'nao optante', 'normal', 'nd', 'nao informado'].includes(value)
  ) {
    return 'nenhum';
  }
  return null;
}

function normalizeQuantidade(raw: unknown): number | null {
  const parsed = typeof raw === 'string' ? Number(raw.trim().replace(/\s/g, '')) : Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

type NormalizeResult = {
  rows: AggregatedRow[];
  discarded: number;
  discardReasons: Record<string, number>;
  observedKeys: string[];
};

function normalizeRows(raw: unknown, expectedIbge: string): NormalizeResult {
  if (!Array.isArray(raw) || !raw.length) throw new SafeError('PROXY_EMPTY', 502, 'A ponte não retornou linhas agregadas.');
  const rows: AggregatedRow[] = [];
  const discardReasons: Record<string, number> = {};
  const observedKeys = Object.keys((raw[0] ?? {}) as Record<string, unknown>).sort();
  const sampleValues: Record<string, string> = {};
  let discarded = 0;
  for (const item of raw) {
    const row = (item ?? {}) as Record<string, any>;
    const idMunicipio = String(row.idMunicipio ?? row.id_municipio ?? row.municipalityIbge ?? '').trim();
    if (idMunicipio !== expectedIbge) throw new SafeError('MUNICIPALITY_MISMATCH', 502, 'A ponte retornou município diferente do solicitado.');
    const cnaeSecao = resolveCnaeSecao(row);
    const porte = resolvePorte(row.companySize ?? row.porte);
    const matrizFilialRaw = row.headquartersOrBranch ?? row.matrizFilial ?? row.matriz_filial;
    const regimeSimplesRaw = row.simpleRegimeCurrent ?? row.regimeSimples ?? row.regime_simples;
    const quantidadeRaw = row.quantity ?? row.quantidade ?? row.total ?? row.count;
    const matrizFilial = normalizeMatrizFilial(matrizFilialRaw);
    const regimeSimples = normalizeRegimeSimples(regimeSimplesRaw);
    const quantidade = normalizeQuantidade(quantidadeRaw);
    const reasons: string[] = [];
    if (!/^[A-U]$|^ND$/.test(cnaeSecao)) reasons.push('cnae_secao');
    if (matrizFilial === null) {
      reasons.push('matriz_filial');
      sampleValues.matriz_filial ??= `${typeof matrizFilialRaw}:${JSON.stringify(matrizFilialRaw ?? null)}`;
    }
    if (regimeSimples === null) {
      reasons.push('regime_simples');
      sampleValues.regime_simples ??= `${typeof regimeSimplesRaw}:${JSON.stringify(regimeSimplesRaw ?? null)}`;
    }
    if (quantidade === null) {
      reasons.push('quantidade');
      sampleValues.quantidade ??= `${typeof quantidadeRaw}:${JSON.stringify(quantidadeRaw ?? null)}`;
    }
    if (reasons.length) {
      discarded += 1;
      for (const reason of reasons) discardReasons[reason] = (discardReasons[reason] ?? 0) + 1;
      continue;
    }
    rows.push({
      id_municipio: idMunicipio,
      cnae_secao: cnaeSecao,
      porte,
      matriz_filial: matrizFilial as number,
      regime_simples: regimeSimples as string,
      quantidade: quantidade as number,
    });
  }
  if (!rows.length) {
    throw new SafeError(
      'PROXY_EMPTY',
      502,
      `A ponte não retornou nenhuma linha agregada válida. Linhas recebidas: ${raw.length}. Campos observados: ${observedKeys.join(', ') || '(nenhum)'}. Descartes por campo: ${JSON.stringify(discardReasons)}. Exemplos de valores rejeitados: ${JSON.stringify(sampleValues)}.`,
    );
  }
  return { rows, discarded, discardReasons, observedKeys };
}

// Reagrupa agregados pela chave canônica da PK
// (manifesto_id, id_municipio, cnae_secao, porte, matriz_filial, regime_simples),
// somando quantidades — evita colisão quando divisões CNAE distintas convergem para a mesma seção.
function mergeAggregatedRows(rows: AggregatedRow[]): AggregatedRow[] {
  const merged = new Map<string, AggregatedRow>();
  for (const row of rows) {
    const key = [row.id_municipio, row.cnae_secao, row.porte, row.matriz_filial, row.regime_simples].join('|');
    const existing = merged.get(key);
    if (existing) {
      existing.quantidade += row.quantidade;
    } else {
      merged.set(key, { ...row });
    }
  }
  return [...merged.values()];
}

async function callProxy(scope: Scope, timeoutMs: number) {
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
      signal: AbortSignal.timeout(timeoutMs),
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
    const target = targetCompetencia();
    if (scope.establishmentsPartition.slice(0, 7) !== target.slice(0, 7) || scope.companiesPartition.slice(0, 7) !== target.slice(0, 7)) {
      throw new SafeError('INVALID_PARTITION', 400, 'As partições não correspondem à competência configurada.');
    }
    const started = Date.now();
    const attemptedCompetencias: string[] = [];

    for (const month of empresasMonths(target, MAX_MONTHS)) {
      const remaining = MAX_PROCESSING_MS - (Date.now() - started);
      if (remaining < 5_000) throw new SafeError('PROCESSING_BUDGET', 503, 'Tempo de consulta de Empresas esgotado.');
      const candidate = { ...scope, establishmentsPartition: month.establishmentsPartition, companiesPartition: month.companiesPartition };
      const existing = await db.from('empresas_estab_manifesto')
        .select('id, status, linhas_geradas')
        .eq('id_municipio', scope.municipality.ibgeCode)
        .eq('competencia', month.competencia)
        .eq('query_version', QUERY_VERSION)
        .eq('methodology_version', METHODOLOGY_VERSION)
        .maybeSingle();
      if (existing.error) throw new SafeError('LOOKUP', 500, 'Não foi possível verificar o manifesto.');
      if (existing.data?.status === 'ok') {
        return json({
          ok: true, reused: true,
          manifesto: { id: existing.data.id, competencia: month.competencia, status: 'ok' },
          municipality: scope.municipality,
          aggregatedRows: existing.data.linhas_geradas,
          targetCompetencia: target,
          attemptedCompetencias,
          methodologyNote: SIMPLES_NOTE,
        }, 200);
      }

      const upserted = await db.from('empresas_estab_manifesto').upsert({
        id_municipio: scope.municipality.ibgeCode,
        competencia: month.competencia,
        estabelecimentos_particao: month.establishmentsPartition,
        empresas_particao: month.companiesPartition,
        query_version: QUERY_VERSION,
        methodology_version: METHODOLOGY_VERSION,
        status: 'staging',
        erro_codigo: null,
        publicado_em: null,
        gerado_em: new Date().toISOString(),
      }, { onConflict: 'id_municipio,competencia,query_version,methodology_version' }).select('id').single();
      if (upserted.error || !upserted.data) throw new SafeError('MANIFEST_WRITE', 500, 'Não foi possível preparar o manifesto.');
      manifestoId = upserted.data.id as string;

      const result = await callProxy(candidate, Math.min(PROXY_CALL_TIMEOUT_MS, remaining));
      let unavailable: boolean;
      try { unavailable = proxyMonthUnavailable(result); }
      catch { throw new SafeError('PROXY_CONTRACT', 502, 'A ponte retornou um formato inesperado.'); }
      if (unavailable) {
        attemptedCompetencias.push(month.competencia);
        console.info(`empresas-materialize-pilot: fonte indisponível em ${month.competencia}: ${String(result.unavailableReason ?? 'empty')}`);
        const failed = await db.from('empresas_estab_manifesto')
          .update({ status: 'falha', erro_codigo: 'SOURCE_UNAVAILABLE', publicado_em: null })
          .eq('id', manifestoId);
        if (failed.error) throw new SafeError('MANIFEST_WRITE', 500, 'Não foi possível registrar a indisponibilidade da fonte.');
        manifestoId = null;
        continue;
      }

      const normalized = normalizeRows(result.rows, scope.municipality.ibgeCode);
      const rows = mergeAggregatedRows(normalized.rows);
      const sourceCount = Number((result.source as Record<string, unknown>).establishmentsRows);
      const normalizedCount = rows.reduce((sum, row) => sum + row.quantidade, 0);
      if (normalized.discarded > 0 || normalizedCount !== sourceCount) {
        throw new SafeError('PROXY_CONTRACT', 502, 'A ponte retornou agregados incompletos.');
      }
      const cleanup = await db.from('empresas_estab_municipio').delete().eq('manifesto_id', manifestoId).eq('id_municipio', scope.municipality.ibgeCode);
      if (cleanup.error) throw new SafeError('STAGING_CLEANUP', 500, 'Não foi possível limpar a carga anterior.');
      for (let index = 0; index < rows.length; index += 500) {
        const chunk = rows.slice(index, index + 500).map((row) => ({ ...row, manifesto_id: manifestoId }));
        const inserted = await db.from('empresas_estab_municipio').insert(chunk);
        if (inserted.error) throw new SafeError('FACT_WRITE', 500, 'Não foi possível gravar as linhas agregadas.');
      }
      const source = (result.source ?? {}) as Record<string, any>;
      const published = await db.from('empresas_estab_manifesto').update({
        status: 'ok', erro_codigo: null, linhas_geradas: rows.length,
        bytes_processados: integerOrNull(result.bytesProcessed ?? result.bytes_processed),
        simples_lido_em: new Date().toISOString(),
        origem_estabelecimentos_modificado_em: source.establishmentsModifiedAt ?? null,
        origem_estabelecimentos_linhas: integerOrNull(source.establishmentsRows),
        origem_estabelecimentos_bytes: integerOrNull(source.establishmentsBytes),
        origem_empresas_modificado_em: source.companiesModifiedAt ?? null,
        origem_empresas_linhas: integerOrNull(source.companiesRows),
        origem_empresas_bytes: integerOrNull(source.companiesBytes),
        publicado_em: new Date().toISOString(),
      }).eq('id', manifestoId).select('id').single();
      if (published.error) throw new SafeError('PUBLISH', 500, 'As linhas foram gravadas, mas o manifesto não pôde ser publicado.');

      const selectedManifestoId = manifestoId;
      manifestoId = null;
      return json({
        ok: true,
        manifesto: {
          id: selectedManifestoId,
          competencia: month.competencia,
          estabelecimentosParticao: month.establishmentsPartition,
          empresasParticao: month.companiesPartition,
          queryVersion: QUERY_VERSION,
          methodologyVersion: METHODOLOGY_VERSION,
          status: 'ok',
        },
        municipality: scope.municipality,
        aggregatedRows: rows.length,
        linhasDescartadas: normalized.discarded,
        motivosDescarte: normalized.discardReasons,
        totalEstabelecimentos: rows.reduce((sum, row) => sum + row.quantidade, 0),
        bytesProcessed: integerOrNull(result.bytesProcessed ?? result.bytes_processed),
        jobIds: Array.isArray(result.jobIds) ? result.jobIds.filter((item: unknown) => typeof item === 'string') : [],
        targetCompetencia: target,
        attemptedCompetencias,
        durationMs: Date.now() - started,
        methodologyNote: SIMPLES_NOTE,
      }, 200);
    }
    throw new SafeError('SOURCE_UNAVAILABLE', 503, 'Nenhuma competência recente de Empresas retornou dados para este município.');
  } catch (error) {
    const safe = error instanceof SafeError ? error : new SafeError('INTERNAL_ERROR', 500, 'Falha inesperada na materialização.');
    if (manifestoId) {
      await db.from('empresas_estab_manifesto').update({ status: 'falha', erro_codigo: safe.code, publicado_em: null }).eq('id', manifestoId);
      await db.from('empresas_estab_municipio').delete().eq('manifesto_id', manifestoId);
      // A falha afeta somente o manifesto deste município; cargas de outras cidades permanecem publicadas.
    }
    console.error(`empresas-materialize-pilot falhou: ${safe.code}`);
    return json({ ok: false, error: safe.message, code: safe.code, manifestoId }, safe.status);
  }
});
