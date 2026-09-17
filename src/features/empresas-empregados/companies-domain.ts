import type { CompaniesAggregatedRow, CompaniesBreakdown, CompaniesBreakdownItem } from './types';

export const CNAE_SECTION_LABELS: Record<string, string> = {
  A: 'A · Agricultura, pecuária e extrativa vegetal',
  B: 'B · Indústrias extrativas',
  C: 'C · Indústrias de transformação',
  D: 'D · Eletricidade e gás',
  E: 'E · Água, esgoto e resíduos',
  F: 'F · Construção',
  G: 'G · Comércio e reparação de veículos',
  H: 'H · Transporte e armazenagem',
  I: 'I · Alojamento e alimentação',
  J: 'J · Informação e comunicação',
  K: 'K · Atividades financeiras e seguros',
  L: 'L · Atividades imobiliárias',
  M: 'M · Atividades profissionais e técnicas',
  N: 'N · Atividades administrativas e serviços complementares',
  O: 'O · Administração pública e defesa',
  P: 'P · Educação',
  Q: 'Q · Saúde humana e serviços sociais',
  R: 'R · Artes, cultura, esporte e recreação',
  S: 'S · Outras atividades de serviços',
  T: 'T · Serviços domésticos',
  U: 'U · Organismos internacionais',
  ND: 'Seção não informada',
};

export const PORTE_LABELS: Record<string, string> = {
  '00': 'Não informado',
  '01': 'Microempresa (ME)',
  '03': 'Empresa de pequeno porte (EPP)',
  '05': 'Demais portes',
};

export const REGIME_LABELS: Record<string, string> = {
  mei: 'MEI',
  simples: 'Simples Nacional',
  nenhum: 'Não optante',
};

export const MATRIZ_FILIAL_LABELS: Record<string, string> = {
  '1': 'Matriz',
  '2': 'Filial',
};

export const SIMPLES_DISCLAIMER =
  'Simples/MEI representa o estado cadastral atual da fonte, não uma foto histórica da competência.';

function groupBy(
  rows: CompaniesAggregatedRow[],
  key: (row: CompaniesAggregatedRow) => string,
  labels: Record<string, string>,
): CompaniesBreakdownItem[] {
  const totals = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    const bucket = key(row);
    totals.set(bucket, (totals.get(bucket) ?? 0) + row.quantidade);
    total += row.quantidade;
  }
  return [...totals.entries()]
    .map(([code, quantidade]) => ({
      code,
      label: labels[code] ?? code,
      quantidade,
      percentage: total > 0 ? (quantidade / total) * 100 : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

export function totalEstablishments(rows: CompaniesAggregatedRow[]): number {
  return rows.reduce((sum, row) => sum + row.quantidade, 0);
}

export function buildCompaniesBreakdown(rows: CompaniesAggregatedRow[]): CompaniesBreakdown {
  return {
    cnaeSections: groupBy(rows, (row) => row.cnae_secao, CNAE_SECTION_LABELS),
    porte: groupBy(rows, (row) => row.porte, PORTE_LABELS),
    matrizFilial: groupBy(rows, (row) => String(row.matriz_filial), MATRIZ_FILIAL_LABELS),
    regimeSimples: groupBy(rows, (row) => row.regime_simples, REGIME_LABELS),
  };
}

/** Macro setores usados nos relatórios Brain, derivados da seção CNAE. */
export const MACRO_SECTORS = [
  'Administração Pública',
  'Agropecuária',
  'Comércio',
  'Construção Civil',
  'Extração Mineral',
  'Indústria de Transformação',
  'Serviços de Utilidade Pública',
  'Serviços',
  'Não informado',
] as const;

export type MacroSector = (typeof MACRO_SECTORS)[number];

const SECTION_TO_MACRO: Record<string, MacroSector> = {
  A: 'Agropecuária',
  B: 'Extração Mineral',
  C: 'Indústria de Transformação',
  D: 'Serviços de Utilidade Pública',
  E: 'Serviços de Utilidade Pública',
  F: 'Construção Civil',
  G: 'Comércio',
  O: 'Administração Pública',
  ND: 'Não informado',
};

export function macroSectorFromSection(section: string): MacroSector {
  return SECTION_TO_MACRO[String(section ?? '').trim().toUpperCase()] ?? 'Serviços';
}

/** Colunas de porte disponíveis na fonte (Receita Federal). */
export const PORTE_COLUMNS: { code: string; label: string }[] = [
  { code: '01', label: 'Micro (ME)' },
  { code: '03', label: 'Pequena (EPP)' },
  { code: '05', label: 'Demais portes' },
  { code: '00', label: 'Sem enquadramento' },
];

export interface SectorSizeCell {
  quantidade: number;
  percentage: number;
}

export interface SectorSizeRow {
  sector: MacroSector;
  cells: Record<string, SectorSizeCell>;
  total: number;
  totalPercentage: number;
}

export interface SectorSizeMatrix {
  rows: SectorSizeRow[];
  totals: Record<string, number>;
  grandTotal: number;
}

/** Cruzamento macro setor × porte: % de cada célula é sobre o total do próprio setor. */
export function buildSectorSizeMatrix(rows: CompaniesAggregatedRow[]): SectorSizeMatrix {
  const bySector = new Map<MacroSector, Map<string, number>>();
  const totals: Record<string, number> = {};
  let grandTotal = 0;

  for (const row of rows) {
    const sector = macroSectorFromSection(row.cnae_secao);
    const porte = PORTE_COLUMNS.some((column) => column.code === row.porte) ? row.porte : '00';
    const bucket = bySector.get(sector) ?? new Map<string, number>();
    bucket.set(porte, (bucket.get(porte) ?? 0) + row.quantidade);
    bySector.set(sector, bucket);
    totals[porte] = (totals[porte] ?? 0) + row.quantidade;
    grandTotal += row.quantidade;
  }

  const matrixRows: SectorSizeRow[] = [...bySector.entries()]
    .map(([sector, bucket]) => {
      const total = [...bucket.values()].reduce((sum, value) => sum + value, 0);
      const cells: Record<string, SectorSizeCell> = {};
      for (const column of PORTE_COLUMNS) {
        const quantidade = bucket.get(column.code) ?? 0;
        cells[column.code] = { quantidade, percentage: total > 0 ? (quantidade / total) * 100 : 0 };
      }
      return {
        sector,
        cells,
        total,
        totalPercentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      } satisfies SectorSizeRow;
    })
    .sort((a, b) => MACRO_SECTORS.indexOf(a.sector) - MACRO_SECTORS.indexOf(b.sector));

  return { rows: matrixRows, totals, grandTotal };
}

/** Competência em rótulo mês/ano (julho/2026), sem depender do fuso do navegador. */
export function formatCompetencia(competencia: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(competencia ?? '');
  if (!match) return competencia ?? '—';
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${months[Number(match[2]) - 1] ?? match[2]}/${match[1]}`;
}
