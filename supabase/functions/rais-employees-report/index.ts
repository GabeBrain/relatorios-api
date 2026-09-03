// Empregados V1: GeoBrain Bearer -> snapshot RAIS agregado -> Supabase.
// Empresas não tem endpoint, tabela ou caminho de execução nesta função.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SOURCE = 'RAIS · Base dos Dados · BigQuery';
const QUERY_VERSION = 'rais-employees-v1';
const METHODOLOGY_VERSION = 'rais-employees-methodology-v1';
const APP_VERSION = 'employees-v1';
const DEV_ORIGINS = ['http://localhost:8080', 'http://localhost:5173'];
const PRODUCTION_ORIGIN = 'https://geobrain-relatorios.lovable.app';
const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_QUERY_BYTES = BigInt(Deno.env.get('BIGQUERY_MAX_BYTES_BILLED') ?? '5000000000');

const SECTOR_NAMES: Record<string, string> = {
  '1': 'Extração Mineral', '2': 'Ind. Minerais não Metálicos', '3': 'Ind. Metalúrgica', '4': 'Ind. Mecânica',
  '5': 'Ind. Material Elétrico e Comunicações', '6': 'Ind. Material de Transporte', '7': 'Ind. Madeira e Mobiliário',
  '8': 'Ind. Papel e Gráfica', '9': 'Ind. Borracha, Fumo, Couros e Diversas', '10': 'Ind. Química',
  '11': 'Ind. Têxtil', '12': 'Ind. Calçados', '13': 'Ind. Alimentação e Bebidas', '14': 'Serviços de Utilidade Pública',
  '15': 'Construção Civil', '16': 'Comércio Varejista', '17': 'Comércio Atacadista', '18': 'Instituições Financeiras',
  '19': 'Comércio e Administração de Imóveis', '20': 'Transportes e Comunicações', '21': 'Alojamento e Alimentação',
  '22': 'Serviços Médicos, Odontológicos e Veterinários', '23': 'Ensino', '24': 'Administração Pública', '25': 'Agropecuária',
};

let yearsCache: { expiresAt: number; years: number[] } | null = null;
let googleAccessToken: { token: string; expiresAt: number } | null = null;

function origins(): string[] {
  return [...new Set([...DEV_ORIGINS, PRODUCTION_ORIGIN, ...(Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((v) => v.trim()).filter(Boolean)])];
}

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': origins().includes(origin) ? origin : PRODUCTION_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 240) : 'Erro inesperado na consulta.';
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function integer(value: unknown): number { return Math.max(0, Math.round(toNumber(value) ?? 0)); }
function text(value: unknown, fallback = 'Não informado'): string { return String(value ?? '').trim() || fallback; }

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlText(value: string): string {
  return base64Url(new TextEncoder().encode(value));
}

function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function sha256(value: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function tokenClaims(token: string): { subject: string; email: string | null } {
  try {
    const part = token.split('.')[1];
    if (!part) return { subject: '', email: null };
    const decoded = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - part.length % 4) % 4)));
    return { subject: typeof decoded.sub === 'string' ? decoded.sub : '', email: typeof decoded.email === 'string' ? decoded.email : null };
  } catch { return { subject: '', email: null }; }
}

async function authenticateGeoBrain(req: Request): Promise<{ id: string; email: string | null; ipHash: string }> {
  const authorization = req.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) throw new HttpError('Authorization Bearer é obrigatório.', 401, 'UNAUTHORIZED');
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  const validationUrl = Deno.env.get('GEOBRAIN_VALIDATE_URL') ?? 'https://geobrain.com.br/public-api/monitored-cities';
  let response: Response;
  try {
    response = await fetch(validationUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  } catch { throw new HttpError('Não foi possível validar a sessão GeoBrain.', 502, 'AUTH_UPSTREAM'); }
  if (response.status === 401 || response.status === 403) throw new HttpError('Token GeoBrain inválido ou expirado.', response.status, 'UNAUTHORIZED');
  if (!response.ok) throw new HttpError('O serviço GeoBrain não confirmou a sessão.', 502, 'AUTH_UPSTREAM');
  const claims = tokenClaims(token);
  const tokenHash = await sha256(token);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return { id: claims.subject || `token:${tokenHash.slice(0, 32)}`, email: claims.email, ipHash: (await sha256(ip)).slice(0, 32) };
}

