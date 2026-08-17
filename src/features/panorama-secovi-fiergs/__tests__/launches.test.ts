import { describe, expect, it } from 'vitest';
import { compareLaunchModel } from '../lib/compare-reference';
import { buildLaunchModel, periodToQuarter, variation } from '../lib/launches';
import { PIRACICABA_1T26_RECORDS, PIRACICABA_1T26_REFERENCE } from '../reference/piracicaba-1t26';

describe('Panorama Secovi/FIERGS — contratos de lançamentos', () => {
  it('normaliza períodos e não inventa trimestre inválido', () => {
    expect(periodToQuarter('2026-03-01')).toBe('1T2026');
    expect(periodToQuarter('03/2026')).toBe('1T2026');
    expect(periodToQuarter('2026-13-01')).toBeNull();
  });

  it('reproduz o gabarito Piracicaba 1T26 e reconcilia tipos', () => {
    const model = buildLaunchModel(PIRACICABA_1T26_RECORDS);
    const q1 = model.units.find((item) => item.quarter === '1T2026');
    const projects = model.projects.find((item) => item.quarter === '1T2026');
    const vgv = model.vgv.find((item) => item.quarter === '1T2026');
    expect(q1).toMatchObject({ vertical: 280, horizontal: 0, total: 280 });
    expect(projects).toMatchObject({ vertical: 2, horizontal: 0, total: 2 });
    expect(vgv?.total).toBeCloseTo(227.687, 3);
    expect(model.projectStandards.find((item) => item.quarter === '1T2026')).toMatchObject({ economic: 0, other: 2 });
  });

  it('gera comparação integral quando fixture e referência são a mesma base', () => {
    const actual = buildLaunchModel(PIRACICABA_1T26_RECORDS);
    const cells = compareLaunchModel(PIRACICABA_1T26_REFERENCE, actual);
    expect(cells.filter((cell) => cell.result === 'different')).toHaveLength(0);
    expect(cells.filter((cell) => cell.result === 'match').length).toBeGreaterThan(0);
    expect(cells.filter((cell) => cell.result === 'not_comparable').length).toBeGreaterThan(0);
  });

  it('trata variação com base zero como não comparável', () => {
    expect(variation(12, 0)).toBeNull();
    expect(variation(12, 10)).toBeCloseTo(20);
  });
});
