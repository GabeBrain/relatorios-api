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

/** Competência em rótulo mês/ano (julho/2026), sem depender do fuso do navegador. */
export function formatCompetencia(competencia: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(competencia ?? '');
  if (!match) return competencia ?? '—';
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${months[Number(match[2]) - 1] ?? match[2]}/${match[1]}`;
}
