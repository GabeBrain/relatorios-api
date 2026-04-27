import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Play, Building2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import brainLogo from '../../assets/logoBrain.png';

const BASE_URL = 'https://geobrain.com.br/public-api';
const ALL_BUILDING_TYPES = ['Vertical', 'Horizontal', 'Comercial', 'Hotel'];
const ALL_STATUSES = ['Ativo', 'Esgotado'];
const PREVIEW_PER_PAGE = 100;
const DETAIL_CONCURRENCY = 8;
const ESTIMATED_SECONDS_PER_DETAIL = 0.7;

type Row = Record<string, string | number | null>;

const HEADER_COLS = [
  'Tipo', 'Empreendimentos', 'Logradouro', 'Número', 'Bairro', 'Cidade/UF',
  'Incorporadora', 'Padrão', 'Lançamento', 'ANO', 'Entrega',
  'Tipo de Tipologia', 'Dorm.', 'Preço de lançamento', 'Preço atual',
  'm2 Priv.', 'Valor m2 Priv.', 'Unidades por Tipologia',
  '*Vendidos no trimestre', '*Distratos no trimestre',
];

const FOOTER_COLS = [
  'Estoque por Tipologia', '% Dispon.', 'Vagas de Garagem',
  'VGV Estoque', 'm² Estoque', 'R$/m²\nEstoque',
  'VGV Lançado', 'm² Lançado', 'R$/m² Lançado',
  'VGV Vendas Brutas', 'VGV Distratos', 'Vendas Líquidas',
];

// ── helpers ──────────────────────────────────────────────────────────────────

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

function periodToQuarter(period: string): string | null {
  try {
    const d = new Date(period.slice(0, 10));
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `${q}T${d.getFullYear()}`;
  } catch { return null; }
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const f = parseFloat(String(v));
  return Number.isFinite(f) ? f : null;
}

function extractYear(dateStr: string): string | null {
  const parts = dateStr.replace(/-/g, '/').split('/').reverse();
  return parts.find((p) => p.length === 4 && /^\d+$/.test(p)) ?? null;
}

function compareTuple(a: [number, number], b: [number, number]): number {
  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
}

// ── API ───────────────────────────────────────────────────────────────────────

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
    catch { return { data: null, status: res.status, error: 'Resposta não é JSON' }; }
  } catch (err) {
    clearTimeout(timer);
    return { data: null, status: null, error: err instanceof Error ? err.message : String(err) };
  }
}

