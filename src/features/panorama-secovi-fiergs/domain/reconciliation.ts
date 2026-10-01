import type { MarketCube } from './cube';
import { quarterIndex } from './quarters';
import type { PanoramaCityComparisons, PanoramaGranularBlocks, PanoramaReconciliation, PanoramaReconciliationRow, PanoramaScope, ReportMarketBlock } from '../types';

interface ReconciliationInput {
  scope: PanoramaScope;
  cube: MarketCube;
  sales: { units: ReportMarketBlock; unitsByTypology: ReportMarketBlock };
  stock: { units: ReportMarketBlock; unitsByTypology: ReportMarketBlock };
  granular: PanoramaGranularBlocks;
  cityComparisons: PanoramaCityComparisons;
  locations: { projectKey?: string; latitude: number; longitude: number }[];
}

const nullableSum = (values: (number | null)[]): number | null =>
  values.reduce<number | null>((sum, value) => value === null ? sum : (sum ?? 0) + value, null);

const closingVertical = (block: ReportMarketBlock, period: string): number | null =>
  block.series.find((row) => row.quarter === period)?.vertical ?? null;

const totalOf = <T extends { kind: string }>(rows: T[]): T | undefined => rows.find((row) => row.kind === 'total');

const visibleSum = <T extends { kind: string }>(rows: T[], value: (row: T) => number | null | undefined): number | null =>
  nullableSum(rows.filter((item) => item.kind !== 'total' && item.kind !== 'subtotal').map((item) => value(item) ?? null));

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
  const canonicalLaunched = nullableSum(vertical.map((project) => project.launchedUnits));
  const canonicalStock = nullableSum(vertical.map((project) => project.finalUnits));
  const negativeTypologyResidual = (metric: 'launchedUnits' | 'finalUnits' | 'soldUnits') => vertical.reduce((magnitude, project) => {
    const projectTotal = project[metric];
    if (projectTotal === null) return magnitude;
    const typedTotal = nullableSum(project.typologies.map((item) => item[metric])) ?? 0;
    const residual = projectTotal - typedTotal;
    return residual < 0 ? magnitude + Math.abs(residual) : magnitude;
  }, 0);
  const areaTotal = totalOf(input.granular.areaBands);
  const cohortVerticalTotal = totalOf(input.granular.cohortsVertical);
  const priceStandardTotal = totalOf(input.granular.pricesByStandard);
  const priceTypologyTotal = totalOf(input.granular.pricesByTypology);
  const cohortTotal = totalOf(input.granular.cohortsHorizontal);
  const horizontalVgvSubtotal = input.granular.vgv.find((item) => item.kind === 'subtotal' && item.segment === 'Horizontal');
  const horizontalProjects = new Set(horizontal.map((project) => project.key)).size;
  const horizontalLaunched = nullableSum(horizontal.map((project) => project.launchedUnits));
  const horizontalFinal = nullableSum(horizontal.map((project) => project.finalUnits));
  const inWindow = (project: MarketCube['projects'][number]) => !input.scope.startQuarter || (quarterIndex(project.releaseQuarter) >= quarterIndex(input.scope.startQuarter) && quarterIndex(project.releaseQuarter) <= quarterIndex(input.scope.endQuarter));
  const windowVertical = vertical.filter(inWindow);
  const windowHorizontal = horizontal.filter(inWindow);
  const windowLaunchVertical = nullableSum(windowVertical.map((project) => project.launchedUnits));
  const windowLaunchHorizontal = nullableSum(windowHorizontal.map((project) => project.launchedUnits));
  const window = input.granular.launchWindow;
  const uniqueProjectKeys = new Set(input.cube.projects.map((project) => project.key)).size;
  const georeferencedProjectKeys = new Set(input.cube.projects.filter((project) =>
    project.latitude !== null && project.longitude !== null
    && Number.isFinite(project.latitude) && Number.isFinite(project.longitude)
    && project.latitude >= -85.05112878 && project.latitude <= 85.05112878
    && project.longitude >= -180 && project.longitude <= 180,
  ).map((project) => project.key)).size;
  const renderedProjectKeys = new Set(input.locations.map((location) => location.projectKey).filter(Boolean)).size;
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
    countRow('launch.vertical.pattern_table', 'cubo granular / padrão', 'Soma das linhas visíveis de oferta lançada por padrão.', canonicalLaunched, visibleSum(input.granular.offerByStandard, (item) => item.launchedUnits)),
    countRow('launch.vertical.typology_table', 'cubo granular / tipologia', 'Soma das linhas visíveis de oferta lançada por tipologia, incluindo Não classificado.', canonicalLaunched, visibleSum(input.granular.offerByTypology, (item) => item.launchedUnits)),
    countRow('launch.vertical.maturity_pattern', 'cubo granular / maturidade por padrão', 'Soma das linhas visíveis de oferta lançada por estágio e padrão.', canonicalLaunched, visibleSum(input.granular.maturityByStandard, (item) => item.launched.total)),
    countRow('launch.vertical.maturity_typology', 'cubo granular / maturidade por tipologia', 'Soma das linhas visíveis de oferta lançada por estágio e tipologia, incluindo Não classificado.', canonicalLaunched, visibleSum(input.granular.maturityByTypology, (item) => item.launched.total)),
    ...(window ? [
      countRow('launch.window.vertical.pattern', 'cubo granular / janela editorial', 'Soma por padrão dos empreendimentos lançados na janela.', windowLaunchVertical, visibleSum(window.offerByStandard, (item) => item.launchedUnits)),
      countRow('launch.window.vertical.typology', 'cubo granular / janela editorial', 'Soma por tipologia dos empreendimentos lançados na janela, incluindo residual real.', windowLaunchVertical, visibleSum(window.offerByTypology, (item) => item.launchedUnits)),
      countRow('launch.window.vertical.maturity_pattern', 'cubo granular / janela editorial', 'Soma por maturidade e padrão dos lançamentos na janela.', windowLaunchVertical, visibleSum(window.maturityByStandard, (item) => item.launched.total)),
      countRow('launch.window.vertical.maturity_typology', 'cubo granular / janela editorial', 'Soma por maturidade e tipologia dos lançamentos na janela.', windowLaunchVertical, visibleSum(window.maturityByTypology, (item) => item.launched.total)),
      countRow('launch.window.horizontal.cohort', 'cubo granular / janela editorial', 'Soma dos lançamentos horizontais por coorte na janela.', windowLaunchHorizontal, totalOf(window.cohortsHorizontal)?.launchedUnits ?? null, horizontalUniverse),
      countRow('projects.window.vertical.pattern', 'cubo granular / janela editorial', 'Empreendimentos verticais lançados na janela.', windowVertical.length, totalOf(window.offerByStandard)?.projects ?? null),
      countRow('projects.window.horizontal.cohort', 'cubo granular / janela editorial', 'Empreendimentos horizontais lançados na janela.', windowHorizontal.length, totalOf(window.cohortsHorizontal)?.projects ?? null, horizontalUniverse),
    ] : []),
    countRow('stock.vertical.pattern', input.stock.units.source, 'Soma da oferta final vertical por padrão.', canonicalStock, closingVertical(input.stock.units, period)),
    countRow('stock.vertical.typology', input.stock.unitsByTypology.source, 'Soma da oferta final vertical por tipologia.', canonicalStock, closingVertical(input.stock.unitsByTypology, period)),
    countRow('stock.vertical.area', 'cubo granular / faixas de área', 'Soma da oferta final por faixa de área útil.', canonicalStock, areaTotal?.finalUnits ?? null),
    countRow('stock.vertical.pattern_table', 'cubo granular / padrão', 'Soma das linhas visíveis de oferta final da tabela granular por padrão.', canonicalStock, visibleSum(input.granular.offerByStandard, (item) => item.finalUnits)),
    countRow('stock.vertical.typology_table', 'cubo granular / tipologia', 'Soma das linhas visíveis de oferta final da tabela granular por tipologia, incluindo Não classificado.', canonicalStock, visibleSum(input.granular.offerByTypology, (item) => item.finalUnits)),
    countRow('stock.vertical.cohort', 'cubo granular / coorte vertical', 'Soma da oferta final por ano de lançamento.', canonicalStock, cohortVerticalTotal?.finalUnits ?? null),
    countRow('stock.vertical.maturity_pattern', 'cubo granular / maturidade por padrão', 'Soma das linhas visíveis de oferta final por estágio e padrão.', canonicalStock, visibleSum(input.granular.maturityByStandard, (item) => item.final.total)),
    countRow('stock.vertical.maturity_typology', 'cubo granular / maturidade por tipologia', 'Soma das linhas visíveis de oferta final por estágio e tipologia, incluindo Não classificado.', canonicalStock, visibleSum(input.granular.maturityByTypology, (item) => item.final.total)),
    countRow('sales.vertical.pattern_table', 'cubo granular / padrão', 'Soma das linhas visíveis de vendas por padrão.', canonicalSales, visibleSum(input.granular.offerByStandard, (item) => item.soldUnits)),
    countRow('sales.vertical.typology_table', 'cubo granular / tipologia', 'Soma das linhas visíveis de vendas por tipologia, incluindo Não classificado.', canonicalSales, visibleSum(input.granular.offerByTypology, (item) => item.soldUnits)),
    countRow('residual.vertical.typology.launched.negative', 'cubo granular / tipologia', 'Magnitude da sobrecobertura tipológica por empreendimento na oferta lançada; esperado zero.', 0, negativeTypologyResidual('launchedUnits')),
    countRow('residual.vertical.typology.final.negative', 'cubo granular / tipologia', 'Magnitude da sobrecobertura tipológica por empreendimento na oferta final; esperado zero.', 0, negativeTypologyResidual('finalUnits')),
    countRow('residual.vertical.typology.sold.negative', 'cubo granular / tipologia', 'Magnitude da sobrecobertura tipológica por empreendimento nas vendas; esperado zero.', 0, negativeTypologyResidual('soldUnits')),
    countRow('projects.vertical.price_pattern', 'cubo granular / preços por padrão', 'Empreendimentos usados na ponderação de preços por padrão.', vertical.length, priceStandardTotal?.projects ?? null),
    countRow('projects.vertical.price_typology', 'cubo granular / preços por tipologia', 'Empreendimentos usados na ponderação de preços por tipologia.', vertical.length, priceTypologyTotal?.projects ?? null),
    countRow('horizontal.projects.cohort', 'cubo granular / coortes horizontais', 'Empreendimentos distintos por coorte.', horizontalProjects, cohortTotal?.projects ?? null, horizontalUniverse),
    countRow('horizontal.launched.cohort', 'cubo granular / coortes horizontais', 'Soma da oferta lançada horizontal por coorte.', horizontalLaunched, cohortTotal?.launchedUnits ?? null, horizontalUniverse),
    countRow('horizontal.final.cohort', 'cubo granular / coortes horizontais', 'Soma da oferta final horizontal por coorte.', horizontalFinal, cohortTotal?.finalUnits ?? null, horizontalUniverse),
    countRow('horizontal.projects.consolidated', 'cubo granular / consolidado VGV', 'Empreendimentos distintos no subtotal horizontal consolidado.', horizontalProjects, horizontalVgvSubtotal?.projects ?? null, horizontalUniverse),
    countRow('horizontal.launched.consolidated', 'cubo granular / consolidado VGV', 'Soma da oferta lançada no subtotal horizontal consolidado.', horizontalLaunched, horizontalVgvSubtotal?.launchedUnits ?? null, horizontalUniverse),
    countRow('horizontal.final.consolidated', 'cubo granular / consolidado VGV', 'Soma da oferta final no subtotal horizontal consolidado.', horizontalFinal, horizontalVgvSubtotal?.finalUnits ?? null, horizontalUniverse),
    countRow('horizontal.chacaras.runtime', 'política de entidade fiergs-rs', 'Contagem de projetos condominio_chacaras presentes após o filtro.', 0, horizontal.filter((project) => project.horizontalSubtype === 'condominio_chacaras').length, horizontalUniverse),
    countRow('map.projects.unique', 'cubo granular / chave canônica', 'Cada linha do cubo representa uma única chave de empreendimento.', uniqueProjectKeys, input.cube.projects.length, `${horizontalUniverse} + Vertical`),
    countRow('map.projects.rendered', 'cubo granular / coordenadas válidas', 'Empreendimentos únicos com coordenada válida renderizados nos três mapas.', georeferencedProjectKeys, renderedProjectKeys, `${horizontalUniverse} + Vertical`),
  ];
  return { homologable: rows.every((item) => !item.critical || item.status === 'match'), rows };
}
