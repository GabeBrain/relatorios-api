import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PanoramaExportDeck } from '../components/ReportPaginator';
import { buildCityCube } from '../domain/cube';
import { buildPanoramaReportModel } from '../report/model';
import type { PanoramaScope } from '../types';

const source = (rows: Record<string, unknown>[]) => ({ rows, available: true, source: 'fixture' });
const temporalRows = ['1T2024', '2T2024', '3T2024', '4T2024', '1T2025', '2T2025', '3T2025', '4T2025'].flatMap((period, index) => [
  { period, building_type: 'Vertical', group: 'Médio', liquid_sales: 100 + index, vgv_liquid_sales: 50 + index, stock: 500 - index * 10 },
  { period, building_type: 'Vertical', group: '2 dormitórios', liquid_sales: 80 + index, vgv_liquid_sales: 40 + index, stock: 400 - index * 8 },
]);

describe('FIERGS · blocos editoriais próprios', () => {
  it('renderiza lançamentos, vendas, oferta e mapas sem cair no layout Secovi', () => {
    const scope: PanoramaScope = { uf: 'RS', cities: ['Canoas'], startQuarter: '1T2024', endQuarter: '4T2025', engineVersion: 'v4', entity: 'fiergs-rs' };
    const cube = buildCityCube([{ building_id: '1', name: 'Teste', building_type: 'Vertical', standard: 'Médio', release_date: '2025-10-01', total_units: 120, stock: 30, latitude: -29.92, longitude: -51.18, typologies_history: [{ period: '2025-10-01', number_bedroom: '2', qty: 120, release_price: 500000, private_area: 50 }, { period: '2025-12-01', number_bedroom: '2', typology_stock: 30, price: 500000, private_area: 50 }] }], { city: 'Canoas', uf: 'RS', endQuarter: '4T2025', engineVersion: 'v4', entity: 'fiergs-rs' });
    const temporal = source(temporalRows);
    const report = buildPanoramaReportModel(scope, [], { sales: temporal, salesTypology: temporal, stock: temporal, stockTypology: temporal, ivv: temporal, ivvTypology: temporal, ticket: temporal, ticketTypology: temporal, meter: temporal, meterTypology: temporal }, [], { cubes: [cube] });
    const { container } = render(React.createElement(PanoramaExportDeck, { report, rootRef: { current: null } }));
    expect(container.querySelectorAll('.panorama-report-page')).toHaveLength(75);
    expect(container.querySelectorAll('.panorama-fiergs-distribution').length).toBeGreaterThanOrEqual(7);
    expect(container.querySelectorAll('.panorama-fiergs-quarterly').length).toBeGreaterThanOrEqual(10);
    expect(container.querySelectorAll('.panorama-location-slide')).toHaveLength(3);
    expect(container.querySelector('[aria-label^="Página 57:"]')?.textContent).toContain('OFERTA FINAL POR TIPOLOGIA E METRAGEM');
    expect(container.querySelector('[aria-label^="Página 58:"]')?.textContent).toContain('MÍNIMO, MÉDIA E MÁXIMO DO PREÇO POR TIPOLOGIA');
    expect(container.querySelector('[aria-label^="Página 41:"]')?.textContent).toContain('não é reconstruído');
    expect(container.textContent).not.toContain('A posição editorial está preservada no livro FIERGS');
  });
});
