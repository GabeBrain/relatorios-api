import { createRoot } from 'react-dom/client';
import FortalezaIntroSlides from '../../src/features/relatorios-institucionais/fortaleza/FortalezaIntroSlides';
import { FORTALEZA_CITIES,prepareFortalezaBlueprint } from '../../src/features/relatorios-institucionais/fortaleza/model';
import { monthlyMarketSelection as selection,monthlyMarketFixture } from '../../src/features/relatorios-institucionais/fortaleza/__tests__/monthly-market-fixture';
import { monthlyLaunchFixture } from '../../src/features/relatorios-institucionais/fortaleza/__tests__/monthly-launch-fixture';
import { priceMonths,normalizePriceFrames,type PriceSource } from '../../src/features/relatorios-institucionais/fortaleza/monthly-prices';
import type { IntroData } from '../../src/features/relatorios-institucionais/fortaleza/intro-data';
import type { FortalezaGenerationState } from '../../src/features/relatorios-institucionais/fortaleza/useFortalezaMarket';
import '../../src/index.css';

const cities=[...FORTALEZA_CITIES],monthly=monthlyLaunchFixture(cities),months=priceMonths(selection);
monthly.market=monthlyMarketFixture();
monthly.prices={scopeKey:'synthetic-only',months,sources:cities.flatMap((city,cityIndex)=>(['Vertical','Horizontal'] as const).map(segment=>{
  const products=segment==='Vertical'?['Standard']:['Condomínio de Casas','Loteamento Fechado','Loteamento Aberto'];
  const source:PriceSource={city,segment,complete:true,records:products.map((standard,index)=>({building_id:`${city}-${segment}-${index}`,city,state:'CE',building_type:segment,standard,release_date:'2020-01-01',name:'Empreendimento QA',neighborhood:'Bairro QA',typologies:[{id:index+1,type_of_typology:'Padrão'}],typologies_history:months.map(month=>({typology_id:index+1,period:`${month}-01`,typology_stock:cityIndex+1,qty:100,sold:80,sold_in_period:2,number_bedroom:2,private_area:60,price:300000,price_private_area:1000+cityIndex*100+index*1000}))})),frames:{},issue:null,requests:1,startedAt:'',finishedAt:''};source.frames=normalizePriceFrames(source,months);return source;
})),issues:[]};
const query=new URLSearchParams(location.search);
if(query.has('missing-neighborhood'))monthly.prices.sources[0].records[0].neighborhood='';
if(query.has('missing-snapshot'))(monthly.prices.sources[0].records[0].typologies_history as unknown[]).pop();
const intro:IntroData={status:'ready',projects:cities.map((city,index)=>({id:String(index),name:'Empreendimento sintético QA',date:'2026-07-01',developer:'Incorporadora QA',city,neighborhood:'Bairro QA',type:'Vertical',standard:'Standard',chartEligible:true})),issues:[],requests:1,startedAt:'',finishedAt:''};
const blueprint=await prepareFortalezaBlueprint(selection,cities,{yieldControl:async()=>{}});
const state:FortalezaGenerationState={key:'Bearer SYNTHETIC_PRIVATE',phase:'done',startedAt:Date.now(),finishedAt:new Date().toISOString(),message:'QA offline',hasFailedCities:false,report:null,blueprint,intro,monthlyLaunches:monthly,steps:[]};
createRoot(document.getElementById('root')!).render(<div className="p-4"><FortalezaIntroSlides selection={selection} cities={cities} data={intro} monthlyLaunches={monthly} generation={state}/></div>);
