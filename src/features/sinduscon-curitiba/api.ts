import type { ProcessedReport, ReportKind } from './types';
import * as XLSX from 'xlsx';
import { processWorkbook } from './lib/report-processor';

const PROCESSOR_URL = String(import.meta.env.VITE_SINDUSCON_PROCESSOR_URL ?? '').replace(/\/$/, '');

export async function processSindusconFile(file: File, kind: ReportKind): Promise<{ report: ProcessedReport; blob: Blob; fileName: string }> {
  if (!PROCESSOR_URL) {
    const report = processWorkbook(await file.arrayBuffer(), file.name, kind);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.rows), kind === 'alvaras' ? 'Alvarás tratados' : 'CVCO tratado');
    const reviews = report.reviews.length ? report.reviews : [{ Status: 'Nenhuma revisão humana pendente.' }];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reviews), 'Revisão humana');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    return { report, blob: new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName: `${kind === 'alvaras' ? 'Alvaras' : 'CVCO'}_tratado_${report.month}_${report.year}.xlsx` };
  }
  const body = new FormData();
  body.set('file', file);
  body.set('kind', kind);
  const response = await fetch(`${PROCESSOR_URL}/process`, { method: 'POST', body });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.detail ?? payload.error ?? 'NÃƒÂ£o foi possÃƒÂ­vel tratar a planilha.'));
  const base64 = String(payload.contentBase64 ?? '');
  if (!base64) throw new Error('O serviÃƒÂ§o nÃƒÂ£o devolveu o arquivo tratado.');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const rawReport = payload.report as Omit<ProcessedReport, 'rows'>;
  const rowsKept = Number(rawReport.rowsKept ?? 0);
  return { report: { ...rawReport, rows: Array.from({ length: rowsKept }, () => ({})), rowsKept }, blob: new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName: String(payload.fileName ?? 'planilha_tratada.xlsx') };
}
