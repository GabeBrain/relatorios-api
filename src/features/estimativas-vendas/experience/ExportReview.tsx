import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { buildExportPlan, downloadFile, downloadPackage, forecastWorkbook, type ExportPlan } from './export';
import type { AnalysisRuntime } from './runtime';
import { methodLabel, type AnalysisSpec, type Universe } from './domain';
export function ExportReview({ universe, runtime, ids, spec, onClose }: { universe: Universe; runtime: AnalysisRuntime; ids: string[]; spec: AnalysisSpec; onClose: () => void }) {
  const [plan, setPlan] = useState<ExportPlan | null>(null), [done, setDone] = useState(0), [error, setError] = useState(''), [downloading, setDownloading] = useState(false);
  useEffect(() => {
    let live = true;
    async function prepare() {
      try {
        const analyses = [];
        for (const id of ids) { if (!live) return; analyses.push(await runtime.analyze(id, spec, 1)); if (live) setDone(analyses.length); }
        if (live) setPlan(buildExportPlan(universe, ids, analyses, spec));
      } catch (e) { if (live) setError(e instanceof Error ? e.message : String(e)); }
    }
    void prepare(); return () => { live = false; };
  }, [universe, runtime, ids, spec]);
  async function download(evidence = false) { if (!plan) return; setDownloading(true); try { if (evidence) await downloadPackage(plan); else downloadFile(await forecastWorkbook(plan) as BlobPart, 'previsoes.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); } catch (e) { setError(String(e)); } finally { setDownloading(false); } }
  return <Dialog open onOpenChange={open => { if (!open && !downloading) onClose(); }}><DialogContent className="evx-export"><DialogTitle>Revisar conjunto e exportar</DialogTitle><DialogDescription>Arquivo candidato para revisão. Contrato de importação no Geobrain ainda não homologado.</DialogDescription>
    <p>{ids.length} empreendimentos · {spec.cutoff === 'latest' ? 'último dado disponível de cada empreendimento' : `dados até ${spec.cutoff}`} · {spec.duration} meses de previsão.</p>
    {!plan && !error && <BrainLoadingState title={`Conferindo ${done}/${ids.length} empreendimentos`} description="Preparando previsões, histórico e rastreabilidade" />}
    {error && <p role="alert">{error}</p>}
    {plan && <><div className="evx-facts"><p>Com previsão<strong>{plan.manifest.included}</strong></p><p>Linhas analíticas<strong>{plan.forecasts.length}</strong></p></div>
      <p>Excel com uma linha por empreendimento e mês previsto, vendas líquidas e estoque. Relatório e histórico disponíveis separadamente.</p>
      <p>Métodos aplicados: {Object.entries(plan.manifest.methods).map(([m, n]) => `${methodLabel(m as AnalysisSpec['methods'][number])}: ${n}`).join(' · ') || 'nenhum'}.</p>
      <p>{plan.manifest.backtest.validComparisons ? `${plan.manifest.backtest.validComparisons} comparações de métodos/alvos avaliáveis; consultar origem e cobertura no relatório.` : 'Nenhum backtest válido neste intervalo. Isso não impede a revisão da projeção.'}</p>
      <details><summary>Ver exclusões e pendências ({plan.exclusions.length})</summary><ul>{plan.exclusions.map((r, i) => <li key={i}>ID {String(r.id)} · {String(r.arquivo)}: {String(r.motivo)}</li>)}</ul></details>
      <Button disabled={downloading || !plan.forecasts.length} onClick={() => void download()}>{downloading ? 'Preparando arquivo' : 'Baixar previsões em Excel'}</Button><Button variant="ghost" disabled={downloading} onClick={() => void download(true)}>Baixar relatório e evidências</Button>{downloading && <BrainLoadingState variant="field" title="Gerando arquivo revisável" />}</>}
    <Button variant="ghost" disabled={downloading} onClick={onClose}>Voltar à análise</Button>
  </DialogContent></Dialog>;
}
