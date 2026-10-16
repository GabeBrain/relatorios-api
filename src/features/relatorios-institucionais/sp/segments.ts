import type { SpDistribution, SpHistoryMetric, SpPreview } from './model';

/** Confirmed by Lucas on 2026-10-15 for this SP institutional report only. */
export const SP_SEGMENT_RULE = {
  id: 'sp-institucional-segmentos-v1', confirmedBy: 'Lucas', confirmedOn: '2026-10-15',
  groups: {
    Compactos: ['Compacto'],
    MCMV: ['Econômico'],
    'Médio Padrão': ['Standard', 'Médio', 'Médio-Alto'],
    Luxo: ['Alto', 'Luxo'],
  },
} as const;
export const SP_DETAIL_PAGES = Object.keys(SP_SEGMENT_RULE.groups).flatMap(segment => (['launches', 'sales', 'stock'] as SpHistoryMetric[]).map(metric => ({ segment, metric, title: `${{ launches: 'Lançamentos', sales: 'Vendas', stock: 'Oferta' }[metric]} · ${segment}` })));
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function buildSpSegments(report: SpPreview): SpDistribution {
  const blocked = (message: string): SpDistribution => ({ status: 'blocked', issues: [message], rows: [], checks: [] });
  if (report.status !== 'partial' || !['api', 'recorded-api'].includes(report.source ?? '') || report.patterns?.status !== 'ready') return blocked('Confira os dados reais para obter os padrões do período selecionado.');
  const mapping = new Map(Object.entries(SP_SEGMENT_RULE.groups).flatMap(([segment, standards]) => standards.map(standard => [normalize(standard), segment] as const)));
  const seen = new Set<string>();
  const rows = Object.keys(SP_SEGMENT_RULE.groups).map(group => ({ group, launches: 0, sales: 0, stock: 0 }));
  for (const item of report.patterns.rows) {
    const standard = normalize(item.group), segment = mapping.get(standard);
    if (!segment || seen.has(standard)) return blocked('Há padrão desconhecido ou repetido. Confirme a classificação antes de preencher os segmentos.');
    seen.add(standard);
    const row = rows.find(value => value.group === segment)!;
    for (const field of ['launches', 'sales', 'stock'] as const) {
      if (!Number.isSafeInteger(item[field]) || field !== 'sales' && item[field] < 0) return blocked('Os padrões contêm valores inválidos. Confira os dados reais novamente.');
      row[field] += item[field];
    }
  }
  if (seen.size !== mapping.size) return blocked('Falta um padrão da classificação confirmada. Ausência não representa zero.');
  if (['launches', 'sales', 'stock'].some(field => !Number.isSafeInteger(report.metrics[field as 'launches' | 'sales' | 'stock']))) return blocked('Os totais municipais ainda não foram comprovados.');
  const labels = { launches: 'Lançamentos', sales: 'Vendas líquidas', stock: 'Oferta final' };
  const checks = (['launches', 'sales', 'stock'] as const).map(field => {
    const actual = rows.reduce((sum, row) => sum + row[field], 0);
    return { label: labels[field], actual, expected: report.metrics[field]!, delta: actual - report.metrics[field]! };
  });
  if (checks.some(check => !Number.isSafeInteger(check.actual) || check.delta !== 0)) return { status: 'blocked', issues: ['Os segmentos não somam os totais municipais. Reconfira os dados antes de preencher os slides.'], rows: [], checks };
  return { status: 'ready', issues: [], rows, checks };
}
