import { describe, expect, it } from 'vitest';
import { buildCityCube } from '../domain/cube';
import { cubeInLaunchWindow, buildGranularBlocks } from '../report/model';
import type { PanoramaScope } from '../types';

const scope: PanoramaScope = { uf: 'SP', cities: ['Jundiai'], startQuarter: '1T2023', endQuarter: '2T2026' };

const building = (id: string, releaseDate: string, units: number) => ({
  building_id: id,
  name: id,
  building_type: 'Horizontal',
  building_subtype: 'Condomínio de Casas',
  standard: 'Condominio de Casas/Sobrados',
  release_date: releaseDate,
  total_units: units,
  typologies_history: [
    { period: releaseDate, number_bedroom: '3', qty: units, release_price: 500000, private_area: 90 },
    { period: '2026-06-01', number_bedroom: '3', typology_stock: Math.floor(units / 2), liquid_sales: Math.ceil(units / 2), price: 520000, private_area: 90 },
  ],
});

describe('Panorama V4 - janela de lancamentos', () => {
  it('exclui empreendimentos anteriores ao inicio do recorte de oferta, coortes e VGV', () => {
    const cube = buildCityCube([
      building('before-window', '2022-10-01', 402),
      building('inside-window', '2024-03-01', 428),
    ], { city: 'Jundiai', uf: 'SP', endQuarter: '2T2026' });

    expect(cubeInLaunchWindow(cube, scope).projects.map((project) => project.buildingId)).toEqual(['inside-window']);
    expect(buildGranularBlocks(cube, scope).cohortsHorizontal.map((row) => row.label)).not.toContain('Até 2022');
    expect(buildGranularBlocks(cube, scope).cohortsHorizontal.at(-1)?.launchedUnits).toBe(428);
  });
});
