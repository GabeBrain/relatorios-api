import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { pctRaw } from '@/lib/format';
import type { OpportunityMatrix } from './aggregate';

function heatClass(v: number): string {
  if (v <= 0) return 'dg-heat-0';
  if (v < 0.05) return 'dg-heat-1';
  if (v < 0.10) return 'dg-heat-2';
  if (v < 0.15) return 'dg-heat-3';
  if (v < 0.25) return 'dg-heat-4';
  return 'dg-heat-5';
}

export function OpportunityMap({ matrix }: { matrix: OpportunityMatrix }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matrix.bairros;
    return matrix.bairros.filter((b) => b.toLowerCase().includes(q));
  }, [matrix.bairros, query]);

  return (
    <section className="dg-card w-full">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="dg-title">Mapa de oportunidades</h2>
          <p className="dg-subtle">IVV por bairro × dormitórios — verde (baixo) → amarelo (alto)</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[hsl(var(--dg-muted))]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar bairro..."
            className="dg-select pl-6"
            style={{ height: '24px', width: '160px' }}
          />
        </div>
      </header>
      <div className="max-h-96 overflow-auto">
        <table className="dg-heatmap">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Bairro</th>
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
                  return <td key={colKey} className={heatClass(v)}>{pctRaw(v * 100, 2)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
