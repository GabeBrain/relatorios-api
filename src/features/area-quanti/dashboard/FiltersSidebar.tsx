import { useMemo } from 'react';
import { RotateCcw, X, Filter } from 'lucide-react';
import { MultiSelect, type MultiSelectOption } from '@/features/dashboard-geobrain/MultiSelect';
import { FIELD_LABELS, type CategoricalField, type QuantiRecord } from './types';
import { distinctValues, orderedValues } from './aggregate';
import { useQuantiStore } from './store';

const FILTER_FIELDS: CategoricalField[] = [
  'research_name',
  'ano_pesquisa',
  'estado',
  'cidade',
  'cidade_original',
  'regiao',
  'genero',
  'faixa_etaria',
  'geracao',
  'renda_faixa_padronizada',
  'renda_classe_agregada',
  'renda_classe_detalhada',
  'intencao_compra_padronizada',
  'tempo_intencao_padronizado',
];

interface Props {
  open: boolean;
  onClose: () => void;
  rows: QuantiRecord[];
}

export function FiltersSidebar({ open, onClose, rows }: Props) {
  const filters = useQuantiStore((s) => s.filters);
  const setFilter = useQuantiStore((s) => s.setFilter);
  const clearAll = useQuantiStore((s) => s.clearAll);

  const optionsMap = useMemo(() => {
    const map: Partial<Record<CategoricalField, MultiSelectOption[]>> = {};
    for (const field of FILTER_FIELDS) {
      // Cidades dependem de Estado (se selecionado)
      let base = rows;
      if ((field === 'cidade' || field === 'cidade_original') && filters.estado?.length) {
        base = rows.filter((r) => filters.estado!.includes(String(r.estado)));
      }
      const values = orderedValues(field, distinctValues(base, field));
      map[field] = values.map((v) => ({ value: v, label: v }));
    }
    return map;
  }, [rows, filters.estado]);

  return (
    <>
      <div
        className={`qd-filter-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`qd-side qd-filter-popin qd-scroll ${open ? 'is-open' : ''}`}
        aria-hidden={!open}
      >
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--qd-primary)]" />
              <span className="text-sm font-semibold">Filtros</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearAll}
                title="Limpar todos"
                className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-[var(--qd-text-muted)] hover:bg-slate-100"
              >
                <RotateCcw className="h-3 w-3" /> limpar
              </button>
              <button
                onClick={onClose}
                title="Recolher"
                className="rounded p-1 text-[var(--qd-text-muted)] hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {FILTER_FIELDS.map((field) => (
            <MultiSelect
              key={field}
              label={FIELD_LABELS[field]}
              options={optionsMap[field] ?? []}
              value={filters[field] ?? []}
              onChange={(v) => setFilter(field, v)}
            />
          ))}
        </div>
      </aside>
    </>
  );
}
