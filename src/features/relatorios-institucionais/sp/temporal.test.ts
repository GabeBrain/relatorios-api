import { describe, expect, it } from 'vitest';
import { recordedInput } from './__tests__/recorded';
import { buildSpTemporalPreview } from './temporal';

describe('Conferência municipal SP — respostas reais registradas, sem chamada ao provedor', () => {
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
