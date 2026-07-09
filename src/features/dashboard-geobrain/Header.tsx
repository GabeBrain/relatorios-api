import { useMemo, useState } from 'react';
import MUNICIPIOS_BR from '@/assets/municipios-br.json';
import type { Granularity } from './types';

const UF_LIST = Object.keys(MUNICIPIOS_BR as Record<string, string[]>).sort();
const BUILDING_TYPES = ['Comercial', 'Horizontal', 'Vertical', 'Hotel'] as const;
export type BuildingType = typeof BUILDING_TYPES[number];

const GRANS: { value: Granularity; label: string }[] = [
  { value: 'year', label: 'Ano' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'month', label: 'Mês/Ano' },
];

interface Props {
  uf: string;
  onUfChange: (v: string) => void;
  city: string;
  onCityChange: (v: string) => void;
  buildingType: BuildingType;
  onBuildingTypeChange: (v: BuildingType) => void;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  onOpenSidebar: () => void;
}

export function Header({ uf, onUfChange, city, onCityChange, buildingType, onBuildingTypeChange, granularity, onGranularityChange, onOpenSidebar }: Props) {
  const [query, setQuery] = useState('');
  const cities = useMemo(() => {
    const dict = MUNICIPIOS_BR as Record<string, string[]>;
    if (uf) return dict[uf] ?? [];
    // sem UF: lista consolidada
    return Object.values(dict).flat();
  }, [uf]);
  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities.slice(0, 200);
    return cities.filter((c) => c.toLowerCase().includes(q)).slice(0, 200);
  }, [cities, query]);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-[hsl(var(--dg-border))] bg-[hsl(var(--dg-card))] px-4 py-3">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="dg-select flex items-center gap-1 font-semibold"
        aria-label="Abrir filtros"
      >
        ☰ Filtros
      </button>

      <div className="flex items-center gap-2">
        <label className="dg-subtle font-semibold">UF</label>
        <select className="dg-select" value={uf} onChange={(e) => { onUfChange(e.target.value); onCityChange(''); }}>
          <option value="">(todas)</option>
          {UF_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="dg-subtle font-semibold">Cidade *</label>
        <div className="relative">
          <input
            className="dg-select min-w-[200px]"
            placeholder="Ex.: Joinville"
            value={query || city}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setQuery(city)}
            list="dg-city-list"
          />
          <datalist id="dg-city-list">
            {filteredCities.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <button
          type="button"
          className="dg-chip"
          data-active="true"
          onClick={() => { onCityChange(query.trim()); }}
          disabled={!query.trim()}
        >
          Carregar
        </button>
      </div>

      <div className="dg-chip-group ml-auto">
        {BUILDING_TYPES.map((bt) => (
          <button key={bt} type="button" className="dg-chip" data-active={bt === buildingType} onClick={() => onBuildingTypeChange(bt)}>
            {bt}
          </button>
        ))}
      </div>

      <div className="dg-chip-group">
        {GRANS.map((g) => (
          <button key={g.value} type="button" className="dg-chip" data-active={g.value === granularity} onClick={() => onGranularityChange(g.value)}>
            {g.label}
          </button>
        ))}
      </div>
    </header>
  );
}

export { BUILDING_TYPES };
