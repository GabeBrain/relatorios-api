import { describe,expect,it } from 'vitest';
import { FORTALEZA_CITIES } from './model';
import { buildMonthlySlide,monthlyMarketSourceIssue,monthlyProduct } from './monthly-market';
import { monthlyMarketFixture,monthlyMarketSelection as selection } from './__tests__/monthly-market-fixture';
const cities = [...FORTALEZA_CITIES];
const indices = Object.fromEntries(monthlyMarketFixture().months.map((month,index) => [month,100 + index]));
describe('Fortaleza mensal — 12/14 e lote 16–25', () => {
  it('12 inclui capital/RM vertical/comercial/casas e exclui lotes/chácaras', () => {
    const result = buildMonthlySlide(12,monthlyMarketFixture(),selection,cities);
    expect(result.status).toBe('ready');
    expect(result.history.at(-1)).toMatchObject({ first:22,second:88,total:110 });
    expect(result.accumulated[1].total).toBe(770); expect(result.changes.total).toBe(0);
  });
  it('14 separa vertical/casas das quatro cidades da RM, sem capital/comercial/lotes', () => {
    const result = buildMonthlySlide(14,monthlyMarketFixture(),selection,cities);
    expect(result.status).toBe('ready'); expect(result.history.at(-1)).toMatchObject({ first:64,second:16,total:80 });
    expect(result.sourceKeys).toHaveLength(8);
  });
  it('19 usa apenas os dois produtos loteamentos, sem somar casas/chácaras', () => {
    const result = buildMonthlySlide(19,monthlyMarketFixture(),selection,cities);
    expect(result.history.at(-1)).toMatchObject({ first:6,second:24,total:30 });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it('22/23/25 preservam vendas líquidas negativas e recortes de padrão/cidade', () => {
    const data = monthlyMarketFixture();
    expect(buildMonthlySlide(22,data,selection,cities).history.at(-1)).toMatchObject({ first:15,second:60,total:75 });
    expect(buildMonthlySlide(23,data,selection,cities).history.at(-1)).toMatchObject({ first:8,second:4,total:12 });
    expect(buildMonthlySlide(25,data,selection,cities).history.at(-1)).toMatchObject({ first:32,second:16,total:48 });
    data.sources.find(source => source.city === 'Fortaleza' && source.segment === 'Vertical' && source.metric === 'sales')!.rows.filter(row => String(row.period).startsWith('2026-07')).forEach(row => { row.liquid_sales = -2; });
    expect(buildMonthlySlide(23,data,selection,cities).history.at(-1)).toMatchObject({ first:-2,second:-12,total:-14 });
  });
  it('24 tem13 pontos completos móveis de12 meses, sem somar estoques ou acumulados', () => {
    const result = buildMonthlySlide(24,monthlyMarketFixture(),selection,cities);
    expect(result.rolling).toHaveLength(13); expect(result.rolling[0].month).toBe('2025-07');
    expect(result.rolling.at(-1)).toMatchObject({ month:'2026-07',launches:192,sales:144 });
    expect(result.sourceKeys).toHaveLength(2);
  });
  it.each([16,17,20])('corrige cada fluxo monetário antes de agregar no slide %s', page => {
    const data = monthlyMarketFixture(), result = buildMonthlySlide(page,data,selection,cities,indices);
    expect(result.status).toBe('ready'); expect(result.unit).toBe('milhões'); expect(result.baseMonth).toBe('2026-07');
    const count = page === 16 ? 15 : page === 17 ? 7 : 2;
    expect(result.history.at(-1).first + result.history.at(-1).second).toBeCloseTo(count * (page === 17 ? 1 : 5));
    const previous = result.history.at(-13)!;
    expect(previous.total).toBeCloseTo(count * (page === 17 ? 1 : 5) * indices['2026-07'] / indices['2025-07']);
  });
  it('índice ou VGL faltante bloqueia só dinheiro, sem inventar valor a partir de unidades', () => {
    const data = monthlyMarketFixture(), missing = { ...indices }; delete missing['2026-07'];
    expect(buildMonthlySlide(17,data,selection,cities,missing).status).toBe('blocked');
    delete data.sources.find(source => source.city === 'Fortaleza' && source.segment === 'Vertical' && source.metric === 'releases')!.rows[0].vgv_release;
    expect(buildMonthlySlide(17,data,selection,cities,indices).status).toBe('blocked');
    expect(buildMonthlySlide(12,data,selection,cities).status).toBe('ready');
  });
  it.each(['city','month','duplicate','unknown','invalid','segment'])('cobertura inválida %s impede consolidado, sem descartar silenciosamente', mode => {
    const data = monthlyMarketFixture(), source = data.sources.find(source => source.city === 'Aquiraz' && source.segment === 'Horizontal' && source.metric === 'releases')!;
    if (mode === 'city') data.sources.splice(data.sources.indexOf(source),1);
    if (mode === 'month') source.rows.pop();
    if (mode === 'duplicate') source.rows.push({ ...source.rows[0] });
    if (mode === 'unknown') source.rows[0].group = 'Produto desconhecido';
    if (mode === 'invalid') source.rows[0].releases_in_period = null;
    if (mode === 'segment') source.rows[0].building_type = 'Vertical';
    expect(buildMonthlySlide(12,data,selection,cities).status).toBe('blocked');
    expect(buildMonthlySlide(23,data,selection,cities).status).toBe('ready');
  });
  it('não interpreta ausência de produto horizontal como zero e recusa rótulo novo', () => {
    const data = monthlyMarketFixture();
    data.sources.filter(source => source.segment === 'Horizontal').forEach(source => { source.rows = source.rows.filter(row => row.group === 'Loteamento Aberto'); });
    expect(buildMonthlySlide(14,data,selection,cities).status).toBe('blocked');
    expect(buildMonthlySlide(19,data,selection,cities).status).toBe('ready');
    expect(monthlyProduct('Horizontal','Horizontal')).toBe('unknown');
    expect(monthlyProduct('Horizontal','Standard')).toBe('houses');
    const source = data.sources[0]; source.rows[0].liquid_sales = -9; source.metric = 'sales';
    expect(monthlyMarketSourceIssue(source,data.months)).toBeNull();
  });
  it('zero explícito, base zero, mês/ano novos e limite de precisão', () => {
    const data = monthlyMarketFixture(); data.sources.forEach(source => source.rows.forEach(row => { row.releases_in_period = 0; row.liquid_sales = 0; }));
    const result = buildMonthlySlide(12,data,selection,cities);
    expect(result.status).toBe('ready'); expect(result.history.at(-1).total).toBe(0); expect(result.changes.total).toBeNull();
    expect(buildMonthlySlide(12,data,{ ...selection,year:2027,position:1 },cities).status).toBe('blocked');
    data.sources[0].rows[0].releases_in_period = Number.MAX_SAFE_INTEGER;
    expect(buildMonthlySlide(12,data,selection,cities).status).toBe('blocked');
  });
});
