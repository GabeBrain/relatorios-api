import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { METHODS, sourcePeriods, type StudyMethod } from '../scientific/study';
import type { AnalysisRuntime } from './runtime';
import { ALL_METHODS, chartRows, cleanReason, measureLabel, observations, operationStatus, present, type AnalysisSpec, type CaseAnalysis, type Measure, type Universe } from './domain';
import { Choice } from './Controls';
import { ForecastChart } from './ForecastChart';
import { BacktestCard } from './BacktestCard';
import { OtherDates } from './OtherDates';
import './explorer.css';

const fmt = (v: number | null | undefined) => v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export function ForecastExplorer({ universe, runtime, id, navigation, initialSpec, onClose, onNavigate, onExport }: { universe: Universe; runtime: AnalysisRuntime; id: string; navigation: string[]; initialSpec: AnalysisSpec; onClose: () => void; onNavigate: (id: string) => void; onExport: (ids: string[], spec: AnalysisSpec) => void }) {
  const building = universe.buildings.find(b => String(b.building_id ?? b.id) === id)!;
  const periods = useMemo(() => sourcePeriods([building]), [building]);
  const latest = periods.at(-1) ?? initialSpec.cutoff;
  const [spec, setSpec] = useState(initialSpec), [analysis, setAnalysis] = useState<CaseAnalysis | null>(null), [busy, setBusy] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [measure, setMeasure] = useState<Measure>('sold'), [percent, setPercent] = useState(false), [shown, setShown] = useState<StudyMethod[] | null>(null);
  const [panel, setPanel] = useState<'curve' | 'method' | 'table' | 'backtest'>('curve');
  useEffect(() => {
    let live = true; setError('');
    const cached = runtime.peek(id, spec);
    if (cached) { setAnalysis(cached); setBusy(false); return; }
    setBusy(true);
    const timer = window.setTimeout(() => {
      void runtime.analyze(id, spec, 0).then(next => { if (live) { setAnalysis(next); setBusy(false); } }, e => { if (live) { setError(String(e.message)); setBusy(false); } });
    }, 150);
    return () => { live = false; clearTimeout(timer); };
  }, [runtime, id, spec, retry]);
  const current = analysis?.id === id && analysis.spec.cutoff === spec.cutoff && analysis.spec.duration === spec.duration, stale = busy || !current;
  const p = analysis ? present(analysis) : null;
  const available = ALL_METHODS.filter(m => !!analysis?.stock.cases[0].methods[m].forecast);
  const methods = shown === null ? available.slice(0, 1) : shown.filter(m => available.includes(m));
  const rows = useMemo(() => analysis && analysis.id === id ? chartRows(building, analysis, measure) : [], [analysis, id, building, measure]);
  const validHistory = useMemo(() => observations(building).filter(r => r.month <= spec.cutoff && r.stock !== null), [building, spec.cutoff]);
  const historical = spec.cutoff < latest, index = navigation.indexOf(id);
  const primary = methods[0], model = primary && analysis?.stock.cases[0].methods[primary].forecast;
  const predictedStock = model ? model.points.at(-1)?.stock : null;
  function switchPanel(next: typeof panel) { setPanel(next); if (next === 'curve' && historical) setSpec(s => ({ ...s, cutoff: latest })); }
  function toggleMethod(m: StudyMethod) { setShown(methods.includes(m) ? methods.length > 1 ? methods.filter(x => x !== m) : methods : [...methods, m]); }
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="evx-explorer evx-explorer-focus">
    <header className="evf-header"><div><DialogTitle>{building.name ?? id}</DialogTitle><DialogDescription>{universe.locations[id]?.city}/{universe.locations[id]?.uf} · {building.sourceType} · ID {id}</DialogDescription></div><Button variant="ghost" disabled={stale || !!error} onClick={() => onExport([id], spec)}>Baixar previsão ↗</Button></header>
    <Button variant="ghost" className="evf-carousel evf-previous" aria-label="Empreendimento anterior" disabled={index <= 0} onClick={() => onNavigate(navigation[index - 1])}><ChevronLeft /></Button>
    <Button variant="ghost" className="evf-carousel evf-next" aria-label="Próximo empreendimento" disabled={index < 0 || index >= navigation.length - 1} onClick={() => onNavigate(navigation[index + 1])}><ChevronRight /></Button>
    <nav className="evf-tabs" aria-label="Exploração do empreendimento">{([{ id: 'curve', label: 'Curva de vendas' }, { id: 'backtest', label: 'Backtest' }, { id: 'method', label: 'Como foi calculado' }, { id: 'table', label: 'Dados do gráfico' }] as const).map(tab => <Button key={tab.id} variant="ghost" aria-pressed={panel === tab.id} onClick={() => switchPanel(tab.id)}>{tab.label}</Button>)}</nav>
    <div className="evf-statline"><span>Histórico disponível<strong>{validHistory[0]?.month ?? '—'} → {spec.cutoff}</strong><small>{validHistory.length} registros válidos · origem de coleta não confirmada</small></span><span>Vendas acumuladas<strong>{fmt(p?.row.sold)} un.</strong></span><span>Estoque informado<strong>{fmt(p?.row.stock)} un.</strong></span><span>Vendas previstas · {spec.duration} meses<strong className="evf-green">{fmt(p?.row.stock != null && predictedStock != null ? p.row.stock - predictedStock : null)} un.</strong></span></div>
    {(panel === 'curve' || panel === 'backtest') && <>
      <div className="evf-controls"><div className="evx-actions" role="group" aria-label="Medida da curva">{(['sold', 'stock', 'net'] as Measure[]).map(m => <Button variant="ghost" key={m} aria-pressed={measure === m} onClick={() => setMeasure(m)}>{measureLabel(m)}</Button>)}<Button variant="ghost" aria-pressed={percent} onClick={() => setPercent(v => !v)}>% das unidades</Button></div><div className="evx-actions" role="group" aria-label="Duração da previsão">{[3, 6, 12, 24, 36].map(n => <Button key={n} variant="ghost" aria-pressed={spec.duration === n} onClick={() => setSpec(s => ({ ...s, duration: n }))}>{n} meses</Button>)}</div></div>
      {panel === 'backtest' && <div className="evf-backtest-controls"><Choice label="Usar somente os dados até" value={spec.cutoff} onChange={cutoff => setSpec(s => ({ ...s, cutoff }))} items={[...periods].reverse().map(value => ({ value, label: value }))} /><Button variant="ghost" aria-label="Período anterior" disabled={periods.indexOf(spec.cutoff) <= 0} onClick={() => setSpec(s => ({ ...s, cutoff: periods[periods.indexOf(s.cutoff) - 1] }))}>← Período anterior</Button><small>Escolha uma data passada para comparar a previsão com os registros posteriores, sem usar o futuro no cálculo.</small></div>}
      <section aria-busy={stale} className={`evf-chart-area ${stale ? 'evx-updating' : ''}`}>
        {busy && <BrainLoadingState variant="field" title="Atualizando previsão" />}
        {error && <div role="alert">{error}<Button onClick={() => setRetry(v => v + 1)}>Tentar novamente</Button></div>}
        {analysis && <><p className="evx-chart-caption">{measureLabel(measure)} · {percent ? '% das unidades' : 'unidades'} · previsão a partir de {analysis.spec.cutoff} · {analysis.spec.duration} meses{stale ? ' · resultado anterior, atualizando' : ''}</p><ForecastChart rows={rows} cutoff={analysis.spec.cutoff} methods={methods} percent={percent} units={p?.row.units} label="Histórico, previsão e dados posteriores" /></>}
      </section>
      <div className="evf-methods" role="group" aria-label="Modelos no gráfico">{METHODS.map(m => <Button key={m.id} variant="ghost" disabled={!available.includes(m.id)} aria-pressed={methods.includes(m.id)} onClick={() => toggleMethod(m.id)}>{m.label}</Button>)}</div>
      <p className="evf-note">Pontos escuros: registros informados. O pontilhado entre registros orienta a leitura; não cria dados nos meses vazios. Verde: referência Finotti. Linha vertical: início da previsão.</p>
      {panel === 'backtest' && historical && analysis && current && <BacktestCard analyses={[analysis]} measure={measure} step={1} disabled={stale} />}
    </>}
    {panel === 'method' && analysis && <section className="evf-method-detail"><h3>{p?.status}</h3><p>{p?.reason}</p>{METHODS.map(m => { const f = analysis.stock.cases[0].methods[m.id].forecast; return <section key={m.id}><h4>{m.label}</h4><p>{m.explanation}</p><p>{cleanReason(analysis.stock.cases[0].methods[m.id].reason)}</p>{f && <><p>Versão {f.version} · idade {f.origin.age} meses · estoque {f.origin.stock} un.</p><dl>{Object.entries(f.parameters).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl><p>{f.warnings.map(cleanReason).join(' ')}</p></>}</section>; })}<p>Elegibilidade operacional: {operationStatus(universe, analysis).status}. {operationStatus(universe, analysis).reasons.map(cleanReason).join(' ')}</p><small>Sem faixa calibrada. A origem de coleta de cada registro ainda não foi confirmada.</small></section>}
    {panel === 'table' && <div className="evx-table-wrap"><table><thead><tr><th>Mês</th><th>Histórico</th><th>Informado depois</th>{methods.map(m => <th key={m}>{METHODS.find(x => x.id === m)?.label}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.month}><td>{r.month}</td><td>{r.history ?? '—'}</td><td>{r.reported ?? '—'}</td>{methods.map(m => <td key={m}>{typeof r[m] === 'number' ? Number(r[m]).toFixed(2) : '—'}</td>)}</tr>)}</tbody></table></div>}
    {panel === 'backtest' && <OtherDates key={`${id}|${spec.duration}`} id={id} runtime={runtime} spec={spec} periods={periods} measure={measure} step={1} />}
  </DialogContent></Dialog>;
}
