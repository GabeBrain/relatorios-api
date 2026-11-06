import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { initialTerritorialGroups, normalizeTerritorialGroups, territorialPresentationErrors } from '../domain/territorial-presentation';
import type { TerritorialPresentation } from '../types';

export function TerritorialGroupsDialog({open,onOpenChange,cities,value,onConfirm}:{
  open:boolean;onOpenChange:(open:boolean)=>void;cities:string[];value?:TerritorialPresentation;onConfirm:(value:TerritorialPresentation)=>void;
}){
  const id=useId();
  const [selectedCity,setSelectedCity]=useState<string|null>(null);
  const [draggedCity,setDraggedCity]=useState<string|null>(null);
  const [dropTarget,setDropTarget]=useState<string|null>(null);
  const [announcement,setAnnouncement]=useState('');
  const [draft,setDraft]=useState(()=>initialTerritorialGroups(cities,value));
  useEffect(()=>{if(open){setDraft(initialTerritorialGroups(cities,value));setSelectedCity(null);setDraggedCity(null);setDropTarget(null);setAnnouncement('');}},[open,cities,value]);
  const units=draft.units??[];
  const errors=territorialPresentationErrors({cities,presentation:draft});
  const assigned=units.reduce((sum,u)=>sum+u.cities.length,0);
  function move(city:string,target:string){
    if(!cities.includes(city)||!units.some(u=>u.id===target))return;
    if(units.some(u=>u.id===target&&u.cities.includes(city))){setSelectedCity(null);return;}
    setSelectedCity(null);setDraggedCity(null);setDropTarget(null);
    setAnnouncement(`${city} movida para o grupo ${units.findIndex(u=>u.id===target)+1}.`);
    setDraft(current=>normalizeTerritorialGroups((current.units??[]).map(u=>{
      const members=[...u.cities.filter(c=>c!==city),...(u.id===target?[city]:[])];
      return {...u,cities:members,label:u.cities.length<=1&&members.length>1?'':u.label};
    })));
  }
  function resize(count:number){
    if(count===units.length)return;
    if(count===2){const next=units.slice(0,2).map(u=>({...u,cities:[...u.cities]}));next[1].cities.push(...units.slice(2).flatMap(u=>u.cities));if(units[1].cities.length<=1&&next[1].cities.length>1)next[1].label='';setDraft(normalizeTerritorialGroups(next));}
    else{const next=units.map(u=>({...u,cities:[...u.cities]}));const largest=[...next].sort((a,b)=>b.cities.length-a.cities.length)[0];const member=largest?.cities.length>1?largest.cities.pop():undefined;next.push({id:'group-3',label:'',cities:member?[member]:[]});setDraft(normalizeTerritorialGroups(next));}
  }
  function cityCard(city:string){
    return <button key={city} type="button" draggable aria-label={`Mover ${city}`} aria-pressed={selectedCity===city} aria-describedby={`${id}-move-hint`}
      data-territorial-city={city}
      onClick={()=>setSelectedCity(current=>current===city?null:city)}
      onDragStart={e=>{e.dataTransfer.setData('application/x-panorama-city',city);e.dataTransfer.effectAllowed='move';setDraggedCity(city);setSelectedCity(city);}}
      onDragEnd={()=>{setDraggedCity(null);setDropTarget(null);}}
      onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setSelectedCity(null);}}}
      className={cn('flex w-full cursor-grab items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left text-sm shadow-sm outline-none transition-[box-shadow,opacity] hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',selectedCity===city&&'border-primary ring-2 ring-primary/30',draggedCity===city&&'opacity-50')}>
      <span className="min-w-0 break-words">{city}</span>
    </button>;
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="w-[calc(100%_-_2rem)] max-w-2xl max-h-[calc(100dvh_-_2rem)] overflow-y-auto gap-4 rounded-xl" data-territorial-groups-dialog="">
    <DialogHeader><DialogTitle>Organizar cidades</DialogTitle><DialogDescription>O relatório mantém o consolidado e inclui as visões por cidade ou grupo. Distribua as {cities.length} cidades em dois ou três grupos.</DialogDescription></DialogHeader>
    <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Quantos grupos?</span><div className="flex gap-1 rounded-lg bg-muted p-1">{[2,3].map(n=><Button key={n} type="button" variant={units.length===n?'default':'ghost'} size="sm" className="h-8 px-3" aria-pressed={units.length===n} onClick={()=>resize(n)}>{n} grupos</Button>)}</div></div>
    <p id={`${id}-move-hint`} className="text-xs text-muted-foreground">Arraste os cartões de cidade para outro grupo. Você também pode tocar em uma cidade e escolher o destino.</p>
    <div className={cn('grid max-h-[min(48vh,420px)] gap-3 overflow-y-auto p-1',units.length===3?'sm:grid-cols-3':'sm:grid-cols-2')}>
      {units.map((unit,index)=><section key={unit.id} role="region" aria-label={`Grupo ${index+1}`} data-territorial-drop={unit.id}
        onDragOver={e=>{if(draggedCity){e.preventDefault();e.dataTransfer.dropEffect='move';setDropTarget(unit.id);}}}
        onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setDropTarget(null);}}
        onDrop={e=>{e.preventDefault();const city=e.dataTransfer.getData('application/x-panorama-city');if(city&&city===draggedCity)move(city,unit.id);setDropTarget(null);}}
        className={cn('min-w-0 rounded-lg border border-border bg-muted/40 p-3 transition-colors',dropTarget===unit.id&&'border-primary bg-primary/10 ring-2 ring-primary/30')}>
        <div className="mb-3 space-y-1.5"><label className="text-xs font-medium" htmlFor={`${id}-name-${unit.id}`}>Grupo {index+1} <span className="font-normal text-muted-foreground">· {unit.cities.length} {unit.cities.length===1?'cidade':'cidades'}</span></label>
          {unit.cities.length>1?<Input id={`${id}-name-${unit.id}`} aria-label={`Nome do grupo ${index+1}`} placeholder="Dê um nome ao grupo" maxLength={60} value={unit.label} className="h-9 bg-background" onChange={e=>setDraft(normalizeTerritorialGroups(units.map(u=>u.id===unit.id?{...u,label:e.target.value}:u)))}/>:<div id={`${id}-name-${unit.id}`} className="flex h-9 items-center px-1 text-sm font-medium" title={unit.label}><span className="truncate">{unit.cities[0]??'Grupo vazio'}</span></div>}
        </div>
        <div className="min-h-12 space-y-2">{unit.cities.map(city=>cityCard(city))}{!unit.cities.length&&<p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">Solte uma cidade aqui</p>}</div>
        {selectedCity&&!unit.cities.includes(selectedCity)&&<Button type="button" variant="outline" size="sm" className="mt-3 h-auto w-full whitespace-normal text-xs" onClick={()=>move(selectedCity,unit.id)}>Mover para grupo {index+1}</Button>}
      </section>)}
      {cities.some(city=>!units.some(u=>u.cities.includes(city)))&&<section className="space-y-2 rounded-lg border border-dashed border-border p-3 sm:col-span-full"><p className="text-xs font-medium">Cidades sem grupo</p>{cities.filter(city=>!units.some(u=>u.cities.includes(city))).map(city=>cityCard(city))}</section>}
    </div>
    <span className="sr-only" role="status">{announcement}</span>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground" role="status"><span>{assigned} de {cities.length} cidades atribuídas</span><span>{units.some(u=>!u.cities.length)?'Cada grupo precisa de ao menos uma cidade.':units.some(u=>u.cities.length>1&&!u.label.trim())?'Nomeie os grupos com mais de uma cidade.':errors.length?errors[0]:'Grupos prontos para gerar'}</span></div>
    <DialogFooter><Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button><Button type="button" disabled={errors.length>0} onClick={()=>onConfirm(normalizeTerritorialGroups(units.map(u=>({...u,label:u.label.trim()}))))}>Gerar relatório com grupos</Button></DialogFooter>
  </DialogContent></Dialog>;
}
