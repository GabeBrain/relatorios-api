import type PptxGenJS from 'pptxgenjs';
import type { PanoramaPresentationPackage, PresentationChart, PresentationPage } from '../../report/presentation/contract';
import type { PanoramaExportMetadata, PanoramaPptxResult, PanoramaPdfProgress } from '../pdf-export';
import { PanoramaExportCancelled } from '../pdf-export';
import { customTerritoryLayout } from '../../report/custom-cover-layout';
import { containRaster } from './images';
import { preserveWorkbookValues } from './workbooks';

const INK = '20231D', OLIVE = '5D7737', MUTED = '62685C';
const WIDTH = 13.333333, HEIGHT = 7.5;
const palette = [OLIVE, 'E0BD42', '4776AA', 'C62026', '7B8178'];
const hex = (value: string) => value.replace(/^#/, '');
function checkAbort(signal?: AbortSignal) { if (signal?.aborted) throw new PanoramaExportCancelled(); }
export interface NativePptxOptions {
  signal?: AbortSignal; onProgress?: (p: PanoramaPdfProgress) => void; onAssembling?: () => void;
  /** Test/offline adapter; production fetches only explicit presentation image assets. */
  imageData?: (url: string, signal?: AbortSignal) => Promise<string>;
}
async function imageData(url: string, signal?: AbortSignal): Promise<string> {
  if (url.startsWith('data:image/')) return url;
  const abort = new AbortController();
  const stop = () => abort.abort(); signal?.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, 15_000);
  try {
    checkAbort(signal);
    const response = await fetch(url, { signal: abort.signal, credentials: 'omit' });
    if (!response.ok) throw new Error(`Imagem de apresentação indisponível (${response.status}).`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('Ativo de apresentação não é uma imagem.');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
      reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob);
    });
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', stop); }
}
function addText(slide: PptxGenJS.Slide, text: string, x: number, y: number, w: number, h: number, size = 12, color = INK, bold = false, align: 'left' | 'center' = 'left') {
  slide.addText(text, { x, y, w, h, fontFace: 'Montserrat', fontSize: size, color, bold, margin: 0,
    breakLine: false, isTextBox: true, valign: 'middle', align, objectName: `Texto: ${text.slice(0, 48)}` } as PptxGenJS.TextPropsOptions);
}
function chart(slide: PptxGenJS.Slide, pptx: PptxGenJS, data: PresentationChart, x: number, y: number, w: number, h: number) {
  if (!data.labels.length || !data.series.length) return;
  for (const series of data.series) {
    if (series.values.length !== data.labels.length || series.values.some((n) => n !== null && !Number.isFinite(n))) throw new Error('Série gráfica inválida.');
  }
  const observed = data.series.flatMap((s) => s.values).filter((n): n is number => n !== null);
  const smallIntegerRange = observed.length > 0 && observed.every(Number.isInteger) && !data.percentage && !data.unit?.includes('R$')
    && Math.max(...observed) - Math.min(...observed) < 10;
  const options: PptxGenJS.IChartOpts = { x, y, w, h, showTitle: false, showLegend: data.series.length > 1, legendPos: 'b',
    legendFontFace: 'Montserrat', legendFontSize: 9, chartColors: data.series.map((s, i) => hex(s.color ?? palette[i % palette.length])),
    showValue: true, catAxisLabelFontFace: 'Montserrat', catAxisLabelFontSize: w < 5 ? 8 : 10,
    valAxisLabelFontFace: 'Montserrat', valAxisLabelFontSize: 9, catAxisLabelColor: INK, valAxisLabelColor: MUTED,
    showCatAxisTitle: false, showValAxisTitle: Boolean(data.unit), valAxisTitle: data.unit,
    barDir: data.horizontal ? 'bar' : 'col', barGrouping: 'clustered',
    dataLabelFormatCode: data.percentage ? '0.0"%"' : data.unit?.includes('R$') ? '#,##0.00' : '#,##0', valAxisLabelFormatCode: data.percentage ? '0.0"%"' : '#,##0',
    ...(smallIntegerRange ? { valAxisMajorUnit: 1 } : {}),
    displayBlanksAs: 'gap', lineDataSymbol: 'none', lineSize: 2, dataLabelPosition: data.type === 'line' ? 't' : 'outEnd', dataLabelColor: INK, dataLabelFontSize: 9,
    valGridLine: { color: 'E5E8E0', size: .5 },
    chartArea: { fill: { color: 'FFFFFF', transparency: 100 } }, plotArea: { fill: { color: 'FFFFFF', transparency: 100 } },
  };
  const series = data.series.map((s) => ({ name: s.name, labels: [...data.labels], values: [...s.values] as number[] }));
  const kinds = new Set(data.series.map((s) => s.type ?? data.type));
  if (kinds.size > 1) {
    // Runtime API for combo charts uses the second argument as options (the v4
    // declaration still calls it data:any[]). Passing [] triggers Array.fill as a color.
    slide.addChart(data.series.map((s, index) => ({ type: (s.type === 'line' ? pptx.ChartType.line : pptx.ChartType.bar), data: [series[index]],
      options: { showValue: s.type !== 'line', dataLabelPosition: s.type === 'line' ? 't' : 'outEnd' } })), options as unknown as []);
  } else slide.addChart(data.type === 'line' ? pptx.ChartType.line : pptx.ChartType.bar, series, options);
}
async function renderPage(slide: PptxGenJS.Slide, pptx: PptxGenJS, page: PresentationPage, load: (url: string) => Promise<string>) {
  const { blocks, definition: def } = page;
  if (page.cover) {
    const c = page.cover, names = c.cities, isStudy = c.kind === 'study';
    slide.background = { color: 'F8F9F5' };
    addText(slide, `BRAIN · PANORAMA IMOBILIÁRIO · ${c.entity} / ${c.uf}`, .65, .5, 12, .35, 12, OLIVE, true);
    const headline = isStudy ? c.official ? 'REGIÃO METROPOLITANA\nDE PORTO ALEGRE' : names.length === 1 ? names[0] : 'Panorama de mercado' : 'Recorte territorial';
    const titleSize = headline.length > 65 ? 25 : headline.length > 35 ? 32 : 39;
    addText(slide, headline, .65, 1.45, 12, 1.1, titleSize, INK, true);
    slide.addShape(pptx.ShapeType.rect, { x: .65, y: 2.75, w: 1.2, h: .07, fill: { color: 'F4D100' }, line: { transparency: 100 } });
    const visible = isStudy ? names.length > 1 && names.length <= 4 ? names : [] : names;
    if (!isStudy && c.official) {
      const map = blocks.find((b) => b.kind === 'image');
      if (map?.kind === 'image') { const data = await load(map.src); slide.addImage({ data, ...containRaster(data, .65, 3.1, 5.5, 2.7) }); }
      names.forEach((name, index) => addText(slide, name, 6.8, 3.1 + index * .26, 5.8, .25, 13, INK, true));
      addText(slide, 'Porto Alegre: referência geográfica; não integra este preset.', .65, 5.95, 12, .3, 10, MUTED);
      addText(slide, `Fechamento · ${c.closing}`, .65, 6.4, 12, .4, 19, INK, true);
      addText(slide, `Janela do estudo ${c.window}`, .65, 7.02, 12, .2, 9, MUTED);
      return;
    }
    if (visible.length) {
      const longest = Math.max(...visible.map((n) => n.length));
      const cols = customTerritoryLayout(visible).columns;
      const rows = Math.ceil(visible.length / cols), cw = 12 / cols, rh = Math.min(.85, 2.85 / rows);
      visible.forEach((name, i) => {
        const lastRowCount = visible.length - (rows - 1) * cols, row = Math.floor(i / cols);
        const offset = row === rows - 1 ? (cols - lastRowCount) * cw / 2 : 0;
        addText(slide, name, .65 + i % cols * cw + offset, 3.1 + row * rh, cw - .3, rh - .08, longest > 70 ? 14 : 17, INK, true, 'center');
      });
    } else if (names.length > 1) addText(slide, `${names.length} municípios · ${c.uf}`, .65, 3.15, 12, .6, 23, OLIVE, true);
    addText(slide, `Fechamento · ${c.closing}`, .65, 6.15, 12, .4, 19, INK, true);
    addText(slide, `Janela do estudo ${c.window}`, .65, 7.02, 12, .2, 9, MUTED);
    return;
  }
  // Only genuine source art/decorative assets are images, never analytic page captures.
  if (page.background) slide.addImage({ data: await load(page.background), x: 0, y: 0, w: WIDTH, h: HEIGHT });
  if (!blocks.length) return;
  if (def.visualFamily === 'divider') {
    addText(slide, def.title.toLocaleUpperCase('pt-BR'), 2.1, 2.6, 10.3, 1.8, 32, page.background && !def.fiergsOfficialSlide ? 'FFFFFF' : INK, true);
    return;
  }
  const title = blocks.find((b) => b.kind === 'text' && b.role === 'title');
  const heading = title?.kind === 'text' ? title.text : def.title;
  addText(slide, heading, .55, .38, 12.1, 1.05, heading.length > 95 ? 20 : 23, INK, true);
  slide.addShape(pptx.ShapeType.line, { x: .55, y: 1.5, w: 12.1, h: 0, line: { color: OLIVE, width: 1 } });
  const tables = blocks.filter((b) => b.kind === 'table');
  const charts = blocks.filter((b) => b.kind === 'chart');
  const maps = blocks.filter((b) => b.kind === 'map');
  const body = blocks.filter((b) => b.kind === 'text' && b !== title && b.role !== 'footer');
  const images = blocks.filter((b) => b.kind === 'image');
  if (tables.length) {
    const perHeight = 4.9 / tables.length;
    for (const [index, table] of tables.entries()) {
      const columns = Math.max(...table.rows.map((row) => row.reduce((sum, cell) => sum + (cell.colspan ?? 1), 0)));
      const fontSize = Math.min(12, Math.max(8, 95 / Math.max(columns, 1)), perHeight * 58 / Math.max(table.rows.length, 1));
      if (fontSize < 8) throw new Error(`Página ${def.page}: tabela densa exige revisão de paginação, sem truncar dados.`);
      slide.addTable(table.rows.map((row) => row.map((cell) => ({ text: cell.text, options: { bold: cell.header || cell.total, colspan: cell.colspan,
        rowspan: cell.rowspan, fill: { color: cell.fill ?? (cell.header ? 'E7EBE0' : 'FFFFFF') }, color: INK } }))), {
        x: .55, y: 1.75 + index * perHeight, w: 12.1, rowH: Math.min(.42, (perHeight - .2) / table.rows.length), fontFace: 'Montserrat', fontSize,
        margin: 3, border: { color: 'D5D8CF', pt: .4 }, autoPage: false, valign: 'middle',
      });
    }
  } else if (charts.length) {
    if (charts.length === 1) chart(slide, pptx, charts[0].chart, .55, 1.9, 12.1, 4.5);
    else {
      chart(slide, pptx, charts[0].chart, .55, 2.15, 8.1, 4.1);
      for (let i = 1; i < charts.length; i++) {
        const h = 4.65 / (charts.length - 1), y = 1.9 + (i - 1) * h;
        addText(slide, charts[i].chart.series[0]?.name ?? '', 8.9, y - .12, 3.85, .28, 9, MUTED, true);
        chart(slide, pptx, charts[i].chart, 8.9, y + .16, 3.85, h - (charts[i].chart.annotation ? .52 : .28));
        if (charts[i].chart.annotation) addText(slide, charts[i].chart.annotation!, 8.9, y + h - .26, 3.85, .23, 10, OLIVE, true, 'center');
      }
    }
  } else if (maps.length) {
    const map = maps[0], x = .6, y = 1.8, w = 9.2, h = 4.9;
    for (let i = 0; i < map.tiles.length; i++) slide.addImage({ data: await load(map.tiles[i]), x: x + i % map.columns * w / map.columns, y: y + Math.floor(i / map.columns) * h / map.rows, w: w / map.columns, h: h / map.rows });
    for (const marker of map.markers) {
      const size = marker.size;
      slide.addShape(pptx.ShapeType.ellipse, { x: x + marker.x * w - size / 2, y: y + marker.y * h - size / 2, w: size, h: size,
        fill: { color: hex(marker.color) }, line: { color: 'FFFFFF', width: .5 } });
      if (marker.label) addText(slide, marker.label, x + marker.x * w - .06, y + marker.y * h - .05, .12, .1, 5, 'FFFFFF');
    }
    addText(slide, '© OpenStreetMap contributors · © Mapbox', x, 6.75, 8, .15, 7, MUTED);
  }
  // Non-analytic editorial content (covers, teams, scope lists) uses editable text.
  if (!tables.length && !charts.length) {
    const list = body.filter((b) => b.kind === 'text');
    const x = maps.length ? 10.05 : .65, w = maps.length ? 2.6 : images.length ? 8.4 : 12;
    const h = Math.min(.48, 4.7 / Math.max(list.length, 1));
    for (const [i, item] of list.entries()) {
      if (item.kind === 'text') addText(slide, item.text, x, 1.9 + i * h, w, h, Math.min(16, h * 32), MUTED);
    }
    for (const [i, image] of images.entries()) {
      const data = await load(image.src);
      slide.addImage({ data, ...containRaster(data, 9.6, 1.9 + i * Math.min(1.4, 4.7 / images.length), 2.8, Math.min(1.3, 4.6 / images.length)) });
    }
  } else {
    const summaries = body.map((b) => b.kind === 'text' ? b.text : '').join(' · ');
    if (summaries.length) {
      const lines = Math.max(1, Math.ceil(summaries.length / 150));
      if (lines > 4) throw new Error(`Página ${def.page}: anotações exigem layout dedicado; nenhum texto foi descartado.`);
      addText(slide, summaries, .6, 6.6, 12, Math.min(.48, .16 * lines), 8, MUTED);
    }
  }
  const footer = blocks.find((b) => b.kind === 'text' && b.role === 'footer');
  if (footer?.kind === 'text') addText(slide, footer.text, .6, 7.12, 11.5, .18, 7, MUTED);
  addText(slide, String(def.page), 12.2, 7.1, .5, .22, 8, MUTED);
}
export async function renderPanoramaEditablePptx(pkg: PanoramaPresentationPackage, metadata: PanoramaExportMetadata, options: NativePptxOptions = {}): Promise<PanoramaPptxResult> {
  checkAbort(options.signal);
  if (!pkg.pages.length) throw new Error('Não há páginas ativas para exportar.');
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = metadata.author; pptx.title = metadata.title;
  pptx.subject = metadata.subject; pptx.company = 'Brain Inteligência Estratégica';
  pptx.theme = { headFontFace: 'Montserrat', bodyFontFace: 'Montserrat' };
  const assets = new Map<string, Promise<string>>();
  const load = (url: string) => { if (!assets.has(url)) assets.set(url, (options.imageData ?? imageData)(url, options.signal)); return assets.get(url)!; };
  for (const [i, page] of pkg.pages.entries()) {
    checkAbort(options.signal); const slide = pptx.addSlide();
    await renderPage(slide, pptx, page, load);
    slide.addNotes(JSON.stringify({ schemaVersion: pkg.schemaVersion, generation: pkg.generation, page: page.id, rasterized: page.rasterized }));
    options.onProgress?.({ current: i + 1, total: pkg.pages.length });
    if (i % 4 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  checkAbort(options.signal); options.onAssembling?.();
  const data = await pptx.write({ outputType: 'arraybuffer', compression: true }) as ArrayBuffer;
  const charts = pkg.pages.flatMap((page) => page.blocks.flatMap((block) => block.kind === 'chart' && block.chart.labels.length && block.chart.series.length ? [block.chart] : []));
  const blob = await preserveWorkbookValues(data, charts, options.signal);
  checkAbort(options.signal);
  return { blob, pageCount: pkg.pages.length, width: 1920, height: 1080 };
}
