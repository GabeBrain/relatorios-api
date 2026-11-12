import { describe,it,expect,vi,afterEach } from 'vitest';
import { render,screen,cleanup,fireEvent } from '@testing-library/react';
import { FORTALEZA_CITIES } from './model';
import { normalizePriceFrames,priceMonths,buildPriceSlide,type PriceCollection,type PriceSource } from './monthly-prices';
import { fetchMonthlyPrices } from './monthly-prices-api';
import { buildMonthlyIvv } from './monthly-ivv';
import { monthlyMarketFixture,monthlyMarketSelection as selection } from './__tests__/monthly-market-fixture';
import FortalezaIntroSlides from './FortalezaIntroSlides';
import FortalezaMonthlyAnalysisSlide from './FortalezaMonthlyAnalysisSlide';
import type { FortalezaRequest } from './api';
afterEach(cleanup);
const cities=[...FORTALEZA_CITIES];
function fixture():PriceCollection {
  const months=priceMonths(selection);
  const sources=cities.flatMap((city,cityIndex)=>(['Vertical','Horizontal'] as const).map(segment=>{
    const products=segment==='Vertical'?['Standard']:['Condomínio de Casas','Loteamento Fechado','Loteamento Aberto'];
    const source:PriceSource={city,segment,complete:true,records:products.map((standard,index)=>({building_id:`${city}-${segment}-${index}`,city,state:'CE',building_type:segment,standard,release_date:'2020-01-01',typologies:[{id:index+1,type_of_typology:'Padrão'}],typologies_history:months.map(month=>({typology_id:index+1,period:`${month}-01`,typology_stock:cityIndex+1,price_private_area:1000+cityIndex*100+index*1000}))})),frames:{},issue:null,requests:1,startedAt:'',finishedAt:''};
    source.frames=normalizePriceFrames(source,months);return source;
  }));return {scopeKey:'fixture',months,sources,issues:[]};
}
describe('Fortaleza mensal 36–45',()=>{
  it('37 apresenta13 meses e38 separa casas de lotes fechados',()=>{
    const data=fixture(),first=buildPriceSlide(37,data,selection,cities),second=buildPriceSlide(38,data,selection,cities);
    expect(first.status).toBe('ready');expect(first.series[0].points).toHaveLength(13);expect(first.changes).toEqual([{month:0,year:0}]);
    expect(second.series.map(line=>line.points[0].value)).toEqual([1000,2000]);
  });
  it('RM pondera unidades entre cidades, não médias municipais simples',()=>{
    const result=buildPriceSlide(40,fixture(),selection,cities);
    expect(result.status).toBe('ready');expect(result.average).toBeCloseTo((1100*2+1200*3+1300*4+1400*5)/14);
    expect(result.average).not.toBe(1250);
  });
  it.each([40,41,42,43])('slide%s exige as quatro cidades e oferta positiva',page=>{
    expect(buildPriceSlide(page,fixture(),selection,['Fortaleza','Aquiraz']).status).toBe('blocked');
    const data=fixture();data.sources.filter(source=>source.city==='Aquiraz').forEach(source=>Object.values(source.frames).forEach(frame=>frame.rows.forEach(row=>row.units=0)));
    expect(buildPriceSlide(page,data,selection,cities).status).toBe('blocked');
  });
  it('exclui cobertura somente no40 e exige categoria para essa exclusão',()=>{
    const data=fixture(),source=data.sources.find(source=>source.city==='Aquiraz'&&source.segment==='Vertical')!;
    const frame=source.frames[data.months.at(-1)!];frame.rows.push({...frame.rows[0],typology:'special',meter:99999,category:'Cobertura'});
    expect(buildPriceSlide(40,data,selection,cities).cities![0].value).toBe(1100);
    frame.rows[0].category=null;expect(buildPriceSlide(40,data,selection,cities).status).toBe('blocked');
  });
  it('não substitui preço histórico ausente pelo preço atual, nem usa estoque zero',()=>{
    const data=fixture(),source=data.sources[0],record=source.records[0];record.price_private_area=77777;
    const history=record.typologies_history as Record<string,unknown>[];delete history[0].price_private_area;source.frames=normalizePriceFrames(source,data.months);
    expect(buildPriceSlide(37,data,selection,cities).status).toBe('blocked');
    source.frames[data.months[0]].rows[0].units=0;expect(buildPriceSlide(37,data,selection,cities).status).toBe('blocked');
  });
  it('deduplica tipologia/mês idêntico e bloqueia conflito ou mês ausente',()=>{
    const data=fixture(),source=data.sources[0],history=source.records[0].typologies_history as Record<string,unknown>[];
    history.push({...history[0]});source.frames=normalizePriceFrames(source,data.months);expect(buildPriceSlide(37,data,selection,cities).status).toBe('ready');
    history.at(-1)!.price_private_area=9;source.frames=normalizePriceFrames(source,data.months);expect(buildPriceSlide(37,data,selection,cities).status).toBe('blocked');
    history.splice(0,2);source.frames=normalizePriceFrames(source,data.months);expect(buildPriceSlide(37,data,selection,cities).status).toBe('blocked');
  });
  it('IVV usa estoque anterior e média aritmética de25 taxas, preservando vendas negativas',()=>{
    const data=monthlyMarketFixture(),result=buildMonthlyIvv(data,selection,cities);
    expect(result.status).toBe('ready');expect(result.series[0].points).toHaveLength(25);expect(result.series[0].points[0].value).toBeCloseTo(12/176*100);
    expect(result.average).toBeCloseTo(result.series[0].points[0].value!);
    data.sources.find(source=>source.city==='Fortaleza'&&source.segment==='Vertical'&&source.metric==='sales')!.rows.forEach(row=>row.liquid_sales=-1);
    expect(buildMonthlyIvv(data,selection,cities).series[0].points[0].value).toBeLessThan(0);
  });
  it('IVV não infere abertura ausente nem divide por oferta zero',()=>{
    const data=monthlyMarketFixture(),source=data.sources.find(source=>source.city==='Fortaleza'&&source.segment==='Vertical'&&source.metric==='stock')!;
    source.rows.splice(0,7);expect(buildMonthlyIvv(data,selection,cities).status).toBe('blocked');
    const zero=monthlyMarketFixture();zero.sources.forEach(source=>source.rows.forEach(row=>{row.stock=0;row.releases_in_period=0;}));
    expect(buildMonthlyIvv(zero,selection,cities).status).toBe('blocked');
  });
  it('coleta v2 comPOST/escopo preservado, cache e isolamento de resposta inválida',async()=>{
    const data=fixture();let active=0,max=0;
    const request=vi.fn<FortalezaRequest>(async options=>{active++;max=Math.max(max,active);await Promise.resolve();active--;const source=data.sources.find(source=>source.city===options.query.city&&source.segment===options.query.type)!;
      return {ok:true,status:200,data:{data:source.records,meta:{total:source.records.length,current_page:1,last_page:1}},text:null,contentType:'application/json',latencyMs:1,bytes:1,error:null,requestHeaders:{},requestQuery:{},requestBody:null,url:'',method:'POST'};
    });
    const result=await fetchMonthlyPrices(selection,cities,{token:'synthetic',request});expect(result.issues).toEqual([]);expect(max).toBeLessThanOrEqual(2);expect(request).toHaveBeenCalledTimes(10);
    expect(request.mock.calls[0][0]).toMatchObject({method:'POST',includeAuth:false,query:{city:'Fortaleza',type:'Vertical',page:1,per_page:50}});
    await fetchMonthlyPrices(selection,cities,{token:'synthetic',request},result);expect(request).toHaveBeenCalledTimes(10);
    data.sources[0].records[0].city='Outra';const invalid=await fetchMonthlyPrices(selection,cities,{token:'synthetic',request});expect(invalid.sources[0].complete).toBe(false);expect(invalid.sources[1].complete).toBe(true);
    const controller=new AbortController();controller.abort();await expect(fetchMonthlyPrices(selection,cities,{token:'synthetic',request,signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
  });
  it.each([36,39,44])('divisória%s usa data selecionada',page=>{
    render(<FortalezaMonthlyAnalysisSlide page={page} selection={{...selection,year:2027,position:1}} data={null}/>);expect(screen.getByText('janeiro de 2027')).toBeTruthy();
  });
  it.each(['changed-total','duplicate-id','wrong-city','limit'])('v2 rejeita cobertura %s sem publicar páginas parciais',async mode=>{
    const record=fixture().sources[0].records[0];
    const request=vi.fn<FortalezaRequest>(async options=>{
      const page=Number(options.query.page);
      const item={...record,building_id:mode==='duplicate-id'?'same':String(page),city:mode==='wrong-city'?'Outra':'Fortaleza',building_type:options.query.type};
      return {ok:true,status:200,data:{data:[item],meta:{total:mode==='changed-total'&&page===2?3:2,current_page:page,last_page:mode==='limit'?21:2}},text:null,contentType:'application/json',latencyMs:1,bytes:1,error:null,requestHeaders:{},requestQuery:{},requestBody:null,url:'',method:'POST'};
    });
    const result=await fetchMonthlyPrices({...selection,territory:'city'},['Fortaleza'],{token:'synthetic',request});
    expect(result.sources.every(source=>!source.complete&&source.records.length===0)).toBe(true);
  });
  it('cancelamento no transporte impede novas páginas e drena as duas tarefas v2',async()=>{
    const controller=new AbortController();let active=0;
    const request=vi.fn<FortalezaRequest>(async()=>{active++;await Promise.resolve();controller.abort();active--;return {ok:true,status:200,data:{data:[],meta:{total:0,current_page:1,last_page:1}},text:null,contentType:'application/json',latencyMs:1,bytes:1,error:null,requestHeaders:{},requestQuery:{},requestBody:null,url:'',method:'POST'};});
    await expect(fetchMonthlyPrices(selection,cities,{token:'synthetic',request,signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
    expect(request.mock.calls.length).toBeLessThanOrEqual(2);expect(active).toBe(0);
  });
  it('mantém ordem oficial35–45 e encerra no45',()=>{
    render(<FortalezaIntroSlides selection={selection} cities={cities} data={null} monthlyLaunches={{sources:[],issues:[],market:monthlyMarketFixture(),prices:fixture()}}/>);
    fireEvent.click(screen.getByRole('button',{name:'35'}));for(let page=36;page<=45;page++){fireEvent.click(screen.getByRole('button',{name:'Próximo'}));expect(screen.getByRole('img',{name:`Fortaleza · slide ${page}`})).toBeTruthy();}
    expect((screen.getByRole('button',{name:'Próximo'})as HTMLButtonElement).disabled).toBe(false);
  });
  it('troca mensal para trimestral sem manter uma posição inexistente na prévia',()=>{
    const {rerender}=render(<FortalezaIntroSlides selection={selection} cities={cities} data={null}/>);
    fireEvent.click(screen.getByRole('button',{name:'45'}));
    rerender(<FortalezaIntroSlides selection={{...selection,periodicity:'quarterly',position:2}} cities={cities} data={null}/>);
    expect(screen.getByRole('button',{name:'45'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button',{name:'90'})).toBeNull();
  });
});
