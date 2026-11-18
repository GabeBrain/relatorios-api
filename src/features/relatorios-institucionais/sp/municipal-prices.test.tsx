import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSpMunicipalPrices, spPricePeriods, spDisplayPrices, spDisplayMarket, type SpPriceSource } from './municipal-prices';
import { fetchSpMunicipalPrices, type SpReadOptions } from './api';
import { recordedInput } from './__tests__/recorded';
import { buildSpTemporalPreview } from './temporal';
import { buildSpGranularDetails } from './granular-details';
import { syntheticGranularBuildings } from './__tests__/granular-buildings';
import { SpDetailSlide } from './SpDetailSlide';
import { reviewSpSlides, spReviewSnapshot } from './review';
import type { RequestOptions } from '@/lib/http-client';

const report = () => buildSpTemporalPreview(recordedInput(), '3T2026');
function sources(target = report()): SpPriceSource[] {
  const months = spPricePeriods(target).map(period => period.month);
  return (['medium-prices', 'medium-prices-meter'] as const).flatMap(metric => (['overall', 'Padrão', 'Tipologia'] as const).map(grouping => ({ metric, grouping,
    rows: months.flatMap((month, i) => (grouping === 'overall' ? ['Geral'] : grouping === 'Tipologia' ? ['1 Quarto', '2 Quartos', '3 Quartos', '4+ Quartos'] : ['Compacto','Econômico','Standard','Médio','Médio-Alto','Alto','Luxo']).map(group => ({ period: `${month}-01`, building_type: 'Vertical', group, [metric === 'medium-prices' ? 'average_price' : 'average_price_per_meter']: (metric === 'medium-prices' ? 800000 : 18000) + i * 100 }))) })));
}
describe('SP preços informados pela fonte municipal', () => {
  it.each([['1T2025','2025-03'],['2T2026','2026-06'],['3T2027','2027-08'],['4T2028','2028-12']] as const)('mantém o contrato de quatro dormitórios e comparação anual em %s', (quarter,month)=>{
    const r=report();r.quarter=quarter;r.throughMonth=month;
    const data=sources(r);
    for(const source of data.filter(row=>row.grouping==='Tipologia'))for(const row of source.rows)if(row.group==='4+ Quartos')row.group='4';
    const value=buildSpMunicipalPrices(data,r);
    expect(value.bedroomFourGroup).toBe('4');
    expect(value.series[59]).toHaveLength(13);
    expect(value.series[59].at(-1)!.month).toBe(month);
    expect(value.series[59].at(-1)!.value).toBe(19300);
    if(month.endsWith('-08'))expect(value.annualChanges[59]).toBeNull();
    else expect(value.annualChanges[59]).not.toBeNull();
  });
  it('usa a observação geral, sem média de padrões ou filtro de estoque granular', () => {
    const r = report(); r.granularDetails = buildSpGranularDetails(syntheticGranularBuildings(), r);
    const baseline = JSON.stringify(r.granularDetails.prices);
    r.municipalPrices = buildSpMunicipalPrices(sources(), r);
    expect(spDisplayPrices(r)!.overall.meter).toBe(19300);
    expect(spDisplayPrices(r)!.overall.meter).not.toBe(r.granularDetails.prices.overall.meter);
    expect(JSON.stringify(r.granularDetails.prices)).toBe(baseline);
  });
  it('restaura uma observação nativa apesar de falta de fotografia granular', () => {
    const r = report(); r.municipalPrices = buildSpMunicipalPrices(sources(), r);
    expect(r.granularDetails).toBeUndefined();
    expect(reviewSpSlides(r).find(slide => slide.number === 54)!.state).toBe('available');
    const svg = renderToStaticMarkup(<SpDetailSlide report={r} slide={54}/>);
    expect(svg).toContain('19.300'); expect(svg).not.toContain('Áreas e preços em conferência');
    expect(svg).toContain('Preços nominais informados pela Geobrain');
  });
  it('não inventa média geral quando a consulta sem agrupamento retorna padrões', () => {
    const data = sources();
    for (const source of data.filter(row => row.grouping === 'overall')) source.rows.forEach(row => { row.group = 'Econômico'; });
    const r = report(); r.municipalPrices = buildSpMunicipalPrices(data, r);
    expect(spDisplayPrices(r)!.overall.meter).toBeNull();
    expect(reviewSpSlides(r).find(slide => slide.number === 53)!.state).toBe('blocked');
    expect(reviewSpSlides(r).find(slide => slide.number === 54)!.state).toBe('available');
  });
  it.each([0, -1, '', null, 'inválido', Infinity, Number.MAX_SAFE_INTEGER])('rejeita preço inválido %s sem substituir por zero', raw => {
    const data = sources(), row = data.find(source => source.metric === 'medium-prices-meter' && source.grouping === 'Tipologia')!.rows.at(-4)!;
    row.average_price_per_meter = raw;
    const point = buildSpMunicipalPrices(data, report()).series[54].at(-1)!;
    expect(point.value).toBeNull(); expect(point.variation).toBeNull();
  });
  it('não compara através de lacuna, duplicata ou dado de outro tipo', () => {
    const data = sources(), source = data.find(source => source.metric === 'medium-prices-meter' && source.grouping === 'overall')!;
    source.rows.splice(2, 1); source.rows.push({ ...source.rows[4] });
    source.rows.push({ ...source.rows[0], building_type: 'Horizontal', average_price_per_meter: 1 });
    const points = buildSpMunicipalPrices(data, report()).series[53];
    expect(points[1].value).toBeNull(); expect(points[2].variation).toBeNull();
    expect(points[4].value).toBeNull(); expect(points[0].value).toBe(18100);
  });
  it('usa mesma competência na comparação anual de trimestre parcial e mantém 4+', () => {
    const r = report(), data = sources(), original = data.find(source => source.metric === 'medium-prices-meter' && source.grouping === 'overall')!;
    original.rows.push({ period: '2025-08-01', building_type: 'Vertical', group: 'Geral', average_price_per_meter: 10000 });
    const value = buildSpMunicipalPrices(data, r);
    expect(value.annualChanges[53]).toBeCloseTo(93);
    expect(value.series[59].at(-1)!.value).toBe(19300);
    const svg = renderToStaticMarkup(<SpDetailSlide report={{ ...r, municipalPrices: value }} slide={59}/>);
    expect(svg).toContain('4 OU MAIS DORMITÓRIOS');
  });
  it('audita fonte aplicada e cálculo granular separadamente, sem históricos brutos', () => {
    const r = report(); r.municipalPrices = buildSpMunicipalPrices(sources(), r); r.granularDetails = buildSpGranularDetails(syntheticGranularBuildings(), r);
    const audit = spReviewSnapshot(r, reviewSpSlides(r)).numericAudit;
    expect(audit.details.priceSource!.method).toBe('geobrain-reported-prices-v1');
    expect(audit.details.prices!.overall.meter).toBe(19300);
    expect(audit.details.granularPriceBaseline).toEqual(r.granularDetails.prices);
    expect(JSON.stringify(audit)).not.toContain('typologies_history');
  });
  it('não presume que exatamente quatro dormitórios significa quatro ou mais', () => {
    const data = sources();
    for (const source of data.filter(item => item.grouping === 'Tipologia')) for (const row of source.rows) if (row.group === '4+ Quartos') row.group = '4 Quartos';
    const municipalPrices=buildSpMunicipalPrices(data, report());
    expect(municipalPrices.bedroomFourGroup).toBe('4');
    expect(municipalPrices.series[59].at(-1)!.value).toBe(19300);
    const svg=renderToStaticMarkup(<SpDetailSlide report={{...report(),municipalPrices}} slide={59}/>);
    expect(svg).toContain('4 DORMITÓRIOS');expect(svg).not.toContain('4 OU MAIS');
  });
  it('não interpreta Alto legado como Alto atual quando a fonte usa Super Luxo', () => {
    const data = sources();
    for (const source of data.filter(item => item.grouping === 'Padrão')) for (const row of source.rows) if (row.group === 'Médio-Alto') row.group = 'Super Luxo';
    const prices = buildSpMunicipalPrices(data, report());
    expect(prices.closing.find(row => row.grouping === 'Padrão' && row.group === 'Alto')!.meter).toBeNull();
    expect(prices.closing.find(row => row.grouping === 'overall')!.meter).toBe(19300);
  });
  it('não mistura colunas municipais com médias granulares MCMV/MAP no mesmo card', () => {
    const r = report(); r.granularDetails = buildSpGranularDetails(syntheticGranularBuildings(), r); r.municipalPrices = buildSpMunicipalPrices(sources(), r);
    const market = spDisplayMarket(r)!;
    expect(market.prices).toEqual(r.granularDetails.market!.prices);
    expect(market.prices[0].meter).not.toBe(19300);
    expect(market.prices[0].mcmv.meter).not.toBeNull();expect(market.prices[0].map.meter).not.toBeNull();
    expect(r.granularDetails.market!.prices[0].mcmv.meter).not.toBeNull();
  });
  it('não completa lacunas municipais pontuais com dados de outro método',()=>{
    const r=report(),data=sources();
    r.granularDetails=buildSpGranularDetails(syntheticGranularBuildings(),r);
    data.find(source=>source.grouping==='overall'&&source.metric==='medium-prices-meter')!.rows.splice(3,1);
    r.municipalPrices=buildSpMunicipalPrices(data,r);
    const displayed=spDisplayPrices(r)!;
    expect(displayed.seriesMethods[53]).toBe('municipal-reported');
    expect(displayed.series[53][2].value).toBeNull();
    expect(displayed.series[53][3].variation).toBeNull();
  });
  it('distingue 4 e 4+ sem unir observações das duas populações',()=>{
    const data=sources(),r=report();
    const source=data.find(row=>row.grouping==='Tipologia'&&row.metric==='medium-prices-meter')!;
    source.rows.find(row=>row.group==='4+ Quartos')!.group='4';
    const value=buildSpMunicipalPrices(data,r);
    expect(value.bedroomFourGroup).toBe('4+');
    expect(value.series[59].at(-1)!.value).toBe(19300);
    expect(value.series[59][0].variation).toBeNull();
  });
});

