import { describe, expect, it } from 'vitest';
import { PANORAMA_EXPORT_HEIGHT, PANORAMA_EXPORT_WIDTH, PANORAMA_PDF_HEIGHT, PANORAMA_PDF_WIDTH } from '../lib/pdf-export';
import { PANORAMA_REPORT_MANIFEST } from '../report/manifest';

describe('Panorama PDF export contract', () => {
  it('uses 16:9 dimensions for capture and PDF pages', () => {
    expect(PANORAMA_EXPORT_WIDTH / PANORAMA_EXPORT_HEIGHT).toBeCloseTo(16 / 9);
    expect(PANORAMA_PDF_WIDTH / PANORAMA_PDF_HEIGHT).toBeCloseTo(16 / 9);
  });

  it('exports one active page per reference slide, including the municipal cover', () => {
    expect(PANORAMA_REPORT_MANIFEST).toHaveLength(62);
    expect(PANORAMA_REPORT_MANIFEST.map((page) => page.page)).toContain(2);
    expect(new Set(PANORAMA_REPORT_MANIFEST.map((page) => page.page)).size).toBe(PANORAMA_REPORT_MANIFEST.length);
  });
});
