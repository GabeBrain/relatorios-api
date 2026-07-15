export interface MetricOption {
  key: string;
  label: string;
}

export const MUNICIPAL_METRIC_OPTIONS: MetricOption[] = [
  { key: 'renda_media_domic_assets', label: 'Renda media domiciliar' },
  { key: 'densidade_demo_assets', label: 'Densidade demografica' },
  { key: 'pop_total', label: 'Populacao total' },
  { key: 'dom_total', label: 'Domicilios totais' },
  { key: 'potencial_consumo_total', label: 'Potencial de consumo' },
  { key: 'sector_count', label: 'Setores agregados' },
  { key: 'tgca_renda_media_pct', label: 'TGCA renda media (%)' },
  { key: 'tgca_pop_pct', label: 'TGCA populacao (%)' },
];

export function getAvailableMunicipalMetrics(
  features:
    | Array<{ properties?: Record<string, unknown> | null }>
    | undefined
): MetricOption[] {
  if (!features?.length) return [];
  return MUNICIPAL_METRIC_OPTIONS.filter((metric) =>
    features.some((feature) => feature.properties?.[metric.key] != null)
  );
}
