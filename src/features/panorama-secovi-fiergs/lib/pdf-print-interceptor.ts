import { buildPanoramaPdf } from './pdf-export';

declare global { interface Window { __panoramaPdfExporting?: boolean; } }

/**
 * Compatibility bridge for the legacy paginator while it is being decomposed.
 * It turns its existing export action into a Blob PDF and never opens the print dialog.
 */
function syncExportLabel() {
  for (const button of document.querySelectorAll('button')) {
    if (button.textContent?.includes('Exportar PDF')) {
      const text = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      if (text) text.textContent = 'Visualizar PDF';
    }
  }
}

new MutationObserver(syncExportLabel).observe(document.documentElement, { childList: true, subtree: true });
queueMicrotask(syncExportLabel);

window.print = () => {
  if (window.__panoramaPdfExporting) return;
  const slides = [...document.querySelectorAll<HTMLElement>('.print\\:block .panorama-report-page')];
  if (!slides.length) {
    console.error('Não foi possível localizar as páginas do Panorama para gerar o PDF.');
    return;
  }
  const viewer = window.open('', '_blank');
  window.__panoramaPdfExporting = true;
  void buildPanoramaPdf(slides, {
    title: 'Panorama Secovi/FIERGS',
    author: 'Brain Inteligência Estratégica',
    subject: 'Relatório de mercado',
  }, () => undefined).then((result) => {
    const url = URL.createObjectURL(result.blob);
    if (viewer) viewer.location.href = url;
    else window.open(url, '_blank');
  }).catch((error) => {
    viewer?.close();
    console.error('Falha ao gerar PDF do Panorama', error);
  }).finally(() => { window.__panoramaPdfExporting = false; });
};
