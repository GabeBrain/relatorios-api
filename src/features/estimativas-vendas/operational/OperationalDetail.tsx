import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ForecastChart, type PlotRow } from '../expanded/ForecastChart';
import { REVIEW_MODELS, historyRows, type ReviewItem } from './workbench';
import type { ModelId } from '../expanded/models';

export function OperationalDetail({row,cutoff,onClose}:{row:ReviewItem|null;cutoff:string;onClose:()=>void}) {
  const [visible,setVisible]=useState<ModelId[]>(['finotti-reference']);
  const [months,setMonths]=useState(12);
  const values=new Map<string,PlotRow>();
  if(row) {
    for(const r of historyRows(row)) values.set(r.x,{x:r.x,history:r.history});
    for(const id of visible) for(const p of row.methods.get(id)?.forecast?.points??[]) {
      if(p.offset>months)continue;
      const r=values.get(p.period)??{x:p.period};r[id]=p.predicted;
      if(id==='finotti-reference'){r.sourceWide=p.sourceWide;r.sourceCentral=p.sourceCentral;}
      values.set(p.period,r);
    }
  }
  const plot=[...values.values()].sort((a,b)=>String(a.x).localeCompare(String(b.x)));
  const series=[{key:'history',name:'Histórico reportado'},...REVIEW_MODELS.filter(m=>visible.includes(m.id)&&row?.methods.get(m.id)?.forecast).map(m=>({key:m.id,name:m.label}))];
  return <Dialog open={!!row} onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="ev-modal ev-operation-detail"><DialogTitle>{row?.name}</DialogTitle><DialogDescription>{row?.city} · {row?.uf} · {row?.building.sourceType} · ID {row?.id} · dados até {cutoff}</DialogDescription>{row&&<>
    <div className="ev-operation-facts"><p><span>Unidades lançadas</span><strong>{row.normalized.origin?.units.toLocaleString('pt-BR')??'—'}</strong></p><p><span>Vendido acumulado</span><strong>{row.normalized.origin?.sold.toLocaleString('pt-BR')??'—'}</strong></p><p><span>Estoque no corte</span><strong>{row.normalized.origin?.stock.toLocaleString('pt-BR')??'—'}</strong></p></div>
    <div className="ev-toolbar" role="group" aria-label="Métodos em comparação">{REVIEW_MODELS.map(m=><Button key={m.id} variant={visible.includes(m.id)?'default':'outline'} aria-pressed={visible.includes(m.id)} disabled={!row.methods.get(m.id)?.forecast} onClick={()=>setVisible(v=>v.includes(m.id)?v.filter(x=>x!==m.id):[...v,m.id])}>{m.label}</Button>)}</div>
    <div className="ev-toolbar" role="group" aria-label="Horizonte de exploração">{[6,12,24,36].map(n=><Button key={n} variant={months===n?'secondary':'ghost'} aria-pressed={months===n} onClick={()=>setMonths(n)}>{n} meses</Button>)}<span className="ev-note">Cenário de exploração; não altera o lote.</span></div>
    <div className="ev-period-labels"><span>Histórico reportado até {cutoff}</span><span>Projeção a partir do corte · unidades acumuladas</span></div>
    {plot.length ? <ForecastChart rows={plot} cut={cutoff} series={series} large/> : <p role="status" className="ev-panel">Não há posição reconciliável neste corte para desenhar a curva. Confira os motivos abaixo e escolha outra competência na análise.</p>}
    <p className="ev-note">Histórico pode conter estimativas. Lacunas não equivalem a zero. As sombras da referência representam dispersão do estudo, sem cobertura comprovada neste recorte.</p>
    <section className="ev-method-grid">{REVIEW_MODELS.filter(m=>visible.includes(m.id)).map(m=><article key={m.id}><h3>{m.label}</h3><p>{m.id==='finotti-reference'?row.building.sourceType==='Vertical'?'Compara o estágio atual com até 30 empreendimentos da referência no mesmo grupo de padrão. A trajetória mediana do estoque remanescente produz a previsão.':'A(t) = 1 − (1 − Aₙ)^((t/n)^k). O percentual vendido no corte e a idade definem a forma da curva. Após 95%, o saldo segue a cauda da referência.':m.id==='stock-trend'?'Prolonga a variação entre estoques comparáveis separados por três meses, com quantidade estável. É uma alternativa exploratória, sem validação própria neste recorte.':'Mantém o estoque no corte, sem vendas futuras. Serve como referência de comparação.'}</p><p className="ev-note">{row.methods.get(m.id)?.forecast?.version??row.methods.get(m.id)?.reason}</p>{Object.entries(row.methods.get(m.id)?.forecast?.parameters??{}).map(([k,v])=><p className="ev-note" key={k}>{k}: {String(v)}</p>)}</article>)}</section>
    <section><h3 className="text-lg font-semibold">Condições desta posição</h3><ul className="ev-note list-disc pl-5">{row.reasons.map(r=><li key={r}>{r}</li>)}</ul></section>
    <div className="ev-table"><table><caption className="text-left py-3">Projeções exploratórias · valores acumulados em unidades</caption><thead><tr><th>Competência</th>{series.map(s=><th key={s.key}>{s.name}</th>)}</tr></thead><tbody>{plot.map(p=><tr key={p.x}><td>{p.x}</td>{series.map(s=><td key={s.key}>{typeof p[s.key]==='number'?Number(p[s.key]).toLocaleString('pt-BR'):'—'}</td>)}</tr>)}</tbody></table></div>
  </>}</DialogContent></Dialog>;
}
