import {useEffect,useRef,type ComponentProps} from 'react';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';

/** SP Institutional loading identity, contained in the report page for every model. */
export function ReportLoading({label='Carregamento do relatório',reveal=true,...props}:Omit<ComponentProps<typeof BrainLoadingState>,'variant'|'className'>&{label?:string;reveal?:boolean}){
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{if(reveal&&typeof panel.current?.scrollIntoView==='function')panel.current.scrollIntoView({block:'start'});},[reveal]);
 return <section ref={panel} aria-label={label} aria-busy="true" className="relative overflow-hidden rounded-xl border bg-card"><BrainLoadingState {...props} variant="overlay" className="relative z-10 min-h-[26rem] py-8"/></section>;
}
