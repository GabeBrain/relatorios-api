import { contractById } from '../contracts/launches';
import type { ComparisonCell, LaunchModel, PanoramaReference } from '../types';

function compare(metricId: string, label: string, expected: number | null, actual: number | null, coordinates: Record<string, string>): ComparisonCell {
  const contract = contractById(metricId)!;
  const absoluteDifference = expected === null || actual === null ? null : actual - expected;
  const relativeDifference = absoluteDifference === null || expected === 0 ? null : absoluteDifference / Math.abs(expected);
  const tolerance = contract.tolerance.absolute ?? 0;
  const result = contract.status === 'open_method' ? 'not_comparable' : expected === null ? 'missing_reference' : actual === null ? 'missing_api' : Math.abs(absoluteDifference) <= tolerance ? 'match' : 'different';
  return { metricId, label, coordinates, expected, actual, absoluteDifference, relativeDifference, result, status: contract.status, formula: contract.formula, source: contract.source };
}
export function compareLaunchModel(reference: PanoramaReference, actual: LaunchModel): ComparisonCell[] {
  const cells: ComparisonCell[] = [];
  for (const metric of [{ id: 'launch.projects.quarter.type', label: 'Empreendimentos', key: 'projects' as const }, { id: 'launch.units.quarter.type', label: 'Unidades lançadas', key: 'units' as const }, { id: 'launch.vgv.quarter.type', label: 'VGV lançado (R$ mi)', key: 'vgv' as const }]) {
    for (const expected of reference.model[metric.key]) {
      const current = actual[metric.key].find((item) => item.quarter === expected.quarter);
      for (const segment of ['vertical', 'horizontal', 'total'] as const) cells.push(compare(metric.id, metric.label, expected[segment], current?.[segment] ?? null, { quarter: expected.quarter, segment }));
    }
  }
  return cells;
}
