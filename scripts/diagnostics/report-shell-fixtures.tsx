import {createRoot,type Root} from 'react-dom/client';
import MaceioIntroSlides from '../../src/features/relatorios-institucionais/maceio/MaceioIntroSlides';
import FortalezaIntroSlides from '../../src/features/relatorios-institucionais/fortaleza/FortalezaIntroSlides';
import {SpReportPages} from '../../src/features/relatorios-institucionais/sp/SpReportPages';
import {buildSpTemporalPreview} from '../../src/features/relatorios-institucionais/sp/temporal';
import {recordedInput} from '../../src/features/relatorios-institucionais/sp/__tests__/recorded';
import {ReportLoading} from '../../src/features/relatorios-institucionais/shared/ReportLoading';
import {SpGenerationPanel} from '../../src/features/relatorios-institucionais/sp/SpGenerationPanel';
import {SP_GENERATION_STEPS,type SpGenerationState} from '../../src/features/relatorios-institucionais/sp/generation';
let root:Root|undefined;
/** Local offline harness: actual report previews, no authenticated requests. */
export function mount(kind:string,loading=false){
 root?.unmount();const main=document.querySelector('main')!;for(const child of [...main.children])if(child instanceof HTMLElement)child.style.display='none';
 const host=document.createElement('div');host.className='p-4 sm:p-6';main.append(host);root=createRoot(host);
 const selection={uf:kind==='maceio'?'AL':'CE',city:kind==='maceio'?'Maceió':'Fortaleza',territory:'capital-rm' as const,periodicity:'monthly' as const,year:2026,position:5};
 const state={phase:'running',quarter:'3T2026',startedAt:Date.now()-65000,steps:SP_GENERATION_STEPS.map((s,i)=>({...s,status:i===0?'succeeded':i===1?'running':'waiting',work:i===1?{completed:2,total:10,unit:'empreendimentos'}:undefined}))} as SpGenerationState;
 const cancel=()=>{host.dataset.cancelled='true';};
 root.render(loading&&kind==='sp'?<SpGenerationPanel state={state} onCancel={cancel} onRetry={()=>{}}/>:loading?<ReportLoading title={`Consultando fontes · ${kind}`} description="Fixture lenta · aguardando resposta da API" startedAt={Date.now()-65000} onCancel={cancel} steps={[{id:"scope",title:"Validar recorte",status:"done"},{id:"sources",title:"Consultar fontes municipais",status:"running",work:{completed:2,total:10,unit:"fontes"}},{id:"slides",title:"Organizar slides",status:"waiting"}]}/>:kind==='maceio'?<MaceioIntroSlides selection={selection} data={null}/>:kind==='fortaleza'?<FortalezaIntroSlides selection={selection} cities={['Fortaleza','Aquiraz','Caucaia','Eusébio','Maracanaú']} data={null}/>:<SpReportPages report={buildSpTemporalPreview(recordedInput(),'3T2026')}/>);
}
