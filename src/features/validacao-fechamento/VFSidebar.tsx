import { X } from 'lucide-react';
import { MultiSelect } from '@/features/dashboard-geobrain/MultiSelect';
import type { VFFilters, VFOptions } from './aggregate';

interface Props {
  open: boolean;
  onClose: () => void;
  filters: VFFilters;
  onChange: (f: VFFilters) => void;
  options: VFOptions;
  onReset: () => void;
}

export function VFSidebar({ open, onClose, filters, onChange, options, onReset }: Props) {
  function set<K extends keyof VFFilters>(k: K, v: VFFilters[K]) { onChange({ ...filters, [k]: v }); }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[320px] bg-[var(--vf-card)] shadow-xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderRight: '1px solid var(--vf-border)' }}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-[var(--vf-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--vf-text)]">Filtros</h2>
          <div className="flex items-center gap-2">
            <button type="button" className="vf-btn" onClick={onReset}>Limpar</button>
            <button type="button" className="vf-btn" onClick={onClose} aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="space-y-3 overflow-y-auto p-4" style={{ height: 'calc(100% - 56px)' }}>
          <MultiSelect
            label="Ano"
            options={options.years.map((v) => ({ value: v, label: v }))}
            value={filters.years}
            onChange={(v) => set('years', v)}
          />
          <MultiSelect
            label="Trimestre"
            options={options.quarters.map((v) => ({ value: v, label: v }))}
            value={filters.quarters}
            onChange={(v) => set('quarters', v)}
          />
          <MultiSelect
            label="Período"
            options={options.periods}
            value={filters.periods}
            onChange={(v) => set('periods', v)}
          />
          <MultiSelect
            label="Padrão"
            options={options.standards.map((v) => ({ value: v, label: v }))}
            value={filters.standards}
            onChange={(v) => set('standards', v)}
          />
          <MultiSelect
            label="Tipo Empreendimento"
            options={options.buildingTypes.map((v) => ({ value: v, label: v }))}
            value={filters.buildingTypes}
            onChange={(v) => set('buildingTypes', v)}
          />
          <MultiSelect
            label="Empreendimentos"
            options={options.buildings.map((b) => ({ value: b.id, label: b.name }))}
            value={filters.buildings}
            onChange={(v) => set('buildings', v)}
          />
        </div>
      </aside>
    </>
  );
}
