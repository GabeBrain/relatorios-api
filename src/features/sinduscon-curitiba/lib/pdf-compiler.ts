import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import type { ReportKind } from '../types';

const MONTH_TOKENS: Record<string, string> = {
  Janeiro: 'JANEIRO', Fevereiro: 'FEVEREIRO', Março: 'MARCO', Abril: 'ABRIL', Maio: 'MAIO', Junho: 'JUNHO',
  Julho: 'JULHO', Agosto: 'AGOSTO', Setembro: 'SETEMBRO', Outubro: 'OUTUBRO', Novembro: 'NOVEMBRO', Dezembro: 'DEZEMBRO',
};

export interface CompiledPdf {
  bytes: Uint8Array;
  fileName: string;
  pageCount: number;
}

export async function compileSindusconPdf(
  reportPdf: ArrayBuffer,
  coverPdf: ArrayBuffer,
  mapPdf: ArrayBuffer,
  coverFont: ArrayBuffer,
  kind: ReportKind,
  month: string,
  year: number,
): Promise<CompiledPdf> {
  if (!MONTH_TOKENS[month] || !Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('Informe um mês e ano válidos.');
  const [report, cover, map] = await Promise.all([
    PDFDocument.load(reportPdf), PDFDocument.load(coverPdf), PDFDocument.load(mapPdf),
  ]);
  if (report.getPageCount() !== 8) throw new Error(`O PDF exportado do Excel deve conter exatamente 8 páginas. O arquivo enviado possui ${report.getPageCount()}.`);
  if (cover.getPageCount() !== 1 || map.getPageCount() !== 1) throw new Error('Os modelos internos de capa ou mapa estão inválidos.');

  const output = await PDFDocument.create();
  output.registerFontkit(fontkit);
  const [coverPage] = await output.copyPages(cover, [0]);
  output.addPage(coverPage);
  const font = await output.embedFont(coverFont, { subset: true });
  const period = `${MONTH_TOKENS[month]} DE ${year}`;
  const size = 20.04;
  const textWidth = font.widthOfTextAtSize(period, size);
  const pageWidth = coverPage.getWidth();
  coverPage.drawRectangle({ x: 30, y: 48, width: 480, height: 31, color: rgb(0.86, 0.86, 0.86), opacity: 0.94 });
  coverPage.drawText(period, { x: (pageWidth - textWidth) / 2, y: 55, size, font, color: rgb(0, 0, 0) });

  const [mapPage] = await output.copyPages(map, [0]);
  output.addPage(mapPage);
  const reportPages = await output.copyPages(report, report.getPageIndices());
  reportPages.forEach((page) => output.addPage(page));
  output.setTitle(`Relatório ${kind === 'alvaras' ? 'Liberados' : 'Concluídos'} Curitiba - ${month} ${year}`);
  output.setSubject('Pesquisa Imobiliária de Produção - Curitiba/PR');
  output.setCreator('Rebrain - Sinduscon Curitiba');
  output.setProducer('Rebrain');
  const token = MONTH_TOKENS[month];
  return {
    bytes: await output.save({ useObjectStreams: false }),
    fileName: `Relatorio_${kind === 'alvaras' ? 'Liberados' : 'Concluidos'}_CWB_${token}${year}.pdf`,
    pageCount: output.getPageCount(),
  };
}
