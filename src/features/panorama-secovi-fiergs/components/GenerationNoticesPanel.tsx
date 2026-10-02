import { AlertTriangle, Info } from 'lucide-react';
import type { PanoramaReportModel } from '../types';

export function GenerationNoticesPanel({ report, idPrefix = 'generation' }: { report: PanoramaReportModel; idPrefix?: string }) {
  const notices = report.notices;
  const critical = notices.some((notice) => notice.severity === 'critical');
  return <section aria-labelledby={`${idPrefix}-notices-title`} className="rounded-xl border bg-card p-4">
    <div className="flex items-start gap-3">
      {critical ? <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden="true"/> : <Info className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true"/>}
      <div className="min-w-0 flex-1">
        <h2 id={`${idPrefix}-notices-title`} className="font-semibold">Avisos deste relatório <span className="text-muted-foreground">({notices.length})</span></h2>
        {notices.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Nenhuma omissão ou ressalva de cobertura foi identificada para este recorte.</p> :
          <ul className="mt-2 space-y-2">{notices.map((notice, index) => <li key={`${notice.code}-${notice.indicator}-${index}`} className="rounded-lg border p-3">
            <details>
              <summary className="cursor-pointer text-sm font-medium">{notice.indicator} · {notice.severity === 'critical' ? 'crítico' : notice.severity === 'warning' ? 'atenção' : 'informativo'}</summary>
              <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[130px_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Código</dt><dd>{notice.code}</dd>
                <dt className="text-muted-foreground">Entidade / período</dt><dd>{notice.entity} · {notice.period}</dd>
                {notice.affectedPages.length > 0 && <><dt className="text-muted-foreground">Páginas afetadas</dt><dd>{notice.affectedPages.join(', ')}</dd></>}
                {notice.affectedOfficialSlides.length > 0 && <><dt className="text-muted-foreground">IDs oficiais</dt><dd>{notice.affectedOfficialSlides.join(', ')}</dd></>}
                <dt className="text-muted-foreground">Motivo</dt><dd>{notice.reason}</dd>
                <dt className="text-muted-foreground">Fonte</dt><dd>{notice.source}</dd>
                <dt className="text-muted-foreground">Exibição</dt><dd>{notice.displayDecision}</dd>
              </dl>
            </details>
          </li>)}</ul>}
      </div>
    </div>
  </section>;
}
