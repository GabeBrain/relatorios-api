import { supabase } from '@/integrations/supabase/client';
import type { Ir, IrSlide } from '../audit/ir';

const MAX_CHARS_PER_SLIDE = 6_000;

function slideText(slide: IrSlide): string {
  const text = (slide.textos ?? []).join('\n');
  const tables = (slide.tabelas ?? [])
    .map((table) => table.linhas.map((row) => row.join(' | ')).join('\n'))
    .join('\n---\n');
  return `${text}${tables ? `\n\nTABELAS\n${tables}` : ''}`.slice(0, MAX_CHARS_PER_SLIDE);
}

export async function generateConsultingSuggestion(ir: Ir): Promise<string> {
  const slides = ir.slides
    .map((slide) => ({ n: slide.n, titulo: slide.titulo ?? '', conteudo: slideText(slide) }))
    .filter((slide) => slide.conteudo.trim().length > 40);

  if (slides.length === 0) {
    throw new Error('Não foi possível extrair conteúdo suficiente do PPTX para gerar a análise.');
  }

  const { data, error } = await supabase.functions.invoke<{ suggestion?: string; error?: string }>(
    'analyze-consulting-suggestion',
    { body: { slides } },
  );
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.suggestion?.trim()) throw new Error('A IA não retornou uma sugestão de análise.');
  return data.suggestion;
}
