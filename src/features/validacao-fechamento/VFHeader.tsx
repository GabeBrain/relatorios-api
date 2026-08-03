import { GeoApiScopeSelector } from '@/features/shared/geo-api-scope-engine';
import { VFCityMultiSelect } from './VFCityMultiSelect';
import type { Granularity } from './aggregate';

const GRANS: { value: Granularity; label: string }[] = [
  { value: 'year', label: 'Ano' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'month', label: 'Mês/Ano' },
];

interface Props {
  uf: string;
  selectedCities: string[];
  onUfChange: (uf: string) => void;
  onSelectedCitiesChange: (cities: string[]) => void;
  onLoad: () => void;
  loading: boolean;
  loadedCities: string[];
  activeCity: string;            // '' = todas
  onActiveCityChange: (c: string) => void;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  onOpenSidebar: () => void;
}

export function VFHeader({
  uf, selectedCities, onUfChange, onSelectedCitiesChange, onLoad, loading,
  loadedCities, activeCity, onActiveCityChange,
  granularity, onGranularityChange, onOpenSidebar,
}: Props) {
  return (
    <header
      className="flex flex-wrap items-end gap-3 px-4 py-3"
      style={{ background: 'var(--vf-card)', borderBottom: '1px solid var(--vf-border)' }}
    >
      <button type="button" className="vf-btn" onClick={onOpenSidebar} aria-label="Abrir filtros">
        ☰ Filtros
      </button>

      <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[320px]">
        <VFCityMultiSelect
          uf={uf}
          cities={selectedCities}
          onUfChange={onUfChange}
          onCitiesChange={onSelectedCitiesChange}
          onLoad={onLoad}
          loading={loading}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Cidades carregadas
          </label>
          <select
            className="vf-select"
            style={{ height: 36, minWidth: 180 }}
            value={activeCity}
            disabled={loadedCities.length === 0}
            onChange={(e) => onActiveCityChange(e.target.value)}
          >
            <option value="">Todas ({loadedCities.length})</option>
            {loadedCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Visualização
          </label>
          <div className="vf-chip-group">
            {GRANS.map((g) => (
              <button
                key={g.value}
                type="button"
                className="vf-chip"
                data-active={g.value === granularity}
                onClick={() => onGranularityChange(g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
