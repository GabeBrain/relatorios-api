import { act,renderHook,waitFor } from '@testing-library/react';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import { useSpGeneration } from './useSpGeneration';
import { createSpGeneration,type SpGenerationSession } from './generation';

const pending=vi.hoisted(()=>({runs:[] as {signal:AbortSignal;onUpdate:(session:SpGenerationSession)=>void;resolve:()=>void}[]}));
vi.mock('./generation',async original=>({...(await original<typeof import('./generation')>()),runSpGeneration:vi.fn(async(seed:SpGenerationSession,options:{signal:AbortSignal;onUpdate:(session:SpGenerationSession)=>void})=>{
  options.onUpdate({...seed,state:{...seed.state,phase:'running'}});
  await new Promise<void>(resolve=>pending.runs.push({...options,resolve}));return seed;
})}));
beforeEach(()=>{pending.runs=[];});
describe('Sessão da geração automática',()=>{
  it('bloqueia duplo clique e ignora callbacks tardios depois de cancelar e retomar',async()=>{
    const {result}=renderHook(()=>useSpGeneration('3T2026','SP/capital/3T2026','token'));
    act(()=>{void result.current.generate();void result.current.generate();});
    expect(pending.runs).toHaveLength(1);
    act(()=>result.current.cancel());expect(pending.runs[0].signal.aborted).toBe(true);
    act(()=>{void result.current.retry();});expect(pending.runs).toHaveLength(2);
    const stale=createSpGeneration('3T2026');stale.state.phase='completed';
    act(()=>pending.runs[0].onUpdate(stale));expect(result.current.state?.phase).toBe('running');
    act(()=>pending.runs[0].resolve());
    await act(async()=>{});
    act(()=>{void result.current.generate();});expect(pending.runs).toHaveLength(2);
    act(()=>pending.runs[1].resolve());
  });
  it('aborta e limpa resultados ao trocar token, escopo e desmontar',async()=>{
    const {result,rerender,unmount}=renderHook(({key,token})=>useSpGeneration('3T2026',key,token),{initialProps:{key:'SP/3T2026',token:'one'}});
    act(()=>{void result.current.generate();});rerender({key:'SP/3T2026',token:'two'});
    expect(pending.runs[0].signal.aborted).toBe(true);expect(result.current.state).toBeNull();
    act(()=>pending.runs[0].onUpdate(createSpGeneration('3T2026')));expect(result.current.state).toBeNull();
    act(()=>{void result.current.generate();});rerender({key:'SP/2T2026',token:'two'});
    expect(pending.runs[1].signal.aborted).toBe(true);
    act(()=>{void result.current.generate();});unmount();expect(pending.runs[2].signal.aborted).toBe(true);
    for(const run of pending.runs)run.resolve();await waitFor(()=>expect(pending.runs).toHaveLength(3));
  });
});
