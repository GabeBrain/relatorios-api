export function readSpMoney(value: unknown, allowNegative = false): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && (allowNegative || amount >= 0) && Math.abs(amount) <= Number.MAX_SAFE_INTEGER / 100 ? amount : null;
}
