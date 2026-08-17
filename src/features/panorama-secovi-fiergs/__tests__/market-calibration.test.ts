import { describe, expect, it } from 'vitest';
import { aggregateTemporal, buildMarketCells } from '../lib/market-calibration';
import { PIRACICABA_1T26_MARKET_REFERENCE } from '../reference/piracicaba-1t26-market';

describe('Panorama Secovi/FIERGS — bancada de Vendas, Estoque e IVV', () => {
  it('consolida grupos do endpoint por trimestre, tipo e total', () => {
    const values = aggregateTemporal([
      { period: '2026-03-01', building_type: 'Vertical', liquid_sales: 200 },
      { period: '2026-03-01', building_type: 'Vertical', liquid_sales: 308 },
      { period: '2026-03-01', building_type: 'Horizontal', liquid_sales: 60 },
    ], 'liquid_sales');
    expect(values.get('1T2026:vertical')).toBe(508);
    expect(values.get('1T2026:horizontal')).toBe(60);
    expect(values.get('1T2026:total')).toBe(568);
  });

  it('normaliza IVV textual da API sem transformá-lo em zero', () => {
    const values = aggregateTemporal([{ period: '2026-03-01', building_type: 'Vertical', ivv: '25,5%' }], 'ivv');
    expect(values.get('1T2026:vertical')).toBeCloseTo(25.5);
  });

  it('marca a referência congelada como bate quando o endpoint a reproduz', () => {
    const values = new Map([['1T2026:vertical', 508], ['1T2026:horizontal', 60], ['1T2026:total', 568]]);
    const cells = buildMarketCells('Vendas', 'endpoint', 'Unidades vendidas', 'sales', PIRACICABA_1T26_MARKET_REFERENCE, values, true, ['1T2026']);
    expect(cells.every((cell) => cell.status === 'match')).toBe(true);
  });

  it('não fabrica referência para VGV de estoque e IVV antes do contrato', () => {
    const cells = buildMarketCells('IVV', 'endpoint', 'IVV', 'ivv', PIRACICABA_1T26_MARKET_REFERENCE, new Map(), true, ['1T2026']);
    expect(cells.every((cell) => cell.status === 'not_comparable')).toBe(true);
  });
});
