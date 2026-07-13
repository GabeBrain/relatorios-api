// Corretor v3 — persistência da sessão de correção (Supabase).
// Requer a migration 20260709100000_corretor_v3.sql.

import { supabase } from '@/integrations/supabase/client';
import type { Finding } from '../audit/model';
import type { AtaData } from './ia-ata';
import type { AnalysisReport } from './pipeline';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type FindingStatus = 'pendente' | 'corrigido' | 'ignorado';

export interface StudyV3 {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  ataConfirmada: boolean;
  status: 'em_correcao' | 'pronto';
  createdAt: string;
  concludedAt: string | null;
  lastVersion: number;
  nSlides: number;
  pendentes?: number;
  custoTotal: number;
  lastSha1: string | null;
  ata?: AtaData | null;
}

export interface FindingV3 {
  ruleId: string;
  status: FindingStatus;
  origem: string;
  primeiraVersao: number;
  resolvidoNaVersao: number | null;
  verdict: 'bug' | 'fp' | null;
  verdictRevisado: boolean;
  finding: Finding;
}

export interface DiffResult {
  resolved: string[];    // rule_ids que sumiram na versão nova
  persistent: string[];  // continuam
  fresh: string[];       // novos
}

const isLocal = (f: Finding) => /^s\d+$/.test(f.slideRef.trim());

// ── criação / listagem ────────────────────────────────────────────────────────

export async function createStudy(
  nome: string,
  meta: { sha1?: string; nSlides: number; arquivo: string },
  findings: Finding[]
): Promise<string> {
  const { data: study, error } = await db
    .from('studies_v3')
    .insert({ nome })
    .select('id')
    .single();
  if (error || !study) throw new Error(error?.message ?? 'Falha ao criar estudo');
  const studyId = study.id as string;

  await db.from('study_versions').insert({
    study_id: studyId, n: 1, sha1: meta.sha1 ?? null,
    n_slides: meta.nSlides, arquivo: meta.arquivo,
  });

  if (findings.length) {
    await db.from('findings_v3').insert(findings.map((f) => ({
      study_id: studyId,
      rule_id: f.id,
      tipo: f.type,
      familia: isLocal(f) ? 'local' : 'relacional',
      slide_ref: f.slideRef,
      titulo: f.title,
      detalhe: f.detail,
      payload: f,
      status: 'pendente',
      origem: 'DET',
      primeira_versao: 1,
    })));
  }
  return studyId;
}

export async function listStudies(): Promise<StudyV3[]> {
  const { data, error } = await db
    .from('studies_v3')
    .select('*, study_versions(n, n_slides, sha1), findings_v3(status)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((s: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const versions = (s.study_versions ?? []).sort((a: any, b: any) => b.n - a.n);
    return {
      id: s.id,
      nome: s.nome,
      cidade: s.cidade,
      uf: s.uf ?? null,
      ataConfirmada: s.ata_confirmada === true,
      status: s.status,
      createdAt: s.created_at,
      concludedAt: s.concluded_at,
      lastVersion: versions[0]?.n ?? 1,
      nSlides: versions[0]?.n_slides ?? 0,
      custoTotal: Number(s.custo_total ?? 0),
      lastSha1: versions[0]?.sha1 ?? null,
      ata: (s.ata ?? null) as AtaData | null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pendentes: (s.findings_v3 ?? []).filter((f: any) => f.status === 'pendente').length,
    };
  });
}

/** WS-2: guarda o snapshot do que foi verificado (attestation) para o relatório. */
export async function saveReport(studyId: string, report: AnalysisReport): Promise<void> {
  const { error } = await db.from('studies_v3').update({ relatorio: report }).eq('id', studyId);
  if (error) throw new Error(error.message);
}

/** Persiste a ata extraída no estudo + copia a cidade (CITY_NAME / card). */
export async function saveAta(studyId: string, ata: AtaData | null): Promise<void> {
  const patch: Record<string, unknown> = { ata };
  const cidade = ata?.cidade?.trim();
  const uf = ata?.uf?.trim();
  if (cidade) patch.cidade = cidade;
  if (uf) patch.uf = uf;
  const { error } = await db.from('studies_v3').update(patch).eq('id', studyId);
  if (error) throw new Error(error.message);
}

/**
 * WS-1 (portão da ata): grava a ata CONFIRMADA/EDITADA pelo analista com a cidade/UF
 * que ele validou (a régua do CITY_NAME/WRONG_CONTEXT) e marca `ata_confirmada`.
 * Aceita cidade/UF explícitas mesmo sem ata (caminho "sem ata": formulário manual).
 */
