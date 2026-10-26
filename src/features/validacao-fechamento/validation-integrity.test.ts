import { describe, expect, it } from 'vitest';
import type { ValidationBuilding, ValidationHistory } from './api';
import { validateBuildings } from './validation-rules';

function fixture(history: Partial<ValidationHistory> = {}, releaseDate = '2026-09-01'): ValidationBuilding {
  return {
    building_id: '1', name: 'Teste', city: 'Sinop', state: 'MT', building_type: 'Horizontal',
    standard: 'Médio', zipcode: '78550000', release_date: releaseDate, period: '2026-09-01', status: 'Ativo', total_stock: 5,
    typologies: [{ typology_id: '10', history: [{ period: '2026-09-01', qty: 10, sold: 5, private_area: 50,
      price: 100000, release_price: 100000, price_private_area: 2000, building_status: 'Ativo',
      type_of_typology: 'Padrão', number_bedroom: 2, garage_label: '0 vagas', ...history }] }],
  } as ValidationBuilding;
}

const findings = (history: Partial<ValidationHistory>, releaseDate?: string) => validateBuildings([fixture(history, releaseDate)]);
const has = (history: Partial<ValidationHistory>, error: string, releaseDate?: string) => findings(history, releaseDate).some((r) => r.error === error);

describe('Integridade Farol 26/10/2026', () => {
  it('não acusa uma tipologia consistente', () => {
    expect(findings({})).toEqual([]);
  });

  it('área nula equivale a zero, exceto para status histórico Futuro', () => {
    expect(has({ private_area: null }, 'Área privativa zerada')).toBe(true);
    expect(has({ private_area: 0, building_status: 'Futuro' }, 'Área privativa zerada')).toBe(false);
    const row = findings({ private_area: 0 }).find((r) => r.error === 'Área privativa zerada')!;
    expect(row.group).toBe('');
    expect(row.isBuildingRule).toBe(false);
    expect(row.typology_id).toBe('10');
  });

  it('compara preço/m² gravado com divisão arredondada a duas casas, inclusive área zero', () => {
    const error = 'Preço M2 diferente de (Preço / Área Privativa)';
    expect(has({ price: 100, private_area: 3, price_private_area: 33.33 }, error)).toBe(false);
    expect(has({ price: 100, private_area: 3, price_private_area: 33.34 }, error)).toBe(true);
    expect(has({ private_area: 0, price_private_area: 0 }, error)).toBe(false);
    expect(has({ private_area: 0, price_private_area: 1 }, error)).toBe(true);
  });

  it.each(['Ativo', 'esgotado', 'LANÇADO'])('preços zerados usam o status histórico %s', (status) => {
    const result = findings({ price: null, release_price: null, building_status: status });
    expect(result.some((r) => r.error === 'Preço de lançamento zerado' && r.value.includes('09/2026'))).toBe(true);
    expect(result.some((r) => r.error === 'Preço do período zerado' && r.value.includes('09/2026'))).toBe(true);
    expect(findings({ price: 0, release_price: 0, building_status: 'Futuro' }).some((r) => /Preço (de lançamento|do período) zerado/.test(r.error))).toBe(false);
  });

  it('quantidade zerada exige o mesmo dia do lançamento e não somente o mesmo mês', () => {
    const error = 'Quantidade lançada zerada';
    expect(has({ qty: null }, error)).toBe(true);
    expect(has({ qty: 0 }, error, '2026-09-02')).toBe(false);
    expect(has({ qty: 0 }, error, '')).toBe(false);
  });

  it('preços de lançamento e período são comparados a duas casas apenas no lançamento', () => {
    const error = 'Preço de lançamento diferente do preço do período';
    expect(has({ release_price: 100000.004 }, error)).toBe(false);
    expect(has({ release_price: 100001 }, error)).toBe(true);
    expect(has({ release_price: 100001 }, error, '2026-08-01')).toBe(false);
  });

  it('não adiciona as duas regras de preço baixo redundantes com o desvio da mediana', () => {
    const a = fixture({ price: 30000, price_private_area: 600 });
    const b = fixture({ price: 100000 });
    b.building_id = '2';
    b.typologies[0].typology_id = '20';
    const result = validateBuildings([a, b]);
    expect(result.some((r) => r.field === 'price' && r.error === 'Desvio ≥ 30% da mediana do cluster')).toBe(true);
    expect(result.some((r) => /Preço abaixo de R\$ (40|100)\.000/.test(r.error))).toBe(false);
  });

  it('processa somente o último registro da tipologia', () => {
    const b = fixture();
    b.typologies[0].history.unshift({ ...b.typologies[0].history[0], period: '2026-08-01', private_area: 0, price: 0, release_price: 0 });
    expect(validateBuildings([b])).toEqual([]);
  });
});
