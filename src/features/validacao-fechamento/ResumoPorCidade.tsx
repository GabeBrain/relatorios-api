import { useMemo } from 'react';
import { ResumoTable } from './ResumoTable';
import { applyVFFilters, computeResumo, type ClosureRow, type Granularity, type VFFilters } from './aggregate';

interface Props {
  rows: ClosureRow[];            // linhas já filtradas (exceto cidade)
  filters: VFFilters;
  granularity: Granularity;
  cities: string[];              // cidades carregadas
}

/** Mesma tabela do Resumo, repetida em um bloco por cidade carregada. */
export function ResumoPorCidade({ rows, filters, granularity, cities }: Props) {
  const blocks = useMemo(() => {
    return cities.map((city) => {
      const cityRows = rows.filter((r) => r.city === city);
      const dimOnly = applyVFFilters(cityRows, {
        ...filters, cities: [], years: [], quarters: [], periods: [],
      });
      const filtered = applyVFFilters(cityRows, { ...filters, cities: [] });
      return { city, resumo: computeResumo(filtered, dimOnly, granularity) };
    });
  }, [rows, filters, granularity, cities]);

  if (cities.length === 0) {
    return <div className="vf-card p-6 text-center text-sm text-[var(--vf-muted)]">Nenhuma cidade carregada.</div>;
  }

  return (
    <div>
      {blocks.map((b) => (
        <div key={b.city} className="vf-city-block">
          <div className="vf-city-title">{b.city}</div>
          <ResumoTable resumo={b.resumo} granularity={granularity} />
        </div>
      ))}
    </div>
  );
}
