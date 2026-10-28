import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import type { AnalysisSpec, CaseAnalysis, Measure } from './domain';
import type { AnalysisRuntime } from './runtime';
import { BacktestCard } from './BacktestCard';
export function OtherDates({ id, runtime, spec, first, latest, measure, step }: { id: string; runtime: AnalysisRuntime; spec: AnalysisSpec; first: string; latest: string; measure: Measure; step: 1 | 3 | 12 }) {
  const [date, setDate] = useState(spec.cutoff), [dates, setDates] = useState<string[]>([spec.cutoff]), [results, setResults] = useState<CaseAnalysis[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  function cancel() { sequence.current++; setBusy(false); }
  async function run() { const seq = ++sequence.current; setBusy(true); setError(''); setResults([]); try { const all = []; for (const cutoff of dates) { if (seq !== sequence.current) return; all.push(await runtime.analyze(id, { ...spec, cutoff }, 1)); } if (seq === sequence.current) setResults(all); } catch (e) { if (seq === sequence.current) setError(String(e)); } finally { if (seq === sequence.current) setBusy(false); } }
  return <details className="evx-panel"><summary>Testar em outras datas</summary><p>Compare o mesmo método em até 24 datas. O cálculo usa somente o passado de cada data. Repetições do empreendimento não são observações independentes.</p><div className="evx-actions"><label className="evx-field">Adicionar data ao teste<Input type="month" min={first} max={latest} value={date} onChange={e => setDate(e.target.value)} /></label><Button variant="outline" disabled={busy || dates.length >= 24 || dates.includes(date) || date < first || date > latest} onClick={() => { setDates(v => [...v, date].sort()); setResults([]); }}>Adicionar data</Button></div><div className="evx-actions">{dates.map(d => <Button variant="ghost" disabled={busy} key={d} onClick={() => { setDates(v => v.filter(x => x !== d)); setResults([]); }} aria-label={`Retirar ${d}`}>{d} ×</Button>)}</div><Button disabled={busy || !dates.length} onClick={() => void run()}>Comparar datas escolhidas</Button>{busy && <><BrainLoadingState variant="field" title="Comparando datas históricas" /><Button variant="ghost" onClick={cancel}>Cancelar comparação de datas</Button></>}{error && <p role="alert">{error}</p>}{results.length > 0 && <><p>Datas avaliadas: {results.map(r => r.spec.cutoff).join(', ')}. Este relatório é separado da exportação do intervalo principal.</p><BacktestCard analyses={results} measure={measure} step={step} /></>}</details>;
}
