import { describe, expect, it } from 'vitest';
import { recordedInput } from './__tests__/recorded';
import { buildSpTemporalPreview } from './temporal';
import { syntheticWindow } from './__tests__/synthetic-window';
import { buildSpSegments } from './segments';
import { buildSpTable } from './tables';
import { buildSpTypologies } from './typologies';
import { buildSpHistoryBatch } from './history-batch';
import { spPeriodLabel } from './model';

describe('Conferência municipal SP — respostas reais registradas, sem chamada ao provedor', () => {
  it.each(['07', '08', '09'] as const)('reconhece automaticamente a janela até %s e mantém a contagem granular pendente', month => {
    const report = buildSpTemporalPreview(syntheticWindow(month), '3T2026');
    expect(report.status).toBe(month === '09' ? 'quarter-closed' : 'partial');
    expect(report.monthly).toHaveLength(Number(month) - 6);
    expect(report.throughMonth).toBe(`2026-${month}`);
    expect(report.metrics.projects).toBeNull();
    expect(spPeriodLabel(report)).toContain(month === '09' ? 'Trimestre fechado' : 'Parcial');
  });
  it('trimestre fechado permite dimensões e comparações sem liberar homologação', () => {
    const input = syntheticWindow('09');
    const report = buildSpTemporalPreview(input, '3T2026');
    expect(buildSpSegments(report).status).toBe('ready');
    expect(buildSpTable(report, 'patterns', 'stock')?.total).toBe(124748);
    expect(buildSpTypologies({ ...input, groupBy: 'Tipologia' }, report).status).toBe('ready');
    const previous = { ...input, windowEnd: '2025-09',
      ...Object.fromEntries((['sales', 'releases', 'stock'] as const).map(metric => [metric, input[metric].map(row => ({ ...row, period: String(row.period).replace('2026', '2025') }))])),
    };
    const batch = buildSpHistoryBatch({ current: { ...input, windowEnd: '2026-09' }, previous }, report);
    expect(batch.status).toBe('ready');
    expect(batch.comparisons.sales?.rows).toHaveLength(3);
    expect(batch.comparisons.sales?.totals?.delta).toBe(0);
    expect(report.issues.join(' ')).toContain('não libera exportação ou homologação');
    input.rootPeriod = '2026-10-01';
    expect(buildSpTemporalPreview(input, '3T2026').throughMonth).toBe('2026-09');
  });
  it('não fecha trimestre por raiz de setembro se falta mês, padrão ou há divergência', () => {
    for (const mutate of [
      (input: ReturnType<typeof syntheticWindow>) => { input.sales = input.sales.filter(row => row.period !== '2026-08-01'); },
      (input: ReturnType<typeof syntheticWindow>) => { input.releases.pop(); },
      (input: ReturnType<typeof syntheticWindow>) => { input.stock.at(-1)!.stock = 0; },
    ]) {
      const input = syntheticWindow('09'); mutate(input);
      const report = buildSpTemporalPreview(input, '3T2026');
      expect(report.status).toBe('incomplete');
      expect(report.metrics.sales).toBeNull();
    }
  });
  it('mantém os sete padrões originais e usa apenas o estoque de agosto', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    expect(report.patterns?.status).toBe('ready');
    expect(report.patterns?.rows).toHaveLength(7);
    expect(report.patterns?.rows.find(row => row.group === 'Econômico')).toEqual({ group: 'Econômico', launches: 20328, sales: 18808, stock: 66570 });
    expect(report.patterns?.rows.some(row => row.group === 'MCMV')).toBe(false);
    for (const field of ['launches', 'sales', 'stock'] as const) expect(report.patterns?.rows.reduce((sum, row) => sum + row[field], 0)).toBe(report.metrics[field]);
  });
  it('não entrega padrões quando a cobertura ou balanço são inválidos', () => {
    const input = recordedInput(); input.complete.sales = false;
    expect(buildSpTemporalPreview(input, '3T2026').patterns).toBeUndefined();
    input.complete.sales = true; input.rootPeriod = '2026-09-01';
    expect(buildSpTemporalPreview(input, '3T2026').patterns).toBeUndefined();
  });
  it('reproduz julho/agosto e exclui setembro pelo fechamento da raiz', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    expect(report.status).toBe('partial'); expect(report.source).toBe('recorded-api'); expect(report.throughMonth).toBe('2026-08');
    expect(report.metrics).toEqual({ projects: null, launches: 24351, sales: 26824, stock: 124706 });
    expect(report.monthly).toEqual([
      { month: '2026-07', launches: 13413, sales: 11773, openingStock: 127179, closingStock: 128819, delta: 0 },
      { month: '2026-08', launches: 10938, sales: 15051, openingStock: 128819, closingStock: 124706, delta: 0 },
    ]);
    expect(report.issues.join(' ')).toContain('1 de 5183');
  });
  it('mesmo com raiz posterior, não aceita setembro inconsistente', () => {
    const input = recordedInput(); input.rootPeriod = '2026-09-01';
    const report = buildSpTemporalPreview(input, '3T2026');
    expect(report.status).toBe('incomplete'); expect(report.metrics.stock).toBeNull();
    expect(report.checks.at(-1)?.delta).toBe(-67222);
  });
  it('não deixa linhas posteriores ao fechamento contaminarem meses conferidos', () => {
    const input = recordedInput();
    input.sales.push({ ...input.sales.at(-1)!, liquid_sales: null });
    expect(buildSpTemporalPreview(input, '3T2026').metrics.sales).toBe(26824);
  });
  it('não libera a contagem de empreendimentos com uma amostra', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    expect(report.status).not.toBe('ready'); expect(report.metrics.projects).toBeNull();
  });
  it('preserva venda negativa quando o balanço continua coerente', () => {
    const input = recordedInput();
    input.sales.find(row => row.period === '2026-08-01' && row.group === 'Compacto')!.liquid_sales = -10;
    input.stock.find(row => row.period === '2026-08-01' && row.group === 'Compacto')!.stock = 23069;
    const report = buildSpTemporalPreview(input, '3T2026');
    expect(report.status).toBe('partial'); expect(report.metrics.sales).toBe(24681);
  });
  it('detecta padrão ausente mesmo com mês/paginação presentes', () => {
    const input = recordedInput(); input.releases = input.releases.filter(row => !(row.period === '2026-08-01' && row.group === 'Alto'));
    expect(buildSpTemporalPreview(input, '3T2026').status).toBe('incomplete');
  });
  it('bloqueia fontes incompletas, linhas duplicadas e campos nulos', () => {
    const input = recordedInput(); input.complete.sales = false;
    expect(buildSpTemporalPreview(input, '3T2026').metrics.sales).toBeNull();
    input.complete.sales = true; input.sales.push({ ...input.sales[0] });
    expect(buildSpTemporalPreview(input, '3T2026').status).toBe('incomplete');
    input.sales.pop(); input.sales[0].liquid_sales = null;
    expect(buildSpTemporalPreview(input, '3T2026').status).toBe('incomplete');
  });
  it('não infere a raiz pelo maior mês do histórico ou pelo calendário', () => {
    const input = recordedInput(); input.rootPeriod = null;
    expect(buildSpTemporalPreview(input, '3T2026').status).toBe('incomplete');
    input.rootPeriod = '2026-06-01';
    expect(buildSpTemporalPreview(input, '3T2026').status).toBe('awaiting-closure');
  });
});
