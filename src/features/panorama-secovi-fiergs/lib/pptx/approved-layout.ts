import type PptxGenJS from 'pptxgenjs';
import { PanoramaExportCancelled, waitForSlide, type PanoramaExportMetadata, type PanoramaPdfProgress, type PanoramaPptxResult } from '../pdf-export';

/** Visual fidelity is independent of the reusable native-chart renderer in render.ts. */
const GRAPHICS = '[data-panorama-chart],.recharts-responsive-container,.panorama-fiergs-share-bars';
const W = 13.333333, H = 7.5;
export interface LayoutText { text: string; x: number; y: number; w: number; h: number; size: number; face: string; color: string; bold: boolean; italic: boolean; spacing: number; cell?: boolean; }
function check(signal?: AbortSignal) { if (signal?.aborted) throw new PanoramaExportCancelled(); }
function visible(element: Element, root: HTMLElement): boolean {
  for (let e: Element | null = element; e; e = e.parentElement) {
    const s = getComputedStyle(e);
    // Screen-reader-only text has a real Range box despite being visually clipped.
    // It must stay available in HTML, but never become a visible PowerPoint shape.
    if (e.matches('.panorama-sr-only,.sr-only,[hidden]') || s.clipPath === 'inset(50%)' || s.clip === 'rect(0px, 0px, 0px, 0px)') return false;
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0' || e.getAttribute('aria-hidden') === 'true') return false;
    if (e === root) break;
  }
  return true;
}
/** Actual browser line boxes, not numeric selectors or a second report layout. */
export function approvedLayoutText(root: HTMLElement): { texts: LayoutText[]; parents: Set<HTMLElement> } {
  const frame = root.getBoundingClientRect(), sx = W / frame.width, sy = H / frame.height;
  if (!frame.width || !frame.height) throw new Error('Página sem dimensões para exportar.');
  const texts: LayoutText[] = [], parents = new Set<HTMLElement>();
  const cells = new Map<HTMLElement, LayoutText[]>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement, value = node.textContent ?? '';
    if (!parent || !value.trim() || parent.closest(`${GRAPHICS},svg,script,style`) || !visible(parent, root)) continue;
    const style = getComputedStyle(parent), range = document.createRange();
    const lines: { text: string; left: number; top: number; right: number; bottom: number }[] = [];
    for (let i = 0; i < value.length; i++) {
      range.setStart(node, i); range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom <= frame.top || r.top >= frame.bottom) continue;
      const previous = lines.at(-1);
      if (previous && Math.abs(previous.top - r.top) < 1) {
        previous.text += value[i]; previous.right = Math.max(previous.right, r.right); previous.bottom = Math.max(previous.bottom, r.bottom);
      } else lines.push({ text: value[i], left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    }
    if (!lines.length) continue;
    parents.add(parent);
    const rgb = style.color.match(/[\d.]+/g)?.slice(0, 3).map(n => Math.round(Number(n)).toString(16).padStart(2, '0')).join('') ?? '20231d';
    for (const line of lines) if (line.text.trim()) {
      const text = style.textTransform === 'uppercase' ? line.text.toLocaleUpperCase('pt-BR') : style.textTransform === 'lowercase' ? line.text.toLocaleLowerCase('pt-BR') : line.text;
      const item: LayoutText = { text, x: (line.left - frame.left) * sx, y: (line.top - frame.top) * sy, w: (line.right - line.left + 2) * sx,
        h: (line.bottom - line.top + 2) * sy, size: parseFloat(style.fontSize) * sx * 72,
        face: style.fontFamily.split(',')[0].replace(/["']/g, '').trim(), color: rgb,
        bold: Number(style.fontWeight) >= 600 || style.fontWeight === 'bold', italic: style.fontStyle === 'italic',
        spacing: (parseFloat(style.letterSpacing) || 0) * sx * 72 };
      const cell = parent.closest<HTMLElement>('td,th');
      if (cell) { if (!cells.has(cell)) cells.set(cell, []); cells.get(cell)!.push(item); }
      else texts.push(item);
    }
  }
  // Cell geometry is the common alignment reference; browser glyph baselines differ
  // between fonts and PowerPoint. One editable box per cell also keeps headers intact.
  for (const [cell, items] of cells) {
    const r = cell.getBoundingClientRect();
    const ordered = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
    const text = ordered.map((item, i) => (i ? Math.abs(item.y - ordered[i - 1].y) > .03 ? '\n' : ' ' : '') + item.text.trim()).join('');
    texts.push({ ...items[0], text, cell: true, x: (r.left - frame.left + 3) * sx, y: (r.top - frame.top) * sy,
      w: Math.max(1, r.width - 6) * sx, h: r.height * sy });
  }
  return { texts, parents };
}

/** Same DOM as PDF: charts are individual images; other text, including cells, is editable. */
export async function buildPanoramaApprovedPptx(slides: HTMLElement[], metadata: PanoramaExportMetadata,
  onProgress: (p: PanoramaPdfProgress) => void, signal?: AbortSignal): Promise<PanoramaPptxResult> {
  check(signal);
  if (!slides.length) throw new Error('Não há páginas ativas para exportar.');
  const [{ default: Pptx }, { toPng, getFontEmbedCSS }] = await Promise.all([import('pptxgenjs'), import('html-to-image')]);
  const pptx = new Pptx(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = metadata.author; pptx.title = metadata.title;
  pptx.subject = metadata.subject; pptx.company = 'Brain Inteligência Estratégica';
  const fontEmbedCSS = await getFontEmbedCSS(slides[0].parentElement ?? slides[0]);
  for (const [index, original] of slides.entries()) {
    check(signal); await waitForSlide(original); check(signal);
    const clone = original.cloneNode(true) as HTMLElement;
    // Keep the same containing block and cqw units; never mutate the React-owned slide.
    original.parentElement!.append(clone);
    try {
      const frame = clone.getBoundingClientRect(), scaleX = W / frame.width, scaleY = H / frame.height;
      const { texts, parents } = approvedLayoutText(clone);
      const graphics = [...clone.querySelectorAll<HTMLElement>(GRAPHICS)].filter(e => !e.parentElement?.closest(GRAPHICS));
      const images: { data: string; x: number; y: number; w: number; h: number }[] = [];
      const snapshot = { fontEmbedCSS, pixelRatio: 1, cacheBust: false };
      for (const graphic of graphics) {
        const r = graphic.getBoundingClientRect();
        if (!r.width || !r.height || !visible(graphic, clone)) continue;
        images.push({ data: await toPng(graphic, snapshot), x: (r.left - frame.left) * scaleX, y: (r.top - frame.top) * scaleY, w: r.width * scaleX, h: r.height * scaleY });
        check(signal); graphic.style.opacity = '0';
      }
      // Text fill does not alter layout, table bars, borders or currentColor decorations.
      parents.forEach(e => e.style.setProperty('-webkit-text-fill-color', 'transparent', 'important'));
      // Isolate table decoration at its measured box: foreignObject font layout in
      // the full-page capture can otherwise shift the grid beneath native cell text.
      for (const table of clone.querySelectorAll<HTMLElement>('table')) {
        const r = table.getBoundingClientRect();
        if (!r.width || !r.height || !visible(table, clone)) continue;
        images.push({ data: await toPng(table, { ...snapshot, width: r.width, height: r.height, style: { margin: '0' } }),
          x: (r.left - frame.left) * scaleX, y: (r.top - frame.top) * scaleY, w: r.width * scaleX, h: r.height * scaleY });
        check(signal); table.style.opacity = '0';
      }
      const background = await toPng(clone, snapshot); check(signal);
      const slide = pptx.addSlide();
      slide.addImage({ data: background, x: 0, y: 0, w: W, h: H, objectName: 'Arte e decoração do layout aprovado' });
      for (const image of images) slide.addImage({ ...image, objectName: 'Gráfico: aparência aprovada' });
      for (const t of texts) slide.addText(t.text, { x: t.x, y: t.y, w: t.w, h: t.h, fontSize: t.size, fontFace: t.face,
        color: t.color, bold: t.bold, italic: t.italic, charSpacing: t.spacing, margin: 0, breakLine: false,
        valign: 'middle', align: t.cell ? 'center' : 'left', fit: 'shrink', wrap: Boolean(t.cell), objectName: `Texto editável: ${t.text.slice(0, 45)}` } as PptxGenJS.TextPropsOptions);
      slide.addNotes('panorama-approved-layout-v1: gráficos como imagens individuais; títulos, subtítulos, fontes e textos/células editáveis. Bordas, barras condicionais, artes e base cartográfica são decoração rasterizada. Motor nativo preservado separadamente.');
      onProgress({ current: index + 1, total: slides.length });
    } finally { clone.remove(); }
  }
  check(signal);
  const blob = await pptx.write({ outputType: 'blob', compression: true }) as Blob;
  check(signal);
  return { blob, pageCount: slides.length, width: 1920, height: 1080 };
}
