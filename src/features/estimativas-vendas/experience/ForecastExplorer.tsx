import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { shiftMonth } from '../expanded/contract';
import { METHODS, sourcePeriods } from '../scientific/study';
import type { AnalysisRuntime } from './runtime';
import { ALL_METHODS, chartRows, cleanReason, measureLabel, operationStatus, present, type AnalysisSpec, type CaseAnalysis, type Measure, type Universe } from './domain';
import { Choice, TimeControls } from './Controls';
import { ForecastChart } from './ForecastChart';
import { BacktestCard } from './BacktestCard';
import { OtherDates } from './OtherDates';

export function ForecastExplorer({ universe, runtime, id, navigation, initialSpec, onClose, onNavigate, onExport }: { universe: Universe; runtime: AnalysisRuntime; id: string; navigation: string[]; initialSpec: AnalysisSpec; onClose: () => void; onNavigate: (id: string) => void; onExport: (ids: string[], spec: AnalysisSpec) => void }) {
  const building = universe.buildings.find(b => String(b.building_id ?? b.id) === id)!;
  const periods = useMemo(() => sourcePeriods([building]), [building]);
  const [spec, setSpec] = useState(initialSpec), [analysis, setAnalysis] = useState<CaseAnalysis | null>(null), [busy, setBusy] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [measure, setMeasure] = useState<Measure>('stock'), [step, setStep] = useState<1 | 3 | 12>(1), [percent, setPercent] = useState(false), [shown, setShown] = useState(ALL_METHODS), [showLater, setShowLater] = useState(true), [zoom, setZoom] = useState('36'), [pastDuration, setPastDuration] = useState(initialSpec.duration);
  useEffect(() => {
    let live = true; setError('');
    const cached = runtime.peek(id, spec);
    if (cached) { setAnalysis(cached); setBusy(false); return; }
    setBusy(true);
    const timer = window.setTimeout(() => {
      runtime.analyze(id, spec, 0).then(next => { if (live) { setAnalysis(next); setBusy(false); }
        // Two neighboring dates only. Their results never replace the active request.
        for (const offset of [-1, 1]) { const cutoff = shiftMonth(spec.cutoff, offset); if (cutoff >= periods[0] && cutoff <= periods.at(-1)!) void runtime.analyze(id, { ...spec, cutoff }, 4).catch(() => {}); }
      }, e => { if (live) { setError(String(e.message)); setBusy(false); } });
    }, 300);
    return () => { live = false; clearTimeout(timer); };
  }, [runtime, id, spec, periods, retry]);
  const latest = periods.at(-1) ?? initialSpec.cutoff, first = periods[0] ?? initialSpec.cutoff;
  const historical = spec.cutoff < latest;
  const current = analysis?.id === id && analysis.spec.cutoff === spec.cutoff && analysis.spec.duration === spec.duration;
  const stale = busy || !current;
  const p = analysis ? present(analysis) : null;
  const rows = useMemo(() => {
    if (!analysis || analysis.id !== id) return [];
    const start = zoom === 'all' ? first : shiftMonth(analysis.spec.cutoff, -Number(zoom));
    return chartRows(building, analysis, measure, step).filter(r => r.month >= start).map(r => showLater ? r : { ...r, reported: null });
  }, [analysis, id, building, measure, step, showLater, zoom, first]);
  function change(next: AnalysisSpec) { if (!historical && next.cutoff < latest) setPastDuration(spec.duration); setSpec(next); }
  const index = navigation.indexOf(id);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="evx-explorer"><DialogTitle>{building.name ?? id}</DialogTitle><DialogDescription>{universe.locations[id]?.city}/{universe.locations[id]?.uf} · {building.sourceType} · ID {id}</DialogDescription>
    <div className="evx-actions"><Button variant="outline" disabled={index <= 0} onClick={() => onNavigate(navigation[index - 1])}>Anterior</Button><Button variant="outline" disabled={index < 0 || index >= navigation.length - 1} onClick={() => onNavigate(navigation[index + 1])}>Próximo</Button><Button variant="outline" disabled={stale || !!error} onClick={() => onExport([id], spec)}>Exportar empreendimento</Button></div>
    {historical && <div className="evx-notice"><strong>Comparação histórica</strong><p>A previsão usa apenas dados até {spec.cutoff}; a linha posterior mostra dados informados quando comparáveis.</p><Button variant="ghost" onClick={() => setSpec({ ...spec, cutoff: latest, duration: pastDuration })}>Voltar à previsão atual</Button></div>}
    {!periods.includes(spec.cutoff) && <p role="status">Sem registro na data escolhida. <Button variant="link" onClick={() => change({ ...spec, cutoff: periods.filter(p => p <= spec.cutoff).at(-1) ?? first })}>Usar último mês disponível anterior</Button></p>}
    <div className="evx-view-controls"><Choice label="Medida" value={measure} onChange={v => setMeasure(v as Measure)} items={(['stock', 'sold', 'net'] as Measure[]).map(v => ({ value: v, label: measureLabel(v) }))} /><Choice label="Agrupar a cada" value={String(step)} onChange={v => setStep(Number(v) as 1 | 3 | 12)} items={[{ value: '1', label: 'Mês' }, { value: '3', label: '3 meses desde o início' }, { value: '12', label: '12 meses desde o início' }]} /><Choice label="Histórico visível" value={zoom} onChange={setZoom} items={[{ value: '12', label: '1 ano' }, { value: '36', label: '3 anos' }, { value: 'all', label: 'Histórico disponível (até 10 anos)' }]} /><label><input type="checkbox" checked={percent} onChange={e => setPercent(e.target.checked)} /> Percentual das unidades</label><label><input type="checkbox" checked={showLater} onChange={e => setShowLater(e.target.checked)} /> Mostrar dados posteriores</label></div>
    <div className="evx-graph-layout"><section aria-busy={stale} className={stale ? 'evx-updating' : ''}>
      {busy && <><BrainLoadingState variant="field" title="Atualizando previsão" description={analysis ? `Gráfico anterior: ${analysis.spec.cutoff}` : 'Calculando o empreendimento'} /><Button variant="ghost" onClick={onClose}>Cancelar e voltar às curvas</Button></>}
      {error && <div role="alert">{error}<Button variant="outline" onClick={() => setRetry(v => v + 1)}>Tentar novamente</Button></div>}
      {analysis && analysis.id === id ? <><p className="evx-chart-caption">{measureLabel(measure)} · {percent ? '% das unidades' : 'unidades'} · início {analysis.spec.cutoff} · {analysis.spec.duration} meses{stale ? ' · resultado anterior, em atualização' : ''}</p><ForecastChart rows={rows} cutoff={analysis.spec.cutoff} methods={shown.filter(m => !!analysis.stock.cases[0].methods[m].forecast)} percent={percent} units={p?.row.units} latest={latest} onStart={date => change({ ...spec, cutoff: date })} label="Histórico, previsão e dados posteriores" /></> : <div className="evx-chart-placeholder">Preparando o gráfico</div>}
    </section><aside className="evx-reading"><h3>Como ler</h3><p>Traço escuro: histórico informado. Linha verde: Finotti, quando disponível. Tracejados: métodos exploratórios. Pontos: dados informados depois.</p><p>A linha vertical separa os dados usados da previsão. Arraste essa linha ou use as duas réguas abaixo.</p><p>{p?.status}. {p?.reason}</p><small>Sem faixa calibrada nesta análise. A origem de coleta dos meses da API não está confirmada.</small></aside></div>
    <TimeControls spec={spec} first={first} latest={latest} onChange={change} />
    <section className="evx-methods" aria-label="Comparar métodos"><h3>Comparar métodos</h3>{METHODS.map(m => { const result = analysis?.stock.cases[0].methods[m.id]; return <label key={m.id}><input type="checkbox" disabled={!result?.forecast} checked={shown.includes(m.id) && !!result?.forecast} onChange={e => setShown(v => e.target.checked ? [...v, m.id] : v.filter(x => x !== m.id))} /><span>{m.label}<small>{result?.forecast ? 'Disponível para esta data' : cleanReason(result?.reason ?? 'Calculando disponibilidade')}</small></span></label>; })}</section>
    {historical && analysis && current && <BacktestCard analyses={[analysis]} measure={measure} step={step} disabled={stale} />}
    {analysis && <details className="evx-panel"><summary>Como foi calculado</summary>{METHODS.map(m => { const f = analysis.stock.cases[0].methods[m.id].forecast; return <section key={m.id}><h4>{m.label}</h4><p>{m.explanation}</p><p>{cleanReason(analysis.stock.cases[0].methods[m.id].reason)}</p>{f && <><p>Versão {f.version} · unidades {f.origin.units} · estoque {f.origin.stock} · idade {f.origin.age} meses.</p><dl>{Object.entries(f.parameters).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl><p>{f.warnings.map(cleanReason).join(' ')}</p></>}</section>; })}<p>Elegibilidade operacional: {operationStatus(universe, analysis).status}. {operationStatus(universe, analysis).reasons.map(cleanReason).join(' ')}</p></details>}
    <details className="evx-panel"><summary>Tabela equivalente do gráfico</summary><div className="evx-table-wrap"><table><thead><tr><th>Mês</th><th>Histórico</th><th>Informado depois</th>{shown.map(m => <th key={m}>{METHODS.find(x => x.id === m)?.label}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.month}><td>{r.month}</td><td>{r.history ?? '—'}</td><td>{r.reported ?? '—'}</td>{shown.map(m => <td key={m}>{typeof r[m] === 'number' ? Number(r[m]).toFixed(2) : '—'}</td>)}</tr>)}</tbody></table></div><small>Tabela em unidades; percentual no gráfico usa a quantidade de unidades na data da previsão. Estoque é saldo; vendas são somadas apenas em intervalos completos.</small></details>
    <OtherDates key={`${id}|${spec.duration}`} id={id} runtime={runtime} spec={spec} first={first} latest={latest} measure={measure} step={step} />
  </DialogContent></Dialog>;
}
