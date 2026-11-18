import {addNativePptxSlide,patchNativePptx,type NativePatch} from '../shared/native-pptx';
import type PptxGenJS from 'pptxgenjs';
import { embedReportPptxAudit } from '../shared/pptx-audit';

export const FORTALEZA_PPTX_AUDIT_PART='customXml/fortaleza-audit.xml';
export type FortalezaPptxMode='faithful'|'editable';
const W=13.333333,H=7.5;
const check=(signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('Exportação cancelada.','AbortError');};
export interface FortalezaNativeText {text:string;x:number;y:number;w:number;h:number;size:number;color:string;bold:boolean;italic:boolean}
/** Measure actual glyph lines, including the foreignObject cells in slides3–7. */
export function fortalezaNativeTexts(root:HTMLElement){
  const frame=root.getBoundingClientRect(),texts:FortalezaNativeText[]=[],parents=new Set<Element>();
  if(!frame.width||!frame.height)throw new Error('Slide sem dimensões para exportar.');
  const sx=W/frame.width,sy=H/frame.height,walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()){
    const parent=node.parentElement,value=node.textContent??'';
    if(!parent||!value.trim()||parent.closest('title,desc,script,style,[data-raster-text]'))continue;
    if(parent.closest('[transform*="rotate"]'))continue; // Preserve slanted chart labels as drawn.
    const style=getComputedStyle(parent);
    if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0')continue;
    const cell=parent.closest('foreignObject')?.getBoundingClientRect();
    const lines:{text:string;left:number;top:number;right:number;bottom:number}[]=[],range=document.createRange();
    for(let i=0;i<value.length;i++){
      range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();
      if(!r.width||!r.height||r.bottom<=frame.top||r.top>=frame.bottom)continue;
      if(cell&&(r.left<cell.left-.5||r.right>cell.right+.5||r.top<cell.top-.5||r.bottom>cell.bottom+.5))continue;
      const last=lines.at(-1);
      if(last&&Math.abs(last.top-r.top)<1){last.text+=value[i];last.right=Math.max(last.right,r.right);last.bottom=Math.max(last.bottom,r.bottom);}
      else lines.push({text:value[i],left:r.left,top:r.top,right:r.right,bottom:r.bottom});
    }
    if(!lines.length)continue;parents.add(parent);
    const raw=parent.closest('foreignObject')?style.color:style.fill;
    const color=raw.match(/[\d.]+/g)?.slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join('')??'000000';
    for(const line of lines)if(line.text.trim())texts.push({text:line.text,x:(line.left-frame.left)*sx,y:(line.top-frame.top)*sy,w:(line.right-line.left+3)*sx,h:(line.bottom-line.top+2)*sy,size:parseFloat(style.fontSize)*sx*72,color,bold:Number(style.fontWeight)>=600||style.fontWeight==='bold',italic:style.fontStyle==='italic'});
  }
  return {texts,parents};
}
async function waitArtwork(root:HTMLElement,signal:AbortSignal){
  check(signal);await document.fonts.ready;check(signal);
  const urls=new Set([...root.querySelectorAll('img,image')].map(node=>node instanceof HTMLImageElement?node.currentSrc||node.src:node.getAttribute('href')??node.getAttribute('xlink:href')??'').filter(Boolean));
  for(const url of urls){
    check(signal);const image=new Image();image.src=url;
    await new Promise<void>((resolve,reject)=>{
      const aborted=()=>{cleanup();reject(new DOMException('Exportação cancelada.','AbortError'));};
      const timer=window.setTimeout(()=>{cleanup();reject(new Error('Uma imagem do relatório não concluiu o carregamento.'));},20_000);
      const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',aborted);image.onload=null;image.onerror=null;};
      image.onload=()=>{cleanup();resolve();};image.onerror=()=>{cleanup();reject(new Error('Uma imagem do relatório não foi carregada.'));};
      signal.addEventListener('abort',aborted,{once:true});
      if(signal.aborted)aborted();
      else if(image.complete){cleanup();if(image.naturalWidth)resolve();else reject(new Error('Imagem inválida no relatório.'));}
    });
  }
}
/** No market requests. Exact60 positions; visible SVG/foreignObject composition. */
export async function buildFortalezaMonthlyExport(slides:HTMLElement[],options:{period:string;periodicity?:'monthly'|'quarterly';mode:FortalezaPptxMode;format?:'pptx'|'pdf';signal:AbortSignal;onProgress:(current:number,total:number)=>void;audit:unknown}){
  const {signal}=options;check(signal);
  const count=options.periodicity==='quarterly'?89:60,kind=options.periodicity==='quarterly'?'Trimestral':'Mensal';
  if(slides.length!==count||slides.some((slide,i)=>Number(slide.dataset.fortalezaExportSlide)!==i+1))throw new Error(`A exportação exige as ${count} páginas na ordem original.`);
  const [{default:Pptx},{toJpeg,getFontEmbedCSS}]=await Promise.all([import('pptxgenjs'),import('html-to-image')]);
  const pptx=new Pptx();pptx.layout='LAYOUT_WIDE';pptx.author='Brain Inteligência Estratégica';pptx.title=`Fortaleza e RM · ${kind} · ${options.period}`;
  pptx.subject='Conferência: tabelas, textos e formas vetoriais editáveis; imagens substituíveis individualmente. Requer Tahoma.';
  const pdf=options.format==='pdf'?await(await import('pdf-lib')).PDFDocument.create():null;
  if(pdf){pdf.setTitle(pptx.title);pdf.setAuthor(pptx.author);pdf.setSubject('Versão para conferência, sem homologação; diagnóstico anexado.');}
  const patches:NativePatch[]=[];
  const fontEmbedCSS=await getFontEmbedCSS(slides[0]);check(signal);
  for(const [i,original] of slides.entries()){
    await waitArtwork(original,signal);check(signal);
    if(!pdf){
      const slide=await addNativePptxSlide(pptx,original,signal,patches);
      slide.addNotes(`Fortaleza / SINDUSCON-CE · ${options.period}; posição ${i+1}/${count}. Objetos nativos editáveis; sem homologação automática.`);
      options.onProgress(i+1,count);continue;
    }
    const clone=original.cloneNode(true) as HTMLElement;original.parentElement!.append(clone);
    try{
      const image=await toJpeg(clone,{fontEmbedCSS,pixelRatio:2,width:1280,height:720,cacheBust:false,backgroundColor:'#ffffff',quality:.97});check(signal);
      const page=pdf.addPage([W*72,H*72]),jpg=await pdf.embedJpg(image);check(signal);page.drawImage(jpg,{x:0,y:0,width:W*72,height:H*72});
      options.onProgress(i+1,count);
    }finally{clone.remove();}
  }
  if(pdf){check(signal);const auditBytes=new TextEncoder().encode(JSON.stringify(options.audit));let binary='';for(let i=0;i<auditBytes.length;i+=8192)binary+=String.fromCharCode(...auditBytes.subarray(i,i+8192));await pdf.attach(btoa(binary),'fortaleza-diagnostico.json',{mimeType:'application/json',description:'Diagnóstico da mesma exportação; sem credenciais ou históricos brutos.'});const bytes=await pdf.save();check(signal);return new Blob([bytes as BlobPart],{type:'application/pdf'});}
  check(signal);const blob=await pptx.write({outputType:'blob',compression:true}) as Blob;check(signal);
  const bytes=embedReportPptxAudit(patchNativePptx(new Uint8Array(await blob.arrayBuffer()),patches),options.audit,{part:FORTALEZA_PPTX_AUDIT_PART,namespace:'urn:brain:fortaleza-institutional:audit:v1',relationshipId:'rIdFortalezaAudit'});check(signal);
  return new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
}
