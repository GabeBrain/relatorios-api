export type ReportKind = 'alvaras' | 'cvco';

export interface ReviewItem {
  id: string;
  rowNumber: number;
  usage: string;
  residential: number;
  nonResidential: number;
  reason: string;
}

export interface UnitDecision {
  id: string;
  rowNumber: number;
  usage: string;
  originalResidential: number;
  originalNonResidential: number;
  finalResidential: number;
  finalNonResidential: number;
  decision: string;
}

export interface ProcessedReport {
  kind: ReportKind;
  fileName: string;
  month: string;
  year: number;
  rowsRead: number;
  rowsRemoved: number;
  rows: Record<string, unknown>[];
  rowsKept?: number;
  reviews: ReviewItem[];
  decisions: UnitDecision[];
}
