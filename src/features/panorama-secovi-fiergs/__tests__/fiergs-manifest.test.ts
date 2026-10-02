import { describe, expect, it } from 'vitest';
import { FIERGS_4T25_SLIDE_MANIFEST } from '../report/fiergs-manifest';
import { FIERGS_REDUNDANT_OFFICIAL_SLIDES, panoramaManifestFor } from '../report/manifest';

describe('manifesto FIERGS RM Porto Alegre 4T25', () => {
  it('registra os 75 slides sem lacunas', () => {
    expect(FIERGS_4T25_SLIDE_MANIFEST).toHaveLength(75);
    expect(FIERGS_4T25_SLIDE_MANIFEST.map((item) => item.slide)).toEqual(Array.from({ length: 75 }, (_, index) => index + 1));
  });

  it('mantém VGV antes da seção horizontal e registra o horizontal completo e os três mapas', () => {
    expect(FIERGS_4T25_SLIDE_MANIFEST.find((item) => item.slide === 61)?.dataFamily).toBe('vertical');
    expect(FIERGS_4T25_SLIDE_MANIFEST.filter((item) => item.dataFamily === 'horizontal').map((item) => item.slide)).toEqual([62, 63, 64, 65, 66]);
    expect(FIERGS_4T25_SLIDE_MANIFEST.filter((item) => item.dataFamily === 'maps').map((item) => item.slide)).toEqual([67, 68, 69]);
  });

  it('não classifica nenhuma lâmina de dados como estática', () => {
    expect(FIERGS_4T25_SLIDE_MANIFEST.filter((item) => item.automation === 'static').every((item) => ['institutional', 'credits'].includes(item.dataFamily))).toBe(true);
  });

  it('remove cópias editoriais, restaura maturidade/VGV, condiciona a anual e preserva mapas', () => {
    const base = {
      provenance: { engineVersion: 'v4' as const },
      cube: { projects: [{ segment: 'Horizontal', finalUnits: 10 }] },
      locations: [{ latitude: -30.03, longitude: -51.23 }],
      cityComparisons: { enabled: false },
    };
    const fiergs = panoramaManifestFor({ ...base, scope: { entity: 'fiergs-rs' } }, 'pk.test');
    const fiergsWithoutMapToken = panoramaManifestFor({ ...base, scope: { entity: 'fiergs-rs' } });
    const secovi = panoramaManifestFor({ ...base, scope: { entity: 'secovi-sp' } }, 'pk.test');
    const expectedOfficialSlides = Array.from({ length: 75 }, (_, index) => index + 1)
      .filter((slide) => slide !== 41 && !FIERGS_REDUNDANT_OFFICIAL_SLIDES.has(slide));
    expect(fiergs).toHaveLength(70);
    expect(fiergs.map((page) => page.page)).toEqual(Array.from({ length: 70 }, (_, index) => index + 1));
    expect(fiergs.map((page) => page.fiergsOfficialSlide)).toEqual(expectedOfficialSlides);
    expect(fiergs.some((page) => FIERGS_REDUNDANT_OFFICIAL_SLIDES.has(page.fiergsOfficialSlide!))).toBe(false);
    expect(fiergs.find((page) => page.fiergsOfficialSlide === 61)).toMatchObject({ sectionId: 'vgv', visualFamily: 'market-table', contentReferenceSlide: 51 });
    expect(fiergs.find((page) => page.fiergsOfficialSlide === 63)?.fiergsSlide).toBe('horizontal-offer-products');
    expect(fiergs[6]).toMatchObject({ title: 'Região Metropolitana de Porto Alegre', fiergsOfficialSlide: 7 });
    expect(fiergs.filter((page) => page.mapMode).map((page) => page.mapMode)).toEqual(['standard', 'stock', 'price']);
    expect(fiergsWithoutMapToken.filter((page) => page.mapMode)).toHaveLength(3);
    expect(secovi.some((page) => page.fiergsSlide || page.mapMode)).toBe(false);
    const withAnnual = panoramaManifestFor({ ...base, scope: { entity: 'fiergs-rs' }, annualAreaIvv: [
      { kind: 'row', previousUnits: 10, finalUnits: 8, launchedUnits: 1, soldUnits: 3, ivv: 27.27 },
      { kind: 'total', previousUnits: 10, finalUnits: 8, launchedUnits: 1, soldUnits: 3, ivv: 27.27 },
    ] });
    expect(withAnnual).toHaveLength(71);
    expect(withAnnual.some((page) => page.fiergsOfficialSlide === 41)).toBe(true);
    expect(fiergsWithoutMapToken.some((page) => page.fiergsOfficialSlide === 41)).toBe(false);
  });
});
