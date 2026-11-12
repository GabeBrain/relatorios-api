import { useEffect,useRef,useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { createFortalezaEditorial,readFortalezaPhoto,type FortalezaEditorial,type FortalezaPerson } from './monthly-closing';
export default function FortalezaClosingEditor({page,value,onChange}:{page:number;value:FortalezaEditorial;onChange:(value:FortalezaEditorial)=>void}){
  const [index,setIndex]=useState(0),[loading,setLoading]=useState(false),[error,setError]=useState('');const version=useRef(0),latest=useRef(value);latest.current=value;
  useEffect(()=>{version.current++;setLoading(false);setError('');setIndex(0);},[page]);useEffect(()=>()=>{version.current++;},[]);
  if(![57,58,59].includes(page))return null;
  const group=page===57?'brain':'sinduscon',person=value[group][index]??value[group][0];
  const update=(patch:Partial<FortalezaPerson>)=>onChange({...latest.current,[group]:latest.current[group].map((entry,i)=>i===index?{...entry,...patch}:entry)});
  const invalidate=()=>{version.current++;setLoading(false);setError('');};
  return <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer font-medium">Personalizar equipe e fotos</summary><div className="mt-4 space-y-4">
    <p className="text-sm text-muted-foreground">Conteúdo inicial da referência de julho/2026. Confira os responsáveis desta edição. Alterações e imagens ficam somente nesta prévia, sem envio à API. Ao mudar o período ou sair da página, são restauradas.</p>
    {page!==59?<><div className="space-y-2"><Label htmlFor="fort-person">Integrante</Label><Select value={String(index)} onValueChange={next=>{invalidate();setIndex(Number(next));}}><SelectTrigger id="fort-person"><SelectValue/></SelectTrigger><SelectContent>{value[group].map((entry,i)=><SelectItem key={i} value={String(i)}>{i+1} · {entry.name||'Sem nome'}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="fort-person-name">Nome</Label><Input id="fort-person-name" maxLength={48} value={person.name} onChange={event=>update({name:event.target.value})}/></div><div><Label htmlFor="fort-person-role">Cargo</Label><Textarea id="fort-person-role" maxLength={75} rows={2} value={person.role} onChange={event=>update({role:event.target.value})}/></div></div></>:<p className="text-sm">O quadro institucional do slide 59 é uma imagem no original. Substitua a imagem completa para atualizar esse quadro.</p>}
    <Label htmlFor="fort-person-photo">{page===59?'Quadro institucional':'Foto'} · PNG, JPG ou WebP, até2MB</Label><Input id="fort-person-photo" type="file" accept="image/png,image/jpeg,image/webp" disabled={loading} onChange={async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;const id=++version.current;setLoading(true);setError('');try{const photo=await readFortalezaPhoto(file);if(id===version.current){if(page===59)onChange({...latest.current,board:photo});else update({photo});}}catch(cause){if(id===version.current)setError(cause instanceof Error?cause.message:'Falha ao preparar imagem.');}finally{if(id===version.current)setLoading(false);}}}/>
    {loading&&<BrainLoadingState variant="field" title="Preparando imagem"/>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2">{page!==59&&<Button variant="outline" onClick={()=>{invalidate();update({visible:!person.visible});}}>{person.visible?'Ocultar integrante':'Mostrar integrante'}</Button>}<Button variant="outline" onClick={()=>{invalidate();if(page===59)onChange({...latest.current,board:null});else update(createFortalezaEditorial()[group][index]);}}>Restaurar referência</Button></div>
  </div></details>;
}
