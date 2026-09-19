import type { ProcessedReport, ReportKind } from './types';
import { processWorkbook } from './lib/report-processor';
import { buildStylePreservingWorkbook } from './lib/style-preserving-workbook';
import {
  consolidateMonthlyBase,
  generateFinalReport,
  tabulateConsolidatedBase,
  type ConsolidationOutput,
  type FinalReportOutput,
  type TabulationOutput,
} from './lib/monthly-workflow';
import { compileSindusconPdf, type CompiledPdf } from './lib/pdf-compiler';

export async function processSindusconFile(file: File, kind: ReportKind): Promise<{ report: ProcessedReport; blob: Blob; fileName: string }> {
  const buffer = await file.arrayBuffer();
  const processed = processWorkbook(buffer, file.name, kind);
  const bytes = buildStylePreservingWorkbook(buffer, processed);
  const { workbook: _workbook, layout: _layout, ...report } = processed;
  return {
    report,
    blob: new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName: `${kind === 'alvaras' ? 'Alvaras' : 'CVCO'}_tratado_${report.month}_${report.year}.xlsx`,
  };
}

export async function consolidateSindusconFiles(baseFile: File, currentFile: File, kind: ReportKind): Promise<ConsolidationOutput> {
  const [baseBuffer, currentBuffer] = await Promise.all([baseFile.arrayBuffer(), currentFile.arrayBuffer()]);
  return consolidateMonthlyBase(baseBuffer, currentBuffer, currentFile.name, kind);
}

export async function tabulateSindusconFile(file: File, kind: ReportKind): Promise<TabulationOutput> {
  return tabulateConsolidatedBase(await file.arrayBuffer(), kind);
}

export async function createSindusconFinalReport(file: File, kind: ReportKind): Promise<FinalReportOutput> {
  const templatePath = kind === 'alvaras' ? '/sinduscon-templates/report-liberados.xlsx' : '/sinduscon-templates/report-concluidos.xlsx';
  const response = await fetch(templatePath);
  if (!response.ok) throw new Error('O modelo interno do relatório não está disponível. Tente novamente ou avise a equipe responsável.');
  const [tabulationBuffer, templateBuffer] = await Promise.all([file.arrayBuffer(), response.arrayBuffer()]);
  return generateFinalReport(tabulationBuffer, templateBuffer, kind);
}

export async function createSindusconFinalPdf(file: File, kind: ReportKind, month: string, year: number): Promise<CompiledPdf> {
  const coverPath = kind === 'alvaras' ? '/sinduscon-templates/capa-liberados.pdf' : '/sinduscon-templates/capa-concluidos.pdf';
  const [coverResponse, mapResponse, fontResponse, reportPdf] = await Promise.all([
    fetch(coverPath),
    fetch('/sinduscon-templates/mapa-curitiba.pdf'),
    fetch('/sinduscon-templates/righteous-regular.ttf'),
    file.arrayBuffer(),
  ]);
  if (!coverResponse.ok || !mapResponse.ok || !fontResponse.ok) throw new Error('Os modelos internos da capa ou do mapa não estão disponíveis.');
  return compileSindusconPdf(reportPdf, await coverResponse.arrayBuffer(), await mapResponse.arrayBuffer(), await fontResponse.arrayBuffer(), kind, month, year);
}
