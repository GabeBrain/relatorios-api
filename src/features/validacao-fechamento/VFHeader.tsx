import { GeoApiScopeSelector } from '@/features/shared/geo-api-scope-engine';
import type { GeoScope } from '@/features/shared/geo-api-scope-engine';
import type { Granularity } from './aggregate';

const GRANS: { value: Granularity; label: string }[] = [
  { value: 'year', label: 'Ano' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'month', label: 'Mês/Ano' },
];

interface Props {
  scope: GeoScope;
  onScopeChange: (s: GeoScope) => void;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  onOpenSidebar: () => void;
}

export function VFHeader({ scope, onScopeChange, granularity, onGranularityChange, onOpenSidebar }: Props) {
  return (
    <header
      className="flex flex-wrap items-end gap-3 px-4 py-3"
      style={{ background: 'var(--vf-card)', borderBottom: '1px solid var(--vf-border)' }}
    >
      <button type="button" className="vf-btn" onClick={onOpenSidebar} aria-label="Abrir filtros">
        ☰ Filtros
      </button>
      <GeoApiScopeSelector value={scope} onChange={onScopeChange} className="flex-1 min-w-[320px]" />
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
    </header>
  );
}
