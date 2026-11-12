import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import type { PresentationChart } from '../../report/presentation/contract';

const columnName = (index: number) => {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name;
  return name;
};
/**
 * PptxGenJS 4.0.1 writes `value || ''` for ordinary chart worksheets, so 0
 * becomes blank although the chart cache still contains zero. Write the exact
 * original typed values into their existing cells: null stays blank, negative
 * and full precision stay unchanged. This is serialization, never reconciliation.
 */
export async function preserveWorkbookValues(data: ArrayBuffer, charts: PresentationChart[], signal?: AbortSignal): Promise<Blob> {
  const zip = unzipSync(new Uint8Array(data));
  const paths = Object.keys(zip).filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/chart(\d+)/)![1]) - Number(b.match(/chart(\d+)/)![1]));
  if (paths.length !== charts.length) throw new Error('Contagem de gráficos divergente do contrato de exportação.');
  for (const [index, path] of paths.entries()) {
    if (signal?.aborted) throw new Error('Exportação cancelada.');
    const number = path.match(/chart(\d+)/)![1];
    const relations = strFromU8(zip[`ppt/charts/_rels/chart${number}.xml.rels`]);
    const target = /Target="\.\.\/([^"]+\.xlsx)"/.exec(relations)?.[1];
    if (!target) throw new Error('Gráfico sem planilha editável embutida.');
    const workbookPath = `ppt/${target}`;
    const workbook = unzipSync(zip[workbookPath]);
    let sheet = strFromU8(workbook['xl/worksheets/sheet1.xml']);
    for (const [seriesIndex, series] of charts[index].series.entries()) {
      for (const [row, value] of series.values.entries()) {
        const address = `${columnName(seriesIndex + 1)}${row + 2}`;
        const pattern = new RegExp(`(<c\\s+r="${address}"[^>]*>)([\\s\\S]*?)(<\\/c>)`);
        if (!pattern.test(sheet)) throw new Error('Planilha sem célula numérica prevista no gráfico.');
        sheet = sheet.replace(pattern, (_match, open: string, _contents: string, close: string) => `${open}<v>${value === null ? '' : value}</v>${close}`);
      }
    }
    workbook['xl/worksheets/sheet1.xml'] = strToU8(sheet);
    zip[workbookPath] = zipSync(workbook, { level: 6 });
    if (index % 8 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  if (signal?.aborted) throw new Error('Exportação cancelada.');
  const bytes = zipSync(zip, { level: 6 });
  return new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}
