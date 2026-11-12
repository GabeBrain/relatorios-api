/** The preview and the analytical workbook share this exact column contract. */
export const FORECAST_COLUMNS = ['id_empreendimento', 'empreendimento', 'cidade', 'uf', 'inicio', 'mes', 'unidades', 'vendas_liquidas_estimadas', 'estoque_estimado', 'metodo', 'versao', 'estimado', 'importavel'] as const;
export type ForecastColumn = typeof FORECAST_COLUMNS[number];
export function validateForecastColumns(columns: readonly ForecastColumn[]) {
  if (!columns.length || new Set(columns).size !== columns.length || columns.some(c => !FORECAST_COLUMNS.includes(c))) throw new Error('Escolha ao menos uma coluna válida, sem repetições.');
  return [...columns];
}
export function forecastTable(rows: Record<string, unknown>[], columns: readonly ForecastColumn[] = FORECAST_COLUMNS) {
  const headers = validateForecastColumns(columns);
  return [headers, ...rows.map(row => headers.map(key => row[key] ?? null))];
}
export function moveForecastColumn(columns: readonly ForecastColumn[], source: ForecastColumn, target: ForecastColumn) {
  const next = [...columns], from = next.indexOf(source), to = next.indexOf(target);
  if (from < 0 || to < 0 || from === to) return next;
  next.splice(from, 1); next.splice(to, 0, source); return next;
}
