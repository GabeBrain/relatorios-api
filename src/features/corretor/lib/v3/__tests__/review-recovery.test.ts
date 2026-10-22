import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reviewRecoveryState } from '../../../../../../supabase/functions/_shared/reviewer';
import { beginExecution, finishExecution, invokeAnalysis, loadReviewRecovery } from '../execution';
import { reviewProfile } from '../../../../../../supabase/functions/_shared/reviewer';
const mocks=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
const study={id:'study',lastVersion:1,lastSha1:'a'.repeat(40)};
beforeEach(()=>{localStorage.clear();mocks.invoke.mockReset();});
describe('retomada sem repetir retorno desconhecido',()=>{
 it.each(['prepared','interrupted','failed'])('%s: bloqueia lote pendente ou reserva e libera apenas ausência de ambos',state=>{
  expect(reviewRecoveryState(state,37,1,true).canResume).toBe(false);
  expect(reviewRecoveryState(state,37,1,false).canResume).toBe(false);
  expect(reviewRecoveryState(state,37,0,true).canResume).toBe(false);
  expect(reviewRecoveryState(state,37,0,false)).toMatchObject({canResume:true,completedBatches:37});
  expect(reviewRecoveryState(state,37,1,true,1)).toMatchObject({canResume:true,unknownBatches:1,runningBatches:0});
  expect(reviewRecoveryState(state,37,2,true,1)).toMatchObject({canResume:false,runningBatches:1});
 });
 it('concluída não é retomada e estudo novo pode ser preparado',()=>{
  expect(reviewRecoveryState('completed',37,0,false).canResume).toBe(false);
  expect(reviewRecoveryState('running',37,0,false).canResume).toBe(false);
  expect(reviewRecoveryState('invalid',37,0,false).canResume).toBe(false);
  expect(reviewRecoveryState('not_started',0,0,false).canResume).toBe(true);
 });
 it('consulta só o controlador, recupera o ponteiro e não inicia processamento',async()=>{
  mocks.invoke.mockResolvedValue({data:{id:'previous-run',...reviewRecoveryState('interrupted',37,1,true,1)},error:null});
  const result=await loadReviewRecovery(study);
  expect(result.canResume).toBe(true);expect(mocks.invoke).toHaveBeenCalledOnce();
  expect(mocks.invoke.mock.calls[0]).toEqual(['corretor-execution',{body:expect.objectContaining({action:'review_status',studyId:study.id,version:1,documentSha1:study.lastSha1})}]);
  expect(JSON.parse(localStorage.getItem('corretor-execution:study')!)).toMatchObject({id:'previous-run',version:1});
 });
 it('falha ou controlador antigo não libera retomada',async()=>{
  mocks.invoke.mockResolvedValueOnce({data:{error:'Execução não autorizada.'},error:null});
  await expect(loadReviewRecovery(study)).rejects.toThrow('Execução não autorizada.');
  mocks.invoke.mockResolvedValueOnce({data:{state:'interrupted'},error:null});
  await expect(loadReviewRecovery(study)).rejects.toThrow('Não foi possível conferir');
  expect(localStorage.getItem('corretor-execution:study')).toBeNull();
 });
 it('resposta reapresentada não soma custo ou tokens e usa o mesmo id no start',async()=>{
  localStorage.setItem('corretor-execution:study',JSON.stringify({id:'previous-run',version:1,state:'interrupted'}));
  mocks.invoke.mockResolvedValueOnce({data:{id:'previous-run',state:'prepared',reviewProfileId:reviewProfile().id},error:null})
    .mockResolvedValueOnce({data:{replayed:true,findings:[],inputTokens:10,outputTokens:20,costUsd:0.3},error:null})
    .mockResolvedValueOnce({data:{ok:true},error:null});
  await beginExecution({studyId:study.id,version:1,documentSha1:study.lastSha1,budgetUsd:1,context:{}});
  try {
   expect(mocks.invoke.mock.calls[0][1].body.resumeExecutionId).toBe('previous-run');
   const result=await invokeAnalysis('analyze-text-batch',{});
   expect(result.data).toMatchObject({replayed:true,inputTokens:0,outputTokens:0,costUsd:0});
  } finally {await finishExecution('interrupted');}
 });
});
