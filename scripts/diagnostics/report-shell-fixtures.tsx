import {createRoot,type Root} from 'react-dom/client';
import MaceioIntroSlides from '../../src/features/relatorios-institucionais/maceio/MaceioIntroSlides';
import FortalezaIntroSlides from '../../src/features/relatorios-institucionais/fortaleza/FortalezaIntroSlides';
import {SpReportPages} from '../../src/features/relatorios-institucionais/sp/SpReportPages';
import {buildSpTemporalPreview} from '../../src/features/relatorios-institucionais/sp/temporal';
import {recordedInput} from '../../src/features/relatorios-institucionais/sp/__tests__/recorded';
import {ReportLoading} from '../../src/features/relatorios-institucionais/shared/ReportLoading';
let root:Root|undefined;
/** Local offline harness: actual report previews, no authenticated requests. */
export function mount(kind:string,loading=false){
 root?.unmount();const main=document.querySelector('main')!;for(const child of [...main.children])if(child instanceof HTMLElement)child.style.display='none';
 const host=document.createElement('div');host.className='p-4 sm:p-6';main.append(host);root=createRoot(host);
 const selection={uf:kind==='maceio'?'AL':'CE',city:kind==='maceio'?'Maceió':'Fortaleza',territory:'capital-rm' as const,periodicity:'monthly' as const,year:2026,position:5};
 root.render(loading?<ReportLoading title={`Consultando fontes · ${kind}`} description="Fixture lenta · aguardando resposta da API" startedAt={Date.now()-65000}><button className="mt-4 rounded-md border px-4 py-2" onClick={()=>host.dataset.cancelled='true'}>Cancelar consulta</button></ReportLoading>:kind==='maceio'?<MaceioIntroSlides selection={selection} data={null}/>:kind==='fortaleza'?<FortalezaIntroSlides selection={selection} cities={['Fortaleza','Aquiraz','Caucaia','Eusébio','Maracanaú']} data={null}/>:<SpReportPages report={buildSpTemporalPreview(recordedInput(),'3T2026')}/>);
}
