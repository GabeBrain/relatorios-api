import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { aggregatePortfolio, measureLabel, present, type AnalysisSpec, type CaseAnalysis, type Measure } from './domain';
import type { AnalysisRuntime } from './runtime';
import { BacktestCard } from './BacktestCard';
import { Choice } from './Controls';
export function PortfolioExplorer({ ids, runtime, spec, onClose, onExport }: { ids: string[]; runtime: AnalysisRuntime; spec: AnalysisSpec; onClose: () => void; onExport: () => void }) {
  const [analyses, setAnalyses] = useState<CaseAnalysis[]>([]), [error, setError] = useState(''), [overlay, setOverlay] = useState(false), [measure, setMeasure] = useState<Measure>('stock'), [shown, setShown] = useState<string[]>([]);
  useEffect(() => { let live = true; void (async () => { try { const results: CaseAnalysis[] = []; for (const id of ids) { if (!live) return; results.push(await runtime.analyze(id, spec, 1)); if (live) setAnalyses([...results]); } } catch (e) { if (live) setError(String(e)); } })(); return () => { live = false; }; }, [ids, runtime, spec]);
  const ready = analyses.length === ids.length, totals = useMemo(() => aggregatePortfolio(analyses, 'shown', measure, 1), [analyses, measure]);
  const rows = useMemo(() => totals.map((r, i) => {
    const row: Record<string, string | number | null> = { month: r.month, predicted: r.predicted, reported: r.reported };
    for (const a of analyses.filter(a => shown.includes(a.id))) {
      const method = present(a).method, f = method ? a.stock.cases[0].methods[method].forecast : null, p = f?.points.find(p => p.offset === i + 1);
      row[a.id] = !p ? null : measure === 'stock' ? p.stock : measure === 'sold' ? p.predicted : p.stock === null ? null : (i === 0 ? f!.origin.stock : f!.points.find(x => x.offset === i)?.stock ?? p.stock) - p.stock;
    }
    return row;
  }), [totals, analyses, shown, measure]);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="evx-explorer"><DialogTitle>Comparar conjunto</DialogTitle><DialogDescription>{ids.length} membros fixos · início {spec.cutoff} · {spec.duration} meses. Filtros da lista não alteram esta carteira.</DialogDescription>
    {!ready && !error && <BrainLoadingState title={`Calculando ${analyses.length}/${ids.length} membros`} />}{error && <p role="alert">{error}</p>}
    <div className="evx-actions"><Button variant={!overlay ? 'default' : 'outline'} onClick={() => setOverlay(false)}>Carteira</Button><Button variant={overlay ? 'default' : 'outline'} onClick={() => setOverlay(true)}>Sobrepor curvas</Button><Button variant="outline" disabled={!ready} onClick={onExport}>Exportar conjunto</Button></div>
    <Choice label="Medida da carteira" value={measure} onChange={v => setMeasure(v as Measure)} items={(['stock', 'sold', 'net'] as Measure[]).map(value => ({ value, label: measureLabel(value) }))} />
    <p>Curvas individuais são calculadas antes da soma. Valores ausentes impedem o total completo. O erro da carteira pode esconder erros individuais que se compensam.</p>
    {overlay && <details open><summary>Escolher curvas para sobrepor (até 12)</summary>{analyses.map(a => <label className="evx-check-row" key={a.id}><input type="checkbox" checked={shown.includes(a.id)} disabled={!shown.includes(a.id) && shown.length >= 12} onChange={e => setShown(v => e.target.checked ? [...v, a.id] : v.filter(id => id !== a.id))} />{a.stock.cases[0].inventory.name} · {present(a).method ?? 'sem previsão'}</label>)}</details>}
    {ready && <><p>{totals.some(t => t.missing) ? 'Carteira incompleta: há membros sem previsão; total não apresentado nesses períodos.' : 'Todos os membros têm previsão no intervalo.'}</p><div className="evx-chart" role="img" aria-label="Carteira e dados posteriores"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" /><XAxis dataKey="month" minTickGap={55} /><YAxis /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />{overlay ? shown.map((id, i) => <Line key={id} dataKey={id} name={analyses.find(a => a.id === id)?.stock.cases[0].inventory.name} stroke={['var(--gb-verde-500)', 'var(--gb-oliva-700)', 'var(--gb-placeholder)', 'var(--gb-amarelo-400)', 'var(--gb-texto-2)'][i % 5]} strokeDasharray={i >= 5 ? '6 4' : undefined} dot={false} isAnimationActive={false} connectNulls={false} />) : <><Line dataKey="predicted" name="Previsão da carteira" stroke="var(--gb-verde-500)" strokeWidth={3} dot={false} isAnimationActive={false} connectNulls={false} /><Line dataKey="reported" name="Informado depois" stroke="hsl(var(--foreground))" strokeDasharray="3 4" dot={false} isAnimationActive={false} connectNulls={false} /></>}</LineChart></ResponsiveContainer></div>
      <details><summary>Saldos e diferenças da carteira</summary><div className="evx-table-wrap"><table><thead><tr><th>Mês</th><th>Previsto</th><th>Informado</th><th>Diferença</th><th>Sem previsão</th></tr></thead><tbody>{totals.map(t => <tr key={t.month}><td>{t.month}</td><td>{t.predicted?.toFixed(2) ?? '—'}</td><td>{t.reported?.toFixed(2) ?? '—'}</td><td>{t.predicted !== null && t.reported !== null ? (t.predicted - t.reported).toFixed(2) : '—'}</td><td>{t.missing}</td></tr>)}</tbody></table></div></details><BacktestCard analyses={analyses} measure={measure} step={1} /></>}
  </DialogContent></Dialog>;
}
