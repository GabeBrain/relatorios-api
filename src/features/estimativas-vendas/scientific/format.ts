export const methodColor = (id: string) => id === 'finotti-reference' ? 'var(--gb-verde-500)' : id === 'stock-trend' ? 'var(--ev-science-recent, var(--gb-oliva-700))' : 'hsl(var(--muted-foreground))';
export const formatNumber = (n: number | null | undefined) => n === null || n === undefined ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
