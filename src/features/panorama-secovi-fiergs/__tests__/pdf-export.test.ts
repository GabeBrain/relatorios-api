import { describe, expect, it } from 'vitest';
import { PANORAMA_EXPORT_HEIGHT, PANORAMA_EXPORT_WIDTH, PANORAMA_PDF_HEIGHT, PANORAMA_PDF_WIDTH } from '../lib/pdf-export';
import { PANORAMA_REPORT_MANIFEST } from '../report/manifest';

describe('Panorama PDF export contract', () => {
  it('uses 16:9 dimensions for capture and PDF pages', () => {
    expect(PANORAMA_EXPORT_WIDTH / PANORAMA_EXPORT_HEIGHT).toBeCloseTo(16 / 9);
    expect(PANORAMA_PDF_WIDTH / PANORAMA_PDF_HEIGHT).toBeCloseTo(16 / 9);
  });

  it('exports one active page per V2 reference slide, starting at the municipal cover', () => {
    expect(PANORAMA_REPORT_MANIFEST).toHaveLength(59);
    expect(PANORAMA_REPORT_MANIFEST[0]?.referenceSlide).toBe(2);
    expect(new Set(PANORAMA_REPORT_MANIFEST.map((page) => page.page)).size).toBe(PANORAMA_REPORT_MANIFEST.length);
  });

  it('keeps the institutional reference slide 3 at output position 5 and removes legacy cover/footer pages', () => {
    const outputFive = PANORAMA_REPORT_MANIFEST.find((page) => page.page === 5);
    const outputTwo = PANORAMA_REPORT_MANIFEST.find((page) => page.page === 2);
    expect(outputFive?.referenceSlide).toBe(3);
    expect(outputTwo?.referenceSlide).toBe(5);
    expect(new Set(PANORAMA_REPORT_MANIFEST.map((page) => page.referenceSlide)).size).toBe(59);
    expect(PANORAMA_REPORT_MANIFEST.some((page) => page.referenceSlide === 1)).toBe(false);
    expect(PANORAMA_REPORT_MANIFEST.some((page) => page.referenceSlide === 4)).toBe(false);
    expect(PANORAMA_REPORT_MANIFEST.some((page) => page.referenceSlide === 56)).toBe(false);
  });
});
