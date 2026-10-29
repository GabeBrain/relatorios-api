import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { buildExportPlan, downloadFile, downloadPackage, forecastWorkbook, type ExportPlan } from './export';
import { FORECAST_COLUMNS, type ForecastColumn } from './exportColumns';
import { ExportPreview } from './ExportPreview';
import type { AnalysisRuntime } from './runtime';
import { methodLabel, type AnalysisSpec, type Universe } from './domain';
import './export-preview.css';
export function ExportReview({ universe, runtime, ids, spec, onClose }: { universe: Universe; runtime: AnalysisRuntime; ids: string[]; spec: AnalysisSpec; onClose: () => void }) {
  const [prepared, setPrepared] = useState<{ universe: Universe; ids: string[]; spec: AnalysisSpec; plan: ExportPlan } | null>(null), [done, setDone] = useState(0), [error, setError] = useState(''), [downloading, setDownloading] = useState(false);
  const [columns, setColumns] = useState<ForecastColumn[]>([...FORECAST_COLUMNS]);
  const plan = prepared?.universe === universe && prepared.ids === ids && prepared.spec === spec ? prepared.plan : null;
  useEffect(() => {
    let live = true; setDone(0); setError(''); setColumns([...FORECAST_COLUMNS]);
    async function prepare() {
      try {
        const analyses = [];
        for (const id of ids) { if (!live) return; analyses.push(await runtime.analyze(id, spec, 1)); if (live) setDone(analyses.length); }
        if (live) setPrepared({ universe, ids, spec, plan: buildExportPlan(universe, ids, analyses, spec) });
      } catch (e) { if (live) setError(e instanceof Error ? e.message : String(e)); }
    }
    void prepare(); return () => { live = false; };
  }, [universe, runtime, ids, spec]);
  async function download(evidence = false) { if (!plan || downloading) return; setDownloading(true); setError(''); try { if (evidence) await downloadPackage(plan, columns); else downloadFile(await forecastWorkbook(plan, columns) as BlobPart, 'previsoes.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); } catch (e) { setError(String(e)); } finally { setDownloading(false); } }
  return <Dialog open onOpenChange={open => { if (!open && !downloading) onClose(); }}><DialogContent className="evx-export eve-review" onEscapeKeyDown={e => { if (downloading) e.preventDefault(); }} onPointerDownOutside={e => { if (downloading) e.preventDefault(); }}><header><DialogTitle>Revisar conjunto e exportar</DialogTitle><DialogDescription>Arquivo para revisão · importação no Geobrain ainda não homologada.</DialogDescription></header>
    <p className="eve-summary">{ids.length} empreendimentos · {spec.cutoff === 'latest' ? 'último dado de cada empreendimento' : `dados até ${spec.cutoff}`} · {spec.duration} meses{plan ? ` · ${plan.forecasts.length} linhas` : ''}</p>
    {!plan && !error && <BrainLoadingState title={`Conferindo ${done}/${ids.length} empreendimentos`} description="Preparando previsões e rastreabilidade" />}
    {error && <p role="alert">{error}</p>}
    {plan && <><ExportPreview rows={plan.forecasts} columns={columns} onChange={setColumns} disabled={downloading} />
      <div className="eve-meta"><span>{plan.manifest.included} com previsão</span><span>{Object.entries(plan.manifest.methods).map(([m, n]) => `${methodLabel(m as AnalysisSpec['methods'][number])}: ${n}`).join(' · ') || 'Sem método'}</span><span>{plan.manifest.backtest.validComparisons ? `${plan.manifest.backtest.validComparisons} comparações avaliáveis` : 'Sem backtest válido neste intervalo'}</span></div>
      {plan.exclusions.length > 0 && <details className="eve-pending"><summary>Exclusões e pendências ({plan.exclusions.length})</summary><ul>{plan.exclusions.map((r, i) => <li key={i}>ID {String(r.id)} · {String(r.arquivo)}: {String(r.motivo)}</li>)}</ul></details>}
    </>}
    <footer className="eve-footer"><div className="evx-actions"><Button disabled={downloading || !plan?.forecasts.length || !columns.length} onClick={() => void download()}>{downloading ? 'Preparando arquivo' : 'Baixar previsões em Excel'}</Button><Button variant="ghost" disabled={downloading || !plan} onClick={() => void download(true)}>Baixar relatório e evidências</Button><Button variant="ghost" disabled={downloading} onClick={onClose}>Voltar à análise</Button></div>{downloading && <BrainLoadingState variant="field" title="Gerando arquivo revisável" />}</footer>
  </DialogContent></Dialog>;
}
