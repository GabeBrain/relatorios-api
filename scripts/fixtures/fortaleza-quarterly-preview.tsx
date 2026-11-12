import { quarterlyPriceFixture } from '../../src/features/relatorios-institucionais/fortaleza/__tests__/quarterly-price-fixture';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import FortalezaIntroSlides from '../../src/features/relatorios-institucionais/fortaleza/FortalezaIntroSlides';
import { monthlyMarketFixture,monthlyMarketSelection } from '../../src/features/relatorios-institucionais/fortaleza/__tests__/monthly-market-fixture';
import { prepareFortalezaBlueprint,FORTALEZA_CITIES } from '../../src/features/relatorios-institucionais/fortaleza/model';
import { monthlyLaunchMonths } from '../../src/features/relatorios-institucionais/fortaleza/monthly-launches';
import { buildIntroProject } from '../../src/features/relatorios-institucionais/fortaleza/intro-data';
const query=new URLSearchParams(location.search),selection={...monthlyMarketSelection,periodicity:'quarterly' as const,position:2};
const market=monthlyMarketFixture(selection),prices=quarterlyPriceFixture(selection);
if(query.has('missing'))market.sources[0].rows.pop();
const intro={status:'ready' as const,issues:[],requests:0,startedAt:'',finishedAt:'',projects:monthlyLaunchMonths(selection).map((month,index)=>buildIntroProject({building_id:index+1,city:'Fortaleza',building_type:'Vertical',standard:index%2?'Econômico':'Standard',release_date:`${month}-01`}))};
void prepareFortalezaBlueprint(selection,[...FORTALEZA_CITIES],{yieldControl:async()=>{}}).then(blueprint=>{
const monthlyLaunches=query.has('empty')?null:{market,prices,sources:[],issues:[]};
const generation={key:'synthetic-quarterly',phase:'done' as const,startedAt:Date.now(),finishedAt:new Date().toISOString(),message:'Fixture sintética offline',report:null,hasFailedCities:false,blueprint,intro,monthlyLaunches,steps:[]};
createRoot(document.getElementById('root')!).render(<main className="bg-background text-foreground p-4"><FortalezaIntroSlides selection={selection} cities={[...FORTALEZA_CITIES]} data={intro} monthlyLaunches={monthlyLaunches} generation={generation}/></main>);
});
