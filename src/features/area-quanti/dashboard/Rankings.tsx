import { useMemo } from 'react';
import type { QuantiRecord } from './types';
import { countBy } from './aggregate';
import { useQuantiStore } from './store';
import { ChartCard } from './Charts';

function List({ title, data, field, total }: { title: string; data: { key: string; count: number }[]; field: 'cidade' | 'estado' | 'regiao'; total: number }) {
  return (
    <ChartCard title={title}>
      <RankList data={data} field={field} total={total} />
    </ChartCard>
  );
}

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
  const regioes = useMemo(() => countBy(rows, 'regiao'), [rows]);

  return (
    <div className="mt-4 border-t border-[var(--qd-border)] pt-3">
      <div className="mb-2 text-xs font-semibold text-[var(--qd-text)]">Distribuição por região</div>
      <RankList data={regioes} field="regiao" total={rows.length} />
    </div>
  );
}

export function Rankings({ rows }: { rows: QuantiRecord[] }) {
  const topCidades = useMemo(() => countBy(rows, 'cidade').slice(0, 10), [rows]);
  const topEstados = useMemo(() => countBy(rows, 'estado').slice(0, 10), [rows]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <List title="Top 10 cidades" data={topCidades} field="cidade" total={rows.length} />
      <List title="Top 10 estados" data={topEstados} field="estado" total={rows.length} />
    </div>
  );
}
