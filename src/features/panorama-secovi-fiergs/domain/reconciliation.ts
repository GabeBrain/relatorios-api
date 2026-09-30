import type { MarketCube } from './cube';
import type { PanoramaCityComparisons, PanoramaGranularBlocks, PanoramaReconciliation, PanoramaReconciliationRow, PanoramaScope, ReportMarketBlock } from '../types';

interface ReconciliationInput {
  scope: PanoramaScope;
  cube: MarketCube;
  sales: { units: ReportMarketBlock; unitsByTypology: ReportMarketBlock };
  stock: { units: ReportMarketBlock; unitsByTypology: ReportMarketBlock };
  granular: PanoramaGranularBlocks;
  cityComparisons: PanoramaCityComparisons;
}

const nullableSum = (values: (number | null)[]): number | null =>
  values.reduce<number | null>((sum, value) => value === null ? sum : (sum ?? 0) + value, null);

const closingVertical = (block: ReportMarketBlock, period: string): number | null =>
  block.series.find((row) => row.quarter === period)?.vertical ?? null;

const totalOf = <T extends { kind: string }>(rows: T[]): T | undefined => rows.find((row) => row.kind === 'total');

function row(input: Omit<PanoramaReconciliationRow, 'delta' | 'status'>): PanoramaReconciliationRow {
  const delta = input.canonicalTotal === null || input.dimensionalTotal === null ? null : input.dimensionalTotal - input.canonicalTotal;
  const status = delta === null ? 'unavailable' : Math.abs(delta) <= input.tolerance ? 'match' : 'different';
  return { ...input, delta, status };
}

/**
 * Contrato de publicação FIERGS. Cada dimensão declara fonte, fórmula, universo e período; uma
 * contagem crítica diferente ou indisponível torna o relatório não homologável antes do export.
 */
export function reconcilePanoramaReport(input: ReconciliationInput): PanoramaReconciliation {
  if ((input.scope.entity ?? 'secovi-sp') !== 'fiergs-rs') return { homologable: true, rows: [] };
  const period = input.scope.endQuarter;
  const vertical = input.cube.projects.filter((project) => project.segment === 'Vertical');
  const horizontal = input.cube.projects.filter((project) => project.segment === 'Horizontal');
  const canonicalSales = nullableSum(vertical.map((project) => project.soldUnits));
  const canonicalStock = nullableSum(vertical.map((project) => project.finalUnits));
  const areaTotal = totalOf(input.granular.areaBands);
  const cohortTotal = totalOf(input.granular.cohortsHorizontal);
  const horizontalProjects = new Set(horizontal.map((project) => project.key)).size;
  const horizontalLaunched = nullableSum(horizontal.map((project) => project.launchedUnits));
  const horizontalFinal = nullableSum(horizontal.map((project) => project.finalUnits));
  const universe = `fiergs-rs · ${input.scope.uf} · ${input.scope.cities.join(', ')} · Vertical`;
  const horizontalUniverse = `fiergs-rs · ${input.scope.uf} · ${input.scope.cities.join(', ')} · Horizontal homologável`;
  const countRow = (metricId: string, source: string, formula: string, canonicalTotal: number | null, dimensionalTotal: number | null, rowUniverse = universe) => row({
    metricId, source, formula, universe: rowUniverse, period, canonicalTotal, dimensionalTotal, tolerance: 0, critical: true,
  });
  const rows = [
    countRow('sales.vertical.pattern', input.sales.units.source, 'Soma do fechamento vertical por padrão.', canonicalSales, closingVertical(input.sales.units, period)),
    countRow('sales.vertical.typology', input.sales.unitsByTypology.source, 'Soma do fechamento vertical por tipologia.', canonicalSales, closingVertical(input.sales.unitsByTypology, period)),
    countRow('sales.vertical.city', 'comparativo municipal derivado do cubo granular', 'Soma das vendas verticais das cidades concluídas.', canonicalSales, input.cityComparisons.enabled ? nullableSum(input.cityComparisons.sales.map((item) => item.liquidSales)) : null),
    countRow('sales.vertical.area', 'cubo granular / faixas de área', 'Soma das vendas por faixa de área útil.', canonicalSales, areaTotal?.soldUnits ?? null),
    countRow('stock.vertical.pattern', input.stock.units.source, 'Soma da oferta final vertical por padrão.', canonicalStock, closingVertical(input.stock.units, period)),
    countRow('stock.vertical.typology', input.stock.unitsByTypology.source, 'Soma da oferta final vertical por tipologia.', canonicalStock, closingVertical(input.stock.unitsByTypology, period)),
    countRow('stock.vertical.area', 'cubo granular / faixas de área', 'Soma da oferta final por faixa de área útil.', canonicalStock, areaTotal?.finalUnits ?? null),
    countRow('horizontal.projects.cohort', 'cubo granular / coortes horizontais', 'Empreendimentos distintos por coorte.', horizontalProjects, cohortTotal?.projects ?? null, horizontalUniverse),
    countRow('horizontal.launched.cohort', 'cubo granular / coortes horizontais', 'Soma da oferta lançada horizontal por coorte.', horizontalLaunched, cohortTotal?.launchedUnits ?? null, horizontalUniverse),
    countRow('horizontal.final.cohort', 'cubo granular / coortes horizontais', 'Soma da oferta final horizontal por coorte.', horizontalFinal, cohortTotal?.finalUnits ?? null, horizontalUniverse),
    countRow('horizontal.chacaras.runtime', 'política de entidade fiergs-rs', 'Contagem de projetos condominio_chacaras presentes após o filtro.', 0, horizontal.filter((project) => project.horizontalSubtype === 'condominio_chacaras').length, horizontalUniverse),
  ];
  return { homologable: rows.every((item) => !item.critical || item.status === 'match'), rows };
}
