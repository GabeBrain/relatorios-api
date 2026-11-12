import { monthlyLaunchFixture } from './__tests__/monthly-launch-fixture';
import { describe, expect, it } from 'vitest';
import { monthlySelection } from './__tests__/market-fixture';
import { monthlyLaunchMonths, monthlyProjectLaunches, monthlyUnitLaunches } from './monthly-launches';
import { buildIntroProject, type IntroData } from './intro-data';
const selection = { ...monthlySelection, position: 7 };
describe('Fortaleza mensal — lançamentos por padrão', () => {
  it('compara o mês e os acumulados equivalentes sem somar estoques ou contar unidades como empreendimentos', () => {
    const series = monthlyUnitLaunches(monthlyLaunchFixture(), selection, ['Fortaleza'], 'capital');
    expect(series.status).toBe('ready'); expect(series.history).toHaveLength(25);
    expect(series.history[0].month).toBe('2024-07'); expect(series.history.at(-1).month).toBe('2026-07');
    expect(series.accumulated.map(bin => bin.total)).toEqual([105, 245]);
    expect(series.changes.total).toBeCloseTo(133.33333333); expect(series.changes.economic).toBe(200); expect(series.changes.other).toBe(0);
  });
  it('exige as quatro cidades da RM e soma cada uma uma vez', () => {
    const cities = ['Aquiraz', 'Caucaia', 'Eusébio', 'Maracanaú'];
    const data = monthlyLaunchFixture(cities);
    expect(monthlyUnitLaunches(data, selection, cities, 'rm').history.at(-1).total).toBe(140);
    data.sources.pop(); expect(monthlyUnitLaunches(data, selection, cities, 'rm').status).toBe('blocked');
    expect(monthlyUnitLaunches(monthlyLaunchFixture(), selection, ['Fortaleza'], 'rm').status).toBe('blocked');
  });
  it.each(['missing', 'duplicate', 'negative', 'unknown', 'foreign', 'invalid', 'type', 'coverage'])('não publica parcial com %s', mode => {
    const data = monthlyLaunchFixture(), rows = data.sources[0].rows;
    if (mode === 'missing') data.sources[0].rows=rows.filter(row=>String(row.period).slice(0,7)!=='2026-07');
    if (mode === 'duplicate') rows.push({ ...rows[0] });
    if (mode === 'negative') rows[0].releases_in_period = -1;
    if (mode === 'unknown') rows[0].group = 'Outro';
    if (mode === 'foreign') rows[0].city = 'Recife';
    if (mode === 'invalid') rows[0].period = '2026-02-31';
    if (mode === 'type') rows[0].building_type = 'Horizontal';
    if (mode === 'coverage') data.sources[0].complete = false;
    const series = monthlyUnitLaunches(data, selection, ['Fortaleza'], 'capital');
    expect(series.status).toBe('blocked'); expect(series.history).toEqual([]);
  });
  it('preserva zero explícito, base zero sem percentual e ano novo', () => {
    const data = monthlyLaunchFixture(); data.sources[0].rows.forEach(row => { row.releases_in_period = 0; });
    const series = monthlyUnitLaunches(data, selection, ['Fortaleza'], 'capital');
    expect(series.status).toBe('ready'); expect(series.history.at(-1).total).toBe(0); expect(series.changes.total).toBeNull();
    expect(monthlyLaunchMonths({ ...selection, position: 1, year: 2027 }).at(-1)).toBe('2027-01');
    expect(monthlyLaunchMonths({ ...selection, position: 1, year: 2027 })[0]).toBe('2025-01');
  });
  it('conta apenas IDs verticais da capital; horizontal desconhecido não impede o slide vertical', () => {
    const project = buildIntroProject({ building_id: 1, name: 'Sintético', city: 'Fortaleza', building_type: 'Vertical', release_date: '2026-07-01', standard: 'Econômico', total_units: 999 });
    const data: IntroData = { status: 'ready', projects: [project, { ...project, id: '2', type: 'Horizontal', standard: 'Desconhecido', chartEligible: null }], issues: [], requests: 0, startedAt: '', finishedAt: '' };
    expect(monthlyProjectLaunches(data, selection, ['Fortaleza']).history.at(-1).total).toBe(1);
    data.projects.push({ ...project }); expect(monthlyProjectLaunches(data, selection, ['Fortaleza']).status).toBe('blocked');
    expect(monthlyProjectLaunches(data, selection, ['Caucaia']).status).toBe('blocked');
  });
});
