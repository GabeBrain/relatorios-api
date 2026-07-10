import { X } from 'lucide-react';
import type { GeoScope } from '@/features/shared/geo-api-scope-engine';
import type { Granularity, VFFilters, VFOptions } from './aggregate';
import { EMPTY_VF_FILTERS } from './aggregate';

interface Props {
  scope: GeoScope;
  granularity: Granularity;
  filters: VFFilters;
  options: VFOptions;
  onReset: () => void;
}

const GRAN_LABEL: Record<Granularity, string> = {
  year: 'Anual',
  quarter: 'Trimestral',
  month: 'Mensal',
};

function joinOrDash(values: string[]): string {
  return values.length ? values.join(', ') : '—';
}

export function ActiveFiltersBar({ scope, granularity, filters, options, onReset }: Props) {
  const cityLabel = scope.uf && scope.city ? `${scope.city}/${scope.uf}` : '—';

  const periodLabels = filters.periods
    .map((v) => options.periods.find((p) => p.value === v)?.label ?? v);

  const buildingNames = filters.buildings.length > 3
    ? [`${filters.buildings.length} selecionados`]
    : filters.buildings.map((id) => options.buildings.find((b) => b.id === id)?.name ?? id);

  const parts: { label: string; value: string; optional?: boolean }[] = [
    { label: 'Cidade', value: cityLabel },
    { label: 'Granularidade', value: GRAN_LABEL[granularity] },
    { label: 'Ano', value: joinOrDash(filters.years), optional: true },
    { label: 'Trimestre', value: joinOrDash(filters.quarters), optional: true },
    { label: 'Período', value: joinOrDash(periodLabels), optional: true },
    { label: 'Padrão', value: joinOrDash(filters.standards), optional: true },
    { label: 'Tipo', value: joinOrDash(filters.buildingTypes), optional: true },
    { label: 'Empreendimentos', value: joinOrDash(buildingNames), optional: true },
  ];

  const visible = parts.filter((p) => !p.optional || p.value !== '—');

  const hasAny =
    filters.years.length ||
    filters.quarters.length ||
    filters.periods.length ||
    filters.standards.length ||
    filters.buildingTypes.length ||
    filters.buildings.length;

  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-1"
      style={{
        background: 'var(--vf-card)',
        borderBottom: '1px solid var(--vf-border)',
        fontSize: '10pt',
        color: 'var(--vf-muted)',
        minHeight: 28,
      }}
    >
      {visible.map((p, i) => (
        <span key={p.label} className="inline-flex items-center">
          {i > 0 && <span className="mx-2 opacity-60">·</span>}
          <span style={{ color: 'var(--vf-muted)' }}>{p.label}: </span>
          <span className="ml-1 font-semibold" style={{ color: 'var(--vf-text)' }}>{p.value}</span>
        </span>
      ))}
      {hasAny ? (
        <button
          type="button"
          onClick={onReset}
          className="ml-auto inline-flex items-center gap-1 rounded px-2 py-0.5"
          style={{
            color: 'var(--vf-primary-strong)',
            background: 'var(--vf-primary-soft)',
            border: '1px solid var(--vf-primary)',
            fontSize: '9pt',
            fontWeight: 600,
          }}
          title="Limpar filtros"
        >
          <X className="h-3 w-3" /> Limpar filtros
        </button>
      ) : (
        <span className="ml-auto" />
      )}
    </div>
  );
}

// re-export to make import ergonomic
export { EMPTY_VF_FILTERS };
