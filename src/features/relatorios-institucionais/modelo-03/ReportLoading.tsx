import {useEffect,useRef,type ComponentProps} from 'react';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';

/** Same in-page loading panel used by the institutional reports. */
export function ReportLoading(props:Omit<ComponentProps<typeof BrainLoadingState>,'variant'|'className'>){
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{panel.current?.scrollIntoView({block:'start'});},[]);
 return <section ref={panel} aria-label="Carregamento do relatório Modelo 03" aria-busy="true" className="relative min-h-[48rem] overflow-hidden rounded-xl border bg-card"><BrainLoadingState {...props} variant="overlay" className="absolute z-10 justify-start overflow-y-auto py-8"/></section>;
}
