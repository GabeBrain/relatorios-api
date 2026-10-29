import { editorialWindow, shiftQuarter } from '@/features/panorama-secovi-fiergs/domain/quarters';
import { isSpMunicipalPreview, monthOf, type SpPreview } from './model';
import { quarterMonths, priorMonth, type SpTemporalRow } from './temporal';
import { shiftSpMonth, spTrendSegment, type SpProjectComparison } from './project-trends';
import { SP_API_PATTERNS } from './segments';
import { compareSpGroups, type SpGroupComparison } from './comparisons';

export interface SpStockSeries {
  status: 'ready' | 'blocked'; issues: string[];
  observations?: { month: string; group: string; value: number }[];
  quarterly?: { label: string; value: number; partial: boolean }[];
  comparisons?: SpProjectComparison[];
  comparison?: SpGroupComparison;
}
export const blockedSpStockSeries = (message: string): SpStockSeries => ({ status: 'blocked', issues: [message] });
export function buildSpStockSeries(rows: SpTemporalRow[], report: SpPreview): SpStockSeries {
  const block = blockedSpStockSeries;
  if (!isSpMunicipalPreview(report) || !report.throughMonth || report.patterns?.status !== 'ready') return block('Confira primeiro os totais municipais.');
  const months: string[] = [];
  for (let m = '2021-01'; m <= report.throughMonth; m = shiftSpMonth(m, 1)) months.push(m);
  const observations: NonNullable<SpStockSeries['observations']> = [], seen = new Set<string>();
  for (const row of rows) {
    const month = monthOf(row.period), group = String(row.group ?? ''), raw = row.stock;
    const value = typeof raw === 'number' || typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
    if (!month || !months.includes(month) || row.building_type !== 'Vertical' || !(SP_API_PATTERNS as readonly string[]).includes(group) || !Number.isSafeInteger(value) || value < 0 || seen.has(`${month}/${group}`)) return block('Observação de estoque inválida, duplicada ou fora do recorte.');
    seen.add(`${month}/${group}`); observations.push({ month, group, value });
  }
  if (months.some(month => SP_API_PATTERNS.some(group => !seen.has(`${month}/${group}`)))) return block('Faltam meses ou padrões na oferta histórica. Ausência não é zero.');
  const total = (month: string) => observations.filter(row => row.month === month).reduce((sum, row) => sum + row.value, 0);
  if (months.some(month => !Number.isSafeInteger(total(month)))) return block('A soma de estoque excede a precisão segura.');
  if (report.monthly!.some(row => total(row.month) !== row.closingStock || total(priorMonth(row.month)) !== row.openingStock) || report.patterns.rows.some(row => observations.find(value => value.month === report.throughMonth && value.group === row.group)?.value !== row.stock)) return block('A releitura da oferta diverge dos estoques municipais atuais.');
  const currentMonths = report.monthly!.length;
  const end = (quarter: SpPreview['quarter']) => quarterMonths(quarter)[currentMonths - 1];
  const comparisons = [2, 1, 0].map(years => {
    const now = shiftQuarter(report.quarter, -years * 4), before = shiftQuarter(now, -4), current = total(end(now)), previous = total(end(before));
    return { label: `${before} × ${now}`, current, previous, variation: previous > 0 ? (current - previous) / previous * 100 : null };
  });
  const segment = (month: string) => ['Compactos', 'MCMV', 'Médio Padrão', 'Luxo'].map(group => ({ group, value: observations.filter(row => row.month === month && spTrendSegment(row.group) === group).reduce((sum, row) => sum + row.value, 0) }));
  return { status: 'ready', issues: [], observations, comparisons,
    quarterly: editorialWindow(report.quarter).map(label => ({ label, value: total(label === report.quarter ? report.throughMonth! : quarterMonths(label)[2]), partial: label === report.quarter && currentMonths < 3 })),
    comparison: compareSpGroups(segment(report.throughMonth), segment(shiftSpMonth(report.throughMonth, -12))),
  };
}

export function spSellout(report: SpPreview) {
  return [...(report.patterns?.status === 'ready' ? [...report.patterns.rows].sort((a,b) => ['Luxo','Alto','Médio-Alto','Médio','Standard','Econômico','Compacto'].indexOf(a.group) - ['Luxo','Alto','Médio-Alto','Médio','Standard','Econômico','Compacto'].indexOf(b.group)) : []), { group: 'Média mercado', stock: report.metrics.stock, sales: report.metrics.sales }].map(row => ({ group: row.group, months: row.stock !== null && row.sales !== null && row.sales > 0 && report.monthly?.length ? row.stock / (row.sales / report.monthly.length) : null }));
}

export function spQuarterlyIvv(report: SpPreview): { status: 'ready' | 'blocked'; issues: string[]; rows: { label: string; value: number | null; partial: boolean }[] } {
  const stocks = report.stockSeries, releases = report.launchSeries, sales = report.salesSeries;
  if (stocks?.status !== 'ready' || releases?.status !== 'ready' || sales?.status !== 'ready') return { status: 'blocked', issues: ['A série de IVV aguarda oferta, lançamentos e vendas históricos conferidos.'], rows: [] };
  const rows = releases.trends!.quarterly.map(launch => {
    const sold = sales.trends!.quarterly.find(row => row.label === launch.label)!;
    const month = priorMonth(quarterMonths(launch.label as SpPreview['quarter'])[0]);
    const observations = stocks.observations!.filter(row => row.month === month);
    const available = observations.reduce((sum, row) => sum + row.value, 0) + launch.value;
    return { label: launch.label, partial: launch.partial, value: observations.length === SP_API_PATTERNS.length && available > 0 ? sold.value / available * 100 : null };
  });
  return { status: 'ready', issues: [], rows };
}
