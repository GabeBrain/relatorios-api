import incc from './incc-di.json';
import { isSpMunicipalPreview, monthOf, type SpPreview } from './model';
import { buildSpLaunchSeries, buildSpSalesSeries, type SpLaunchSeries } from './launch-series';
import { buildSpProjectTrends, buildSpTrendBreakdown } from './project-trends';
import type { SpTemporalRow } from './temporal';
import { readSpMoney } from './currency';

export interface SpVglSeries extends SpLaunchSeries { baseMonth?: string; indexSource?: string }
/** One common price base; correct each monthly flow before quarter/rolling/year aggregation. */
export function buildSpVglSeries(rows: SpTemporalRow[], report: SpPreview, indices: Readonly<Record<string, number>> = incc.indices): SpVglSeries {
  return buildSpMonetarySeries(rows, report, 'launches', indices);
}
export function buildSpVgvSeries(rows: SpTemporalRow[], report: SpPreview, indices: Readonly<Record<string, number>> = incc.indices): SpVglSeries {
  return buildSpMonetarySeries(rows, report, 'sales', indices);
}
function buildSpMonetarySeries(rows: SpTemporalRow[], report: SpPreview, metric: 'launches' | 'sales', indices: Readonly<Record<string, number>>): SpVglSeries {
  const sales = metric === 'sales', label = sales ? 'VGV vendido' : 'VGL';
  const blocked = (message: string): SpVglSeries => ({ status: 'blocked', issues: [message], baseMonth: report.throughMonth, indexSource: incc.source });
  if (!isSpMunicipalPreview(report) || !report.throughMonth || (sales ? buildSpSalesSeries(rows, report) : buildSpLaunchSeries(rows, report)).status !== 'ready') return blocked(`A série de ${sales ? 'vendas' : 'lançamentos'} precisa comprovar cobertura e os totais municipais antes do ${label}.`);
  const base = indices[report.throughMonth];
  if (!Number.isFinite(base) || base <= 0) return blocked(`Falta INCC-DI para a base ${report.throughMonth}. Atualize a série de índices; não usamos uma base anterior silenciosamente.`);
  const nominal = sales ? report.nominalSalesVgv : report.nominalLaunchVgv;
  if (!nominal?.length) return blocked(`O ${label} nominal da consulta municipal não foi informado; unidades permanecem disponíveis.`);
  const parsed = rows.map(row => ({ month: monthOf(row.period)!, group: String(row.group), nominal: readSpMoney(row[sales ? 'vgv_liquid_sales' : 'vgv_release'], sales) }));
  if (parsed.some(row => row.nominal === null || !Number.isFinite(indices[row.month]) || indices[row.month] <= 0)) return blocked('Faltam valores nominais de VGL ou índices INCC-DI mensais válidos na série. Ausência não representa zero.');
  const current = parsed.filter(row => report.monthly!.some(month => month.month === row.month));
  if (current.length !== nominal.length || current.some(row => {
    const expected = nominal.find(value => value.month === row.month && value.group === row.group);
    return !expected || Math.abs(expected.value - row.nominal!) > .01;
  })) return blocked(`A releitura do ${label} nominal diverge da consulta municipal. Confira os dados novamente.`);
  const corrected = parsed.map(row => ({ month: row.month, group: row.group, value: row.nominal! * base / indices[row.month] }));
  const monthly = new Map<string, number>();
  for (const row of corrected) monthly.set(row.month, (monthly.get(row.month) ?? 0) + row.value);
  if ([...monthly.values()].some(value => !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER / 100)) return blocked('Os valores corrigidos excedem a precisão monetária segura.');
  return { status: 'ready', issues: [], baseMonth: report.throughMonth, indexSource: incc.source, trends: buildSpProjectTrends(monthly, report.quarter, report.throughMonth), breakdown: buildSpTrendBreakdown(corrected, report.quarter, report.throughMonth) };
}
