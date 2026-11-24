import {useEffect,useRef} from 'react';
import {ReportGenerationPanel,type ReportGenerationStep} from './ReportGenerationPanel';

/** Use the actual SP generation panel from preflight through the final source. */
export function ReportLoading({label='Carregamento do relatório',reveal=true,title,description,startedAt,steps,onCancel,cancelLabel='Cancelar consulta',progress}:{label?:string;reveal?:boolean;title:string;description?:string;startedAt?:number|null;steps?:readonly ReportGenerationStep[];onCancel?:()=>void;cancelLabel?:string;progress?:{completed:number;total:number;unit:string}}){
 const panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(reveal&&typeof panel.current?.scrollIntoView==='function')panel.current.scrollIntoView({block:'start'});},[reveal]);
 const current=steps??[{id:'current',title,status:'running' as const,message:description,work:progress}];
 return <div ref={panel}><ReportGenerationPanel label={label} title="Gerando seu relatório" steps={current} running startedAt={startedAt} description={description} onCancel={onCancel} cancelLabel={cancelLabel}/></div>;
}
