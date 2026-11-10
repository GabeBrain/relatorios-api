import { afterEach,describe,expect,it } from 'vitest';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { FORTALEZA_CITIES } from './model';
import { monthlyMarketFixture,monthlyMarketSelection as selection } from './__tests__/monthly-market-fixture';
import { buildMonthlyIvv } from './monthly-ivv';
import { buildOfferTable,offerRatio } from './monthly-tables';
import { normalizePriceFrames,priceMonths,type PriceCollection,type PriceSource } from './monthly-prices';
import FortalezaIntroSlides from './FortalezaIntroSlides';
import FortalezaMonthlyTableSlide from './FortalezaMonthlyTableSlide';
afterEach(cleanup);
const cities=[...FORTALEZA_CITIES];
function fixture():PriceCollection {
  const months=priceMonths(selection),sources=cities.flatMap((city,cityIndex)=>(['Vertical','Horizontal'] as const).map(segment=>{
    const products=segment==='Vertical'?['Standard']:['Condomínio de Casas','Loteamento Fechado','Loteamento Aberto'];
    const source:PriceSource={city,segment,complete:true,issue:null,requests:1,startedAt:'',finishedAt:'',frames:{},records:products.map((standard,index)=>({building_id:`${city}-${segment}-${index}`,city,state:'CE',building_type:segment,standard,release_date:'2020-01-01',neighborhood:`Bairro ${index+1}`,typologies:[{id:index+1,type_of_typology:'Padrão'}],typologies_history:months.map((month,monthIndex)=>({typology_id:index+1,period:`${month}-01`,qty:100,typology_stock:monthIndex===12?10+cityIndex:20+cityIndex,sold_in_period:monthIndex===12?5:0,price_private_area:1000+index*1000}))}))};source.frames=normalizePriceFrames(source,months);return source;
  }));return {scopeKey:'fixture55',months,sources,issues:[]};
}
describe('Fortaleza mensal46–55',()=>{
  it('preserva grafia autorizada sem perder identidade por caixa ou acento',()=>{
    const names=cities.map(city=>city.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()),data=monthlyMarketFixture();
    data.sources.forEach(source=>source.city=source.city.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase());
    expect(buildMonthlyIvv(data,selection,names,true).status).toBe('ready');expect(buildOfferTable(47,data,null,selection,names).status).toBe('ready');
  });
  it('46 calcula IVV agregado da RM e não inclui capital nem faz média das taxas',()=>{
    const data=monthlyMarketFixture(),result=buildMonthlyIvv(data,selection,cities,true);
    expect(result.status).toBe('ready');expect(result.series[0].points).toHaveLength(25);
    const capital=data.sources.find(source=>source.city==='Fortaleza'&&source.segment==='Vertical'&&source.metric==='sales')!;capital.rows.forEach(row=>row.liquid_sales=9999);
    expect(buildMonthlyIvv(data,selection,cities,true)).toEqual(result);
    data.sources.find(source=>source.city==='Aquiraz'&&source.segment==='Vertical'&&source.metric==='stock')!.rows.forEach(row=>row.stock=500);
    expect(buildMonthlyIvv(data,selection,cities,true).series[0].points[0].value).toBeCloseTo(48/(3500+3*160+4*16)*100);
    expect(buildMonthlyIvv(data,selection,['Aquiraz'],true).status).toBe('blocked');
  });
  it('47 totaliza oferta e fluxos municipais, IVV é razão dos totais',()=>{
    const result=buildOfferTable(47,monthlyMarketFixture(),null,selection,cities);
    expect(result.status).toBe('ready');expect(result.rows).toHaveLength(4);expect(result.total).toMatchObject({opening:640,stock:640,launches:64,sales:48});
    expect(offerRatio(result.total.sales,result.total.opening+result.total.launches)).toBeCloseTo(48/704*100);
  });
  it.each([48,49])('tabela%s separa três produtos horizontais, exclui chácaras',page=>{
    const result=buildOfferTable(page,monthlyMarketFixture(),null,selection,cities);
    expect(result.status).toBe('ready');expect(result.rows.map(row=>row.label)).toEqual(['Loteamento Aberto','Loteamento Fechado','Casas em Condomínio']);
    expect(result.total.sales).toBe(page===48?4:16);expect(result.total.stock).toBe(page===48?120:480);
  });
  it('50 conta IDs ativos e capacidade histórica, não cadastro atual ou estoque acumulado',()=>{
    const data=fixture();data.sources.find(source=>source.city==='Fortaleza'&&source.segment==='Horizontal')!.records.forEach(record=>record.total_units=99999);
    const result=buildOfferTable(50,null,data,selection,cities);
    expect(result.status).toBe('ready');expect(result.total).toMatchObject({projects:3,capacity:300,stock:30});
    expect(offerRatio(result.total.capacity-result.total.stock,result.total.capacity)).toBe(90);
    const record=data.sources.find(source=>source.city==='Fortaleza'&&source.segment==='Horizontal')!.records[0];(record.typologies_history as Record<string,unknown>[]).at(-1)!.typology_stock=0;
    expect(buildOfferTable(50,null,data,selection,cities).total).toMatchObject({projects:2,capacity:200,stock:20});
  });
  it('51 agrega as quatro cidades sem capital',()=>{
    const result=buildOfferTable(51,null,fixture(),selection,cities);expect(result.status).toBe('ready');expect(result.total.projects).toBe(12);expect(result.total.capacity).toBe(1200);expect(result.total.stock).toBe(150);
  });
  it('52 mantém bairro, preço ponderado, abertura observada e venda histórica com sinal',()=>{
    const data=fixture(),source=data.sources[0],record=source.records[0],history=record.typologies_history as Record<string,unknown>[];history.at(-1)!.sold_in_period=-2;
    const result=buildOfferTable(52,monthlyMarketFixture(),data,selection,cities);
    expect(result.status).toBe('ready');expect(result.total).toMatchObject({opening:20,stock:10,sales:-2,weighted:10000,priceUnits:10});expect(result.warnings.length).toBe(1);
  });
  it('lançamento no mês usa qty observado e abertura zero pelo lançamento posterior',()=>{
    const data=fixture(),record=data.sources[0].records[0];record.release_date='2026-07-01';record.typologies_history=(record.typologies_history as Record<string,unknown>[]).slice(-1);
    const result=buildOfferTable(52,null,data,selection,cities);expect(result.status).toBe('ready');expect(result.total).toMatchObject({opening:0,launches:100,stock:10,sales:5});
  });
  it.each(['neighborhood','sold_in_period','qty','snapshot','conflict'])('ausência/conflito %s não vira zero',mode=>{
    const data=fixture(),record=data.sources[0].records[0],history=record.typologies_history as Record<string,unknown>[];
    if(mode==='neighborhood')record.neighborhood='';if(mode==='sold_in_period')delete history.at(-1)!.sold_in_period;if(mode==='qty'){record.release_date='2026-07-01';delete history.at(-1)!.qty;}if(mode==='snapshot')history.splice(-2,1);if(mode==='conflict')history.push({...history.at(-1),typology_stock:999});
    expect(buildOfferTable(52,null,data,selection,cities).status).toBe('blocked');
  });
  it('capacidade ausente e estoque superior à capacidade bloqueiam50',()=>{
    const data=fixture(),record=data.sources.find(source=>source.city==='Fortaleza'&&source.segment==='Horizontal')!.records[0],history=record.typologies_history as Record<string,unknown>[];
    delete history.at(-1)!.qty;expect(buildOfferTable(50,null,data,selection,cities).status).toBe('blocked');history.at(-1)!.qty=1;expect(buildOfferTable(50,null,data,selection,cities).status).toBe('blocked');
  });
  it('bairros não repetem linhas entre páginas, total integral aparece nas quatro',()=>{
    const data=fixture(),source=data.sources[0],base=source.records[0];source.records=Array.from({length:55},(_,index)=>({...structuredClone(base),building_id:index+1,neighborhood:`Bairro ${String(index).padStart(2,'0')}`}));
    const result=buildOfferTable(52,null,data,selection,cities);expect(result.status).toBe('ready');expect(result.rows).toHaveLength(55);expect(result.total.stock).toBe(550);
    for(let page=52;page<=55;page++){const view=render(<FortalezaMonthlyTableSlide page={page} selection={selection} data={result}/>);expect(screen.getByRole('img',{name:`Fortaleza · slide ${page}`})).toBeTruthy();expect(screen.getByText('550')).toBeTruthy();view.unmount();}
    source.records.push({...structuredClone(base),building_id:57,neighborhood:'Extra1'},{...structuredClone(base),building_id:58,neighborhood:'Extra2'});expect(buildOfferTable(52,null,data,selection,cities).status).toBe('blocked');
  });
  it('roster histórico incompleto bloqueia o bairro sem carregar estoque adiante',()=>{
    const data=fixture(),record=data.sources[0].records[0],history=record.typologies_history as Record<string,unknown>[];history.push({...history.at(-2),typology_id:99});expect(buildOfferTable(52,null,data,selection,cities).status).toBe('blocked');
  });
  it.each(['duplicate','scope','placeholder'])('não consolida bairro com %s',mode=>{
    const data=fixture(),source=data.sources[0];if(mode==='duplicate')source.records.push(structuredClone(source.records[0]));if(mode==='scope')source.records[0].city='Outra';if(mode==='placeholder')source.records[0].neighborhood='Não informado';expect(buildOfferTable(52,null,data,selection,cities).status).toBe('blocked');
  });
  it('cabeçalho janeiro atravessa o ano sem manter datas do original',()=>{
    const data=buildOfferTable(47,monthlyMarketFixture(),null,selection,cities);
    render(<FortalezaMonthlyTableSlide page={47} selection={{...selection,year:2027,position:1}} data={data}/>);
    expect(screen.getByText('dez/26')).toBeTruthy();expect(screen.getByText('jan/27')).toBeTruthy();expect(screen.getByText('janeiro de 2027')).toBeTruthy();
  });
  it('navega46–55 na ordem oficial e encerra a prévia no55',()=>{
    render(<FortalezaIntroSlides selection={selection} cities={cities} data={null} monthlyLaunches={{sources:[],issues:[],market:monthlyMarketFixture(),prices:fixture()}}/>);
    fireEvent.click(screen.getByRole('button',{name:'45'}));for(let page=46;page<=55;page++){fireEvent.click(screen.getByRole('button',{name:'Próximo'}));expect(screen.getByRole('img',{name:`Fortaleza · slide ${page}`})).toBeTruthy();}expect((screen.getByRole('button',{name:'Próximo'})as HTMLButtonElement).disabled).toBe(true);
  });
});
