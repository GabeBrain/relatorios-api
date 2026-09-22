import { describe, expect, it } from 'vitest';
import { FIERGS_4T25_SLIDE_MANIFEST } from '../report/fiergs-manifest';
import { panoramaManifestFor } from '../report/manifest';

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

  it('acrescenta horizontal multiproduto e três mapas somente ao produto FIERGS', () => {
    const base = {
      provenance: { engineVersion: 'v4' as const },
      cube: { projects: [{ segment: 'Horizontal', finalUnits: 10 }] },
      locations: [{ latitude: -30.03, longitude: -51.23 }],
      cityComparisons: { enabled: false },
    };
    const fiergs = panoramaManifestFor({ ...base, scope: { entity: 'fiergs-rs' } }, 'pk.test');
    const secovi = panoramaManifestFor({ ...base, scope: { entity: 'secovi-sp' } }, 'pk.test');
    expect(fiergs.filter((page) => page.fiergsSlide)).toHaveLength(3);
    expect(fiergs[1]).toMatchObject({ title: 'Cidades analisadas', fiergsSlide: 'city-scope' });
    expect(fiergs.filter((page) => page.mapMode).map((page) => page.mapMode)).toEqual(['standard', 'stock', 'price']);
    expect(secovi.some((page) => page.fiergsSlide || page.mapMode)).toBe(false);
  });
});
