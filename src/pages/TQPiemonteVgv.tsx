import { useState } from 'react';
import {
  ChevronDown, Mail, Lightbulb, FlaskConical, MessageSquare,
  CheckSquare, Square, Clock, User, Building2, Play, Loader2,
  Copy, Check, AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

// ─── Constantes do caso ───────────────────────────────────────────────────────

const BASE_URL = 'https://geobrain.com.br/public-api';
const CITY = 'Curitiba';
const UF = 'PR';
const TYPES = ['Vertical', 'Horizontal'];
const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025'];

const CASE = {
  client: 'Wesley dos Santos',
  company: 'Piemonte',
  date: '2025-04-28',
  endpoint: '/temporal-analysis-city/sales',
  title: 'VGV em empreendimentos verticais',
  status: 'Em investigação' as const,
};

const EMAIL_BODY = `Boa tarde Pessoal, conforme conversamos coloco abaixo os detalhes sobre os endpoints que preciso de ajuda;

Análise do endpoint /temporal-analysis-city/sales

Testei o endpoint via curl com Curitiba/PR 2024. Confirmei:

- Retorna dados a nível de cidade, não por empreendimento (não há building_id nem identificador per-edifício)
- Múltiplas linhas por período+building_type (segmentação interna que não vem com label, group: null)
- liquid_sales e vgv_liquid_sales confiáveis como totais agregados (city-level ground truth)

Acredito que o erro esteja acontecendo principalmente para os empreendimentos Verticais, pois nos horizontais ainda retorna alguma coisa.

Para calculo de VGV total estou usando vendasNoPeriodo × precoPeriodo. Esse é meu único entrave atual com a API.`;

const INITIAL_HYPOTHESES = [
  {
    id: 'h1',
    text: 'O endpoint é city-level apenas — sem desagregação por empreendimento',
    detail: 'Não existe building_id na resposta. VGV por empreendimento individual é estruturalmente impossível com este endpoint.',
  },
  {
    id: 'h2',
    text: 'group: null + múltiplas linhas por período causa dupla-contagem no VGV',
    detail: 'Com N linhas por período+building_type sem label, aplicar vendasNoPeriodo × precoPeriodo em cada linha produz um total inflado.',
  },
  {
    id: 'h3',
    text: 'Verticais têm mais segmentos internos que horizontais, amplificando o erro',
    detail: 'Horizontais com menos segmentação produzem resultados "menos errados". Verticais com mais segmentos acumulam mais desvio.',
  },
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SalesRow {
  period: string;
  group: string | null;
  building_type: string;
  liquid_sales: number;
  vgv_liquid_sales: number;
}

interface PricesRow {
  period: string;
  group: string | null;
  building_type: string;
  average_price: number;
}

interface BuildingRow {
  id: number;
  name?: string;
  city?: string;
  uf?: string;
  building_type?: string;
  status?: string;
  [key: string]: unknown;
}

interface PeriodGroup {
  period: string;
  buildingType: string;
  rowCount: number;
  totalSales: number;
  totalVgv: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtNum = (v: number) => v.toLocaleString('pt-BR');

const fmtPct = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';

type Params = Record<string, string | string[]>;

function buildUrl(path: string, params: Params, page: number, perPage = 30): string {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((i) => url.searchParams.append(k + '[]', i));
    else url.searchParams.set(k, v);
  }
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  return url.toString();
}

async function fetchAllPages<T>(
  path: string,
  params: Params,
  token: string,
  onProgress?: (msg: string) => void,
): Promise<T[]> {
  const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };

  onProgress?.('Buscando página 1…');
  const firstRes = await fetch(buildUrl(path, params, 1), { headers });
  if (!firstRes.ok) throw new Error(`HTTP ${firstRes.status}`);
  const first = await firstRes.json();
  const all: T[] = [...(first.data ?? [])];
  const lastPage: number = first.meta?.last_page ?? 1;

  if (lastPage > 1) {
    onProgress?.(`Buscando ${lastPage - 1} páginas restantes…`);
    const rest = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, i) =>
        fetch(buildUrl(path, params, i + 2), { headers })
          .then((r) => r.json())
          .then((j) => (j.data ?? []) as T[]),
      ),
    );
    all.push(...rest.flat());
  }

  onProgress?.('');
  return all;
}

