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
