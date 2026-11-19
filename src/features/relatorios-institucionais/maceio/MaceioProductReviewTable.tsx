import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '@/components/ui/table';
import { MACEIO_PRODUCT_FIELDS } from './classification';
import type { MaceioProductReviewProject } from './closed-review';

export function MaceioProductReviewTable({projects,label}:{projects:MaceioProductReviewProject[];label:string}){
  return <div className="space-y-2"><p className="text-xs text-muted-foreground">Dados de tipologia na competência selecionada. “Não informado” indica ausência na resposta, não valor zero.</p><div className="max-h-[28rem] overflow-auto rounded-lg border"><Table aria-label={label} className="min-w-[1000px]">
    <TableHeader><TableRow><TableHead>Município</TableHead><TableHead>Empreendimento</TableHead><TableHead>ID</TableHead><TableHead>Rótulos da API</TableHead><TableHead>Quartos</TableHead><TableHead>Área privativa (m²)</TableHead><TableHead>Garagem</TableHead><TableHead>Conferência</TableHead></TableRow></TableHeader>
    <TableBody>{projects.map((project,i)=><TableRow key={`${project.city}/${project.id}/${i}`}>
      <TableCell>{project.city}</TableCell><TableCell className="min-w-48">{project.name}</TableCell><TableCell>{project.id||'Não informado'}</TableCell>
      <TableCell className="min-w-48">{project.values.some(Boolean)?project.values.map((value,index)=>value?<div key={index}><span className="text-xs text-muted-foreground">{MACEIO_PRODUCT_FIELDS[index]}: </span>{value}</div>:null):'Não informados'}</TableCell>
      <TableCell>{project.evidence.bedrooms.join(', ')||'Não informado'}</TableCell><TableCell>{project.evidence.areas.join(', ')||'Não informada'}</TableCell><TableCell>{project.evidence.garages.join(', ')||'Não informada'}</TableCell>
      <TableCell className="min-w-56">{project.reason}{project.evidence.hint==='lots'&&<p className="mt-1 text-xs text-muted-foreground">Zero quartos não distingue loteamento aberto de fechado.</p>}</TableCell>
    </TableRow>)}</TableBody>
  </Table></div></div>;
}
