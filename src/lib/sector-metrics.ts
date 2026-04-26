export interface MetricOption {
  key: string;
  label: string;
}

export const SECTOR_METRIC_OPTIONS: MetricOption[] = [
  { key: 'domicilios_26', label: 'Domicilios (proxy 2026)' },
  { key: 'rend_mensal_por_domicilio2026', label: 'Renda mensal por domicilio (2026)' },
  { key: 'rend_mensal_por_pessoa2026', label: 'Renda mensal por pessoa (2026)' },
  { key: 'total_alimentacao_dentro', label: 'Total alimentacao dentro (2026)' },
  { key: 'total_alimentacao_fora', label: 'Total alimentacao fora (2026)' },
  { key: 'total_despesas_consumo', label: 'Total despesas de consumo (2026)' },
  { key: 'nr_pessoas_v0001', label: 'Populacao total (POF)' },
  { key: 'nr_salario_minimo_mensal_por_domicilio', label: 'Salarios minimos por domicilio' },
  { key: 'nr_salario_minimo_mensal_por_pessoa', label: 'Salarios minimos por pessoa' },
  { key: 'total_habitacao', label: 'Total habitacao (2026)' },
  { key: 'total_gastos_medicamentos', label: 'Total gastos medicamentos (2026)' },
  { key: 'total_recreacao_e_cultura', label: 'Total recreacao e cultura (2026)' },
  { key: 'total_investimento_em_imovel', label: 'Total investimento em imovel (2026)' },
];

export function getAvailableSectorMetrics(
  features:
    | Array<{ properties?: Record<string, unknown> | null }>
    | undefined
): MetricOption[] {
  if (!features?.length) return [];
  return SECTOR_METRIC_OPTIONS.filter((metric) =>
    features.some((feature) => feature.properties?.[metric.key] != null)
  );
}
