import { monthOf, type SpPreview, type SpTypologies } from './model';
import { buildSpTemporalPreview, type SpTemporalInput } from './temporal';
import { safeNumber } from '@/features/panorama-secovi-fiergs/lib/launches';

/** Compare independent dimensions before allowing the three new pages to show values. */
export function buildSpTypologies(input: SpTemporalInput, municipal: SpPreview): SpTypologies {
  const blocked = (message: string): SpTypologies => ({ status: 'blocked', issues: [message], rows: [], checks: [] });
  if (input.groupBy !== 'Tipologia' || municipal.status !== 'partial' || !['api', 'recorded-api'].includes(municipal.source ?? '') || !municipal.monthly?.length) return blocked('Confira primeiro os totais municipais com dados da API.');
  const preview = buildSpTemporalPreview(input, municipal.quarter);
  if (preview.status !== 'partial') return blocked('A fonte por tipologia não comprovou meses, grupos, valores e balanços completos. Os gráficos permanecem indisponíveis.');
  if (preview.closingMonth !== municipal.closingMonth || preview.throughMonth !== municipal.throughMonth) return blocked('O fechamento mudou entre as consultas. Confira os totais municipais novamente antes das tipologias.');
  const checks: SpTypologies['checks'] = [];
  const labels = { openingStock: 'Oferta inicial', launches: 'Lançamentos', sales: 'Vendas líquidas', closingStock: 'Oferta final', stock: 'Oferta final' };
  for (const expected of municipal.monthly) {
    const actual = preview.monthly!.find(row => row.month === expected.month);
    if (!actual) return blocked('Os meses das duas consultas não coincidem.');
    for (const field of ['openingStock', 'launches', 'sales', 'closingStock'] as const) checks.push({ label: `${expected.month} · ${labels[field]}`, expected: expected[field], actual: actual[field], delta: actual[field] - expected[field] });
  }
  for (const field of ['launches', 'sales', 'stock'] as const) {
    if (municipal.metrics[field] === null || preview.metrics[field] === null) return blocked('Os totais consolidados não foram comprovados.');
    checks.push({ label: `Total · ${labels[field]}`, expected: municipal.metrics[field]!, actual: preview.metrics[field]!, delta: preview.metrics[field]! - municipal.metrics[field]! });
  }
  if (checks.some(check => check.delta !== 0)) return { status: 'blocked', issues: ['As tipologias não somam os mesmos totais municipais. Reconfira as fontes; os gráficos permanecem indisponíveis.'], rows: [], checks };
  const months = new Set(municipal.monthly.map(row => row.month));
  const rows = new Map<string, SpTypologies['rows'][number]>();
  for (const [source, field, target] of [['releases', 'releases_in_period', 'launches'], ['sales', 'liquid_sales', 'sales'], ['stock', 'stock', 'stock']] as const) {
    for (const item of input[source]) {
      const period = monthOf(item.period);
      if (!period || !months.has(period) || target === 'stock' && period !== municipal.throughMonth) continue;
      // Keep provider labels and groups. Do not collapse studios/4+ or map MCMV here.
      const label = String(item.group).trim();
      const key = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const row = rows.get(key) ?? { group: label, launches: 0, sales: 0, stock: 0 };
      row[target] += safeNumber(item[field])!; rows.set(key, row);
    }
  }
  if (!rows.size || rows.size > 12 || [...rows.values()].some(row => row.group.length > 40)) return blocked('As tipologias retornadas excedem o layout disponível. Confirme os grupos antes de montar os slides.');
  return { status: 'ready', issues: [], rows: [...rows.values()].sort((a, b) => a.group.localeCompare(b.group, 'pt-BR', { numeric: true })), checks };
}
