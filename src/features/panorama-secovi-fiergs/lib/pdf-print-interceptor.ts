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

function setExportStatus(button: HTMLButtonElement, message: string, error = false, link?: string) {
  let status = button.parentElement?.querySelector<HTMLElement>('[data-panorama-pdf-status]');
  if (!status) {
    status = document.createElement('span');
    status.dataset.panoramaPdfStatus = 'true';
    status.className = 'text-xs text-muted-foreground';
    button.parentElement?.append(status);
  }
  status.textContent = message;
  status.className = error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground';
  if (link) {
    const open = document.createElement('a');
    open.href = link;
    open.target = '_blank';
    open.rel = 'noreferrer';
    open.textContent = ' Abrir PDF';
    open.className = 'ml-2 underline text-primary';
    status.append(open);
  }
}

function panoramaSlides() {
  return [...document.querySelectorAll<HTMLElement>('.print\\:block .panorama-report-page')];
}

async function exportFromButton(button: HTMLButtonElement) {
  if (window.__panoramaPdfExporting) return;
  const slides = panoramaSlides();
  if (!slides.length) {
    setExportStatus(button, 'Não foi possível localizar as páginas do relatório. Gere o relatório novamente.', true);
    return;
  }
  const viewer = window.open('', '_blank');
  window.__panoramaPdfExporting = true;
  button.disabled = true;
  setExportStatus(button, `Preparando PDF: 0 de ${slides.length}`);
  try {
    const result = await buildPanoramaPdf(slides, {
      title: 'Panorama Secovi/FIERGS',
      author: 'Brain Inteligência Estratégica',
      subject: 'Relatório de mercado',
    }, ({ current, total }) => setExportStatus(button, `Gerando PDF: ${current} de ${total}`));
    const url = URL.createObjectURL(result.blob);
    if (viewer) viewer.location.href = url;
    setExportStatus(button, `PDF pronto: ${result.pageCount} páginas.`, false, viewer ? undefined : url);
  } catch (error) {
    viewer?.close();
    console.error('Falha ao gerar PDF do Panorama', error);
    const detail = error instanceof Error ? error.message : 'Erro inesperado ao rasterizar as páginas.';
    setExportStatus(button, `Não foi possível gerar o PDF: ${detail}`, true);
  } finally {
    button.disabled = false;
    window.__panoramaPdfExporting = false;
  }
}

document.addEventListener('click', (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>('button');
  if (!button || !button.textContent?.includes('Visualizar PDF')) return;
  event.preventDefault();
  event.stopPropagation();
  void exportFromButton(button);
}, true);

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
