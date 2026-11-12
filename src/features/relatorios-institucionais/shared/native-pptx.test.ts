import {Blob as BrowserBlob} from 'node:buffer';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import PptxGenJS from 'pptxgenjs';
import {unzipSync,strFromU8} from 'fflate';
import {addNativePptxSlide,patchNativePptx,type NativePatch} from './native-pptx';
const capture=vi.hoisted(()=>vi.fn());vi.mock('html-to-image',()=>({toPng:capture}));
beforeEach(()=>{vi.stubGlobal('Blob',BrowserBlob);capture.mockReset();Object.defineProperty(document,'fonts',{configurable:true,value:{ready:Promise.resolve()}});});
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();vi.unstubAllGlobals();});
const decode=async(pptx:PptxGenJS,patches:NativePatch[])=>{const blob=await pptx.write({outputType:'blob'}) as Blob;const zip=unzipSync(patchNativePptx(new Uint8Array(await blob.arrayBuffer()),patches));return new DOMParser().parseFromString(strFromU8(zip['ppt/slides/slide1.xml']),'application/xml');};
describe('PPTX nativo compartilhado',()=>{
 it('gera tabela real com células editadas, branco no corpo e sem captura da lâmina',async()=>{
  const root=document.createElement('div');root.innerHTML=`<svg><g data-native-table="launches"><g data-native-cell="0:0"><rect x="40" y="100" width="200" height="30" style="fill:white"/><foreignObject><div style="text-align:center;padding-left:3px;padding-right:3px"><span style="font-size:16px;color:rgb(26,61,87);font-weight:700">Empreendimento</span></div></foreignObject></g><g data-native-cell="1:0"><rect x="40" y="130" width="200" height="30" style="fill:none"/><foreignObject><div style="text-align:center;padding-left:3px;padding-right:3px"><span data-slide-text-id="text-1" style="font-size:16px;color:rgb(255,255,255);visibility:hidden">Valor original</span></div></foreignObject></g></g><text data-slide-edit-source="text-1" style="fill:rgb(255,255,255);font-size:16px">Célula revisada</text></svg>`;document.body.append(root);
  vi.spyOn(Element.prototype,'getBoundingClientRect').mockImplementation(function(this:Element){const rect=this.localName==='rect',x=rect?Number(this.getAttribute('x')):0,y=rect?Number(this.getAttribute('y')):0,w=rect?200:1280,h=rect?30:720;return {x,y,left:x,top:y,right:x+w,bottom:y+h,width:w,height:h,toJSON:()=>({})};});
  const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';const patches:NativePatch[]=[];await addNativePptxSlide(pptx,root,new AbortController().signal,patches);const xml=await decode(pptx,patches);
  expect(xml.getElementsByTagName('parsererror')).toHaveLength(0);expect(xml.getElementsByTagName('a:tbl')).toHaveLength(1);expect(xml.getElementsByTagName('a:tc')).toHaveLength(2);
  const values=[...xml.getElementsByTagName('a:t')].map(node=>node.textContent);expect(values).toEqual(['Empreendimento','Célula revisada']);expect(xml.getElementsByTagName('a:tr')[1].getElementsByTagName('a:srgbClr')[0].getAttribute('val')).toBe('ffffff');expect(capture).not.toHaveBeenCalled();expect(root).toHaveTextContent('Valor original');
 });
 it('substitui geometria mantendo ID e ordem dos objetos, sem rasterizar o vetor',async()=>{
  const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';const page=pptx.addSlide();page.addShape(pptx.ShapeType.rect,{x:1,y:2,w:3,h:4,objectName:'vector-test',fill:{color:'42CCA2'}});page.addText('Rótulo',{x:1,y:2,w:3,h:1});
  const geometry='<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="100000" h="100000"><a:moveTo><a:pt x="0" y="100000"/></a:moveTo><a:lnTo><a:pt x="50000" y="0"/></a:lnTo><a:lnTo><a:pt x="100000" y="100000"/></a:lnTo><a:close/></a:path></a:pathLst></a:custGeom>';
  const xml=await decode(pptx,[{name:'vector-test',geometry}]);expect(xml.getElementsByTagName('a:custGeom')).toHaveLength(1);expect(xml.getElementsByTagName('p:pic')).toHaveLength(0);expect(xml.getElementsByTagName('p:cNvPr')[1].getAttribute('name')).toBe('vector-test');expect(xml.getElementsByTagName('a:t')[0].textContent).toBe('Rótulo');expect(capture).not.toHaveBeenCalled();
 });
});
