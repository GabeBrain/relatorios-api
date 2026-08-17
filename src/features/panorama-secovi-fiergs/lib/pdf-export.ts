export const PANORAMA_PDF_WIDTH = 960;
export const PANORAMA_PDF_HEIGHT = 540;
export const PANORAMA_EXPORT_WIDTH = 1920;
export const PANORAMA_EXPORT_HEIGHT = 1080;

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
    await new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }));
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/**
 * Generates a flat, presentation-grade PDF. Each DOM slide becomes exactly one 16:9 PDF page.
 * This deliberately avoids browser print layout, headers and shell chrome.
 */
export async function buildPanoramaPdf(
  slides: HTMLElement[],
  metadata: { title: string; author: string; subject: string },
  onProgress: (progress: PanoramaPdfProgress) => void,
): Promise<PanoramaPdfResult> {
  if (!slides.length) throw new Error('Não há páginas ativas para exportar.');

  const [{ PDFDocument }, { toJpeg }] = await Promise.all([import('pdf-lib'), import('html-to-image')]);
  const pdf = await PDFDocument.create();
  pdf.setTitle(metadata.title);
  pdf.setAuthor(metadata.author);
  pdf.setSubject(metadata.subject);
  pdf.setCreator('Rebrain · Panorama Secovi/FIERGS');
  pdf.setCreationDate(new Date());

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index];
    await waitForSlide(slide);
    const jpeg = await toJpeg(slide, {
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
