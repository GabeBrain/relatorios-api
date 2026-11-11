import { createRoot } from 'react-dom/client';
import { SpSlideContent } from '../../src/features/relatorios-institucionais/sp/SpReportPages';
import { syntheticWindow } from '../../src/features/relatorios-institucionais/sp/__tests__/synthetic-window';
import { syntheticVglInput, syntheticLaunchSeries, syntheticSalesSeries, syntheticStockSeries } from '../../src/features/relatorios-institucionais/sp/__tests__/launch-series';
import { syntheticGranularBuildings } from '../../src/features/relatorios-institucionais/sp/__tests__/granular-buildings';
import { buildSpTemporalPreview } from '../../src/features/relatorios-institucionais/sp/temporal';
import { buildSpStockSeries } from '../../src/features/relatorios-institucionais/sp/stock-series';
import { buildSpLaunchSeries, buildSpSalesSeries } from '../../src/features/relatorios-institucionais/sp/launch-series';
import { buildSpVglSeries, buildSpVgvSeries } from '../../src/features/relatorios-institucionais/sp/vgl-series';
import { buildSpGranularDetails } from '../../src/features/relatorios-institucionais/sp/granular-details';
import { buildSpSalesNeighborhoods } from '../../src/features/relatorios-institucionais/sp/sales-neighborhoods';
import { buildSpProjects } from '../../src/features/relatorios-institucionais/sp/projects';
import { buildSpEditablePptx } from '../../src/features/relatorios-institucionais/sp/pptx-export';
import '../../src/index.css';

// Local diagnostic only. Replays and invented histories are not a market baseline.
const input=syntheticVglInput(syntheticWindow('09'));
const report=buildSpTemporalPreview(input,'3T2026');
const buildings=syntheticGranularBuildings(input);
report.stockSeries=buildSpStockSeries(syntheticStockSeries(input),report);
report.launchSeries=buildSpLaunchSeries(syntheticLaunchSeries(input),report);
report.salesSeries=buildSpSalesSeries(syntheticSalesSeries(input),report);
report.vglSeries=buildSpVglSeries(syntheticLaunchSeries(input),report);
report.vgvSeries=buildSpVgvSeries(syntheticSalesSeries(input),report);
report.granularDetails=buildSpGranularDetails(buildings,report);
report.projects=buildSpProjects(buildings,report);
// Exercise the signed denominator on its own reconciled synthetic city.
const first=report.monthly![0].month;
const amounts=[1377,1135,1032,993,962,888,842,775,768,741,...Array.from({length:41},()=>700),449,-4];
const neighborhoodReport={...report,metrics:{...report.metrics,sales:38658},monthly:report.monthly!.map(row=>({...row,sales:row.month===first?38658:0}))};
report.salesNeighborhoods=buildSpSalesNeighborhoods(amounts.map((units,index)=>({...buildings[0],building_id:90000+index,neighborhood:`Bairro ${index}`,typologies_history:report.monthly!.map(row=>({typology_id:1,period:`${row.month}-01`,sold_in_period:row.month===first?units:0}))})),neighborhoodReport);
const page=Number(new URLSearchParams(location.search).get('page')??6);
const exporting=new URLSearchParams(location.search).has('deck');
const scale=Math.min(1,innerWidth/1280);
createRoot(document.getElementById('root')!).render(<>
  <main style={{width:1280*scale,height:720*scale,position:'relative',overflow:'hidden'}}><div data-review-preview style={{width:1280,height:720,transform:`scale(${scale})`,transformOrigin:'top left'}}><SpSlideContent report={report} page={page}/></div></main>
  {exporting&&<div aria-hidden="true" data-review-deck style={{position:'absolute',left:-20000,top:0,width:1280}}>{Array.from({length:85},(_,index)=><div key={index} style={{width:1280,height:720}}><SpSlideContent report={report} page={index+1}/></div>)}</div>}
</>);
(window as unknown as {exportReview:()=>Promise<void>}).exportReview=async()=>{
  await document.fonts.ready;
  const slides=[...document.querySelectorAll<HTMLElement>('[data-review-deck] > div > article')];
  await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));
  const blob=await buildSpEditablePptx(slides,'3T2026',new AbortController().signal,number=>{document.documentElement.dataset.exportProgress=String(number);},{source:'synthetic-corrections-diagnostic',analystApproval:false});
  const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='sp-corrections-synthetic.pptx';link.click();
};
