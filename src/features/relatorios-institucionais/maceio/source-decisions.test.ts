import { describe,it,expect } from 'vitest';
import { buildOfferPriceSlide } from './offer-price-data';
import { buildRemainingSlide } from './remaining-data';
import { remainingFixture } from './__tests__/remaining-fixture';
import { maceioHorizontalProduct } from './classification';
import { buildMaceioClosedReview } from './closed-review';
import { auditMaceioStock } from './stock-audit';
import { readCells, buildMaceioMarketSlide } from './market-slides-data';
import type { MarketRow } from './market';
import { buildMaceioDiagnostic } from './diagnostic';
import { introFixture } from './__tests__/intro-fixture';
import { cagedFixture } from './__tests__/caged-fixture';
import type { MaceioSelection } from './model';

const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:5};
describe('decisões de fonte confirmadas por Lucas',()=>{
  for(const periodicity of ['monthly','quarterly'] as const)it(`diagnóstico completo sem fonte pendente com as decisões aplicadas ${periodicity}`,()=>{
    const current={...selection,periodicity,position:periodicity==='monthly'?5:2},slides=remainingFixture(current);
    const municipal=slides.sources.find(source=>source.city==='Marechal Deodoro'&&source.metric==='stock'&&source.group==='Padrão')!;municipal.rows.at(-1)!.stock=Number(municipal.rows.at(-1)!.stock)-34;
    const house=slides.horizontal![0].rows[0];delete house.building_subtype;house.standard='Standard';
    const intro={...introFixture(current),slides,caged:{report:cagedFixture(slides.end,'2017-01',true),issue:null}};
    const diagnostic=buildMaceioDiagnostic(current,{phase:'done',startedAt:0,report:null,blueprint:null,intro});
    expect(diagnostic.slides.filter(slide=>slide.status==='source-pending').map(slide=>[slide.number,slide.issue])).toEqual([]);
    const audit=diagnostic.stockReconciliation.vertical.find(city=>city.city==='Marechal Deodoro')!;expect(audit.comparison).toBe('mismatch');expect(audit.selectedSource).toBe('detailed');
    expect(diagnostic.criteria.stockAuthority).toContain('API');
  });
  it('reproduz RM396 no fechamento por grupos e ano, mantendo o agregado192 bruto',()=>{
    const data=remainingFixture(selection),counts:Record<string,number>={'Maceió':4160,'Marechal Deodoro':226,'Barra de São Miguel':163,'Paripueira':7,'Pilar':0,'Rio Largo':0,'Coqueiro Seco':0};
    for(const source of data.sources){
      if(source.metric==='details')source.rows.forEach((building,index)=>{const row=(building.typologies_history as MarketRow[]).at(-1)!;row.typology_stock=index===0?counts[source.city]:0;row.qty=Number(row.typology_stock)*2;});
      if(source.metric==='stock'){const rows=source.rows.filter(row=>String(row.period).startsWith(data.end));rows.forEach((row,index)=>{row.stock=index===0?(source.city==='Marechal Deodoro'?192:counts[source.city]):0;});}
    }
    const before=JSON.stringify(data);
    for(const group of ['Padrão','Tipologia'] as const){const read=readCells(selection,data,'stock',group,false,'unconfirmed');expect(read.issue).toBeNull();expect(read.cells.filter(row=>row.city!=='Maceió'&&row.month===data.end).reduce((sum,row)=>sum+row.value,0)).toBe(396);}
    expect(buildMaceioMarketSlide(40,selection,data).series.rm.at(-1)).toBe(396);
    expect(buildRemainingSlide(62,selection,data).tables[0].rows.at(-1)!.values[2]).toBe(396);
    expect(auditMaceioStock(data.sources,['Marechal Deodoro'],data.end)[0]).toMatchObject({municipal:{value:192},granularEligible:{value:226},delta:34});
    expect(JSON.stringify(data)).toBe(before);
  });
  for(const periodicity of ['monthly','quarterly'] as const)it(`usa detalhamento de Marechal com aviso e auditoria bruta ${periodicity}`,()=>{
    const current={...selection,periodicity,position:periodicity==='monthly'?5:2},data=remainingFixture(current);
    const municipal=data.sources.find(source=>source.city==='Marechal Deodoro'&&source.metric==='stock'&&source.group==='Padrão')!;
    const row=municipal.rows.at(-1)!;row.stock=Number(row.stock)-34;
    const raw=JSON.stringify(data);
    for(const page of periodicity==='monthly'?[56,57,58,59,60]:[55,56,57,58,59]){
      const model=buildOfferPriceSlide(page,current,data,'stock-weighted');expect(model.issue).toBeNull();expect(model.warnings.join(' ')).toContain('diferença 34');
    }
    for(const page of periodicity==='monthly'?[62,63,64,67,68,69]:[61,63,65,68,69,70]){
      const model=buildRemainingSlide(page,current,data,'stock-weighted');expect(model.issue).toBeNull();expect(model.warnings.join(' ')).toContain('diferença 34');
    }
    const audit=auditMaceioStock(data.sources,['Marechal Deodoro'],data.end)[0];expect(audit.delta).toBe(34);expect(audit.comparison).toBe('mismatch');expect(JSON.stringify(data)).toBe(raw);
    // Other municipalities, incomplete sources and duplicate snapshots remain blocked.
    const other=data.sources.find(source=>source.city==='Maceió'&&source.metric==='stock'&&source.group==='Padrão')!;other.rows.at(-1)!.stock=1;
    expect(buildRemainingSlide(periodicity==='monthly'?62:61,current,data).issue).toMatch(/diverge/);
  });
  it('padrão reconhecido identifica casas, sem alterar produtos explícitos, escopo ou brutos',()=>{
    const base={state:'AL',city:'Maceió',building_type:'Horizontal',release_date:'2020-01-01',standard:'Econômico',typologies_history:[{period:'2026-05-01',number_bedroom:0}]};
    for(const standard of ['Compacto','Econômico','Standard','Médio','Médio-Alto','Alto','Luxo','Super Luxo'])expect(maceioHorizontalProduct({...base,standard},'2026-05')).toBe('Condomínio de Casas');
    expect(maceioHorizontalProduct({...base,building_subtype:'Loteamento Aberto'},'2026-05')).toBe('Loteamento Aberto');
    expect(maceioHorizontalProduct({...base,work:'Condomínio de Chácaras'},'2026-05')).toBe('Condomínio de Chácaras');
    for(const override of [{standard:'Desconhecido'},{state:'SP'},{building_type:'Vertical'},{release_date:'2027-01-01'}])expect(maceioHorizontalProduct({...base,...override},'2026-05')).toBe('');
    const data=remainingFixture(selection),building=data.horizontal![0].rows[0];delete building.building_subtype;building.standard='Standard';const raw=JSON.stringify(data);
    const review=buildMaceioClosedReview(selection,data);expect(review.automaticProjects.some(project=>project.reason.includes('padrão'))).toBe(true);expect(JSON.stringify(data)).toBe(raw);
  });
});
