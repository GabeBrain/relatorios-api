import { useEffect,useRef,useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { createSpPeople,readSpPhoto,type SpPeople,type SpPeopleGroup,type SpPerson } from './people';
export function SpPeopleEditor({people,onChange,onPreview}:{people:SpPeople;onChange:(next:SpPeople)=>void;onPreview:(page:number)=>void}) {
  const [group,setGroup]=useState<SpPeopleGroup>('team'),[index,setIndex]=useState(0),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const [open,setOpen]=useState(false);
  const version=useRef(0);useEffect(()=>()=>{version.current++;},[]);
  const latest=useRef(people);latest.current=people;
  const person=people[group][index];
  const update=(patch:Partial<SpPerson>)=>onChange({...latest.current,[group]:latest.current[group].map((entry,i)=>i===index?{...entry,...patch}:entry)});
  const invalidate=()=>{version.current++;setLoading(false);setError('');};
  return <details open={open} className="rounded-lg border bg-card p-4"><summary onClick={event=>{event.preventDefault();setOpen(value=>!value);}} className="cursor-pointer font-semibold">Personalizar equipe técnica e consultoria</summary>{open&&<div className="mt-4 space-y-4">
    <p className="text-sm text-muted-foreground">Altere nomes, cargos e fotos antes de baixar o PowerPoint. As alterações valem para esta prévia e sua exportação; uma nova geração restaura a equipe de referência. Fotos ficam apenas na memória desta página.</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="sp-people-group">Slide</Label><Select value={group} onValueChange={value=>{invalidate();setGroup(value as SpPeopleGroup);setIndex(0);onPreview(value==='team'?82:83);}}><SelectTrigger id="sp-people-group"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="team">82 · Equipe técnica</SelectItem><SelectItem value="consulting">83 · Consultoria</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="sp-people-person">Pessoa</Label><Select value={String(index)} onValueChange={value=>{invalidate();setIndex(Number(value));}}><SelectTrigger id="sp-people-person"><SelectValue/></SelectTrigger><SelectContent>{people[group].map((entry,i)=><SelectItem key={i} value={String(i)}>{i+1} · {entry.name||'Sem nome'}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="sp-people-name">Nome</Label><Input id="sp-people-name" value={person.name} maxLength={48} onChange={event=>update({name:event.target.value})}/></div><div className="space-y-2"><Label htmlFor="sp-people-role">Cargo ou função</Label><Textarea id="sp-people-role" value={person.role} maxLength={90} rows={2} onChange={event=>update({role:event.target.value})}/></div></div>
    <div className="space-y-2"><Label htmlFor="sp-people-photo">Foto (PNG, JPG ou WebP, até 2 MB)</Label><Input id="sp-people-photo" type="file" accept="image/png,image/jpeg,image/webp" disabled={loading} onChange={async event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return;
      const current=++version.current;setError('');setLoading(true);
      try{const photo=await readSpPhoto(file);if(current===version.current)update({photo});}
      catch(cause){if(current===version.current)setError(cause instanceof Error?cause.message:'Não foi possível carregar a foto.');}
      finally{if(current===version.current)setLoading(false);}
    }}/>{loading&&<BrainLoadingState variant="field" title="Preparando a foto…"/>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</div>
    <div className="flex items-center gap-2"><Checkbox id="sp-people-visible" checked={person.visible} onCheckedChange={value=>update({visible:value===true})}/><Label htmlFor="sp-people-visible">Exibir esta pessoa no slide</Label></div>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>onPreview(group==='team'?82:83)}>Ver slide</Button><Button variant="outline" onClick={()=>{invalidate();update({photo:null});}}>Remover foto</Button><Button variant="outline" onClick={()=>{invalidate();update(createSpPeople()[group][index]);}}>Restaurar pessoa de referência</Button></div>
  </div>}</details>;
}
