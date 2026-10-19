import { supabase } from '@/integrations/supabase/client';
import { hasActiveExecution } from './v3/execution';
import { recommendationSource } from './v3/consulting-suggestion';
import type { Ir } from './audit/ir';
import { recommendationProfile, LEGACY_RECOMMENDATION_PROFILE, quoteRecommendation } from '../../../../supabase/functions/_shared/recommendation';
export { quoteRecommendation, PROMPT_VERSION, PRICE_VERSION, RECOMMENDATION_MODEL } from '../../../../supabase/functions/_shared/recommendation';
// Schema aditivo; tipos oficiais são gerados depois de aplicar a migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
export interface RecommendationRecord {
 id:string; execution_id:string;study_id:string;version_id:string;version_n:number;document_sha1:string;
 model:string;prompt_version:string;price_version:string;state:'prepared'|'running'|'interrupted'|'failed'|'unknown'|'completed'|'partial';
 profile_id?:string|null;config_version?:string|null;reasoning_effort?:string|null;endpoint?:string|null;service_tier?:string|null;
 reasoning_tokens?:number|null;reasoning_reported_calls?:number;pricing_snapshot?:Record<string,unknown>|null;usage_origin?:string|null;
 estimated_usd:number;budget_usd:number;spent_usd:number;reserved_usd:number;input_tokens:number;cached_tokens:number;output_tokens:number;
 provider_calls:number;total_requests:number;provider_latency_ms?:number;coverage:{readableSlides:number;totalSlides:number;withoutText:number;limitedSlides:number};
 content:string|null;error_message:string|null;created_at:string;updated_at:string;completed_at:string|null;
}
export const RECOMMENDATION_STATES:Record<RecommendationRecord['state'],string>={prepared:'Preparada',running:'Em geração',interrupted:'Interrompida',failed:'Não concluída',unknown:'Retorno a conferir',completed:'Gerada',partial:'Resultado parcial'};
export type RecommendationSummary = Pick<RecommendationRecord, 'study_id' | 'version_n' | 'state'>;
/** Somente metadados dos estudos visíveis; nenhum texto de sugestão na carteira. */
export async function listRecommendationSummaries(ids: string[]): Promise<RecommendationSummary[]> {
 if (!ids.length) return [];
 const {data,error}=await db.from('corretor_recommendations').select('study_id,version_n,state').in('study_id',ids);
 if(error) throw new Error('As sugestões não puderam ser consultadas. A revisão continua disponível.');
 return data??[];
}
export async function listRecommendations(studyId:string):Promise<RecommendationRecord[]> {
 const {data,error}=await db.from('corretor_recommendations').select('*').eq('study_id',studyId).order('created_at',{ascending:false});
 if(error)throw new Error('O histórico de recomendações está indisponível. Confira a atualização do banco.');return data??[];
}
function owner(){const key='corretor-execution-owner';let value=localStorage.getItem(key);if(!value){value=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');localStorage.setItem(key,value);}return value;}
async function call<T>(body:Record<string,unknown>):Promise<T>{
 const {data,error}=await supabase.functions.invoke('corretor-execution',{body:{...body,owner:owner()}});
 if(error||data?.error){
  let message=data?.error;
  if(!message&&error?.context instanceof Response){try{message=(await error.context.clone().json()).error;}catch{/* Mantém mensagem operacional se o gateway não retornou JSON. */}}
  throw new Error(typeof message==='string'?message:'A execução não foi confirmada. Confira o histórico antes de repetir.');
 }return data;
}
let running=false;
export async function runRecommendation(input:{studyId:string;version:number;sha1:string;ir:Ir;budgetUsd:number;resume?:RecommendationRecord;cancelled:()=>boolean;onProgress:(record:RecommendationRecord)=>void}):Promise<void>{
 if(running||hasActiveExecution())throw new Error('Já existe uma geração ou avaliação em andamento nesta aba.');
 if(input.cancelled())return;running=true;
 try{
  const source=recommendationSource(input.ir);
  const profile=recommendationProfile(input.resume?(input.resume.profile_id??LEGACY_RECOMMENDATION_PROFILE.id):undefined);
  if(input.resume&&(input.resume.model!==profile.model||input.resume.prompt_version!==profile.promptVersion||input.resume.price_version!==profile.priceVersion))throw new Error('A configuração desta geração precisa de conferência técnica. O histórico foi preservado.');
  const quote=quoteRecommendation(source.slides,profile);
  const budgetUsd=input.resume?Math.max(Number(input.resume.budget_usd),Math.ceil(quote.maximumUsd*100)/100):input.budgetUsd;
  if(!Number.isFinite(budgetUsd)||budgetUsd<quote.maximumUsd||budgetUsd>100)throw new Error('Este estudo precisa de apoio da equipe para continuar. Seus materiais estão preservados.');
  const start=input.resume?await call<{id:string;state:string;profileId?:string}>({action:'recommendation_resume',executionId:input.resume.execution_id,budgetUsd}):await call<{id:string;state:string;profileId?:string}>({action:'start',studyId:input.studyId,version:input.version,documentSha1:input.sha1,budgetUsd,context:{purpose:'recommendation',profileId:profile.id,configVersion:profile.configVersion,slides:source.slides,limitedSlides:source.limitedSlides,attemptId:crypto.randomUUID()}});
  if(start.profileId!==profile.id)throw new Error('Atualize a página e confira a publicação do sistema antes de gerar. Nenhuma etapa será repetida automaticamente.');
  if(start.state==='completed')return;
  let done=false;
  while(!done&&!input.cancelled()){
   const result=await call<{done:boolean;result?:RecommendationRecord}>({action:'recommendation_step',executionId:start.id});
   if(result.result)input.onProgress(result.result);done=result.done;
  }
  if(!done)await call({action:'finish',executionId:start.id,state:'interrupted'});
 }finally{running=false;}
}
export interface AiUsageGroup {tipo:string;model:string;calls:number;input_tokens:number;cached_tokens:number;output_tokens:number;cost_usd:number;latency_ms:number|null}
export interface AiUsage {since:string;groups:AiUsageGroup[];recommendations:{total:number;completed:number;partial:number;unknown:number;spent_usd:number;reserved_usd:number;estimated_usd:number};daily:{day:string;cost_usd:number}[]}
export async function loadAiUsage():Promise<AiUsage>{const {data,error}=await db.rpc('corretor_ai_usage');if(error||!data)throw new Error('As métricas de IA aguardam a atualização do banco ou estão indisponíveis.');return data;}
