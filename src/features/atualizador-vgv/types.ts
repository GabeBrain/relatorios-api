export type CellValue = string | number | boolean | Date | null | undefined;

export type VgvRow = Record<string, CellValue> & { __registro_id: number };

export interface PerformanceRow {
  __registro_id: number;
  Empreendimento: string;
  Tipologia: string;
  Mes: string;
  MesData: Date;
  [key: string]: CellValue;
}

export interface VgvMetadata {
  monthLabels: string[];
  monthColumns: string[];
  amenityColumns: string[];
}

export interface ParsedVgvWorkbook {
  base: VgvRow[];
  performance: PerformanceRow[];
  metadata: VgvMetadata;
  columns: string[];
}

export const INDEX_NAMES = ['INCC-DI', 'IPCA', 'IGP-DI'] as const;
export type IndexName = (typeof INDEX_NAMES)[number];

export interface IndexPoint {
  monthKey: string;
  date: Date;
  value: number;
}

export type IndexSeries = Record<IndexName, IndexPoint[]>;

export interface AdjustmentRow {
  __registro_id: number;
  Empreendimento: string;
  Mes: string;
  MesData: Date;
  nominal: number;
  indices: Partial<Record<IndexName, number>>;
  corrected: Partial<Record<IndexName, number>>;
}

export interface VgvFilters {
  empreendimentos: string[];
  cidades: string[];
  tipologias: string[];
  status: string[];
}
