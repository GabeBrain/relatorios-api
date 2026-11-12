import { shiftMonth } from '../expanded/contract';
import type { StudyCase, StudyMethod, StudyResult } from './study';

/** Fixed membership. A missing component makes the portfolio total unavailable. */
export function portfolioRows(result: StudyResult, members: StudyCase[], method: StudyMethod) {
  if (!members.length) return [];
  if (new Set(members.map(c => c.id)).size !== members.length || new Set(members.map(c => c.cutoff)).size !== 1) throw new Error('Carteira exige empreendimentos únicos na mesma data.');
  const max = Math.max(...result.protocol.horizons);
  return Array.from({ length: max + 1 }, (_, offset) => {
    const month = shiftMonth(members[0].cutoff, offset);
    const values = members.map(c => c.methods[method].forecast?.points.find(p => p.offset === offset)?.stock ?? null);
    const missing = values.filter(v => v === null).length;
    const actual = offset === 0 ? members.map(c => c.inventory.stock) : members.map(c => result.trials.find(t => t.id === c.id && t.cutoff === c.cutoff && t.horizon === offset && t.method === method && t.target === 'stock')?.actual ?? null);
    return { month, members: members.length, missing, predicted: missing ? null : values.reduce<number>((s, v) => s + v!, 0), actual: actual.some(v => v === null) ? null : actual.reduce<number>((s, v) => s + v!, 0) };
  });
}
