import type PptxGenJS from 'pptxgenjs';
import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';

const W=13.333333,H=7.5,EMU=914400;
const xml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const color=(value:string,fallback='000000')=>value.startsWith('url(')?fallback:value.startsWith('#')?value.slice(1):value.match(/[\d.]+/g)?.slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join('')??fallback;
const transparent=(value:string)=>!value||value==='none'||value==='transparent'||value==='rgba(0, 0, 0, 0)';
const check=(signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('Exportação cancelada.','AbortError');};
export interface NativePatch {name:string;geometry?:string;fill?:string;table?:string}
interface Box {x:number;y:number;w:number;h:number}
const solid=(value:string,opacity=1)=>transparent(value)?'<a:noFill/>':`<a:solidFill><a:srgbClr val="${color(value)}"><a:alpha val="${Math.round(opacity*100000)}"/></a:srgbClr></a:solidFill>`;

/** No slide/chart screenshot: every visible primitive becomes a DrawingML object. */
export async function addNativePptxSlide(pptx:PptxGenJS,root:HTMLElement,signal:AbortSignal,patches:NativePatch[]){
 check(signal);await document.fonts?.ready;
 const page=pptx.addSlide(),frame=root.getBoundingClientRect(),sx=W/frame.width,sy=H/frame.height;
 if(!frame.width||!frame.height)throw new Error('Slide sem dimensões para exportar.');
 const box=(element:Element):Box=>{const r=element.getBoundingClientRect();return {x:(r.left-frame.left)*sx,y:(r.top-frame.top)*sy,w:r.width*sx,h:r.height*sy};};
 const unique=()=>`native-${patches.length}`;
 const photo=async(element:Element)=>{
   const {toPng}=await import('html-to-image'),b=box(element);if(!b.w||!b.h)return;
   const source=element.querySelector('img,image'),image=new Image(),url=source instanceof HTMLImageElement?source.currentSrc||source.src:source?.getAttribute('href')??'';
   if(url){image.src=url;await image.decode();}check(signal);
   const r=element.getBoundingClientRect(),ratio=image.naturalWidth?Math.max(1,Math.min(8,image.naturalWidth/r.width,image.naturalHeight/r.height)):2;
   const data=await toPng(element as HTMLElement,{pixelRatio:ratio,width:r.width,height:r.height,cacheBust:false,style:{position:'relative',left:'0',top:'0',right:'auto',bottom:'auto',margin:'0',transform:'none'}});check(signal);
   page.addImage({data,...b,objectName:`Foto editável: ${element.getAttribute('data-sp-editable-photo')??element.getAttribute('data-fortaleza-editable-photo')??''}`});
 };
 const image=async(element:HTMLImageElement|SVGImageElement)=>{
   const b=box(element);if(!b.w||!b.h)return;
   const url=element instanceof HTMLImageElement?element.currentSrc||element.src:element.getAttribute('href')??element.getAttribute('xlink:href')??'';
   if(!url)return;
   let data=url;
   if(!url.startsWith('data:')){const response=await fetch(url,{signal});if(!response.ok)throw new Error('Não foi possível carregar uma imagem para o PPTX.');const blob=await response.blob();data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});}
   check(signal);page.addImage({data,...b,objectName:element.getAttribute('alt')??'Imagem substituível da referência'});
 };
 const shape=(element:SVGGeometryElement)=>{
   const style=getComputedStyle(element),matrix=element.getScreenCTM();if(!matrix)return;
   const fill=style.fill,stroke=style.stroke;if(transparent(fill)&&transparent(stroke))return;
   let points:DOMPoint[]=[];let closed=['rect','circle','ellipse','polygon'].includes(element.localName);
   const point=(x:number,y:number)=>new DOMPoint(x,y).matrixTransform(matrix);
   if(element instanceof SVGLineElement)points=[point(element.x1.baseVal.value,element.y1.baseVal.value),point(element.x2.baseVal.value,element.y2.baseVal.value)];
   else if(element instanceof SVGPolygonElement||element instanceof SVGPolylineElement){points=Array.from({length:element.points.numberOfItems},(_,i)=>{const p=element.points.getItem(i);return point(p.x,p.y);});}
   else if(element instanceof SVGRectElement&&!element.rx.baseVal.value&&!element.ry.baseVal.value){const x=element.x.baseVal.value,y=element.y.baseVal.value,w=element.width.baseVal.value,h=element.height.baseVal.value;points=[point(x,y),point(x+w,y),point(x+w,y+h),point(x,y+h)];}
   else {const length=element.getTotalLength();if(!Number.isFinite(length)||length<=0)return;const count=Math.max(24,Math.min(400,Math.ceil(length/3)));points=Array.from({length:count+1},(_,i)=>{const p=element.getPointAtLength(length*i/count);return point(p.x,p.y);});closed=closed||/[zZ]\s*$/.test(element.getAttribute('d')??'');}
   if(!points.length)return;
   const xs=points.map(p=>(p.x-frame.left)*sx),ys=points.map(p=>(p.y-frame.top)*sy),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(.0001,Math.max(...xs)-x),h=Math.max(.0001,Math.max(...ys)-y),name=unique();
   const local=points.map((_,i)=>({x:Math.round((xs[i]-x)/w*100000),y:Math.round((ys[i]-y)/h*100000)}));
   const geometry=`<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="100000" h="100000"><a:moveTo><a:pt x="${local[0].x}" y="${local[0].y}"/></a:moveTo>${local.slice(1).map(p=>`<a:lnTo><a:pt x="${p.x}" y="${p.y}"/></a:lnTo>`).join('')}${closed?'<a:close/>':''}</a:path></a:pathLst></a:custGeom>`;
   const gradientId=fill.match(/url\(["']?#([^"')]+)/)?.[1],gradient=gradientId?root.querySelector(`[id="${gradientId}"]`):null;
   const gradientFill=gradient?`<a:gradFill rotWithShape="1"><a:gsLst>${[...gradient.querySelectorAll('stop')].map(stop=>{const offset=stop.getAttribute('offset')??'0',position=offset.endsWith('%')?parseFloat(offset)*1000:parseFloat(offset)*100000,stopStyle=getComputedStyle(stop);return `<a:gs pos="${Math.round(position)}">${solid(stopStyle.stopColor,Number(stopStyle.stopOpacity||1)).replace('<a:solidFill>','').replace('</a:solidFill>','')}</a:gs>`;}).join('')}</a:gsLst><a:lin ang="0" scaled="1"/></a:gradFill>`:undefined;
   patches.push({name,geometry,fill:gradientFill});
   const scale=Math.hypot(matrix.a,matrix.b)*sx*72,opacity=Number(style.opacity||1);
   page.addShape(pptx.ShapeType.rect,{x,y,w,h,objectName:name,fill:{color:color(fill),transparency:transparent(fill)?100:100-Number(style.fillOpacity||1)*opacity*100},line:{color:color(stroke),transparency:transparent(stroke)?100:100-Number(style.strokeOpacity||1)*opacity*100,width:parseFloat(style.strokeWidth)*scale,dashType:style.strokeDasharray==='none'?'solid':'dash'}});
 };
 const text=(element:SVGTextElement)=>{
   if(typeof element.getNumberOfChars!=='function'){
     const b=box(element),style=getComputedStyle(element);if(b.w&&b.h&&element.textContent?.trim())page.addText(element.textContent,{...b,fontFace:'Tahoma',fontSize:parseFloat(style.fontSize)*sx*72,color:color(style.fill),margin:0,wrap:false,objectName:'Texto SVG editável'});return;
   }
   const count=element.getNumberOfChars(),matrix=element.getScreenCTM(),style=getComputedStyle(element);if(!count||!matrix)return;
   const angle=Math.atan2(matrix.b,matrix.a)*180/Math.PI,scale=Math.hypot(matrix.a,matrix.b)*sx;
   const lines:{value:string;x:number;y:number;right:number;bottom:number}[]=[];
   const chars=element.textContent??'';
   for(let i=0;i<count;i++){
     const extent=element.getExtentOfChar(i),last=lines.at(-1),value=chars[i]??'';
     if(last&&Math.abs(last.y-extent.y)<1){last.value+=value;last.right=Math.max(last.right,extent.x+extent.width);last.bottom=Math.max(last.bottom,extent.y+extent.height);}
     else lines.push({value,x:extent.x,y:extent.y,right:extent.x+extent.width,bottom:extent.y+extent.height});
   }
   for(const line of lines){if(!line.value.trim())continue;const w=(line.right-line.x)*scale,h=(line.bottom-line.y)*scale,center=new DOMPoint((line.x+line.right)/2,(line.y+line.bottom)/2).matrixTransform(matrix);
     page.addText(line.value,{x:(center.x-frame.left)*sx-w/2,y:(center.y-frame.top)*sy-h/2,w:w+.015,h:h+.01,fontFace:'Tahoma',fontSize:parseFloat(style.fontSize)*scale*72,color:color(style.fill),bold:Number(style.fontWeight)>=600||style.fontWeight==='bold',italic:style.fontStyle==='italic',rotate:(angle+360)%360,margin:0,wrap:false,breakLine:false,fit:'shrink',valign:'middle',objectName:`Texto editável: ${line.value.slice(0,60)}`});
   }
 };
 const table=(element:Element)=>{
   const cells=[...element.querySelectorAll<SVGGElement>('[data-native-cell]')];if(!cells.length)return;
   const rows=new Map<number,typeof cells>();
   for(const cell of cells){const [r]=cell.dataset.nativeCell!.split(':').map(Number);rows.set(r,[...(rows.get(r)??[]),cell]);}
   const numbers=[...rows.keys()].sort((a,b)=>a-b),first=rows.get(numbers[0])!.sort((a,b)=>Number(a.dataset.nativeCell!.split(':')[1])-Number(b.dataset.nativeCell!.split(':')[1])),rects=first.map(cell=>box(cell.querySelector('rect')!)),x=rects[0].x,y=rects[0].y,w=rects.reduce((sum,b)=>sum+b.w,0),heights=numbers.map(r=>box(rows.get(r)![0].querySelector('rect')!).h),h=heights.reduce((sum,v)=>sum+v,0),name=unique();
   const replacement=(cell:Element)=>{const source=cell.querySelector<HTMLElement>('[data-slide-text-id]'),id=source?.getAttribute('data-slide-text-id');return id?root.querySelector<SVGTextElement>(`[data-slide-edit-source="${id}"]`):null;};
   const contents=numbers.map((r,index)=>`<a:tr h="${Math.round(heights[index]*EMU)}">${rows.get(r)!.sort((a,b)=>Number(a.dataset.nativeCell!.split(':')[1])-Number(b.dataset.nativeCell!.split(':')[1])).map(cell=>{
     const source=cell.querySelector<HTMLElement>('span')!,manual=replacement(cell),hidden=getComputedStyle(source).visibility==='hidden'&&!manual,style=getComputedStyle(manual??source),value=hidden?'':(manual??source).textContent??'',size=parseFloat(style.fontSize)*sx*72*frame.width/1280,fill=manual?style.fill:style.color,rect=cell.querySelector('rect')!,background=getComputedStyle(rect).fill,div=cell.querySelector('div')!,align=getComputedStyle(div).textAlign==='left'?'l':getComputedStyle(div).textAlign==='right'?'r':'ctr';
     const fontSize=Math.round(size*100),paragraphs=value.split('\n').map(line=>`<a:p><a:pPr algn="${align}"/><a:r><a:rPr lang="pt-BR" sz="${fontSize}" b="${Number(style.fontWeight)>=600?1:0}">${solid(fill)}<a:latin typeface="Tahoma"/></a:rPr><a:t>${xml(line)}</a:t></a:r><a:endParaRPr sz="${fontSize}"/></a:p>`).join('');
     return `<a:tc><a:txBody><a:bodyPr wrap="square" anchor="ctr"/><a:lstStyle/>${paragraphs}</a:txBody><a:tcPr marL="${Math.round(parseFloat(getComputedStyle(div).paddingLeft||'0')*sx*EMU)}" marR="${Math.round(parseFloat(getComputedStyle(div).paddingRight||'0')*sx*EMU)}" marT="0" marB="0">${['L','R','T','B'].map(side=>`<a:ln${side} w="6350">${solid('#FFFFFF')}<a:prstDash val="solid"/></a:ln${side}>`).join('')}${solid(background)}</a:tcPr></a:tc>`;
   }).join('')}</a:tr>`).join('');
   const tableXml=`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="NATIVE_ID" name="Tabela editável de lançamentos"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${Math.round(x*EMU)}" y="${Math.round(y*EMU)}"/><a:ext cx="${Math.round(w*EMU)}" cy="${Math.round(h*EMU)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr/><a:tblGrid>${rects.map(b=>`<a:gridCol w="${Math.round(b.w*EMU)}"/>`).join('')}</a:tblGrid>${contents}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
   patches.push({name,table:tableXml});page.addShape(pptx.ShapeType.rect,{x,y,w,h,objectName:name,line:{color:'FFFFFF',transparency:100},fill:{color:'FFFFFF',transparency:100}});
 };
 const visit=async(element:Element):Promise<void>=>{
   check(signal);const style=getComputedStyle(element);
   if(element.classList.contains('sr-only')||style.display==='none'||style.visibility==='hidden'||style.opacity==='0'||['defs','title','desc','clipPath','style','script'].includes(element.localName))return;
   if(element.hasAttribute('data-manual-slide-layer')&&element.getAttribute('aria-label')==='Selecionar texto para editar')return;
   if(element.hasAttribute('data-slide-edit-source')){const id=element.getAttribute('data-slide-edit-source'),source=root.querySelector(`[data-slide-text-id="${id}"]`);if(source?.closest('[data-native-table]'))return;}
   if(element.hasAttribute('data-native-table')){table(element);return;}
   if(element.hasAttribute('data-sp-editable-photo')||element.hasAttribute('data-fortaleza-editable-photo')){await photo(element);return;}
   if(element instanceof HTMLImageElement||element.localName==='image'){await image(element as HTMLImageElement|SVGImageElement);return;}
   if(element.localName==='text'){text(element as SVGTextElement);return;}
   if(typeof SVGGeometryElement!=='undefined'&&element instanceof SVGGeometryElement){shape(element);return;}
   if(element instanceof HTMLCanvasElement){page.addImage({data:element.toDataURL('image/png'),...box(element),objectName:'Base cartográfica substituível'});return;}
   if(element instanceof HTMLElement){
     if(!transparent(style.backgroundColor)){const b=box(element);if(b.w&&b.h)page.addShape(pptx.ShapeType.rect,{...b,fill:{color:color(style.backgroundColor)},line:{transparency:100},objectName:'Fundo editável'});}
     for(const node of [...element.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent?.trim())){const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();if(!r.width||!r.height)continue;page.addText(node.textContent!,{x:(r.left-frame.left)*sx,y:(r.top-frame.top)*sy,w:r.width*sx+.02,h:r.height*sy+.01,fontFace:'Tahoma',fontSize:parseFloat(style.fontSize)*sx*72,color:color(style.color),margin:0,wrap:false,fit:'shrink',objectName:'Texto HTML editável'});}
   }
   for(const child of [...element.children])await visit(child);
 };
 await visit(root);return page;
}

/** Replace placeholders with native tables and freeform paths, keeping object IDs and paint order. */
export function patchNativePptx(bytes:Uint8Array,patches:NativePatch[]){
 const files=unzipSync(bytes),byName=new Map(patches.map(patch=>[patch.name,patch]));
 for(const path of Object.keys(files).filter(path=>/^ppt\/slides\/slide\d+\.xml$/.test(path))){
   const document=new DOMParser().parseFromString(strFromU8(files[path]),'application/xml');
   for(const shape of [...document.getElementsByTagName('p:sp')]){
     const identity=shape.getElementsByTagName('p:cNvPr')[0],patch=byName.get(identity?.getAttribute('name')??'');if(!patch)continue;
     const markup=patch.table?.replace('NATIVE_ID',identity.getAttribute('id')!)??patch.geometry!;
     const parsed=new DOMParser().parseFromString(`<root xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${markup}</root>`,'application/xml');
     const replacement=document.importNode(parsed.documentElement.firstElementChild!,true);
     if(patch.table)shape.replaceWith(replacement);else {
       shape.getElementsByTagName('a:prstGeom')[0].replaceWith(replacement);
       if(patch.fill){const fillDocument=new DOMParser().parseFromString(`<root xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${patch.fill}</root>`,'application/xml'),properties=shape.getElementsByTagName('p:spPr')[0],existing=[...properties.children].find(child=>['solidFill','noFill','gradFill'].includes(child.localName));existing?.replaceWith(document.importNode(fillDocument.documentElement.firstElementChild!,true));}
     }
   }
   files[path]=strToU8(new XMLSerializer().serializeToString(document));
 }
 return zipSync(files,{level:6});
}
