import { buildPanoramaPdf } from './pdf-export';
import slide57 from '../assets/corporate/panorama-57.png';
import slide58 from '../assets/corporate/panorama-58.png';
import slide59 from '../assets/corporate/panorama-59.png';
import slide60 from '../assets/corporate/panorama-60.png';
import slide61 from '../assets/corporate/panorama-61.png';
import slide62 from '../assets/corporate/panorama-62.png';

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

const officialSlides: Record<number, string> = { 57: slide57, 58: slide58, 59: slide59, 60: slide60, 61: slide61, 62: slide62 };

function syncOfficialStaticSlides() {
  for (const [page, asset] of Object.entries(officialSlides)) {
    for (const sheet of document.querySelectorAll<HTMLElement>(`[aria-label^="Página ${page}:"]`)) {
      if (sheet.dataset.officialStatic === asset) continue;
      const image = document.createElement('img');
      image.src = asset;
      image.alt = `Slide oficial ${page} do Panorama Secovi/FIERGS`;
      image.className = 'panorama-static-official';
      sheet.replaceChildren(image);
      sheet.dataset.officialStatic = asset;
    }
  }
}

new MutationObserver(() => { syncExportLabel(); syncOfficialStaticSlides(); }).observe(document.documentElement, { childList: true, subtree: true });
queueMicrotask(() => { syncExportLabel(); syncOfficialStaticSlides(); });

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