export async function confirmAta(
  studyId: string,
  ata: AtaData | null,
  cidade: string,
  uf: string | null
): Promise<void> {
  const patch: Record<string, unknown> = {
    ata,
    cidade: cidade.trim() || null,
    uf: uf?.trim() || null,
    ata_confirmada: true,
  };
  const { error } = await db.from('studies_v3').update(patch).eq('id', studyId);
  if (error) throw new Error(error.message);
}

export async function loadFindings(studyId: string): Promise<FindingV3[]> {
  const { data, error } = await db
    .from('findings_v3')
    .select('*')
    .eq('study_id', studyId);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    ruleId: r.rule_id,
    status: r.status,
    origem: r.origem,
    primeiraVersao: r.primeira_versao,
    resolvidoNaVersao: r.resolvido_na_versao,
    verdict: r.verdict === 'bug' || r.verdict === 'fp' ? r.verdict : null,
    verdictRevisado: r.verdict_revisado === true,
    finding: r.payload as Finding,
  }));
}

// ── sessão ───────────────────────────────────────────────────────────────────

export async function setFindingStatus(
  studyId: string, ruleId: string, status: FindingStatus
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'corrigido' || status === 'pendente') patch.verdict = null;
  const { error } = await db
    .from('findings_v3')
    .update(patch)
    .eq('study_id', studyId)
    .eq('rule_id', ruleId);
  if (error) throw new Error(error.message);
}

/**
 * Encerra achados legados que um guardrail determinístico passou a provar como inválidos.
 * Mantém a linha para auditoria, mas a retira da worklist ativa na versão mais recente.
 */