function hasPeriodFrom(building: Record<string, unknown>, startQ: string): boolean {
  const startKey = qKey(startQ);
  const history = (building.typologies_history as unknown[]) ?? [];
  return history.some((e) => {
    const q = periodToQuarter(((e as Record<string, unknown>).period as string) ?? '');
    return q && compareTuple(qKey(q), startKey) >= 0;
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

      if (!hasPeriodFrom(it, startQ)) continue;
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
  city: string, uf: string, types: string[], statuses: string[], startQ: string,
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
    pairs.map(({ status, type }) => fetchLane(status, type, city, uf, startQ, token, signal, applyDelta))
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

// ── data processing ───────────────────────────────────────────────────────────

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

function buildRows(buildings: Record<string, unknown>[], quarterCols: string[]): Row[] {
  const qSet = new Set(quarterCols);
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
      const first = entries[0]; const last = entries[entries.length - 1];
      const qty = toNum(last.qty) ?? toNum(first.qty) ?? 0;
      const privArea = toNum(last.private_area) ?? 0;
      const launchPrice = toNum(first.release_price) ?? 0;
      const stockRaw = toNum(last.typology_stock);
      const stock = stockRaw !== null ? stockRaw : 0;

      const qSales: Record<string, number | null> = {};
      for (const e of entries) {
        const q = periodToQuarter(String(e.period ?? ''));
        if (q && qSet.has(q)) qSales[q] = toNum(e.sold_in_period);
      }

      const pctDisp = qty ? stock / qty : null;
      const vgvLancado = qty && launchPrice ? Math.round(qty * launchPrice * 100) / 100 : null;
      const m2Lancado = privArea && qty ? Math.round(privArea * qty * 100) / 100 : null;
      const r_m2_lancado = launchPrice && privArea ? Math.round((launchPrice / privArea) * 10000) / 10000 : null;
      const vgvEstoque = toNum(last.vgv_stock);
      const m2Estoque = privArea > 0 ? Math.round(privArea * stock * 100) / 100 : 0;
      // BM = BK / BL
      const r_m2_estoque = (vgvEstoque !== null && m2Estoque > 0)
        ? Math.round((vgvEstoque / m2Estoque) * 100) / 100
        : 0;
      const latestSold = toNum(last.sold_in_period) ?? 0;
      const currentPrice = toNum(last.price) ?? 0;
      // BQ = O × S
      const vgvVendasBrutas = latestSold && currentPrice
        ? Math.round(latestSold * currentPrice * 100) / 100
        : null;
      // BR = O × T — Distratos indisponível na API
      const vgvDistratos: number | null = null;
      const vendasLiqVgv = vgvVendasBrutas !== null
        ? Math.round((vgvVendasBrutas - (vgvDistratos ?? 0)) * 100) / 100
        : 0;

      const row: Row = {
        'Tipo': b.building_type as string ?? '',
        'Empreendimentos': b.name as string ?? '',
        'Logradouro': b.address as string ?? '',
        'Número': b.address_number as string ?? '',
        'Bairro': b.neighborhood as string ?? '',
        'Cidade/UF': cityUf,
        'Incorporadora': incorporadora,
        'Padrão': b.standard as string ?? '',
        'Lançamento': b.release_date as string ?? '',
        'ANO': extractYear(String(b.release_date ?? '')),
        'Entrega': b.delivery_date as string ?? '',
        'Tipo de Tipologia': last.type_of_typology as string ?? '',
        'Dorm.': toNum(last.number_bedroom),
        'Preço de lançamento': launchPrice || null,
        'Preço atual': toNum(last.price),
        'm2 Priv.': privArea || null,
        'Valor m2 Priv.': toNum(last.price_private_area),
        'Unidades por Tipologia': qty || null,
        '*Vendidos no trimestre': toNum(last.sold_in_period),
        '*Distratos no trimestre': null,
      };

      for (const q of quarterCols) row[`Vendas líquidas ${q}`] = qSales[q] ?? 0;

      Object.assign(row, {
        'Estoque por Tipologia': stock,
        '% Dispon.': pctDisp,
        'Vagas de Garagem': toNum(last.garage),
        'VGV Estoque': vgvEstoque,
        'm² Estoque': m2Estoque,
        'R$/m²\nEstoque': r_m2_estoque,
        'VGV Lançado': vgvLancado,
        'm² Lançado': m2Lancado,
        'R$/m² Lançado': r_m2_lancado,
        'VGV Vendas Brutas': vgvVendasBrutas,
        'VGV Distratos': vgvDistratos,
        'Vendas Líquidas': vendasLiqVgv,
      });

      rows.push(row);
    }
  }

  rows.sort((a, b) => {
    const na = String(a['Empreendimentos'] ?? ''); const nb = String(b['Empreendimentos'] ?? '');
    if (na !== nb) return na.localeCompare(nb);
    return (toNum(a['Dorm.']) ?? 0) - (toNum(b['Dorm.']) ?? 0);
  });

  return rows;
}

async function exportXLSX(activeRows: Row[], inactiveRows: Row[], quarterCols: string[], city: string, lastQ: string): Promise<void> {
  const { utils, writeFile } = await import('xlsx');
  const allCols = [...HEADER_COLS, ...quarterCols.map((q) => `Vendas líquidas ${q}`), ...FOOTER_COLS];
  const sheetRows = (rows: Row[]) =>
    [allCols, ...rows.map((row) => allCols.map((c) => row[c] ?? null))];
  const sfx = qSheet(lastQ);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, utils.aoa_to_sheet(sheetRows(activeRows)), `CONSOLIDADA ${sfx}`);
  utils.book_append_sheet(wb, utils.aoa_to_sheet(sheetRows(inactiveRows)), 'ESGOTADOS');
  writeFile(wb, `Relatorio_${city.trim()}_${sfx}.xlsx`);
}

