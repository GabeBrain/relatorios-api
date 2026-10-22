import { describe, expect, it } from 'vitest';
import { validateBuildings } from './validation-rules';
import type { ValidationBuilding, ValidationHistory } from './api';

function building(id: string, overrides: Partial<ValidationHistory> = {}, metadata: Partial<ValidationBuilding> = {}): ValidationBuilding {
  const h = { period: '2026-09-01', periodDate: new Date('2026-09-01'), qty: 10, sold: 5, price: 100000, price_private_area: 2000, private_area: 50, pattern: 'Médio', type_of_typology: 'Padrão', number_bedroom: 2, garage_label: '0 vagas', ...overrides } as ValidationHistory;
  return { building_id: id, name: id, city: 'Sinop', state: 'MT', building_type: 'Vertical', standard: 'Médio', zipcode: '78550000', release_date: '2025-01-01', period: '2026-09-01', status: 'Ativo', total_stock: 10, typologies: [{ typology_id: `t${id}`, history: [h] }], ...metadata } as ValidationBuilding;
}

describe('Farol 20261021', () => {
  it('usa média ponderada, exige três empreendimentos distintos e separa o cluster por CEP e ano de lançamento', () => {
    const a = building('1', { qty: 1, price: 200000 });
    const b = building('2');
    const c = building('3');
    const priceRule = (data: ValidationBuilding[]) => validateBuildings(data).filter((r) => r.field === 'price' && r.error.includes('30%'));
    expect(priceRule([a, b])).toHaveLength(0);
    const matches = priceRule([a, b, c]);
    expect(matches).toHaveLength(1);
    expect(matches[0].value).toContain('104.761,9');
    expect(priceRule([a, b, { ...c, zipcode: '78560000' }])).toHaveLength(0);
    expect(priceRule([a, b, { ...c, release_date: '2024-01-01' }])).toHaveLength(0);
  });

  it('compara com vagas contra sem vagas do mesmo cluster, incluindo preço/m²', () => {
    const result = validateBuildings([building('1', { garage_label: '1 vaga', price: 90000, price_private_area: 1800 }), building('2')]);
    expect(result.filter((r) => r.error.includes('com vaga ≤'))).toHaveLength(2);
    expect(validateBuildings([building('1', { garage_label: '1 vaga' })]).some((r) => r.error.includes('com vaga ≤'))).toBe(false);
  });

  it('área abaixo de 10 só em clusters pequenos e sem as antigas regras', () => {
    const tiny = building('1', { private_area: 5 });
    expect(validateBuildings([tiny]).some((r) => r.error === 'Desvio ≥ 40% da média do cluster')).toBe(true);
    const result = validateBuildings([tiny, building('2'), building('3')]);
    expect(result.some((r) => r.error === 'Desvio ≥ 40% da média do cluster')).toBe(false);
    expect(result.some((r) => /215.000|período anterior|3.500/.test(r.error))).toBe(false);
  });

  it('usa limite de estoque de 70% para antigos e 20% para recentes, uma linha por empreendimento', () => {
    expect(validateBuildings([building('1', {}, { release_date: '2020-01-01', total_stock: 7 })]).some((r) => r.field === 'total_stock')).toBe(false);
    const old = validateBuildings([building('1', {}, { release_date: '2020-01-01', total_stock: 8 })]).find((r) => r.field === 'total_stock');
    expect(old?.isBuildingRule).toBe(true);
    expect(old?.typology_id).toBe('0');
    expect(validateBuildings([building('1', {}, { total_stock: 2 })]).some((r) => r.error.includes('≤ 20%'))).toBe(true);
  });
});
