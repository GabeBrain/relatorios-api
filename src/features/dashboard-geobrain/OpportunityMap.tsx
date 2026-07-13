import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { pctRaw } from '@/lib/format';
import type { OpportunityMatrix } from './aggregate';

function heatClass(v: number): string {
  // Verde = IVV alto (bom), amarelo = IVV baixo (fraco).
  if (v <= 0) return 'dg-heat-0';
  if (v < 0.05) return 'dg-heat-5';
  if (v < 0.10) return 'dg-heat-4';
  if (v < 0.15) return 'dg-heat-3';
  if (v < 0.25) return 'dg-heat-2';
  return 'dg-heat-1';
}

interface Props {
  matrix: OpportunityMatrix;
  title?: string;
  subtitle?: string;
}

export function OpportunityMap({ matrix, title = 'Mapa de oportunidades', subtitle }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matrix.rows;
    return matrix.rows.filter((b) => b.toLowerCase().includes(q));
  }, [matrix.rows, query]);

  const sub = subtitle ?? `IVV por ${matrix.rowLabel.toLowerCase()} × dormitórios — amarelo (baixo) → verde (alto)`;

  return (
    <section className="dg-card w-full">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="dg-title">{title}</h2>
          <p className="dg-subtle">{sub}</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[hsl(var(--dg-muted))]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar ${matrix.rowLabel.toLowerCase()}...`}
            className="dg-select"
            style={{ height: '24px', width: '180px', paddingLeft: '22px' }}
          />
        </div>
      </header>
      <div className="max-h-96 overflow-auto">
        <table className="dg-heatmap">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{matrix.rowLabel}</th>
              {matrix.cols.map((c) => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((nb) => (
              <tr key={nb}>
                <td>{nb}</td>
                {matrix.cols.map((_, i) => {
                  const colKey = ['1', '2', '3', '4+'][i];
                  const v = matrix.data[nb]?.[colKey] ?? 0;
                  return <td key={colKey} className={heatClass(v)}>{pctRaw(v * 100, 1)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
