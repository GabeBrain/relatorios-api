export const PANORAMA_PDF_WIDTH = 960;
export const PANORAMA_PDF_HEIGHT = 540;
export const PANORAMA_EXPORT_WIDTH = 1920;
export const PANORAMA_EXPORT_HEIGHT = 1080;
const IMAGE_TIMEOUT_MS = 10_000;

export class PanoramaExportCancelled extends Error {
  constructor() { super('Exportação cancelada.'); this.name = 'PanoramaExportCancelled'; }
}

export interface PanoramaPdfProgress {
  current: number;
  total: number;
}

export interface PanoramaPdfResult {
  blob: Blob;
  pageCount: number;
  width: number;
  height: number;
}

async function waitForSlide(slide: HTMLElement) {
  await document.fonts?.ready;
  const images = [...slide.querySelectorAll('img')];
  await Promise.all(images.map(async (image) => {
    if (image.complete) return;
    // Nunca esperar indefinidamente: um asset preso travaria a exportação inteira sem sinal ao usuário.
    await new Promise<void>((resolve) => {
      const done = () => { clearTimeout(timer); resolve(); };
      const timer = setTimeout(done, IMAGE_TIMEOUT_MS);
      image.addEventListener('load', done, { once: true });
      image.addEventListener('error', done, { once: true });
    });
  }));
  await settlePaint();
}

/**
 * Em aba oculta o Chrome não dispara `requestAnimationFrame`: esperar por ele congelaria o export
 * justamente quando o usuário foi fazer outra coisa. Nesse caso basta ceder o event loop — o
 * layout, que é o que a captura precisa, continua sendo calculado.
 */
async function settlePaint() {
  if (document.visibilityState === 'hidden') {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    return;
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * Generates a flat, presentation-grade PDF. Each DOM slide becomes exactly one 16:9 PDF page.
 * This deliberately avoids browser print layout, headers and shell chrome.
 */
export async function buildPanoramaPdf(
  slides: HTMLElement[],
  metadata: { title: string; author: string; subject: string },
  onProgress: (progress: PanoramaPdfProgress) => void,
  signal?: AbortSignal,
): Promise<PanoramaPdfResult> {
  if (!slides.length) throw new Error('Não há páginas ativas para exportar.');

  const [{ PDFDocument }, { toJpeg, getFontEmbedCSS }] = await Promise.all([import('pdf-lib'), import('html-to-image')]);

  // Sem isto o html-to-image re-baixa e re-embute as webfonts a cada lâmina — ~950 ms por página,
  // 12x o custo total do export. O CSS é resolvido a partir da raiz do deck, e não de uma lâmina
  // isolada: `getFontEmbedCSS` filtra pelas fontes usadas no nó recebido, e uma página que só tem
  // imagem devolveria vazio, alterando a renderização das demais.
  const deckRoot = slides[0].closest<HTMLElement>('.panorama-export-root') ?? slides[0].parentElement ?? slides[0];
  const fontEmbedCSS = await getFontEmbedCSS(deckRoot);
  const pdf = await PDFDocument.create();
  pdf.setTitle(metadata.title);
  pdf.setAuthor(metadata.author);
  pdf.setSubject(metadata.subject);
  pdf.setCreator('Rebrain · Panorama Secovi/FIERGS');
  pdf.setCreationDate(new Date());

  for (let index = 0; index < slides.length; index += 1) {
    if (signal?.aborted) throw new PanoramaExportCancelled();
    const slide = slides[index];
    await waitForSlide(slide);
    const jpeg = await toJpeg(slide, {
      fontEmbedCSS,
      quality: 0.96,
      width: PANORAMA_EXPORT_WIDTH,
      height: PANORAMA_EXPORT_HEIGHT,
      pixelRatio: 1,
      cacheBust: false,
      backgroundColor: '#ffffff',
    });
    const image = await pdf.embedJpg(jpeg);
    const page = pdf.addPage([PANORAMA_PDF_WIDTH, PANORAMA_PDF_HEIGHT]);
    page.drawImage(image, { x: 0, y: 0, width: PANORAMA_PDF_WIDTH, height: PANORAMA_PDF_HEIGHT });
    onProgress({ current: index + 1, total: slides.length });
  }

  return {
    blob: new Blob([await pdf.save()], { type: 'application/pdf' }),
    pageCount: slides.length,
    width: PANORAMA_PDF_WIDTH,
    height: PANORAMA_PDF_HEIGHT,
  };
}
