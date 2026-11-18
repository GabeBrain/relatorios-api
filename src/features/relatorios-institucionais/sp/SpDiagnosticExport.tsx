import { Button } from '@/components/ui/button';
import type { SpPreview } from './model';
import { reviewSpSlides, spReviewSnapshot } from './review';

export function SpDiagnosticExport({ report }: { report: SpPreview }) {
  function download() {
    const snapshot = spReviewSnapshot(report, reviewSpSlides(report));
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `sp-${report.quarter}-${report.throughMonth ?? 'sem-fechamento'}-diagnostico.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="space-y-2">
    <Button variant="outline" onClick={download}>Baixar diagnóstico JSON</Button>
    <p className="text-xs text-muted-foreground">Envie este arquivo para investigar os slides: inclui período, fontes, preços e motivos das lacunas da geração atual. Não inclui token nem históricos individuais.</p>
  </div>;
}
