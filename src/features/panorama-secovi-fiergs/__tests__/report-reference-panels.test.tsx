import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GenerationNoticesPanel } from '../components/GenerationNoticesPanel';
import { VgvSlide } from '../components/MarketSlides';
import { FormulaReference, GlossaryReference, MethodologyReference } from '../components/ReportReferencePanels';
import { buildPanoramaReportModel } from '../report/model';
import { buildCityCube } from '../domain/cube';
import type { PanoramaScope } from '../types';

const empty = { rows: [], available: true, source: 'fixture' };
const sources = { sales: empty, salesTypology: empty, stock: empty, stockTypology: empty, ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty };

describe('referências e avisos do relatório', () => {
  it('distingue regras FIERGS e Secovi-SP e documenta IVV, disponibilidade e unidades', () => {
    const { unmount } = render(<MethodologyReference entity="fiergs-rs"/>);
    expect(screen.getByText(/Porto Alegre não integra o recorte/)).toBeTruthy();
    expect(screen.getByText(/vendas líquidas ÷ \(estoque final \+ vendas líquidas\)/)).toBeTruthy();
    unmount();

    render(<FormulaReference entity="secovi-sp"/>);
    expect(screen.getByText('Disponibilidade')).toBeTruthy();
    expect(screen.queryByText('IVV FIERGS')).toBeNull();
  });

  it('apresenta glossário e avisos originados no modelo', () => {
    const scope: PanoramaScope = { uf: 'RS', cities: ['Canoas', 'Guaíba'], startQuarter: '1T2026', endQuarter: '2T2026', entity: 'fiergs-rs' };
    const report = buildPanoramaReportModel(scope, [], sources, [], { provenance: {
      requestedCities: scope.cities, completedCities: ['Canoas'], failedCities: [{ city: 'Guaíba', error: 'HTTP 503' }],
    } });
    render(<><GlossaryReference/><GenerationNoticesPanel report={report}/></>);
    expect(screen.getByText('Oferta lançada histórica')).toBeTruthy();
    expect(screen.getByText(/Guaíba/)).toBeTruthy();
    expect(screen.getByText('CITY_COLLECTION_PARTIAL')).toBeTruthy();
    expect(report.notices.find((notice) => notice.code === 'CITY_COLLECTION_PARTIAL')?.period).toBe('1T2026–2T2026');
  });

  it('registra venda líquida negativa sem convertê-la em ausência', () => {
    const scope: PanoramaScope = { uf: 'RS', cities: ['Canoas'], startQuarter: '1T2026', endQuarter: '2T2026', entity: 'fiergs-rs' };
    const cube = buildCityCube([{ building_id: 'N1', name: 'Saldo observado', building_type: 'Vertical', standard: 'Médio', release_date: '2025-01-01', total_units: 10,
      typologies_history: [{ period: '2025-01-01', number_bedroom: '2', qty: 10, release_price: 400000, private_area: 50 },
        { period: '2026-06-01', number_bedroom: '2', typology_stock: 10, liquid_sales: -1, price: 400000, private_area: 50 }] }],
    { city: 'Canoas', uf: 'RS', endQuarter: '2T2026', entity: 'fiergs-rs' });
    const report = buildPanoramaReportModel(scope, [], sources, [], { cubes: [cube] });
    expect(report.cube.projects[0]?.soldUnits).toBe(-1);
    expect(report.notices).toContainEqual(expect.objectContaining({ code: 'NEGATIVE_NET_SALES_OBSERVED' }));
  });

  it('remove colunas de VGV sem observações sem remover as colunas numéricas disponíveis', () => {
    const scope: PanoramaScope = { uf: 'RS', cities: ['Canoas'], startQuarter: '1T2026', endQuarter: '2T2026', entity: 'fiergs-rs' };
    const cube = buildCityCube([{ building_id: 'NV1', name: 'Sem preço', building_type: 'Vertical', standard: 'Médio', release_date: '2025-01-01', total_units: 10,
      typologies_history: [{ period: '2025-01-01', number_bedroom: '2', qty: 10 },
        { period: '2026-06-01', number_bedroom: '2', typology_stock: 8, liquid_sales: 2 }] }],
    { city: 'Canoas', uf: 'RS', endQuarter: '2T2026', entity: 'fiergs-rs' });
    const report = buildPanoramaReportModel(scope, [], sources, [], { cubes: [cube] });
    const { container } = render(<VgvSlide report={report}/>);
    const headers = [...container.querySelectorAll('th')].map((header) => header.textContent);
    expect(headers).toContain('Lançada');
    expect(headers).toContain('Vendas líquidas');
    expect(headers).not.toContain('Lançada (R$ mi)');
    expect(headers).not.toContain('Final (R$ mi)');
    expect(headers).not.toContain('VGV vendido (R$ mi)');
  });
});
