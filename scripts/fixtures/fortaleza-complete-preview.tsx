import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import FortalezaIntroSlides from '../../src/features/relatorios-institucionais/fortaleza/FortalezaIntroSlides';
import { observedMunicipalFixture,observedSelection as selection } from '../../src/features/relatorios-institucionais/fortaleza/__tests__/observed-municipal-fixture';
import { quarterlyPriceFixture } from '../../src/features/relatorios-institucionais/fortaleza/__tests__/quarterly-price-fixture';
import { FORTALEZA_CITIES,prepareFortalezaBlueprint } from '../../src/features/relatorios-institucionais/fortaleza/model';
import { buildIntroProject,type IntroData } from '../../src/features/relatorios-institucionais/fortaleza/intro-data';
const cities=[...FORTALEZA_CITIES],market=observedMunicipalFixture(),prices=quarterlyPriceFixture(selection),query=new URLSearchParams(location.search);
if(query.has('missing-month'))market.sources[0].rows=market.sources[0].rows.filter(row=>String(row.period).slice(0,7)!=='2026-08');
const intro:IntroData={status:'ready',requests:0,issues:[],startedAt:'',finishedAt:'2026-11-12T00:00:00Z',projects:Array.from({length:86},(_,index)=>buildIntroProject({building_id:index+1,name:`Projeto sintético ${String(index+1).padStart(2,'0')} · Residencial Jardim das Flores`,city:index<32?'Fortaleza':cities[1+(index%4)],state:'CE',building_type:index%3===0||index===85?'Horizontal':'Vertical',standard:index===85?'Produto não identificado':index%3===0?'Econômico':'Standard',neighborhood:'Bairro de demonstração',builder_name:`Incorporadora e Construtora Sintética ${index%7+1} Participações`,release_date:'2026-08-01'}))};
const monthlyLaunches={market,prices,sources:market.sources.filter(source=>source.segment==='Vertical'&&source.metric==='releases').map(source=>({...source})),issues:[]};
void prepareFortalezaBlueprint(selection,cities,{yieldControl:async()=>{}}).then(blueprint=>{
  const generation={key:'synthetic-complete-fixture',phase:'done' as const,startedAt:Date.now(),finishedAt:'2026-11-12T00:00:00Z',message:'QA: agregados municipais reais, cadastro e históricos individuais sintéticos',hasFailedCities:false,report:null,blueprint,intro,monthlyLaunches,steps:[]};
  createRoot(document.getElementById('root')!).render(<main className="p-4 bg-background text-foreground"><FortalezaIntroSlides selection={selection} cities={cities} data={intro} monthlyLaunches={monthlyLaunches} generation={generation}/></main>);
});
