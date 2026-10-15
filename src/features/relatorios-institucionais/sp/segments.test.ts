import { describe, expect, it } from 'vitest';
import { buildSpSegments } from './segments';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';

const baseline = () => buildSpTemporalPreview(recordedInput(), '3T2026');
describe('SP — classificação confirmada por Lucas, sem coleta nova', () => {
  it('aplica os quatro grupos exatos e mantém os três totais', () => {
    const result = buildSpSegments(baseline());
    expect(result.status).toBe('ready');
    expect(result.rows).toEqual([
      { group: 'Compactos', launches: 1735, sales: 3561, stock: 20926 },
      { group: 'MCMV', launches: 20328, sales: 18808, stock: 66570 },
      { group: 'Médio Padrão', launches: 1958, sales: 4028, stock: 32640 },
      { group: 'Luxo', launches: 330, sales: 427, stock: 4570 },
    ]);
    expect(result.checks.map(check => check.delta)).toEqual([0, 0, 0]);
  });
  it('não modifica os padrões originais', () => {
    const report = baseline(), snapshot = JSON.stringify(report);
    buildSpSegments(report);
    expect(JSON.stringify(report)).toBe(snapshot);
    expect(report.patterns!.rows).toHaveLength(7);
  });
  it('bloqueia padrão desconhecido ou duplicado', () => {
    const unknown = baseline(); unknown.patterns!.rows[0].group = 'Novo padrão';
    expect(buildSpSegments(unknown).status).toBe('blocked');
    const duplicate = baseline(); duplicate.patterns!.rows.push({ ...duplicate.patterns!.rows[0] });
    expect(buildSpSegments(duplicate).status).toBe('blocked');
  });
  it('não preenche padrão ausente com zero nem classifica só os grupos restantes', () => {
    const report = baseline(); report.patterns!.rows.pop();
    expect(buildSpSegments(report).rows).toEqual([]);
  });
  it('bloqueia se o total agrupado diverge do município', () => {
    const report = baseline(); report.patterns!.rows[0].launches += 1;
    const result = buildSpSegments(report);
    expect(result.status).toBe('blocked'); expect(result.rows).toEqual([]);
    expect(result.checks[0].delta).toBe(1);
  });
  it('preserva vendas negativas e confere o total correspondente', () => {
    const report = baseline(); report.patterns!.rows[0].sales = -10;
    report.metrics.sales = report.patterns!.rows.reduce((sum, row) => sum + row.sales, 0);
    const result = buildSpSegments(report);
    expect(result.status).toBe('ready');
    expect(result.rows.find(row => row.group === 'Luxo')!.sales).toBe(190);
  });
  it('rejeita números inválidos, estoque negativo e totais ausentes', () => {
    const report = baseline(); report.patterns!.rows[0].stock = -1;
    expect(buildSpSegments(report).status).toBe('blocked');
    report.patterns!.rows[0].stock = NaN;
    expect(buildSpSegments(report).status).toBe('blocked');
    const missing = baseline(); missing.metrics.stock = null;
    expect(buildSpSegments(missing).status).toBe('blocked');
  });
  it('não aplica a regra à fixture ou a uma fonte municipal bloqueada', () => {
    expect(buildSpSegments({ ...baseline(), source: 'fixture' }).status).toBe('blocked');
    expect(buildSpSegments({ ...baseline(), status: 'incomplete' }).status).toBe('blocked');
  });
});
