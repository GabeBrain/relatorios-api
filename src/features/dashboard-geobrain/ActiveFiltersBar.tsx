import { X } from 'lucide-react';
import type { GeoScope } from '@/features/shared/geo-api-scope-engine';
import type { Filters } from './types';
import type { extractOptions } from './aggregate';
import type { BuildingType } from './Header';

type Options = ReturnType<typeof extractOptions>;

interface Props {
  scope: GeoScope;
  buildingType: BuildingType;
  filters: Filters;
  options: Options;
  onReset: () => void;
}

function joinOrDash(values: string[]): string {
  return values.length ? values.join(', ') : '—';
}

const STATUS_LABEL: Record<string, string> = { Ativo: 'Comercialização', Esgotado: 'Esgotado' };

export function ActiveFiltersBar({ scope, buildingType, filters, options, onReset }: Props) {
  const cityLabel = scope.uf && scope.city ? `${scope.city}/${scope.uf}` : '—';

  const periodLabels = filters.periods.map((v) => options.months.find((p) => p.value === v)?.label ?? v);
  const statusLabels = filters.status.map((s) => STATUS_LABEL[s] ?? s);
  const buildingNames = filters.buildings.length > 3
    ? [`${filters.buildings.length} selecionados`]
    : filters.buildings.map((id) => options.buildings.find((b) => b.id === id)?.name ?? id);

  const parts: { label: string; value: string; optional?: boolean }[] = [
    { label: 'Cidade', value: cityLabel },
    { label: 'Tipo', value: buildingType },
    { label: 'Situação', value: joinOrDash(statusLabels), optional: true },
    { label: 'Bairros', value: joinOrDash(filters.neighborhoods), optional: true },
    { label: 'Padrão', value: joinOrDash(filters.standards), optional: true },
    { label: 'Tipologia', value: joinOrDash(filters.typologies), optional: true },
    { label: 'Dormitórios', value: joinOrDash(filters.bedrooms), optional: true },
    { label: 'Garagens', value: joinOrDash(filters.garages), optional: true },
    { label: 'Anos', value: joinOrDash(filters.years), optional: true },
    { label: 'Períodos', value: joinOrDash(periodLabels), optional: true },
    { label: 'Empreendimentos', value: joinOrDash(buildingNames), optional: true },
  ];
  const visible = parts.filter((p) => !p.optional || p.value !== '—');

  const hasAny =
    filters.status.length || filters.neighborhoods.length || filters.standards.length ||
    filters.typologies.length || filters.bedrooms.length || filters.garages.length ||
    filters.years.length || filters.periods.length || filters.buildings.length;

  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-1"
      style={{
        background: 'hsl(var(--dg-card))',
        borderBottom: '1px solid hsl(var(--dg-border))',
        fontSize: '10px',
        color: 'hsl(var(--dg-muted))',
        minHeight: 28,
      }}
    >
      {visible.map((p, i) => (
        <span key={p.label} className="inline-flex items-center">
          {i > 0 && <span className="mx-2 opacity-60">·</span>}
          <span>{p.label}: </span>
          <span className="ml-1 font-semibold" style={{ color: 'hsl(var(--dg-text))' }}>{p.value}</span>
        </span>
      ))}
      {hasAny ? (
        <button
          type="button"
          onClick={onReset}
          className="ml-auto inline-flex items-center gap-1 rounded px-2 py-0.5"
          style={{
            color: 'hsl(var(--dg-primary-strong))',
            background: 'hsl(var(--dg-primary-soft))',
            border: '1px solid hsl(var(--dg-primary))',
            fontSize: '9px',
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
