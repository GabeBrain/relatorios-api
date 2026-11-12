import { Blob as BrowserCompatibleBlob,Buffer } from 'node:buffer';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { unzipSync,strFromU8 } from 'fflate';
import { PDFDocument,PDFName,PDFDict,PDFArray,PDFHexString } from 'pdf-lib';
import { buildFortalezaMonthlyExport,fortalezaNativeTexts,FORTALEZA_PPTX_AUDIT_PART } from './pptx-export';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3sAAAAASUVORK5CYII=';
const jpg='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wgARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAX8f/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=';
const capture=vi.hoisted(()=>vi.fn());
vi.mock('html-to-image',()=>({toPng:capture,toJpeg:async()=>jpg,getFontEmbedCSS:async()=>''}));
let holder:HTMLDivElement,slides:HTMLDivElement[];
beforeEach(()=>{
  vi.stubGlobal('Blob',BrowserCompatibleBlob);capture.mockReset().mockResolvedValue(png);Object.defineProperty(document,'fonts',{configurable:true,value:{ready:Promise.resolve()}});
  vi.spyOn(Element.prototype,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:1280,bottom:720,width:1280,height:720,x:0,y:0,toJSON:()=>({})});
  holder=document.createElement('div');document.body.append(holder);slides=Array.from({length:60},(_,i)=>{const slide=document.createElement('div');slide.dataset.fortalezaExportSlide=String(i+1);holder.append(slide);return slide;});
});
afterEach(()=>{holder.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
const options=()=>({period:'2026-07',mode:'faithful' as const,signal:new AbortController().signal,onProgress:vi.fn(),audit:{schema:'fortaleza-pptx-review-v1',homologated:false,value:'<&> teste'}});
describe('Fortaleza exportação mensal offline',()=>{
  it('exporta o trimestral com89posições em PPTX e PDF e rejeita manifesto incompleto',async()=>{
    for(let index=60;index<89;index++){const slide=document.createElement('div');slide.dataset.fortalezaExportSlide=String(index+1);holder.append(slide);slides.push(slide);}
    const settings={...options(),periodicity:'quarterly' as const};
    const pptx=await buildFortalezaMonthlyExport(slides,settings),files=unzipSync(new Uint8Array(await pptx.arrayBuffer()));
    expect(Object.keys(files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name))).toHaveLength(89);
    expect(settings.onProgress).toHaveBeenLastCalledWith(89,89);
    const blob=await buildFortalezaMonthlyExport(slides,{...settings,format:'pdf'}),pdf=await PDFDocument.load(Buffer.from(await blob.arrayBuffer()).toString('base64'));
    expect(pdf.getPageCount()).toBe(89);
    await expect(buildFortalezaMonthlyExport(slides.slice(0,60),settings)).rejects.toThrow('89 páginas');
  });
  it('preserva60posições e embute auditoria sem colocar JSON nas notas',async()=>{
    const settings=options(),blob=await buildFortalezaMonthlyExport(slides,settings),files=unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name))).toHaveLength(60);
    expect(strFromU8(files[FORTALEZA_PPTX_AUDIT_PART])).toContain('&lt;&amp;&gt; teste');
    expect(strFromU8(files['ppt/_rels/presentation.xml.rels'])).toContain('../customXml/fortaleza-audit.xml');
    expect(strFromU8(files['ppt/notesSlides/notesSlide1.xml'])).not.toContain('fortaleza-pptx-review-v1');
    expect(capture).not.toHaveBeenCalled();expect(settings.onProgress).toHaveBeenLastCalledWith(60,60);expect(holder.children).toHaveLength(60);
  });
  it('geraPDFcom60páginas16:9eJSONanexado',async()=>{
    const blob=await buildFortalezaMonthlyExport(slides,{...options(),format:'pdf'}),pdf=await PDFDocument.load(Buffer.from(await blob.arrayBuffer()).toString('base64'));
    expect(blob.type).toBe('application/pdf');expect(pdf.getPageCount()).toBe(60);
    expect(pdf.getPage(0).getWidth()/pdf.getPage(0).getHeight()).toBeCloseTo(16/9);
    const names=pdf.catalog.lookup(PDFName.of('Names'),PDFDict).lookup(PDFName.of('EmbeddedFiles'),PDFDict).lookup(PDFName.of('Names'),PDFArray);
    expect((names.get(0) as PDFHexString).decodeText()).toBe('fortaleza-diagnostico.json');
  });
  it('rejeita lote incompleto ou fora de ordem antes de capturar',async()=>{
    await expect(buildFortalezaMonthlyExport(slides.slice(1),options())).rejects.toThrow('60 páginas');
    await expect(buildFortalezaMonthlyExport([...slides].reverse(),options())).rejects.toThrow('ordem original');expect(capture).not.toHaveBeenCalled();
  });
  it('cancelamento durante a captura não retorna arquivo e limpa clone',async()=>{
    const controller=new AbortController();
    await expect(buildFortalezaMonthlyExport(slides,{...options(),signal:controller.signal,onProgress:()=>controller.abort()})).rejects.toMatchObject({name:'AbortError'});
    expect(capture).not.toHaveBeenCalled();expect(holder.children).toHaveLength(60);
  });
  it('falha de captura é recuperável e limpa clone',async()=>{
    vi.spyOn(slides[0],'getBoundingClientRect').mockReturnValueOnce({width:0,height:0} as DOMRect);
    await expect(buildFortalezaMonthlyExport(slides,options())).rejects.toThrow('sem dimensões');expect(holder.children).toHaveLength(60);
    await expect(buildFortalezaMonthlyExport(slides,options())).resolves.toBeInstanceOf(Blob);
  });
  it('respeita recorte de célula e preserva rótulo inclinado no desenho',()=>{
    const root=slides[0];root.innerHTML='<svg><foreignObject><div><span style="font-size:16px">ABCDE</span></div></foreignObject><text transform="rotate(45)">INCLINADO</text></svg>';
    const bounds={left:0,top:0,right:1280,bottom:720,width:1280,height:720,x:0,y:0,toJSON:()=>({})};
    vi.spyOn(root,'getBoundingClientRect').mockReturnValue(bounds);vi.spyOn(root.querySelector('foreignObject')!,'getBoundingClientRect').mockReturnValue({...bounds,right:40,bottom:20,width:40,height:20});
    let index=0;vi.spyOn(document,'createRange').mockImplementation(()=>({setStart:(_node:Node,value:number)=>{index=value;},setEnd:()=>{},getBoundingClientRect:()=>({...bounds,left:index*10,right:index*10+10,bottom:10,width:10,height:10})}) as unknown as Range);
    const result=fortalezaNativeTexts(root);expect(result.texts.map(row=>row.text)).toEqual(['ABCD']);
    expect([...result.parents].some(parent=>parent.getAttribute('transform'))).toBe(false);
  });
});
