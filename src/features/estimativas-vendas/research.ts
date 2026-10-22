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
  const sales = months.map(month => { const current = rows.filter(r => monthKey(r.period) === month); return current.reduce((sum, r) => sum + (finite(r.sold_in_period) ?? 0), 0); });
  if (months.some((m, i) => m !== addMonths(first, i))) return fail(`Histórico com ${months.length} competências em ${age} meses; não há regra para preencher as lacunas.`);
  if (rows.some(r => finite(r.sold_in_period) === null)) return fail('Vendas ausentes');
  if (sales.some(n => n < 0)) return fail('Venda líquida negativa sem regra');
  const netSoldUnits = sales.reduce((a, n) => a + n, 0);
  const input = { pattern, launchedUnits, netSoldUnits, marketMonth: age };
  try {
    const shape = calculateHorizontalShape(input);
    const avg = (n: number) => sales.slice(-n).reduce((a, v) => a + v, 0) / Math.min(n, sales.length);
    const points = Array.from({ length: 37 }, (_, offset) => { const month = age + offset, period = addMonths(cutoff, offset); const omission = month >= shape.firstMonthAt95 ? 'Cauda após 95% sem regra' : null; const projected = omission ? null : evaluateHorizontalCurve(input, month).projectedNetSoldUnits; return { month, period, projected, last3: Math.min(launchedUnits, netSoldUnits + avg(3) * offset), last12: Math.min(launchedUnits, netSoldUnits + avg(12) * offset), stock: projected === null ? null : launchedUnits - projected, omission }; });
    return { id, name, reason: 'Elegível; proveniência mensal desconhecida', projection: { id, name, input, cutoff, points } };
  } catch (error) { return fail(error instanceof Error ? error.message : 'Entrada inválida'); }
}
