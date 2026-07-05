import { Eye, EyeOff, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMapStore } from '@/legacy/mapa/store/map-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAvailableMunicipalMetrics } from '@/legacy/mapa/lib/municipal-metrics';
import { getAvailableSectorMetrics } from '@/legacy/mapa/lib/sector-metrics';
import { SETOR_LAYER_PREFIX } from '@/legacy/mapa/lib/ibge-selection';

export default function LayerList() {
  const layers = useMapStore((s) => s.layers);
  const toggleVis = useMapStore((s) => s.toggleLayerVisibility);
  const setOpacity = useMapStore((s) => s.setLayerOpacity);
  const setLayerMetricField = useMapStore((s) => s.setLayerMetricField);
  const removeLayer = useMapStore((s) => s.removeLayer);

  if (layers.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Layer Controls
      </h3>
      {layers.map((layer) => {
        const isSetorLayer =
          layer.name.startsWith(SETOR_LAYER_PREFIX) ||
          Boolean(layer.data?.features?.some((f) => f.properties?.CD_SETOR != null));
        const metricOptions = isSetorLayer
          ? getAvailableSectorMetrics(layer.data?.features)
          : getAvailableMunicipalMetrics(layer.data?.features);
        const metricValue = layer.metricField ?? '__none__';
        return (
        <div
          key={layer.id}
          className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
            <div
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: layer.color }}
            />
            <span className="flex-1 truncate text-sm font-medium text-foreground">
              {layer.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => toggleVis(layer.id)}
            >
              {layer.visible ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => removeLayer(layer.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-muted-foreground w-12">Opacity</span>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[layer.opacity]}
              onValueChange={([v]) => setOpacity(layer.id, v)}
              className="flex-1"
            />
          </div>
          {metricOptions.length > 0 && (
            <div className="px-1 space-y-1">
              <span className="text-xs text-muted-foreground w-12">Metrica</span>
              <Select
                value={metricValue}
                onValueChange={(value) =>
                  setLayerMetricField(layer.id, value === '__none__' ? null : value)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Cor padrao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Cor padrao</SelectItem>
                  {metricOptions.map((metric) => (
                    <SelectItem key={metric.key} value={metric.key}>
                      {metric.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {layer.data?.features?.length ?? 0} features
          </p>
        </div>
        );
      })}
    </div>
  );
}
