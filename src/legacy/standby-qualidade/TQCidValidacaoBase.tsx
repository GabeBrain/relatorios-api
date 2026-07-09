import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Database,
  FileDown,
  Loader2,
  MapPin,
  Play,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import brainLogo from '../../assets/logoBrain.png';

const BASE_URL = 'https://geobrain.com.br/public-api';
const ALL_BUILDING_TYPES = ['Vertical', 'Horizontal', 'Comercial', 'Hotel'] as const;
const FETCH_CONCURRENCY = 8;
type BuildingType = typeof ALL_BUILDING_TYPES[number];

// Bounding boxes para cidades monitoradas — expandir conforme necessário.
// Fonte: notebook "Validação Dados CID". Lat/lon em graus decimais.
type BBox = { LAT_MIN: number; LAT_MAX: number; LON_MIN: number; LON_MAX: number };

const CITY_BBOX: Record<string, BBox> = {
  'Porto Alegre':    { LAT_MIN: -30.25, LAT_MAX: -29.95, LON_MIN: -51.30, LON_MAX: -51.05 },
  'Curitiba':        { LAT_MIN: -25.65, LAT_MAX: -25.30, LON_MIN: -49.40, LON_MAX: -49.15 },
  'São Paulo':       { LAT_MIN: -23.75, LAT_MAX: -23.40, LON_MIN: -46.85, LON_MAX: -46.35 },
  'Campinas':        { LAT_MIN: -23.05, LAT_MAX: -22.80, LON_MIN: -47.25, LON_MAX: -47.00 },
  'Belo Horizonte':  { LAT_MIN: -20.05, LAT_MAX: -19.80, LON_MIN: -44.05, LON_MAX: -43.85 },
  'Goiânia':         { LAT_MIN: -16.80, LAT_MAX: -16.55, LON_MIN: -49.40, LON_MAX: -49.15 },
  'Florianópolis':   { LAT_MIN: -27.75, LAT_MAX: -27.45, LON_MIN: -48.65, LON_MAX: -48.40 },
  'Ribeirão Preto':  { LAT_MIN: -21.25, LAT_MAX: -21.10, LON_MIN: -47.90, LON_MAX: -47.75 },
  'Fortaleza':       { LAT_MIN: -3.85,  LAT_MAX: -3.70,  LON_MIN: -38.60, LON_MAX: -38.40 },
  'Recife':          { LAT_MIN: -8.15,  LAT_MAX: -7.95,  LON_MIN: -35.05, LON_MAX: -34.85 },
  'Salvador':        { LAT_MIN: -13.05, LAT_MAX: -12.80, LON_MIN: -38.55, LON_MAX: -38.30 },
  'Manaus':          { LAT_MIN: -3.20,  LAT_MAX: -2.95,  LON_MIN: -60.10, LON_MAX: -59.85 },
  'Belém':           { LAT_MIN: -1.50,  LAT_MAX: -1.25,  LON_MIN: -48.55, LON_MAX: -48.35 },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonitoredCity {
  city?: string;
  city_name?: string;
  uf?: string;
  state?: string;
}

interface TypologyHistory {
  typology_id?: string | number;
  release_price?: number | string | null;
  period?: string;
  [key: string]: unknown;
}

interface RawBuilding {
  building_id?: string | number;
  name?: string;
  city?: string;
  state?: string;
  standard?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  release_date?: string | null;
  delivery_date?: string | null;
  typologies_history?: TypologyHistory[];
  [key: string]: unknown;
}

// 1 linha por tipologia após o flatten
interface FlatRow {
  building_id: string;
  name: string;
  standard: string;
  latitude: number | null;
  longitude: number | null;
  release_date: string | null;
  delivery_date: string | null;
  typology_id: string;
  private_area: number | null;
  price: number | null;
  release_price: number | null;
}

type AlertSeverity = 'Alta' | 'Moderado' | 'Leve' | 'Baixa';
type AlertType = 'Data' | 'Localização' | 'Outlier M²' | 'Outlier Preço' | 'Nulidade';

interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  building_id: string;
  name: string;
  standard: string;
  detail: string;
  sigma?: number; // distância normalizada ao limite IQR (outliers apenas)
}

