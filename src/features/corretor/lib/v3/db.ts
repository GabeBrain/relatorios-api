// Corretor v3 — persistência da sessão de correção (Supabase).
// Requer a migration 20260709100000_corretor_v3.sql.

import { supabase } from '@/integrations/supabase/client';
import type { Finding } from '../audit/model';
import type { AtaData } from './ia-ata';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type FindingStatus = 'pendente' | 'corrigido' | 'ignorado';

export interface StudyV3 {
  id: string;
  nome: string;
  cidade: string | null;
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

/** Persiste a ata extraída no estudo + copia a cidade (CITY_NAME / card). */
export async function saveAta(studyId: string, ata: AtaData | null): Promise<void> {
  const patch: Record<string, unknown> = { ata };
  const cidade = ata?.cidade?.trim();
  if (cidade) patch.cidade = cidade;
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
    finding: r.payload as Finding,
  }));
}

// ── sessão ───────────────────────────────────────────────────────────────────

export async function setFindingStatus(
  studyId: string, ruleId: string, status: FindingStatus
): Promise<void> {
  const { error } = await db
    .from('findings_v3')
    .update({ status })
    .eq('study_id', studyId)
    .eq('rule_id', ruleId);
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
      origem,
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
  tipo: 'texto' | 'visao_tabela' | 'visao_mapa',
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
