import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { downloadFiergsAudit } from '../lib/fiergs-audit';
import type { PanoramaReportModel } from '../types';
import type { PanoramaExportFormat } from '../export-store';
import type { ConsistencyAlert } from '../report/consistency-alerts';

export function ReportConsistencyAlertsDialog({ report, alerts, open, onOpenChange, pendingFormat, onContinue, restoreFocus }: {
  report: PanoramaReportModel; alerts: ConsistencyAlert[]; open: boolean; onOpenChange: (open: boolean) => void;
  pendingFormat?: PanoramaExportFormat; onContinue?: () => void; restoreFocus?: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden" onCloseAutoFocus={(event) => { if (restoreFocus) { event.preventDefault(); restoreFocus(); } }}>
      <DialogHeader>
        <DialogTitle>Alertas de consistência</DialogTitle>
        <DialogDescription>{pendingFormat
          ? 'Confira os pontos abaixo antes de continuar o download. Os alertas e os valores observados permanecem registrados na auditoria.'
          : 'Veja os ajustes aplicados e os pontos de atenção desta geração. Os arquivos do relatório continuam disponíveis.'}</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto pr-2">
        {(['adjustment', 'consistency', 'notice'] as const).map((kind) => {
          const items = alerts.filter((a) => a.kind === kind);
          if (!items.length) return null;
          return <section key={kind} aria-label={kind === 'adjustment' ? 'Ajustes aplicados' : kind === 'consistency' ? 'Pontos de consistência' : 'Outros avisos'}>
            <h3 className="mb-2 text-sm font-semibold">{kind === 'adjustment' ? 'Ajustes aplicados' : kind === 'consistency' ? 'Pontos de consistência' : 'Outros avisos'}</h3>
            <ul className="space-y-2">{items.map((item) => <li key={item.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{item.title}</p><p className="mt-1 break-words text-muted-foreground">{item.description}</p>
              {item.details?.length ? <details className="mt-2">
                <summary className="cursor-pointer font-medium">Ver detalhes ({item.details.length})</summary>
                <ul className="mt-2 space-y-2">{item.details.map((detail, index) => <li key={index}>
                  <p className="font-medium">{detail.title}</p><p className="break-words text-muted-foreground">{detail.description}</p>
                </li>)}</ul>
              </details> : null}
            </li>)}</ul>
          </section>;
        })}
        {!alerts.length && <p className="text-sm text-muted-foreground">Nenhum alerta de consistência identificado nesta geração.</p>}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => downloadFiergsAudit(report)}>Auditoria CSV</Button>
        <Button variant={pendingFormat ? 'outline' : 'default'} onClick={() => onOpenChange(false)}>{pendingFormat ? 'Voltar' : 'Entendi'}</Button>
        {pendingFormat && <Button onClick={onContinue}>Continuar e baixar {pendingFormat === 'pdf' ? 'PDF' : 'PPT espelho'}</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
