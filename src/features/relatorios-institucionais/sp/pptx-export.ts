import type PptxGenJS from 'pptxgenjs';
import { approvedLayoutText, type LayoutText } from '@/features/panorama-secovi-fiergs/lib/pptx/approved-layout';
import { PanoramaExportCancelled, waitForSlide } from '@/features/panorama-secovi-fiergs/lib/pdf-export';

const W=13.333333,H=7.5;
const check=(signal:AbortSignal)=>{if(signal.aborted)throw new PanoramaExportCancelled();};
/** SP uses SVG tables and labels; preserve each visible label as a native PowerPoint text box. */
export function spSvgTexts(root:HTMLElement):LayoutText[] {
  const frame=root.getBoundingClientRect(),sx=W/frame.width,sy=H/frame.height;
  if(!frame.width||!frame.height)throw new Error('Slide sem dimensões para exportar.');
  return [...root.querySelectorAll<SVGTextElement>('svg text')].flatMap(text=>{
    const spans=[...text.querySelectorAll<SVGTSpanElement>('tspan')];
    return (spans.length?spans:[text]).flatMap(element=>{
      const style=getComputedStyle(element),r=element.getBoundingClientRect();
      if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0'||!r.width||!r.height)return [];
      const copy=element.cloneNode(true) as Element;copy.querySelectorAll('title,desc').forEach(node=>node.remove());
      const value=copy.textContent?.trim();if(!value)return [];
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
      const html=approvedLayoutText(clone),texts=[...html.texts,...spSvgTexts(clone)];
      html.parents.forEach(parent=>parent.style.setProperty('-webkit-text-fill-color','transparent','important'));
      clone.querySelectorAll<SVGTextElement>('svg text,svg tspan').forEach(text=>text.style.setProperty('fill','transparent','important'));
      const image=await toPng(clone,{fontEmbedCSS,pixelRatio:1,cacheBust:false,width:1280,height:720,filter:node=>!(node instanceof SVGImageElement&&getComputedStyle(node).visibility==='hidden')});check(signal);
      const page=pptx.addSlide();page.addImage({data:image,x:0,y:0,w:W,h:H,objectName:`Arte e gráfico do slide ${index+1}`});
      for(const t of texts)page.addText(t.text,{x:t.x,y:t.y,w:t.w,h:t.h,fontSize:t.size,fontFace:t.face,color:t.color,bold:t.bold,italic:t.italic,margin:0,breakLine:false,valign:'middle',fit:'shrink',wrap:false,objectName:`Texto editável: ${t.text.slice(0,50)}`} as PptxGenJS.TextPropsOptions);
      page.addNotes(`SP ${quarter}; posição original ${index+1}/85. Versão para conferência. Textos/células dinâmicos editáveis; desenho dos gráficos, mapas e artes estáticas em imagem. Sem homologação automática.`);
      if(index===0&&audit)page.addNotes(`SP_AUDIT_JSON\n${JSON.stringify(audit)}`);
      onProgress(index+1,slides.length);
    } finally {clone.remove();}
  }
  check(signal);const blob=await pptx.write({outputType:'blob',compression:true}) as Blob;check(signal);return blob;
}
