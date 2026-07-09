export const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export function numCompact(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(digits).replace('.', ',')} Bi`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(digits).replace('.', ',')} Mi`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(digits).replace('.', ',')} mil`;
  return new Intl.NumberFormat('pt-BR').format(Math.round(v));
}

/** BR compact — "1,5 mil / 1,5 mi / 1,5 bi" — usado no dashboard. */
export function numCompactBR(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const fmt = (n: number, d = digits) => n.toFixed(d).replace('.', ',');
  if (abs >= 1e9) return `${fmt(v / 1e9)} bi`;
  if (abs >= 1e6) return `${fmt(v / 1e6)} mi`;
  if (abs >= 1e3) return `${fmt(v / 1e3)} mil`;
  return new Intl.NumberFormat('pt-BR').format(Math.round(v));
}

export function brlCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `R$ ${(v / 1e9).toFixed(2).replace('.', ',')} Bi`;
  if (abs >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace('.', ',')} Mi`;
  if (abs >= 1e3) return `R$ ${(v / 1e3).toFixed(1).replace('.', ',')}k`;
  return brl.format(v);
}

/** Como brlCompact mas sem o prefixo "R$" — para eixos e labels compactos. */
export function currencyCompactNoPrefix(v: number | null | undefined): string {
  const s = brlCompact(v);
  return s.replace(/^R\$\s*/, '');
}

export function intFmt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('pt-BR').format(Math.round(v));
}

export function pct(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(digits).replace('.', ',')}%`;
}

export function pctRaw(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toFixed(digits).replace('.', ',')}%`;
}

/** Percentual com 1 casa e sinal (+/-) — usado em cartões de variação. */
export function pctSigned(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const s = (v * 100).toFixed(digits).replace('.', ',');
  return v > 0 ? `+${s}%` : `${s}%`;
}

export function m2(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toFixed(digits).replace('.', ',')} m²`;
}

export function months(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toFixed(digits).replace('.', ',')} meses`;
}

/**
 * IVV color scale: green (low IVV = slow) → yellow → red (high IVV = fast sales).
 * Input v is 0..1 (fraction), scale saturates at 0.20 (20%).
 */
export function ivvColorStyle(v: number | null | undefined): { background: string; color: string } {
  if (v == null || !Number.isFinite(v)) {
    return { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
  }
  const clamped = Math.max(0, Math.min(0.2, v)) / 0.2;
  const hue = 140 - clamped * 135;
  const light = 78 - clamped * 28;
  return {
    background: `hsl(${hue.toFixed(0)} 65% ${light.toFixed(0)}%)`,
    color: clamped > 0.55 ? 'hsl(0 0% 100%)' : 'hsl(221 39% 11%)',
  };
}
