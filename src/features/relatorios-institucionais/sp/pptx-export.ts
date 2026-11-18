import {addNativePptxSlide,patchNativePptx,type NativePatch} from '../shared/native-pptx';
import type PptxGenJS from 'pptxgenjs';
import { type LayoutText } from '@/features/panorama-secovi-fiergs/lib/pptx/approved-layout';
import { PanoramaExportCancelled, waitForSlide } from '@/features/panorama-secovi-fiergs/lib/pdf-export';
import { embedSpPptxAudit } from './pptx-audit';

const W=13.333333,H=7.5;
const check=(signal:AbortSignal)=>{if(signal.aborted)throw new PanoramaExportCancelled();};
/** SP uses SVG tables and labels; preserve each visible label as a native PowerPoint text box. */
export function spSvgTexts(root:HTMLElement):LayoutText[] {
  const frame=root.getBoundingClientRect(),sx=W/frame.width,sy=H/frame.height;
  if(!frame.width||!frame.height)throw new Error('Slide sem dimensões para exportar.');
  return [...root.querySelectorAll<SVGTextElement>('svg text')].flatMap(text=>{
    const nodes:Text[]=[];const walker=document.createTreeWalker(text,NodeFilter.SHOW_TEXT);
    for(let node=walker.nextNode();node;node=walker.nextNode())if(node.textContent?.trim()&&!node.parentElement?.closest('title,desc'))nodes.push(node as Text);
    return nodes.flatMap(node=>{
      const element=node.parentElement!;
      const style=getComputedStyle(element),range=document.createRange();range.selectNodeContents(node);
      const r=typeof range.getBoundingClientRect==='function'?range.getBoundingClientRect():element.getBoundingClientRect();
      if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0'||!r.width||!r.height)return [];
      const value=node.textContent!;
      const color=style.fill.match(/[\d.]+/g)?.slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join('')??'262626';
      return [{text:value,x:(r.left-frame.left)*sx,y:(r.top-frame.top)*sy,w:(r.width+3)*sx,h:(r.height+2)*sy,size:parseFloat(style.fontSize)*sx*72,face:style.fontFamily.split(',')[0].replace(/["']/g,'').trim(),color,bold:Number(style.fontWeight)>=600||style.fontWeight==='bold',italic:style.fontStyle==='italic',spacing:0}];
    });
  });
}

export async function buildSpEditablePptx(slides:HTMLElement[],quarter:string,signal:AbortSignal,onProgress:(current:number,total:number)=>void,audit?:unknown) {
  check(signal);if(slides.length!==85)throw new Error('A exportação exige as 85 posições do relatório.');
  const {default:Pptx}=await import('pptxgenjs');
  const pptx=new Pptx();pptx.layout='LAYOUT_WIDE';pptx.author='Brain Inteligência Estratégica';pptx.title=`São Paulo Institucional · ${quarter}`;
  pptx.subject='Textos, tabelas e elementos vetoriais editáveis; imagens substituíveis individualmente. Conferência sem homologação automática.';
  const patches:NativePatch[]=[];
  for(const [index,original] of slides.entries()){
    check(signal);await waitForSlide(original);check(signal);
    if([...original.querySelectorAll('img')].some(image=>!image.complete||!image.naturalWidth))throw new Error(`A arte do slide ${index+1} não foi carregada. Tente novamente.`);
    const page=await addNativePptxSlide(pptx,original,signal,patches),frame=original.getBoundingClientRect();
    for(const link of original.querySelectorAll<HTMLElement>('[data-sp-target-slide]')){
      const target=Number(link.dataset.spTargetSlide),r=link.getBoundingClientRect();
      if(Number.isInteger(target)&&target>=1&&target<=85&&r.width&&r.height)page.addShape(pptx.ShapeType.rect,{x:(r.left-frame.left)*W/frame.width,y:(r.top-frame.top)*H/frame.height,w:r.width*W/frame.width,h:r.height*H/frame.height,line:{transparency:100},fill:{color:'FFFFFF',transparency:100},hyperlink:{slide:target},objectName:`Navegação: slide ${target}`});
    }
    page.addNotes(`SP ${quarter}; posição original ${index+1}/85. Objetos nativos editáveis. Sem homologação automática.`);onProgress(index+1,slides.length);
  }
  check(signal);const blob=await pptx.write({outputType:'blob',compression:true}) as Blob;check(signal);
  const native=patchNativePptx(new Uint8Array(await blob.arrayBuffer()),patches),bytes=audit?embedSpPptxAudit(native,audit):native;check(signal);
  return new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
}