export async function resolveInvalidFindings(studyId: string, ruleIds: string[]): Promise<void> {
  if (!ruleIds.length) return;
  const { data: version } = await db
    .from('study_versions')
    .select('n')
    .eq('study_id', studyId)
    .order('n', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await db.from('findings_v3')
    .update({ status: 'corrigido', resolvido_na_versao: version?.n ?? 1 })
    .eq('study_id', studyId)
    .eq('status', 'pendente')
    .in('rule_id', ruleIds);
  if (error) throw new Error(error.message);
}

/** Loop de calibração v4: FP continua visível, mas fica cinza e não bloqueia entrega. */
export async function setFindingVerdict(
  studyId: string, ruleId: string, verdict: 'bug' | 'fp' | null
): Promise<void> {
  const patch: Record<string, unknown> = { verdict };
  if (verdict === 'fp') patch.status = 'ignorado';
  if (verdict === 'bug') patch.status = 'pendente';
  const { error } = await db.from('findings_v3').update(patch).eq('study_id', studyId).eq('rule_id', ruleId);
  if (error) throw new Error(error.message);
}

/**
 * Reconferir: registra a versão nova do arquivo e faz o diff por rule_id.
 * - sumiu  → status 'corrigido' + resolvido_na_versao = n
 * - novo   → insere pendente (primeira_versao = n)
 * - persiste e estava 'corrigido' → volta a 'pendente' (a correção não pegou)
 */
export async function recheck(
  studyId: string,
  versionN: number,
  meta: { sha1?: string; nSlides: number; arquivo: string },
  newFindings: Finding[]
): Promise<DiffResult> {
  const current = await loadFindings(studyId);
  // Diff comparado só com achados DET: newFindings vêm do motor determinístico,
  // então achados de IA (origem IA_*) não podem ser dados como resolvidos aqui —
  // eles só se resolvem quando um novo passe de IA rodar sobre a versão nova.
  const activeIds = new Set(
    current.filter((c) => c.resolvidoNaVersao === null && c.origem === 'DET').map((c) => c.ruleId)
  );
  const newIds = new Set(newFindings.map((f) => f.id));

  const resolved = [...activeIds].filter((id) => !newIds.has(id));
  const persistent = [...activeIds].filter((id) => newIds.has(id));
  const fresh = newFindings.filter((f) => !activeIds.has(f.id) &&
    !current.some((c) => c.ruleId === f.id));

  await db.from('study_versions').insert({
    study_id: studyId, n: versionN, sha1: meta.sha1 ?? null,
    n_slides: meta.nSlides, arquivo: meta.arquivo,
  });

  if (resolved.length) {
    await db.from('findings_v3')
      .update({ status: 'corrigido', resolvido_na_versao: versionN })
      .eq('study_id', studyId)
      .in('rule_id', resolved);
  }
  // correções manuais que não pegaram voltam a pendente
  const notFixed = current
    .filter((c) => persistent.includes(c.ruleId) && c.status === 'corrigido')
    .map((c) => c.ruleId);
  if (notFixed.length) {
    await db.from('findings_v3')
      .update({ status: 'pendente' })
      .eq('study_id', studyId)
      .in('rule_id', notFixed);
  }
  if (fresh.length) {
    await db.from('findings_v3').insert(fresh.map((f) => ({
      study_id: studyId,
      rule_id: f.id,
      tipo: f.type,
      familia: isLocal(f) ? 'local' : 'relacional',
      slide_ref: f.slideRef,
      titulo: f.title,
      detalhe: f.detail,
      payload: f,
      status: 'pendente',
      origem: 'DET',
      primeira_versao: versionN,
    })));
  }

  return { resolved, persistent, fresh: fresh.map((f) => f.id) };
}

/** Insere achados de um passe de IA (upsert por rule_id; duplicados ignorados). */
export async function insertIaFindings(
  studyId: string,
  findings: Finding[],
  origem: 'DET' | 'IA_texto' | 'IA_visao',
  versionN: number
): Promise<number> {
  if (!findings.length) return 0;
  const { error, count } = await db.from('findings_v3').upsert(
    findings.map((f) => ({
      study_id: studyId,
      rule_id: f.id,
      tipo: f.type,
      familia: isLocal(f) ? 'local' : 'relacional',
      slide_ref: f.slideRef,
      titulo: f.title,
      detalhe: f.detail,
      payload: f,
      status: 'pendente',
      // Um cruzamento de tabelas nativas é DET mesmo saindo do estágio de visão.
      origem: f.origem ?? origem,
      primeira_versao: versionN,
    })),
    { onConflict: 'study_id,rule_id', ignoreDuplicates: true, count: 'exact' }
  );
  if (error) throw new Error(error.message);
  return count ?? findings.length;
}

/** Registra um passe de IA e acumula o custo no estudo. */
export async function registerIaPass(
  studyId: string,
  tipo: 'texto' | 'visao_tabela' | 'visao_mapa' | 'visao_ata',
  escopo: string,
  custoUsd: number,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  await db.from('ia_passes').insert({
    study_id: studyId, tipo, escopo,
    custo_usd: custoUsd, input_tokens: inputTokens, output_tokens: outputTokens,
  });
  const { data } = await db.from('studies_v3').select('custo_total').eq('id', studyId).single();
  const total = Number(data?.custo_total ?? 0) + custoUsd;
  await db.from('studies_v3').update({ custo_total: total }).eq('id', studyId);
}

export async function concludeStudy(studyId: string): Promise<void> {
  const { error } = await db
    .from('studies_v3')
    .update({ status: 'pronto', concluded_at: new Date().toISOString() })
    .eq('id', studyId);
  if (error) throw new Error(error.message);
}

export async function deleteStudy(studyId: string): Promise<void> {
  await db.from('studies_v3').delete().eq('id', studyId);
}

// ── WS-2: relatório de entrega ────────────────────────────────────────────────

export interface DeliveryReport {
  study: StudyV3;
  snapshot: AnalysisReport | null;
  /** contagens vivas dos achados (por status/veredito/tipo) */
  corrigidos: number;
  ignorados: number;
  fps: number;
  verificarAssumidos: number;   // nível 3 entregues ainda pendentes
  porTipo: { tipo: string; corrigidos: number; pendentes: number; total: number }[];
  findings: FindingV3[];
}

/** Monta o relatório de verificação de um estudo (snapshot + contagens vivas). */
export async function loadDeliveryReport(studyId: string): Promise<DeliveryReport | null> {
  const { data: s } = await db
    .from('studies_v3')
    .select('*, study_versions(n, n_slides, sha1)')
    .eq('id', studyId)
    .maybeSingle();
  if (!s) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const versions = (s.study_versions ?? []).sort((a: any, b: any) => b.n - a.n);
  const study: StudyV3 = {
    id: s.id, nome: s.nome, cidade: s.cidade, uf: s.uf ?? null,
    ataConfirmada: s.ata_confirmada === true, status: s.status,
    createdAt: s.created_at, concludedAt: s.concluded_at,
    lastVersion: versions[0]?.n ?? 1, nSlides: versions[0]?.n_slides ?? 0,
    custoTotal: Number(s.custo_total ?? 0), lastSha1: versions[0]?.sha1 ?? null,
    ata: (s.ata ?? null) as AtaData | null,
  };

  const findings = await loadFindings(studyId);
  const corrigidos = findings.filter((f) => f.status === 'corrigido').length;
  const ignorados = findings.filter((f) => f.status === 'ignorado' && f.verdict !== 'fp').length;
  const fps = findings.filter((f) => f.verdict === 'fp').length;
  const verificarAssumidos = findings.filter((f) => f.status === 'pendente').length;

  const byType = new Map<string, { corrigidos: number; pendentes: number; total: number }>();
  for (const f of findings) {
    const t = byType.get(f.finding.type) ?? { corrigidos: 0, pendentes: 0, total: 0 };
    t.total++;
    if (f.status === 'corrigido') t.corrigidos++;
    if (f.status === 'pendente') t.pendentes++;
    byType.set(f.finding.type, t);
  }
  const porTipo = [...byType.entries()].map(([tipo, v]) => ({ tipo, ...v })).sort((a, b) => b.total - a.total);

  return {
    study, snapshot: (s.relatorio ?? null) as AnalysisReport | null,
    corrigidos, ignorados, fps, verificarAssumidos, porTipo, findings,
  };
}

// ─── WS-5: painel de calibração dos falsos positivos ──────────────────────────

export interface CalibrationFinding extends FindingV3 {
  studyId: string;
  studyName: string;
  studyCity: string | null;
  studyUf: string | null;
}

export interface CalibrationHealth {
  tipo: string;
  total: number;
  fps: number;
  corrigidos: number;
  fpPct: number;
  corrigidosPct: number;
}

export interface CalibrationDashboard {
  queue: CalibrationFinding[];
  health: CalibrationHealth[];
}

/** Carrega a fila global de FP e calcula a saúde por tipo sobre todos os achados. */
export async function loadCalibrationDashboard(): Promise<CalibrationDashboard> {
  const [{ data: rows, error }, { data: studies }] = await Promise.all([
    db.from('findings_v3').select('*'),
    db.from('studies_v3').select('id,nome,cidade,uf'),
  ]);
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studyMap = new Map<string, any>((studies ?? []).map((study: any) => [study.id, study]));
  const byType = new Map<string, { total: number; fps: number; corrigidos: number }>();
  const queue: CalibrationFinding[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of rows ?? [] as any[]) {
    const totals = byType.get(row.tipo) ?? { total: 0, fps: 0, corrigidos: 0 };
    totals.total++;
    if (row.verdict === 'fp') totals.fps++;
    if (row.status === 'corrigido') totals.corrigidos++;
    byType.set(row.tipo, totals);

    if (row.verdict !== 'fp') continue;
    const study = studyMap.get(row.study_id);
    queue.push({
      studyId: row.study_id,
      studyName: study?.nome ?? 'Estudo removido',
      studyCity: study?.cidade ?? null,
      studyUf: study?.uf ?? null,
      ruleId: row.rule_id,
      status: row.status,
      origem: row.origem,
      primeiraVersao: row.primeira_versao,
      resolvidoNaVersao: row.resolvido_na_versao,
      verdict: 'fp',
      verdictRevisado: row.verdict_revisado === true,
      finding: row.payload as Finding,
    });
  }

  const health = [...byType.entries()].map(([tipo, value]) => ({
    tipo,
    ...value,
    fpPct: value.total ? (value.fps / value.total) * 100 : 0,
    corrigidosPct: value.total ? (value.corrigidos / value.total) * 100 : 0,
  })).sort((a, b) => b.fpPct - a.fpPct || b.total - a.total);

  queue.sort((a, b) => Number(a.verdictRevisado) - Number(b.verdictRevisado) || a.finding.type.localeCompare(b.finding.type));
  return { queue, health };
}

export async function acknowledgeCalibrationFinding(studyId: string, ruleId: string): Promise<void> {
  const { error } = await db.from('findings_v3').update({ verdict_revisado: true })
    .eq('study_id', studyId).eq('rule_id', ruleId).eq('verdict', 'fp');
  if (error) throw new Error(error.message);
}

export async function acknowledgeCalibrationType(tipo: string): Promise<void> {
  const { error } = await db.from('findings_v3').update({ verdict_revisado: true })
    .eq('tipo', tipo).eq('verdict', 'fp');
  if (error) throw new Error(error.message);
}
