import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { RankRow } from './aggregate';

interface Props {
  title: string;
  rows: RankRow[];
  formatValue: (v: number) => string;
  searchable?: boolean;
  /** If true, defaults to Top 10; toggle to show all. */
  topDefault?: boolean;
}

export function RankingCard({ title, rows, formatValue, searchable = true, topDefault = true }: Props) {
  const [query, setQuery] = useState('');
  const [topOnly, setTopOnly] = useState(topDefault);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? rows.filter((r) => r.key.toLowerCase().includes(q)) : rows;
    return topOnly ? base.slice(0, 10) : base;
  }, [rows, query, topOnly]);

  const max = Math.max(1, ...filtered.map((r) => Math.abs(r.value)));

  return (
    <section className="dg-card w-full">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h2 className="dg-title">{title}</h2>
        <div className="flex items-center gap-1">
          {searchable && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[hsl(var(--dg-muted))]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="dg-select pl-6 text-[10px]"
                style={{ height: '24px', width: '110px' }}
              />
            </div>
          )}
          <button
            type="button"
            className="dg-chip"
            data-active={topOnly}
            onClick={() => setTopOnly((v) => !v)}
            style={{ padding: '2px 8px', fontSize: '9px' }}
            title="Alternar Top 10 / Todos"
          >
            Top 10
          </button>
        </div>
      </header>

      <div className={`space-y-1 ${topOnly ? '' : 'max-h-72 overflow-y-auto pr-1'}`}>
        {filtered.length === 0 && <p className="dg-subtle">Sem resultados.</p>}
        {filtered.map((r) => {
          const pct = (Math.abs(r.value) / max) * 100;
          return (
            <div key={r.key} className="grid grid-cols-[110px_1fr_auto] items-center gap-2 text-[10px]">
              <span className="truncate">{r.key}</span>
              <div className="h-3.5 rounded-sm bg-[hsl(var(--dg-muted-soft))]">
                <div className="h-full rounded-sm bg-[hsl(var(--dg-primary))]" style={{ width: `${pct}%` }} />
              </div>
              <span className="tabular-nums font-semibold">{formatValue(r.value)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
