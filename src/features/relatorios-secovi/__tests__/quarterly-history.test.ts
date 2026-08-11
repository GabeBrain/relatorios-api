import { describe, expect, it } from 'vitest';

import { aggregateTypologyHistoryByQuarter, filterHistoryThroughQuarter, periodToQuarter } from '../quarterly-history';

const rubi = [
  { period: '2025-11-01', sold_in_period: 49, typology_stock: 607, price: 263000 },
  { period: '2025-12-01', sold_in_period: 300, typology_stock: 307, price: 263000 },
  { period: '2026-03-01', sold_in_period: 100, typology_stock: 207, price: 263000 },
  { period: '2026-06-01', sold_in_period: 18, typology_stock: 189, price: 300000 },
];

describe('aggregateTypologyHistoryByQuarter', () => {
  it('soma todos os fechamentos do trimestre — regressão da Rubi', () => {
    const result = aggregateTypologyHistoryByQuarter(rubi);

    expect(result.get('4T2025')?.sales).toBe(349);
    expect(result.get('1T2026')?.sales).toBe(100);
    expect(result.get('2T2026')?.sales).toBe(18);
    expect(result.get('4T2025')?.lastEntry.typology_stock).toBe(307);
    expect(result.get('2T2026')?.lastEntry.typology_stock).toBe(189);
  });

  it('não deixa um último mês zerado apagar as vendas anteriores', () => {
    const result = aggregateTypologyHistoryByQuarter([
      { period: '2026-01-01', sold_in_period: 5, typology_stock: 95, price: 100000 },
      { period: '2026-02-01', sold_in_period: 7, typology_stock: 88, price: 100000 },
      { period: '2026-03-01', sold_in_period: 0, typology_stock: 88, price: 100000 },
    ]);

    expect(result.get('1T2026')).toMatchObject({ sales: 12, hasSalesData: true, grossSalesVgv: 1200000 });
  });

  it('ordena entradas fora de ordem e preserva o último snapshot', () => {
    const result = aggregateTypologyHistoryByQuarter([
      { period: '2026-03-01', sold_in_period: 2, typology_stock: 80, price: 120000 },
      { period: '2026-01-01', sold_in_period: 3, typology_stock: 85, price: 100000 },
      { period: '2026-02-01', sold_in_period: 4, typology_stock: 81, price: 110000 },
    ]);

    expect(result.get('1T2026')).toMatchObject({ sales: 9, grossSalesVgv: 980000 });
    expect(result.get('1T2026')?.lastEntry.typology_stock).toBe(80);
  });

  it('preserva vendas negativas, trata nulo como ausência e aceita mês ausente', () => {
    const result = aggregateTypologyHistoryByQuarter([
      { period: '2026-04-01', sold_in_period: 10, typology_stock: 90, price: 100000 },
      { period: '2026-06-01', sold_in_period: -1, typology_stock: 91, price: 100000 },
      { period: '2026-07-01', sold_in_period: null, typology_stock: 91, price: 100000 },
    ]);

    expect(result.get('2T2026')?.sales).toBe(9);
    expect(result.get('2T2026')?.hasSalesData).toBe(true);
    expect(result.get('3T2026')).toMatchObject({ sales: 0, hasSalesData: false, grossSalesVgv: null });
  });

  it('não entrega VGV parcial quando há venda sem preço e não cria trimestre para período inválido', () => {
    const result = aggregateTypologyHistoryByQuarter([
      { period: '01/2026', sold_in_period: 2, typology_stock: 8, price: 100000 },
      { period: '02/2026', sold_in_period: 3, typology_stock: 5, price: null },
      { period: 'inválido', sold_in_period: 999, typology_stock: 1, price: 1 },
    ]);

    expect(result.get('1T2026')).toMatchObject({ sales: 5, grossSalesVgv: null });
    expect(result.size).toBe(1);
    expect(periodToQuarter('2026-13-01')).toBeNull();
    expect(periodToQuarter('03/2026')).toBe('1T2026');
  });

  it('não apresenta distrato trimestral parcial', () => {
    const result = aggregateTypologyHistoryByQuarter([
      { period: '2026-01-01', sold_in_period: 5, typology_stock: 95, price: 100000 },
      { period: '2026-02-01', sold_in_period: 5, typology_stock: 90, price: 100000 },
    ]);

    // O primeiro fechamento não tem estoque anterior para calcular o intervalo.
    expect(result.get('1T2026')?.estimatedCancellations).toBeNull();
  });
  it('excludes future periods before calculating the final quarter snapshot', () => {
    const result = aggregateTypologyHistoryByQuarter(filterHistoryThroughQuarter([
      { period: '2026-04-01', sold_in_period: 10, typology_stock: 90, price: 100000 },
      { period: '2026-06-01', sold_in_period: 8, typology_stock: 82, price: 100000 },
      { period: '2026-07-01', sold_in_period: 12, typology_stock: 70, price: 100000 },
    ], '2T2026'));

    expect(result.get('2T2026')).toMatchObject({ sales: 18, lastEntry: { typology_stock: 82 } });
    expect(result.has('3T2026')).toBe(false);
  });
});
