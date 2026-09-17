import { describe, expect, it } from 'vitest';
import {
  MAX_SUGGESTION_CHARS_PER_BATCH,
  MAX_SUGGESTION_SLIDES_PER_BATCH,
  partitionConsultingSuggestionSlides,
  type ConsultingSuggestionSlide,
} from '../consulting-suggestion';

const slide = (n: number, chars = 100): ConsultingSuggestionSlide => ({ n, titulo: `Slide ${n}`, conteudo: 'x'.repeat(chars) });

describe('partitionConsultingSuggestionSlides', () => {
  it('mantém até 180 slides em uma única chamada', () => {
    expect(partitionConsultingSuggestionSlides(Array.from({ length: MAX_SUGGESTION_SLIDES_PER_BATCH }, (_, i) => slide(i + 1)))).toHaveLength(1);
  });

  it('divide a partir do 181º slide', () => {
    const batches = partitionConsultingSuggestionSlides(Array.from({ length: MAX_SUGGESTION_SLIDES_PER_BATCH + 1 }, (_, i) => slide(i + 1)));
    expect(batches.map((batch) => batch.length)).toEqual([180, 1]);
  });

  it('divide quando o conteúdo ultrapassa 180 mil caracteres', () => {
    const batches = partitionConsultingSuggestionSlides([slide(1, MAX_SUGGESTION_CHARS_PER_BATCH - 1), slide(2, 2)]);
    expect(batches.map((batch) => batch.length)).toEqual([1, 1]);
  });
});
