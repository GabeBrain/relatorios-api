import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Home, Loader2 } from 'lucide-react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { geoMercator, geoPath } from 'd3-geo';
import type { QuantiRecord } from '../types';
import { useQuantiStore } from '../store';
import { municipalitiesUrl, strip, toUF, ufInfo, UF_LIST } from './geo-utils';

const STATES_URL = '/geo/br-states.json';

// Brain green ramp
const RAMP = ['#f6f8f1', '#e0ecc4', '#c4dc95', '#a3c96b', '#71984a', '#5B7537', '#3d5024'];
const YELLOW_HL = '#F8D000';
const STROKE_ACTIVE = '#3d5024';

function color(v: number, max: number): string {
  if (!v || !max) return '#f1f5f9';
  const t = Math.min(1, v / max);
  const idx = Math.min(RAMP.length - 1, Math.floor(t * RAMP.length));
  return RAMP[idx];
}

const munCache = new Map<string, any>();

interface Props {
  rows: QuantiRecord[];
}

export function GeoMap({ rows }: Props) {
  const filters = useQuantiStore((s) => s.filters);
  const toggle = useQuantiStore((s) => s.toggleValue);
  const removeFilter = useQuantiStore((s) => s.removeFilter);

  const [statesGeo, setStatesGeo] = useState<any>(null);

  useEffect(() => {
    fetch(STATES_URL).then((r) => r.json()).then(setStatesGeo).catch(() => setStatesGeo(null));
  }, []);

  // Which UF (if any) is currently focused, derived from the estado filter.
  const focusedUF = useMemo(() => {
    const est = filters.estado ?? [];
    if (est.length !== 1) return null;
    return toUF(est[0]);
  }, [filters.estado]);

  const focusedCity = useMemo(() => {
    const c = filters.cidade ?? [];
    return c.length === 1 ? c[0] : null;
  }, [filters.cidade]);

  // Data-side UF value counts (keyed by UF code, preserving original raw string for filter toggling).
  const byUF = useMemo(() => {
    const m = new Map<string, { count: number; raw: string }>();
    for (const r of rows) {
      const raw = String((r as any).estado ?? '');
      const uf = toUF(raw);
      if (!uf) continue;
      const cur = m.get(uf);
      if (cur) cur.count++;
      else m.set(uf, { count: 1, raw });
    }
    return m;
  }, [rows]);

  const total = rows.length;
  const stateMax = Math.max(1, ...Array.from(byUF.values()).map((x) => x.count));

  // Municipal counts for the focused UF (keyed by normalized city name → { count, raw }).
  const byCity = useMemo(() => {
    if (!focusedUF) return new Map<string, { count: number; raw: string }>();
    const m = new Map<string, { count: number; raw: string }>();
    for (const r of rows) {
      const uf = toUF(String((r as any).estado ?? ''));
      if (uf !== focusedUF) continue;
      const raw = String((r as any).cidade ?? '');
      const k = strip(raw);
      if (!k) continue;
      const cur = m.get(k);
      if (cur) cur.count++;
      else m.set(k, { count: 1, raw });
    }
    return m;
  }, [rows, focusedUF]);
  const cityMax = Math.max(1, ...Array.from(byCity.values()).map((x) => x.count));

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-1 text-[12px] font-medium">
        <button
          onClick={() => { removeFilter('estado'); removeFilter('cidade'); }}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-slate-100 ${
            !focusedUF ? 'text-[var(--qd-primary)]' : 'text-[var(--qd-text-muted)]'
          }`}
        >
          <Home className="h-3.5 w-3.5" /> Brasil
        </button>
        {focusedUF && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <button
              onClick={() => removeFilter('cidade')}
              className={`rounded px-1.5 py-0.5 hover:bg-slate-100 ${
                !focusedCity ? 'text-[var(--qd-primary)]' : 'text-[var(--qd-text-muted)]'
              }`}
            >
              {ufInfo(focusedUF)?.name ?? focusedUF}
            </button>
          </>
        )}
        {focusedUF && focusedCity && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="rounded px-1.5 py-0.5 text-[var(--qd-primary)]">{focusedCity}</span>
          </>
        )}
      </div>

      {/* Map */}
      {!focusedUF && (
        <BrazilLevel
          geo={statesGeo}
          byUF={byUF}
          max={stateMax}
          total={total}
          selectedUFs={(filters.estado ?? []).map((v) => toUF(v)).filter(Boolean) as string[]}
          onClickUF={(uf) => {
            const entry = byUF.get(uf);
            const raw = entry?.raw ?? ufInfo(uf)?.name ?? uf;
            toggle('estado', raw);
          }}
        />
      )}
      {focusedUF && (
        <UFLevel
          uf={focusedUF}
          byCity={byCity}
          max={cityMax}
          total={total}
          selectedCity={focusedCity}
          onClickCity={(raw) => toggle('cidade', raw)}
        />
      )}
    </div>
  );
}

/* ────── Brasil level ────── */
function BrazilLevel({
  geo,
  byUF,
  max,
  total,
  selectedUFs,
  onClickUF,
}: {
  geo: any;
  byUF: Map<string, { count: number; raw: string }>;
  max: number;
  total: number;
  selectedUFs: string[];
  onClickUF: (uf: string) => void;
}) {
  const [hover, setHover] = useState<{ uf: string; x: number; y: number } | null>(null);

  if (!geo) {
    return <div className="flex h-[420px] items-center justify-center text-xs text-[var(--qd-text-muted)]"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando mapa…</div>;
  }

  return (
    <div className="relative">
      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 720, center: [-54, -15] }} width={800} height={480} style={{ width: '100%', height: 'auto' }}>
        <Geographies geography={geo}>
          {({ geographies }: any) =>
            geographies.map((g: any) => {
              const uf = g.properties.sigla as string;
              const entry = byUF.get(uf);
              const n = entry?.count ?? 0;
              const active = selectedUFs.includes(uf);
              return (
                <Geography
                  key={g.rsmKey}
                  geography={g}
                  fill={active ? YELLOW_HL : color(n, max)}
                  stroke={active ? STROKE_ACTIVE : '#ffffff'}
                  strokeWidth={active ? 1.6 : 0.5}
                  onClick={() => onClickUF(uf)}
                  onMouseEnter={(e) => setHover({ uf, x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => setHover({ uf, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    default: { outline: 'none', cursor: 'pointer', transition: 'fill .15s' },
                    hover: { outline: 'none', fill: active ? YELLOW_HL : '#8fb85f', cursor: 'pointer' },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {hover && <Tooltip x={hover.x} y={hover.y}>
        <div className="font-semibold">{ufInfo(hover.uf)?.name ?? hover.uf}</div>
        <div className="mt-0.5 text-[11px]">
          {(byUF.get(hover.uf)?.count ?? 0).toLocaleString('pt-BR')} entrevistas ·{' '}
          {total ? (((byUF.get(hover.uf)?.count ?? 0) / total) * 100).toFixed(1) : '0.0'}% da base
        </div>
      </Tooltip>}
      <Legend max={max} label="entrevistas" />
    </div>
  );
}

/* ────── UF level ────── */
function UFLevel({
  uf,
  byCity,
  max,
  total,
  selectedCity,
  onClickCity,
}: {
  uf: string;
  byCity: Map<string, { count: number; raw: string }>;
  max: number;
  total: number;
  selectedCity: string | null;
  onClickCity: (raw: string) => void;
}) {
  const [geo, setGeo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);

  useEffect(() => {
    setError(null);
    if (munCache.has(uf)) { setGeo(munCache.get(uf)); return; }
    setGeo(null);
    const url = municipalitiesUrl(uf);
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { munCache.set(uf, data); setGeo(data); })
      .catch((e) => setError(String(e.message || e)));
  }, [uf]);

  const projection = useMemo(() => {
    if (!geo) return null;
    // fit projection to feature collection
    const p = geoMercator();
    p.fitExtent([[8, 8], [792, 472]], geo);
    return p;
  }, [geo]);

  if (error) return <div className="p-4 text-xs text-red-600">Não foi possível carregar o mapa de {uf}: {error}</div>;
  if (!geo || !projection) return <div className="flex h-[420px] items-center justify-center text-xs text-[var(--qd-text-muted)]"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando municípios de {ufInfo(uf)?.name}…</div>;

  const path = geoPath(projection);
  const selectedNorm = selectedCity ? strip(selectedCity) : null;

  return (
    <div className="relative">
      <svg viewBox="0 0 800 480" width="100%" style={{ height: 'auto' }}>
        {geo.features.map((f: any, i: number) => {
          const name = f.properties.name || f.properties.NM_MUN || f.properties.NOME || '';
          const key = strip(name);
          const entry = byCity.get(key);
          const n = entry?.count ?? 0;
          const active = selectedNorm === key;
          const d = path(f) || '';
          return (
            <path
              key={i}
              d={d}
              fill={active ? YELLOW_HL : color(n, max)}
              stroke={active ? STROKE_ACTIVE : '#ffffff'}
              strokeWidth={active ? 1.4 : 0.35}
              style={{ cursor: entry ? 'pointer' : 'default', transition: 'fill .12s' }}
              onClick={() => entry && onClickCity(entry.raw)}
              onMouseEnter={(e) => setHover({ name, x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => setHover({ name, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      {hover && (() => {
        const key = strip(hover.name);
        const n = byCity.get(key)?.count ?? 0;
        return (
          <Tooltip x={hover.x} y={hover.y}>
            <div className="font-semibold">{hover.name}</div>
            <div className="mt-0.5 text-[11px]">
              {n.toLocaleString('pt-BR')} entrevistas · {total ? ((n / total) * 100).toFixed(1) : '0.0'}% da base
            </div>
          </Tooltip>
        );
      })()}
      <Legend max={max} label="entrevistas" />
    </div>
  );
}

function Tooltip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-[var(--qd-text)] shadow-md"
      style={{ left: x + 12, top: y + 12 }}
    >
      {children}
    </div>
  );
}

function Legend({ max, label }: { max: number; label: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--qd-text-muted)]">
      <span>0</span>
      <div className="flex h-2 flex-1 overflow-hidden rounded">
        {RAMP.map((c) => <div key={c} className="flex-1" style={{ background: c }} />)}
      </div>
      <span>{max.toLocaleString('pt-BR')} {label}</span>
    </div>
  );
}
