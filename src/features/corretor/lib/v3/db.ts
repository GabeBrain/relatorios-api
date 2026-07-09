// Corretor v3 — persistência da sessão de correção (Supabase).
// Requer a migration 20260709100000_corretor_v3.sql.

import { supabase } from '@/integrations/supabase/client';
import type { Finding } from '../audit/model';

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
    .select('*, study_versions(n, n_slides), findings_v3(status)')
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pendentes: (s.findings_v3 ?? []).filter((f: any) => f.status === 'pendente').length,
    };
  });
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
  const activeIds = new Set(current.filter((c) => c.resolvidoNaVersao === null).map((c) => c.ruleId));
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