class HttpError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}

class BigQueryError extends Error {
  constructor(message: string, public code = 'BIGQUERY_ERROR', public bytesProcessed: number | null = null) { super(message); }
}

function dbClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function enforceRateLimit(supabase: ReturnType<typeof dbClient>, requesterId: string): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const result = await supabase.from('rais_employee_query_runs').select('id', { count: 'exact', head: true }).eq('requester_id', requesterId).gte('created_at', since);
  if (result.error) throw new HttpError('Não foi possível verificar o limite de consultas.', 503, 'RATE_LIMIT_UNAVAILABLE');
  if ((result.count ?? 0) >= MAX_REQUESTS_PER_WINDOW) throw new HttpError('Limite de consultas atingido. Aguarde alguns minutos.', 429, 'RATE_LIMIT');
}

async function googleToken(): Promise<string> {
  if (googleAccessToken && googleAccessToken.expiresAt > Date.now() + 60_000) return googleAccessToken.token;
  const email = Deno.env.get('GCP_SERVICE_ACCOUNT_EMAIL');
  const privateKey = Deno.env.get('GCP_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new BigQueryError('Credenciais do BigQuery não configuradas.', 'CONFIGURATION');
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlText(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/bigquery', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const input = `${header}.${payload}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
  const assertion = `${input}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.access_token !== 'string') throw new BigQueryError('Não foi possível obter acesso ao BigQuery.', 'GOOGLE_AUTH');
  googleAccessToken = { token: data.access_token, expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

interface QueryResult { rows: Record<string, unknown>[]; jobId: string; bytesProcessed: number | null; bytesBilled: number | null; }

function rowObjects(payload: any): Record<string, unknown>[] {
  const fields = (payload.schema?.fields ?? []).map((field: any) => field.name);
  return (payload.rows ?? []).map((row: any) => Object.fromEntries((row.f ?? []).map((field: any, index: number) => [fields[index], field.v ?? null])));
}

async function runQuery(sql: string, parameters: Array<{ name: string; type: string; value: string | number }>, maxBytes = MAX_QUERY_BYTES): Promise<QueryResult> {
  const project = Deno.env.get('GCP_PROJECT_ID');
  const location = Deno.env.get('BIGQUERY_LOCATION') ?? 'US';
  if (!project) throw new BigQueryError('Projeto GCP não configurado.', 'CONFIGURATION');
  const accessToken = await googleToken();
  const queryParameters = parameters.map((item) => ({ name: item.name, parameterType: { type: item.type }, parameterValue: { value: String(item.value) } }));
  const body = { query: sql, useLegacySql: false, parameterMode: 'NAMED', queryParameters, maximumBytesBilled: maxBytes.toString(), useQueryCache: false, location, labels: { product: 'rebrain', feature: 'rais-employees', version: QUERY_VERSION } };
  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(project)}/queries`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const initial = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = String(initial?.error?.errors?.[0]?.reason ?? 'query_failed');
    if (reason === 'billingTierLimitExceeded' || reason === 'quotaExceeded') throw new BigQueryError('A consulta excedeu o limite de custo ou quota.', 'COST_LIMIT');
    throw new BigQueryError('O BigQuery recusou a consulta configurada.', 'BIGQUERY_QUERY');
  }
  const jobId = String(initial.jobReference?.jobId ?? '');
  let current = initial;
  for (let attempt = 0; !current.jobComplete && attempt < 90; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const poll = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(project)}/queries/${encodeURIComponent(jobId)}?location=${encodeURIComponent(location)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    current = await poll.json().catch(() => ({}));
    if (!poll.ok) throw new BigQueryError('Não foi possível acompanhar a consulta no BigQuery.', 'BIGQUERY_POLL');
  }
  if (!current.jobComplete) throw new BigQueryError('A consulta demorou mais que o limite operacional.', 'BIGQUERY_TIMEOUT');
  const processed = toNumber(current.totalBytesProcessed);
  const billed = toNumber(current.totalBytesBilled);
  if (processed !== null && BigInt(Math.round(processed)) > maxBytes) throw new BigQueryError('A consulta excedeu o limite de bytes configurado.', 'COST_LIMIT', processed);
  const rows = rowObjects(current);
  let pageToken = current.pageToken;
  while (pageToken) {
    const next = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(project)}/queries/${encodeURIComponent(jobId)}?location=${encodeURIComponent(location)}&pageToken=${encodeURIComponent(pageToken)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const page = await next.json().catch(() => ({}));
    if (!next.ok) throw new BigQueryError('Não foi possível paginar o resultado do BigQuery.', 'BIGQUERY_PAGINATION');
    rows.push(...rowObjects(page));
    pageToken = page.pageToken;
  }
  return { rows, jobId, bytesProcessed: processed, bytesBilled: billed };
}

const params = (uf: string, ibge: string, year: number) => [
  { name: 'uf', type: 'STRING', value: uf }, { name: 'ibge', type: 'STRING', value: ibge }, { name: 'year', type: 'INT64', value: year },
];

async function queryReport(uf: string, ibge: string, year: number) {
  const filter = `sigla_uf = @uf AND id_municipio = @ibge AND ano = @year AND vinculo_ativo_3112 = '1'`;
  const common = params(uf, ibge, year);
  const summarySql = `SELECT COUNT(*) AS total_vinculos, COUNTIF(valor_remuneracao_media IS NULL OR valor_remuneracao_media <= 0) AS salarios_zerados, COUNTIF(cbo_2002 IS NULL OR cbo_2002 = '') AS cbo_ausente, AVG(IF(valor_remuneracao_media > 0, valor_remuneracao_media, NULL)) AS salario_medio, APPROX_QUANTILES(IF(valor_remuneracao_media > 0, valor_remuneracao_media, NULL), 100)[SAFE_OFFSET(50)] AS salario_mediano, (SELECT COUNT(*) FROM \`basedosdados.br_me_rais.microdados_vinculos\` WHERE sigla_uf = @uf AND id_municipio = @ibge AND ano = @year) AS vinculos_no_ano FROM \`basedosdados.br_me_rais.microdados_vinculos\` WHERE ${filter}`;
  const occupationSql = `WITH v AS (SELECT cbo_2002, valor_remuneracao_media AS rem FROM \`basedosdados.br_me_rais.microdados_vinculos\` WHERE ${filter}), c AS (SELECT cbo_2002 AS cod, ANY_VALUE(descricao) AS descricao, ANY_VALUE(descricao_familia) AS familia, ANY_VALUE(descricao_grande_grupo) AS grande_grupo FROM \`basedosdados.br_bd_diretorios_brasil.cbo_2002\` GROUP BY 1) SELECT v.cbo_2002 AS codigo, c.grande_grupo, c.familia, c.descricao, COUNT(*) AS empregados, SAFE_DIVIDE(COUNT(*), SUM(COUNT(*)) OVER ()) AS percentual, AVG(IF(v.rem > 0, v.rem, NULL)) AS salario_medio, APPROX_QUANTILES(IF(v.rem > 0, v.rem, NULL), 100)[SAFE_OFFSET(50)] AS salario_mediano FROM v LEFT JOIN c ON c.cod = v.cbo_2002 GROUP BY 1, 2, 3, 4 ORDER BY empregados DESC, codigo`;
  const sectorSql = `SELECT CAST(subsetor_ibge AS STRING) AS codigo, COUNT(*) AS empregados, SAFE_DIVIDE(COUNT(*), SUM(COUNT(*)) OVER ()) AS percentual, AVG(IF(valor_remuneracao_media > 0, valor_remuneracao_media, NULL)) AS salario_medio, APPROX_QUANTILES(IF(valor_remuneracao_media > 0, valor_remuneracao_media, NULL), 100)[SAFE_OFFSET(50)] AS salario_mediano FROM \`basedosdados.br_me_rais.microdados_vinculos\` WHERE ${filter} GROUP BY 1 ORDER BY empregados DESC, codigo`;
  const startedAt = Date.now();
  const [summary, occupations, sectors] = await Promise.all([runQuery(summarySql, common), runQuery(occupationSql, common), runQuery(sectorSql, common)]);
  const summaryRow = summary.rows[0] ?? {};
  return {
    startedAt, durationMs: Date.now() - startedAt,
    summary: { totalEmployees: integer(summaryRow.total_vinculos), salaryMissingOrZero: integer(summaryRow.salarios_zerados), missingCbo: integer(summaryRow.cbo_ausente), totalLinksInYear: integer(summaryRow.vinculos_no_ano), averageSalary: toNumber(summaryRow.salario_medio), medianSalary: toNumber(summaryRow.salario_mediano) },
    sectors: sectors.rows.map((row) => ({ code: text(row.codigo, 'não informado'), name: SECTOR_NAMES[text(row.codigo, '')] ?? `Subsetor ${text(row.codigo)}`, employees: integer(row.empregados), percentage: toNumber(row.percentual) ?? 0, averageSalary: toNumber(row.salario_medio), medianSalary: toNumber(row.salario_mediano) })),
    occupations: occupations.rows.map((row) => ({ code: text(row.codigo, 'não informado'), majorGroup: text(row.grande_grupo), family: text(row.familia), occupation: text(row.descricao), employees: integer(row.empregados), percentage: toNumber(row.percentual) ?? 0, averageSalary: toNumber(row.salario_medio), medianSalary: toNumber(row.salario_mediano) })),
    bytesProcessed: [summary, occupations, sectors].reduce((sum, item) => sum + (item.bytesProcessed ?? 0), 0),
    bytesBilled: [summary, occupations, sectors].reduce((sum, item) => sum + (item.bytesBilled ?? 0), 0),
    jobIds: [summary.jobId, occupations.jobId, sectors.jobId].filter(Boolean),
  };
}

async function availableYears(): Promise<number[]> {
  if (yearsCache && yearsCache.expiresAt > Date.now()) return yearsCache.years;
  const query = await runQuery('SELECT DISTINCT CAST(ano AS INT64) AS year FROM `basedosdados.br_me_rais.microdados_vinculos` ORDER BY year DESC', [], BigInt(100_000_000));
  const years = query.rows.map((row) => integer(row.year)).filter((year) => year >= 1985 && year <= new Date().getFullYear());
  yearsCache = { years, expiresAt: Date.now() + 30 * 60 * 1000 };
  return years;
}

async function readSnapshot(supabase: ReturnType<typeof dbClient>, snapshotId: string, cacheHit: boolean) {
  const [snapshot, sectors, occupations] = await Promise.all([
    supabase.from('rais_employee_snapshots').select('*').eq('id', snapshotId).eq('status', 'ready').single(),
    supabase.from('rais_employee_sectors').select('*').eq('snapshot_id', snapshotId).order('employees', { ascending: false }),
    supabase.from('rais_employee_occupations').select('*').eq('snapshot_id', snapshotId).order('employees', { ascending: false }),
  ]);
  if (snapshot.error || !snapshot.data || sectors.error || occupations.error) throw new HttpError('Snapshot pronto não pôde ser lido.', 503, 'CACHE_READ');
  const data: any = snapshot.data;
  return { kind: 'employees', meta: { municipality: { ibgeCode: data.municipality_ibge, name: data.municipality_name, uf: data.uf }, year: data.year, generatedAt: data.updated_at, source: data.source, referenceDate: `31/12/${data.year}`, queryVersion: data.query_version, methodologyVersion: data.methodology_version, cacheHit, bytesProcessed: data.bytes_processed, queryDurationMs: data.query_duration_ms }, summary: { totalEmployees: data.total_employees, salaryMissingOrZero: data.salary_missing_or_zero, missingCbo: data.missing_cbo, totalLinksInYear: data.total_links_in_year, averageSalary: data.average_salary, medianSalary: data.median_salary }, sectors: (sectors.data ?? []).map((row: any) => ({ code: row.code, name: row.name, employees: row.employees, percentage: Number(row.percentage), averageSalary: row.average_salary === null ? null : Number(row.average_salary), medianSalary: row.median_salary === null ? null : Number(row.median_salary) })), occupations: (occupations.data ?? []).map((row: any) => ({ code: row.code, majorGroup: row.major_group, family: row.family, occupation: row.occupation, employees: row.employees, percentage: Number(row.percentage), averageSalary: row.average_salary === null ? null : Number(row.average_salary), medianSalary: row.median_salary === null ? null : Number(row.median_salary) })) };
}

async function handle(req: Request): Promise<Response> {
  const headers = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, headers);
  const identity = await authenticateGeoBrain(req);
  const supabase = dbClient();
  await enforceRateLimit(supabase, identity.id);
  let body: any;
  try { body = await req.json(); } catch { throw new HttpError('JSON inválido.', 400, 'BAD_REQUEST'); }
  const action = String(body?.action ?? '');
  if (action === 'metadata') return json({ years: await availableYears(), queryVersion: QUERY_VERSION, methodologyVersion: METHODOLOGY_VERSION }, 200, headers);
  if (action === 'status') {
    const snapshotId = String(body?.snapshotId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(snapshotId)) throw new HttpError('Snapshot inválido.', 400, 'BAD_REQUEST');
    const current = await supabase.from('rais_employee_snapshots').select('id,status').eq('id', snapshotId).single();
    if (current.error || !current.data) throw new HttpError('Snapshot não encontrado.', 404, 'NOT_FOUND');
    if (current.data.status === 'processing') return json({ pending: true, snapshotId, retryAfterMs: 3000 }, 202, headers);
    if (current.data.status === 'failed') throw new HttpError('A geração do relatório falhou. Tente novamente.', 502, 'GENERATION_FAILED');
    return json({ report: await readSnapshot(supabase, snapshotId, false) }, 200, headers);
  }
  if (action !== 'generate') throw new HttpError('Ação não permitida.', 400, 'BAD_REQUEST');
  const municipality = body?.municipality;
  const ibge = String(municipality?.ibgeCode ?? '');
  const municipalityName = text(municipality?.name, '');
  const uf = String(municipality?.uf ?? '').toUpperCase();
  const year = Number(body?.year);
  if (!/^[A-Z]{2}$/.test(uf) || !/^\d{7}$/.test(ibge) || !municipalityName || !Number.isInteger(year) || year < 1985 || year > new Date().getFullYear()) throw new HttpError('Município, UF ou ano inválido.', 400, 'INVALID_SCOPE');
  const startedAt = Date.now();
  const run = await supabase.from('rais_employee_query_runs').insert({ requester_id: identity.id, requester_email: identity.email, ip_hash: identity.ipHash, municipality_ibge: ibge, uf, year, query_version: QUERY_VERSION, status: 'started' }).select('id').single();
  if (run.error || !run.data) throw new HttpError('Não foi possível registrar a consulta.', 503, 'AUDIT_WRITE');
  const runId = run.data.id;
  let claimed: any;
  const claim = await supabase.rpc('rais_claim_snapshot', { p_municipality_ibge: ibge, p_municipality_name: municipalityName, p_uf: uf, p_year: year, p_query_version: QUERY_VERSION, p_methodology_version: METHODOLOGY_VERSION, p_source: SOURCE });
  if (claim.error || !claim.data?.[0]) { await supabase.from('rais_employee_query_runs').update({ status: 'failed', error_code: 'CACHE_CLAIM' }).eq('id', runId); throw new HttpError('Não foi possível reservar o snapshot.', 503, 'CACHE_CLAIM'); }
  claimed = claim.data[0];
  if (!claimed.acquired && claimed.snapshot_status === 'ready') {
    const report = await readSnapshot(supabase, claimed.snapshot_id, true);
    await supabase.from('rais_employee_query_runs').update({ snapshot_id: claimed.snapshot_id, cache_hit: true, status: 'cache_hit', duration_ms: Date.now() - startedAt }).eq('id', runId);
    return json({ report }, 200, headers);
  }
  if (!claimed.acquired && claimed.snapshot_status === 'processing') {
    await supabase.from('rais_employee_query_runs').update({ snapshot_id: claimed.snapshot_id, status: 'pending', duration_ms: Date.now() - startedAt }).eq('id', runId);
    return json({ pending: true, snapshotId: claimed.snapshot_id, retryAfterMs: claimed.retry_after_ms ?? 3000 }, 202, headers);
  }
  try {
    const result = await queryReport(uf, ibge, year);
    const snapshotId = claimed.snapshot_id;
    const sectorInsert = await supabase.from('rais_employee_sectors').insert(result.sectors.map((row) => ({ snapshot_id: snapshotId, code: row.code, name: row.name, employees: row.employees, percentage: row.percentage, average_salary: row.averageSalary, median_salary: row.medianSalary })));
    const occupationInsert = await supabase.from('rais_employee_occupations').insert(result.occupations.map((row) => ({ snapshot_id: snapshotId, code: row.code, major_group: row.majorGroup, family: row.family, occupation: row.occupation, employees: row.employees, percentage: row.percentage, average_salary: row.averageSalary, median_salary: row.medianSalary })));
    if (sectorInsert.error || occupationInsert.error) throw new HttpError('Não foi possível persistir as linhas agregadas.', 503, 'CACHE_ROWS');
    const snapshotUpdate = await supabase.rpc('rais_finish_snapshot', { p_snapshot_id: snapshotId, p_total_employees: result.summary.totalEmployees, p_salary_missing_or_zero: result.summary.salaryMissingOrZero, p_missing_cbo: result.summary.missingCbo, p_total_links_in_year: result.summary.totalLinksInYear, p_average_salary: result.summary.averageSalary, p_median_salary: result.summary.medianSalary, p_bytes_processed: result.bytesProcessed, p_query_duration_ms: result.durationMs });
    if (snapshotUpdate.error) throw new HttpError('Não foi possível finalizar o snapshot.', 503, 'CACHE_FINALIZE');
    await supabase.from('rais_employee_query_runs').update({ snapshot_id: snapshotId, status: 'generated', bigquery_job_ids: result.jobIds, bytes_processed: result.bytesProcessed, bytes_billed: result.bytesBilled, duration_ms: Date.now() - startedAt }).eq('id', runId);
    return json({ report: { kind: 'employees', meta: { municipality: { ibgeCode: ibge, name: municipalityName, uf }, year, generatedAt: new Date().toISOString(), source: SOURCE, referenceDate: `31/12/${year}`, queryVersion: QUERY_VERSION, methodologyVersion: METHODOLOGY_VERSION, cacheHit: false, bytesProcessed: result.bytesProcessed, queryDurationMs: result.durationMs }, ...result } }, 200, headers);
  } catch (error) {
    await supabase.rpc('rais_fail_snapshot', { p_snapshot_id: claimed.snapshot_id, p_error_code: error instanceof HttpError ? error.code : error instanceof BigQueryError ? error.code : 'GENERATION_ERROR' });
    await supabase.from('rais_employee_query_runs').update({ snapshot_id: claimed.snapshot_id, status: 'failed', error_code: error instanceof HttpError ? error.code : error instanceof BigQueryError ? error.code : 'GENERATION_ERROR', duration_ms: Date.now() - startedAt }).eq('id', runId);
    throw error;
  }
}

Deno.serve(async (req) => {
  const headers = cors(req);
  try { return await handle(req); }
  catch (error) { const status = error instanceof HttpError ? error.status : error instanceof BigQueryError && error.code === 'COST_LIMIT' ? 413 : error instanceof BigQueryError ? 502 : 500; const code = error instanceof HttpError ? error.code : error instanceof BigQueryError ? error.code : 'INTERNAL_ERROR'; return json({ error: safeError(error), code }, status, headers); }
});
