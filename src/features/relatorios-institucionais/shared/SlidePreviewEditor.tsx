import type {useSlidePreviewEditing} from './useSlidePreviewEditing';
import { useLayoutEffect,useRef,useState,type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';

export interface SlideTextElement {id:string;text:string;x:number;y:number;fontPt:number;color:string;bold:boolean;anchor:'start'|'middle'|'end'}
export interface SlideTextEdit extends SlideTextElement {sourceText:string;hidden?:boolean;added?:boolean}
export type SlideEdits=Record<number,Record<string,SlideTextEdit>>;
export type SlidePreviewEditing=ReturnType<typeof useSlidePreviewEditing>;
const colorHex=(value:string)=>value.startsWith('#')?value:`#${(value.match(/[\d.]+/g)??['38','38','38']).slice(0,3).map(value=>Math.round(Number(value)).toString(16).padStart(2,'0')).join('')}`;

/** The source remains intact. Manual text is rendered in its own auditable SVG layer. */
export function EditableSlideSurface({page,edits={},enabled=false,onElements,onSelect,children}:{page:number;edits?:Record<string,SlideTextEdit>;enabled?:boolean;onElements?:(value:SlideTextElement[])=>void;onSelect?:(id:string)=>void;children:ReactNode}){
  const root=useRef<HTMLDivElement>(null),last=useRef('');
  const [elements,setElements]=useState<SlideTextElement[]>([]);
  useLayoutEffect(()=>{
    const host=root.current;if(!host)return;const frame=host.getBoundingClientRect();if(!frame.width||!frame.height)return;
    const nodes=[...host.querySelectorAll<HTMLElement|SVGTextElement>('svg text,foreignObject span')].filter(node=>!node.closest('[data-manual-slide-layer]'));
    const originals=nodes.map(node=>node.getAttribute('style'));
    const discovered:SlideTextElement[]=[];
    for(const [index,node] of nodes.entries()){
      node.style.fontFamily='Tahoma, Arial, sans-serif';
      const before=getComputedStyle(node),r=node.getBoundingClientRect(),fontPx=parseFloat(before.fontSize),top=(r.top-frame.top)*720/frame.height;
      const value=node.textContent??'';
      if(node instanceof SVGTextElement&&top<125&&fontPx>=24&&(Number(before.fontWeight)>=600||before.fontWeight==='bold')&&value.replace(/[\d\W_]/g,'').length>=6)node.style.fontSize=`${Math.max(40,fontPx)}px`;
      const style=getComputedStyle(node),cell=node.closest('[data-native-cell]');let box=node.getBoundingClientRect();
      if(cell){const range=document.createRange();range.selectNodeContents(node);if(typeof range.getBoundingClientRect==='function')box=range.getBoundingClientRect();}
      if(!value.trim()||!box.width||!box.height||style.display==='none')continue;
      const align=cell?getComputedStyle(node.parentElement!).textAlign:style.textAnchor;
      const anchor=align==='middle'||align==='center'?'middle':align==='end'||align==='right'?'end':'start',x=(box.left-frame.left+(anchor==='middle'?box.width/2:anchor==='end'?box.width:0))*1280/frame.width;
      node.setAttribute('data-slide-text-id',`text-${index}`);
      discovered.push({id:`text-${index}`,text:value,x,y:(box.top-frame.top)*720/frame.height,fontPt:parseFloat(style.fontSize)*.75,color:colorHex(node instanceof SVGTextElement?style.fill:style.color),bold:Number(style.fontWeight)>=600||style.fontWeight==='bold',anchor});
      if(edits[`text-${index}`])node.style.visibility='hidden';
    }
    const signature=JSON.stringify(discovered);
    if(signature!==last.current){last.current=signature;setElements(discovered);onElements?.(discovered);}
    return ()=>nodes.forEach((node,index)=>{if(originals[index]===null)node.removeAttribute('style');else node.setAttribute('style',originals[index]!);});
  },[children,edits,onElements,page]);
  return <div ref={root} className="relative h-full w-full" style={{aspectRatio:'16 / 9',fontFamily:'Tahoma, Arial, sans-serif'}} data-editable-slide={page}>{children}
    <svg data-manual-slide-layer="true" viewBox="0 0 1280 720" className="pointer-events-none absolute inset-0 h-full w-full" aria-label="Ajustes manuais do slide">
      {Object.values(edits).filter(edit=>!edit.hidden).map(edit=><text key={edit.id} data-slide-edit-source={edit.id} data-slide-edit-hidden={edit.hidden?'true':undefined} x={edit.x} y={edit.y} dominantBaseline="text-before-edge" textAnchor={edit.anchor} fontFamily="Tahoma" fontSize={edit.fontPt*4/3} fontWeight={edit.bold?700:400} fill={edit.color}>{edit.text.split('\n').map((line,index)=><tspan key={index} x={edit.x} dy={index?edit.fontPt*4/3*1.2:0}>{line||' '}</tspan>)}</text>)}
    </svg>
    {enabled&&<svg data-manual-slide-layer="true" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full" aria-label="Selecionar texto para editar">{[...elements,...Object.values(edits).filter(edit=>edit.added)].map(element=>{const value=edits[element.id]??element,width=Math.min(1120,Math.max(60,value.text.length*value.fontPt*.75)),x=value.x-(value.anchor==='middle'?width/2:value.anchor==='end'?width:0);return <rect key={value.id} data-slide-select={value.id} role="button" tabIndex={0} aria-label={`Editar: ${value.text}`} x={x} y={value.y} width={width} height={Math.max(24,value.fontPt*1.8)} fill="transparent" stroke="currentColor" strokeOpacity={.2} style={{cursor:'text'}} onClick={()=>onSelect?.(value.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect?.(value.id);}}}><title>{value.text}</title></rect>;})}</svg>}
  </div>;
}
export function SlidePreviewEditor({page,state}:{page:number;state:SlidePreviewEditing}){
  const {edits,setEdits,enabled,setEnabled,elements,selected,setSelected}=state,own=edits[page]??{},options=[...elements,...Object.values(own).filter(edit=>edit.added)],original=options.find(element=>element.id===selected),value=own[selected]??original;
  const update=(patch:Partial<SlideTextEdit>)=>{if(!value)return;setEdits(current=>({...current,[page]:{...current[page],[value.id]:{...value,sourceText:own[selected]?.sourceText??value.text,...patch}}}));};
  return <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer font-semibold">Editar este slide na prévia</summary><div className="mt-4 space-y-4">
    <p className="text-sm text-muted-foreground">Altere textos, tamanho, cor e posição; adicione anotações. A prévia e os arquivos usam os mesmos ajustes. Valores manuais não recalculam gráficos ou indicadores e ficam identificados na auditoria. As fotos têm seus controles de equipe/consultoria.</p>
    <div className="flex items-center gap-2"><Checkbox id="slide-text-selection" checked={enabled} onCheckedChange={value=>setEnabled(value===true)}/><Label htmlFor="slide-text-selection">Selecionar textos clicando no slide</Label></div>
    <div className="space-y-2"><Label htmlFor="slide-text-element">Texto do slide {page}</Label><Select value={selected} onValueChange={setSelected}><SelectTrigger id="slide-text-element"><SelectValue placeholder="Escolha um texto ou clique no slide"/></SelectTrigger><SelectContent>{options.map(element=><SelectItem key={element.id} value={element.id}>{(own[element.id]?.text??element.text).slice(0,90)||'Texto vazio'}</SelectItem>)}</SelectContent></Select></div>
    {value&&<><div className="space-y-2"><Label htmlFor="slide-manual-text">Conteúdo</Label><Textarea id="slide-manual-text" value={value.text} maxLength={2000} rows={3} onChange={event=>update({text:event.target.value})}/></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div><Label htmlFor="slide-font-size">Tamanho (pt)</Label><Input id="slide-font-size" type="number" min={6} max={96} value={value.fontPt} onChange={event=>{const fontPt=Number(event.target.value);if(Number.isFinite(fontPt)&&fontPt>=6&&fontPt<=96)update({fontPt});}}/></div>
      <div><Label htmlFor="slide-text-color">Cor</Label><Input id="slide-text-color" type="color" value={value.color} onChange={event=>update({color:event.target.value})}/></div>
      <div><Label htmlFor="slide-text-x">Posição X</Label><Input id="slide-text-x" type="number" value={Math.round(value.x)} onChange={event=>{const x=Number(event.target.value);if(Number.isFinite(x))update({x});}}/></div>
      <div><Label htmlFor="slide-text-y">Posição Y</Label><Input id="slide-text-y" type="number" value={Math.round(value.y)} onChange={event=>{const y=Number(event.target.value);if(Number.isFinite(y))update({y});}}/></div>
    </div><div className="flex flex-wrap gap-4"><Label className="flex items-center gap-2"><Checkbox checked={value.bold} onCheckedChange={bold=>update({bold:bold===true})}/>Negrito</Label><Label className="flex items-center gap-2"><Checkbox checked={'hidden' in value&&value.hidden===true} onCheckedChange={hidden=>update({hidden:hidden===true})}/>Ocultar texto</Label></div><Button variant="outline" onClick={()=>setEdits(current=>{const own={...current[page]};delete own[selected];return {...current,[page]:own};})}>Restaurar texto</Button></>}
    <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={()=>{const id=`added-${Date.now()}`,entry:SlideTextEdit={id,sourceText:'',text:'Nova anotação',x:80,y:220,fontPt:20,color:'#262626',bold:false,anchor:'start',added:true};setEdits(current=>({...current,[page]:{...current[page],[id]:entry}}));setSelected(id);setEnabled(true);}}>Adicionar texto</Button><Button variant="outline" onClick={()=>{setEdits(current=>{const next={...current};delete next[page];return next;});setSelected('');}}>Restaurar slide {page}</Button></div>
    <p className="text-xs text-muted-foreground">{Object.keys(own).length} ajuste(s) neste slide · fontes originais e dados da API preservados. Uma nova competência restaura os textos gerados.</p>
  </div></details>;
}
