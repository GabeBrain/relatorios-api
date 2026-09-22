import { describe, expect, it } from 'vitest';
import { FIERGS_4T25_SLIDE_MANIFEST } from '../report/fiergs-manifest';

describe('manifesto FIERGS RM Porto Alegre 4T25', () => {
  it('registra os 75 slides sem lacunas', () => {
    expect(FIERGS_4T25_SLIDE_MANIFEST).toHaveLength(75);
    expect(FIERGS_4T25_SLIDE_MANIFEST.map((item) => item.slide)).toEqual(Array.from({ length: 75 }, (_, index) => index + 1));
  });

  it('registra o horizontal completo e os três mapas', () => {
    expect(FIERGS_4T25_SLIDE_MANIFEST.filter((item) => item.dataFamily === 'horizontal').map((item) => item.slide)).toEqual([62, 63, 64, 65, 66]);
    expect(FIERGS_4T25_SLIDE_MANIFEST.filter((item) => item.dataFamily === 'maps').map((item) => item.slide)).toEqual([67, 68, 69]);
  });

  it('não classifica nenhuma lâmina de dados como estática', () => {
    expect(FIERGS_4T25_SLIDE_MANIFEST.filter((item) => item.automation === 'static').every((item) => ['institutional', 'credits'].includes(item.dataFamily))).toBe(true);
  });
});
