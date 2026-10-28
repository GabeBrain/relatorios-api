import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { aggregatePortfolio, measureLabel, present, type AnalysisSpec, type CaseAnalysis, type Measure, type Universe } from './domain';
import type { AnalysisRuntime } from './runtime';
import { BacktestCard } from './BacktestCard';
import { Choice } from './Controls';
import { comparisonRows } from './comparison';
export function PortfolioExplorer({ universe, ids, runtime, spec, onClose, onExport }: { universe: Universe; ids: string[]; runtime: AnalysisRuntime; spec: AnalysisSpec; onClose: () => void; onExport: () => void }) {
  const [analyses, setAnalyses] = useState<CaseAnalysis[]>([]), [error, setError] = useState(''), [view, setView] = useState('compare'), [alignment, setAlignment] = useState<'elapsed' | 'calendar'>('elapsed'), [measure, setMeasure] = useState<Measure>('sold'), [shown, setShown] = useState(ids.slice(0, 12));
  const [commonDate, setCommonDate] = useState('');
  const dates = useMemo(() => {
    const groups = ids.map(id => new Set(universe.buildings.find(b => String(b.building_id ?? b.id) === id)?.typologies_history.map(r => r.period.slice(0, 7)) ?? []));
    return groups.length ? [...groups[0]].filter(date => groups.every(g => g.has(date))).sort() : [];
  }, [universe, ids]);
  const cutoff = view === 'portfolio' ? commonDate || dates.at(-1) || '' : spec.cutoff;
  useEffect(() => {
    let live = true; setAnalyses([]); setError('');
    if (!cutoff) return;
    void (async () => { try { const results: CaseAnalysis[] = []; for (const id of ids) { if (!live) return; results.push(await runtime.analyze(id, { ...spec, cutoff }, 1)); if (live) setAnalyses([...results]); } } catch (e) { if (live) setError(String(e)); } })();
    return () => { live = false; };
  }, [ids, runtime, spec, cutoff]);
  const ready = analyses.length === ids.length;
  const totals = useMemo(() => ready && view === 'portfolio' ? aggregatePortfolio(analyses, 'shown', measure, 1) : [], [ready, view, analyses, measure]);
  const curves = useMemo(() => comparisonRows(analyses.filter(a => shown.includes(a.id)), measure, alignment, true), [analyses, shown, measure, alignment]);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="evx-explorer"><DialogTitle>Comparar empreendimentos</DialogTitle><DialogDescription>{ids.length} selecionados. Comparação em percentual, alinhada pelo tempo após cada previsão.</DialogDescription>
    <div className="evx-actions"><Button variant={view === 'compare' ? 'secondary' : 'ghost'} onClick={() => setView('compare')}>Comparar curvas</Button><Button variant={view === 'portfolio' ? 'secondary' : 'ghost'} onClick={() => setView('portfolio')}>Carteira na mesma data</Button><Button variant="outline" disabled={!ready} onClick={onExport}>Baixar previsões</Button></div>
    {view === 'compare' ? <Choice label="Alinhar comparação" value={alignment} onChange={v => setAlignment(v as typeof alignment)} items={[{ value: 'elapsed', label: 'Tempo após a previsão' }, { value: 'calendar', label: 'Calendário' }]} /> : dates.length ? <Choice label="Data comum da carteira" value={commonDate || dates.at(-1)!} onChange={setCommonDate} items={[...dates].reverse().map(value => ({ value, label: value }))} /> : <p role="status">Não há uma data com dados para todos os membros. A comparação relativa permanece disponível.</p>}
    <Choice label="Medida" value={measure} onChange={v => setMeasure(v as Measure)} items={(['sold', 'stock', 'net'] as Measure[]).map(value => ({ value, label: measureLabel(value) }))} />
    {!ready && !!cutoff && !error && <BrainLoadingState title={`Calculando ${analyses.length}/${ids.length} membros`} />}{error && <p role="alert">{error}</p>}
    {view === 'compare' && <details><summary>Curvas visíveis: {shown.length} de {ids.length} (até 12)</summary>{ids.map(id => <Button key={id} variant={shown.includes(id) ? 'secondary' : 'ghost'} aria-pressed={shown.includes(id)} disabled={!shown.includes(id) && shown.length >= 12} onClick={() => setShown(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])}>{universe.buildings.find(b => String(b.building_id ?? b.id) === id)?.name ?? id}</Button>)}</details>}
    {ready && <><div className="evx-chart" role="img" aria-label="Comparação de curvas"><ResponsiveContainer width="100%" height="100%"><LineChart data={view === 'compare' ? curves : totals}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" /><XAxis dataKey={view === 'compare' ? 'label' : 'month'} minTickGap={55} /><YAxis domain={view === 'compare' && measure !== 'net' ? [0, 100] : [0, 'auto']} unit={view === 'compare' ? '%' : undefined} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />{view === 'compare' ? analyses.filter(a => shown.includes(a.id)).flatMap((a, i) => { const color = ['var(--gb-verde-500)', 'var(--gb-placeholder)', 'var(--gb-amarelo-400)'][i % 3]; const name = `${a.stock.cases[0].inventory.name} (${a.spec.cutoff})`; return [<Line key={a.id} dataKey={a.id} name={name} stroke={color} strokeDasharray={i >= 3 ? '6 4' : undefined} dot={false} isAnimationActive={false} connectNulls={false} />, <Line key={`${a.id}-reported`} dataKey={`${a.id}-reported`} name={`${name} · informado depois`} stroke={color} strokeDasharray="1 4" dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />]; }) : <><Line dataKey="predicted" name="Previsão da carteira (unidades)" stroke="var(--gb-verde-500)" strokeWidth={3} dot={false} isAnimationActive={false} connectNulls={false} /><Line dataKey="reported" name="Informado depois" stroke="hsl(var(--foreground))" strokeDasharray="3 4" dot={false} isAnimationActive={false} connectNulls={false} /></>}</LineChart></ResponsiveContainer></div>
      <p>{view === 'compare' ? 'Cada curva começa na sua data indicada na legenda. Uma coleta trimestral não vira três observações mensais.' : 'Membros na mesma data, em unidades. Ausência impede o total completo; erros individuais podem se compensar.'}</p>
      <details><summary>Datas e métodos do conjunto</summary><ul>{analyses.map(a => <li key={a.id}>{a.stock.cases[0].inventory.name} · dados até {a.spec.cutoff} · {present(a).method ?? 'sem método'}</li>)}</ul></details>
      {analyses.some(a => a.stock.trials.some(t => t.actual !== null)) && <BacktestCard analyses={analyses} measure={measure} step={1} />}
      <details><summary>Tabela equivalente</summary><div className="evx-table-wrap"><table><thead><tr><th>Período</th>{view === 'compare' ? shown.map(id => <th key={id}>{id} · previsto / informado (%)</th>) : <><th>Previsto</th><th>Informado</th><th>Sem previsão</th></>}</tr></thead><tbody>{view === 'compare' ? curves.map(r => <tr key={String(r.x)}><td>{r.label}</td>{shown.map(id => <td key={id}>{r[id] ?? '—'} / {r[`${id}-reported`] ?? '—'}</td>)}</tr>) : totals.map(r => <tr key={r.month}><td>{r.month}</td><td>{r.predicted ?? '—'}</td><td>{r.reported ?? '—'}</td><td>{r.missing}</td></tr>)}</tbody></table></div></details>
    </>}
  </DialogContent></Dialog>;
}
