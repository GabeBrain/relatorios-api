// Modelo de dados da Auditoria v2.
// Um Finding é um achado do corretor; carrega o dado estruturado para a
// visualização (viz) correspondente ao padrão do tipo de erro (catálogo).

import type { ErrorType, AuditSection } from '../error-catalog';

export type Verdict = 'bug' | 'fp' | 'unsure';

/** Célula numérica ou textual de tabela extraída (IR ou complemento de visão). */
export type Cell = string | number | null;

export interface ExtractedTable {
  title: string;
  columns: string[];
  rows: Cell[][];
  /** Linha de totais declarada na tabela (para checagem de soma). */
  totals?: Cell[];
}

// ─── Payloads de visualização (discriminados por padrão) ────────────────────

export interface TableViz {
  kind: 'table';
  table: ExtractedTable;
  /** Colunas (índice) com inconsistência soma≠total. */
  badColumns?: number[];
  /** Linhas (índice) com inconsistência células≠total. */
  badRows?: number[];
  /** Resumo por coluna marcada: soma calculada vs total declarado. */
  notes?: string[];
}

export interface SideBySideRow {
  label: string;
  left: Cell;
  right: Cell;
  mismatch: boolean;
}
export interface SideBySideViz {
  kind: 'sidebyside';
  leftLabel: string;
  rightLabel: string;
  rows: SideBySideRow[];
}

export interface Bin {
  label: string;
  from: number;
  to: number | null; // null = "acima de"
}
export interface BinRangeViz {
  kind: 'binrange';
  unit: string;
  bins: Bin[];
  /** Índice após o qual há furo/sobreposição. */
  gapAfterIndex?: number;
  gapDescription?: string;
}

/** Padrões overlay/map/checklist: exibição textual + âncora opcional. */
export interface TextViz {
  kind: 'text';
  location?: string;   // "Cabeçalho da tabela", "Barra de busca"…
  evidence?: string;   // texto/valor citado
  checklist?: { label: string; status: 'ok' | 'missing' | 'na' }[];
}

export type Viz = TableViz | SideBySideViz | BinRangeViz | TextViz;

export interface Finding {
  id: string;
  type: ErrorType;
  section: AuditSection;
  /** Referência ao(s) slide(s): "s41" ou "s121 × s122". */
  slideRef: string;
  title: string;   // uma linha
  detail: string;  // linguagem natural
  /** true = checagem realizada e consistente (verde); false/undefined = problema. */
  ok?: boolean;
  /** Quando existe, reproduz a nota real do analista (gabarito). */
  gabarito?: string;
  viz?: Viz;
}

export interface StudyFixture {
  id: string;
  label: string;      // "Itajaí/SC — Élio Winter"
  city: string;
  type: string;       // "Horizontal (lotes)"
  slides: number;
  radii: string;
  findings: Finding[];
}
