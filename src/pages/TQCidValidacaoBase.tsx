import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Database,
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
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

const BASE_URL = 'https://geobrain.com.br/public-api';

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

interface RawTypology {
  id?: string | number;
  number_bedroom?: string | number | null;
  private_area?: number | string | null;
  price?: number | string | null;
  stock?: number | string | null;
  sold?: number | string | null;
  [key: string]: unknown;
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
  typologies?: RawTypology[];
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

type AlertSeverity = 'Alta' | 'Média' | 'Baixa';
type AlertType = 'Data' | 'Localização' | 'Outlier M²' | 'Outlier Preço' | 'Nulidade';

interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  building_id: string;
  name: string;
  standard: string;
  detail: string;
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

function calcIQR(values: number[]): { lo: number; hi: number } | null {
  if (values.length < 4) return null;
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  const q1 = s[Math.floor(n * 0.25)];
  const q3 = s[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  return { lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  const sev = {
    Alta:  'bg-destructive/10 text-destructive',
    Média: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    Baixa: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
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

  // Record<UF, city[]> — populado paginando /monitored-cities
  const [citiesByUf, setCitiesByUf] = useState<Record<string, string[]> | null>(null);
  const [selectedUf, setSelectedUf] = useState('');
  const [selectedCityName, setSelectedCityName] = useState('');
  const [cityOpen, setCityOpen] = useState(false);

  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const [rows, setRows] = useState<FlatRow[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ran, setRan] = useState(false);

  // Carrega todas as páginas de /monitored-cities seguindo links.next
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetchAll() {
      const byUf: Record<string, Set<string>> = {};
      let nextUrl: string | null = `${BASE_URL}/monitored-cities`;

      while (nextUrl) {
        const res = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        for (const item of (data.data ?? []) as MonitoredCity[]) {
          const uf = String(item.state ?? '').toUpperCase();
          const city = String(item.city ?? '');
          if (!uf || !city) continue;
          if (!byUf[uf]) byUf[uf] = new Set();
          byUf[uf].add(city);
        }
        nextUrl = (data.links?.next as string | null) ?? null;
      }

      if (cancelled) return;
      const result: Record<string, string[]> = {};
      for (const [uf, set] of Object.entries(byUf)) result[uf] = [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      setCitiesByUf(result);
    }

    fetchAll().catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  const availableUfs = citiesByUf ? Object.keys(citiesByUf).sort() : [];
  const availableCities = (citiesByUf && selectedUf) ? (citiesByUf[selectedUf] ?? []) : [];
  const canRun = !!selectedUf && !!selectedCityName;

  const run = useCallback(async () => {
    if (!token || !selectedUf || !selectedCityName) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setRunning(true);
    setError('');
    setRan(false);
    setRows([]);
    setAlerts([]);

    try {
      // ── 1. Fetch paginado ─────────────────────────────────────────────────
      const allBuildings: RawBuilding[] = [];
      let page = 1;
      let lastPage = 1;

      do {
        setPhase(`Buscando empreendimentos… página ${page}${lastPage > 1 ? `/${lastPage}` : ''}`);
        const { data, error: err } = await apiGet(
          '/building-with-history',
          { city: selectedCityName, uf: selectedUf, per_page: 100, page },
          token,
          ctrl.signal,
        );
        if (ctrl.signal.aborted) return;
        if (err || !data) { setError(`Erro na API: ${err}`); return; }
        const d = data as Record<string, unknown>;
        const items = (d.data as RawBuilding[]) ?? [];
        const meta = (d.meta as Record<string, unknown>) ?? {};
        lastPage = (meta.last_page as number) ?? 1;
        allBuildings.push(...items);
        page++;
      } while (page <= lastPage);

      // ── 2. Flatten tipologias ─────────────────────────────────────────────
      setPhase('Processando tipologias…');
      const flat: FlatRow[] = [];

      for (const b of allBuildings) {
        // release_price: pegar do período mais antigo no histórico por typology_id
        const rpMap: Record<string, number | null> = {};
        for (const h of b.typologies_history ?? []) {
          const tid = String(h.typology_id ?? '');
          const rp = toNum(h.release_price);
          if (tid && rp !== null && !(tid in rpMap)) rpMap[tid] = rp;
        }

        for (const t of b.typologies ?? []) {
          const tid = String(t.id ?? '');
          flat.push({
            building_id: String(b.building_id ?? ''),
            name: b.name ?? '—',
            standard: b.standard ?? '—',
            latitude: toNum(b.latitude),
            longitude: toNum(b.longitude),
            release_date: b.release_date ?? null,
            delivery_date: b.delivery_date ?? null,
            typology_id: tid,
            private_area: toNum(t.private_area),
            price: toNum(t.price),
            release_price: rpMap[tid] ?? null,
          });
        }
      }

      const newAlerts: Alert[] = [];

      // ── 3. Outliers IQR por Padrão ────────────────────────────────────────
      setPhase('Detectando outliers por Padrão…');
      const standards = [...new Set(flat.map((r) => r.standard))];

      for (const std of standards) {
        const group = flat.filter((r) => r.standard === std);

        for (const field of ['private_area', 'price'] as const) {
          const vals = group.map((r) => r[field]).filter((v): v is number => v !== null);
          const iqr = calcIQR(vals);
          if (!iqr) continue;

          for (const row of group) {
            const v = row[field];
            if (v === null || (v >= iqr.lo && v <= iqr.hi)) continue;
            const isArea = field === 'private_area';
            newAlerts.push({
              type: isArea ? 'Outlier M²' : 'Outlier Preço',
              severity: 'Média',
              building_id: row.building_id,
              name: row.name,
              standard: std,
              detail: isArea
                ? `M²: ${fmtNum(v)} — limite [${fmtNum(iqr.lo)}, ${fmtNum(iqr.hi)}] m²`
                : `Preço: ${fmtBRL(v)} — limite [${fmtBRL(iqr.lo)}, ${fmtBRL(iqr.hi)}]`,
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
      setRan(true);
      setPhase('');
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [token, selectedUf, selectedCityName]);

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
    name: t,
    Alta:  alerts.filter((a) => a.type === t && a.severity === 'Alta').length,
    Média: alerts.filter((a) => a.type === t && a.severity === 'Média').length,
  })).filter((d) => d.Alta + d.Média > 0);

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
            {/* UF */}
            <div className="space-y-1.5 w-24 shrink-0">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">UF</label>
              <Select
                value={selectedUf}
                onValueChange={(v) => { setSelectedUf(v); setSelectedCityName(''); setRan(false); }}
                disabled={running || !citiesByUf}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={citiesByUf ? 'UF' : '…'} />
                </SelectTrigger>
                <SelectContent>
                  {availableUfs.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Município com busca */}
            <div className="flex-1 min-w-[180px] space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Município</label>
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={running || !selectedUf}
                    className="h-9 w-full justify-between text-sm font-normal px-3"
                  >
                    <span className="truncate">
                      {selectedCityName || (selectedUf ? 'Selecione o município' : 'Selecione a UF primeiro')}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar município…" className="h-9 text-sm" />
                    <CommandList>
                      <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                        Nenhum município encontrado.
                      </CommandEmpty>
                      <CommandGroup>
                        {availableCities.map((c) => (
                          <CommandItem
                            key={c}
                            value={c}
                            onSelect={() => { setSelectedCityName(c); setCityOpen(false); setRan(false); }}
                            className="text-sm"
                          >
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Botão */}
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

        {/* Progresso */}
        {running && phase && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{phase}</span>
          </div>
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
                Campos verificados: <strong>M² Privativo</strong> e <strong>Preço</strong> por tipologia.
                Outliers de severidade Média: podem ser dados legítimos (produto premium) — exigem verificação manual.
              </p>
              {alertsByType.outlierArea.length + alertsByType.outlierPrice.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Nenhum outlier detectado nos Padrões presentes.
                </div>
              ) : (
                <AlertTable rows={[...alertsByType.outlierArea, ...alertsByType.outlierPrice]} showType />
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
                              <Bar dataKey="Alta" stackId="s" fill="hsl(var(--destructive))" />
                              <Bar dataKey="Média" stackId="s" fill="#f59e0b" radius={[0, 4, 4, 0]} />
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
