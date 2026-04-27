import { useState, useCallback } from 'react';
import { Download, Play, Square, Building2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const BASE_URL = 'https://geobrain.com.br/public-api';
const ALL_BUILDING_TYPES = ['Vertical', 'Horizontal', 'Comercial', 'Hotel'];
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
  'Estoque por Tipologia', '% Dispon.', 'Vagas de Garagem', '_blank_',
  'VGV Estoque', 'm² Estoque', 'R$/m²\nEstoque',
  'VGV Lançado', 'm² Lançado', 'R$/m² Lançado',
  'VGV Vendas Brutas', 'VGV Distratos', 'Vendas Líquidas',
];

function availableQuarters(yearStart = 2021): string[] {
  const now = new Date();
  const maxQ = Math.floor((now.getMonth()) / 3) + 1;
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
  const yr = parts.find((p) => p.length === 4 && /^\d+$/.test(p));
  return yr ?? null;
}

function compareTuple(a: [number, number], b: [number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];
}

async function apiGet(path: string, params: Record<string, unknown>, token: string): Promise<{ data: unknown; status: number | null; error: string }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') qs.set(k, String(v));
  }
  const url = `${BASE_URL}${path}${qs.toString() ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(40000),
    });
    try { return { data: await res.json(), status: res.status, error: '' }; }
    catch { return { data: null, status: res.status, error: 'Resposta não é JSON' }; }
  } catch (err) {
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

async function collectPreview(
  city: string, uf: string, types: string[], startQ: string, token: string,
  onLog: (msg: string) => void
) {
  const allSeen = new Set<number>();
  const allIds: number[] = [];
  const eligibleSeen = new Set<number>();
  const eligibleIds: number[] = [];
  const activeIds: number[] = [];
  const inactiveIds: number[] = [];
  const activeSeen = new Set<number>();
  const inactiveSeen = new Set<number>();
  let failedCalls = 0;

  for (const status of ['Ativo', 'Esgotado']) {
    for (const btype of types) {
      let page = 1;
      while (true) {
        const params: Record<string, unknown> = { type: btype, city, status, per_page: PREVIEW_PER_PAGE, page };
        if (uf) params['uf'] = uf;
        const { data, error } = await apiGet('/building-with-history', params, token);
        if (error || typeof data !== 'object' || data === null) { failedCalls++; break; }
        const d = data as Record<string, unknown>;
        const items = (d.data as unknown[]) ?? [];
        if (!items.length) break;
        const meta = (d.meta as Record<string, unknown>) ?? {};

        for (const item of items) {
          const it = item as Record<string, unknown>;
          const bid = it.building_id as number;
          if (bid === null || bid === undefined) continue;
          if (!allSeen.has(bid)) { allSeen.add(bid); allIds.push(bid); }
          if (!hasPeriodFrom(it, startQ)) continue;
          if (!eligibleSeen.has(bid)) { eligibleSeen.add(bid); eligibleIds.push(bid); }
          const itStatus = ((it.status as string) ?? status).trim();
          if (itStatus === 'Ativo') { if (!activeSeen.has(bid)) { activeSeen.add(bid); activeIds.push(bid); } }
          else { if (!inactiveSeen.has(bid)) { inactiveSeen.add(bid); inactiveIds.push(bid); } }
        }

        onLog(`${status} - ${btype} - pág ${page}/${meta.last_page ?? '?'} - ${meta.total ?? '?'} registros`);
        if (page >= ((meta.last_page as number) ?? 1)) break;
        page++;
      }
    }
  }

  const pagesNeeded = Math.ceil(eligibleIds.length / 30);
  const etaSeconds = eligibleIds.length * ESTIMATED_SECONDS_PER_DETAIL / DETAIL_CONCURRENCY;
  return { totalCity: allIds.length, eligibleTotal: eligibleIds.length, eligibleActive: activeIds.length, eligibleInactive: inactiveIds.length, eligibleIds, activeIds, inactiveIds, failedCalls, pagesNeeded, etaSeconds };
}

async function fetchDetail(bid: number, token: string): Promise<Record<string, unknown> | null> {
  const { data } = await apiGet(`/building-with-history/${bid}`, {}, token);
  if (typeof data === 'object' && data !== null && 'data' in (data as object)) {
    return (data as Record<string, unknown>).data as Record<string, unknown>;
  }
  return null;
}

async function fetchDetailsParallel(
  ids: number[], token: string,
  onProgress: (done: number, total: number, failed: number) => void
): Promise<{ details: Map<number, Record<string, unknown>>; failed: number }> {
  const details = new Map<number, Record<string, unknown>>();
  let done = 0;
  let failed = 0;
  const total = ids.length;

  for (let i = 0; i < total; i += DETAIL_CONCURRENCY) {
    const batch = ids.slice(i, i + DETAIL_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((bid) => fetchDetail(bid, token)));
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) details.set(batch[idx], r.value);
      else failed++;
      done++;
    });
    onProgress(done, total, failed);
  }

  return { details, failed };
}

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
      const first = entries[0];
      const last = entries[entries.length - 1];

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
      const rM2Estoque = stock > 0 ? toNum(last.price_private_area) : null;
      const vgvLancado = qty && launchPrice ? Math.round(qty * launchPrice * 100) / 100 : null;
      const m2Lancado = privArea && qty ? Math.round(privArea * qty * 100) / 100 : null;
      const rM2Lancado = launchPrice && privArea ? Math.round((launchPrice / privArea) * 10000) / 10000 : null;
      const latestSold = toNum(last.sold_in_period) ?? 0;
      const currentPrice = toNum(last.price) ?? 0;
      const vendasLiqVgv = latestSold ? Math.round(latestSold * currentPrice * 100) / 100 : 0;

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

      for (const q of quarterCols) {
        row[`Vendas líquidas ${q}`] = qSales[q] ?? 0;
      }

      Object.assign(row, {
        'Estoque por Tipologia': stock,
        '% Dispon.': pctDisp,
        'Vagas de Garagem': toNum(last.garage),
        '_blank_': null,
        'VGV Estoque': toNum(last.vgv_stock),
        'm² Estoque': privArea !== null ? Math.round(privArea * stock * 100) / 100 : 0,
        'R$/m²\nEstoque': rM2Estoque,
        'VGV Lançado': vgvLancado,
        'm² Lançado': m2Lancado,
        'R$/m² Lançado': rM2Lancado,
        'VGV Vendas Brutas': null,
        'VGV Distratos': null,
        'Vendas Líquidas': vendasLiqVgv,
      });

      rows.push(row);
    }
  }

  rows.sort((a, b) => {
    const na = String(a['Empreendimentos'] ?? '');
    const nb = String(b['Empreendimentos'] ?? '');
    if (na !== nb) return na.localeCompare(nb);
    return (toNum(a['Dorm.']) ?? 0) - (toNum(b['Dorm.']) ?? 0);
  });

  return rows;
}

async function exportXLSX(activeRows: Row[], inactiveRows: Row[], quarterCols: string[], city: string, lastQ: string): Promise<void> {
  const { utils, writeFile } = await import('xlsx');
  const allCols = [...HEADER_COLS, ...quarterCols.map((q) => `Vendas líquidas ${q}`), ...FOOTER_COLS];
  const displayCols = allCols.map((c) => c === '_blank_' ? '' : c);

  function sheetRows(rows: Row[]) {
    return [displayCols, ...rows.map((row) => allCols.map((c) => c === '_blank_' ? null : row[c] ?? null))];
  }

  const sfx = qSheet(lastQ);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, utils.aoa_to_sheet(sheetRows(activeRows)), `CONSOLIDADA ${sfx}`);
  utils.book_append_sheet(wb, utils.aoa_to_sheet(sheetRows(inactiveRows)), 'ESGOTADOS');
  writeFile(wb, `Relatorio_${city.trim()}_${sfx}.xlsx`);
}

function DataTable({ rows, quarterCols }: { rows: Row[]; quarterCols: string[] }) {
  const allCols = [...HEADER_COLS.slice(0, 12), ...quarterCols.map((q) => `Vendas líquidas ${q}`), 'Estoque por Tipologia', '% Dispon.'];
  if (rows.length === 0) return <p className="text-xs text-muted-foreground py-4">Nenhum dado.</p>;
  return (
    <div className="overflow-auto max-h-[50vh]">
      <table className="w-full text-[11px] border-collapse">
        <thead className="sticky top-0 bg-muted">
          <tr>
            {allCols.map((c) => (
              <th key={c} className="text-left px-2 py-1.5 font-medium text-muted-foreground whitespace-nowrap border-b border-border">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-accent/20">
              {allCols.map((c) => (
                <td key={c} className="px-2 py-1 whitespace-nowrap">
                  {c === '% Dispon.' && row[c] !== null
                    ? `${((row[c] as number) * 100).toFixed(1)}%`
                    : String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TestesArquitetura() {
  const { getToken, hasValidToken } = useAuthStore();

  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Vertical']);
  const [startQ, setStartQ] = useState('1T2021');
  const [loading, setLoading] = useState(false);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressFailed, setProgressFailed] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof collectPreview>> | null>(null);
  const [result, setResult] = useState<{
    activeRows: Row[];
    inactiveRows: Row[];
    quarterCols: string[];
    city: string;
    lastQ: string;
    startQ: string;
    nBuildings: number;
  } | null>(null);

  const quarters = availableQuarters(2021);

  function toggleType(t: string) {
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function addLog(msg: string) {
    setLogLines((prev) => [msg, ...prev].slice(0, 20));
  }

  const handlePreview = useCallback(async () => {
    if (!city.trim() || selectedTypes.length === 0) return;
    if (!hasValidToken()) { toast.error('Token ausente ou expirado. Faça login no menu lateral.'); return; }

    setLoading(true);
    setLogLines([]);
    setPreview(null);
    setResult(null);
    try {
      const p = await collectPreview(city.trim(), uf.trim().toUpperCase(), selectedTypes, startQ, getToken(), addLog);
      setPreview(p);
      if (p.eligibleTotal === 0) toast.warning('Nenhum empreendimento com histórico no período selecionado.');
      else toast.success(`Prévia: ${p.eligibleTotal} empreendimentos encontrados.`);
    } catch (err) {
      toast.error(`Erro na prévia: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      setLogLines([]);
    }
  }, [city, uf, selectedTypes, startQ, getToken, hasValidToken]);

  const handleFetch = useCallback(async () => {
    if (!preview || preview.eligibleTotal === 0) return;
    if (!hasValidToken()) { toast.error('Token ausente ou expirado.'); return; }

    setLoading(true);
    setProgressDone(0);
    setProgressTotal(preview.eligibleIds.length);
    setProgressFailed(0);
    setResult(null);

    try {
      const token = getToken();
      const { details, failed } = await fetchDetailsParallel(
        preview.eligibleIds, token,
        (done, total, fail) => { setProgressDone(done); setProgressTotal(total); setProgressFailed(fail); }
      );

      const allBuildings = [...details.values()];
      const allQuarters = deriveQuarters(allBuildings);
      const filteredQs = allQuarters.filter((q) => compareTuple(qKey(q), qKey(startQ)) >= 0);

      if (filteredQs.length === 0) {
        toast.error('Nenhum trimestre válido no período selecionado.');
        return;
      }

      const lastQ = filteredQs[filteredQs.length - 1];
      const activeBuildings = preview.activeIds.map((id) => details.get(id)).filter(Boolean) as Record<string, unknown>[];
      const inactiveBuildings = preview.inactiveIds.map((id) => details.get(id)).filter(Boolean) as Record<string, unknown>[];
      const activeRows = buildRows(activeBuildings, filteredQs);
      const inactiveRows = buildRows(inactiveBuildings, filteredQs);

      setResult({ activeRows, inactiveRows, quarterCols: filteredQs, city: city.trim(), lastQ, startQ, nBuildings: details.size });

      const warnMsg = failed > 0 ? ` — ${failed} falha(s)` : '';
      toast.success(`Concluído: ${details.size} empreendimentos | ${qLabel(startQ)} → ${qLabel(lastQ)}${warnMsg}`);
    } catch (err) {
      toast.error(`Erro na coleta: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [preview, city, startQ, getToken, hasValidToken]);

  function buildChartData(rows: Row[], field: string): { name: string; count: number }[] {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const val = String(row[field] ?? 'N/A');
      counts[val] = (counts[val] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  const CHART_COLORS = ['#4ade80', '#60a5fa', '#f59e0b', '#f87171', '#a78bfa', '#34d399'];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-card">
        <h1 className="text-lg font-semibold">Relatórios Secovi</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Gerador de relatório Geobrain — coleta paralela de empreendimentos por cidade.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Warning */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
          <strong>Limitação conhecida da API:</strong> Distratos e vendas brutas não são fornecidos pela API. A coluna <code>*Distratos</code>, <code>VGV Vendas Brutas</code> e <code>VGV Distratos</code> ficam em branco no arquivo gerado.
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Cidade *</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Barretos" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">UF (opcional)</Label>
            <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} placeholder="SP" maxLength={2} className="h-8 text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Análise temporal desde</Label>
            <Select value={startQ} onValueChange={setStartQ}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quarters.map((q) => <SelectItem key={q} value={q}>{qLabel(q)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Types */}
        <div className="space-y-1.5">
          <Label className="text-xs">Tipos de empreendimento</Label>
          <div className="flex flex-wrap gap-3">
            {ALL_BUILDING_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer text-xs">
                <Checkbox checked={selectedTypes.includes(t)} onCheckedChange={() => toggleType(t)} />
                {t}
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handlePreview}
            disabled={loading || !city.trim() || selectedTypes.length === 0}
            variant="outline"
            className="gap-2 text-xs h-8"
          >
            <Building2 className="h-3.5 w-3.5" />
            {loading && !preview ? 'Calculando prévia…' : 'Calcular prévia'}
          </Button>
          <Button
            onClick={handleFetch}
            disabled={loading || !preview || preview.eligibleTotal === 0}
            className="gap-2 text-xs h-8"
          >
            <Play className="h-3.5 w-3.5" />
            {loading && preview ? 'Coletando…' : 'Buscar empreendimentos'}
          </Button>
          {result && (
            <Button
              variant="outline"
              className="gap-2 text-xs h-8"
              onClick={() => exportXLSX(result.activeRows, result.inactiveRows, result.quarterCols, result.city, result.lastQ)}
            >
              <Download className="h-3.5 w-3.5" />
              Baixar Excel
            </Button>
          )}
        </div>

        {/* Log while previewing */}
        {loading && logLines.length > 0 && (
          <div className="rounded border border-border bg-muted/30 p-2 text-[11px] font-mono text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
            {logLines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        {/* Progress while fetching */}
        {loading && progressTotal > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Coletando histórico… {progressDone}/{progressTotal}</span>
              {progressFailed > 0 && <span className="text-amber-500">{progressFailed} falha(s)</span>}
            </div>
            <Progress value={(progressDone / progressTotal) * 100} className="h-2" />
          </div>
        )}

        {/* Preview card */}
        {preview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total na cidade', value: preview.totalCity },
              { label: 'Com histórico', value: preview.eligibleTotal },
              { label: 'Ativos', value: preview.eligibleActive },
              { label: 'Esgotados', value: preview.eligibleInactive },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-xl font-bold mt-0.5">{value.toLocaleString('pt-BR')}</p>
              </div>
            ))}
            {preview.etaSeconds > 0 && (
              <div className="col-span-2 sm:col-span-4 text-xs text-muted-foreground">
                Tempo estimado de coleta: ~{Math.ceil(preview.etaSeconds)}s com concorrência {DETAIL_CONCURRENCY}×
                {preview.failedCalls > 0 && <span className="text-amber-500 ml-2">— {preview.failedCalls} chamada(s) de prévia falharam</span>}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Empreendimentos', value: result.nBuildings },
                { label: 'Linhas CONSOLIDADA', value: result.activeRows.length },
                { label: 'Linhas ESGOTADOS', value: result.inactiveRows.length },
                { label: 'Trimestres', value: result.quarterCols.length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold mt-0.5">{value.toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {result.city.toUpperCase()} · {qLabel(result.startQ)} → {qLabel(result.lastQ)}
            </p>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                { title: 'Tipo de empreendimento', field: 'Tipo' },
                { title: 'Padrão', field: 'Padrão' },
              ].map(({ title, field }) => {
                const chartData = buildChartData([...result.activeRows, ...result.inactiveRows], field);
                return (
                  <div key={field} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold">{title}</p>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11 }} />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                          {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>

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

            <Button
              variant="default"
              className="gap-2 w-full sm:w-auto"
              onClick={() => exportXLSX(result.activeRows, result.inactiveRows, result.quarterCols, result.city, result.lastQ)}
            >
              <Download className="h-4 w-4" />
              Baixar Excel — Relatório_{result.city}_{qSheet(result.lastQ)}.xlsx
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