// ── timeseries ────────────────────────────────────────────────────────────────

type TimeMetric = 'sold_in_period' | 'typology_stock' | 'pct_avail' | 'price' | 'price_private_area' | 'vgv_stock';

const TIME_METRICS: {
  key: TimeMetric; label: string; agg: 'sum' | 'avg';
  description: string; format: (v: number) => string; axis: 'left' | 'right';
}[] = [
  {
    key: 'sold_in_period', label: 'Vendas (unidades)', agg: 'sum', axis: 'left',
    description: 'Total de unidades vendidas por trimestre',
    format: (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
  },
  {
    key: 'typology_stock', label: 'Estoque (unidades)', agg: 'sum', axis: 'left',
    description: 'Total de unidades em estoque por trimestre',
    format: (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
  },
  {
    key: 'pct_avail', label: '% Disponibilidade', agg: 'avg', axis: 'left',
    description: 'Percentual médio de unidades disponíveis',
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: 'price', label: 'Preço médio (R$)', agg: 'avg', axis: 'right',
    description: 'Preço médio por unidade entre todas as tipologias',
    format: (v) => v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(2)}M` : `R$ ${(v / 1_000).toFixed(0)}k`,
  },
  {
    key: 'price_private_area', label: 'R$/m² médio', agg: 'avg', axis: 'right',
    description: 'Preço médio por metro quadrado privativo',
    format: (v) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
  },
  {
    key: 'vgv_stock', label: 'VGV Estoque', agg: 'sum', axis: 'right',
    description: 'Valor Geral de Vendas do estoque disponível por trimestre',
    format: (v) => v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M` : `R$ ${(v / 1_000).toFixed(0)}k`,
  },
];

// Brand colors per metric: greens for left-axis (units), blues for right-axis (prices)
const LINE_COLORS: Record<TimeMetric, string> = {
  sold_in_period:     '#4d7c0f',
  typology_stock:     '#2563eb',
  pct_avail:          '#65a30d',
  price:              '#1d4ed8',
  price_private_area: '#84cc16',
  vgv_stock:          '#3b82f6',
};

// Bar chart: single green family, darkest → lightest (bars sorted desc)
const BAR_GREEN_SHADES = ['#3f6212', '#4d7c0f', '#65a30d', '#84cc16', '#a3e635', '#bef264', '#d9f99d', '#ecfccb'];
function barGreen(i: number, total: number): string {
  const idx = Math.round((i / Math.max(total - 1, 1)) * (BAR_GREEN_SHADES.length - 1));
  return BAR_GREEN_SHADES[Math.min(idx, BAR_GREEN_SHADES.length - 1)];
}

function buildTimeseriesData(
  buildings: Record<string, unknown>[],
  quarterCols: string[],
  metric: TimeMetric,
): { quarter: string; value: number | null }[] {
  const qSet = new Set(quarterCols);
  const byQuarter = new Map<string, number[]>();
  for (const q of quarterCols) byQuarter.set(q, []);

  for (const b of buildings) {
    for (const e of ((b.typologies_history as unknown[]) ?? [])) {
      const entry = e as Record<string, unknown>;
      const q = periodToQuarter(String(entry.period ?? ''));
      if (!q || !qSet.has(q)) continue;

      let v: number | null = null;
      if (metric === 'pct_avail') {
        const stock = toNum(entry.typology_stock);
        const qty = toNum(entry.qty);
        v = stock !== null && qty ? stock / qty : null;
      } else {
        v = toNum(entry[metric]);
      }

      if (v !== null) byQuarter.get(q)!.push(v);
    }
  }

  const def = TIME_METRICS.find((m) => m.key === metric)!;
  return quarterCols.map((q) => {
    const vals = byQuarter.get(q) ?? [];
    if (vals.length === 0) return { quarter: qLabel(q), value: null };
    const value = def.agg === 'sum'
      ? vals.reduce((a, b) => a + b, 0)
      : vals.reduce((a, b) => a + b, 0) / vals.length;
    return { quarter: qLabel(q), value };
  });
}

// Multi-metric timeseries: returns rows with one key per selected metric
function buildMultiTimeseriesData(
  buildings: Record<string, unknown>[],
  quarterCols: string[],
  metrics: TimeMetric[],
): Record<string, number | string | null>[] {
  const seriesMap = new Map<TimeMetric, (number | null)[]>();
  for (const metric of metrics) {
    seriesMap.set(metric, buildTimeseriesData(buildings, quarterCols, metric).map((d) => d.value));
  }
  return quarterCols.map((q, i) => {
    const row: Record<string, number | string | null> = { quarter: qLabel(q) };
    for (const metric of metrics) row[metric] = seriesMap.get(metric)?.[i] ?? null;
    return row;
  });
}

// ── sub-components ────────────────────────────────────────────────────────────

function BrainLogoProgress({ pct, label }: { pct: number; label?: string }) {
  const clipped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-10">
        <img src={brainLogo} alt="" className="absolute inset-0 w-full h-full object-contain opacity-10" />
        <img
          src={brainLogo}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{ clipPath: `inset(0 ${100 - clipped}% 0 0)` }}
        />
      </div>
      {label && <p className="text-[11px] text-muted-foreground">{label}</p>}
    </div>
  );
}

