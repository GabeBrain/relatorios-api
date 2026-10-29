import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSpTemporalPreview } from './temporal';
import { buildSpStockSeries, spQuarterlyIvv, spSellout } from './stock-series';
import { buildSpLaunchSeries, buildSpSalesSeries } from './launch-series';
import { buildSpVgvSeries } from './vgl-series';
import { buildSpSalesNeighborhoods } from './sales-neighborhoods';
import { syntheticVglInput, syntheticLaunchSeries, syntheticSalesSeries, syntheticStockSeries } from './__tests__/launch-series';
import { syntheticSalesBuildings } from './__tests__/sales-buildings';
import { SpTrendSlide } from './SpTrendSlide';
import { fetchSpBuildingRecords } from './projects';

const input = () => syntheticVglInput();
const baseline = () => buildSpTemporalPreview(input(), '3T2026');
describe('SP — terceiro lote original39–44/46–48/50', () => {
  it('oferta usa a fotografia do fechamento, sem somar estoques dos meses', () => {
    const report = baseline(), result = buildSpStockSeries(syntheticStockSeries(), report);
    expect(result.status).toBe('ready'); expect(result.quarterly!.at(-1)).toMatchObject({ value: report.metrics.stock, partial: true });
    expect(result.comparison!.currentTotal).toBe(report.metrics.stock);
    expect(result.comparison!.previousTotal).toBe(8050);
    expect(result.quarterly!.at(-1)!.value).not.toBe(report.monthly!.reduce((sum,row) => sum + row.closingStock,0));
    const changed = syntheticStockSeries(); changed.find(row => row.period === '2026-07-01')!.stock = 1;
    expect(buildSpStockSeries(changed, report).status).toBe('blocked');
  });
  it('cobertura de estoque não aceita lacuna, duplicata, nulo ou negativo como zero', () => {
    const report = baseline(), rows = syntheticStockSeries();
    expect(buildSpStockSeries(rows.slice(1), report).status).toBe('blocked');
    expect(buildSpStockSeries([...rows, rows[0]], report).status).toBe('blocked');
    for (const value of [null, '', false, -1, .5]) expect(buildSpStockSeries([{ ...rows[0], stock: value }, ...rows.slice(1)], report).status).toBe('blocked');
  });
  it('escoamento usa vendas médias da parcial; base não positiva fica indisponível', () => {
    const report = baseline(); const rows = spSellout(report);
    expect(rows.at(-1)!.months).toBeCloseTo(report.metrics.stock! / (report.metrics.sales! / 2));
    report.patterns!.rows[0].sales = -1;
    expect(spSellout(report).find(row => row.group === report.patterns!.rows[0].group)!.months).toBeNull();
  });
  it('IVV reproduz o exemplo do original e não tira média dos índices mensais', () => {
    expect(42275 / (120458 + 40179) * 100).toBeCloseTo(26.3, 1);
    const report = baseline();
    report.stockSeries = buildSpStockSeries(syntheticStockSeries(), report);
    report.launchSeries = buildSpLaunchSeries(syntheticLaunchSeries(), report);
    report.salesSeries = buildSpSalesSeries(syntheticSalesSeries(), report);
    const ivv = spQuarterlyIvv(report);
    expect(ivv.status).toBe('ready');
    expect(ivv.rows.at(-1)!.value).toBeCloseTo(report.metrics.sales! / (report.monthly![0].openingStock + report.metrics.launches!) * 100);
    expect(ivv.rows.at(-1)!.partial).toBe(true);
    expect(spQuarterlyIvv({ ...report, stockSeries: undefined }).status).toBe('blocked');
  });
  it('VGV vendido preserva negativos na correção e apresenta o anual em milhões sem área percentual', () => {
    const data = input(); data.sales[0].liquid_sales = -100000; data.sales[0].vgv_liquid_sales = -1e12;
    const report = buildSpTemporalPreview(data, '3T2026'), result = buildSpVgvSeries(syntheticSalesSeries(data), report);
    expect(result.status).toBe('ready'); expect(result.breakdown!.annual!.at(-1)!.segments.some(row => row.value < 0)).toBe(true);
    for (const number of [40,41,42,43,44]) {
      const html = renderToStaticMarkup(<SpTrendSlide report={{ ...report, vgvSeries: result }} number={number} />);
      expect(html).toContain('VGV VENDIDO'); expect(html).toContain('Base única: 2026-08'); expect(html).not.toContain('Dados em conferência');
    }
    const annual = renderToStaticMarkup(<SpTrendSlide report={{ ...report, vgvSeries: result }} number={44} />);
    expect(annual).toContain('negativas preservadas'); expect(annual).not.toContain('1.000.000.000.000');
    const changed = syntheticSalesSeries(data); changed.find(row => row.period === '2026-08-01')!.vgv_liquid_sales = 1;
    expect(buildSpVgvSeries(changed, report).status).toBe('blocked');
  });
  it('ranking de vendas conta cada identidade uma vez e reconcilia mês, padrão e total', () => {
    const report = baseline(), buildings = syntheticSalesBuildings();
    buildings[0].typologies_history.push({ ...buildings[0].typologies_history[0] });
    const result = buildSpSalesNeighborhoods([...buildings, buildings[0]], report);
    expect(result).toMatchObject({ status: 'ready', cityTotal: report.metrics.sales, topShare: 100 });
    const changed = syntheticSalesBuildings(); changed[0].typologies_history[0].sold_in_period = 1;
    expect(buildSpSalesNeighborhoods(changed, report).status).toBe('blocked');
    const conflict = syntheticSalesBuildings(); conflict[0].typologies_history.push({ ...conflict[0].typologies_history[0], sold_in_period: 2 });
    expect(buildSpSalesNeighborhoods(conflict, report).status).toBe('blocked');
  });
  it('ranking exige meses preenchidos, bairro e identidade; não usa acumulado ou diferença de estoque', () => {
    const report = baseline();
    for (const change of ['month', 'neighborhood', 'id', 'sold'] as const) {
      const buildings = syntheticSalesBuildings();
      if (change === 'month') buildings[0].typologies_history.pop();
      if (change === 'neighborhood') buildings[0].neighborhood = '';
      if (change === 'id') (buildings[0].typologies_history[0] as Record<string,unknown>).typology_id = null;
      if (change === 'sold') (buildings[0].typologies_history[0] as Record<string,unknown>).sold_in_period = null;
      expect(buildSpSalesNeighborhoods(buildings, report).status).toBe('blocked');
    }
  });
  it('Top 10 de vendas mantém a cidade inteira no denominador quando há mais de dez bairros', () => {
    const report = baseline(), originals = syntheticSalesBuildings();
    const buildings = originals.flatMap((building, i) => [
      { ...building, typologies_history: building.typologies_history.map(row => ({ ...row, sold_in_period: Math.floor(Number(row.sold_in_period) / 2) })) },
      { ...building, building_id: i + 8, neighborhood: `Bairro ${i+8}`, typologies_history: building.typologies_history.map(row => ({ ...row, sold_in_period: Number(row.sold_in_period) - Math.floor(Number(row.sold_in_period) / 2) })) },
    ]);
    const result = buildSpSalesNeighborhoods(buildings, report);
    expect(result.status).toBe('ready'); expect(result.rows).toHaveLength(10);
    expect(result.cityTotal).toBe(report.metrics.sales); expect(result.topShare!).toBeLessThan(100);
    expect(result.topShare).toBeCloseTo(result.topTotal! / report.metrics.sales! * 100);
    for (const row of result.rows) expect(row.share).toBeCloseTo(row.units / report.metrics.sales! * 100);
  });
  it('ranking preserva distratos negativos e suprime percentuais incompatíveis', () => {
    const data = input(); data.sales[0].liquid_sales = -10000;
    const report = buildSpTemporalPreview(data, '3T2026'), result = buildSpSalesNeighborhoods(syntheticSalesBuildings(data), report);
    expect(result.status).toBe('ready'); expect(result.rows.some(row => row.units < 0)).toBe(true);
    expect(result.topShare).toBeNull(); expect(result.rows.every(row => row.share === null)).toBe(true);
  });
  it('coleta granular sob demanda pagina a fonte documentada e mantém filtros e escopo', async () => {
    const buildings = syntheticSalesBuildings();
    const request = vi.fn(async (options: import('@/lib/http-client').RequestOptions) => ({ ok: true, status: 200, text: null, contentType: 'application/json', latencyMs: 1, bytes: 1, error: null, requestHeaders: {}, requestQuery: options.query ?? {}, requestBody: null, url: options.url, method: 'GET', data: { data: buildings.slice((Number(options.query?.page)-1)*4,Number(options.query?.page)*4), meta: { total: 7, current_page: Number(options.query?.page), last_page: 2 } } }));
    expect(await fetchSpBuildingRecords(baseline(), { request })).toHaveLength(7);
    expect(request).toHaveBeenCalledTimes(2);
    for (const [options] of request.mock.calls) expect(options).toMatchObject({ url: 'https://geobrain.com.br/public-api/building-with-history', query: { city: 'São Paulo', uf: 'SP', type: 'Vertical', per_page: 100 }, cache: 'no-store' });
  });
});
