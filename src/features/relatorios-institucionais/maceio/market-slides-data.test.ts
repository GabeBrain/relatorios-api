import {describe,it,expect} from 'vitest';
import {buildMaceioMarketSlide,collectMaceioMarketSlides} from './market-slides-data';
import {marketSlidesFixture} from './__tests__/market-slides-fixture';
import {introFixture} from './__tests__/intro-fixture';
import {maceioCities,type MaceioSelection} from './model';
import type {MaceioRequest} from './api';
import incc from '../fortaleza/incc-di.json';
const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:5};
describe('Maceió · contratos dos slides21–40',()=>{
 for(const periodicity of ['monthly','quarterly'] as const)it(`ranking ignora fotografias pré-lançamento sem transformar fluxo válido ausente em zero / ${periodicity}`,()=>{
  const current={...selection,periodicity,position:periodicity==='monthly'?5:2},data=marketSlidesFixture(current),source=data.sources.find(item=>item.city==='Maceió'&&item.metric==='details')!;
  const baseline=buildMaceioMarketSlide(36,current,data);expect(baseline.issue).toBeNull();
  source.rows.push({building_id:'synthetic/future',release_date:'2027-01-01',typologies_history:[{typology_id:1,period:`${data.end}-01`,sold_in_period:null}]});
  expect(buildMaceioMarketSlide(36,current,data)).toEqual(baseline);
  (source.rows.at(-1)!.typologies_history as Record<string,unknown>[])[0].sold_in_period=1;
  expect(buildMaceioMarketSlide(36,current,data).issue).toMatch(/anterior ao lançamento/);
  source.rows.pop();
  (source.rows[0].typologies_history as Record<string,unknown>[]).at(-1)!.sold_in_period=null;
  expect(buildMaceioMarketSlide(36,current,data).issue).toContain(`sold_in_period, ${data.end}`);
 });
 it('mantém o recorte MCMV dos slides22/33 separado do total vertical',()=>{
  const data=marketSlidesFixture(selection),all=buildMaceioMarketSlide(30,selection,data),mcmv=buildMaceioMarketSlide(33,selection,data);
  expect(mcmv.issue).toBeNull();expect(mcmv.series.capital.at(-1)).toBeLessThan(all.series.capital.at(-1)!);
  const source=data.sources.find(source=>source.city==='Maceió'&&source.metric==='sales'&&source.group==='Padrão')!;
  source.rows=source.rows.filter(row=>row.group!=='MCMV');expect(buildMaceioMarketSlide(33,selection,data).series.capital.at(-1)).toBe(0);
 });
 it('estoque trimestral usa só o último mês; vendas somam os três meses',()=>{
  const s={...selection,periodicity:'quarterly' as const,position:2},data=marketSlidesFixture(s);
  const stock=buildMaceioMarketSlide(40,s,data),sales=buildMaceioMarketSlide(30,s,data),source=data.sources.find(source=>source.city==='Maceió'&&source.metric==='stock')!;
  const closing=source.rows.filter(row=>row.period==='2026-06-01').reduce((sum,row)=>sum+Number(row.stock),0);
  expect(stock.series.labels.at(-1)).toBe('2T/26');expect(stock.series.capital.at(-1)).toBe(closing);expect(sales.series.labels).toHaveLength(17);
 });
 it('não apaga vendas negativas e distingue zero de falta de competência',()=>{
  const data=marketSlidesFixture(selection),source=data.sources.find(source=>source.city==='Maceió'&&source.metric==='sales'&&source.group==='Padrão')!;
  source.rows.filter(row=>row.period==='2026-05-01').forEach(row=>row.liquid_sales=-2);
  expect(buildMaceioMarketSlide(30,selection,data).series.capital.at(-1)).toBe(-8);
  source.rows=source.rows.filter(row=>row.period!=='2026-05-01');expect(buildMaceioMarketSlide(30,selection,data).series.capital.at(-1)).toBe(0);
 });
 it('soma12meses por fechamento e preserva38posições nos acumulados novos',()=>{
  const data=marketSlidesFixture(selection),model=buildMaceioMarketSlide(31,selection,data),source=data.sources.find(source=>source.city==='Maceió'&&source.metric==='sales'&&source.group==='Padrão')!;
  expect(model.series.capital).toHaveLength(38);expect(model.series.capital.at(-1)).toBe(source.rows.slice(-48).reduce((sum,row)=>sum+Number(row.liquid_sales),0));
 });
 it('bloqueia INCC não escolhido, corrige mês a mês e não usa índice anterior ausente',()=>{
  const data=marketSlidesFixture(selection);expect(buildMaceioMarketSlide(26,selection,data).issue).toMatch(/INCC/);
  const corrected=buildMaceioMarketSlide(26,selection,data,'INCC-DI');expect(corrected.issue).toBeNull();expect(corrected.money).toBe(true);
  const source=data.sources.find(source=>source.city==='Maceió'&&source.metric==='releases'&&source.group==='Padrão')!;
  const raw=source.rows.filter(row=>row.period==='2026-04-01').reduce((sum,row)=>sum+Number(row.vgv_release),0),indices:Record<string,number>=incc.indices;
  expect(corrected.series.capital.at(-2)).toBeCloseTo(raw*indices['2026-05']/indices['2026-04']/1e6);
  expect(buildMaceioMarketSlide(26,{...selection,year:2027},marketSlidesFixture({...selection,year:2027}),'INCC-DI').issue).toMatch(/INCC/);
 });
 it('não converte padrões locais e confere total por tipologia contra municipal',()=>{
  const data=marketSlidesFixture(selection);expect(buildMaceioMarketSlide(23,selection,data).issue).toBeNull();
  data.sources.find(source=>source.city==='Maceió'&&source.metric==='releases'&&source.group==='Tipologia')!.rows.at(-1)!.releases_in_period=0;
  expect(buildMaceioMarketSlide(23,selection,data).issue).toMatch(/diverge/);
  data.sources.find(source=>source.city==='Maceió'&&source.metric==='releases'&&source.group==='Padrão')!.rows[0].group='Categoria desconhecida';expect(buildMaceioMarketSlide(21,selection,data).issue).toMatch(/correspondência/);
 });
 it('rankings exigem fluxos explícitos e soma integral, sem substituir capacidade',()=>{
  const data=marketSlidesFixture(selection),rank=buildMaceioMarketSlide(25,selection,data);expect(rank.issue).toBeNull();expect(rank.ranking).toHaveLength(2);expect(rank.cities).toHaveLength(0);
  expect(buildMaceioMarketSlide(36,selection,data).cities).toHaveLength(7);
  const source=data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!;
  const histories=source.rows[0].typologies_history as Record<string,unknown>[];histories.at(-1)!.releases_in_period=0;
  expect(buildMaceioMarketSlide(25,selection,data).issue).toMatch(/diverge/);delete histories.at(-1)!.releases_in_period;histories.at(-1)!.qty=1000;
  expect(buildMaceioMarketSlide(25,selection,data).issue).toMatch(/fluxo explícito/);
 });
 it('rejeita duplicações, subtotal e valores booleanos sem bloquear fontes independentes',()=>{
  for(const kind of ['duplicate','subtotal','boolean']){const data=marketSlidesFixture(selection),source=data.sources.find(s=>s.city==='Maceió'&&s.metric==='sales'&&s.group==='Padrão')!;
   if(kind==='duplicate')source.rows.push({...source.rows[0]});if(kind==='subtotal')source.rows[0].group='Total';if(kind==='boolean')source.rows[0].liquid_sales=true;
   expect(buildMaceioMarketSlide(30,selection,data).issue).toBeTruthy();expect(buildMaceioMarketSlide(40,selection,data).issue).toBeNull();
  }
 });
 it('coleta fontes em paginação estável, sanitiza erro e mantém estoque com vendas reprovadas',async()=>{
  const fixture=marketSlidesFixture(selection),request:MaceioRequest=async options=>{
   const city=String(options.query!.city),metric=options.url.endsWith('building-with-history-internal')?'details':options.url.split('/').at(-1),group=String(options.query!.group_by??'Empreendimento');
   if(metric==='sales')return {ok:false,status:403,data:null} as Awaited<ReturnType<MaceioRequest>>;
   const source=fixture.sources.find(s=>s.city===city&&s.metric===metric&&s.group===group)!,page=Number(options.query!.page),last=Math.max(1,Math.ceil(source.rows.length/100));
   return {ok:true,status:200,data:{data:source.rows.slice((page-1)*100,page*100),meta:{current_page:page,last_page:last,total:source.rows.length},links:{next:page===last?null:`${options.url}?city=${encodeURIComponent(city)}&page=${page+1}`}}} as unknown as Awaited<ReturnType<MaceioRequest>>;
  };
  const data=await collectMaceioMarketSlides(selection,[...maceioCities('monthly')],introFixture(selection),{token:'secret-fixture',request});
  expect(data.sources).toHaveLength(49);expect(data.sources.filter(s=>s.metric==='sales').every(s=>!s.complete)).toBe(true);expect(buildMaceioMarketSlide(40,selection,data).issue).toBeNull();expect(JSON.stringify(data)).not.toContain('secret-fixture');
 });
 it('cancela a coleta e não publica conjunto parcial',async()=>{const controller=new AbortController();controller.abort();await expect(collectMaceioMarketSlides(selection,[...maceioCities('monthly')],introFixture(selection),{token:'x',signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});});
 it('totais fora da precisão segura viram pendência recuperável em vez de derrubar a prévia',()=>{const data=marketSlidesFixture(selection);data.sources.filter(source=>source.metric==='sales'&&source.group==='Padrão').forEach(source=>source.rows.forEach(row=>row.liquid_sales=80_000_000_000_000));expect(buildMaceioMarketSlide(31,selection,data).issue).toMatch(/precisão/);});
});
