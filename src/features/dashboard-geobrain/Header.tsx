import { GeoApiScopeSelector } from '@/features/shared/geo-api-scope-engine';
import type { GeoScope } from '@/features/shared/geo-api-scope-engine';
import type { Granularity } from './types';

const BUILDING_TYPES = ['Vertical', 'Horizontal', 'Comercial'] as const;
export type BuildingType = typeof BUILDING_TYPES[number];

const GRANS: { value: Granularity; label: string }[] = [
  { value: 'year', label: 'Ano' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'month', label: 'Mês/Ano' },
];

interface Props {
  scope: GeoScope;
  onScopeChange: (next: GeoScope) => void;
  buildingType: BuildingType;
  onBuildingTypeChange: (v: BuildingType) => void;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  onOpenSidebar: () => void;
}

export function Header({
  scope,
  onScopeChange,
  buildingType,
  onBuildingTypeChange,
  granularity,
  onGranularityChange,
  onOpenSidebar,
}: Props) {
  return (
    <header className="dg-header flex flex-wrap items-end gap-3 border-b border-[hsl(var(--dg-border))] bg-[hsl(var(--dg-card))] px-4 py-3">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="dg-chip"
        aria-label="Abrir filtros"
        data-active="false"
        style={{ alignSelf: 'flex-end' }}
      >
        ☰ Filtros
      </button>

      <GeoApiScopeSelector
        value={scope}
        onChange={onScopeChange}
        className="flex-none"
        cityContainerClassName="w-[180px] min-w-[180px] space-y-1.5"
      />

      <div className="dg-header-group">
        <label className="dg-header-label">Tipo empreendimento</label>
        <div className="dg-chip-group">
          {BUILDING_TYPES.map((bt) => (
            <button
              key={bt}
              type="button"
              className="dg-chip"
              data-active={bt === buildingType}
              onClick={() => onBuildingTypeChange(bt)}
            >
              {bt}
            </button>
          ))}
        </div>
      </div>

      <div className="dg-header-group">
        <label className="dg-header-label">Visualização</label>
        <div className="dg-chip-group">
          {GRANS.map((g) => (
            <button
              key={g.value}
              type="button"
              className="dg-chip"
              data-active={g.value === granularity}
              onClick={() => onGranularityChange(g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export { BUILDING_TYPES };
