import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { buildCityCube } from '../domain/cube';
import { maturityByStandard, maturityByTypology } from '../domain/aggregations';
import { buildPanoramaReportModel } from '../report/model';
import { PanoramaExportDeck } from '../components/ReportPaginator';
import { panoramaManifestFor } from '../report/manifest';
import { PANORAMA_EXPORT_HEIGHT, PANORAMA_EXPORT_WIDTH, PANORAMA_PDF_HEIGHT, PANORAMA_PDF_WIDTH } from '../lib/pdf-export';
import type { PanoramaScope } from '../types';

const source = (rows: Record<string, unknown>[]) => ({ rows, available: true, source: 'fixture' });
const empty = source([]);
const scope: PanoramaScope = { uf: 'SP', cities: ['Jundiaí'], startQuarter: '1T2023', endQuarter: '2T2026', engineVersion: 'v4' };

function building(id: string, releaseDate: string, totalUnits: number, stock: number, typedLaunch: number, typedStock: number) {
  return {
    building_id: id,
    name: id,
    building_type: 'Vertical',
    standard: 'Médio',
    release_date: releaseDate,
    total_units: totalUnits,
    stock,
    typologies_history: [
      { period: releaseDate, number_bedroom: '2', qty: typedLaunch, release_price: 500000, private_area: 50 },
      { period: '2026-06-01', number_bedroom: '2', typology_stock: typedStock, price: 500000, private_area: 50 },
    ],
  };
}

describe('Panorama V4 — ajustes finais de Juliana', () => {
  it('maturidade usa somente empreendimentos no intervalo editorial', () => {
    const cube = buildCityCube([
      building('fora', '2022-10-01', 400, 100, 400, 100),
      building('dentro', '2024-03-01', 100, 40, 100, 40),
    ], { city: 'Jundiaí', uf: 'SP', endQuarter: '2T2026', engineVersion: 'v4' });
    const report = buildPanoramaReportModel(scope, [], {
      sales: empty, salesTypology: empty, stock: empty, stockTypology: empty,
      ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty,
    }, [], { cubes: [cube] });
    const total = report.granular.maturityByStandard.at(-1)!;
    expect(total.launched.total).toBe(100);
    expect(total.final.total).toBe(40);
  });

  it('expõe resíduo sem tipologia e mantém o total canônico do empreendimento', () => {
    const cube = buildCityCube([building('partial', '2024-03-01', 100, 40, 60, 20)], { city: 'Jundiaí', uf: 'SP', endQuarter: '2T2026', engineVersion: 'v4' });
    const rows = maturityByTypology(cube);
    const residual = rows.find((row) => row.label === 'Não classificado')!;
    const total = rows.find((row) => row.kind === 'total')!;
    expect(residual.launched.total).toBe(40);
    expect(residual.final.total).toBe(20);
    expect(total.launched.total).toBe(100);
    expect(total.final.total).toBe(40);
    expect(maturityByStandard(cube).at(-1)?.launched.total).toBe(total.launched.total);
  });

  it('reconcilia somente o ponto de fechamento do preço temporal', () => {
    const cube = buildCityCube([building('price', '2024-03-01', 100, 40, 100, 40)], { city: 'Jundiaí', uf: 'SP', endQuarter: '2T2026', engineVersion: 'v4' });
    const meter = source([
      { period: '1T2024', building_type: 'Vertical', group: 'Médio', average_price_per_meter: 9000 },
      { period: '2T2026', building_type: 'Vertical', group: 'Médio', average_price_per_meter: 9999 },
    ]);
    const report = buildPanoramaReportModel(scope, [], {
      sales: empty, salesTypology: empty, stock: empty, stockTypology: empty,
      ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter, meterTypology: empty,
    }, [], { cubes: [cube] });
    expect(report.granular.pricesByStandard.at(-1)?.averagePricePerMeter).toBe(10000);
    expect(report.prices.meter.series.at(-1)?.vertical).toBe(10000);
    expect(report.prices.meter.series[0]?.vertical).toBe(0);
  });

  it('mantém preview, PDF e PPT no mesmo manifesto e proporção 16:9', () => {
    const cube = buildCityCube([building('parity', '2024-03-01', 100, 40, 100, 40)], { city: 'Jundiaí', uf: 'SP', endQuarter: '2T2026', engineVersion: 'v4' });
    const report = buildPanoramaReportModel(scope, [], {
      sales: empty, salesTypology: empty, stock: empty, stockTypology: empty,
      ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty,
    }, [], { cubes: [cube] });
    const { container } = render(React.createElement(PanoramaExportDeck, { report, rootRef: { current: null } }));
    expect(container.querySelectorAll('.panorama-report-page')).toHaveLength(panoramaManifestFor(report, '').length);
    expect(PANORAMA_EXPORT_WIDTH / PANORAMA_EXPORT_HEIGHT).toBeCloseTo(16 / 9);
    expect(PANORAMA_PDF_WIDTH / PANORAMA_PDF_HEIGHT).toBeCloseTo(16 / 9);
    expect(PANORAMA_EXPORT_WIDTH).toBe(1920);
    expect(PANORAMA_EXPORT_HEIGHT).toBe(1080);
  });
});
