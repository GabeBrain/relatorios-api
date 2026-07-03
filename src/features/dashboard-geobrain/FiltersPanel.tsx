import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { MultiSelect, type MultiSelectOption } from './MultiSelect';
import type { Filters } from './types';
import type { extractOptions } from './aggregate';

type Options = ReturnType<typeof extractOptions>;

interface Props {
  uf: string;
  onUfChange: (v: string) => void;
  ufOptions: string[];
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  options: Options;
  onReset: () => void;
  disabled?: boolean;
}

function toOpts(arr: string[]): MultiSelectOption[] {
  return arr.map((v) => ({ value: v, label: v }));
}

export function FiltersPanel({ uf, onUfChange, ufOptions, filters, onFiltersChange, options, onReset, disabled }: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onFiltersChange({ ...filters, [k]: v });

  const bedroomOpts = useMemo<MultiSelectOption[]>(
    () => options.bedrooms.map((b) => ({ value: b, label: b === '0' ? '0 (Studio)' : `${b} dorm${b === '1' ? '' : 's'}` })),
    [options.bedrooms],
  );
  const garageOpts = useMemo<MultiSelectOption[]>(
    () => options.garages.map((g) => ({ value: g, label: `${g} vaga${g === '1' ? '' : 's'}` })),
    [options.garages],
  );
  const buildingOpts = useMemo<MultiSelectOption[]>(
    () => options.buildings.map((b) => ({ value: b.id, label: b.name })),
    [options.buildings],
  );

  const fromStr = filters.from ? filters.from.toISOString().slice(0, 10) : '';
  const toStr = filters.to ? filters.to.toISOString().slice(0, 10) : '';

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">UF *</label>
          <select
            value={uf}
            onChange={(e) => onUfChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecione</option>
            {ufOptions.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Período de</label>
          <input
            type="date"
            value={fromStr}
            onChange={(e) => set('from', e.target.value ? new Date(e.target.value) : null)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">até</label>
          <input
            type="date"
            value={toStr}
            onChange={(e) => set('to', e.target.value ? new Date(e.target.value) : null)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Limpar filtros
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <MultiSelect label="Ano" options={toOpts(options.years)} value={filters.years} onChange={(v) => set('years', v)} disabled={disabled} />
        <MultiSelect label="Situação" options={toOpts(options.status)} value={filters.status} onChange={(v) => set('status', v)} disabled={disabled} />
        <MultiSelect label="Cidades" options={toOpts(options.cities)} value={filters.cities} onChange={(v) => set('cities', v)} disabled={disabled} />
        <MultiSelect label="Bairros" options={toOpts(options.neighborhoods)} value={filters.neighborhoods} onChange={(v) => set('neighborhoods', v)} disabled={disabled} />
        <MultiSelect label="Tipo" options={toOpts(options.types)} value={filters.types} onChange={(v) => set('types', v)} disabled={disabled} />
        <MultiSelect label="Tipologia" options={toOpts(options.typologies)} value={filters.typologies} onChange={(v) => set('typologies', v)} disabled={disabled} />
        <MultiSelect label="Padrão" options={toOpts(options.standards)} value={filters.standards} onChange={(v) => set('standards', v)} disabled={disabled} />
        <MultiSelect label="Dormitórios" options={bedroomOpts} value={filters.bedrooms} onChange={(v) => set('bedrooms', v)} disabled={disabled} />
        <MultiSelect label="Vagas de garagem" options={garageOpts} value={filters.garages} onChange={(v) => set('garages', v)} disabled={disabled} />
        <MultiSelect label="Empreendimentos" options={buildingOpts} value={filters.buildings} onChange={(v) => set('buildings', v)} disabled={disabled} />
      </div>
    </section>
  );
}
