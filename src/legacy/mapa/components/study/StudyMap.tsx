import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, IconLayer } from '@deck.gl/layers';
import { HeatmapLayer, HexagonLayer } from '@deck.gl/aggregation-layers';
import type { FeatureCollection } from 'geojson';
import { getBounds } from '@/legacy/mapa/lib/geo-utils';
import { lonLatListToLineFeatureCollection, polygonRingsToFeatureCollection, type LonLat } from '@/legacy/mapa/lib/spatial';

const PIN_ICON_URL =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
      <path fill="#ffffff" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5"/>
    </svg>`
  );

const PIN_ICON_MAPPING = {
  marker: {
    x: 0,
    y: 0,
    width: 64,
    height: 64,
    anchorX: 32,
    anchorY: 64,
    mask: true,
  },
};

type SocioRenderMode =
  | 'none'
  | 'choropleth'
  | 'heatmap'
  | 'hexbin';

interface SocioPointRow {
  cd_setor: string;
  position: [number, number];
  value: number;
}

const CHOROPLETH_GREEN_RAMP: [number, number, number][] = [
  [240, 253, 244],
  [220, 252, 231],
  [187, 247, 208],
  [134, 239, 172],
  [74, 222, 128],
  [22, 163, 74],
  [21, 128, 61],
];

const HEATMAP_RED_RANGE: [number, number, number][] = [
  [255, 245, 240],
  [254, 224, 210],
  [252, 187, 161],
  [252, 146, 114],
  [251, 106, 74],
  [239, 59, 44],
  [203, 24, 29],
  [153, 0, 13],
];

const HEXBIN_BLUE_PURPLE_RANGE: [number, number, number][] = [
  [239, 246, 255],
  [219, 234, 254],
  [191, 219, 254],
  [147, 197, 253],
  [129, 140, 248],
  [124, 58, 237],
  [91, 33, 182],
];

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rampColor(t: number): [number, number, number] {
  const tt = clamp01(t);
  const steps = CHOROPLETH_GREEN_RAMP.length - 1;
  if (steps <= 0) return CHOROPLETH_GREEN_RAMP[0];
  const scaled = tt * steps;
  const i = Math.floor(scaled);
  if (i >= steps) return CHOROPLETH_GREEN_RAMP[steps];
  const f = scaled - i;
  const a = CHOROPLETH_GREEN_RAMP[i];
  const b = CHOROPLETH_GREEN_RAMP[i + 1];
  return [
    Math.round(lerp(a[0], b[0], f)),
    Math.round(lerp(a[1], b[1], f)),
    Math.round(lerp(a[2], b[2], f)),
  ];
}

function percentile(values: number[], q: number): number {
  if (!values.length) return 0;
  if (values.length === 1) return values[0];
  const qq = clamp01(q);
  const idx = qq * (values.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return values[low];
  const f = idx - low;
  return lerp(values[low], values[high], f);
}

function computeDomain(values: number[]): { min: number; max: number } | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length < 3) return { min: sorted[0], max: sorted[sorted.length - 1] };
  const p5 = percentile(sorted, 0.05);
  const p95 = percentile(sorted, 0.95);
  if (p95 > p5) return { min: p5, max: p95 };
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}

interface StudyMapProps {
  points: FeatureCollection;
  area: FeatureCollection | null;
  drawingPoints: LonLat[];
  drawMode: boolean;
  onMapClick: () => void;
  onMapClickDraw: (point: LonLat) => void;
  socioMode: SocioRenderMode;
  socioPolygons: FeatureCollection;
  socioPoints: SocioPointRow[];
  socioOpacity: number;
  heatmapRadius: number;
  heatmapIntensity: number;
  hexRadius: number;
}

export default function StudyMap({
  points,
  area,
  drawingPoints,
  drawMode,
  onMapClick,
  onMapClickDraw,
  socioMode,
  socioPolygons,
  socioPoints,
  socioOpacity,
  heatmapRadius,
  heatmapIntensity,
  hexRadius,
}: StudyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isMapInteracting, setIsMapInteracting] = useState(false);

  const drawModeRef = useRef(drawMode);
  const mapClickRef = useRef(onMapClick);
  const drawClickRef = useRef(onMapClickDraw);
  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);
  useEffect(() => {
    mapClickRef.current = onMapClick;
  }, [onMapClick]);
  useEffect(() => {
    drawClickRef.current = onMapClickDraw;
  }, [onMapClickDraw]);

  const drawingAreaFc = useMemo(() => {
    if (drawingPoints.length < 3) return null;
    return polygonRingsToFeatureCollection([drawingPoints]);
  }, [drawingPoints]);

  const drawingLineFc = useMemo(
    () => lonLatListToLineFeatureCollection(drawingPoints),
    [drawingPoints]
  );

  const socioDomain = useMemo(
    () => computeDomain(socioPoints.map((row) => row.value)),
    [socioPoints]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [-49.2766, -25.4474],
      zoom: 11.2,
      dragRotate: false,
      touchPitch: false,
    });
    map.keyboard.disableRotation();
    map.touchZoomRotate.disableRotation();
    map.doubleClickZoom.enable();
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.scrollZoom.setWheelZoomRate(1 / 600);
    map.scrollZoom.setZoomRate(1 / 120);

    map.on('movestart', () => setIsMapInteracting(true));
    map.on('moveend', () => setIsMapInteracting(false));

    map.on('click', (e) => {
      mapClickRef.current();
      if (!drawModeRef.current) return;
      drawClickRef.current([e.lngLat.lng, e.lngLat.lat]);
    });

    const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay as any);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!overlayRef.current) return;

    const layers: any[] = [];
    const effectiveSocioOpacity = isMapInteracting
      ? Math.max(0.22, socioOpacity * 0.58)
      : socioOpacity;

    if (socioMode === 'choropleth' && socioPolygons.features.length) {
      layers.push(
        new GeoJsonLayer({
          id: 'socio-choropleth',
          data: socioPolygons,
          stroked: true,
          filled: true,
          lineWidthMinPixels: 1,
          getLineColor: [120, 120, 120, 180],
          getLineWidth: 1,
          getFillColor: (feature: any) => {
            const value = Number(feature?.properties?.__metric_value);
            if (!Number.isFinite(value) || !socioDomain) return [230, 230, 230, 80];
            if (socioDomain.max <= socioDomain.min) {
              const [r, g, b] = rampColor(0.7);
              return [r, g, b, Math.round(effectiveSocioOpacity * 255)];
            }
            const t = (value - socioDomain.min) / (socioDomain.max - socioDomain.min);
            const [r, g, b] = rampColor(t);
            return [r, g, b, Math.round(effectiveSocioOpacity * 255)];
          },
          pickable: false,
        })
      );
    }

    if (socioMode === 'heatmap' && socioPoints.length) {
      layers.push(
        new HeatmapLayer({
          id: 'socio-heatmap',
          data: socioPoints as any[],
          getPosition: (d: any) => d.position,
          getWeight: (d: any) => d.value,
          radiusPixels: heatmapRadius,
          intensity: heatmapIntensity,
          threshold: 0.03,
          aggregation: 'MEAN',
          opacity: effectiveSocioOpacity,
          colorRange: HEATMAP_RED_RANGE,
          pickable: false,
        })
      );
    }

    if (socioMode === 'hexbin' && socioPoints.length) {
      layers.push(
        new HexagonLayer({
          id: 'socio-hexbin',
          data: socioPoints as any[],
          getPosition: (d: any) => d.position,
          getColorWeight: (d: any) => d.value,
          colorAggregation: 'MEAN',
          radius: hexRadius,
          coverage: 0.92,
          opacity: effectiveSocioOpacity,
          extruded: false,
          colorRange: HEXBIN_BLUE_PURPLE_RANGE,
          pickable: false,
        })
      );
    }

    if (area?.features?.length) {
      layers.push(
        new GeoJsonLayer({
          id: 'study-area-active',
          data: area,
          stroked: true,
          filled: true,
          getFillColor: [20, 130, 60, 32],
          getLineColor: [20, 130, 60, 220],
          getLineWidth: 3,
          lineWidthMinPixels: 2,
          pickable: false,
        })
      );
    }

    if (drawingAreaFc?.features?.length) {
      layers.push(
        new GeoJsonLayer({
          id: 'study-area-drawing-fill',
          data: drawingAreaFc,
          stroked: true,
          filled: true,
          getFillColor: [17, 94, 89, 36],
          getLineColor: [17, 94, 89, 200],
          getLineWidth: 2,
          lineWidthMinPixels: 2,
          pickable: false,
        })
      );
    }

    if (drawingLineFc.features.length) {
      layers.push(
        new GeoJsonLayer({
          id: 'study-area-drawing-line',
          data: drawingLineFc,
          stroked: true,
          filled: false,
          getLineColor: [17, 94, 89, 220],
          getLineWidth: 2,
          lineWidthMinPixels: 2,
          pickable: false,
        })
      );
    }

    layers.push(
      new IconLayer({
        id: 'study-empreendimentos',
        data: points.features as any[],
        pickable: true,
        iconAtlas: PIN_ICON_URL,
        iconMapping: PIN_ICON_MAPPING as any,
        getIcon: () => 'marker',
        sizeScale: 1,
        getSize: 18,
        getPosition: (d: any) => d.geometry?.coordinates,
        getColor: (d: any) => d.properties?.pinColorRgba ?? [55, 65, 81, 235],
        getPixelOffset: () => [0, -6],
        onHover: (info: any) => {
          const el = tooltipRef.current;
          if (!el) return;
          if (!info.object) {
            el.classList.add('hidden');
            return;
          }
          const props = info.object.properties ?? {};
          const name = props.empreendimento ?? 'Empreendimento';
          const status = (props.statuses ?? []).join(', ');
          const tipo = (props.tipos ?? []).join(', ');
          el.innerHTML = `<div><strong>${name}</strong></div><div>Status: ${status || '-'}</div><div>Tipologia: ${tipo || '-'}</div>`;
          el.style.left = `${info.x + 10}px`;
          el.style.top = `${info.y + 10}px`;
          el.classList.remove('hidden');
        },
      })
    );

    overlayRef.current.setProps({ layers });
  }, [
    area,
    drawingAreaFc,
    drawingLineFc,
    points,
    socioMode,
    socioPolygons,
    socioPoints,
    socioDomain,
    socioOpacity,
    heatmapRadius,
    heatmapIntensity,
    hexRadius,
    isMapInteracting,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const target = area?.features?.length ? area : points;
    const bounds = getBounds(target);
    if (!bounds) return;
    map.fitBounds(bounds as any, { padding: 64, duration: 700, maxZoom: 14.5 });
  }, [area, points]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-30 hidden rounded-md border border-border bg-card px-2 py-1 text-xs shadow-md"
      />
      {drawMode && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded bg-black/70 px-3 py-1 text-xs text-white">
          Modo desenho ativo: clique no mapa para adicionar vertices.
        </div>
      )}
      {socioMode !== 'none' && isMapInteracting && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded border border-amber-300/90 bg-amber-50/95 px-3 py-1 text-[11px] font-medium text-amber-900 shadow-sm">
          Camada socio em atualizacao visual
        </div>
      )}
    </div>
  );
}
