import { calculateHorizontalShape, evaluateHorizontalCurve, type HorizontalInput } from './horizontal';
import type { HorizontalPattern } from './parameters';
import { buildingId, buildingName, finite, monthKey, type Building } from './source';

export type Projection = { id: string; name: string; input: HorizontalInput; cutoff: string; points: { month: number; period: string; projected: number | null; last3: number | null; last12: number | null; stock: number | null; omission: string | null }[] };
export type Decision = { id: string; name: string; reason: string; projection: Projection | null };
const addMonths = (period: string, months: number) => { const [y, m] = period.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + months, 1)); return d.toISOString().slice(0, 7); };

export function projectBuilding(b: Building, cutoff: string): Decision {
  const id = buildingId(b), name = buildingName(b);
  const fail = (reason: string): Decision => ({ id, name, reason, projection: null });
  if (!id) return fail('ID ausente');
  const history = (b.typologies_history ?? []).filter(r => monthKey(r.period) <= cutoff);
  // A API inclui fases "Futuro" e rótulos de faixa de preço na mesma série.
  // Só competências explicitamente marcadas como loteamento pertencem ao domínio da equação.
  const rows = history.filter(r => ['Loteamento Aberto', 'Loteamento Fechado'].includes(r.pattern));
  const labels = [...new Set(rows.map(r => r.pattern))];
  if (labels.length !== 1 || !['Loteamento Aberto', 'Loteamento Fechado'].includes(labels[0])) return fail('Padrão aberto/fechado não identificado de forma única');
  const pattern: HorizontalPattern = labels[0] === 'Loteamento Aberto' ? 'aberto' : 'fechado';
  const seen = new Set<string>();
  for (const row of rows) { const key = `${row.typology_id}|${monthKey(row.period)}`; if (seen.has(key)) return fail('Tipologia/competência duplicada'); seen.add(key); }
  const months = [...new Set(rows.map(r => monthKey(r.period)))].sort();
  if (!months.length) return fail('Sem histórico de loteamento até o corte');
  if (months.at(-1) !== cutoff) return fail('Sem competência no corte');
  const first = months[0];
  const [fy, fm] = first.split('-').map(Number), [cy, cm] = cutoff.split('-').map(Number);
  const age = (cy - fy) * 12 + cm - fm + 1;
  if (age < 1 || age > 48) return fail(`Mês ${age} fora do ajuste (1–48). Último corte dentro do domínio: ${addMonths(first, 47)}; confirme também a cadência e as vendas nesse corte.`);
  const qty = new Map<string, number>();
  for (const row of rows) { const n = finite(row.qty); if (n === null || n <= 0 || !Number.isInteger(n)) return fail('Unidades por tipologia ausentes/inválidas'); const key = String(row.typology_id); if (qty.has(key) && qty.get(key) !== n) return fail('Revisão de unidades sem regra'); qty.set(key, n); }
  const launchedUnits = [...qty.values()].reduce((a, n) => a + n, 0);
  const atCutoff = rows.filter(r => monthKey(r.period) === cutoff);
  if (atCutoff.length !== qty.size) return fail('Estoque incompleto por tipologia no corte');
  const stock = atCutoff.reduce((sum, row) => sum + (finite(row.typology_stock) ?? 0), 0);
  if (atCutoff.some(row => { const n = finite(row.typology_stock); return n === null || !Number.isInteger(n) || n < 0 || n > (qty.get(String(row.typology_id)) ?? -1); })) return fail('Estoque inválido ou ausente no corte');
  const netSoldUnits = launchedUnits - stock;
  if (rows.some(r => finite(r.sold_in_period) === null)) return fail('Vendas ausentes impedem conciliar o estoque no corte');
  const reportedSold = rows.reduce((sum, row) => sum + Number(row.sold_in_period), 0);
  if (reportedSold !== netSoldUnits) return fail(`Estoque e vendas acumuladas divergem no corte (${netSoldUnits} versus ${reportedSold})`);
  const cadenceComplete = months.every((m, i) => m === addMonths(first, i));
  const sales = months.map(month => rows.filter(r => monthKey(r.period) === month).reduce((sum, r) => sum + Number(r.sold_in_period), 0));
  const hasNegative = sales.some(n => n < 0);
  const input = { pattern, launchedUnits, netSoldUnits, marketMonth: age };
  try {
    const shape = calculateHorizontalShape(input);
    const avg = (n: number) => sales.slice(-n).reduce((a, v) => a + v, 0) / Math.min(n, sales.length);
    const points = Array.from({ length: 37 }, (_, offset) => { const month = age + offset, period = addMonths(cutoff, offset); const omission = month >= shape.firstMonthAt95 ? 'Cauda após 95% sem regra' : null; const projected = omission ? null : evaluateHorizontalCurve(input, month).projectedNetSoldUnits; return { month, period, projected, last3: cadenceComplete && !hasNegative ? Math.min(launchedUnits, netSoldUnits + avg(3) * offset) : null, last12: cadenceComplete && !hasNegative ? Math.min(launchedUnits, netSoldUnits + avg(12) * offset) : null, stock: projected === null ? null : launchedUnits - projected, omission }; });
    const reason = cadenceComplete && !hasNegative ? 'Curva exploratória; proveniência mensal desconhecida' : `Curva exploratória pelo estoque conciliado; médias omitidas (${months.length} competências em ${age} meses${hasNegative ? ', com vendas líquidas negativas' : ''})`;
    return { id, name, reason, projection: { id, name, input, cutoff, points } };
  } catch (error) { return fail(error instanceof Error ? error.message : 'Entrada inválida'); }
}
