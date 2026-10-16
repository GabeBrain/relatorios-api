import { supabase } from '@/integrations/supabase/client';
import { digest, matchOriginal, requireProjectIdentity, type VersionRecord } from './projects';
import type { Fonte } from './v3/fonte';
import { loadFindings, loadStudyFonte } from './v3/db';
// Fronteira aditiva até geração dos tipos após ativação da migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
export type MaterialKind = 'pptx' | 'sheet' | 'preview_pdf' | 'preview_slide';
export interface MaterialAsset { id:string; study_id:string; version_id:string; kind:MaterialKind; slide_n:number|null; sha256:string; sha1:string|null; bytes:number; path:string; original_name:string; created_at:string }
export interface SourceSet { id:string; study_id:string; version_id:string; fingerprint:string; file_ids:string[]; payload:Fonte; created_at:string }
export class MaterialsUnavailable extends Error { constructor(){super('O novo armazenamento de materiais aguarda a atualização do banco no Lovable.');} }
function fail(error: { code?:string; message?:string } | null) { if (!error) return; if (['42P01','42703','PGRST205','42883','PGRST202'].includes(error.code??''))throw new MaterialsUnavailable(); throw new Error('Não foi possível confirmar os materiais no servidor.'); }
export async function listMaterials(studyId:string):Promise<MaterialAsset[]> { const {data,error}=await db.from('corretor_material_assets').select('*').eq('study_id',studyId).order('created_at',{ascending:false});fail(error);return data??[]; }
export async function listSourceSets(studyId:string):Promise<SourceSet[]> { const {data,error}=await db.from('corretor_source_sets').select('*').eq('study_id',studyId).order('created_at',{ascending:false});fail(error);return data??[]; }
export async function uploadMaterial(studyId:string,version:VersionRecord,file:File,kind:MaterialKind,onProgress:(p:number)=>void,slide?:number):Promise<MaterialAsset> {
 await requireProjectIdentity();
 const ext=file.name.split('.').pop()?.toLowerCase();
 if (!file.size || file.size>512*1024*1024 || !(kind==='pptx'?ext==='pptx':kind==='sheet'?['xlsx','xlsm'].includes(ext??''):kind==='preview_pdf'?ext==='pdf':ext==='png'&&Number.isInteger(slide)&&Number(slide)>0))throw new Error('Formato, tamanho ou número de slide inválido.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const hashes=kind==='pptx'?await matchOriginal(bytes,version.sha1):{sha256:await digest(bytes,'SHA-256'),sha1:null};
 const existing=(await listMaterials(studyId)).find(a=>a.version_id===version.id&&a.kind===kind&&a.sha256===hashes.sha256);
 if(existing)return existing;
 const path=`${studyId}/${version.id}/${hashes.sha256}/${kind}${slide?'-'+slide:''}`;
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Entre novamente com Geobrain.');
 const bucket=supabase.storage.from('corretor-materiais');
 const {data:exists,error:lookupError}=await bucket.exists(path);
 const status=lookupError&&('status' in lookupError?Number(lookupError.status):(lookupError as {originalError?:{status?:number}}).originalError?.status);
 if(lookupError&&status!==404)throw new Error('Não foi possível conferir o armazenamento antes do envio.');
 if(!exists){const {Upload}=await import('tus-js-client');await new Promise<void>((resolve,reject)=>{
  const upload=new Upload(file,{endpoint:`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`,headers:{authorization:`Bearer ${session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY},chunkSize:6*1024*1024,retryDelays:[0,1000,3000],metadata:{bucketName:'corretor-materiais',objectName:path,contentType:kind==='preview_pdf'?'application/pdf':kind==='preview_slide'?'image/png':file.type||'application/octet-stream',cacheControl:'3600'},removeFingerprintOnSuccess:true,onProgress:(sent,total)=>onProgress(total?Math.round(100*sent/total):0),onSuccess:()=>resolve(),onError:()=>reject(new Error('Envio interrompido. Tente novamente para retomar.'))});
  upload.findPreviousUploads().then(previous=>{if(previous[0])upload.resumeFromPreviousUpload(previous[0]);upload.start();}).catch(reject);
 });}
 const row={study_id:studyId,version_id:version.id,kind,slide_n:slide??null,...hashes,bytes:file.size,path,original_name:file.name};
 const {data,error}=await db.from('corretor_material_assets').insert(row).select('*').single();
 if(error?.code==='23505'){const retry=(await listMaterials(studyId)).find(a=>a.path===path);if(retry)return retry;}
 fail(error);if(!data)throw new Error('Vínculo do material não confirmado.');return data;
}
export async function recoverMaterial(asset:MaterialAsset):Promise<Uint8Array>{await requireProjectIdentity();const {data,error}=await supabase.storage.from('corretor-materiais').download(asset.path);if(error||!data)throw new Error('Não foi possível recuperar o arquivo.');const bytes=new Uint8Array(await data.arrayBuffer());if(bytes.length!==asset.bytes||await digest(bytes,'SHA-256')!==asset.sha256||(asset.sha1&&await digest(bytes,'SHA-1')!==asset.sha1))throw new Error('Arquivo recebido não passou na conferência de integridade.');return bytes;}
export async function activateSources(studyId:string,versionId:string,assets:MaterialAsset[],payload:Fonte):Promise<string>{
 await requireProjectIdentity();
 const fingerprint=await digest(new TextEncoder().encode(JSON.stringify(assets.map(a=>[a.original_name,a.sha256]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))),'SHA-256');
 const previous=(await listSourceSets(studyId)).find(s=>s.version_id===versionId&&s.fingerprint===fingerprint);
 if(previous){payload=previous.payload;assets=previous.file_ids.map(id=>assets.find(a=>a.id===id)!).filter(Boolean);if(assets.length!==previous.file_ids.length)throw new Error('Conjunto anterior precisa de conferência.');}
 const {data,error}=await db.rpc('activate_corretor_source_set',{p_study:studyId,p_version:versionId,p_fingerprint:fingerprint,p_files:assets.map(a=>a.id),p_payload:payload,p_name:`${assets.length} planilhas · fonte persistida`});fail(error);return data;
}
export async function previewUrl(asset:MaterialAsset):Promise<string>{
 const {data,error}=await supabase.functions.invoke('corretor-material-preview',{body:{assetId:asset.id}});
 if(error||!data?.url)throw new Error('A prévia remota ainda não está disponível.');return data.url;
}
export async function recordReviewSnapshot(studyId:string,versionId:string):Promise<void>{
 await requireProjectIdentity();
 const [findings,source,sets,study]=await Promise.all([loadFindings(studyId,true),loadStudyFonte(studyId),listSourceSets(studyId),db.from('studies_v3').select('relatorio').eq('id',studyId).single()]);
 fail(study.error);
 // Igualdade de JSON normalizada; não inferir relação com fontes apenas pela data mais recente.
 const canonical=(value:unknown):string=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
 const set=source?sets.find(s=>s.version_id===versionId&&canonical(s.payload)===canonical(source.fonte)):undefined;
 const {error}=await db.from('corretor_analysis_snapshots').insert({study_id:studyId,version_id:versionId,source_set_id:set?.id??null,source_scope:set?'persisted_set':source?'legacy_derived':'no_source',report:study.data?.relatorio??null,findings,reason:'manual_review_snapshot'});fail(error);
}
export async function personalStudyIds():Promise<{mine:string[];shared:string[]}|null>{
 let uid:string;
 try{uid=await requireProjectIdentity();}catch{return null;}
 const [mine,owned,shared]=await Promise.all([
  db.from('studies_v3').select('id').eq('created_by',uid),
  db.from('corretor_projects').select('study_id').eq('owner_id',uid),
  db.from('corretor_study_shares').select('study_id').eq('user_id',uid),
 ]);
 fail(mine.error);fail(owned.error);fail(shared.error);
 // Organização da carteira, sem reatribuir autoria ou ampliar permissões no banco.
 return {mine:[...new Set<string>([...(mine.data??[]).map((r:{id:string})=>r.id),...(owned.data??[]).map((r:{study_id:string|null})=>r.study_id).filter(Boolean)])],shared:(shared.data??[]).map((r:{study_id:string})=>r.study_id)};
}
