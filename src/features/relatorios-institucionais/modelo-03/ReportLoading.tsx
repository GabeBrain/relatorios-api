import {useLayoutEffect,useRef,useState,type ComponentProps} from 'react';
import {createPortal} from 'react-dom';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';

/** Follow the report viewport, including sidebar resize, without covering navigation. */
export function ReportLoading(props:Omit<ComponentProps<typeof BrainLoadingState>,'variant'|'className'>){
 const anchor=useRef<HTMLSpanElement>(null),[bounds,setBounds]=useState<{left:number;top:number;width:number;height:number}|null>(null);
 useLayoutEffect(()=>{
  const main=anchor.current?.closest('main');if(!main)return;
  const measure=()=>{const r=main.getBoundingClientRect(),left=Math.max(0,r.left),top=Math.max(0,r.top);setBounds({left,top,width:Math.max(0,Math.min(innerWidth,r.right)-left),height:Math.max(0,Math.min(innerHeight,r.bottom)-top)});};
  measure();const observer=new ResizeObserver(measure);observer.observe(main);window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
  return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};
 },[]);
 return <><span ref={anchor} hidden/>{bounds&&createPortal(<div data-modelo03-loading-viewport className="fixed z-40 overflow-y-auto" style={bounds}><BrainLoadingState {...props} variant="overlay" className="absolute min-h-[38rem] z-10 py-6"/></div>,document.body)}</>;
}
