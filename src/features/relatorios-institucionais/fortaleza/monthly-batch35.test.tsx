import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it } from 'vitest';
import { FORTALEZA_CITIES } from './model';
import { buildMonthlySlide,monthlyMarketSourceIssue } from './monthly-market';
import { monthlyMarketFixture,monthlyMarketSelection as selection } from './__tests__/monthly-market-fixture';
import FortalezaMonthlyMarketSlide from './FortalezaMonthlyMarketSlide';
import FortalezaIntroSlides from './FortalezaIntroSlides';
afterEach(cleanup);
const cities = [...FORTALEZA_CITIES];
const indices = Object.fromEntries(monthlyMarketFixture().months.map(month => [month,100]));
describe('Fortaleza mensal —26–35', () => {
  it('26 agrega somente a RM e mantém13 pontos móveis de12meses', () => {
    const result = buildMonthlySlide(26,monthlyMarketFixture(),selection,cities);
    expect(result.rolling).toHaveLength(13); expect(result.rolling.at(-1)).toMatchObject({ launches:768,sales:576 });
    expect(result.sourceKeys).toHaveLength(8); expect(result.sourceKeys.some(key => key.startsWith('Fortaleza/'))).toBe(false);
  });
  it.each([[27,64],[28,5.9],[31,4.5]])('VGV%s usa vgv_liquid_sales com sinal e INCC antes da soma', (page,expected) => {
    const data = monthlyMarketFixture(), result = buildMonthlySlide(page,data,selection,cities,indices);
    expect(result.status).toBe('ready'); expect(result.history.at(-1).total).toBeCloseTo(expected);
    data.sources.filter(source => source.metric === 'sales').forEach(source => source.rows.forEach(row => { row.vgv_liquid_sales = -1_000_000; }));
    expect(buildMonthlySlide(page,data,selection,cities,indices).history.at(-1).total).toBeLessThan(0);
    data.sources.filter(source => source.metric === 'sales').forEach(source => source.rows.forEach(row => { delete row.vgv_liquid_sales; }));
    expect(buildMonthlySlide(page,data,selection,cities,indices).status).toBe('blocked');
    expect(buildMonthlySlide(30,data,selection,cities).status).toBe('ready');
  });
  it('30 exclui casas/chácaras/comercial das vendas de loteamentos', () => {
    expect(buildMonthlySlide(30,monthlyMarketFixture(),selection,cities).history.at(-1)).toMatchObject({ first:2,second:8,total:10 });
  });
  it.each([[33,1300],[34,160],[35,640]])('estoque%s é fotografia mensal e nunca acumulado no ano', (page,total) => {
    const data = monthlyMarketFixture();
    data.sources.filter(source => source.metric === 'stock').forEach(source => source.rows.forEach(row => { if (String(row.period).startsWith('2025-07')) row.stock = Number(row.stock) / 2; if (String(row.period).startsWith('2024-07')) row.stock = Number(row.stock) / 2; }));
    const result = buildMonthlySlide(page,data,selection,cities);
    expect(result.status).toBe('ready'); expect(result.history.at(-1).total).toBe(total);
    expect(result.accumulated).toEqual([]); expect(result.stockChanges).toEqual({ year:100,twoYears:100 });
    if (page === 34) expect(result.history.at(-1)).toMatchObject({ first:100,second:60 });
    if (page === 35) expect(result.history.at(-1)).toMatchObject({ first:400,second:240 });
  });
  it('falta ou estoque negativo bloqueia a fonte dependente sem apagar vendas', () => {
    const data = monthlyMarketFixture(), source = data.sources.find(source => source.city === 'Aquiraz' && source.segment === 'Vertical' && source.metric === 'stock')!;
    source.rows[0].stock = -1;
    expect(monthlyMarketSourceIssue(source,data.months)).not.toBeNull();
    expect(buildMonthlySlide(35,data,selection,cities).status).toBe('blocked');
    expect(buildMonthlySlide(26,data,selection,cities).status).toBe('ready');
    expect(buildMonthlySlide(34,data,selection,cities).status).toBe('ready');
  });
  it('zero explícito mantém oferta disponível e não inventa variação sobre base zero', () => {
    const data = monthlyMarketFixture(); data.sources.filter(source => source.metric === 'stock').forEach(source => source.rows.forEach(row => { row.stock=0; }));
    const result = buildMonthlySlide(33,data,selection,cities);
    expect(result.status).toBe('ready'); expect(result.history.at(-1).total).toBe(0); expect(result.stockChanges).toEqual({ year:null,twoYears:null });
  });
  it.each([26,27,28,30,31,33,34,35])('renderiza slide%s com dados próprios, sem datas antigas', page => {
    const result = buildMonthlySlide(page,monthlyMarketFixture(),selection,cities);
    render(<FortalezaMonthlyMarketSlide page={page} selection={selection} cities={cities} data={result} />);
    expect(screen.getByRole('img',{ name:`Fortaleza · slide ${page}` })).toBeTruthy();
    expect(document.querySelector('[aria-label="Histórico mensal pendente"]')).toBeNull();
    if (page >= 33) expect(screen.getByLabelText('Fotografias mensais de oferta final')).toBeTruthy();
  });
  it.each([29,32])('divisória%s acompanha mês/ano e municípios', page => {
    render(<FortalezaMonthlyMarketSlide page={page} selection={{ ...selection,year:2027,position:1 }} cities={['Fortaleza']} data={null} />);
    expect(screen.getByText('janeiro de 2027')).toBeTruthy(); expect(screen.getByText('Fortaleza')).toBeTruthy();
  });
  it('navegação preserva sequência25–35 e nenhum slot é renumerado', () => {
    render(<FortalezaIntroSlides selection={selection} cities={cities} data={null} monthlyLaunches={{ sources:[],issues:[],market:monthlyMarketFixture() }} />);
    fireEvent.click(screen.getByRole('button',{ name:'25' }));
    for (let page=26;page<=35;page++) { fireEvent.click(screen.getByRole('button',{ name:'Próximo' })); expect(screen.getByRole('img',{ name:`Fortaleza · slide ${page}` })).toBeTruthy(); }
    expect((screen.getByRole('button',{ name:'Próximo' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
