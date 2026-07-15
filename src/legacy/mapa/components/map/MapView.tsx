import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import { useMapStore } from '@/legacy/mapa/store/map-store';
import type { GeoLayer } from '@/legacy/mapa/store/map-store';
import * as turf from '@/legacy/mapa/lib/geo-utils';

type RgbaColor = [number, number, number, number];

const METRIC_RAMP: [number, number, number][] = [
  [247, 252, 245],
  [199, 233, 192],
  [116, 196, 118],
  [35, 139, 69],
  [0, 68, 27],
];

function hexToRgba(hex: string, opacity: number): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, Math.round(opacity * 255)];
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateRampColor(t: number): [number, number, number] {
  const tt = clamp01(t);
  const steps = METRIC_RAMP.length - 1;
  if (steps <= 0) return METRIC_RAMP[0];
  const scaled = tt * steps;
  const idx = Math.floor(scaled);
  if (idx >= steps) return METRIC_RAMP[steps];
  const frac = scaled - idx;
  const a = METRIC_RAMP[idx];
  const b = METRIC_RAMP[idx + 1];
  return [
    Math.round(lerp(a[0], b[0], frac)),
    Math.round(lerp(a[1], b[1], frac)),
    Math.round(lerp(a[2], b[2], frac)),
  ];
}

function darken(color: [number, number, number], factor = 0.78): [number, number, number] {
  return [
    Math.round(color[0] * factor),
    Math.round(color[1] * factor),
    Math.round(color[2] * factor),
  ];
}

function getNumericValue(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const normalized = trimmed.includes(',')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function percentile(sortedValues: number[], q: number): number {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const qq = clamp01(q);
  const idx = qq * (sortedValues.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sortedValues[low];
  const frac = idx - low;
  return lerp(sortedValues[low], sortedValues[high], frac);
}

function computeMetricDomain(layer: GeoLayer): { min: number; max: number } | null {
  const field = layer.metricField;
  if (!field) return null;

  const values: number[] = [];
  for (const feature of layer.data?.features ?? []) {
    const value = getNumericValue((feature as any)?.properties?.[field]);
    if (value == null) continue;
    values.push(value);
  }

  if (!values.length) return null;
  values.sort((a, b) => a - b);

  if (values.length === 1) {
    const single = values[0];
    return { min: single, max: single };
  }

  const p5 = percentile(values, 0.05);
  const p95 = percentile(values, 0.95);
  if (p95 > p5) return { min: p5, max: p95 };
  return { min: values[0], max: values[values.length - 1] };
}

export default function MapView() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const layers = useMapStore((s) => s.layers);
  const hoveredFeatureId = useMapStore((s) => s.hoveredFeatureId);
  const setHoveredFeatureId = useMapStore((s) => s.setHoveredFeatureId);
  const setSelectedFeatureId = useMapStore((s) => s.setSelectedFeatureId);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [0, 20],
      zoom: 2,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay as any);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update deck layers
  useEffect(() => {
    if (!overlayRef.current) return;

    const deckLayers = layers
      .filter((l) => l.visible)
      .map((l) => buildDeckLayer(l, hoveredFeatureId, setHoveredFeatureId, setSelectedFeatureId, tooltipRef));

    overlayRef.current.setProps({ layers: deckLayers });
  }, [layers, hoveredFeatureId, setHoveredFeatureId, setSelectedFeatureId]);

  // Fit bounds on new layer
  const prevLayerCount = useRef(0);
  useEffect(() => {
    if (layers.length > prevLayerCount.current && mapRef.current) {
      const last = layers[layers.length - 1];
      const bounds = turf.getBounds(last.data);
      if (bounds) {
        mapRef.current.fitBounds(bounds as any, { padding: 60, maxZoom: 15 });
      }
    }
    prevLayerCount.current = layers.length;
  }, [layers.length]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-50 hidden max-w-xs rounded-xl bg-card p-3 shadow-md text-sm font-body text-foreground border border-border"
      />
    </div>
  );
}

function buildDeckLayer(
  layer: GeoLayer,
  hoveredId: string | null,
  setHovered: (id: string | null) => void,
  setSelected: (id: string | null) => void,
  tooltipRef: React.RefObject<HTMLDivElement | null>
) {
  const baseColor = hexToRgba(layer.color || '#5B7537', layer.opacity);
  const highlightColor: RgbaColor = [248, 208, 0, 220];
  const metricDomain = computeMetricDomain(layer);

  const getMetricFillColor = (feature: any): RgbaColor => {
    if (!layer.metricField || !metricDomain) return baseColor;
    const raw = feature?.properties?.[layer.metricField];
    const value = getNumericValue(raw);
    if (value == null) return [225, 225, 225, Math.round(layer.opacity * 180)];

    if (metricDomain.max <= metricDomain.min) {
      const mono = interpolateRampColor(0.7);
      return [mono[0], mono[1], mono[2], Math.round(layer.opacity * 255)];
    }

    const t = (value - metricDomain.min) / (metricDomain.max - metricDomain.min);
    const rgb = interpolateRampColor(t);
    return [rgb[0], rgb[1], rgb[2], Math.round(layer.opacity * 255)];
  };

  const getMetricLineColor = (feature: any): RgbaColor => {
    const fill = getMetricFillColor(feature);
    const rgb = darken([fill[0], fill[1], fill[2]], 0.7);
    return [rgb[0], rgb[1], rgb[2], 255];
  };

  return new GeoJsonLayer({
    id: layer.id,
    data: layer.data,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false,
    pointType: 'circle',
    getPointRadius: 6,
    pointRadiusUnits: 'pixels' as any,
    lineWidthMinPixels: 2,
    getFillColor: (f: any) =>
      f.properties?._featureId === hoveredId ? highlightColor : getMetricFillColor(f),
    getLineColor: (f: any) =>
      f.properties?._featureId === hoveredId ? highlightColor : getMetricLineColor(f),
    getLineWidth: 2,
    updateTriggers: {
      getFillColor: [
        hoveredId,
        layer.opacity,
        layer.color,
        layer.metricField,
        metricDomain?.min,
        metricDomain?.max,
      ],
      getLineColor: [
        hoveredId,
        layer.opacity,
        layer.color,
        layer.metricField,
        metricDomain?.min,
        metricDomain?.max,
      ],
    },
    onHover: (info: any) => {
      const el = tooltipRef.current;
      if (!el) return;
      if (info.object) {
        setHovered(info.object.properties?._featureId ?? null);
        el.style.left = `${info.x + 12}px`;
        el.style.top = `${info.y + 12}px`;
        el.classList.remove('hidden');
        const props = info.object.properties || {};
        const entries = Object.entries(props).filter(
          ([k]) => !k.startsWith('_')
        );
        el.innerHTML = entries.length
          ? entries
              .slice(0, 6)
              .map(([k, v]) => `<div><span class="font-semibold">${k}:</span> ${v}</div>`)
              .join('')
          : '<div class="text-muted-foreground">No properties</div>';
      } else {
        setHovered(null);
        el.classList.add('hidden');
      }
    },
    onClick: (info: any) => {
      if (info.object) {
        setSelected(info.object.properties?._featureId ?? null);
      }
    },
  });
}
