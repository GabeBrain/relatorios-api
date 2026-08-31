import { describe, expect, it } from 'vitest';
import { PANORAMA_EXPORT_HEIGHT, PANORAMA_EXPORT_WIDTH, PANORAMA_PDF_HEIGHT, PANORAMA_PDF_WIDTH } from '../lib/pdf-export';
import { createPanoramaReportManifest, createPanoramaSections, PANORAMA_REPORT_MANIFEST } from '../report/manifest';

describe('Panorama PDF export contract', () => {
  it('uses 16:9 dimensions for capture and PDF pages', () => {
    expect(PANORAMA_EXPORT_WIDTH / PANORAMA_EXPORT_HEIGHT).toBeCloseTo(16 / 9);
    expect(PANORAMA_PDF_WIDTH / PANORAMA_PDF_HEIGHT).toBeCloseTo(16 / 9);
  });

  it('uses the same 16:9 capture for the mirrored PowerPoint export', () => {
    expect(PANORAMA_EXPORT_WIDTH).toBe(1920);
    expect(PANORAMA_EXPORT_HEIGHT).toBe(1080);
  });

  it('exports one active page per V2 reference slide, starting at the municipal cover', () => {
    expect(PANORAMA_REPORT_MANIFEST).toHaveLength(57);
    expect(PANORAMA_REPORT_MANIFEST[0]?.referenceSlide).toBe(2);
    expect(new Set(PANORAMA_REPORT_MANIFEST.map((page) => page.page)).size).toBe(PANORAMA_REPORT_MANIFEST.length);
  });

  it('keeps the institutional reference slide 3 at output position 5 and removes legacy cover/footer pages', () => {
    const outputFive = PANORAMA_REPORT_MANIFEST.find((page) => page.page === 5);
    const outputTwo = PANORAMA_REPORT_MANIFEST.find((page) => page.page === 2);
    expect(outputFive?.referenceSlide).toBe(3);
    expect(outputTwo?.referenceSlide).toBe(5);
    expect(new Set(PANORAMA_REPORT_MANIFEST.map((page) => page.referenceSlide)).size).toBe(57);
    expect(PANORAMA_REPORT_MANIFEST.some((page) => page.referenceSlide === 1)).toBe(false);
    expect(PANORAMA_REPORT_MANIFEST.some((page) => page.referenceSlide === 4)).toBe(false);
    expect(PANORAMA_REPORT_MANIFEST.some((page) => page.referenceSlide === 56)).toBe(false);
    expect(PANORAMA_REPORT_MANIFEST.some((page) => page.referenceSlide === 61 || page.referenceSlide === 62)).toBe(false);
  });

  it('adds three city-comparison pages after the market summary only for a complete multicity report', () => {
    const manifest = createPanoramaReportManifest(true);
    expect(manifest).toHaveLength(60);
    expect(manifest.filter((page) => page.cityComparison).map((page) => page.cityComparison)).toEqual(['sales', 'market', 'availability']);
    expect(manifest.find((page) => page.referenceSlide === 29)?.page).toBe(27);
    expect(manifest.find((page) => page.referenceSlide === 30)?.page).toBe(31);
    expect(createPanoramaSections(manifest).find((section) => section.id === 'market')).toMatchObject({ start: 26, end: 30 });
  });
});
