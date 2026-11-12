import { describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { observedMunicipalFixture,observedSelection as selection } from './__tests__/observed-municipal-fixture';
import { quarterlyPriceFixture } from './__tests__/quarterly-price-fixture';
import { FORTALEZA_CITIES,prepareFortalezaBlueprint } from './model';
import { buildIntroProject,type IntroData } from './intro-data';
import { buildFortalezaDiagnostic } from './diagnostic';
import { buildMonthlySlide,monthlyMarketSourceIssue } from './monthly-market';
import { monthlyUnitLaunches } from './monthly-launches';
import { introTablePlan } from './intro-layout';
import { fetchMonthlyMarket } from './monthly-market-api';
import type { FortalezaRequest } from './api';
import { createFortalezaEditorial } from './monthly-closing';
import FortalezaReportSlide from './FortalezaReportSlide';
const cities=[...FORTALEZA_CITIES];
function introFixture():IntroData{
  // Names/companies/projects are invented. Only the32/54list sizes come from
  // the real diagnostic; no original project identity is reconstructed.
  return {status:'ready',requests:0,issues:[],startedAt:'',finishedAt:'',projects:Array.from({length:86},(_,index)=>buildIntroProject({building_id:index+1,name:`Projeto sintético ${String(index+1).padStart(2,'0')}`,city:index<32?'Fortaleza':cities[1+(index%4)],state:'CE',building_type:index%3===0?'Horizontal':'Vertical',standard:index%3===0?'Econômico':'Standard',neighborhood:'Bairro sintético',builder_name:'Empresa sintética',release_date:'2026-08-01'}))};
}
describe('Fortaleza — disponibilidade com a matriz municipal real de agosto',()=>{
  it('aceita os40conjuntos completos, sem completar grupos com linhas artificiais',()=>{
    const data=observedMunicipalFixture(),before=JSON.stringify(data.sources);
    expect(data.sources).toHaveLength(40);for(const source of data.sources)expect(monthlyMarketSourceIssue(source,data.months)).toBeNull();
    for(const page of [12,14,16,17,19,20,22,23,24,25,26,27,28,30,31,33,34,35])expect(buildMonthlySlide(page,data,selection,cities).status).toBe('ready');
    const launches={sources:data.sources.filter(source=>source.segment==='Vertical'&&source.metric==='releases').map(source=>({...source})),issues:[]};
    expect(monthlyUnitLaunches(launches,selection,cities,'rm').status).toBe('ready');expect(JSON.stringify(data.sources)).toBe(before);
  });
  it('refaz a paginação estável das células observadas e aceita vazio comercial confirmado',async()=>{
    const fixture=observedMunicipalFixture(),request=vi.fn<FortalezaRequest>(async options=>{
      const source=fixture.sources.find(source=>source.city===options.query.city&&source.segment===(options.query['type[]'] as string[])[0]&&source.metric===options.url.split('/').at(-1))!,page=Number(options.query.page),total=source.rows.length,last=Math.max(1,Math.ceil(total/100));
      return {ok:true,status:200,data:{data:source.rows.slice((page-1)*100,page*100),meta:{total,current_page:page,last_page:last},links:{next:page===last?null:'next'}},text:null,contentType:'application/json',latencyMs:1,bytes:1,error:null,requestHeaders:{},requestQuery:{},requestBody:null,url:'',method:'GET'};
    });
    const data=await fetchMonthlyMarket(selection,cities,{token:'synthetic-only',request});
    expect(data.issues).toEqual([]);expect(data.sources.every(source=>source.complete)).toBe(true);
    expect(data.sources.filter(source=>source.emptyResult)).toHaveLength(8);
    expect(data.sources.flatMap(source=>source.rows)).toHaveLength(fixture.sources.flatMap(source=>source.rows).length);
    const missing=structuredClone(data.sources[0]);missing.rows=missing.rows.filter(row=>String(row.period).slice(0,7)!=='2026-08');
    expect(monthlyMarketSourceIssue(missing,data.months)).not.toBeNull();
    const empty=structuredClone(data.sources.find(source=>source.emptyResult)!);delete empty.emptyResult;expect(monthlyMarketSourceIssue(empty,data.months)).not.toBeNull();
  });
  it('acomoda32lançamentos na capital e54na RM sem duplicar nem mudar a ordem dos slides',()=>{
    const plans=[3,4,5,6,7].map(page=>introTablePlan('julho',page,page<5?32:54));
    expect(plans.map(plan=>plan.rows)).toEqual([16,16,18,18,18]);expect(plans.map(plan=>plan.offset)).toEqual([0,16,0,18,36]);
    expect(plans[0].capacity).toBe(32);expect(plans[2].capacity).toBe(54);
  });
  it('os60slides ficam disponíveis/editoriais; histórico detalhado e cadastro do teste são sintéticos',async()=>{
    const market=observedMunicipalFixture(),prices=quarterlyPriceFixture(selection),intro=introFixture(),blueprint=await prepareFortalezaBlueprint(selection,cities,{yieldControl:async()=>{}}),monthlyLaunches={market,prices,sources:market.sources.filter(source=>source.segment==='Vertical'&&source.metric==='releases').map(source=>({...source})),issues:[]};
    const snapshot=buildFortalezaDiagnostic(selection,{phase:'done',startedAt:0,finishedAt:'2026-11-12T00:00:00Z',blueprint,report:null,intro,monthlyLaunches});
    expect(snapshot.slides).toHaveLength(60);expect(snapshot.summary['source-pending']).toBe(0);expect(snapshot.summary['not-implemented']).toBe(0);expect(snapshot.homologated).toBe(false);
    expect(snapshot.slides[1].values).toMatchObject({method:'registry',projects:86,companies:1});
    const projectNames:string[]=[];
    for(let page=1;page<=60;page++){
      const svg=renderToStaticMarkup(<FortalezaReportSlide page={page} selection={selection} cities={cities} data={intro} monthlyLaunches={monthlyLaunches} editorial={createFortalezaEditorial()}/>);
      expect(svg).not.toContain('Aguardando conferência');expect(svg).not.toContain('NaN');expect(svg).toContain(`Fortaleza · slide ${page}`);
      if(page>=3&&page<=7)projectNames.push(...[...svg.matchAll(/Projeto sintético \d+/g)].map(match=>match[0]));
    }
    expect(projectNames).toHaveLength(86);expect(new Set(projectNames).size).toBe(86);
  });
});
