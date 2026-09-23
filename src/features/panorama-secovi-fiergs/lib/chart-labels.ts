import type { LaunchSeries } from '../types';

/** Forma curta canônica para eixos: preserva trimestre e ano sem ocupar a largura de "1T 2025". */
export function compactQuarterLabel(quarter: string): string {
  return `${quarter.slice(0, 2)}/${quarter.slice(-2)}`;
}

function lastIndexByYear(series: LaunchSeries[]): Set<number> {
  const result = new Set<number>();
  series.forEach((row, index) => {
    if (row.quarter.startsWith('4T')) result.add(index);
  });
  return result;
}

/**
 * Evita colisão no eixo sem depender da janela escolhida pelo usuário.
 * Até 12 pontos, mostra tudo. Em séries maiores, preserva fechamentos anuais,
 * o trimestre final e uma amostra regular suficiente para orientar a leitura.
 */
export function visibleQuarterTickIndexes(series: LaunchSeries[]): Set<number> {
  if (series.length <= 12) return new Set(series.map((_, index) => index));
  const visible = lastIndexByYear(series);
  const step = series.length <= 20 ? 2 : Math.ceil(series.length / 10);
  series.forEach((_, index) => {
    if (index % step === 0) visible.add(index);
  });
  if (series.length) visible.add(series.length - 1);
  return visible;
}

/**
 * Rótulos de valores são mais seletivos que os ticks: fechamentos anuais e os
 * quatro trimestres mais recentes recebem prioridade. Séries curtas permanecem integrais.
 */
export function visiblePointLabelIndexes(series: LaunchSeries[]): Set<number> {
  if (series.length <= 12) return new Set(series.map((_, index) => index));
  const visible = lastIndexByYear(series);
  const recentStart = Math.max(0, series.length - 4);
  for (let index = recentStart; index < series.length; index += 1) visible.add(index);
  return visible;
}
