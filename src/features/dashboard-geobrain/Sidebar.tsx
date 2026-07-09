import { useMemo } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { MultiSelect, type MultiSelectOption } from './MultiSelect';
import type { Filters } from './types';
import type { extractOptions } from './aggregate';

type Options = ReturnType<typeof extractOptions>;

interface Props {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  options: Options;
  onReset: () => void;
}

function toOpts(arr: string[]): MultiSelectOption[] {
  return arr.map((v) => ({ value: v, label: v }));
}

const STATUS_LABEL: Record<string, string> = { Ativo: 'Comercialização', Esgotado: 'Esgotado' };

export function Sidebar({ open, onClose, filters, onFiltersChange, options, onReset }: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onFiltersChange({ ...filters, [k]: v });

  const bedroomOpts = useMemo<MultiSelectOption[]>(
    () => options.bedrooms.map((b) => ({ value: b, label: b === '0' ? '0 (Studio)' : `${b} dorm${b === '1' ? '' : 's'}` })),
    [options.bedrooms],
  );
  const garageOpts = useMemo<MultiSelectOption[]>(
    () => options.garages.map((g) => ({ value: g, label: `${g} vaga${g === '1' ? '' : 's'}` })),
    [options.garages],
  );
  const statusOpts = useMemo<MultiSelectOption[]>(
    () => options.status.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s })),
    [options.status],
  );
  const buildingOpts = useMemo<MultiSelectOption[]>(
    () => options.buildings.map((b) => ({ value: b.id, label: b.name })),
    [options.buildings],
  );

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden />}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[300px] flex-col border-r border-[hsl(var(--dg-border))] bg-[hsl(var(--dg-card))] shadow-lg transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-[hsl(var(--dg-border))] px-3 py-2">
          <span className="dg-title">Filtros</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onReset} className="dg-chip" title="Limpar filtros">
              <RotateCcw className="h-3 w-3" />
            </button>
            <button type="button" onClick={onClose} className="dg-chip" aria-label="Fechar">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          <MultiSelect label="Ano" options={toOpts(options.years)} value={filters.years} onChange={(v) => set('years', v)} />
          <MultiSelect label="Períodos (mês)" options={options.months} value={filters.periods} onChange={(v) => set('periods', v)} />
          <MultiSelect label="Situação" options={statusOpts} value={filters.status} onChange={(v) => set('status', v)} />
          <MultiSelect label="Tipologia" options={toOpts(options.typologies)} value={filters.typologies} onChange={(v) => set('typologies', v)} />
          <MultiSelect label="Padrão" options={toOpts(options.standards)} value={filters.standards} onChange={(v) => set('standards', v)} />
          <MultiSelect label="Dormitórios" options={bedroomOpts} value={filters.bedrooms} onChange={(v) => set('bedrooms', v)} />
          <MultiSelect label="Vagas de garagem" options={garageOpts} value={filters.garages} onChange={(v) => set('garages', v)} />
          <MultiSelect label="Bairros" options={toOpts(options.neighborhoods)} value={filters.neighborhoods} onChange={(v) => set('neighborhoods', v)} />
          <MultiSelect label="Empreendimentos" options={buildingOpts} value={filters.buildings} onChange={(v) => set('buildings', v)} />
        </div>
      </aside>
    </>
  );
}
