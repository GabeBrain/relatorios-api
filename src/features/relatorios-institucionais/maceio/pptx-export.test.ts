import {Blob as BrowserBlob} from 'node:buffer';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {strFromU8,unzipSync} from 'fflate';
import {buildMaceioPptx,maceioPptxFilename,MACEIO_PPTX_AUDIT_PART} from './pptx-export';
import {buildMaceioDiagnostic} from './diagnostic';
import {maceioReference,maceioPeriod,type MaceioSelection} from './model';

const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:10};
const DomBlob=Blob;
const capture=vi.hoisted(()=>vi.fn());vi.mock('html-to-image',()=>({toPng:capture}));
beforeEach(()=>{vi.stubGlobal('Blob',BrowserBlob);Object.defineProperty(document,'fonts',{configurable:true,value:{ready:Promise.resolve()}});vi.spyOn(Element.prototype,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:1280,bottom:720,width:1280,height:720,toJSON:()=>({})});capture.mockClear();});
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();vi.unstubAllGlobals();});
function setup(selected=selection){
 const count=maceioReference(selected.periodicity).slideCount;
 const slides=Array.from({length:count},(_,i)=>{const root=document.createElement('div');root.dataset.maceioExportSlide=String(i+1);root.innerHTML=`<svg><text style="fill:#262626;font-size:20px">Página ${i+1} / ${count}</text></svg>`;document.body.append(root);return root;});
 const audit=buildMaceioDiagnostic(selected,{phase:'done',startedAt:0,finishedAt:'2026-11-23T18:00:00Z',blueprint:null,report:null,intro:null});
 return {slides,options:{selection:selected,audit,signal:new AbortController().signal,onProgress:vi.fn()}};
}
describe('Maceió PPTX editável',()=>{
 for(const periodicity of ['monthly','quarterly'] as const)it(`preserva ordem, textos nativos, notas e auditoria / ${periodicity}`,async()=>{
  const selected={...selection,periodicity,position:periodicity==='monthly'?10:3},{slides,options}=setup(selected),count=slides.length;
  const blob=await buildMaceioPptx(slides,options),files=unzipSync(new Uint8Array(await blob.arrayBuffer()));
  expect(Object.keys(files).filter(path=>/^ppt\/slides\/slide\d+\.xml$/.test(path))).toHaveLength(count);
  const first=strFromU8(files['ppt/slides/slide1.xml']),last=strFromU8(files[`ppt/slides/slide${count}.xml`]);
  expect(first).toContain('Página 1 /');expect(last).toContain(`Página ${count} /`);expect(first).toContain('<p:sp>');expect(first).not.toContain('<p:pic>');expect(capture).not.toHaveBeenCalled();
  const auditXml=new DOMParser().parseFromString(strFromU8(files[MACEIO_PPTX_AUDIT_PART]),'application/xml');
  const embedded=JSON.parse(auditXml.documentElement.textContent!);expect(embedded.report.period.end).toBe(maceioPeriod(selected).end);expect(embedded.report.homologated).toBe(false);expect(embedded.mode).toBe('editable');
  expect(strFromU8(files['ppt/_rels/presentation.xml.rels'])).toContain('../customXml/maceio-audit.xml');
  const notes=strFromU8(files['ppt/notesSlides/notesSlide9.xml']);expect(notes).toContain('Situação: source-pending');expect(notes).not.toContain('maceio-pptx-review-v1');
  expect(options.onProgress).toHaveBeenLastCalledWith(count,count);expect(maceioPptxFilename(selected)).toBe(periodicity==='monthly'?'maceio-mensal-2026-10-editavel.pptx':'maceio-trimestral-3T2026-editavel.pptx');
 });
 it('rejeita páginas ausentes, fora de ordem e auditoria de outra geração',async()=>{
  const {slides,options}=setup();await expect(buildMaceioPptx(slides.slice(1),options)).rejects.toThrow('82 páginas');
  [slides[0],slides[1]]=[slides[1],slides[0]];await expect(buildMaceioPptx(slides,options)).rejects.toThrow('ordem original');
  [slides[0],slides[1]]=[slides[1],slides[0]];options.audit.selection.position=9;await expect(buildMaceioPptx(slides,options)).rejects.toThrow('geração do relatório mudou');
 });
 it('cancelamento entre páginas interrompe a exportação sem entregar arquivo',async()=>{
  const {slides,options}=setup(),controller=new AbortController();options.signal=controller.signal;options.onProgress.mockImplementation(()=>controller.abort());
  await expect(buildMaceioPptx(slides,options)).rejects.toMatchObject({name:'AbortError'});expect(options.onProgress).toHaveBeenCalledOnce();
 });
 it('cancelamento não aguarda carregamento indefinido de fontes',async()=>{
  const {slides,options}=setup(),controller=new AbortController();options.signal=controller.signal;
  Object.defineProperty(document,'fonts',{configurable:true,value:{ready:new Promise(()=>{})}});
  const task=buildMaceioPptx(slides,options);setTimeout(()=>controller.abort(),5);await expect(task).rejects.toMatchObject({name:'AbortError'});
 });
 it('recupera imagem após falha HTTP e restaura atributos sem capturar a lâmina',async()=>{
  const {slides,options}=setup(),url='/assets/reference.png';
  slides[0].querySelector('svg')!.insertAdjacentHTML('afterbegin',`<image href="${url}" width="1280" height="720"/>`);
  const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3sAAAAASUVORK5CYII='),char=>char.charCodeAt(0));
  const request=vi.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:false}).mockResolvedValue({ok:true,blob:async()=>new DomBlob([png],{type:'image/png'})});vi.stubGlobal('fetch',request);
  // Cached failure and network retry both fail: the export rejects and keeps the original URL.
  await expect(buildMaceioPptx(slides,options)).rejects.toThrow('Tente exportar novamente');expect(slides[0].querySelector('image')!.getAttribute('href')).toBe(url);
  expect(request).toHaveBeenNthCalledWith(1,url,{signal:options.signal});expect(request).toHaveBeenNthCalledWith(2,url,{signal:options.signal,cache:'reload'});
  // A cached failure is retried from the network in the same attempt, so it cannot poison the export.
  const blob=await buildMaceioPptx(slides,options),files=unzipSync(new Uint8Array(await blob.arrayBuffer()));
  expect(request).toHaveBeenCalledTimes(4);expect(request).toHaveBeenNthCalledWith(3,url,{signal:options.signal});expect(request).toHaveBeenLastCalledWith(url,{signal:options.signal,cache:'reload'});expect(strFromU8(files['ppt/slides/slide1.xml'])).toContain('<p:pic>');expect(slides[0].querySelector('image')!.getAttribute('href')).toBe(url);expect(capture).not.toHaveBeenCalled();
 });
});
