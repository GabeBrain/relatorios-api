import { useCallback,useEffect,useRef,useState } from 'react';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { cancelSpGeneration,createSpGeneration,runSpGeneration,type SpGenerationSession,type SpGenerationState } from './generation';
import { spReadFailure } from './read-errors';

export function useSpGeneration(quarter:Quarter,scopeKey:string,token:string|null) {
  const [snapshot,setSnapshot]=useState<{key:string;token:string|null;state:SpGenerationState}|null>(null);
  const session=useRef<SpGenerationSession|null>(null),controller=useRef<AbortController|null>(null),version=useRef(0);
  const activeKey=useRef(scopeKey);activeKey.current=scopeKey;
  const activeToken=useRef(token);activeToken.current=token;
  const clear=useCallback(()=>{version.current++;controller.current?.abort();controller.current=null;session.current=null;setSnapshot(null);},[]);
  useEffect(()=>{clear();return clear;},[scopeKey,token,clear]);
  const start=useCallback(async(retry=false)=>{
    if(controller.current)return;
    const run=++version.current,signalController=new AbortController(),key=scopeKey;controller.current=signalController;
    const seed=retry&&session.current?session.current:createSpGeneration(quarter);
    try{
      await runSpGeneration(seed,{signal:signalController.signal,retry,onUpdate:next=>{if(run===version.current&&activeKey.current===key&&activeToken.current===token){session.current=next;setSnapshot({key,token,state:next.state});}}});
    }catch(error){
      if(run===version.current&&session.current){
        if(signalController.signal.aborted)session.current=cancelSpGeneration(session.current);
        else session.current={...session.current,state:{...session.current.state,phase:'failed',finishedAt:Date.now(),steps:session.current.state.steps.map(step=>step.status==='running'?{...step,status:'failed',message:spReadFailure(error,'Não foi possível concluir esta etapa. Tente novamente.'),finishedAt:Date.now()}:step)}};
        setSnapshot({key,token,state:session.current.state});
      }
    }finally{if(run===version.current)controller.current=null;}
  },[quarter,scopeKey,token]);
  const cancel=useCallback(()=>{
    version.current++;controller.current?.abort();controller.current=null;
    if(session.current){session.current=cancelSpGeneration(session.current);setSnapshot({key:activeKey.current,token:activeToken.current,state:session.current.state});}
  },[]);
  return {state:snapshot?.key===scopeKey&&snapshot.token===token?snapshot.state:null,generate:()=>start(false),retry:()=>start(true),cancel,clear};
}
