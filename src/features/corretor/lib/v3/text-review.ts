import type { Ir } from '../audit/ir';
import type { Finding } from '../audit/model';
import type { FindingV3 } from './db';
import { reviewVisionFinding } from './vision-column-review';

const words = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function literalTextAnchor(text: string, evidence?: string): boolean {
  const needle = words(evidence ?? '');
  return Boolean(needle && (` ${words(text)} `).includes(` ${needle} `));
}
export function reviewTextFinding(finding: Finding, ir?: Ir | null): Finding {
  if (!finding.id.startsWith('iatxt-')) return finding;
  const evidence = finding.viz?.kind === 'text' ? finding.viz.evidence : undefined;
  const slide = ir?.slides.find(s => `s${s.n}` === finding.slideRef);
  const text = slide ? [slide.titulo ?? '', ...(slide.textos ?? []), ...(slide.textos_svg ?? []), ...(slide.tabelas ?? []).flatMap(t => t.linhas.map(r => r.join(' ')))].join(' ') : '';
  const missing = Boolean(ir && (!slide || !literalTextAnchor(text, evidence)));
  const editorial = /capitaliza[cç][aã]o|erro de formata[cç][aã]o|in[ií]cio de item|falta de.{0,30}contexto|como t[ií]tulo sem|continua[cç][aã]o ou conclus[aã]o|separada do restante dos t[ií]tulos/i.test(finding.detail)
    || (/concordancia nominal/.test(words(finding.detail)) && !/deveria|deve ser|corret|em vez/.test(words(finding.detail)));
  if (!missing && !editorial) return finding;
  const reason = missing ? 'O trecho citado não foi localizado no texto disponível do slide desta versão. Conteúdo somente em imagem ainda precisa de conferência.' : 'A acusação depende de contexto ou convenção editorial não demonstrados; confira antes de tratar como erro.';
  return { ...finding, confidence: 3, title: missing ? 'Texto antigo não conferido nesta versão' : 'Observação textual a conferir', detail: `${reason}\nAlerta original: ${finding.detail}` };
}

/** Projeção de revisão: não altera registros, vereditos nem marca ausência como corrigido. */
export function presentTextFindings(items: FindingV3[], ir?: Ir | null): FindingV3[] {
  const out: FindingV3[] = [];
  for (const item of items) {
    const untouched = item.status !== 'pendente' || Boolean(item.verdict) || item.verdictRevisado;
    const next = untouched ? item : { ...item, finding: item.origem === 'IA_visao' ? reviewVisionFinding(item.finding) : reviewTextFinding(item.finding, ir) };
    const evidence = item.finding.viz?.kind === 'text' ? words(item.finding.viz.evidence ?? '') : '';
    const duplicate = !untouched && item.finding.id.startsWith('iatxt-') && evidence.length >= 8 ? out.find(prev => {
      if (prev.status !== 'pendente' || prev.verdict || prev.verdictRevisado || prev.finding.type !== item.finding.type || prev.finding.slideRef !== item.finding.slideRef || prev.finding.confidence !== next.finding.confidence || !prev.finding.id.startsWith('iatxt-') || prev.finding.viz?.kind !== 'text') return false;
      const other = words(prev.finding.viz.evidence ?? '');
      return other.length >= 8 && (literalTextAnchor(other, evidence) || literalTextAnchor(evidence, other));
    }) : undefined;
    if (!duplicate) { out.push(next); continue; }
    const ids = [...(duplicate.duplicateRuleIds ?? [duplicate.ruleId]), item.ruleId];
    const current = duplicate.finding.viz?.kind === 'text' ? duplicate.finding.viz.evidence ?? '' : '';
    duplicate.duplicateRuleIds = ids;
    duplicate.finding = { ...duplicate.finding, title: `${duplicate.finding.title.replace(/ · \d+ registros$/, '')} · ${ids.length} registros`, viz: { kind: 'text', evidence: current.length >= (item.finding.viz?.kind === 'text' ? item.finding.viz.evidence ?? '' : '').length ? current : (item.finding.viz?.kind === 'text' ? item.finding.viz.evidence : current) }, detail: `${next.finding.detail}\nRegistros agrupados: ${ids.join(', ')}. A decisão neste cartão será aplicada a esses registros.` };
  }
  return out;
}
