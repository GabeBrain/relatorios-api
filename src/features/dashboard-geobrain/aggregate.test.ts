import { describe, expect, it } from 'vitest';
import { computeKpis } from './aggregate';
import type { Building, Filters } from './types';

const filters: Filters = {
  from: null, to: null, years: [], periods: [], status: [], cities: [], neighborhoods: [],
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
