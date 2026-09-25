import { describe, expect, it } from 'vitest';
import { validateBuildings } from './validation-rules';
import type { ValidationBuilding, ValidationHistory } from './api';

function history(period: string, price: number, priceM2 = 5_000): ValidationHistory {
  return {
    period, periodDate: new Date(period), price, price_private_area: priceM2, typology_stock: 1, sold_in_period: 0,
    vgv_stock: null, pattern: 'Condomínio de Casas/Sobrados', building_status: 'Ativo', time_on_sale: null,
    private_area: 160, public_area: null, price_public_area: null, release_price: price, vgv_total: null, sold: 0,
    type_of_typology: 'Padrão', number_bedroom: 0, number_suite: 0, garage: 1, garage_label: '1 vaga', qty: 1,
    distractions: null, gross_sales: null, estagio_empreendimento: '', taxa_associativa: null,
  };
}

function building(histories: ValidationHistory[]): ValidationBuilding {
  return {
    building_id: 'building-1', name: 'Condomínio teste', status: 'Ativo', city: 'Cidade teste', state: 'MT', neighborhood: '',
    building_type: 'Horizontal', standard: 'Condomínio de Casas/Sobrados', release_date: '2026-01-01', releaseYear: 2026,
    typologies: [{ typology_id: 'typology-1', type_of_typology: 'Padrão', number_bedroom: 0, garage: 1, qty: 1, private_area: 160, release_price: histories.at(-1)?.price ?? null, history: histories }],
  } as ValidationBuilding;
}

describe('validateBuildings — regras de Condomínio de Casas/Sobrados', () => {
  it('avalia a última fotografia e compara o preço com o período imediatamente anterior', () => {
    const errors = validateBuildings([building([history('2026-01-01', 100_000), history('2026-02-01', 120_000, 21_000)])]);
    const labels = errors.map((error) => error.error);

    expect(labels).toContain('Ticket médio abaixo de R$ 215.000 | Condomínio de Casas');
    expect(labels).toContain('Área privativa acima de 150 m² | Condomínio de Casas');
    expect(labels).toContain('Preço/m² acima de R$ 20.000/m² | Condomínio de Casas');
    expect(labels).toContain('Não possui dormitórios cadastrados | Condomínio de Casas');
    expect(labels).toContain('Variação de preço acima de 10% em relação ao período anterior');
    expect(errors.find((error) => error.error === 'Variação de preço acima de 10% em relação ao período anterior')?.value).toContain('Período anterior: 2026-01-01');
  });

  it('não cria variação de preço para uma tipologia sem período anterior', () => {
    const errors = validateBuildings([building([history('2026-02-01', 120_000)])]);
    expect(errors.some((error) => error.error === 'Variação de preço acima de 10% em relação ao período anterior')).toBe(false);
  });
});
