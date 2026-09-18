import type { ProcessedReport, ReportKind } from './types';
import { processWorkbook } from './lib/report-processor';
import { buildStylePreservingWorkbook } from './lib/style-preserving-workbook';

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
