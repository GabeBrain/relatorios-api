import { supabase } from '@/integrations/supabase/client';
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

async function invokeSuggestion<T extends { error?: string }>(body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('analyze-consulting-suggestion', { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function generateConsultingSuggestion(
  ir: Ir,
  onProgress?: (progress: SuggestionBatchProgress) => void,
): Promise<string> {
  const slides = suggestionSlides(ir);
  if (slides.length === 0) {
    throw new Error('Não foi possível extrair conteúdo suficiente do PPTX para gerar a análise.');
  }

  const batches = partitionConsultingSuggestionSlides(slides);
  if (batches.length === 1) {
    const data = await invokeSuggestion<{ suggestion?: string; error?: string }>({ slides });
    if (!data.suggestion?.trim()) throw new Error('A IA não retornou uma sugestão de análise.');
    return data.suggestion;
  }

  const memos: Array<{ firstSlide: number; lastSlide: number; content: string }> = [];
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    onProgress?.({ current: index + 1, total: batches.length, phase: 'batch' });
    const data = await invokeSuggestion<{ batch?: string; error?: string }>({ mode: 'batch', slides: batch });
    if (!data.batch?.trim()) throw new Error(`A IA não retornou a análise do lote ${index + 1}.`);
    memos.push({ firstSlide: batch[0].n, lastSlide: batch[batch.length - 1].n, content: data.batch });
  }

  onProgress?.({ current: batches.length, total: batches.length, phase: 'compile' });
  const final = await invokeSuggestion<{ suggestion?: string; error?: string }>({ mode: 'compile', batches: memos });
  if (!final.suggestion?.trim()) throw new Error('A IA não retornou a síntese final da análise.');
  return final.suggestion;
}
