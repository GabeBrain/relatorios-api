/**
 * Arredonda participações a uma casa e distribui o resíduo de décimos pelas maiores diferenças
 * de arredondamento. Inclusive valores negativos (distratos) permanecem na identidade de 100%.
 */
export function roundedPercentages(values: number[], digits = 1): (number | null)[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total === 0) return values.map(() => null);
  const scale = 10 ** digits;
  const exact = values.map((value) => value / total * 100 * scale);
  const units = exact.map((value) => Math.round(value));
  let residual = 100 * scale - units.reduce((sum, value) => sum + value, 0);
  while (residual !== 0) {
    const direction = Math.sign(residual);
    const index = exact.map((value, item) => ({ item, gain: direction * (value - units[item]) }))
      .sort((a, b) => b.gain - a.gain || a.item - b.item)[0].item;
    units[index] += direction;
    residual -= direction;
  }
  return units.map((value) => value / scale);
}
