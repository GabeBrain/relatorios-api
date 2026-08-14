Exit code: 0
Wall time: 2.5 seconds
Total output lines: 1268
Output:
import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Play, Building2, X, HelpCircle, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Tooltip as UITooltip,
  TooltipContent as UITooltipContent,
  TooltipProvider as UITooltipProvider,
  TooltipTrigger as UITooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import brainLogo from '../../assets/logoBrain.png';
import MUNICIPIOS_BR from '@/assets/municipios-br.json';
import { GeoApiScopeSelector } from '@/features/shared/geo-api-scope-engine';
import { aggregateTypologyHistoryByQuarter, filterHistoryThroughQuarter, periodToQuarter } from '@/features/relatorios-secovi/quarterly-history';

const UF_LIST = Object.keys(MUNICIPIOS_BR as Record<string, string[]>).sort();

const BASE_URL = 'https://geobrain.com.br/public-api';
const ALL_BUILDING_TYPES = ['Vertical', 'Horizontal', 'Comercial', 'Hotel'];
const ALL_STATUSES = ['Ativo', 'Esgotado'];
const PREVIEW_PER_PAGE = 100;
const DETAIL_CONCURRENCY = 8;
const ESTIMATED_SECONDS_PER_DETAIL = 0.7;

type Row = Record<string, string | number | null>;

const HEADER_COLS = [
  'Tipo', 'Tempo de vendas', 'Empreendimentos', 'Logradouro', 'NÃºmero', 'Bairro', 'Cidade/UF',
  'Incorporadora', 'PadrÃ£o', 'LanÃ§amento', 'ANO', 'Entrega',
  'Tipo de Tipologia', 'Dorm.', 'PreÃ§o de lanÃ§amento', 'PreÃ§o atual',
  'm2 Priv.', 'Valor m2 Priv.', 'Unidades por Tipologia',
  'Taxa administrativa', 'Oferta por lotes', 'Entrada', 'Nº de Parcelas',
  '% de Juros Mensal', 'Indíce de Juros', 'Desconto à Vista',
  '*Vendidos no trimestre', '*Distratos no trimestre',
];

const FOOTER_COLS = [
  'Estoque por Tipologia', '% Dispon.', 'Vagas de Garagem',
  'VGV Estoque', 'mÂ² Estoque', 'R$/mÂ²\nEstoque',
  'VGV LanÃ§ado', 'mÂ² LanÃ§ado', 'R$/mÂ² LanÃ§ado',
  'VGV Vendas Brutas', 'VGV Distratos', 'Vendas LÃ­quidas',
];

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function availableQuarters(yearStart = 2021): string[] {
  const now = new Date();
  const maxQ = Math.floor(now.getMonth() / 3) + 1;
  const qs: string[] = [];
  for (let year = yearStart; year <= now.getFullYear(); year++) {
    const lastQ = year === now.getFullYear() ? maxQ : 4;
    for (let q = 1; q <= lastQ; q++) qs.push(`${q}T${year}`);
  }
  return qs;
}

function qKey(q: string): [number, number] {
  try { return [parseInt(q.slice(2)), parseInt(q[0])]; } catch { return [0, 0]; }
}
function qLabel(q: string): string { return `${q.slice(0, 2)} ${q.slice(2)}`; }
function qSheet(q: string): string { return `${q[0]}T${q.slice(4)}`; }

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const f = parseFloat(String(v));
  return Number.isFinite(f) ? f : null;
}

function salesTimeSegment(value: unknown): string {
  const months = toNum(value);
  if (months === null) return '';
  if (months <= 6) return 'Até 6 Meses';
  if (months <= 24) return 'De 7 a 24 Meses';
  if (months <= 48) return 'De 25 a 48 Meses';
  return 'Acima de 49 Meses';
}

function extractYear(dateStr: string): string | null {
  const parts = dateStr.replace(/-/g, '/').split('/').reverse();
  return parts.find((p) => p.length === 4 && /^\d+$/.test(p)) ?? null;
}