interface OutlierStats {
  standard: string;
  field: 'private_area' | 'price';
  rows: FlatRow[];       // todas as tipologias do padrão
  q1: number;
  q3: number;
  iqrVal: number;
  lo: number;
  hi: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function apiGet(
  path: string,
  params: Record<string, unknown>,
  token: string,
  signal?: AbortSignal,
): Promise<{ data: unknown; error: string }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') qs.set(k, String(v));
  }
  const url = `${BASE_URL}${path}${qs.toString() ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal,
    });
    const data = await res.json();
    return { data, error: '' };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const f = parseFloat(String(v));
  return Number.isFinite(f) ? f : null;
}

function fmtBRL(v: number | null) {
  if (v === null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtNum(v: number | null, dec = 1) {
  if (v === null) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function calcIQR(values: number[]): { q1: number; q3: number; iqrVal: number; lo: number; hi: number } | null {
  if (values.length < 4) return null;
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  const q1 = s[Math.floor(n * 0.25)];
  const q3 = s[Math.floor(n * 0.75)];
  const iqrVal = q3 - q1;
  return { q1, q3, iqrVal, lo: q1 - 1.5 * iqrVal, hi: q3 + 1.5 * iqrVal };
}

// σ = distância normalizada ao limite IQR mais próximo (0 = dentro dos limites)
function calcSigma(v: number, lo: number, hi: number, iqrVal: number): number {
  if (iqrVal <= 0) return 0;
  if (v < lo) return (lo - v) / iqrVal;
  if (v > hi) return (v - hi) / iqrVal;
  return 0;
}

function sigmaToSeverity(sigma: number): AlertSeverity {
  if (sigma <= 0) return 'Baixa';
  if (sigma <= 1) return 'Leve';
  if (sigma <= 2) return 'Moderado';
  return 'Alta';
}

const SIGMA_COLOR: Record<string, string> = {
  normal:   '#22c55e',
  Leve:     '#f59e0b',
  Moderado: '#f97316',
  Alta:     '#ef4444',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingBlock({
  displayPct, done, total, failed, phase, onAbort,
}: {
  displayPct: number; done: number; total: number; failed: number; phase: string; onAbort: () => void;
}) {
  const clipped = Math.max(0, Math.min(100, displayPct));
  return (
    <div className="flex flex-col items-center gap-3 py-8 border border-border rounded-xl bg-card">
      <div className="relative w-40 h-20">
        <img src={brainLogo} alt="" className="absolute inset-0 w-full h-full object-contain opacity-10" />
        <img
          src={brainLogo} alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{ clipPath: `inset(0 ${100 - clipped}% 0 0)`, transition: 'clip-path 0.25s ease-out' }}
        />
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-sm text-muted-foreground animate-pulse">{phase || 'Coletando dados…'}</p>
        {total > 0 && (
          <p className="text-xs text-muted-foreground/70 tabular-nums">
            {done}/{total} páginas
            <span className="ml-1.5">· {FETCH_CONCURRENCY}× paralelo</span>
            {failed > 0 && <span className="text-amber-500 ml-1.5">· {failed} falha(s)</span>}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onAbort}
        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-colors"
      >
        <X className="h-3 w-3" /> Cancelar
      </button>
    </div>
  );
}

const N_BINS = 20;

function OutlierHistogram({ stats }: { stats: OutlierStats }) {
  const [selectedBin, setSelectedBin] = useState<number | null>(null);

  const { rows, field, lo, hi, iqrVal } = stats;
  const vals = rows.map((r) => r[field]).filter((v): v is number => v !== null);
  if (vals.length === 0) return null;

  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const binW = range / N_BINS;

  const bins = Array.from({ length: N_BINS }, (_, i) => ({
    i,
    lo: minV + i * binW,
    hi: minV + (i + 1) * binW,
    items: [] as { row: FlatRow; v: number; sigma: number }[],
  }));

  for (const row of rows) {
    const v = row[field];
    if (v === null) continue;
    const idx = Math.min(Math.floor((v - minV) / binW), N_BINS - 1);
    const sigma = calcSigma(v, lo, hi, iqrVal);
    bins[idx].items.push({ row, v, sigma });
  }

  const fmt = (v: number) => field === 'price' ? fmtBRL(v) : `${fmtNum(v, 0)} m²`;

  const chartData = bins.map((b) => {
    const centerSigma = calcSigma((b.lo + b.hi) / 2, lo, hi, iqrVal);
    const sev = sigmaToSeverity(centerSigma);
    return {
      ...b,
      count: b.items.length,
      fill: centerSigma === 0 ? SIGMA_COLOR.normal : SIGMA_COLOR[sev],
      sev,
    };
  });

  const sel = selectedBin !== null ? chartData[selectedBin] : null;

  return (
    <div className="space-y-2">
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }} barCategoryGap={2}>
            <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={24} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as typeof chartData[0];
                return (
                  <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow">
                    <p className="font-medium">{fmt(d.lo)} – {fmt(d.hi)}</p>
                    <p className="text-muted-foreground">{d.count} tipologia(s)</p>
                    {d.sev !== 'Baixa' && <p style={{ color: d.fill }}>Severidade: {d.sev}</p>}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="count"
              cursor="pointer"
              onClick={(_, i) => setSelectedBin(i === selectedBin ? null : i)}
            >
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.fill}
                  opacity={selectedBin === null || selectedBin === i ? 1 : 0.35}
                  stroke={selectedBin === i ? 'hsl(var(--foreground))' : 'none'}
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-xs flex-wrap">
        {([['normal', 'Normal (dentro do IQR)'], ['Leve', 'Leve (≤1σ fora)'], ['Moderado', 'Moderado (1–2σ)'], ['Alta', 'Grave (>2σ)']] as const).map(([k, label]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: SIGMA_COLOR[k] }} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
        <span className="text-muted-foreground/50 ml-auto">clique em uma barra para detalhar</span>
      </div>

      {/* Painel de detalhes do bin selecionado */}
      {sel && sel.items.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">
              {fmt(sel.lo)} – {fmt(sel.hi)}
              <span className="ml-2 text-muted-foreground font-normal">· {sel.items.length} tipologia(s)</span>
            </p>
            {sel.sev !== 'Baixa' && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: sel.fill + '20', color: sel.fill }}>
                {sel.sev}
              </span>
            )}
          </div>
          <div className="divide-y divide-border/40 max-h-36 overflow-y-auto">
            {sel.items.slice(0, 30).map(({ row, v, sigma }, i) => (
              <div key={i} className="flex items-baseline justify-between py-1 gap-2">
                <span className="text-xs text-muted-foreground truncate">{row.name}</span>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-xs font-medium tabular-nums">{fmt(v)}</span>
                  {sigma > 0 && (
                    <span className="text-[10px] tabular-nums" style={{ color: SIGMA_COLOR[sigmaToSeverity(sigma)] }}>
                      σ={sigma.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {sel.items.length > 30 && (
              <p className="text-[10px] text-muted-foreground pt-1">+{sel.items.length - 30} mais…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  badge,
  badgeSeverity = 'ok',
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  badgeSeverity?: 'ok' | 'warn' | 'error';
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const cls = {
    ok:    'bg-green-500/10 text-green-700 dark:text-green-400',
    warn:  'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    error: 'bg-destructive/10 text-destructive',
  }[badgeSeverity];

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors text-left"
      >
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="flex-1 font-medium text-sm">{title}</span>
        {badge && (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', cls)}>{badge}</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">
        {value}
        {sub && <span className="text-xs text-muted-foreground ml-1.5">{sub}</span>}
      </span>
    </div>
  );
}

function AlertTable({ rows, showType = false }: { rows: Alert[]; showType?: boolean }) {
  const sev: Record<string, string> = {
    Alta:     'bg-destructive/10 text-destructive',
    Moderado: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    Leve:     'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    Baixa:    'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  };
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Sev.</th>
            {showType && <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>}
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Empreendimento</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Padrão</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={i} className="border-t border-border/40 hover:bg-muted/20">
              <td className="px-3 py-2 shrink-0">
                <span className={cn('px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap', sev[a.severity])}>
                  {a.severity}
                </span>
              </td>
              {showType && <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{a.type}</td>}
              <td className="px-3 py-2 font-medium max-w-[160px] truncate" title={a.name}>{a.name}</td>
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{a.standard}</td>
              <td className="px-3 py-2 text-muted-foreground">{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TQCidValidacaoBase() {
  const token = useAuthStore((s) => s.getToken());
  const hasToken = !!token;

  // Escopo UF/cidade agora vem do padrão compartilhado GeoApiScopeEngine.
  // Ver AGENTS.md / CLAUDE.md, seção "GeoApiScopeEngine".
  const [scope, setScope] = useState<{ uf: string; city: string }>({ uf: '', city: '' });
  const selectedUf = scope.uf;
  const selectedCityName = scope.city;
  const [selectedTypes, setSelectedTypes] = useState<BuildingType[]>([...ALL_BUILDING_TYPES]);

  // Interpolação suave do progresso da logo
  useEffect(() => {
    const target = fetchProg.pct;
    if (!running) {
      displayPctRef.current = 0;
      setDisplayPct(0);
      return;
    }
    const id = setInterval(() => {
      const curr = displayPctRef.current;
      const next = curr + (target - curr) * 0.2;
      displayPctRef.current = next;
      setDisplayPct(next);
      if (Math.abs(next - target) < 0.3) {
        displayPctRef.current = target;
        setDisplayPct(target);
        clearInterval(id);
      }
    }, 30);
    return () => clearInterval(id);
  }, [fetchProg.pct, running]);

  const canRun = !!selectedUf && !!selectedCityName && selectedTypes.length > 0;

  function toggleType(t: BuildingType) {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  const run = useCallback(async () => {
    if (!token || !selectedUf || !selectedCityName || selectedTypes.length === 0) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setRunning(true);
    setError('');
    setRan(false);
    setRows([]);
    setAlerts([]);
    setOutlierStats([]);
    setFetchProg({ done: 0, total: 0, failed: 0, pct: 0 });

    try {
      // ── 1. Fase de descoberta: página 1 de cada tipo em paralelo ──────────
      setPhase('Descobrindo volume por tipo…');

      const firstPages = await Promise.allSettled(
        selectedTypes.map((btype) =>
          apiGet('/building-with-history',
            { city: selectedCityName, uf: selectedUf, type: btype, per_page: 100, page: 1 },
            token, ctrl.signal,
          ).then((r) => ({ ...r, btype }))
        )
      );

      if (ctrl.signal.aborted) return;

      // Coleta resultados da página 1 e monta lista de páginas restantes
      const allBuildings: RawBuilding[] = [];
      const seenIds = new Set<string>();
      const remainingTasks: { btype: string; page: number }[] = [];
      let initFailed = 0;

      for (const result of firstPages) {
        if (result.status === 'rejected') { initFailed++; continue; }
        const { data, error: err, btype } = result.value;
        if (err || !data) { initFailed++; continue; }
        const d = data as Record<string, unknown>;
        const items = (d.data as RawBuilding[]) ?? [];
        const meta = (d.meta as Record<string, unknown>) ?? {};
        const lastPage = (meta.last_page as number) ?? 1;
        for (const item of items) {
          const id = String(item.building_id ?? '');
          if (id && !seenIds.has(id)) { seenIds.add(id); allBuildings.push(item); }
        }
        for (let p = 2; p <= lastPage; p++) remainingTasks.push({ btype, page: p });
      }

      const totalPages = selectedTypes.length + remainingTasks.length;
      let donePages = selectedTypes.length;
      let failedPages = initFailed;

      setFetchProg({ done: donePages, total: totalPages, failed: failedPages, pct: (donePages / totalPages) * 100 });

      // ── 2. Fase paralela: páginas restantes em batches de FETCH_CONCURRENCY ─
      for (let i = 0; i < remainingTasks.length; i += FETCH_CONCURRENCY) {
        if (ctrl.signal.aborted) return;
        const batch = remainingTasks.slice(i, i + FETCH_CONCURRENCY);
        setPhase(`Coletando páginas ${donePages + 1}–${Math.min(donePages + batch.length, totalPages)} de ${totalPages}…`);

        const results = await Promise.allSettled(
          batch.map(({ btype, page }) =>
            apiGet('/building-with-history',
              { city: selectedCityName, uf: selectedUf, type: btype, per_page: 100, page },
              token, ctrl.signal,
            )
          )
        );

        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.data) {
            const items = ((r.value.data as Record<string, unknown>).data as RawBuilding[]) ?? [];
            for (const item of items) {
              const id = String(item.building_id ?? '');
              if (id && !seenIds.has(id)) { seenIds.add(id); allBuildings.push(item); }
            }
          } else {
            failedPages++;
          }
          donePages++;
        }

        setFetchProg({ done: donePages, total: totalPages, failed: failedPages, pct: (donePages / totalPages) * 100 });
      }

      // ── 2. Flatten via typologies_history ────────────────────────────────
      // BuildingWithHistoricResource não expõe typologies[] — os dados de
      // tipologia estão em typologies_history[]. Agrupamos por typology_id,
      // usamos o período mais recente para preço/estoque atual e o mais
      // antigo para release_price.
      setPhase('Processando tipologias…');
      const flat: FlatRow[] = [];

      for (const b of allBuildings) {
        const typoMap = new Map<string, TypologyHistory[]>();
        for (const h of b.typologies_history ?? []) {
          const tid = String(h.typology_id ?? '');
          if (!tid) continue;
          if (!typoMap.has(tid)) typoMap.set(tid, []);
          typoMap.get(tid)!.push(h);
        }

        for (const [tid, entries] of typoMap) {
          entries.sort((a, b) => String(a.period ?? '').localeCompare(String(b.period ?? '')));
          const first = entries[0];
          const last = entries[entries.length - 1];

          flat.push({
            building_id: String(b.building_id ?? ''),
            name: b.name ?? '—',
            standard: b.standard ?? '—',
            latitude: toNum(b.latitude),
            longitude: toNum(b.longitude),
            release_date: b.release_date ?? null,
            delivery_date: b.delivery_date ?? null,
            typology_id: tid,
            private_area: toNum(last.private_area),
            price: toNum(last.price),
            release_price: toNum(first.release_price),
          });
        }
      }

      const newAlerts: Alert[] = [];

      // ── 3. Outliers IQR por Padrão ────────────────────────────────────────
      setPhase('Detectando outliers por Padrão…');
      const standards = [...new Set(flat.map((r) => r.standard))];
      const newOutlierStats: OutlierStats[] = [];

      for (const std of standards) {
        const group = flat.filter((r) => r.standard === std);

        for (const field of ['private_area', 'price'] as const) {
          const vals = group.map((r) => r[field]).filter((v): v is number => v !== null);
          const iqr = calcIQR(vals);
          if (!iqr) continue;

          newOutlierStats.push({ standard: std, field, rows: group, ...iqr });

          for (const row of group) {
            const v = row[field];
            if (v === null || (v >= iqr.lo && v <= iqr.hi)) continue;
            const sigma = calcSigma(v, iqr.lo, iqr.hi, iqr.iqrVal);
            const sev = sigmaToSeverity(sigma);
            const isArea = field === 'private_area';
            newAlerts.push({
              type: isArea ? 'Outlier M²' : 'Outlier Preço',
              severity: sev === 'Baixa' ? 'Leve' : sev,
              building_id: row.building_id,
              name: row.name,
              standard: std,
              detail: isArea
                ? `M²: ${fmtNum(v)} — limite [${fmtNum(iqr.lo)}, ${fmtNum(iqr.hi)}] m² (σ=${sigma.toFixed(1)})`
                : `Preço: ${fmtBRL(v)} — limite [${fmtBRL(iqr.lo)}, ${fmtBRL(iqr.hi)}] (σ=${sigma.toFixed(1)})`,
              sigma,
            });
          }
        }
      }

      // ── 4. Validação de datas ─────────────────────────────────────────────
      setPhase('Validando datas…');
      const seenDates = new Set<string>();

      for (const row of flat) {
        if (seenDates.has(row.building_id)) continue;
        seenDates.add(row.building_id);

        const rd = row.release_date ? new Date(row.release_date) : null;
        const dd = row.delivery_date ? new Date(row.delivery_date) : null;

        if (!rd || !dd) {
          const missing = [!rd && 'Data de Lançamento', !dd && 'Data de Entrega'].filter(Boolean).join(' e ');
          newAlerts.push({
            type: 'Nulidade',
            severity: 'Alta',
            building_id: row.building_id,
            name: row.name,
            standard: row.standard,
            detail: `${missing} ausente`,
          });
        } else if (dd < rd) {
          newAlerts.push({
            type: 'Data',
            severity: 'Alta',
            building_id: row.building_id,
            name: row.name,
            standard: row.standard,
            detail: `Entrega (${row.delivery_date}) antes do Lançamento (${row.release_date})`,
          });
        }
      }

      // ── 5. Validação geográfica ───────────────────────────────────────────
      setPhase('Validando localização…');
      const bbox = CITY_BBOX[selectedCityName];
      const seenGeo = new Set<string>();

      for (const row of flat) {
        if (seenGeo.has(row.building_id)) continue;
        seenGeo.add(row.building_id);

        if (row.latitude === null || row.longitude === null) {
          newAlerts.push({
            type: 'Localização',
            severity: 'Alta',
            building_id: row.building_id,
            name: row.name,
            standard: row.standard,
            detail: 'Latitude ou Longitude ausente',
          });
          continue;
        }

        if (bbox) {
          const ok = row.latitude >= bbox.LAT_MIN && row.latitude <= bbox.LAT_MAX
                  && row.longitude >= bbox.LON_MIN && row.longitude <= bbox.LON_MAX;
          if (!ok) {
            newAlerts.push({
              type: 'Localização',
              severity: 'Alta',
              building_id: row.building_id,
              name: row.name,
              standard: row.standard,
              detail: `Lat ${row.latitude.toFixed(4)}, Lon ${row.longitude.toFixed(4)} fora do limite de ${selectedCityName}`,
            });
          }
        }
      }

      setRows(flat);
      setAlerts(newAlerts);
      setOutlierStats(newOutlierStats);
      setRan(true);
      setPhase('');
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [token, selectedUf, selectedCityName, selectedTypes]);

  // ── Métricas derivadas ────────────────────────────────────────────────────

  const uniqueBuildings = new Set(rows.map((r) => r.building_id)).size;
  const pct = (n: number, total: number) => total ? `${((n / total) * 100).toFixed(1)}%` : '0%';

  const nullArea  = rows.filter((r) => r.private_area === null).length;
  const nullPrice = rows.filter((r) => r.price === null).length;
  const nullRelD  = new Set(rows.filter((r) => !r.release_date).map((r) => r.building_id)).size;
  const nullDelD  = new Set(rows.filter((r) => !r.delivery_date).map((r) => r.building_id)).size;
  const nullGeo   = new Set(rows.filter((r) => r.latitude === null || r.longitude === null).map((r) => r.building_id)).size;

  const ALERT_TYPES: AlertType[] = ['Data', 'Nulidade', 'Localização', 'Outlier M²', 'Outlier Preço'];
  const chartData = ALERT_TYPES.map((t) => ({
    name:     t,
    Alta:     alerts.filter((a) => a.type === t && a.severity === 'Alta').length,
    Moderado: alerts.filter((a) => a.type === t && a.severity === 'Moderado').length,
    Leve:     alerts.filter((a) => a.type === t && a.severity === 'Leve').length,
  })).filter((d) => d.Alta + d.Moderado + d.Leve > 0);

  const alertsByType = {
    date:         alerts.filter((a) => a.type === 'Data'),
    null_:        alerts.filter((a) => a.type === 'Nulidade'),
    geo:          alerts.filter((a) => a.type === 'Localização'),
    outlierArea:  alerts.filter((a) => a.type === 'Outlier M²'),
    outlierPrice: alerts.filter((a) => a.type === 'Outlier Preço'),
  };

  const bboxAvailable = !!CITY_BBOX[selectedCityName];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Cabeçalho */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Database className="h-3.5 w-3.5" />
            <span>Testes de Qualidade / CID / Validação de Base</span>
          </div>
          <h1 className="text-lg font-semibold">Validação de Base de Dados — CID</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Detecta e classifica inconsistências na base CID via API Geobrain. Para cada cidade monitorada,
            verifica outliers por Padrão de imóvel, consistência de datas, localização geográfica e campos nulos.
            Os resultados alimentam o relatório de alertas consolidado ao final.
          </p>
        </div>

        <hr className="border-border" />

        {/* Auth gate */}
        {!hasToken && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Autentique-se no painel lateral para executar a validação.
          </div>
        )}

        {/* Seletor UF + cidade + botão */}
        {hasToken && (
          <div className="flex items-end gap-3 flex-wrap">
            <GeoApiScopeSelector
              value={scope}
              onChange={(next) => { setScope(next); setRan(false); }}
              disabled={running}
              className="flex-1 min-w-[280px]"
            />

            <button
              type="button"
              onClick={run}
              disabled={running || !canRun}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors h-9 shrink-0"
            >
              {running
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Play className="h-4 w-4" />
              }
              {running ? 'Validando…' : 'Executar'}
            </button>
          </div>
        )}

        {/* Tipos de empreendimento */}
        {hasToken && (
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">Tipos</span>
            {ALL_BUILDING_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(t)}
                  onChange={() => toggleType(t)}
                  disabled={running}
                  className="accent-primary h-3.5 w-3.5"
                />
                <span className="text-sm text-muted-foreground">{t}</span>
              </label>
            ))}
          </div>
        )}

        {/* Carregamento inline */}
        {running && (
          <LoadingBlock
            displayPct={displayPct}
            done={fetchProg.done}
            total={fetchProg.total}
            failed={fetchProg.failed}
            phase={phase}
            onAbort={() => { abortRef.current?.abort(); setRunning(false); setPhase(''); }}
          />
        )}

        {/* Erro */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <X className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Resultados ── */}
        {ran && (
          <>
            {/* Seção 1 — Visão Geral */}
            <SectionCard
              title="Visão Geral da Base"
              icon={<Database className="h-4 w-4" />}
              badge={`${uniqueBuildings} empreend. · ${rows.length} tipologias`}
              badgeSeverity="ok"
              defaultOpen
            >
              <div className="grid grid-cols-2 gap-x-10">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Volume</p>
                  <StatRow label="Empreendimentos" value={uniqueBuildings} />
                  <StatRow label="Tipologias" value={rows.length} />
                  <StatRow label="Padrões distintos" value={new Set(rows.map((r) => r.standard)).size} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Campos nulos</p>
                  <StatRow label="M² Privativo" value={nullArea} sub={`(${pct(nullArea, rows.length)} tipol.)`} />
                  <StatRow label="Preço" value={nullPrice} sub={`(${pct(nullPrice, rows.length)} tipol.)`} />
                  <StatRow label="Data de Lançamento" value={nullRelD} sub="empreend." />
                  <StatRow label="Data de Entrega" value={nullDelD} sub="empreend." />
                  <StatRow label="Lat/Lon" value={nullGeo} sub="empreend." />
                </div>
              </div>
            </SectionCard>

            {/* Seção 2 — Outliers */}
            <SectionCard
              title="Outliers por Padrão"
              icon={<BarChart2 className="h-4 w-4" />}
              badge={`${alertsByType.outlierArea.length + alertsByType.outlierPrice.length} alertas`}
              badgeSeverity={alertsByType.outlierArea.length + alertsByType.outlierPrice.length > 0 ? 'warn' : 'ok'}
            >
              <p className="text-xs text-muted-foreground">
                Método IQR por Padrão — alerta quando valor &lt; Q1 − 1,5×IQR ou &gt; Q3 + 1,5×IQR.
                Cor indica distância σ ao limite:{' '}
                <span style={{ color: SIGMA_COLOR.normal }}>■ Normal</span>{' '}
                <span style={{ color: SIGMA_COLOR.Leve }}>■ Leve (≤1σ)</span>{' '}
                <span style={{ color: SIGMA_COLOR.Moderado }}>■ Moderado (1–2σ)</span>{' '}
                <span style={{ color: SIGMA_COLOR.Alta }}>■ Grave (&gt;2σ)</span>.
                Clique em uma barra para detalhar os empreendimentos.
              </p>
              {outlierStats.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Nenhum outlier detectado nos Padrões presentes.
                </div>
              ) : (
                <div className="space-y-6">
                  {outlierStats.map((stat) => (
                    <div key={`${stat.standard}-${stat.field}`} className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {stat.standard} — {stat.field === 'private_area' ? 'M² Privativo' : 'Preço'}
                        <span className="ml-2 font-normal normal-case">
                          IQR [{stat.field === 'private_area' ? fmtNum(stat.lo, 0) : fmtBRL(stat.lo)}, {stat.field === 'private_area' ? fmtNum(stat.hi, 0) : fmtBRL(stat.hi)}]
                        </span>
                      </p>
                      <OutlierHistogram stats={stat} />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Seção 3 — Datas */}
            <SectionCard
              title="Consistência de Datas"
              icon={<Calendar className="h-4 w-4" />}
              badge={`${alertsByType.date.length + alertsByType.null_.length} alertas`}
              badgeSeverity={alertsByType.date.length + alertsByType.null_.length > 0 ? 'error' : 'ok'}
            >
              <p className="text-xs text-muted-foreground">
                Verifica: (1) Data de Entrega posterior ao Lançamento; (2) ambas as datas presentes.
                Inconsistências de data são <strong>Alta severidade</strong> — afetam análises temporais e relatórios de cliente.
              </p>
              {alertsByType.date.length + alertsByType.null_.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Datas consistentes em todos os empreendimentos.
                </div>
              ) : (
                <AlertTable rows={[...alertsByType.date, ...alertsByType.null_]} showType />
              )}
            </SectionCard>

            {/* Seção 4 — Localização */}
            <SectionCard
              title="Validação Geográfica"
              icon={<MapPin className="h-4 w-4" />}
              badge={`${alertsByType.geo.length} alertas`}
              badgeSeverity={alertsByType.geo.length > 0 ? 'error' : 'ok'}
            >
              {bboxAvailable ? (
                <p className="text-xs text-muted-foreground">
                  Bounding box cadastrado para {selectedCityName}:{' '}
                  lat [{CITY_BBOX[selectedCityName].LAT_MIN}, {CITY_BBOX[selectedCityName].LAT_MAX}] ·
                  lon [{CITY_BBOX[selectedCityName].LON_MIN}, {CITY_BBOX[selectedCityName].LON_MAX}].
                  Empreendimentos fora desse intervalo são sinalizados como Alta severidade.
                </p>
              ) : (
                <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-500/5 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Bounding box não cadastrado para <strong>{selectedCityName}</strong>.
                    Apenas nulidade de lat/lon é verificada. Para adicionar o limite geográfico,
                    inclua a cidade no dicionário <code>CITY_BBOX</code> em <code>TQCidValidacaoBase.tsx</code>.
                  </span>
                </div>
              )}
              {alertsByType.geo.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Nenhum erro de localização detectado.
                </div>
              ) : (
                <AlertTable rows={alertsByType.geo} />
              )}
            </SectionCard>

            {/* Seção 5 — Relatório de Alertas */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-card border-b border-border flex items-center gap-2">
                <AlertTriangle className={cn('h-4 w-4 shrink-0', alerts.some((a) => a.severity === 'Alta') ? 'text-destructive' : 'text-muted-foreground')} />
                <span className="font-medium text-sm flex-1">Relatório de Alertas Consolidado</span>
                {alerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Exportar PDF
                  </button>
                )}
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  alerts.length === 0
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : alerts.some((a) => a.severity === 'Alta')
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-yellow-500/10 text-yellow-700',
                )}>
                  {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
                </span>
              </div>

              <div className="px-4 py-4 space-y-4">
                {alerts.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-400 py-6">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Nenhum alerta encontrado. Base consistente para {selectedCityName}.</span>
                  </div>
                ) : (
                  <>
                    {/* Gráfico resumo */}
                    {chartData.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Distribuição por tipo e severidade</p>
                        <div className="h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartData}
                              layout="vertical"
                              margin={{ left: 80, right: 24, top: 2, bottom: 2 }}
                            >
                              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={78} />
                              <Tooltip contentStyle={{ fontSize: 11 }} cursor={{ fill: 'hsl(var(--muted))' }} />
                              <Bar dataKey="Alta" stackId="s" fill={SIGMA_COLOR.Alta} />
                              <Bar dataKey="Moderado" stackId="s" fill={SIGMA_COLOR.Moderado} />
                              <Bar dataKey="Leve" stackId="s" fill={SIGMA_COLOR.Leve} radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    <AlertTable rows={alerts} showType />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
