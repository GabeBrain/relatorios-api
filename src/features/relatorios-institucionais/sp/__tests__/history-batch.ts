import type { SpHistoryBatchInput } from '../history-batch';
import type { SpTemporalInput, SpTemporalRow } from '../temporal';
import { recordedInput } from './recorded';

/** 2026 replays supplied counts. ALL 2025 values below are invented for contract/UI tests. */
export function syntheticHistoryBatch(previousSales: [number, number] = [9500, 10500], previousReleases: [number, number] = [10000, 11000]): SpHistoryBatchInput & { previous: SpTemporalInput } {
  const source = recordedInput();
  const current: SpTemporalInput = { ...source, groupBy: 'Padrão', windowEnd: '2026-08',
    releases: source.releases.filter(row => String(row.period) <= '2026-08-31'),
    sales: source.sales.filter(row => String(row.period) <= '2026-08-31'),
    stock: source.stock.filter(row => String(row.period) <= '2026-08-31'),
  };
  const groups = [...new Set(current.releases.map(row => String(row.group)))];
  const split = (period: string, field: string, total: number): SpTemporalRow[] => groups.map((group, index) => ({ period, group, building_type: 'Vertical', [field]: index === groups.length - 1 ? total - Math.floor(total / groups.length) * (groups.length - 1) : Math.floor(total / groups.length) }));
  const opening = 100000, july = opening + previousReleases[0] - previousSales[0], august = july + previousReleases[1] - previousSales[1];
  const previous: SpTemporalInput = { ...source, groupBy: 'Padrão', windowEnd: '2025-08',
    releases: ['2025-07-01', '2025-08-01'].flatMap((period, index) => split(period, 'releases_in_period', previousReleases[index])),
    sales: ['2025-07-01', '2025-08-01'].flatMap((period, index) => split(period, 'liquid_sales', previousSales[index])),
    stock: ['2025-06-01', '2025-07-01', '2025-08-01'].flatMap((period, index) => split(period, 'stock', [opening, july, august][index])),
  };
  return { current, previous };
}
