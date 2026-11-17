import {describe,it,expect} from 'vitest';
import {buildRemainingSlide,remainingRole} from './remaining-data';
import {remainingFixture} from './__tests__/remaining-fixture';
import type {MaceioSelection} from './model';
import type {MarketRow} from './market';
import {collectMaceioMarketSlides} from './market-slides-data';
import {introFixture} from './__tests__/intro-fixture';
import type {MaceioRequest} from './api';
const monthly:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:5};
const quarterly:MaceioSelection={...monthly,periodicity:'quarterly',position:2};
const selected=(quarter=false)=>quarter?quarterly:monthly;
describe('Maceió · todos os slides restantes',()=>{
  for(const quarter of [false,true])it(`percorre a sequência completa ${quarter?'trimestral':'mensal'} com fontes válidas`,()=>{
    const selection=selected(quarter),data=remainingFixture(selection);
    for(let page=61;page<=(quarter?87:82);page++)expect(buildRemainingSlide(page,selection,data,'stock-weighted').issue,`slide${page}`).toBeNull();
  });
  it('comercial existe somente no trimestral e equipe respeita posições',()=>{
    expect(remainingRole(80,monthly)).toBe('editorial');expect(remainingRole(80,quarterly)).toBe('commercial-type');expect(remainingRole(84,quarterly)).toBe('editorial');
    expect(buildRemainingSlide(82,monthly,null).kind).toBe('editorial');expect(buildRemainingSlide(87,quarterly,null).kind).toBe('editorial');
  });
  it('mantém recortes capital/RM separados nas tabelas trimestrais',()=>{
    const data=remainingFixture(quarterly),capital=buildRemainingSlide(64,quarterly,data),rm=buildRemainingSlide(65,quarterly,data);
    expect(capital.tables[0].rows.at(-1)!.values[2]).toBe(1000);expect(rm.tables[0].rows.at(-1)!.values[2]).toBe(20000);
  });
  it('capacidade de oferta não é o fluxo do trimestre',()=>{
    const data=remainingFixture(quarterly),table=buildRemainingSlide(64,quarterly,data).tables[0];expect(table.rows.at(-1)!.values).toEqual([2000,100,1000,100,50]);
  });
  it('usa4oumais dormitórios sem excluir unidades de5dorms',()=>{
    const data=remainingFixture(monthly),row=(data.sources.find(s=>s.metric==='details')!.rows.at(-1)!.typologies_history as MarketRow[]).at(-1)!;row.number_bedroom=5;
    expect(buildRemainingSlide(64,monthly,data).tables[0].rows[3].values[0]).toBe(400);
  });
  it('percentuais de estoque anual somam100e incluem anos antigos',()=>{
    const model=buildRemainingSlide(62,monthly,remainingFixture(monthly));expect(model.tables[0].rows[0].values[0]).toBe(1000);expect(model.tables[0].rows.at(-1)!.values[1]).toBe(100);
  });
  it('histórico de estágio é obrigatório e não usa status atual',()=>{
    const data=remainingFixture(monthly),building=data.sources.find(s=>s.metric==='details')!.rows[0];building.building_status='Pronto';const row=(building.typologies_history as MarketRow[]).at(-1)!;delete row.estagio_empreendimento;
    expect(buildRemainingSlide(67,monthly,data).issue).toMatch(/Categoria/);
  });
  it('gráficos de tempo médio representam participação por estágio',()=>{
    const model=buildRemainingSlide(67,monthly,remainingFixture(monthly));expect(model.kind).toBe('stages');for(const panel of model.stages)for(const values of panel.values)expect(values.reduce<number>((a,b)=>a+(b??0),0)).toBeCloseTo(100);
  });
  it('não converte Econômico emMCMV na família',()=>{
    const data=remainingFixture(monthly);data.sources.find(s=>s.metric==='details')!.rows[0].standard_family='Econômico';expect(buildRemainingSlide(68,monthly,data).issue).toMatch(/correspondência/);
  });
  it('VGV exige escolha de método e reconcilia capacidade=vendidas+final',()=>{
    const data=remainingFixture(monthly);expect(buildRemainingSlide(69,monthly,data).issue).toMatch(/critério/);
    const values=buildRemainingSlide(69,monthly,data,'stock-weighted').tables[0].rows.at(-1)!.values;
    expect(Number(values[1])).toBe(Number(values[2])+Number(values[3]));expect(Number(values[4])).toBeCloseTo(Number(values[5])+Number(values[6]));
  });
  it('rejeita capacidade menor que estoque',()=>{
    const data=remainingFixture(quarterly);(data.sources.find(s=>s.metric==='details')!.rows[0].typologies_history as MarketRow[]).at(-1)!.qty=0;expect(buildRemainingSlide(64,quarterly,data).issue).toMatch(/Capacidade/);
  });
  it('histórico por área inclui áreas fracionárias sem perder o total',()=>{
    const data=remainingFixture(monthly);(data.sources.find(s=>s.metric==='details')!.rows[0].typologies_history as MarketRow[]).at(-1)!.private_area=44.5;const model=buildRemainingSlide(65,monthly,data);expect(model.tables[0].rows[1].values[0]).toBe(100);expect(model.tables[0].rows.at(-1)!.values.at(-1)).toBe(1000);
  });
  it('preços mínimo/médio/máximo são históricos e ponderados pelo estoque',()=>{
    const model=buildRemainingSlide(66,monthly,remainingFixture(monthly),'stock-weighted');expect(model.tables[0].rows[0].values[0]).toBe(30);expect(model.tables[0].rows[0].values[4]).toBe(5640);
  });
  it('horizontal exige subtipo explícito sem inferir pelo padrão',()=>{
    const data=remainingFixture(monthly);delete data.horizontal![0].rows[0].building_subtype;data.horizontal![0].rows[0].standard='Econômico';expect(buildRemainingSlide(71,monthly,data).issue).toMatch(/Categoria/);
  });
  it('classifica os5padrões comerciais peloR$/m²do fechamento',()=>{
    const model=buildRemainingSlide(80,quarterly,remainingFixture(quarterly));expect(model.tables[0].rows.map(row=>row.label)).toEqual(['Econômico','Standard','Médio','Alto','Alto +','Total']);expect(model.tables[0].rows.at(-1)!.values[1]).toBe(5);
  });
  it('falha horizontal não derruba vertical ou comercial',()=>{
    const data=remainingFixture(quarterly);data.horizontal![0].complete=false;expect(buildRemainingSlide(72,quarterly,data).issue).not.toBeNull();expect(buildRemainingSlide(64,quarterly,data).issue).toBeNull();expect(buildRemainingSlide(80,quarterly,data).issue).toBeNull();
  });
  it('não classifica preço comercial zero como Econômico',()=>{
    const data=remainingFixture(quarterly);(data.commercial![0].rows[0].typologies_history as MarketRow[])[0].price=0;expect(buildRemainingSlide(80,quarterly,data).issue).toMatch(/preço comercial/);
  });
  it('não duplica contagem de empreendimentos em classes comerciais distintas',()=>{
    const data=remainingFixture(quarterly),source=data.commercial![0],building=source.rows[0],row=(building.typologies_history as MarketRow[])[0];
    (building.typologies as MarketRow[]).push({id:2,type_of_typology:'Padrão'});(building.typologies_history as MarketRow[]).push({...row,typology_id:2,price:850000});
    data.commercial![1].rows[0].stock=200;
    expect(buildRemainingSlide(80,quarterly,data).issue).toMatch(/mais de um grupo/);
  });
  for(const fault of ['stock','duplicate','missing','universe'] as const)it(`bloqueia histórico ${fault} sem preencher dados atuais`,()=>{
    const data=remainingFixture(monthly),source=data.sources.find(s=>s.metric==='details')!,building=source.rows[0],history=building.typologies_history as MarketRow[];
    if(fault==='stock')history.at(-1)!.typology_stock=0;if(fault==='duplicate')source.rows.push(building);if(fault==='missing')history.pop();if(fault==='universe')building.building_type='Comercial';
    expect(buildRemainingSlide(62,monthly,data).issue).not.toBeNull();
  });
  it('explica ausência de fonte e universo vazio',()=>{
    expect(buildRemainingSlide(62,monthly,null).issue).toMatch(/Gere/);
    const data=remainingFixture(monthly);for(const source of data.sources){if(source.metric==='stock')source.rows.forEach(row=>row.stock=0);if(source.metric==='details')for(const building of source.rows)(building.typologies_history as MarketRow[]).forEach(row=>row.typology_stock=0);}
    expect(buildRemainingSlide(62,monthly,data).issue).toMatch(/Nenhum/);
  });
  it('trocar a referência invalida a fotografia antiga e recalcula as colunas anuais',()=>{
    const data=remainingFixture(monthly),changed={...monthly,year:2025,position:8};
    expect(buildRemainingSlide(62,changed,data).issue).toMatch(/período/);
    const fresh=buildRemainingSlide(62,changed,remainingFixture(changed));expect(fresh.tables[0].rows[0].label).toBe('Até 2020');expect(fresh.tables[0].rows.at(-2)!.label).toBe('2025');expect(fresh.issue).toBeNull();
  });
  it('coleta horizontal em fonte própria e não vaza dados de outros segmentos',async()=>{
    const calls:string[]=[],request:MaceioRequest=async args=>{calls.push(String(args.query?.type??args.query?.['type[]']));return {ok:true,status:200,data:{data:[],meta:{current_page:1,last_page:1,total:0},links:{next:null}}} as Awaited<ReturnType<MaceioRequest>>;};
    const data=await collectMaceioMarketSlides(monthly,[...maceioCitiesForTest()],introFixture(monthly),{token:'synthetic',segment:'Horizontal',closingOnly:true,request});expect(data.sources).toHaveLength(14);expect(calls.every(value=>value==='Horizontal')).toBe(true);
  });
});
function maceioCitiesForTest(){return ['Maceió','Pilar','Marechal Deodoro','Paripueira','Rio Largo','Barra de São Miguel','Coqueiro Seco'];}
