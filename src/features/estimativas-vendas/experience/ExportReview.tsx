import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { buildExportPlan, downloadPackage, type ExportPlan } from './export';
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
  async function download() { if (!plan) return; setDownloading(true); try { await downloadPackage(plan); } catch (e) { setError(String(e)); } finally { setDownloading(false); } }
  return <Dialog open onOpenChange={open => { if (!open && !downloading) onClose(); }}><DialogContent className="evx-export"><DialogTitle>Revisar conjunto e exportar</DialogTitle><DialogDescription>Arquivo candidato para revisão. Contrato de importação no Geobrain ainda não homologado.</DialogDescription>
    <p>{ids.length} empreendimentos · dados até {spec.cutoff} · {spec.duration} meses de previsão. A composição fica congelada durante esta revisão.</p>
    {!plan && !error && <BrainLoadingState title={`Conferindo ${done}/${ids.length} empreendimentos`} description="Preparando previsões, histórico e rastreabilidade" />}
    {error && <p role="alert">{error}</p>}
    {plan && <><div className="evx-facts"><p>Com previsão<strong>{plan.manifest.included}</strong></p><p>Linhas analíticas<strong>{plan.forecasts.length}</strong></p><p>Linhas candidatas estruturais<strong>{plan.candidates.length}</strong></p></div>
      <h3>O que acompanha o pacote</h3><p>Previsões, histórico utilizado, resumo do processamento, manifesto, comparações históricas e motivos de exclusão. XLSX candidato somente quando há uma tipologia identificada e período novo.</p>
      <p><strong>Nenhuma linha aprovada para importação.</strong> Origem, cadência, preço e reconciliação continuam pendentes. Campos não definidos ficam vazios, com explicação acompanhante.</p>
      {!plan.candidates.length && <p>Sem linhas candidatas estruturais nesta seleção. O pacote analítico permanece disponível.</p>}
      <p>Métodos aplicados: {Object.entries(plan.manifest.methods).map(([m, n]) => `${methodLabel(m as AnalysisSpec['methods'][number])}: ${n}`).join(' · ') || 'nenhum'}.</p>
      <p>{plan.manifest.backtest.validComparisons ? `${plan.manifest.backtest.validComparisons} comparações de métodos/alvos avaliáveis; consultar origem e cobertura no relatório.` : 'Nenhum backtest válido neste intervalo. Isso não impede a revisão da projeção.'}</p>
      <details><summary>Ver exclusões e pendências ({plan.exclusions.length})</summary><ul>{plan.exclusions.map((r, i) => <li key={i}>ID {String(r.id)} · {String(r.arquivo)}: {String(r.motivo)}</li>)}</ul></details>
      <Button disabled={downloading} onClick={() => void download()}>{downloading ? 'Preparando arquivo' : 'Baixar pacote para revisão'}</Button>{downloading && <BrainLoadingState variant="field" title="Gerando arquivo revisável" />}</>}
    <Button variant="ghost" disabled={downloading} onClick={onClose}>Voltar à análise</Button>
  </DialogContent></Dialog>;
}
