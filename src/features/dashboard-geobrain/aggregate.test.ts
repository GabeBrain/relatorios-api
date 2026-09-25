import { describe, expect, it } from 'vitest';
import { applyFilters, computeKpis, computeOpportunityMap } from './aggregate';
import type { Building, Filters } from './types';

const filters: Filters = {
  from: null, to: null, years: [], periods: [], status: [], states: [], cities: [], neighborhoods: [],
  types: [], typologies: [], standards: [], bedrooms: [], garages: [], buildings: [],
  privateAreas: [], pricePerM2: [],
};

function typology(type_of_typology: string, qty: number, price: number, private_area: number | null, typology_stock: number) {
  return {
    typology_id: `${type_of_typology}-${qty}-${typology_stock}`,
    type_of_typology,
    qty,
    history: [{
      period: '2026-09-01', periodDate: new Date('2026-09-01'), price, private_area,
      qty, typology_stock, sold_in_period: 0, vgv_stock: null,
    }],
  };
}

describe('computeKpis', () => {
  it('calcula preço e preço/m² apenas com tipologias Padrão disponíveis', () => {
    const buildings = [{
      building_id: '1', status: 'Ativo', typologies: [
        typology('Padrão', 2, 100, 50, 2),
        typology('Padrão', 3, 200, null, 1),
        typology('Cobertura', 5, 1_000, 100, 5),
        typology('Padrão', 8, 500, 80, 0),
      ],
    }] as unknown as Building[];

    const kpis = computeKpis(buildings, filters);

    expect(kpis.precoMedio).toBe(160);
    expect(kpis.precoMedioM2).toBe(2);
  });
});

describe('computeOpportunityMap', () => {
  it('mantém a coluna 0 dorms mesmo quando o recorte não possui essa tipologia', () => {
    const buildings = [{
      neighborhood: 'Centro', typologies: [
        { number_bedroom: 1, history: [{ period: '2026-09-01', typology_stock: 10, sold_in_period: 2 }] },
        { number_bedroom: 2, history: [{ period: '2026-09-01', typology_stock: 8, sold_in_period: 4 }] },
      ],
    }] as unknown as Building[];

    const matrix = computeOpportunityMap(buildings, filters, 'neighborhood');

    expect(matrix.cols).toEqual(['0 dorms', '1 dorm', '2 dorms', '3 dorms', '4 dorms']);
    expect(matrix.data.Centro['0 dorms']).toBe(0);
    expect(matrix.data.Centro['1 dorm']).toBeCloseTo(2 / 12);
  });

  it('filtra dados por UF e Município e permite agrupar o mapa por UF', () => {
    const buildings = [
      { state: 'SP', city: 'São Paulo', neighborhood: 'Centro', typologies: [{ number_bedroom: 1, history: [{ period: '2026-09-01', typology_stock: 8, sold_in_period: 2 }] }] },
      { state: 'MG', city: 'Belo Horizonte', neighborhood: 'Savassi', typologies: [{ number_bedroom: 1, history: [{ period: '2026-09-01', typology_stock: 6, sold_in_period: 3 }] }] },
    ] as unknown as Building[];
    const scopedFilters = { ...filters, states: ['SP'], cities: ['São Paulo'] };

    const filtered = applyFilters(buildings, scopedFilters);
    const matrix = computeOpportunityMap(filtered, scopedFilters, 'state');

    expect(filtered).toHaveLength(1);
    expect(matrix.rowLabel).toBe('UF');
    expect(matrix.rows).toEqual(['SP']);
  });
});