async function fetchPage1<T>(path: string, params: Params, token: string): Promise<T[]> {
  const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
  const res = await fetch(buildUrl(path, params, 1), { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

function groupSales(rows: SalesRow[]): PeriodGroup[] {
  const map = new Map<string, PeriodGroup>();
  for (const row of rows) {
    const key = `${row.period}|${row.building_type}`;
    const entry = map.get(key) ?? {
      period: row.period,
      buildingType: row.building_type,
      rowCount: 0,
      totalSales: 0,
      totalVgv: 0,
    };
    entry.rowCount += 1;
    entry.totalSales += row.liquid_sales;
    entry.totalVgv += row.vgv_liquid_sales;
    map.set(key, entry);
  }
  return Array.from(map.values()).sort(
    (a, b) => a.period.localeCompare(b.period) || a.buildingType.localeCompare(b.buildingType),
  );
}

// ─── Componentes de UI ────────────────────────────────────────────────────────

function Collapsible({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function RunButton({
  onClick,
  loading,
  hasToken,
  label,
  progress,
}: {
  onClick: () => void;
  loading: boolean;
  hasToken: boolean;
  label: string;
  progress?: string;
}) {
  if (!hasToken) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
        Autentique-se no painel lateral para executar este teste.
      </p>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        {label}
      </button>
      {loading && progress && <span className="text-xs text-muted-foreground">{progress}</span>}
    </div>
  );
}

function CopyBtn({ value, label = 'Copiar JSON' }: { value: unknown; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(JSON.stringify(value, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiado!' : label}
    </button>
  );
}

function StepCard({
  step,
  title,
  narrative,
  children,
}: {
  step: number;
  title: string;
  narrative: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
          {step}
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">{narrative}</div>
        </div>
      </div>
      <div className="ml-8 space-y-3">{children}</div>
    </div>
  );
}

function Callout({ type, children }: { type: 'info' | 'warning' | 'success'; children: React.ReactNode }) {
  return (
    <div className={cn(
      'rounded-md border px-3 py-2 text-xs leading-relaxed',
      type === 'info' && 'bg-blue-500/5 border-blue-500/20 text-blue-700 dark:text-blue-400',
      type === 'warning' && 'bg-yellow-500/5 border-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      type === 'success' && 'bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400',
    )}>
      {children}
    </div>
  );
}

// ─── Análise comparativa da fórmula ──────────────────────────────────────────

function FormulaComparison({ salesRows, pricesRows }: { salesRows: SalesRow[]; pricesRows: PricesRow[] }) {
  const salesMap = new Map<string, { totalSales: number; totalVgv: number }>();
  for (const r of salesRows) {
    const k = `${r.period}|${r.building_type}`;
    const e = salesMap.get(k) ?? { totalSales: 0, totalVgv: 0 };
    e.totalSales += r.liquid_sales;
    e.totalVgv += r.vgv_liquid_sales;
    salesMap.set(k, e);
  }

  const pricesMap = new Map<string, number[]>();
  for (const r of pricesRows) {
    const k = `${r.period}|${r.building_type}`;
    pricesMap.set(k, [...(pricesMap.get(k) ?? []), r.average_price]);
  }

  const rows = Array.from(salesMap.entries())
    .map(([key, s]) => {
      const [period, buildingType] = key.split('|');
      const prices = pricesMap.get(key);
      const avgPrice = prices ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
      const wesleyVgv = avgPrice !== null ? s.totalSales * avgPrice : null;
      const error = wesleyVgv !== null ? ((wesleyVgv - s.totalVgv) / s.totalVgv) * 100 : null;
      return { period, buildingType, ...s, avgPrice, wesleyVgv, error };
    })
    .sort((a, b) => a.period.localeCompare(b.period) || a.buildingType.localeCompare(b.buildingType));

  const hasError = rows.some((r) => r.error !== null && Math.abs(r.error) > 5);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Simulando a fórmula do Wesley:{' '}
        <code className="bg-muted px-1 rounded">Σ liquid_sales × average_price</code> vs o valor já calculado pela API{' '}
        <code className="bg-muted px-1 rounded">Σ vgv_liquid_sales</code>:
      </p>
      {hasError && (
        <Callout type="warning">
          <strong>Divergência detectada.</strong> A fórmula produz valores diferentes do VGV real da API.
          Erro &gt;5% marcado em amarelo, &gt;20% em vermelho.
        </Callout>
      )}
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Período</th>
              <th className="px-3 py-2 text-left font-medium">Tipo</th>
              <th className="px-3 py-2 text-right font-medium">Σ Vendas</th>
              <th className="px-3 py-2 text-right font-medium">Preço médio</th>
              <th className="px-3 py-2 text-right font-medium">Wesley (×)</th>
              <th className="px-3 py-2 text-right font-medium">Real (API)</th>
              <th className="px-3 py-2 text-right font-medium">Desvio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={`${r.period}-${r.buildingType}`} className="hover:bg-muted/30">
                <td className="px-3 py-1.5 font-mono">{r.period.slice(0, 7)}</td>
                <td className="px-3 py-1.5">{r.buildingType}</td>
                <td className="px-3 py-1.5 text-right">{fmtNum(r.totalSales)}</td>
                <td className="px-3 py-1.5 text-right">{r.avgPrice ? fmtBRL(r.avgPrice) : '—'}</td>
                <td className="px-3 py-1.5 text-right">{r.wesleyVgv ? fmtBRL(r.wesleyVgv) : '—'}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmtBRL(r.totalVgv)}</td>
                <td className={cn(
                  'px-3 py-1.5 text-right font-medium',
                  r.error === null ? 'text-muted-foreground' :
                    Math.abs(r.error) > 20 ? 'text-red-500' :
                    Math.abs(r.error) > 5 ? 'text-yellow-500' : 'text-green-500',
                )}>
                  {r.error !== null ? fmtPct(r.error) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <CopyBtn value={rows} label="Copiar comparação" />
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function TQPiemonteVgv() {
  const token = useAuthStore((s) => s.getToken());
  const hasToken = !!token;

  const [year, setYear] = useState('2024');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState('');

  const [salesRows, setSalesRows] = useState<SalesRow[] | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesProgress, setSalesProgress] = useState('');
  const [salesError, setSalesError] = useState<string | null>(null);

  const [pricesRows, setPricesRows] = useState<PricesRow[] | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);

  const [buildingRows, setBuildingRows] = useState<BuildingRow[] | null>(null);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [buildingsError, setBuildingsError] = useState<string | null>(null);

  const dateRange = { start_period: `${year}-01-01`, end_period: `${year}-12-31` };
  const baseParams: Params = { ...dateRange, city: CITY, uf: UF, type: TYPES };

  async function runSales() {
    setSalesLoading(true);
    setSalesError(null);
    try {
      const rows = await fetchAllPages<SalesRow>(
        '/temporal-analysis-city/sales',
        baseParams,
        token,
        setSalesProgress,
      );
      setSalesRows(rows);
    } catch (e) {
      setSalesError(String(e));
    } finally {
      setSalesLoading(false);
      setSalesProgress('');
    }
  }

  async function runPrices() {
    setPricesLoading(true);
    setPricesError(null);
    try {
      const rows = await fetchAllPages<PricesRow>(
        '/temporal-analysis-city/medium-prices',
        baseParams,
        token,
      );
      setPricesRows(rows);
    } catch (e) {
      setPricesError(String(e));
    } finally {
      setPricesLoading(false);
    }
  }

  async function runBuildings() {
    setBuildingsLoading(true);
    setBuildingsError(null);
    try {
      const rows = await fetchPage1<BuildingRow>(
        '/building',
        { city: CITY, uf: UF, type: 'Vertical' },
        token,
      );
      setBuildingRows(rows);
    } catch (e) {
      setBuildingsError(String(e));
    } finally {
      setBuildingsLoading(false);
    }
  }

  const salesSummary = salesRows ? groupSales(salesRows) : null;
  const maxRowsPerGroup = salesSummary ? Math.max(...salesSummary.map((s) => s.rowCount)) : 0;
  const hasDuplicates = maxRowsPerGroup > 1;

  const pricesDuplicates = pricesRows
    ? pricesRows.some((r, i, arr) =>
        arr.some(
          (o, j) => i !== j && o.period === r.period && o.building_type === r.building_type,
        ),
      )
    : false;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold">{CASE.title}</h1>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{CASE.endpoint}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 px-2.5 py-0.5 text-xs font-medium shrink-0">
              <Clock className="h-3 w-3" />
              {CASE.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />{CASE.client}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />{CASE.company}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {new Date(CASE.date).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        <hr className="border-border" />

        {/* Email */}
        <Collapsible title="Email original" icon={<Mail className="h-4 w-4" />} defaultOpen={false}>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
            {EMAIL_BODY}
          </pre>
        </Collapsible>

        {/* Hipóteses */}
        <Collapsible title="Hipóteses" icon={<Lightbulb className="h-4 w-4" />}>
          <div className="space-y-3">
            {INITIAL_HYPOTHESES.map((h) => (
              <div key={h.id} className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setChecked((prev) => ({ ...prev, [h.id]: !prev[h.id] }))}
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  {checked[h.id]
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4" />}
                </button>
                <div>
                  <p className={cn('text-sm font-medium', checked[h.id] && 'line-through text-muted-foreground')}>
                    {h.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{h.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>

        {/* Testes */}
        <Collapsible title="Testes e investigação" icon={<FlaskConical className="h-4 w-4" />}>
          <div className="space-y-6 pt-1">

            {/* Seletor de ano */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Ano de referência:</span>
              <div className="flex gap-1 flex-wrap">
                {YEARS.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYear(y)}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs transition-colors border',
                      year === y
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">· {CITY}/{UF} · Vertical + Horizontal</span>
            </div>

            <div className="border-t border-border" />

            {/* PASSO 1 */}
            <StepCard
              step={1}
              title="Confirmando as múltiplas linhas por período"
              narrative={
                <>
                  <p>
                    O endpoint <code className="bg-muted px-1 rounded">/temporal-analysis-city/sales</code> retorna os registros
                    segmentados por <code className="bg-muted px-1 rounded">building_type</code>, mas nossa suspeita é que há{' '}
                    <strong>mais de uma linha por período+tipo</strong> com <code className="bg-muted px-1 rounded">group: null</code> —
                    uma segmentação interna oculta. Buscamos todas as páginas de uma vez para ver o quadro completo.
                  </p>
                  <p>
                    Se a hipótese estiver correta, a tabela vai mostrar múltiplas linhas para o mesmo mês, e qualquer cálculo
                    que não some corretamente essas linhas vai errar o total.
                  </p>
                </>
              }
            >
              <RunButton
                onClick={runSales}
                loading={salesLoading}
                hasToken={hasToken}
                label={`Buscar /sales — ${CITY}/${UF} ${year} (todas as páginas)`}
                progress={salesProgress}
              />

              {salesError && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" /> {salesError}
                </p>
              )}

              {salesRows && salesSummary && (
                <div className="space-y-3">
                  {/* Badges de resumo */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-muted px-2 py-1">
                      Total de registros: <strong>{salesRows.length}</strong>
                    </span>
                    <span className="rounded bg-muted px-2 py-1">
                      Períodos únicos: <strong>{new Set(salesRows.map((r) => r.period)).size}</strong>
                    </span>
                    <span className={cn(
                      'rounded px-2 py-1 font-medium',
                      hasDuplicates
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-green-500/10 text-green-600 dark:text-green-400',
                    )}>
                      Máx. linhas por período+tipo: <strong>{maxRowsPerGroup}</strong>
                      {hasDuplicates && ' ⚠️'}
                    </span>
                  </div>

                  {hasDuplicates && (
                    <Callout type="warning">
                      <strong>H2 confirmada.</strong> Existem múltiplas linhas para o mesmo período+tipo com{' '}
                      <code className="bg-yellow-500/10 px-1 rounded">group: null</code>. Qualquer cálculo que não
                      some explicitamente todas as linhas do período vai subestimar ou superestimar o total.
                    </Callout>
                  )}

                  {/* Tabela agrupada */}
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Período</th>
                          <th className="px-3 py-2 text-left font-medium">Tipo</th>
                          <th className="px-3 py-2 text-center font-medium">Linhas</th>
                          <th className="px-3 py-2 text-right font-medium">Σ Vendas</th>
                          <th className="px-3 py-2 text-right font-medium">Σ VGV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {salesSummary.map((s) => (
                          <tr
                            key={`${s.period}-${s.buildingType}`}
                            className={cn('hover:bg-muted/30', s.rowCount > 1 && 'bg-red-500/5')}
                          >
                            <td className="px-3 py-1.5 font-mono">{s.period.slice(0, 7)}</td>
                            <td className="px-3 py-1.5">{s.buildingType}</td>
                            <td className={cn(
                              'px-3 py-1.5 text-center font-medium',
                              s.rowCount > 1 ? 'text-red-500' : 'text-muted-foreground',
                            )}>
                              {s.rowCount}{s.rowCount > 1 && ' ⚠️'}
                            </td>
                            <td className="px-3 py-1.5 text-right">{fmtNum(s.totalSales)}</td>
                            <td className="px-3 py-1.5 text-right">{fmtBRL(s.totalVgv)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2">
                    <CopyBtn value={salesRows} label="Copiar registros brutos" />
                    <CopyBtn value={salesSummary} label="Copiar tabela agrupada" />
                  </div>
                </div>
              )}
            </StepCard>

            <div className="border-t border-border" />

            {/* PASSO 2 */}
            <StepCard
              step={2}
              title={`Rastreando "precoPeriodo" — /temporal-analysis-city/medium-prices`}
              narrative={
                <>
                  <p>
                    A fórmula do Wesley usa <em>vendasNoPeriodo × precoPeriodo</em>. O endpoint natural para
                    "preço no período" é <code className="bg-muted px-1 rounded">/temporal-analysis-city/medium-prices</code>,
                    que retorna <code className="bg-muted px-1 rounded">average_price</code> (ticket médio por unidade).
                    É a fonte mais provável do que ele está chamando de <em>precoPeriodo</em>.
                  </p>
                  <p>
                    Com ambos os datasets, calculamos o que a fórmula dele produziria e comparamos com o{' '}
                    <code className="bg-muted px-1 rounded">vgv_liquid_sales</code> que a própria API já retorna
                    calculado — revelando o desvio real.
                    {!salesRows && (
                      <span className="text-yellow-600 dark:text-yellow-400"> Execute o Passo 1 primeiro para ver a comparação completa.</span>
                    )}
                  </p>
                </>
              }
            >
              <RunButton
                onClick={runPrices}
                loading={pricesLoading}
                hasToken={hasToken}
                label={`Buscar /medium-prices — ${CITY}/${UF} ${year}`}
              />

              {pricesError && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" /> {pricesError}
                </p>
              )}

              {pricesRows && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-muted px-2 py-1">
                      Registros: <strong>{pricesRows.length}</strong>
                    </span>
                    <span className={cn(
                      'rounded px-2 py-1 font-medium',
                      pricesDuplicates
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-green-500/10 text-green-600 dark:text-green-400',
                    )}>
                      {pricesDuplicates
                        ? '⚠️ Também tem múltiplas linhas por período+tipo'
                        : '✓ Uma linha por período+tipo'}
                    </span>
                  </div>

                  {pricesDuplicates && (
                    <Callout type="warning">
                      O endpoint de preços médios também retorna múltiplas linhas por período. Isso significa que não há
                      um único "precoPeriodo" — há N preços para o mesmo mês, um por segmento oculto.
                    </Callout>
                  )}

                  <CopyBtn value={pricesRows} label="Copiar preços médios" />

                  {salesRows && (
                    <FormulaComparison salesRows={salesRows} pricesRows={pricesRows} />
                  )}

                  {!salesRows && (
                    <Callout type="info">
                      Execute o Passo 1 para habilitar a comparação da fórmula com os dados reais de VGV.
                    </Callout>
                  )}
                </div>
              )}
            </StepCard>

            <div className="border-t border-border" />

            {/* PASSO 3 */}
            <StepCard
              step={3}
              title="O caminho certo — /building (dados por empreendimento)"
              narrative={
                <>
                  <p>
                    Se o Wesley precisa de VGV <em>por empreendimento</em>, o endpoint{' '}
                    <code className="bg-muted px-1 rounded">/temporal-analysis-city/sales</code> não resolve —
                    ele é city-level por design. O caminho correto é o endpoint{' '}
                    <code className="bg-muted px-1 rounded">/building</code>, que lista empreendimentos individuais,
                    e depois{' '}
                    <code className="bg-muted px-1 rounded">/building-with-history/{'{id}'}</code>, que retorna o
                    histórico completo por tipologia com{' '}
                    <code className="bg-muted px-1 rounded">price_private_area</code> e{' '}
                    <code className="bg-muted px-1 rounded">sold_units</code> — o que ele precisa para calcular VGV
                    com precisão.
                  </p>
                  <p>
                    Abaixo listamos os empreendimentos Verticais em Curitiba para identificar IDs relevantes.
                  </p>
                </>
              }
            >
              <RunButton
                onClick={runBuildings}
                loading={buildingsLoading}
                hasToken={hasToken}
                label={`Buscar /building — Verticais em ${CITY}`}
              />

              {buildingsError && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" /> {buildingsError}
                </p>
              )}

              {buildingRows && (
                <div className="space-y-3">
                  <Callout type="info">
                    Com um <strong>ID</strong> desta lista, chame{' '}
                    <code className="bg-blue-500/10 px-1 rounded">/building-with-history/{'{id}'}</code> para obter
                    o histórico de vendas e preços por tipologia — essa é a fonte correta para VGV por empreendimento.
                  </Callout>

                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">ID</th>
                          <th className="px-3 py-2 text-left font-medium">Nome</th>
                          <th className="px-3 py-2 text-left font-medium">Tipo</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {buildingRows.map((b) => (
                          <tr key={b.id} className="hover:bg-muted/30">
                            <td className="px-3 py-1.5 font-mono text-muted-foreground">{b.id}</td>
                            <td className="px-3 py-1.5">{b.name ?? '—'}</td>
                            <td className="px-3 py-1.5">{b.building_type ?? '—'}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{b.status ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <CopyBtn value={buildingRows} label="Copiar lista de empreendimentos" />
                </div>
              )}
            </StepCard>

          </div>
        </Collapsible>

        {/* Rascunho */}
        <Collapsible title="Rascunho de resposta" icon={<MessageSquare className="h-4 w-4" />}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva aqui a resposta para o cliente..."
            className="w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2.5 text-sm resize-y placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Collapsible>

      </div>
    </div>
  );
}
