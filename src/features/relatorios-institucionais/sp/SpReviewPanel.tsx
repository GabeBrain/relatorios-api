import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SpPreview } from './model';
import { SP_SLIDE_STATE_LABELS, spReviewSnapshot, type SpSlideReview, type SpSlideState } from './review';

export function SpReviewPanel({report,slides,onOpen}:{report:SpPreview;slides:SpSlideReview[];onOpen:(number:number)=>void}) {
  const [expanded,setExpanded]=useState(false);
  const [filter,setFilter]=useState<SpSlideState|'all'>('all');
  const counts=Object.fromEntries(Object.keys(SP_SLIDE_STATE_LABELS).map(state=>[state,slides.filter(slide=>slide.state===state).length]));
  const visible=slides.filter(slide=>filter==='all'||slide.state===filter);
  function download(){
    const url=URL.createObjectURL(new Blob([JSON.stringify(spReviewSnapshot(report,slides),null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`sp-${report.quarter}-checklist.json`;link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section aria-label="Checklist dos 85 slides" className="space-y-3 rounded-lg border border-border bg-card p-4">
    <h3 className="font-semibold">Conferência para testes práticos</h3>
    <p className="text-sm text-muted-foreground">85 posições implementadas. Disponível significa que a fonte necessária foi conferida nesta geração; a aprovação dos números e da metodologia será feita nos testes práticos.</p>
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Resumo da disponibilidade">{Object.entries(SP_SLIDE_STATE_LABELS).map(([state,label])=><li key={state}><strong>{counts[state]}</strong> {label}</li>)}</ul>
    <p className="text-sm text-muted-foreground">{report.source==='fixture'?'Este checklist usa dados fictícios e não comprova cobertura real. ':''}{report.status==='partial'?'O trimestre está parcial; os slides usam somente os meses disponíveis. ':''}Páginas institucionais conservam a edição identificada. Exportação integral e revisão do analista continuam pendentes.</p>
    <details onToggle={event=>setExpanded(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-medium">Ver situação e pendências por slide</summary>
      {expanded && <div className="mt-3 space-y-3">
        <div className="w-full max-w-xs space-y-1"><label htmlFor="sp-review-filter" className="text-sm">Mostrar slides</label><Select value={filter} onValueChange={value=>setFilter(value as SpSlideState|'all')}><SelectTrigger id="sp-review-filter"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os slides</SelectItem>{Object.entries(SP_SLIDE_STATE_LABELS).map(([state,label])=><SelectItem key={state} value={state}>{label}</SelectItem>)}</SelectContent></Select></div>
        {visible.length?<Table><TableHeader><TableRow><TableHead>Slide</TableHead><TableHead>Situação</TableHead><TableHead>Conferência</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader><TableBody>{visible.map(slide=><TableRow key={slide.number}><TableCell className="min-w-40">{slide.number}. {slide.title}</TableCell><TableCell>{SP_SLIDE_STATE_LABELS[slide.state]}</TableCell><TableCell className="min-w-52 text-sm">{slide.reason}</TableCell><TableCell><Button variant="outline" size="sm" onClick={()=>onOpen(slide.number)}>Abrir slide {slide.number}</Button></TableCell></TableRow>)}</TableBody></Table>:<p className="text-sm text-muted-foreground">Nenhum slide nessa situação.</p>}
      </div>}
    </details>
    <Button variant="outline" onClick={download}>Baixar checklist da conferência</Button>
    <p className="text-xs text-muted-foreground">O checklist registra trimestre, mês e situação dos slides. Não inclui token nem históricos individuais e não substitui o relatório.</p>
  </section>;
}
