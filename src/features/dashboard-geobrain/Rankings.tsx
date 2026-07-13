import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowDownUp, ArrowUpAZ, Search } from 'lucide-react';
import type { RankRow } from './aggregate';

interface Props {
  title: string;
  rows: RankRow[];
  formatValue: (v: number) => string;
  searchable?: boolean;
  /** Se true, defaults to Top 10; toggle to show all. */
  topDefault?: boolean;
}

type SortBy = 'value' | 'label';
type Dir = 'asc' | 'desc';

export function RankingCard({ title, rows, formatValue, searchable = true, topDefault = true }: Props) {
  const [query, setQuery] = useState('');
  const [topOnly, setTopOnly] = useState(topDefault);
  const [sortBy, setSortBy] = useState<SortBy>('value');
  const [dir, setDir] = useState<Dir>('desc');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? rows.filter((r) => r.key.toLowerCase().includes(q)) : rows.slice();
    base.sort((a, b) => {
      if (sortBy === 'value') return dir === 'desc' ? b.value - a.value : a.value - b.value;
      return dir === 'desc' ? b.key.localeCompare(a.key, 'pt-BR') : a.key.localeCompare(b.key, 'pt-BR');
    });
    return topOnly ? base.slice(0, 10) : base;
  }, [rows, query, topOnly, sortBy, dir]);

  const max = Math.max(1, ...filtered.map((r) => Math.abs(r.value)));

  const toggle = (b: SortBy) => {
    if (sortBy === b) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortBy(b); setDir(b === 'value' ? 'desc' : 'asc'); }
  };

  return (
    <section className="dg-card w-full">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h2 className="dg-title">{title}</h2>
        <div className="flex items-center gap-1">
          {searchable && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[hsl(var(--dg-muted))]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="dg-select text-[10px]"
                style={{ height: '24px', width: '110px', paddingLeft: '22px' }}
              />
            </div>
          )}
          <button
            type="button"
            className="dg-chip"
            data-active={sortBy === 'value'}
            onClick={() => toggle('value')}
            style={{ padding: '2px 6px', fontSize: '9px' }}
            title="Ordenar por valor"
          >
            <ArrowDownUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="dg-chip"
            data-active={sortBy === 'label'}
            onClick={() => toggle('label')}
            style={{ padding: '2px 6px', fontSize: '9px' }}
            title="Ordenar por rótulo"
          >
            {dir === 'asc' ? <ArrowDownAZ className="h-3 w-3" /> : <ArrowUpAZ className="h-3 w-3" />}
          </button>
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
