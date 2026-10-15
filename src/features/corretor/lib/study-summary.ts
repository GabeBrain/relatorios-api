import type { FindingV3 } from './v3/db';
import { confidenceOf } from './v3/confidence';
import { ERROR_CATALOG } from './error-catalog';

/** Projeção só de leitura: confiança existente não é uma classificação de gravidade. */
export function summarizeStudy(items: FindingV3[]) {
  const pending = items.filter(i => i.status === 'pendente' && !i.finding.ok);
  const levels = [1, 2, 3].map(level => pending.filter(i => confidenceOf(i.finding, i.origem) === level).length);
  const categories = new Map<string, number>();
  for (const item of pending) {
    const name = ERROR_CATALOG[item.finding.type]?.label ?? item.finding.type;
    categories.set(name, (categories.get(name) ?? 0) + 1);
  }
  return { pending: pending.length, levels, categories: [...categories].sort((a, b) => b[1] - a[1]),
    slides: [...new Set(pending.flatMap(i => [...i.finding.slideRef.matchAll(/s(\d+)/g)].map(m => Number(m[1]))))].sort((a, b) => a - b),
    historical: items.filter(i => i.status !== 'pendente').length };
}
