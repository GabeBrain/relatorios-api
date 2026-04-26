import { useMapStore } from '@/store/map-store';
import { useMemo } from 'react';

export default function FeatureList() {
  const layers = useMapStore((s) => s.layers);
  const searchQuery = useMapStore((s) => s.searchQuery);
  const selectedFeatureId = useMapStore((s) => s.selectedFeatureId);
  const setSelected = useMapStore((s) => s.setSelectedFeatureId);

  const features = useMemo(() => {
    const all = layers
      .filter((l) => l.visible)
      .flatMap((l) => l.data?.features ?? []);

    if (!searchQuery.trim()) return all.slice(0, 100);

    const q = searchQuery.toLowerCase();
    return all
      .filter((f) => {
        const props = f.properties || {};
        return Object.values(props).some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(q)
        );
      })
      .slice(0, 100);
  }, [layers, searchQuery]);

  if (features.length === 0 && !searchQuery) return null;

  return (
    <div className="space-y-1">
      <h3 className="font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Features {searchQuery && `(${features.length})`}
      </h3>
      {features.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No matches found</p>
      ) : (
        features.map((f, i) => {
          const fid = String(f.id ?? `f-${i}`);
          const props = f.properties || {};
          const name =
            props.NM_MUN ||
            props.NM_BAIRRO ||
            props.NM_DIST ||
            props.name ||
            props.Name ||
            props.title ||
            props.CD_SETOR ||
            f.geometry?.type ||
            'Feature';
          const isSelected = selectedFeatureId === fid;
          return (
            <button
              key={fid}
              onClick={() => setSelected(isSelected ? null : fid)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                isSelected
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <span className="truncate block">{name}</span>
            </button>
          );
        })
      )}
    </div>
  );
}
