import { useEffect, useId, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { initialTerritorialGroups, normalizeTerritorialGroups, territorialPresentationErrors } from '../domain/territorial-presentation';
import type { TerritorialPresentation } from '../types';

export function TerritorialGroupsDialog({open,onOpenChange,cities,value,onConfirm}:{
  open:boolean;onOpenChange:(open:boolean)=>void;cities:string[];value?:TerritorialPresentation;onConfirm:(value:TerritorialPresentation)=>void;
}){
  const id=useId();
  const [draft,setDraft]=useState(()=>initialTerritorialGroups(cities,value));
  useEffect(()=>{if(open)setDraft(initialTerritorialGroups(cities,value));},[open,cities,value]);
  const units=draft.units??[];
  const errors=territorialPresentationErrors({cities,presentation:draft});
  const assigned=units.reduce((sum,u)=>sum+u.cities.length,0);
  function move(city:string,target:string){
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
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="w-[calc(100%_-_2rem)] max-w-2xl gap-4 rounded-xl" data-territorial-groups-dialog="">
    <DialogHeader><DialogTitle>Organizar cidades</DialogTitle><DialogDescription>O relatório mantém o consolidado e inclui as visões por cidade ou grupo. Distribua as {cities.length} cidades em dois ou três grupos.</DialogDescription></DialogHeader>
    <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Quantos grupos?</span><div className="flex gap-1 rounded-lg bg-muted p-1">{[2,3].map(n=><Button key={n} type="button" variant={units.length===n?'default':'ghost'} size="sm" className="h-8 px-3" aria-pressed={units.length===n} onClick={()=>resize(n)}>{n} grupos</Button>)}</div></div>
    <div className="grid gap-3" style={{gridTemplateColumns:`repeat(${units.length},minmax(0,1fr))`}}>{units.map((unit,index)=><div key={unit.id} className="min-w-0 space-y-1"><label className="text-xs font-medium" htmlFor={`${id}-name-${unit.id}`}>Grupo {index+1} <span className="font-normal text-muted-foreground">· {unit.cities.length}</span></label>
      {unit.cities.length>1?<Input id={`${id}-name-${unit.id}`} aria-label={`Nome do grupo ${index+1}`} placeholder="Nome do grupo" maxLength={60} value={unit.label} className="h-9" onChange={e=>setDraft(normalizeTerritorialGroups(units.map(u=>u.id===unit.id?{...u,label:e.target.value}:u)))}/>:<div id={`${id}-name-${unit.id}`} className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm" title={unit.label}><span className="truncate">{unit.cities[0]??'Escolha uma cidade'}</span></div>}
    </div>)}</div>
    <div className="max-h-[min(42vh,320px)] overflow-y-auto rounded-lg border border-border">
      <div className="sticky top-0 z-10 grid items-center gap-3 border-b bg-muted px-3 py-2 text-xs font-medium" style={{gridTemplateColumns:`minmax(0,1fr) repeat(${units.length},40px)`}}><span>Cidade</span>{units.map((u,i)=><span key={u.id} className="text-center">{i+1}</span>)}</div>
      {cities.map((city,cityIndex)=><div key={city} role="radiogroup" aria-label={`Grupo de ${city}`} className="grid items-center gap-3 border-b border-border/60 px-3 py-2 last:border-0" style={{gridTemplateColumns:`minmax(0,1fr) repeat(${units.length},40px)`}}><span className="text-sm leading-tight">{city}</span>{units.map((unit,index)=><label key={unit.id} className="cursor-pointer" title={unit.label||`Grupo ${index+1}`}><input type="radio" className="peer sr-only" name={`${id}-city-${cityIndex}`} aria-label={`${city} no grupo ${index+1}`} checked={unit.cities.includes(city)} onChange={()=>move(city,unit.id)}/><span aria-hidden="true" className="flex h-8 w-10 items-center justify-center rounded-md border border-border text-xs text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">{index+1}</span></label>)}</div>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground" role="status"><span>{assigned} de {cities.length} cidades atribuídas</span><span>{units.some(u=>!u.cities.length)?'Cada grupo precisa de ao menos uma cidade.':units.some(u=>u.cities.length>1&&!u.label.trim())?'Nomeie os grupos com mais de uma cidade.':errors.length?errors[0]:'Grupos prontos para gerar'}</span></div>
    <DialogFooter><Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button><Button type="button" disabled={errors.length>0} onClick={()=>onConfirm(normalizeTerritorialGroups(units.map(u=>({...u,label:u.label.trim()}))))}>Gerar relatório com grupos</Button></DialogFooter>
  </DialogContent></Dialog>;
}
