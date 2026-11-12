import { describe, expect, it } from 'vitest';
import { buildSpTypologies } from './typologies';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { syntheticTypologyInput } from './__tests__/typology';

const baseline = () => buildSpTemporalPreview(recordedInput(), '3T2026');
describe('SP — tipologias: distribuição sintética, totais municipais registrados', () => {
  it('preserva vendas negativas por grupo sem distorcer o total', () => {
    const data = syntheticTypologyInput();
    for (const offset of [0, 4]) {
      const before = Number(data.sales[offset].liquid_sales);
      data.sales[offset].liquid_sales = -5;
      data.sales[offset + 1].liquid_sales = Number(data.sales[offset + 1].liquid_sales) + before + 5;
    }
    const result = buildSpTypologies(data, baseline());
    expect(result.status).toBe('ready');
    expect(result.rows[0].sales).toBe(-10);
    expect(result.rows.reduce((sum, row) => sum + row.sales, 0)).toBe(26824);
  });
  it('reconcilia meses, totais e estoque de agosto sem somar estoques mensais', () => {
    const result = buildSpTypologies(syntheticTypologyInput(), baseline());
    expect(result.status).toBe('ready');
    expect(result.rows).toHaveLength(4);
    expect(result.rows.reduce((sum, row) => sum + row.launches, 0)).toBe(24351);
    expect(result.rows.reduce((sum, row) => sum + row.sales, 0)).toBe(26824);
    expect(result.rows.reduce((sum, row) => sum + row.stock, 0)).toBe(124706);
    expect(result.checks).toHaveLength(11);
    expect(result.checks.every(check => check.delta === 0)).toBe(true);
  });
  it('rejeita dimensão errada e baseline sem fonte real conferida', () => {
    expect(buildSpTypologies(recordedInput(), baseline()).status).toBe('blocked');
    expect(buildSpTypologies(syntheticTypologyInput(), { ...baseline(), source: 'fixture' }).status).toBe('blocked');
  });
  it('rejeita mês, grupo, valor ou cobertura ausente sem preencher zero', () => {
    for (const change of ['month', 'group', 'value', 'coverage']) {
      const data = syntheticTypologyInput();
      if (change === 'month') data.releases = data.releases.filter(row => row.period !== '2026-08-01');
      if (change === 'group') data.sales.pop();
      if (change === 'value') data.stock[0].stock = null;
      if (change === 'coverage') data.complete.stock = false;
      expect(buildSpTypologies(data, baseline()).status).toBe('blocked');
    }
  });
  it('rejeita linhas duplicadas e valores fracionários', () => {
    const data = syntheticTypologyInput(); data.sales.push({ ...data.sales[0] });
    expect(buildSpTypologies(data, baseline()).status).toBe('blocked');
    const fractional = syntheticTypologyInput(); fractional.releases[0].releases_in_period = .5;
    expect(buildSpTypologies(fractional, baseline()).status).toBe('blocked');
  });
  it('rejeita totais distintos mesmo que o balanço da nova fonte feche', () => {
    const data = syntheticTypologyInput();
    data.releases[0].releases_in_period = Number(data.releases[0].releases_in_period) + 1;
    for (const row of data.stock.filter(row => row.group === data.stock[0].group && String(row.period) >= '2026-07-01')) row.stock = Number(row.stock) + 1;
    const result = buildSpTypologies(data, baseline());
    expect(result.status).toBe('blocked'); expect(result.rows).toEqual([]);
    expect(result.checks.some(check => check.delta !== 0)).toBe(true);
  });
  it('não compensa divergências de um mês com outro para liberar o acumulado', () => {
    const data = syntheticTypologyInput();
    data.releases[0].releases_in_period = Number(data.releases[0].releases_in_period) + 1;
    data.sales[0].liquid_sales = Number(data.sales[0].liquid_sales) + 1;
    data.releases[4].releases_in_period = Number(data.releases[4].releases_in_period) - 1;
    data.sales[4].liquid_sales = Number(data.sales[4].liquid_sales) - 1;
    expect(buildSpTypologies(data, baseline()).status).toBe('blocked');
  });
  it('não bloqueia a tipologia por mudança isolada na raiz da amostra', () => {
    const data = syntheticTypologyInput(); data.rootPeriod = '2026-09-01';
    expect(buildSpTypologies(data, baseline()).status).toBe('ready');
  });
  it('mantém nomes de grupos não mapeados e não modifica as fontes', () => {
    const data = syntheticTypologyInput();
    for (const source of [data.releases, data.sales, data.stock]) for (const row of source) if (row.group === '4 dormitórios') row.group = '4 ou mais dormitórios';
    const saved = JSON.stringify(data);
    const result = buildSpTypologies(data, baseline());
    expect(result.rows.some(row => row.group === '4 ou mais dormitórios')).toBe(true);
    expect(JSON.stringify(data)).toBe(saved);
  });
  it('ignora linhas posteriores ao fechamento e não inclui setembro', () => {
    const data = syntheticTypologyInput(); data.sales.push({ period: '2026-09-01', group: '1 dormitório', building_type: 'Vertical', liquid_sales: 99999 });
    expect(buildSpTypologies(data, baseline()).rows.reduce((sum, row) => sum + row.sales, 0)).toBe(26824);
  });
});
