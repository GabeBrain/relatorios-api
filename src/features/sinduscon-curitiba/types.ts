export type ReportKind = 'alvaras' | 'cvco';

export interface ReviewItem {
  id: string;
  rowNumber: number;
  usage: string;
  residential: number;
  nonResidential: number;
  reason: string;
}

export interface ProcessedReport {
  kind: ReportKind;
  fileName: string;
  month: string;
  year: number;
  rowsRead: number;
  rowsRemoved: number;
  rows: Record<string, unknown>[];
  reviews: ReviewItem[];
}
