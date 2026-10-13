export interface DormitoryPriceGroup { label: string; series: { vertical: number | null }[]; }

/** Uma página exige observação da própria tipologia; zero finito continua publicável. */
export function observedDormitoryPriceGroup<T extends DormitoryPriceGroup>(block: { groupSeries?: T[] }, bedroom: number): T | undefined {
  const matcher = bedroom === 4 ? /(^|\D)4(\D|$)|mais/i : new RegExp(`(^|\\D)${bedroom}(\\D|$)`);
  return block.groupSeries?.find((group) => matcher.test(group.label) && group.series.some((row) => row.vertical !== null && Number.isFinite(row.vertical)));
}
