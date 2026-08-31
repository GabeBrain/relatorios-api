import { useEffect, useRef } from 'react';
import { CheckCircle2, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanoramaExportDeck } from './ReportPaginator';
import { synchronizeOfficialCoverCity } from '../lib/official-cover';
import { buildPanoramaPdf, PanoramaExportCancelled } from '../lib/pdf-export';
import { usePanoramaExportStore } from '../export-store';
import { quarterLabel } from '../lib/launches';
import { scopeCityLabel, scopeCitySlug } from '../types';
import { formatRemainingTime } from '../domain/generation-progress';

/**
 * Executa a exportação do Panorama fora da árvore da rota: montado pelo shell, sobrevive à
 * navegação do usuário entre páginas. O deck só existe enquanto o job está ativo.
 */
export default function PanoramaExportHost() {
  const { status, progress, total, error, report, result } = usePanoramaExportStore();
  const deckRef = useRef<HTMLDivElement>(null);
  const startedFor = useRef<PanoramaExportRunKey>(null);
  const exportStartedAt = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'preparing' || !report) return;
    const store = usePanoramaExportStore.getState();
    const signal = store.controller?.signal;
    const runKey = report as PanoramaExportRunKey;
    if (startedFor.current === runKey) return;
    startedFor.current = runKey;
    const cityLabel = scopeCityLabel(report.scope);
    synchronizeOfficialCoverCity(cityLabel, report.scope.uf, report.scope.endQuarter);

    // Aguarda o deck pintar antes de capturar; o efeito roda no mesmo commit que o monta.
    const run = async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const slides = [...(deckRef.current?.querySelectorAll<HTMLElement>('.panorama-report-page') ?? [])];
      if (!slides.length) { usePanoramaExportStore.getState().fail('Não foi possível montar as páginas do relatório.'); return; }
      usePanoramaExportStore.getState().markCapturing(slides.length);
      try {
        const built = await buildPanoramaPdf(slides, {
          title: `Panorama imobiliário de ${cityLabel}`,
          author: 'Brain Inteligência Estratégica',
          subject: `${cityLabel}/${report.scope.uf} · ${quarterLabel(report.scope.endQuarter)}`,
        }, ({ current, total: pages }) => {
          const live = usePanoramaExportStore.getState();
          live.reportProgress(current, pages);
          if (current === pages) live.markAssembling();
        }, signal);
        if (signal?.aborted) return;
        const name = `panorama-${scopeCitySlug(report.scope)}-${report.scope.endQuarter}.pdf`;
        const url = URL.createObjectURL(built.blob);
        const link = document.createElement('a');
        link.href = url; link.download = name; link.rel = 'noopener';
        document.body.append(link); link.click(); link.remove();
        usePanoramaExportStore.getState().succeed({ url, name, pages: built.pageCount });
      } catch (cause) {
        if (cause instanceof PanoramaExportCancelled || signal?.aborted) return;
        console.error('Falha ao gerar o PDF do Panorama', cause);
        usePanoramaExportStore.getState().fail(cause instanceof Error ? cause.message : 'Erro inesperado ao rasterizar as páginas.');
      }
    };
    void run();
  }, [status, report]);

  const running = status === 'preparing' || status === 'capturing' || status === 'assembling';
  if (running && exportStartedAt.current === null) exportStartedAt.current = Date.now();
  if (!running) exportStartedAt.current = null;
  const eta = status === 'capturing' && progress >= 2 && total > progress && exportStartedAt.current
    ? formatRemainingTime((Date.now() - exportStartedAt.current) / progress * (total - progress))
    : null;
  if (status === 'idle') return null;

  return (
    <>
      {report && <PanoramaExportDeck report={report} rootRef={deckRef} />}
      <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-4 shadow-lg print:hidden">
        <div className="flex items-start gap-3">
          {running && <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />}
          {status === 'done' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {status === 'preparing' && 'Preparando o PDF do Panorama…'}
              {status === 'capturing' && `Gerando o PDF do Panorama: ${progress} de ${total} páginas${eta ? ` · cerca de ${eta}` : ''}`}
              {status === 'assembling' && 'Montando o arquivo final…'}
              {status === 'done' && `PDF pronto: ${result?.pages} páginas`}
              {status === 'error' && 'Não foi possível gerar o PDF'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {running && 'Pode continuar navegando pela plataforma; o download começa sozinho ao terminar.'}
              {status === 'done' && 'O download começou automaticamente.'}
              {status === 'error' && error}
            </p>
            {running && total > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((progress / total) * 100)}%` }} />
              </div>
            )}
            {status === 'done' && result && (
              <p className="mt-2 text-xs">
                <a href={result.url} download={result.name} className="underline text-primary">Baixar novamente</a>
                <span className="text-muted-foreground"> · </span>
                <a href={result.url} target="_blank" rel="noreferrer" className="underline text-primary">Abrir em nova aba</a>
              </p>
            )}
            {running && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => usePanoramaExportStore.getState().cancel()}>Cancelar</Button>
            )}
          </div>
          {!running && (
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label="Dispensar aviso de exportação" onClick={() => usePanoramaExportStore.getState().dismiss()}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

type PanoramaExportRunKey = object | null;
