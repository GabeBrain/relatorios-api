import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import type { QuantiRecord } from './types';
import { countBy } from './aggregate';
import { useQuantiStore } from './store';

type SortOrder = 'desc' | 'asc';

function RankList({ data, field, total }: { data: { key: string; count: number }[]; field: 'cidade' | 'estado' | 'regiao'; total: number }) {
  const toggle = useQuantiStore((s) => s.toggleValue);
  const filters = useQuantiStore((s) => s.filters);
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-1.5">
      {data.map((d) => {
        const active = filters[field]?.includes(d.key);
        const pct = total ? (d.count / total) * 100 : 0;
        return (
          <button
            key={d.key}
            onClick={() => toggle(field, d.key)}
            className={`group flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-slate-50 ${active ? 'bg-slate-100' : ''}`}
          >
            <span className="w-32 truncate text-xs font-medium" title={d.key}>{d.key}</span>
            <div className="relative h-4 flex-1 overflow-hidden rounded bg-slate-100">
              <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${(d.count / max) * 100}%`, background: '#5B7537' }} />
            </div>
            <span className="w-24 text-right text-[11px] tabular-nums text-[var(--qd-text-muted)]">
              {d.count.toLocaleString('pt-BR')} · {pct.toFixed(1)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function RegionDistribution({ rows }: { rows: QuantiRecord[] }) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const regioes = useMemo(() => countBy(rows, 'regiao'), [rows]);
  const total = useMemo(() => regioes.reduce((sum, item) => sum + item.count, 0), [regioes]);
  const sortedRegioes = useMemo(
    () => [...regioes].sort((a, b) => (sortOrder === 'desc' ? b.count - a.count : a.count - b.count)),
    [regioes, sortOrder],
  );

  return (
    <div className="mt-4 border-t border-[var(--qd-border)] pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-[var(--qd-text)]">Distribuição por região</div>
        <button
          type="button"
          onClick={() => setSortOrder((order) => (order === 'desc' ? 'asc' : 'desc'))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--qd-border)] text-[var(--qd-text-muted)] transition hover:bg-[var(--qd-light)] hover:text-[var(--qd-text)] focus:outline-none focus:ring-2 focus:ring-[var(--qd-primary)]"
          title={sortOrder === 'desc' ? 'Maior para menor' : 'Menor para maior'}
          aria-label={sortOrder === 'desc' ? 'Ordenar do menor para o maior' : 'Ordenar do maior para o menor'}
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
        </button>
      </div>
      <RankList data={sortedRegioes} field="regiao" total={total} />
    </div>
  );
}
