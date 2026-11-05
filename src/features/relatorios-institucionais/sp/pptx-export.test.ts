import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {buildSpEditablePptx} from './pptx-export';
import {embedSpPptxAudit} from './pptx-audit';
vi.mock('./pptx-audit',()=>({embedSpPptxAudit:vi.fn(()=>new Uint8Array([1,2,3]))}));
const captured=vi.hoisted(()=>({slides:[] as {texts:string[];notes:string[];images:number;targets:number[]}[],writes:0}));
vi.mock('pptxgenjs',()=>({default:class {
  ShapeType={rect:'rect'};
  addSlide(){const slide={texts:[] as string[],notes:[] as string[],images:0,targets:[] as number[]};captured.slides.push(slide);return {addImage:()=>slide.images++,addText:(value:string)=>slide.texts.push(value),addNotes:(value:string)=>slide.notes.push(value),addShape:(_type:string,options:{hyperlink:{slide:number}})=>slide.targets.push(options.hyperlink.slide)};}
  async write(){captured.writes++;return Object.assign(new Blob(['test-pptx']),{arrayBuffer:async()=>new ArrayBuffer(1)});}
}}));
vi.mock('html-to-image',()=>({getFontEmbedCSS:async()=>'',toPng:async(node:HTMLElement)=>{
  expect(node.querySelector('text')!.style.fill).toBe('transparent');
  return 'data:image/png;base64,iVBORw0KGgo=';
}}));
vi.mock('@/features/panorama-secovi-fiergs/lib/pdf-export',()=>({waitForSlide:async()=>{},PanoramaExportCancelled:class extends Error{constructor(){super('Cancelado');this.name='PanoramaExportCancelled';}}}));
let deck:HTMLDivElement;
beforeEach(()=>{
  captured.slides=[];captured.writes=0;deck=document.createElement('div');document.body.append(deck);
  vi.spyOn(Element.prototype,'getBoundingClientRect').mockImplementation(function(this:Element){return (this.tagName.toLowerCase()==='text'?{left:100,top:80,width:150,height:24,right:250,bottom:104}:{left:0,top:0,width:1280,height:720,right:1280,bottom:720}) as DOMRect;});
});
afterEach(()=>{deck.remove();vi.restoreAllMocks();});
function slides(){return Array.from({length:85},()=>{
  const article=document.createElement('article');article.innerHTML='<span class="sr-only">Não exportar</span><svg><text style="font-size:24px;font-family:Tahoma;fill:rgb(38,38,38)">42.453</text></svg>';deck.append(article);return article;
});}
describe('SP — PowerPoint para conferência',()=>{
  it('preserva85posições, textos nativos e auditoria sem duplicar os textos na imagem',async()=>{
    const source=slides(),progress=vi.fn();
    const result=await buildSpEditablePptx(source,'2T2026',new AbortController().signal,progress,{quarter:'2T2026',numericAudit:{schema:'sp-numeric-audit-v1'}});
    expect(result).toBeInstanceOf(Blob);expect(captured.slides).toHaveLength(85);expect(progress).toHaveBeenLastCalledWith(85,85);
    expect(captured.slides.every(slide=>slide.texts.join(' ')==='42.453'&&slide.images===1)).toBe(true);
    expect(captured.slides.flatMap(slide=>slide.notes).join(' ')).not.toContain('SP_AUDIT_JSON');
    expect(embedSpPptxAudit).toHaveBeenCalledWith(expect.any(Uint8Array),{quarter:'2T2026',numericAudit:{schema:'sp-numeric-audit-v1'}});
    expect(source[0].querySelector('text')!.style.fill).toBe('rgb(38,38,38)');expect(deck.children).toHaveLength(85);expect(captured.writes).toBe(1);
  });
  it('cancelamento não grava arquivo parcial e limpa a cópia de captura',async()=>{
    const source=slides(),controller=new AbortController();
    await expect(buildSpEditablePptx(source,'2T2026',controller.signal,current=>{if(current===3)controller.abort();})).rejects.toMatchObject({name:'PanoramaExportCancelled'});
    expect(captured.slides).toHaveLength(3);expect(captured.writes).toBe(0);expect(deck.children).toHaveLength(85);
  });
  it('grava destinos internos medidos sem executar navegação ou coletar dados',async()=>{
    const source=slides(),link=document.createElement('button');link.dataset.spTargetSlide='12';source[5].append(link);
    await buildSpEditablePptx(source,'2T2026',new AbortController().signal,()=>{});
    expect(captured.slides[5].targets).toEqual([12]);expect(source[5].contains(link)).toBe(true);
  });
  it('recusa um deck incompleto em vez de omitir posições silenciosamente',async()=>{
    await expect(buildSpEditablePptx([],'2T2026',new AbortController().signal,()=>{})).rejects.toThrow('85 posições');expect(captured.writes).toBe(0);
  });
});
