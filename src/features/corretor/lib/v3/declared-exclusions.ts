// CH-6 (feedback da Beatriz, jul/2026) — totais que não fecham POR DESENHO.
// O estudo declara no próprio slide que parte das unidades ficou de fora
// (“Unidades garden, duplex e coberturas não são apresentadas na análise para
// evitar distorções de preço e metragem”; “ocultamos os esgotados”), e a tabela
// completa vai para o apêndice. Somar a coluna e cobrar o total é injusto.
//
// Decisão do Gabriel (31/jul): com exclusão declarada o achado NÃO some — vira
// “Verificar”, citando a nota. O total pode não fechar pela exclusão legítima
// OU por erro real, e só quem lê o apêndice sabe qual dos dois é.

import type { IrSlide, Ir } from '../audit/ir';
import type { Finding } from '../audit/model';
import type { ErrorType } from '../error-catalog';

/**
 * Verbo de exclusão explícito. Só o verbo sustenta a abstenção sozinho — citar
 * “cobertura” ou “esgotado” não basta (toda tabela de tipologia cita), senão a
 * regra silenciaria erros de soma reais em qualquer consolidada.
 */
const EXCLUSION_VERB = /n[ãa]o (?:s[ãa]o|foram|est[ãa]o|se[rt][aã]?o?)\s+(?:aqui\s+)?(?:apresentad|considerad|contabilizad|inclu[íi]d|computad|exibid|demonstrad)|n[ãa]o (?:apresentam?os|consideram?os|inclu[íi]m?os|contabilizam?os)|desconsiderad?a?m?o?s?|ocultam?os|foram (?:exclu[íi]d|retirad|removid|suprimid)|exclu[íi]m?os|n[ãa]o constam|n[ãa]o entram|fica(?:m|ram)? de fora/i;

/** Marcador fraco: só vale acompanhado do que foi excluído. */
const EXCLUSION_HINT = /\bexceto\b|\bsalvo\b|\bà exce[çc][ãa]o\b|\bdesconsiderando\b/i;

/** O que costuma ser excluído nos estudos (tipologias e status de venda). */
const EXCLUDED_ITEMS = /garden|duplex|cobertur|esgotad|permutad|estand|decorad|2[ªa]\s*morada|segunda\s+moradia/i;

/** Tipos cujo veredito depende de a tabela estar completa. */
const SUM_TYPES = new Set<ErrorType>(['ABSOLUTE_SUM', 'PERCENTAGE_SUM', 'TOTALS_EQUALITY', 'CROSS_TABLE_MISMATCH']);

/** Frases do slide, sem depender de lookbehind (suporte de Safari). */
function sentences(texts: string[]): string[] {
  return texts
    .flatMap((text) => String(text ?? '').split(/[.;!?]+\s+|\n+/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 12);
}

/**
 * Frase do slide que declara a exclusão, ou null. Procura em texto, notas e
 * título — o rodapé do template novo entra no IR como texto comum.
 */
export function declaredExclusion(slide: Pick<IrSlide, 'titulo' | 'textos' | 'notas'>): string | null {
  const candidates = sentences([slide.titulo ?? '', ...(slide.textos ?? []), ...(slide.notas ?? [])]);
  for (const sentence of candidates) {
    if (EXCLUSION_VERB.test(sentence) && EXCLUDED_ITEMS.test(sentence)) return sentence;
  }
  // 2ª passada: verbo sozinho já é declaração de exclusão (“não são apresentadas
  // na análise”), desde que a frase fale de unidades/empreendimentos.
  for (const sentence of candidates) {
    if (EXCLUSION_VERB.test(sentence) && /unidade|empreendiment|tipologia|im[óo]ve|produto/i.test(sentence)) return sentence;
  }
  for (const sentence of candidates) {
    if (EXCLUSION_HINT.test(sentence) && EXCLUDED_ITEMS.test(sentence)) return sentence;
  }
  return null;
}

/** Slides citados no achado: "s42" → [42]; "s42 × s43" → [42, 43]. */
function slidesOf(finding: Finding): number[] {
  return [...finding.slideRef.matchAll(/\d+/g)].map((match) => Number(match[0]));
}

/**
 * Rebaixa para “Verificar” os achados de soma cujo slide declara exclusão, e
 * cita a frase na evidência. Não remove nada: a exclusão explica o total aberto,
 * mas não prova que ele está certo.
 */
export function applyDeclaredExclusions(ir: Ir, findings: Finding[]): Finding[] {
  const bySlide = new Map<number, IrSlide>();
  for (const slide of ir.slides) bySlide.set(slide.n, slide);
  const cache = new Map<number, string | null>();
  const exclusionAt = (n: number): string | null => {
    if (!cache.has(n)) {
      const slide = bySlide.get(n);
      cache.set(n, slide ? declaredExclusion(slide) : null);
    }
    return cache.get(n) ?? null;
  };

  return findings.map((finding) => {
    if (finding.ok || !SUM_TYPES.has(finding.type)) return finding;
    const note = slidesOf(finding).map(exclusionAt).find((sentence): sentence is string => Boolean(sentence));
    if (!note) return finding;
    return {
      ...finding,
      confidence: 3,
      detail: `${finding.detail} — o slide declara exclusão: “${note}”. O total pode não fechar por isso (tabela completa costuma ficar no apêndice); confira antes de corrigir.`,
    };
  });
}
