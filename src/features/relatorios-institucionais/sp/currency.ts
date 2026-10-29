export function readSpMoney(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= Number.MAX_SAFE_INTEGER / 100 ? amount : null;
}
