// Contrato puro compartilhado entre navegador, controlador e folhas de extração.
export type ReviewTask = 'analyze-text-batch' | 'analyze-ata-image' | 'analyze-table-image';
export type ReviewModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-6-luna';
export const LUNA_REVIEW_PROFILE = 'luna-high-review-2026-10-21';
export const ACTIVE_REVIEW_PROFILE: string = LUNA_REVIEW_PROFILE;
export const REVIEW_RULES_VERSION = 'review-guajajaras-2026-10-21';
export const REVIEW_EXTRACTION_VERSION = 'review-evidence-v1';
export interface ReviewProfile {
  id: string; configVersion: string; reasoningEffort: 'high' | null;
  models: Record<ReviewTask, ReviewModel>; maxOutput: Record<ReviewTask, number>;
  promptVersion: string; rulesVersion: string; extractionVersion: string;
  priceVersion: string; prices: Record<ReviewModel, {input: number; cached: number; output: number}>;
  serviceTier: 'default'; inputMax: number; namespace: string;
}
const prices = {'gpt-4o-mini':{input:0.15,cached:0.075,output:0.6},'gpt-4o':{input:2.5,cached:1.25,output:10},'gpt-6-luna':{input:0.1,cached:0.01,output:0.5}};
const legacy: ReviewProfile = {
  id:'review-legacy-continuous-v1',configVersion:'continuous-v1',reasoningEffort:null,
  models:{'analyze-text-batch':'gpt-4o','analyze-ata-image':'gpt-4o-mini','analyze-table-image':'gpt-4o-mini'},
  maxOutput:{'analyze-text-batch':1500,'analyze-ata-image':2000,'analyze-table-image':4000},
  promptVersion:'review-legacy',rulesVersion:'legacy',extractionVersion:'legacy',priceVersion:'legacy',prices,
  serviceTier:'default',inputMax:128000,namespace:'continuous-v1',
};
const luna: ReviewProfile = {
  ...legacy,id:LUNA_REVIEW_PROFILE,configVersion:'review-profiles-v1',reasoningEffort:'high',
  models:{'analyze-text-batch':'gpt-6-luna','analyze-ata-image':'gpt-6-luna','analyze-table-image':'gpt-6-luna'},
  maxOutput:{'analyze-text-batch':16384,'analyze-ata-image':16384,'analyze-table-image':32768},
  promptVersion:'review-2026-10-21',rulesVersion:REVIEW_RULES_VERSION,extractionVersion:REVIEW_EXTRACTION_VERSION,
  priceVersion:'openai-standard-2026-10-21',namespace:'review-profiles-v1',inputMax:1017232,
};
export function reviewProfile(id = ACTIVE_REVIEW_PROFILE): ReviewProfile {
  if(id!==luna.id && id!==legacy.id)throw new Error('Perfil de revisão indisponível.');
  return structuredClone(id===luna.id?luna:legacy);
}
export function stableReview(value: unknown): string {
  return JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
}
export function executionReviewProfile(context: Record<string,unknown>): ReviewProfile {
  if(!context.reviewProfile)return reviewProfile(legacy.id);
  const snapshot=context.reviewProfile as ReviewProfile;
  const known=reviewProfile(snapshot.id);
  if(stableReview(snapshot)!==stableReview(known))throw new Error('Configuração da revisão divergente.');
  return known;
}
export function reviewCacheKey(sha1: string, task: 'ata'|'vision', model: ReviewModel): string {
  if(model!=='gpt-6-luna')return task==='ata'?`ata:${sha1}`:sha1;
  return `review:${luna.id}:${luna.configVersion}:${luna.promptVersion}:${luna.reasoningEffort}:${luna.extractionVersion}:${task}:${sha1}`;
}
export function reviewCost(input: number, output: number, cached: number, model: ReviewModel, profile: ReviewProfile): number {
  if(![input,output,cached].every(Number.isSafeInteger)||input<0||output<0||cached<0||cached>input)throw new Error('Uso de revisão inválido.');
  const rates=profile.prices[model];
  const long=model==='gpt-6-luna'&&input>272000;
  return ((input-cached)*rates.input*(long?2:1)+cached*rates.cached*(long?2:1)+output*rates.output*(long?1.5:1))/1e6;
}
export function reviewParameters(model: ReviewModel, task: ReviewTask) {
  return model==='gpt-6-luna'
    ? {max_completion_tokens:luna.maxOutput[task],reasoning_effort:'high',service_tier:'default',store:false}
    : {max_tokens:legacy.maxOutput[task]};
}
export function validateReviewContent(task: ReviewTask, value: unknown): boolean {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const v=value as Record<string,unknown>;
  const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
  if(task==='analyze-text-batch')return Array.isArray(v.findings)&&v.findings.every(x=>record(x)&&Number.isInteger(x.slide)&&typeof x.type==='string'&&typeof x.description==='string'&&(!('evidence'in x)||typeof x.evidence==='string'));
  if(task==='analyze-ata-image') { const ata=v.ata; return ata===null||record(ata)&&['observacoes_localizacao','cidades_candidatas','comentarios_sobrepostos','duvidas_cliente','pedidos_analista'].every(k=>Array.isArray(ata[k])&&(ata[k] as unknown[]).every(x=>typeof x==='string')); }
  return Array.isArray(v.tables)&&v.tables.every(t=>record(t)&&Array.isArray(t.columns)&&t.columns.every(x=>typeof x==='string')&&Array.isArray(t.rows)&&t.rows.every(r=>Array.isArray(r)&&r.every(c=>c===null||typeof c==='string'||typeof c==='number'&&Number.isFinite(c)))&&(!('totals'in t)||t.totals===null||Array.isArray(t.totals)))&&['locais_visiveis','unidades','anomalias_formato'].every(k=>Array.isArray(v[k]))&&typeof v.tem_fonte==='boolean';
}
