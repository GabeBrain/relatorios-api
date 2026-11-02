import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { FORECAST_COLUMNS, type ForecastColumn } from './exportColumns';
import { ExportContent } from './ExportContent';
import { useExportPlan } from './useExportPlan';
import type { AnalysisRuntime } from './runtime';
import { methodLabel, type AnalysisSpec, type Universe } from './domain';
import './export-preview.css';
export function ExportReview({ universe, runtime, ids, spec, onClose }: { universe: Universe; runtime: AnalysisRuntime; ids: string[]; spec: AnalysisSpec; onClose: () => void }) {
  const { plan, done, error, retry } = useExportPlan(universe, runtime, ids, spec);
  const [downloading, setDownloading] = useState(false);
  const [columns, setColumns] = useState<ForecastColumn[]>([...FORECAST_COLUMNS]);
  return <Dialog open onOpenChange={open => { if (!open && !downloading) onClose(); }}><DialogContent className="evx-export eve-review" onEscapeKeyDown={e => { if (downloading) e.preventDefault(); }} onPointerDownOutside={e => { if (downloading) e.preventDefault(); }}><header><DialogTitle>Revisar conjunto e exportar</DialogTitle><DialogDescription>Arquivo para revisão · importação no Geobrain ainda não homologada.</DialogDescription></header>
    <p className="eve-summary">{ids.length} empreendimentos · {spec.cutoff === 'latest' ? 'último dado de cada empreendimento' : `dados até ${spec.cutoff}`} · {spec.duration} meses{plan ? ` · ${plan.forecasts.length} linhas` : ''}</p>
    {!plan && !error && <BrainLoadingState title={`Conferindo ${done}/${ids.length} empreendimentos`} description="Preparando previsões e rastreabilidade" />}
    {error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={retry}>Tentar novamente</Button></div>}
    {plan && <><div className="eve-meta"><span>{plan.manifest.included} com previsão</span><span>{Object.entries(plan.manifest.methods).map(([m, n]) => `${methodLabel(m as AnalysisSpec['methods'][number])}: ${n}`).join(' · ') || 'Sem método'}</span><span>{plan.manifest.backtest.validComparisons ? `${plan.manifest.backtest.validComparisons} comparações avaliáveis` : 'Sem backtest válido neste intervalo'}</span></div>
      {plan.exclusions.length > 0 && <details className="eve-pending"><summary>Exclusões e pendências ({plan.exclusions.length})</summary><ul>{plan.exclusions.map((r, i) => <li key={i}>ID {String(r.id)} · {String(r.arquivo)}: {String(r.motivo)}</li>)}</ul></details>}
      <ExportContent plan={plan} columns={columns} onColumns={setColumns} onBusy={setDownloading}><Button variant="ghost" disabled={downloading} onClick={onClose}>Voltar à análise</Button></ExportContent>
    </>}
  </DialogContent></Dialog>;
}
