import type { Ir, IrSlide } from '../audit/ir';

const MAX_CHARS_PER_SLIDE = 6_000;
export const MAX_SUGGESTION_SLIDES_PER_BATCH = 180;
export const MAX_SUGGESTION_CHARS_PER_BATCH = 180_000;

export interface ConsultingSuggestionSlide {
  n: number;
  titulo: string;
  conteudo: string;
}

export interface SuggestionBatchProgress {
  current: number;
  total: number;
  phase: 'batch' | 'compile';
}

function slideText(slide: IrSlide): string {
  const text = (slide.textos ?? []).join('\n');
  const tables = (slide.tabelas ?? [])
    .map((table) => table.linhas.map((row) => row.join(' | ')).join('\n'))
    .join('\n---\n');
  return `${text}${tables ? `\n\nTABELAS\n${tables}` : ''}`.slice(0, MAX_CHARS_PER_SLIDE);
}

function suggestionSlides(ir: Ir): ConsultingSuggestionSlide[] {
  return ir.slides
    .map((slide) => ({ n: slide.n, titulo: slide.titulo ?? '', conteudo: slideText(slide) }))
    .filter((slide) => slide.conteudo.trim().length > 40);
}

/** Mantém cada chamada da Edge Function dentro do contrato de entrada. */
export function partitionConsultingSuggestionSlides(slides: ConsultingSuggestionSlide[]): ConsultingSuggestionSlide[][] {
  const batches: ConsultingSuggestionSlide[][] = [];
  let batch: ConsultingSuggestionSlide[] = [];
  let chars = 0;

  for (const slide of slides) {
    const nextChars = chars + slide.conteudo.length;
    if (batch.length > 0 && (batch.length >= MAX_SUGGESTION_SLIDES_PER_BATCH || nextChars > MAX_SUGGESTION_CHARS_PER_BATCH)) {
      batches.push(batch);
      batch = [];
      chars = 0;
    }
    batch.push(slide);
    chars += slide.conteudo.length;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

export function consultingSuggestionBatchCount(ir: Ir): number {
  return partitionConsultingSuggestionSlides(suggestionSlides(ir)).length;
}

/** Cobertura textual explícita; Excel, PDF e imagens não entram neste motor. */
export function recommendationSource(ir: Ir) {
  let limitedSlides = 0;
  const slides = ir.slides.map(slide => {
    const full = [...(slide.textos ?? []), ...(slide.tabelas ?? []).map(t => t.linhas.map(r => r.join(' | ')).join('\n'))].join('\n');
    if (full.length > MAX_CHARS_PER_SLIDE) limitedSlides++;
    return { n: slide.n, titulo: (slide.titulo ?? '').slice(0,200), conteudo: full.slice(0, MAX_CHARS_PER_SLIDE) };
  }).filter(s => s.conteudo.trim().length > 40);
  return { slides, limitedSlides, totalSlides: ir.n_slides, withoutText: ir.n_slides-slides.length };
}
