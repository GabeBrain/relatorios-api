import type { LaunchSeries } from '../types';

/** Forma curta canônica para eixos: preserva trimestre e ano sem ocupar a largura de "1T 2025". */
export function compactQuarterLabel(quarter: string): string {
  return `${quarter.slice(0, 2)}/${quarter.slice(-2)}`;
}

/** O eixo compacto comporta a série completa e evita que uma lacuna visual pareça dado ausente. */
export function visibleQuarterTickIndexes(series: LaunchSeries[]): Set<number> {
  return new Set(series.map((_, index) => index));
}

/**
 * Todo ponto observado recebe valor; a camada visual destaca os trimestres equivalentes.
 */
export function visiblePointLabelIndexes(series: LaunchSeries[]): Set<number> {
  return new Set(series.map((_, index) => index));
}

/** Em séries densas, preserva extremos, fechamento e trimestres equivalentes sem sobrepor 17 rótulos. */
export function visibleBarLabelIndexes(series: LaunchSeries[], referenceQuarter: string, maxLabels = 9): Set<number> {
  if (series.length <= maxLabels) return new Set(series.map((_, index) => index));
  const indexes = new Set<number>([0, series.length - 1]);
  series.forEach((row, index) => {
    if (row.quarter[0] === referenceQuarter || index % 2 === 0) indexes.add(index);
  });
  if (indexes.size <= maxLabels) return indexes;
  const required = new Set([...indexes].filter((index) => index === 0 || index === series.length - 1 || series[index].quarter[0] === referenceQuarter));
  for (const index of indexes) {
    if (required.size >= maxLabels) break;
    required.add(index);
  }
  return required;
}
