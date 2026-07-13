// Modelo de dados da Auditoria v2.
// Um Finding é um achado do corretor; carrega o dado estruturado para a
// visualização (viz) correspondente ao padrão do tipo de erro (catálogo).

import type { ErrorType, AuditSection } from '../error-catalog';

export type Verdict = 'bug' | 'fp' | 'unsure';

/** Célula numérica ou textual de tabela extraída (IR ou complemento de visão). */
export type Cell = string | number | null;

/** Semântica de coluna declarada pela visão (hipótese; o verificador confere a aritmética). */
export type ColKind = 'label' | 'count' | 'share' | 'rate' | 'measure' | 'other';

export interface ExtractedTable {
  title: string;
  columns: string[];
  rows: Cell[][];
  /** Linha de totais declarada na tabela (para checagem de soma). */
  totals?: Cell[];
  /** Semântica por coluna (v3.3). count=soma no total; share=% que soma 100;
   *  rate=taxa/variação que NÃO soma 100; measure=fecha em média. */
  colKinds?: ColKind[];
  /** Como a linha de totais fecha: sum | mean | mixed | none. */
  totalKind?: 'sum' | 'mean' | 'mixed' | 'none';
  /** Para cada coluna share (índice), o índice da coluna absoluta que ela percentua. */
  shareOf?: Record<number, number>;
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

/** Mapa + métricas: raios esperados × detectados (padrão 5 do handoff). */
export interface MapViz {
  kind: 'map';
  expected: string[];  // raios contratados / modais
  detected: string[];  // raios encontrados no slide
  note?: string;
}

export type Viz = TableViz | SideBySideViz | BinRangeViz | TextViz | MapViz;

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
  /** sha1 da imagem de tabela que originou o achado (visão) → evidência visual (v3.3). */
  evidenceSha1?: string;
  /** A leitura da visão foi reconfirmada no modelo maior após divergência. */
  escalated?: boolean;
  /** path no Storage da imagem-evidência, depois de persistida (v3.3). */
  evidenceImage?: string;
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