type Response = Awaited<ReturnType<NonNullable<SpReadOptions['request']>>>;
const reply = (rows: unknown[], total = rows.length, page = 1, last = 1, next: string | null = null): Response => ({ ok: true, status: 200, data: { data: rows, meta: { total, current_page: page, last_page: last }, links: { next } } } as Response);
describe('SP transporte de preços sem rede real', () => {
  it('delimita seis fontes, consulta ticket somente no fechamento e conserva escopo na paginação', async () => {
    const calls: RequestOptions[] = [];
    const request = vi.fn(async (options: RequestOptions) => { calls.push(options); return reply([]); });
    const result = await fetchSpMunicipalPrices(report(), { request });
    expect(result.sources).toHaveLength(6);
    for (const call of calls) {
      expect(call.query).toMatchObject({ city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], per_page: 100 });
      expect(String(call.query!.end_period) <= '2026-08-31').toBe(true);
      if (call.url.endsWith('/medium-prices')) expect(call.query).toMatchObject({ start_period: '2026-08-01', end_period: '2026-08-31' });
      expect(call.url).not.toContain('building');
    }
    expect(calls.filter(call => call.url.endsWith('/medium-prices'))).toHaveLength(3);
  });
  it('falha fechada em paginação inconsistente e preserva outras fontes', async () => {
    const request = vi.fn(async (options: RequestOptions) => options.query?.group_by === 'Padrão' ? reply([], 1) : reply([]));
    const result = await fetchSpMunicipalPrices(report(), { request });
    expect(result.sources.filter(source => source.grouping === 'Padrão').every(source => source.issue)).toBe(true);
    expect(result.sources.filter(source => source.grouping === 'Tipologia').every(source => !source.issue)).toBe(true);
  });
  it('ignora URL next que tenta trocar cidade e preserva filtros na página seguinte', async () => {
    const calls: RequestOptions[] = [], start = `${spPricePeriods(report())[0].month}-01`;
    const request = vi.fn(async (options: RequestOptions) => {
      calls.push(options);
      if (options.url.endsWith('/medium-prices-meter') && !options.query?.group_by && options.query?.start_period === start) {
        const page = Number(options.query.page), rows = Array.from({ length: page === 1 ? 100 : 1 }, () => ({ period: start, building_type: 'Vertical', group: 'Geral', average_price_per_meter: 10000 }));
        return reply(rows, 101, page, 2, page === 1 ? 'https://other.invalid/?city=Other&page=2' : null);
      }
      return reply([]);
    });
    await fetchSpMunicipalPrices(report(), { request });
    const second = calls.find(call => call.query?.page === 2)!;
    expect(second.url).toBe('https://geobrain.com.br/public-api/temporal-analysis-city/medium-prices-meter');
    expect(second.query).toMatchObject({ city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], start_period: start });
    expect(calls.some(call => call.url.includes('other.invalid'))).toBe(false);
  });
  it('cancela sem iniciar as fontes seguintes', async () => {
    const controller = new AbortController();
    const request = vi.fn(async () => { controller.abort(); return reply([]); });
    await expect(fetchSpMunicipalPrices(report(), { request, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(request).toHaveBeenCalledOnce();
  });
});
