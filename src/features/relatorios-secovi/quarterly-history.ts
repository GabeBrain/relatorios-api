/**
 * Agregação do histórico de uma tipologia para o Relatório Secovi.
 *
 * Vendas são fluxo e precisam ser somadas dentro do trimestre. Estoque, preço e
 * demais dados de posição usam o último fechamento daquele trimestre.
 */

export type HistoryEntry = Record<string, unknown>;

export interface QuarterlyHistory {
  /** Soma de `sold_in_period` de todos os fechamentos do trimestre. */
  sales: number;
  /** Diferencia trimestre sem dado de venda de trimestre com venda igual a zero. */
  hasSalesData: boolean;
  /** Soma de venda × preço em cada fechamento; null quando a cobertura é incompleta. */
  grossSalesVgv: number | null;
  /** Estimativa de distratos; null quando algum intervalo do trimestre não fecha. */
  estimatedCancellations: number | null;
  /** Snapshot mais recente do trimestre. */
  lastEntry: HistoryEntry;
}

interface QuarterAccumulator {
  sales: number;
  hasSalesData: boolean;
  grossSalesVgv: number;
  grossSalesVgvComplete: boolean;
  estimatedCancellations: number;
  cancellationsComplete: boolean;
  hasCancellationEstimate: boolean;
  lastEntry: HistoryEntry;
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Aceita o ISO vindo da API e formatos legíveis usados no histórico do GeoBrain. */
export function periodToQuarter(period: unknown): string | null {
  const raw = String(period ?? '').trim();
  let year: number;
  let month: number;

  let match = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?/.exec(raw);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
  } else {
    match = /^(\d{1,2})\/(\d{4})$/.exec(raw);
    if (match) {
      month = Number(match[1]);
      year = Number(match[2]);
    } else {
      match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw);
      if (!match) return null;
      month = Number(match[2]);
      year = Number(match[3]);
    }
  }

  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return `${Math.floor((month - 1) / 3) + 1}T${year}`;
}

function periodSortKey(period: unknown): number | null {
  const raw = String(period ?? '').trim();
  let match = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(raw);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3] ?? 1);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? Date.UTC(year, month - 1, day) : null;
  }

  match = /^(\d{1,2})\/(\d{4})$/.exec(raw);
  if (match) {
    const month = Number(match[1]);
    const year = Number(match[2]);
    return month >= 1 && month <= 12 ? Date.UTC(year, month - 1, 1) : null;
  }

  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? Date.UTC(year, month - 1, day) : null;
}

function quarterSortKey(quarter: string): number | null {
  const match = /^(\d)T(\d{4})$/.exec(quarter);
  if (!match) return null;
  const month = (Number(match[1]) - 1) * 3 + 1;
  return Date.UTC(Number(match[2]), month - 1, 1);
}

/** Keeps only entries through the inclusive report cutoff quarter. */
export function filterHistoryThroughQuarter(entries: HistoryEntry[], endQuarter: string): HistoryEntry[] {
  const endKey = quarterSortKey(endQuarter);
  if (endKey === null) return entries;

  return entries.filter((entry) => {
    const quarter = periodToQuarter(entry.period);
    const entryKey = quarter ? quarterSortKey(quarter) : null;
    return entryKey !== null && entryKey <= endKey;
  });
}

/**
 * Agrupa os fechamentos válidos de uma tipologia por trimestre. A estimativa de
 * distratos só é entregue quando todos os intervalos do trimestre são calculáveis,
 * evitando transformar um valor parcial em um total aparentemente confiável.
 */
export function aggregateTypologyHistoryByQuarter(entries: HistoryEntry[]): Map<string, QuarterlyHistory> {
  const dated = entries
    .map((entry) => ({ entry, sortKey: periodSortKey(entry.period), quarter: periodToQuarter(entry.period) }))
    .filter((item): item is { entry: HistoryEntry; sortKey: number; quarter: string } =>
      item.sortKey !== null && item.quarter !== null)
    .sort((a, b) => a.sortKey - b.sortKey);

  const quarters = new Map<string, QuarterAccumulator>();
  let previousStock: number | null = null;

  for (const { entry, quarter } of dated) {
    const sold = toNumber(entry.sold_in_period);
    const stock = toNumber(entry.typology_stock);
    const price = toNumber(entry.price);
    let bucket = quarters.get(quarter);
    if (!bucket) {
      bucket = {
        sales: 0,
        hasSalesData: false,
        grossSalesVgv: 0,
        grossSalesVgvComplete: true,
        estimatedCancellations: 0,
        cancellationsComplete: true,
        hasCancellationEstimate: false,
        lastEntry: entry,
      };
      quarters.set(quarter, bucket);
    }

    bucket.lastEntry = entry;
    if (sold !== null) {
      bucket.sales += sold;
      bucket.hasSalesData = true;
      if (sold !== 0) {
        if (price === null) bucket.grossSalesVgvComplete = false;
        else bucket.grossSalesVgv += sold * price;
      }
    }

    if (previousStock === null || stock === null || sold === null) {
      bucket.cancellationsComplete = false;
    } else {
      const estimate = stock - previousStock + sold;
      if (estimate < 0) bucket.cancellationsComplete = false;
      else {
        bucket.estimatedCancellations += estimate;
        bucket.hasCancellationEstimate = true;
      }
    }
    if (stock !== null) previousStock = stock;
  }

  return new Map([...quarters].map(([quarter, bucket]) => [quarter, {
    sales: bucket.sales,
    hasSalesData: bucket.hasSalesData,
    grossSalesVgv: bucket.grossSalesVgvComplete && bucket.hasSalesData ? bucket.grossSalesVgv : null,
    estimatedCancellations: bucket.cancellationsComplete && bucket.hasCancellationEstimate
      ? bucket.estimatedCancellations
      : null,
    lastEntry: bucket.lastEntry,
  }]));
}
