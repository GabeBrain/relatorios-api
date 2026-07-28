// Reconciliação de achados legados contra guardrails novos (padrão v0.41):
// ao abrir um estudo, FPs pendentes comprovadamente inválidos pelas regras
// atuais são encerrados e saem da worklist, preservando o histórico no banco.
// Funções puras — testadas com o corpus real de calibracao/feedback-2026-07.

import { municipioOficial, sameCity } from '../audit/ir-rules';
import type { Finding } from '../audit/model';

/** Seções onde WRONG_CONTEXT de visão segue válido (espelho de CONTEXT_SECTIONS). */
const CONTEXT_AUDIT_SECTIONS = new Set(['SOCIO', 'MERCADO', 'LACUNAS', 'ABSORCAO']);

/**
 * WRONG_CONTEXT de visão (`iavis-context-*`) que a regra atual não geraria mais:
 * fora das seções de dados, texto que não é município IBGE ("brasileiras") ou
 * a própria cidade do estudo com conectivos divergentes (typo da ata).
 */
export function isStaleVisionContext(
  finding: Finding,
  expectedCity: string | null | undefined,
  /** Texto transcrito da imagem (título/colunas/células), quando disponível. */
  transcribed?: string,
): boolean {
  if (finding.type !== 'WRONG_CONTEXT' || !finding.id.startsWith('iavis-context-')) return false;
  if (!CONTEXT_AUDIT_SECTIONS.has(finding.section)) return true;
  const seen = finding.viz?.kind === 'text' ? finding.viz.evidence?.trim() : undefined;
  if (!seen) return false;
  if (!municipioOficial(seen)) return true;
  if (expectedCity && sameCity(seen, expectedCity)) return true;
  // Sem âncora no texto lido da imagem, a cidade foi inferida pelo modelo e não
  // transcrita — alucinação (caso s45 da Rolândia, "São Paulo" deduzido dos
  // bairros "Centro" e "Jardim Das Américas").
  const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return Boolean(transcribed && !norm(transcribed).includes(norm(seen)));
}

/**
 * DET wrong-city legado cuja "cidade divergente" é a própria cidade do estudo
 * com conectivos diferentes — assinatura do typo de ata ("São José do Campos").
 */
export function isStaleWrongCity(finding: Finding, expectedCity: string | null | undefined): boolean {
  if (finding.type !== 'WRONG_CONTEXT' || !finding.id.startsWith('wrong-city-') || !expectedCity) return false;
  const evidence = finding.viz?.kind === 'text' ? finding.viz.evidence ?? '' : '';
  const city = evidence.split(/[–\-/]/)[0]?.trim();
  return Boolean(city && sameCity(city, expectedCity));
}

const slideOf = (label: string) => /^s(\d+)/.exec(label.trim())?.[1];
const unitOf = (text: string) => (/r\$|reais/i.test(text) ? 'reais' : /m²|m2|metragem/i.test(text) ? 'm2' : 'outro');

/**
 * CROSS_TABLE_MISMATCH que os guardrails atuais bloqueiam na origem: um dos
 * lados é legenda de mapa, os dois lados são o mesmo slide (fatias da mesma
 * análise) ou as faixas comparadas têm unidades diferentes (metragem × preço).
 */
export function isStaleCrossTable(finding: Finding): boolean {
  if (finding.type !== 'CROSS_TABLE_MISMATCH' || finding.viz?.kind !== 'sidebyside') return false;
  const { leftLabel, rightLabel, rows } = finding.viz;
  if (/legenda/i.test(leftLabel) || /legenda/i.test(rightLabel)) return true;
  const left = slideOf(leftLabel), right = slideOf(rightLabel);
  if (left && right && left === right) return true;
  if (finding.id.startsWith('cross-lacunas-bins-')) {
    const leftUnit = unitOf(rows.map((r) => String(r.left)).join(' '));
    const rightUnit = unitOf(rows.map((r) => String(r.right)).join(' '));
    if (leftUnit !== rightUnit) return true;
  }
  return false;
}
