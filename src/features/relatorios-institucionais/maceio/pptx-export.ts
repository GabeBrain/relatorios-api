import {addNativePptxSlide,patchNativePptx,type NativePatch} from '../shared/native-pptx';
import {embedReportPptxAudit} from '../shared/pptx-audit';
import {maceioPeriod,maceioReference,type MaceioSelection} from './model';
import type {buildMaceioDiagnostic} from './diagnostic';

export type MaceioPptxAudit=ReturnType<typeof buildMaceioDiagnostic>;
export const MACEIO_PPTX_AUDIT_PART='customXml/maceio-audit.xml';
const check=(signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('Exportação cancelada.','AbortError');};

/** Waits are cancellable, including when a font or an image never completes. */
function waitAsset(task:Promise<unknown>,signal:AbortSignal){
 check(signal);
 return new Promise<void>((resolve,reject)=>{
  const finish=(error?:unknown)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);if(error)reject(error);else resolve();};
  const abort=()=>finish(new DOMException('Exportação cancelada.','AbortError'));
  const timer=setTimeout(()=>finish(new Error('Uma fonte ou imagem não concluiu o carregamento. Tente exportar novamente.')),20_000);
  signal.addEventListener('abort',abort,{once:true});
  task.then(()=>finish(),()=>finish(new Error('Não foi possível carregar uma fonte ou imagem do relatório. Tente exportar novamente.')));
 });
}

/**
 * Reuses the bytes the offscreen deck is already downloading (HTTP cache). Bypassing the cache on
 * every artwork re-downloaded ~17 MB behind the deck's own requests and made the first pages take
 * minutes on slow connections. Only a failed cached response is retried from the network, so a
 * cached failure still cannot poison a new attempt.
 */
async function fetchArtwork(url:string,signal:AbortSignal){
 try{const cached=await fetch(url,{signal});if(cached.ok)return cached;}
 catch(cause){if(signal.aborted)throw cause;}
 check(signal);return fetch(url,{signal,cache:'reload'});
}

async function imageData(url:string,signal:AbortSignal){
 if(url.startsWith('data:'))return url;
 const response=await fetchArtwork(url,signal);check(signal);
 if(!response.ok)throw new Error('Não foi possível carregar uma imagem do relatório. Tente exportar novamente.');
 const blob=await response.blob();check(signal);
 return new Promise<string>((resolve,reject)=>{
  const reader=new FileReader();
  const cleanup=()=>signal.removeEventListener('abort',abort);
  const abort=()=>{reader.abort();cleanup();reject(new DOMException('Exportação cancelada.','AbortError'));};
  reader.onload=()=>{cleanup();resolve(String(reader.result));};reader.onerror=()=>{cleanup();reject(new Error('Não foi possível ler uma imagem do relatório.'));};
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}reader.readAsDataURL(blob);
 });
}

export async function buildMaceioPptx(slides:HTMLElement[],options:{selection:MaceioSelection;signal:AbortSignal;onProgress:(current:number,total:number)=>void;audit:MaceioPptxAudit}){
 const {selection,signal,audit}=options,count=maceioReference(selection.periodicity).slideCount,period=maceioPeriod(selection);check(signal);
 if(slides.length!==count||slides.some((slide,i)=>Number(slide.dataset.maceioExportSlide)!==i+1))throw new Error(`A exportação exige as ${count} páginas na ordem original.`);
 if(audit.generationStatus!=='done'||audit.period.end!==period.end||Object.keys(selection).some(key=>audit.selection[key as keyof MaceioSelection]!==selection[key as keyof MaceioSelection])||audit.reference.slideCount!==count||audit.slides.length!==count)throw new Error('A geração do relatório mudou. Gere novamente antes de exportar.');
 const {default:Pptx}=await import('pptxgenjs');check(signal);
 await waitAsset(document.fonts?.ready??Promise.resolve(),signal);check(signal);
 const pptx=new Pptx();pptx.layout='LAYOUT_WIDE';pptx.author='Brain Inteligência Estratégica';
 pptx.title=`Maceió e RM · ${selection.periodicity==='monthly'?'Mensal':'Trimestral'} · ${period.label}`;
 pptx.subject='Textos, células e formas dos gráficos editáveis; fotos e artes substituíveis. Requer Tahoma. Fontes e cobertura nas notas e auditoria.';
 const patches:NativePatch[]=[],images=new Map<string,string>();
 for(const [i,root] of slides.entries()){
  check(signal);
  // Refresh artwork bytes so a cached HTTP failure cannot poison a new attempt.
  // Only the offscreen export nodes change; attributes are restored on every exit.
  const restored:{element:Element;attribute:string;value:string}[]=[];
  let slide:Awaited<ReturnType<typeof addNativePptxSlide>>;
  try{
   for(const element of root.querySelectorAll('img,image')){
    const attribute=element instanceof HTMLImageElement?'src':element.hasAttribute('href')?'href':'xlink:href',url=element.getAttribute(attribute);
    if(!url)continue;
    let data=images.get(url);if(!data){data=await imageData(url,signal);images.set(url,data);}check(signal);
    restored.push({element,attribute,value:url});element.setAttribute(attribute,data);
   }
   slide=await addNativePptxSlide(pptx,root,signal,patches);
  }finally{for(const item of restored)item.element.setAttribute(item.attribute,item.value);}
  const entry=audit.slides[i];
  const values=entry.values as {warnings?:string[];warning?:string;sourceNotice?:string;note?:string}|null;
  slide.addNotes([`Maceió / SINDUSCON-AL · ${period.label} · posição ${i+1}/${count}.`,entry.title,`Situação: ${entry.status}.`,entry.issue??'',values?.note??'',...(values?.warnings??[]),values?.warning??'',values?.sourceNotice??'','Textos e elementos vetoriais editáveis; imagens substituíveis. Gráficos compostos por formas, sem planilha de dados vinculada. Sem homologação automática.'].filter(Boolean).join('\n'));
  check(signal);options.onProgress(i+1,count);
  // Let the progress paint and cancellation run between pages.
  await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 check(signal);const blob=await pptx.write({outputType:'blob',compression:true}) as Blob;check(signal);
 const bytes=embedReportPptxAudit(patchNativePptx(new Uint8Array(await blob.arrayBuffer()),patches),{schema:'maceio-pptx-review-v1',exportedAt:new Date().toISOString(),mode:'editable',report:audit},{part:MACEIO_PPTX_AUDIT_PART,namespace:'urn:brain:maceio-institutional:audit:v1',relationshipId:'rIdMaceioAudit'});check(signal);
 return new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
}

export const maceioPptxFilename=(selection:MaceioSelection)=>`maceio-${selection.periodicity==='monthly'?`mensal-${selection.year}-${String(selection.position).padStart(2,'0')}`:`trimestral-${selection.position}T${selection.year}`}-editavel.pptx`;
