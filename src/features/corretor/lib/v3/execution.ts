import { reviewProfile, ACTIVE_REVIEW_PROFILE, type ReviewProfile, type ReviewTask } from '../../../../../supabase/functions/_shared/reviewer';
import { supabase } from '@/integrations/supabase/client';
let active: { id: string; owner: string; profile: ReviewProfile | null } | null = null;
let starting = false;
export const hasActiveExecution = () => Boolean(active);
export const activeReviewProfileId = () => active?.profile?.id;
export function executionReviewIr(ir: import('../audit/ir').Ir): import('../audit/ir').Ir {
  return irForReviewProfile(ir,active?.profile?.id);
}
export function irForReviewProfile(ir: import('../audit/ir').Ir, profileId?:string): import('../audit/ir').Ir {
  return profileId==='review-legacy-continuous-v1' ? {...ir,slides:ir.slides.map(s=>s.legacy_review?{...s,...s.legacy_review}:s)} : ir;
}
function owner(): string {
  const key = 'corretor-execution-owner';
  let value = localStorage.getItem(key);
  if (!value) { value = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2,'0')).join(''); localStorage.setItem(key,value); }
  return value;
}
async function responseError(data: unknown, error: unknown, fallback: string): Promise<Error> {
  let body = data as {error?: unknown} | null;
  if (!body?.error && error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
    try { body = await error.context.clone().json(); } catch { /* Preserve the operational fallback for non-JSON responses. */ }
  }
  return new Error(typeof body?.error === 'string' ? body.error : fallback);
}
export async function beginExecution(value: { studyId: string; version: number; documentSha1: string; budgetUsd: number; context: unknown }): Promise<void> {
  if (active || starting) throw new Error('Já existe uma avaliação em andamento nesta aba.');
  starting = true;
  try {
  const secret = owner();
  let previous: {id?:string;version?:number;state?:string} | null = null;
  try { previous=JSON.parse(localStorage.getItem(`corretor-execution:${value.studyId}`) ?? 'null'); } catch { /* invalid local marker is not a resume */ }
  const context={...(value.context as Record<string,unknown>),reviewProfileId:ACTIVE_REVIEW_PROFILE};

  const {data,error} = await supabase.functions.invoke('corretor-execution',{body:{action:'start',owner:secret,...value,context,resumeExecutionId:previous?.version===value.version && previous?.state!=='completed'?previous?.id:undefined}});
  if(error||data?.error||typeof data?.id!=='string'||!data.id)throw await responseError(data,error,'Não foi possível confirmar o início no servidor. Confira a publicação do controle de revisão.');
  // Keep a confirmed remote ID even when the returned profile is incompatible.
  // The caller can close this attempt without ever sending a paid batch.
  if (data.state !== 'completed') active = {id:data.id,owner:secret,profile:null};
  localStorage.setItem(`corretor-execution:${value.studyId}`,JSON.stringify({id:data.id,state:data.state ?? 'prepared',version:value.version}));
  if (data.state === 'completed') throw new Error('Este lote já foi concluído. Abra o resultado existente.');
  if(!data.reviewProfileId)throw new Error('O controle de revisão está desatualizado. Publique a função corretor-execution antes de avaliar.');
  active = {id:data.id,owner:secret,profile:reviewProfile(data.reviewProfileId)};
  } finally { starting = false; }
}
export async function finishExecution(state: 'completed'|'interrupted'|'failed'): Promise<void> {
  const run = active; active = null;
  if(!run)return;
  const {data,error}=await supabase.functions.invoke('corretor-execution',{body:{action:'finish',executionId:run.id,owner:run.owner,state}});
  if(!error && !data?.error) { for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith('corretor-execution:'))continue;try{const item=JSON.parse(localStorage.getItem(key)??'null');if(item?.id===run.id)localStorage.setItem(key,JSON.stringify({...item,state}));}catch{/* unrelated invalid marker */}} }
  if(error||data?.error)throw new Error('O encerramento da execução não foi confirmado. Confira o estado antes de retomar.');
}
/** Fora de execução confirmada, falha antes de chamar o servidor pago. */
export async function invokeAnalysis<T>(functionName: string, payload: unknown): Promise<{ data: T | null; error: Error | null }> {
  if(!active?.profile)return {data:null,error:new Error('Confirme os materiais e o perfil da revisão antes de iniciar a avaliação.')};
  const {data,error}=await supabase.functions.invoke('corretor-execution',{body:{action:'batch',executionId:active.id,owner:active.owner,functionName,payload:{...(payload as Record<string,unknown>),model:active.profile.models[functionName as ReviewTask]}}});
  if(error||data?.error)return {data:null,error:await responseError(data,error,'Não foi possível confirmar o retorno deste lote. Retome pela preparação.')};
  // A resposta é reapresentada para reconstruir os achados; não volta a somar custo.
  return {data: data?.replayed ? {...data,inputTokens:0,outputTokens:0,costUsd:0} : data,error:null};
}

export function executionReviewModel(task: ReviewTask, fallback: import('../cost-calculator').ModelId) { return active?.profile?.models[task] ?? fallback; }
