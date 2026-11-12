import type PptxGenJS from 'pptxgenjs';
import { approvedLayoutText, type LayoutText } from '@/features/panorama-secovi-fiergs/lib/pptx/approved-layout';
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
  const [{default:Pptx},{toPng,getFontEmbedCSS}]=await Promise.all([import('pptxgenjs'),import('html-to-image')]);
  const pptx=new Pptx();pptx.layout='LAYOUT_WIDE';pptx.author='Brain Inteligência Estratégica';pptx.title=`São Paulo Institucional · ${quarter}`;
  pptx.subject='Versão para conferência; páginas com fontes pendentes preservadas. Textos e células editáveis; gráficos, mapas e artes como imagens.';
  const fontEmbedCSS=await getFontEmbedCSS(slides[0].parentElement??slides[0]);
  for(const [index,original] of slides.entries()){
    check(signal);await waitForSlide(original);check(signal);
    if([...original.querySelectorAll('img')].some(image=>!image.complete||!image.naturalWidth))throw new Error(`A arte do slide ${index+1} não foi carregada. Tente novamente.`);
    const clone=original.cloneNode(true) as HTMLElement;original.parentElement!.append(clone);
    try {
      const frame=clone.getBoundingClientRect();
      const photos:{data:string;x:number;y:number;w:number;h:number;name:string}[]=[];
      for(const photo of clone.querySelectorAll<HTMLElement>('[data-sp-editable-photo]')){
        check(signal);const r=photo.getBoundingClientRect();
        if(!r.width||!r.height)continue;
        const portrait=photo.querySelector('img'), imageFrame=portrait?.getBoundingClientRect();
        if(portrait?.decode)await portrait.decode();check(signal);
        const pixelRatio=portrait&&imageFrame?.width&&imageFrame.height?Math.max(1,Math.min(4,portrait.naturalWidth/imageFrame.width,portrait.naturalHeight/imageFrame.height)):1;
        photos.push({data:await toPng(photo,{fontEmbedCSS,pixelRatio,cacheBust:false,width:r.width,height:r.height,style:{position:'relative',inset:'0',insetInline:'0',insetBlock:'0',insetInlineStart:'0',insetInlineEnd:'auto',insetBlockStart:'0',insetBlockEnd:'auto',left:'0',top:'0',right:'auto',bottom:'auto',margin:'0',transform:'none'}}),x:(r.left-frame.left)*W/frame.width,y:(r.top-frame.top)*H/frame.height,w:r.width*W/frame.width,h:r.height*H/frame.height,name:photo.dataset.spEditablePhoto??''});
      }
      const html=approvedLayoutText(clone),texts=[...html.texts,...spSvgTexts(clone)];
      html.parents.forEach(parent=>parent.style.setProperty('-webkit-text-fill-color','transparent','important'));
      clone.querySelectorAll<SVGTextElement>('svg text,svg tspan').forEach(text=>text.style.setProperty('fill','transparent','important'));
      const image=await toPng(clone,{fontEmbedCSS,pixelRatio:1,cacheBust:false,width:1280,height:720,filter:node=>!(node instanceof Element&&node.hasAttribute('data-sp-editable-photo'))&&!(node instanceof SVGImageElement&&getComputedStyle(node).visibility==='hidden')});check(signal);
      const page=pptx.addSlide();page.addImage({data:image,x:0,y:0,w:W,h:H,objectName:`Arte e gráfico do slide ${index+1}`});
      for(const photo of photos){const {name,...image}=photo;page.addImage({...image,objectName:`Foto editável: ${name}`});}
      for(const t of texts)page.addText(t.text,{x:t.x,y:t.y,w:t.w,h:t.h,fontSize:t.size,fontFace:'Tahoma',color:t.color,bold:t.bold,italic:t.italic,margin:0,breakLine:false,valign:'middle',fit:'shrink',wrap:false,objectName:`Texto editável: ${t.text.slice(0,50)}`} as PptxGenJS.TextPropsOptions);
      for(const link of clone.querySelectorAll<HTMLElement>('[data-sp-target-slide]')){
        const target=Number(link.dataset.spTargetSlide),r=link.getBoundingClientRect();
        if(Number.isInteger(target)&&target>=1&&target<=85&&r.width&&r.height)page.addShape(pptx.ShapeType.rect,{x:(r.left-frame.left)*W/frame.width,y:(r.top-frame.top)*H/frame.height,w:r.width*W/frame.width,h:r.height*H/frame.height,line:{transparency:100},fill:{color:'FFFFFF',transparency:100},hyperlink:{slide:target,tooltip:`Ir ao slide ${target}`},objectName:`Navegação: slide ${target}`});
      }
      page.addNotes(`SP ${quarter}; posição original ${index+1}/85. Versão para conferência. Textos/células dinâmicos editáveis; desenho dos gráficos, mapas e artes estáticas em imagem. Sem homologação automática.`);
      onProgress(index+1,slides.length);
    } finally {clone.remove();}
  }
  check(signal);const blob=await pptx.write({outputType:'blob',compression:true}) as Blob;check(signal);
  if(!audit)return blob;
  const bytes=embedSpPptxAudit(new Uint8Array(await blob.arrayBuffer()),audit);check(signal);
  return new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
}
