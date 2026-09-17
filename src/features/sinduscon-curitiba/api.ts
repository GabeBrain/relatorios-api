import type { ProcessedReport, ReportKind } from './types';

const PROCESSOR_URL = String(import.meta.env.VITE_SINDUSCON_PROCESSOR_URL ?? '').replace(/\/$/, '');

export async function processSindusconFile(file: File, kind: ReportKind): Promise<{ report: ProcessedReport; blob: Blob; fileName: string }> {
  if (!PROCESSOR_URL) throw new Error('O serviço de preservação de planilhas ainda não foi configurado neste ambiente.');
  const body = new FormData();
  body.set('file', file);
  body.set('kind', kind);
  const response = await fetch(`${PROCESSOR_URL}/process`, { method: 'POST', body });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.detail ?? payload.error ?? 'Não foi possível tratar a planilha.'));
  const base64 = String(payload.contentBase64 ?? '');
  if (!base64) throw new Error('O serviço não devolveu o arquivo tratado.');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const rawReport = payload.report as Omit<ProcessedReport, 'rows'>;
  const rowsKept = Number(rawReport.rowsKept ?? 0);
  return { report: { ...rawReport, rows: Array.from({ length: rowsKept }, () => ({})), rowsKept }, blob: new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName: String(payload.fileName ?? 'planilha_tratada.xlsx') };
}
