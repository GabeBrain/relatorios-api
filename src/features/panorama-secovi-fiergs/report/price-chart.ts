import { canonicalTypology } from '../domain/taxonomy';
import type { PanoramaReportModel } from '../types';

export type PriceChartDimension = 'pattern' | 'typology';

export function fiergsTemporalTypologyMeter(report: PanoramaReportModel, label: string): number | null {
  const block = report.prices.meterByTypology;
  if (block.dataStatus !== 'ready') return null;
  const series = block.groupSeries.find((group) => canonicalTypology(group.label) === canonicalTypology(label))?.series;
  const value = series?.find((row) => row.quarter === report.scope.endQuarter)?.vertical;
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : null;
}

export function fiergsTemporalTypologyTotal(report: PanoramaReportModel): number | null {
  const block = report.prices.meter;
  if (block.dataStatus !== 'ready') return null;
  const value = block.series.find((row) => row.quarter === report.scope.endQuarter)?.vertical;
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : null;
}

/** A mesma seleção abastece o gráfico e o aviso de categorias sem R$/m². */
export function granularPriceChartRows(report: PanoramaReportModel, dimension: PriceChartDimension) {
  const granularRows = dimension === 'pattern' ? report.granular.pricesByStandard : report.granular.pricesByTypology;
  const temporalTypology = report.scope.entity === 'fiergs-rs' && dimension === 'typology';
  const candidates = granularRows.filter((row) => row.kind !== 'total').map((row) => ({
    label: row.label,
    value: temporalTypology ? fiergsTemporalTypologyMeter(report, row.label) : row.averagePricePerMeter,
  }));
  return {
    rows: candidates.filter((row): row is { label: string; value: number } => row.value !== null && Number.isFinite(row.value)),
    omittedLabels: candidates.filter((row) => row.value === null || !Number.isFinite(row.value)).map((row) => row.label),
  };
}
