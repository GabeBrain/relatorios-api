import { X } from 'lucide-react';
import { useQuantiStore } from './store';
import { FIELD_LABELS, type CategoricalField } from './types';

export function ActiveFiltersBar() {
  const filters = useQuantiStore((s) => s.filters);
  const removeFilter = useQuantiStore((s) => s.removeFilter);
  const clearAll = useQuantiStore((s) => s.clearAll);

  const entries = Object.entries(filters) as [CategoricalField, string[]][];
  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--qd-text-muted)]">
        Filtros ativos:
      </span>
      {entries.map(([field, values]) =>
        values.map((v) => (
          <span key={`${field}:${v}`} className="qd-chip">
            <strong className="font-semibold">{FIELD_LABELS[field]}:</strong> {v}
            <button onClick={() => removeFilter(field, v)} aria-label="remover">
              <X className="h-3 w-3" />
            </button>
          </span>
        )),
      )}
      <button
        onClick={clearAll}
        className="ml-1 text-[11px] font-medium text-[var(--qd-primary)] hover:underline"
      >
        limpar tudo
      </button>
    </div>
  );
}
