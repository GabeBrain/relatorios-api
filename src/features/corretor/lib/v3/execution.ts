import { supabase } from '@/integrations/supabase/client';
let active: { id: string; owner: string } | null = null;
let starting = false;
export const hasActiveExecution = () => Boolean(active);
function owner(): string {
  const key = 'corretor-execution-owner';
  let value = localStorage.getItem(key);
  if (!value) { value = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2,'0')).join(''); localStorage.setItem(key,value); }
  return value;
}
export async function beginExecution(value: { studyId: string; version: number; documentSha1: string; budgetUsd: number; context: unknown }): Promise<void> {
  if (active || starting) throw new Error('Já existe uma avaliação em andamento nesta aba.');
  starting = true;
  try {
  const secret = owner();
  const {data,error} = await supabase.functions.invoke('corretor-execution',{body:{action:'start',owner:secret,...value}});
  if(error||data?.error||!data?.id)throw new Error(data?.error ?? 'Não foi possível confirmar o orçamento no servidor. Confira a publicação do controle de execução.');
  if (data.state === 'completed') throw new Error('Este lote já foi concluído. Abra o resultado existente.');
  active = {id:data.id,owner:secret};
  localStorage.setItem(`corretor-execution:${value.studyId}`,JSON.stringify({id:data.id,state:'running',version:value.version}));
  } finally { starting = false; }
}
export async function finishExecution(state: 'completed'|'interrupted'|'failed'): Promise<void> {
  const run = active; active = null;
  if(!run)return;
  const {data,error}=await supabase.functions.invoke('corretor-execution',{body:{action:'finish',executionId:run.id,owner:run.owner,state}});
  if(error||data?.error)throw new Error('O encerramento da execução não foi confirmado. Confira o estado antes de retomar.');
}
/** Fora de execução confirmada, falha antes de chamar o servidor pago. */
export async function invokeAnalysis<T>(functionName: string, payload: unknown): Promise<{ data: T | null; error: Error | null }> {
  if(!active)return {data:null,error:new Error('Confirme os materiais e o orçamento antes de iniciar a avaliação.')};
  const {data,error}=await supabase.functions.invoke('corretor-execution',{body:{action:'batch',executionId:active.id,owner:active.owner,functionName,payload}});
  if(error||data?.error)return {data:null,error:new Error(data?.error ?? 'Não foi possível confirmar o retorno deste lote. Retome pela preparação.')};
  // A resposta é reapresentada para reconstruir os achados; não volta a somar custo.
  return {data: data?.replayed ? {...data,inputTokens:0,outputTokens:0} : data,error:null};
}
