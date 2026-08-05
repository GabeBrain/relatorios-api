import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, LocateFixed, MapPin } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { normalizeText, toNumber } from './engine';
import type { VgvRow } from './types';

const LIGHT_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const DARK_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

type ProjectMapRow = VgvRow & {
  __status_atual?: string;
  __vgv_oferta_atual?: number | null;
};

export interface ProjectMapPoint {
  name: string;
  city: string;
  state: string;
  neighborhood: string;
  address: string;
  number: string;
  status: string;
  lat: number;
  lon: number;
  vgv: number;
}

interface ProjectMapProps {
  rows: ProjectMapRow[];
  columns: Record<string, string | undefined>;
  onFocus: (name: string) => void;
}

function fieldValue(row: ProjectMapRow, column?: string): string {
  return column ? String(row[column] ?? '').trim() : '';
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function locationLabel(point: ProjectMapPoint): string {
  return [point.neighborhood, point.city, point.state].filter(Boolean).join(' · ');
}

function addressLabel(point: ProjectMapPoint): string {
  return [point.address, point.number].filter(Boolean).join(', ');
}

function currentMapStyle(): string {
  return document.documentElement.classList.contains('dark') ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
}

function fitPoints(map: maplibregl.Map, points: ProjectMapPoint[], animate = true): void {
  if (!points.length) return;
  if (points.length === 1) {
    map.easeTo({ center: [points[0].lon, points[0].lat], zoom: 16, duration: animate ? 650 : 0 });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  points.forEach((point) => bounds.extend([point.lon, point.lat]));
  map.fitBounds(bounds, {
    padding: { top: 52, right: 52, bottom: 52, left: 52 },
    maxZoom: 15,
    duration: animate ? 650 : 0,
  });
}

function popupContent(point: ProjectMapPoint, onFocus: () => void): HTMLElement {
  const root = document.createElement('div');
  root.className = 'vvg-map-popup';

  const title = document.createElement('strong');
  title.textContent = point.name;
  root.appendChild(title);

  const location = document.createElement('span');
  location.className = 'vvg-map-popup-location';
  location.textContent = locationLabel(point) || 'Localização não informada';
  root.appendChild(location);

  const address = addressLabel(point);
  if (address) {
    const addressElement = document.createElement('span');
    addressElement.textContent = address;
    root.appendChild(addressElement);
  }

  const metadata = document.createElement('div');
  if (point.status) {
    const status = document.createElement('span');
    status.textContent = point.status;
    metadata.appendChild(status);
  }
  if (point.vgv > 0) {
    const vgv = document.createElement('span');
    vgv.textContent = `VGV oferta: ${formatMoney(point.vgv)}`;
    metadata.appendChild(vgv);
  }
  if (metadata.childElementCount) root.appendChild(metadata);

  const action = document.createElement('button');
  action.type = 'button';
  action.textContent = 'Focar análise neste empreendimento';
  action.addEventListener('click', onFocus);
  root.appendChild(action);

  return root;
}

export function ProjectMap({ rows, columns, onFocus }: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const markerByNameRef = useRef(new Map<string, maplibregl.Marker>());
  const markerElementByNameRef = useRef(new Map<string, HTMLButtonElement>());
  const cleanupMapRef = useRef<() => void>(() => undefined);
  const onFocusRef = useRef(onFocus);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [selectedName, setSelectedName] = useState('');

  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  const points = useMemo(() => {
    const projects = new Map<string, ProjectMapPoint>();
    rows.forEach((row) => {
      const name = fieldValue(row, columns.empreendimento);
      const lat = toNumber(row[columns.latitude ?? '']);
      const lon = toNumber(row[columns.longitude ?? '']);
      if (!name || lat === null || lon === null) return;

      const current = projects.get(name);
      projects.set(name, {
        name,
        city: current?.city || fieldValue(row, columns.cidade),
        state: current?.state || fieldValue(row, columns.estado),
        neighborhood: current?.neighborhood || fieldValue(row, columns.bairro),
        address: current?.address || fieldValue(row, columns.endereco),
        number: current?.number || fieldValue(row, columns.numero),
        status: current?.status || row.__status_atual || '',
        lat,
        lon,
        vgv: (current?.vgv ?? 0) + (row.__vgv_oferta_atual ?? 0),
      });
    });
    return [...projects.values()].sort((a, b) => a.city.localeCompare(b.city, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
  }, [columns, rows]);

  const totalProjects = useMemo(() => new Set(rows.map((row) => fieldValue(row, columns.empreendimento)).filter(Boolean)).size, [columns.empreendimento, rows]);
  const cityCount = useMemo(() => new Set(points.map((point) => `${point.city}|${point.state}`)).size, [points]);
  const missingCoordinates = Math.max(0, totalProjects - points.length);
  const pointsRef = useRef(points);
  const pointCount = points.length;
  pointsRef.current = points;

  const disposeMap = useCallback(() => {
    cleanupMapRef.current();
    cleanupMapRef.current = () => undefined;
  }, []);

  useEffect(() => {
    if (!pointCount) {
      disposeMap();
      setMapReady(false);
      setMapError('');
      return;
    }
    if (!containerRef.current || mapRef.current) return;
    const initialPoints = pointsRef.current;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: currentMapStyle(),
      center: [initialPoints[0].lon, initialPoints[0].lat],
      zoom: 13,
      minZoom: 2,
      maxZoom: 19,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    let didLoad = false;
    const loadTimeout = window.setTimeout(() => {
      if (!didLoad) setMapError('O mapa de ruas demorou para carregar. Verifique a conexão e tente novamente.');
    }, 12000);

    map.once('load', () => {
      didLoad = true;
      window.clearTimeout(loadTimeout);
      setMapReady(true);
      setMapError('');
      fitPoints(map, initialPoints, false);
    });

    const themeObserver = new MutationObserver(() => {
      map.setStyle(currentMapStyle());
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    mapRef.current = map;
    cleanupMapRef.current = () => {
      window.clearTimeout(loadTimeout);
      themeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [disposeMap, pointCount]);

  useEffect(() => () => disposeMap(), [disposeMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const markerByName = markerByNameRef.current;
    const markerElementByName = markerElementByNameRef.current;
    markerByName.clear();
    markerElementByName.clear();

    points.forEach((point) => {
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = 'vvg-map-marker';
      if (normalizeText(point.status).includes('esgotado')) markerElement.classList.add('is-sold-out');
      markerElement.setAttribute('aria-label', `${point.name}, ${locationLabel(point)}`);
      markerElement.title = `${point.name}\n${locationLabel(point)}`;

      const pin = document.createElement('span');
      pin.className = 'vvg-map-marker-pin';
      const core = document.createElement('span');
      core.className = 'vvg-map-marker-core';
      pin.appendChild(core);
      markerElement.appendChild(pin);

      const popup = new maplibregl.Popup({ offset: 22, closeButton: true, maxWidth: '310px' })
        .setDOMContent(popupContent(point, () => onFocusRef.current(point.name)));
      const marker = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat([point.lon, point.lat])
        .setPopup(popup)
        .addTo(map);

      markerElement.addEventListener('click', () => setSelectedName(point.name));
      markersRef.current.push(marker);
      markerByName.set(point.name, marker);
      markerElementByName.set(point.name, markerElement);
    });

    fitPoints(map, points);
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      markerByName.clear();
      markerElementByName.clear();
    };
  }, [mapReady, points]);

  useEffect(() => {
    markerElementByNameRef.current.forEach((element, name) => element.classList.toggle('is-selected', name === selectedName));
  }, [selectedName]);

  const showPoint = useCallback((point: ProjectMapPoint) => {
    const map = mapRef.current;
    if (!map) return;
    setSelectedName(point.name);
    map.flyTo({ center: [point.lon, point.lat], zoom: Math.max(map.getZoom(), 16), duration: 650 });
    const marker = markerByNameRef.current.get(point.name);
    const popup = marker?.getPopup();
    if (marker && popup && !popup.isOpen()) marker.togglePopup();
  }, []);

  const showAll = useCallback(() => {
    if (!mapRef.current) return;
    setSelectedName('');
    fitPoints(mapRef.current, points);
  }, [points]);

  return (
    <section className="vvg-card vvg-map-card">
      <div className="vvg-card-head">
        <div><h2>Mapa de empreendimentos</h2><p>Ruas, bairros e localização exata dos pontos do recorte</p></div>
        <div className="vvg-map-counts">
          <span className="vvg-count">{points.length} {points.length === 1 ? 'ponto' : 'pontos'}</span>
          <span className="vvg-count">{cityCount} {cityCount === 1 ? 'cidade' : 'cidades'}</span>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="vvg-map-empty"><MapPin className="h-6 w-6" /><strong>Sem coordenadas neste recorte</strong><span>Confira as colunas Latitude e Longitude da planilha.</span></div>
      ) : (
        <div className="vvg-map-layout">
          <aside className="vvg-map-list" aria-label="Empreendimentos localizados">
            <div className="vvg-map-list-head">
              <div><strong>Localizações</strong><span>Selecione para aproximar</span></div>
              <button type="button" onClick={showAll}><LocateFixed className="h-3.5 w-3.5" /> Ver todos</button>
            </div>
            <div className="vvg-map-list-scroll">
              {points.map((point) => (
                <button key={point.name} type="button" className={selectedName === point.name ? 'is-active' : ''} onClick={() => showPoint(point)}>
                  <span className="vvg-map-list-icon"><Building2 className="h-3.5 w-3.5" /></span>
                  <span><strong>{point.name}</strong><small>{locationLabel(point) || 'Localização não informada'}</small>{addressLabel(point) && <small>{addressLabel(point)}</small>}</span>
                </button>
              ))}
            </div>
            {missingCoordinates > 0 && <div className="vvg-map-missing">{missingCoordinates} {missingCoordinates === 1 ? 'empreendimento sem coordenadas' : 'empreendimentos sem coordenadas'}</div>}
          </aside>

          <div className="vvg-map-shell">
            <div ref={containerRef} className="vvg-map-canvas" aria-label="Mapa urbano dos empreendimentos" />
            {!mapReady && !mapError && <div className="vvg-map-loading">Carregando ruas e bairros…</div>}
            {mapError && <div className="vvg-map-error"><MapPin className="h-5 w-5" /><span>{mapError}</span><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
          </div>
        </div>
      )}
    </section>
  );
}