function sortableDate(dateStr: string): string {
  const s = String(dateStr ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

const TYPE_ORDER: Record<string, number> = { Vertical: 0, Horizontal: 1, Comercial: 2, Hotel: 3 };

const COLUMN_NOTES: Record<string, string> = {
  '*Distratos no trimestre':
    'Estimativa calculada via equaÃ§Ã£o de estoque: Distratos(t) = Estoque(t) âˆ’ Estoque(tâˆ’1) + Vendas brutas(t). ' +
    'Pode apresentar valores inconsistentes em perÃ­odos com adiÃ§Ã£o de novas unidades Ã  tipologia (lanÃ§amentos parciais). ' +
    'Dado nÃ£o disponÃ­vel diretamente na API Geobrain.',
};
const NOTE_VENDAS_LIQUIDAS =
  'Fonte: campo "sold_in_period" da API Geobrain â€” unidades vendidas no perÃ­odo (vendas brutas). ' +
  'O dado de distratos nÃ£o estÃ¡ disponÃ­vel na API, portanto nÃ£o Ã© possÃ­vel calcular vendas lÃ­quidas reais. ' +
  'A coluna de distratos Ã© preenchida por estimativa via variaÃ§Ã£o de estoque.';

function compareTuple(a: [number, number], b: [number, number]): number {
  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
}

// â”€â”€ API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function apiGet(
  path: string,
  params: Record<string, unknown>,
  token: string,
  signal?: AbortSignal,
): Promise<{ data: unknown; status: number | null; error: string }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') qs.set(k, String(v));
  }
  const url = `${BASE_URL}${path}${qs.toString() ? `?${qs}` : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    try { return { data: await res.json(), status: res.status, error: '' }; }
    catch { return { data: null, status: res.status, error: 'Resposta nÃ£o Ã© JSON' }; }
  } catch (err) {
    clearTimeout(timer);
    return { data: null, status: null, error: err instanceof Error ? err.message : String(err) };
  }
}

function hasPeriodInRange(building: Record<string, unknown>, startQ: string, endQ: string): boolean {
  const startKey = qKey(startQ);
  const endKey = qKey(endQ);
  const history = (building.typologies_history as unknown[]) ?? [];
  return history.some((e) => {
    const q = periodToQuarter(((e as Record<string, unknown>).period as string) ?? '');
    return q && compareTuple(qKey(q), startKey) >= 0 && compareTuple(qKey(q), endKey) <= 0;
  });
}

interface LaneResult {
  allIds: number[];
  eligibleIds: number[];
  isActiveStatus: boolean;
  eligibleActiveIds: number[];
  eligibleInactiveIds: number[];
  failedCalls: number;
}

interface LiveStats {
  pagesTotal: number;
  pagesDone: number;
  totalFound: number;
  eligibleFound: number;
  activeFound: number;
  inactiveFound: number;
  failedCalls: number;
}

async function fetchLane(
  status: string,
  btype: string,
  city: string,
  uf: string,
  startQ: string,
  endQ: string,
  token: string,
  signal: AbortSignal,
  onPage: (delta: Partial<LiveStats>) => void,
): Promise<LaneResult> {
  const allIds: number[] = [];
  const eligibleIds: number[] = [];
  const eligibleActiveIds: number[] = [];
  const eligibleInactiveIds: number[] = [];
  const allSeen = new Set<number>();
  const eligibleSeen = new Set<number>();
  let failedCalls = 0;
  let page = 1;

  while (true) {
    if (signal.aborted) break;

    const params: Record<string, unknown> = { type: btype, city, status, per_page: PREVIEW_PER_PAGE, page };
    if (uf) params['uf'] = uf;

    const { data, error } = await apiGet('/building-with-history', params, token, signal);

    if (signal.aborted) break;
    if (error || typeof data !== 'object' || data === null) {
      failedCalls++;
      onPage({ failedCalls: 1, pagesDone: 1 });
      break;
    }

    const d = data as Record<string, unknown>;
    const items = (d.data as unknown[]) ?? [];
    const meta = (d.meta as Record<string, unknown>) ?? {};
    const lastPage = (meta.last_page as number) ?? 1;

    let newAllIds = 0; let newEligible = 0; let newActive = 0; let newInactive = 0;

    for (const item of items) {
      const it = item as Record<string, unknown>;
      const bid = it.building_id as number;
      if (bid === null || bid === undefined) continue;

      if (!allSeen.has(bid)) { allSeen.add(bid); allIds.push(bid); newAllIds++; }

      if (!hasPeriodInRange(it, startQ, endQ)) continue;
      if (!eligibleSeen.has(bid)) {
        eligibleSeen.add(bid);
        eligibleIds.push(bid);
        newEligible++;
        const itStatus = ((it.status as string) ?? status).trim();
        if (itStatus === 'Ativo') { eligibleActiveIds.push(bid); newActive++; }
        else { eligibleInactiveIds.push(bid); newInactive++; }
      }
    }

    onPage({ pagesTotal: page === 1 ? lastPage : 0, pagesDone: 1, totalFound: newAllIds, eligibleFound: newEligible, activeFound: newActive, inactiveFound: newInactive });

    if (page >= lastPage) break;
    page++;
  }

  return { allIds, eligibleIds, isActiveStatus: status === 'Ativo', eligibleActiveIds, eligibleInactiveIds, failedCalls };
}

interface PreviewResult {
  totalCity: number; eligibleTotal: number; eligibleActive: number; eligibleInactive: number;
  eligibleIds: number[]; activeIds: number[]; inactiveIds: number[];
  failedCalls: number; etaSeconds: number;
}

async function collectPreview(
  city: string, uf: string, types: string[], statuses: string[], startQ: string, endQ: string,
  token: string, signal: AbortSignal, onLiveStats: (stats: LiveStats) => void,
): Promise<PreviewResult> {
  const pairs = statuses.flatMap((s) => types.map((t) => ({ status: s, type: t })));
  const live: LiveStats = { pagesTotal: 0, pagesDone: 0, totalFound: 0, eligibleFound: 0, activeFound: 0, inactiveFound: 0, failedCalls: 0 };

  function applyDelta(delta: Partial<LiveStats>) {
    for (const [k, v] of Object.entries(delta) as [keyof LiveStats, number][]) {
      live[k] = (live[k] ?? 0) + v;
    }
    onLiveStats({ ...live });
  }

  const settled = await Promise.allSettled(
    pairs.map(({ status, type }) => fetchLane(status, type, city, uf, startQ, endQ, token, signal, applyDelta))
  );

  const allSeen = new Set<number>(); const eligibleSeen = new Set<number>();
  const activeSeen = new Set<number>(); const inactiveSeen = new Set<number>();
  const allIds: number[] = []; const eligibleIds: number[] = [];
  const activeIds: number[] = []; const inactiveIds: number[] = [];
  let failedCalls = 0;

  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    const lane = r.value;
    failedCalls += lane.failedCalls;
    for (const id of lane.allIds) { if (!allSeen.has(id)) { allSeen.add(id); allIds.push(id); } }
    for (const id of lane.eligibleIds) { if (!eligibleSeen.has(id)) { eligibleSeen.add(id); eligibleIds.push(id); } }
    for (const id of lane.eligibleActiveIds) { if (!activeSeen.has(id)) { activeSeen.add(id); activeIds.push(id); } }
    for (const id of lane.eligibleInactiveIds) { if (!inactiveSeen.has(id)) { inactiveSeen.add(id); inactiveIds.push(id); } }
  }

  return {
    totalCity: allIds.length, eligibleTotal: eligibleIds.length,
    eligibleActive: activeIds.length, eligibleInactive: inactiveIds.length,
    eligibleIds, activeIds, inactiveIds, failedCalls,
    etaSeconds: eligibleIds.length * ESTIMATED_SECONDS_PER_DETAIL / DETAIL_CONCURRENCY,
  };
}

async function fetchDetail(bid: number, token: string, signal?: AbortSignal): Promise<Record<string, unknown> | null> {
  const { data } = await apiGet(`/building-with-history/${bid}`, {}, token, signal);
  if (typeof data === 'object' && data !== null && 'data' in (data as object)) {
    return (data as Record<string, unknown>).data as Record<string, unknown>;
  }
  return null;
}

async function fetchDetailsParallel(
  ids: number[], token: string,
  onProgress: (done: number, total: number, failed: number) => void,
  signal: AbortSignal,
): Promise<{ details: Map<number, Record<string, unknown>>; failed: number }> {
  const details = new Map<number, Record<string, unknown>>();
  let done = 0; let failed = 0;
  const total = ids.length;

  for (let i = 0; i < total; i += DETAIL_CONCURRENCY) {
    if (signal.aborted) break;
    const batch = ids.slice(i, i + DETAIL_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((bid) => fetchDetail(bid, token, signal)));
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) details.set(batch[idx], r.value);
      else failed++;
      done++;
    });
    onProgress(done, total, failed);
  }

  return { details, failed };
}

// â”€â”€ data processing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function deriveQuarters(buildings: Record<string, unknown>[]): string[] {
  const qs = new Set<string>();
  for (const b of buildings) {
    for (const e of ((b.typologies_history as unknown[]) ?? [])) {
      const q = periodToQuarter(((e as Record<string, unknown>).period as string) ?? '');
      if (q) qs.add(q);
    }
  }
  return [...qs].sort((a, b) => compareTuple(qKey(a), qKey(b)));
}

function buildRows(buildings: Record<string, unknown>[], quarterCols: string[], endQ: string): Row[] {
  const rows: Row[] = [];

  for (const b of buildings) {
    const incs = (b.incorporators as Record<string, unknown>[]) ?? [];
    const incorporadora = incs.length > 0 ? String(incs[0].name ?? '') : '';
    const cityUf = `${b.city ?? ''}/${b.state ?? ''}`;
    const typoMap = new Map<number, Record<string, unknown>[]>();
    for (const e of ((b.typologies_history as unknown[]) ?? [])) {
      const entry = e as Record<string, unknown>;
      const tid = entry.typology_id as number;
      if (tid !== null && tid !== undefined) {
        if (!typoMap.has(tid)) typoMap.set(tid, []);
        typoMap.get(tid)!.push(entry);
      }
    }

    for (const [, entries] of typoMap) {
      entries.sort((a, b) => String(a.period ?? '').localeCompare(String(b.period ?? '')));
      const entriesThroughEnd = filterHistoryThroughQuarter(entries, endQ);
      if (entriesThroughEnd.length === 0) continue;
      const quarterlyHistory = aggregateTypologyHistoryByQuarter(entriesThroughEnd);
      const first = entriesThroughEnd[0];
      const [, lastQuarter] = [...quarterlyHistory.entries()].at(-1) ?? [];
      const last = lastQuarter?.lastEntry ?? entriesThroughEnd[entriesThroughEnd.length - 1];
      const qty = toNum(last.qty) ?? toNum(first.qty) ?? 0;
      const privArea = toNum(last.private_area) ?? 0;
      const launchPrice = toNum(first.release_price) ?? 0;
      const stockRaw = toNum(last.typology_stock);
      const stock = stockRaw !== null ? stockRaw : 0;

      const vendidosUltimoT = lastQuarter?.hasSalesData ? lastQuarter.sales : null;
      const distratosUltimoT = lastQuarter?.estimatedCancellations ?? null;

      const pctDisp = qty ? Math.round((stock / qty) * 1000) / 10 : null;
      const vgvLancado = qty && launchPrice ? Math.round(qty * launchPrice * 100) / 100 : null;
      const m2Lancado = privArea && qty ? Math.round(privArea * qty * 100) / 100 : null;
      const r_m2_lancado = launchPrice && privArea ? Math.round((launchPrice / privArea) * 10000) / 10000 : null;
      const vgvEstoque = toNum(last.vgv_stock);
      const m2Estoque = privArea > 0 ? Math.round(privArea * stock * 100) / 100 : 0;
      // BM = BK / BL
      const r_m2_estoque = (vgvEstoque !== null && m2Estoque > 0)
        ? Math.round((vgvEstoque / m2Estoque) * 100) / 100
        : 0;
      // VGV de vendas Ã© fluxo: soma venda Ã— preÃ§o de cada fechamento do trimestre.
      const vgvVendasBrutas = lastQuarter?.grossSalesVgv === null || !lastQuarter
        ? null
        : Math.round(lastQuarter.grossSalesVgv * 100) / 100;
      // BR = O Ã— T â€” Distratos indisponÃ­vel na API
      const vgvDistratos = 0;
      const vendasLiqVgv = vgvVendasBrutas === null
        ? null
        : Math.round((vgvVendasBrutas - vgvDistratos) * 100) / 100;

      const row: Row = {
        'Tipo': b.building_type as string ?? '',
        'Tempo de vendas': salesTimeSegment(last.time_on_sales ?? b.time_on_sales),
        'Empreendimentos': b.name as string ?? '',
        'Logradouro': b.address as string ?? '',
        'NÃºmero': b.address_number as string ?? '',
        'Bairro': b.neighborhood as string ?? '',
        'Cidade/UF': cityUf,
        'Incorporadora': incorporadora,
        'PadrÃ£o': b.standard as string ?? '',
        'LanÃ§amento': b.release_date as string ?? '',
        'ANO': extractYear(String(b.release_date ?? '')),
        'Entrega': b.delivery_date as string ?? '',
        'Tipo de Tipologia': last.type_of_typology as string ?? '',
        'Dorm.': toNum(last.number_bedroom),
        'PreÃ§o de lanÃ§amento': launchPrice || null,
        'PreÃ§o atual': toNum(last.price),
        'm2 Priv.': privArea || null,
        'Valor m2 Priv.': toNum(last.price_private_area),
        'Unidades por Tipologia': qty || null,
        'Taxa administrativa': toNum(last.taxa_associativa),
        'Oferta por lotes': toNum(last.qty),
        'Entrada': toNum(b.down_payment_percentage),
        'Nº de Parcelas': toNum(b.number_of_installments),
        '% de Juros Mensal': toNum(b.interest_rate_tax),
        'Indíce de Juros': b.interest_rate_index as string ?? '',
        'Desconto à Vista': toNum(b.discount_percentage),
        '*Vendidos no trimestre': vendidosUltimoT,
        '*Distratos no trimestre': distratosUltimoT,
      };

      for (const q of quarterCols) {
        const quarter = quarterlyHistory.get(q);
        row[`Vendas lÃ­quidas ${q}`] = quarter?.hasSalesData ? quarter.sales : 0;
      }

      Object.assign(row, {
        'Estoque por Tipologia': stock,
        '% Dispon.': pctDisp,
        'Vagas de Garagem': toNum(last.garage),
        'VGV Estoque': vgvEstoque,
        'mÂ² Estoque': m2Estoque,
        'R$/mÂ²\nEstoque': r_m2_estoque,
        'VGV LanÃ§ado': vgvLancado,
        'mÂ² LanÃ§ado': m2Lancado,
        'R$/mÂ² LanÃ§ado': r_m2_lancado,
        'VGV Vendas Brutas': vgvVendasBrutas,
        'VGV Distratos': vgvDistratos,
        'Vendas LÃ­quidas': vendasLiqVgv,
      });

      rows.push(row);
    }
  }

  rows.sort((a, b) => {
    const ta = TYPE_ORDER[String(a['Tipo'] ?? '')] ?? 99;
    const tb = TYPE_ORDER[String(b['Tipo'] ?? '')] ?? 99;
    if (ta !== tb) return ta - tb;
    const da = sortableDate(String(a['LanÃ§amento'] ?? ''));
    const db = sortableDate(String(b['LanÃ…4426 tokens truncated…€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function RelatorioAelo() {
  const { getToken, hasValidToken } = useAuthStore();

  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Vertical']);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Ativo', 'Esgotado']);
  const [startQ, setStartQ] = useState('1T2021');
  const [endQ, setEndQ] = useState(() => availableQuarters(2021).at(-1) ?? '1T2021');

  const [phase, setPhase] = useState<'idle' | 'preview' | 'fetching'>('idle');
  const [previewPct, setPreviewPct] = useState(0);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressFailed, setProgressFailed] = useState(0);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<{
    activeRows: Row[]; inactiveRows: Row[]; quarterCols: string[];
    city: string; lastQ: string; startQ: string; nBuildings: number;
    allBuildings: Record<string, unknown>[];
  } | null>(null);

  const [displayPreviewPct, setDisplayPreviewPct] = useState(0);
  const [displayFetchPct, setDisplayFetchPct] = useState(0);
  const targetPreviewRef = useRef(0);
  const targetFetchRef = useRef(0);

  targetPreviewRef.current = previewPct;
  targetFetchRef.current = progressTotal > 0 ? (progressDone / progressTotal) * 100 : 0;

  useEffect(() => {
    if (phase !== 'preview') { setDisplayPreviewPct(0); return; }
    const id = setInterval(() => {
      setDisplayPreviewPct((prev) => {
        const target = targetPreviewRef.current;
        const diff = target - prev;
        if (Math.abs(diff) < 0.1) return target;
        return prev + Math.max(0.15, diff * 0.07);
      });
    }, 40);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'fetching') { setDisplayFetchPct(0); return; }
    const id = setInterval(() => {
      setDisplayFetchPct((prev) => {
        const target = targetFetchRef.current;
        const diff = target - prev;
        if (Math.abs(diff) < 0.1) return target;
        return prev + Math.max(0.15, diff * 0.07);
      });
    }, 40);
    return () => clearInterval(id);
  }, [phase]);

  // Escopo UF/cidade agora vem do padrÃ£o compartilhado GeoApiScopeEngine.
  // Ver AGENTS.md / CLAUDE.md, seÃ§Ã£o "GeoApiScopeEngine".
  const scope = { uf, city };
  const handleScopeChange = (next: { uf: string; city: string }) => {
    setUf(next.uf);
    setCity(next.city);
  };

  const previewAbortRef = useRef<AbortController | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const quarters = availableQuarters(2021);

  function toggleType(t: string) {
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }
  function toggleStatus(s: string) {
    setSelectedStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  const handlePreview = useCallback(async () => {
    if (!city.trim() || selectedTypes.length === 0 || selectedStatuses.length === 0) return;
    if (!hasValidToken()) { toast.error('Token ausente ou expirado. FaÃ§a login no menu lateral.'); return; }

    previewAbortRef.current?.abort();
    const ctrl = new AbortController();
    previewAbortRef.current = ctrl;

    setPhase('preview');
    setPreviewPct(0);
    setLiveStats(null);
    setPreview(null);
    setResult(null);

    try {
      const p = await collectPreview(
        city.trim(), uf.trim().toUpperCase(), selectedTypes, selectedStatuses,
        startQ, endQ, getToken(), ctrl.signal,
        (stats) => {
          setLiveStats({ ...stats });
          const pct = stats.pagesTotal > 0 ? Math.min(99, (stats.pagesDone / stats.pagesTotal) * 100) : 0;
          setPreviewPct(pct);
        },
      );

      if (!ctrl.signal.aborted) {
        setPreview(p);
        setPreviewPct(100);
        if (p.eligibleTotal === 0) toast.warning('Nenhum empreendimento com histÃ³rico no perÃ­odo.');
        else toast.success(`PrÃ©via: ${p.eligibleTotal} empreendimentos encontrados.`);
      }
    } catch (err) {
      if (!ctrl.signal.aborted) toast.error(`Erro na prÃ©via: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPhase('idle');
    }
  }, [city, uf, selectedTypes, selectedStatuses, startQ, endQ, getToken, hasValidToken]);

  const handleAbortPreview = useCallback(() => {
    previewAbortRef.current?.abort();
    setPhase('idle');
    toast.info('PrÃ©via cancelada.');
  }, []);

  const handleFetch = useCallback(async () => {
    if (!preview || preview.eligibleTotal === 0) return;
    if (!hasValidToken()) { toast.error('Token ausente ou expirado.'); return; }

    fetchAbortRef.current?.abort();
    const ctrl = new AbortController();
    fetchAbortRef.current = ctrl;

    setPhase('fetching');
    setProgressDone(0);
    setProgressTotal(preview.eligibleIds.length);
    setProgressFailed(0);
    setResult(null);

    try {
      const token = getToken();
      const { details, failed } = await fetchDetailsParallel(
        preview.eligibleIds, token,
        (done, total, fail) => { setProgressDone(done); setProgressTotal(total); setProgressFailed(fail); },
        ctrl.signal,
      );

      if (ctrl.signal.aborted) return;

      const allBuildings = [...details.values()];
      const allQuarters = deriveQuarters(allBuildings);
      const filteredQs = allQuarters.filter((q) =>
        compareTuple(qKey(q), qKey(startQ)) >= 0 && compareTuple(qKey(q), qKey(endQ)) <= 0,
      );

      if (filteredQs.length === 0) { toast.error('Nenhum trimestre vÃ¡lido no perÃ­odo.'); return; }

      const lastQ = endQ;
      const activeBuildings = preview.activeIds.map((id) => details.get(id)).filter(Boolean) as Record<string, unknown>[];
      const inactiveBuildings = preview.inactiveIds.map((id) => details.get(id)).filter(Boolean) as Record<string, unknown>[];
      const activeRows = buildRows(activeBuildings, filteredQs, endQ);
      const inactiveRows = buildRows(inactiveBuildings, filteredQs, endQ);

      setResult({ activeRows, inactiveRows, quarterCols: filteredQs, city: city.trim(), lastQ, startQ, nBuildings: details.size, allBuildings });
      const warn = failed > 0 ? ` â€” ${failed} falha(s)` : '';
      toast.success(`ConcluÃ­do: ${details.size} empreendimentos | ${qLabel(startQ)} â†’ ${qLabel(lastQ)}${warn}`);
    } catch (err) {
      if (!ctrl.signal.aborted) toast.error(`Erro na coleta: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPhase('idle');
    }
  }, [preview, city, startQ, endQ, getToken, hasValidToken]);

  const handleAbortFetch = useCallback(() => {
    fetchAbortRef.current?.abort();
    setPhase('idle');
    toast.info('Coleta cancelada.');
  }, []);

  function buildChartData(rows: Row[], field: string): { name: string; count: number }[] {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const val = String(row[field] ?? 'N/A');
      counts[val] = (counts[val] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  const loading = phase !== 'idle';

  return (
    <div className="flex flex-col h-full">
      {phase === 'fetching' && (
        <FetchingOverlay
          pct={displayFetchPct}
          done={progressDone}
          total={progressTotal}
          failed={progressFailed}
          onAbort={handleAbortFetch}
        />
      )}

      <div className="border-b border-border px-6 py-4 bg-card">
        <h1 className="text-lg font-semibold">Relatório AELO</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Gerador de relatÃ³rio Geobrain â€” coleta paralela de empreendimentos por cidade.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
          <strong>LimitaÃ§Ã£o da API:</strong> Distratos nÃ£o sÃ£o fornecidos diretamente. <code>*Distratos no trimestre</code> Ã© uma estimativa via variaÃ§Ã£o de estoque; <code>VGV Distratos</code> permanece em branco.
        </div>

        <div className="space-y-1">
          <div className="space-y-1">
            <Label className="text-xs">Escopo geogrÃ¡fico *</Label>
            <GeoApiScopeSelector value={scope} onChange={handleScopeChange} disabled={loading} />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipos de empreendimento</Label>
            <div className="flex flex-wrap gap-3">
              {ALL_BUILDING_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-xs">
                  <Checkbox checked={selectedTypes.includes(t)} onCheckedChange={() => toggleType(t)} disabled={loading} />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <div className="flex flex-wrap gap-3">
              {ALL_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer text-xs">
                  <Checkbox checked={selectedStatuses.includes(s)} onCheckedChange={() => toggleStatus(s)} disabled={loading} />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1 max-w-xl">
          <Label className="text-xs">PerÃ­odo de anÃ¡lise</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select value={startQ} onValueChange={(next) => {
              setStartQ(next);
              if (compareTuple(qKey(next), qKey(endQ)) > 0) setEndQ(next);
            }} disabled={loading}>
              <SelectTrigger className="h-8 text-xs" aria-label="InÃ­cio do perÃ­odo de anÃ¡lise"><SelectValue /></SelectTrigger>
              <SelectContent>{quarters.filter((q) => compareTuple(qKey(q), qKey(endQ)) <= 0).map((q) => <SelectItem key={q} value={q}>De: {qLabel(q)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={endQ} onValueChange={(next) => {
              setEndQ(next);
              if (compareTuple(qKey(next), qKey(startQ)) < 0) setStartQ(next);
            }} disabled={loading}>
              <SelectTrigger className="h-8 text-xs" aria-label="Fim do perÃ­odo de anÃ¡lise"><SelectValue /></SelectTrigger>
              <SelectContent>{quarters.filter((q) => compareTuple(qKey(q), qKey(startQ)) >= 0).map((q) => <SelectItem key={q} value={q}>AtÃ©: {qLabel(q)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {phase !== 'preview' ? (
            <Button onClick={handlePreview} disabled={loading || !city.trim() || selectedTypes.length === 0 || selectedStatuses.length === 0} variant="outline" className="gap-2 text-xs h-8">
              <Building2 className="h-3.5 w-3.5" />
              Calcular prÃ©via
            </Button>
          ) : (
            <Button onClick={handleAbortPreview} variant="outline" className="gap-2 text-xs h-8 border-red-500/40 text-red-500 hover:bg-red-500/10">
              <X className="h-3.5 w-3.5" />
              Cancelar prÃ©via
            </Button>
          )}

          {phase !== 'fetching' && (
            <Button onClick={handleFetch} disabled={loading || !preview || preview.eligibleTotal === 0} className="gap-2 text-xs h-8">
              <Play className="h-3.5 w-3.5" />
              Buscar empreendimentos
            </Button>
          )}

          {result && (
            <Button variant="outline" className="gap-2 text-xs h-8"
              onClick={() => exportXLSX(result.activeRows, result.inactiveRows, result.quarterCols, result.city, result.lastQ)}>
              <Download className="h-3.5 w-3.5" />
              Baixar Excel
            </Button>
          )}
        </div>

        {/* Preview loading */}
        {phase === 'preview' && (
          <div className="flex items-center gap-6 rounded-lg border border-border bg-card/60 p-4">
            <BrainLogoProgress
              pct={displayPreviewPct}
              label={liveStats ? `${liveStats.pagesDone}/${Math.max(liveStats.pagesTotal, liveStats.pagesDone)} pÃ¡g.` : 'iniciandoâ€¦'}
            />
            {liveStats && (
              <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                {[
                  { label: 'Encontrados', value: liveStats.totalFound },
                  { label: 'Com histÃ³rico', value: liveStats.eligibleFound },
                  { label: 'Ativos', value: liveStats.activeFound },
                  { label: 'Esgotados', value: liveStats.inactiveFound },
                  { label: 'Falhas', value: liveStats.failedCalls },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
                    <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-none">{value.toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview stats */}
        {preview && !result && phase === 'idle' && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              {[
                { label: 'Total na cidade', value: preview.totalCity },
                { label: 'Com histÃ³rico', value: preview.eligibleTotal },
                { label: 'Ativos', value: preview.eligibleActive },
                { label: 'Esgotados', value: preview.eligibleInactive },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
                  <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-none">{value.toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
            {preview.etaSeconds > 0 && (
              <p className="text-[11px] text-muted-foreground">
                ETA coleta: ~{Math.ceil(preview.etaSeconds)}s Â· concorrÃªncia {DETAIL_CONCURRENCY}Ã—
                {preview.failedCalls > 0 && <span className="text-amber-500 ml-2">â€” {preview.failedCalls} chamada(s) de prÃ©via falharam</span>}
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                {[
                  { label: 'Empreendimentos', value: result.nBuildings },
                  { label: 'Ativos (CONSOLIDADA)', value: result.activeRows.length },
                  { label: 'Esgotados', value: result.inactiveRows.length },
                  { label: 'Trimestres', value: result.quarterCols.length },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
                    <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-none">{value.toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">{result.city.toUpperCase()} Â· {qLabel(result.startQ)} â†’ {qLabel(result.lastQ)}</p>
            </div>

            {/* Categorical bar charts â€” single green gradient */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                { title: 'Tipo de empreendimento', field: 'Tipo' },
                { title: 'PadrÃ£o', field: 'PadrÃ£o' },
              ].map(({ title, field }) => {
                const chartData = buildChartData([...result.activeRows, ...result.inactiveRows], field);
                return (
                  <div key={field} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs font-semibold mb-2">{title}</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11 }} />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={barGreen(i, chartData.length)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>

            {/* Historical series chart â€” above the table */}
            <TimeseriesChart buildings={result.allBuildings} quarterCols={result.quarterCols} />

            {/* Tables */}
            <Tabs defaultValue="consolidada">
              <TabsList className="h-8">
                <TabsTrigger value="consolidada" className="text-xs h-7">
                  CONSOLIDADA <Badge variant="secondary" className="ml-1.5 text-[10px]">{result.activeRows.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="esgotados" className="text-xs h-7">
                  ESGOTADOS <Badge variant="secondary" className="ml-1.5 text-[10px]">{result.inactiveRows.length}</Badge>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="consolidada" className="mt-2 border border-border rounded-lg overflow-hidden">
                <DataTable rows={result.activeRows} quarterCols={result.quarterCols} />
              </TabsContent>
              <TabsContent value="esgotados" className="mt-2 border border-border rounded-lg overflow-hidden">
                <DataTable rows={result.inactiveRows} quarterCols={result.quarterCols} />
              </TabsContent>
            </Tabs>

            <Button variant="default" className="gap-2 w-full sm:w-auto"
              onClick={() => exportXLSX(result.activeRows, result.inactiveRows, result.quarterCols, result.city, result.lastQ)}>
              <Download className="h-4 w-4" />
              Baixar Excel â€” Relatorio_{result.city}_{qSheet(result.lastQ)}.xlsx
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