function FetchingOverlay({ pct, done, total, failed, onAbort }: {
  pct: number; done: number; total: number; failed: number; onAbort: () => void;
}) {
  const clipped = Math.max(0, Math.min(100, pct));
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="relative w-64 h-32 mb-6">
        <img src={brainLogo} alt="" className="absolute inset-0 w-full h-full object-contain opacity-10" />
        <img
          src={brainLogo} alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{ clipPath: `inset(0 ${100 - clipped}% 0 0)` }}
        />
      </div>
      <p className="text-sm font-medium text-foreground animate-pulse">Carregando...</p>
      {total > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {done.toLocaleString('pt-BR')} / {total.toLocaleString('pt-BR')} empreendimentos
          {failed > 0 && <span className="text-amber-500 ml-2">· {failed} falha(s)</span>}
        </p>
      )}
      <button
        type="button" onClick={onAbort}
        className="mt-6 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        Cancelar coleta
      </button>
    </div>
  );
}

function TimeseriesChart({ buildings, quarterCols }: {
  buildings: Record<string, unknown>[];
  quarterCols: string[];
}) {
  const [selectedMetrics, setSelectedMetrics] = useState<TimeMetric[]>(['sold_in_period']);

  function toggleMetric(key: TimeMetric) {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      return [...prev, key];
    });
  }

  const data = buildMultiTimeseriesData(buildings, quarterCols, selectedMetrics);

  const leftMetrics = selectedMetrics.filter((k) => TIME_METRICS.find((m) => m.key === k)?.axis === 'left');
  const rightMetrics = selectedMetrics.filter((k) => TIME_METRICS.find((m) => m.key === k)?.axis === 'right');
  const hasLeft = leftMetrics.length > 0;
  const hasRight = rightMetrics.length > 0;

  const firstLeftDef = TIME_METRICS.find((m) => leftMetrics.includes(m.key));
  const firstRightDef = TIME_METRICS.find((m) => rightMetrics.includes(m.key));

  function leftTickFmt(v: number) {
    if (!firstLeftDef) return String(v);
    if (firstLeftDef.key === 'pct_avail') return `${(v * 100).toFixed(0)}%`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toFixed(0);
  }

  function rightTickFmt(v: number) {
    if (!firstRightDef) return String(v);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toFixed(0);
  }

  const activeDef = selectedMetrics.length === 1
    ? TIME_METRICS.find((m) => m.key === selectedMetrics[0])
    : undefined;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-border">
        <div>
          <p className="text-sm font-semibold">Série Histórica</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeDef ? activeDef.description : 'Múltiplas variáveis — eixo esquerdo: unidades, direito: valores (R$)'}
          </p>
        </div>
      </div>

      {/* Metric selector pills */}
      <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
        {TIME_METRICS.map((m) => {
          const isSelected = selectedMetrics.includes(m.key);
          const color = LINE_COLORS[m.key];
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggleMetric(m.key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-all font-medium',
                isSelected ? 'text-foreground' : 'text-muted-foreground border-border/60 hover:border-border'
              )}
              style={isSelected ? { borderColor: color, backgroundColor: color + '18', color } : {}}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: isSelected ? color : 'currentColor', opacity: isSelected ? 1 : 0.35 }}
              />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="px-2 pt-2 pb-3">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data} margin={{ top: 8, right: hasRight ? 16 : 24, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="quarter"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            {hasLeft && (
              <YAxis
                yAxisId="left"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={leftTickFmt}
                width={52}
              />
            )}
            {hasRight && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={rightTickFmt}
                width={60}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: 11,
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: 4 }}
              formatter={(value: number, name: string) => {
                const def = TIME_METRICS.find((m) => m.key === name);
                return [def ? def.format(value) : value, def?.label ?? name];
              }}
            />
            {selectedMetrics.map((key) => {
              const def = TIME_METRICS.find((m) => m.key === key)!;
              const color = LINE_COLORS[key];
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  yAxisId={def.axis}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatCell(col: string, val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  if (col === '% Dispon.') return `${((val as number) * 100).toFixed(1)}%`;
  if (typeof val === 'number') {
    if (col.startsWith('VGV') || col === 'Vendas Líquidas') {
      return val >= 1_000_000
        ? `R$ ${(val / 1_000_000).toFixed(2)}M`
        : `R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
    }
    if (col === 'R$/m²\nEstoque' || col === 'R$/m² Lançado' || col === 'Valor m2 Priv.')
      return `R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
  }
  return String(val);
}

function DataTable({ rows, quarterCols }: { rows: Row[]; quarterCols: string[] }) {
  const allCols = [
    ...HEADER_COLS,
    ...quarterCols.map((q) => `Vendas líquidas ${q}`),
    ...FOOTER_COLS,
  ];
  if (rows.length === 0) return <p className="text-xs text-muted-foreground py-4">Nenhum dado.</p>;
  return (
    <div className="overflow-auto max-h-[50vh]">
      <table className="w-full text-[11px] border-collapse">
        <thead className="sticky top-0 bg-muted">
          <tr>
            {allCols.map((c) => (
              <th key={c} className="text-left px-2 py-1.5 font-medium text-muted-foreground whitespace-nowrap border-b border-border">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-accent/20">
              {allCols.map((c) => (
                <td key={c} className="px-2 py-1 whitespace-nowrap">
                  {formatCell(c, row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function TestesArquitetura() {
  const { getToken, hasValidToken } = useAuthStore();

  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Vertical']);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Ativo', 'Esgotado']);
  const [startQ, setStartQ] = useState('1T2021');

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
    if (!hasValidToken()) { toast.error('Token ausente ou expirado. Faça login no menu lateral.'); return; }

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
        startQ, getToken(), ctrl.signal,
        (stats) => {
          setLiveStats({ ...stats });
          const pct = stats.pagesTotal > 0 ? Math.min(99, (stats.pagesDone / stats.pagesTotal) * 100) : 0;
          setPreviewPct(pct);
        },
      );

      if (!ctrl.signal.aborted) {
        setPreview(p);
        setPreviewPct(100);
        if (p.eligibleTotal === 0) toast.warning('Nenhum empreendimento com histórico no período.');
        else toast.success(`Prévia: ${p.eligibleTotal} empreendimentos encontrados.`);
      }
    } catch (err) {
      if (!ctrl.signal.aborted) toast.error(`Erro na prévia: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPhase('idle');
    }
  }, [city, uf, selectedTypes, selectedStatuses, startQ, getToken, hasValidToken]);

  const handleAbortPreview = useCallback(() => {
    previewAbortRef.current?.abort();
    setPhase('idle');
    toast.info('Prévia cancelada.');
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
      const filteredQs = allQuarters.filter((q) => compareTuple(qKey(q), qKey(startQ)) >= 0);

      if (filteredQs.length === 0) { toast.error('Nenhum trimestre válido no período.'); return; }

      const lastQ = filteredQs[filteredQs.length - 1];
      const activeBuildings = preview.activeIds.map((id) => details.get(id)).filter(Boolean) as Record<string, unknown>[];
      const inactiveBuildings = preview.inactiveIds.map((id) => details.get(id)).filter(Boolean) as Record<string, unknown>[];
      const activeRows = buildRows(activeBuildings, filteredQs);
      const inactiveRows = buildRows(inactiveBuildings, filteredQs);

      setResult({ activeRows, inactiveRows, quarterCols: filteredQs, city: city.trim(), lastQ, startQ, nBuildings: details.size, allBuildings });
      const warn = failed > 0 ? ` — ${failed} falha(s)` : '';
      toast.success(`Concluído: ${details.size} empreendimentos | ${qLabel(startQ)} → ${qLabel(lastQ)}${warn}`);
    } catch (err) {
      if (!ctrl.signal.aborted) toast.error(`Erro na coleta: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPhase('idle');
    }
  }, [preview, city, startQ, getToken, hasValidToken]);

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
        <h1 className="text-lg font-semibold">Relatórios Secovi</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Gerador de relatório Geobrain — coleta paralela de empreendimentos por cidade.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
          <strong>Limitação da API:</strong> Distratos não são fornecidos. As colunas <code>*Distratos no trimestre</code> e <code>VGV Distratos</code> ficam em branco.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Cidade *</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Barretos" className="h-8 text-xs" disabled={loading} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">UF (opcional)</Label>
            <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} placeholder="SP" maxLength={2} className="h-8 text-xs" disabled={loading} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Análise temporal desde</Label>
            <Select value={startQ} onValueChange={setStartQ} disabled={loading}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{quarters.map((q) => <SelectItem key={q} value={q}>{qLabel(q)}</SelectItem>)}</SelectContent>
            </Select>
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

        <div className="flex flex-wrap gap-2">
          {phase !== 'preview' ? (
            <Button onClick={handlePreview} disabled={loading || !city.trim() || selectedTypes.length === 0 || selectedStatuses.length === 0} variant="outline" className="gap-2 text-xs h-8">
              <Building2 className="h-3.5 w-3.5" />
              Calcular prévia
            </Button>
          ) : (
            <Button onClick={handleAbortPreview} variant="outline" className="gap-2 text-xs h-8 border-red-500/40 text-red-500 hover:bg-red-500/10">
              <X className="h-3.5 w-3.5" />
              Cancelar prévia
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
              label={liveStats ? `${liveStats.pagesDone}/${Math.max(liveStats.pagesTotal, liveStats.pagesDone)} pág.` : 'iniciando…'}
            />
            {liveStats && (
              <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                {[
                  { label: 'Encontrados', value: liveStats.totalFound },
                  { label: 'Com histórico', value: liveStats.eligibleFound },
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
                { label: 'Com histórico', value: preview.eligibleTotal },
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
                ETA coleta: ~{Math.ceil(preview.etaSeconds)}s · concorrência {DETAIL_CONCURRENCY}×
                {preview.failedCalls > 0 && <span className="text-amber-500 ml-2">— {preview.failedCalls} chamada(s) de prévia falharam</span>}
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
              <p className="text-[11px] text-muted-foreground">{result.city.toUpperCase()} · {qLabel(result.startQ)} → {qLabel(result.lastQ)}</p>
            </div>

            {/* Categorical bar charts — single green gradient */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                { title: 'Tipo de empreendimento', field: 'Tipo' },
                { title: 'Padrão', field: 'Padrão' },
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

            {/* Historical series chart — above the table */}
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
              Baixar Excel — Relatorio_{result.city}_{qSheet(result.lastQ)}.xlsx
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
