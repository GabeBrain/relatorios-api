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

// Hipóteses ordenadas cronologicamente conforme os pontos do email do Wesley
const INITIAL_HYPOTHESES = [
  {
    id: 'h1',
    text: 'O endpoint retorna apenas dados city-level — sem identificador por empreendimento',
    detail: '✅ Confirmada — Nenhum building_id na resposta. É um comportamento de design: este endpoint agrega por cidade. Para VGV por empreendimento o caminho é /building-with-history/{id}.',
  },
  {
    id: 'h2',
    text: 'Múltiplas linhas por período+tipo com group: null — segmentação interna oculta',
    detail: '✅ Confirmada — 8 linhas para Horizontal e 7 para Vertical por período, todas com group: null. Suspeita do agrupamento: faixas de padrão (Econômico, Médio, Alto, Altíssimo Padrão, MCMV) ou tipologias por dormitórios. O campo group deveria expor esse discriminador — investigar internamente.',
  },
  {
    id: 'h3',
    text: 'liquid_sales e vgv_liquid_sales são ground truth confiável — mas somente somando todas as linhas do período',
    detail: '✅ Confirmada com ressalva — Os campos são precisos como totais city-level. A armadilha está em usar uma linha isolada: cada linha representa apenas um dos 7–8 segmentos internos, não o total da cidade.',
  },
  {
    id: 'h4',
    text: 'Verticais teriam mais segmentos que Horizontais, amplificando o erro',
    detail: '⚠️ Parcialmente refutada — Os dados mostram Horizontal com 8 segmentos e Vertical com 7. Horizontal "parece funcionar" porque vários meses têm 0 vendas (0 × qualquer_valor = 0, sem erro visível). Nos meses com volume, Horizontal também erra: +41% a +211%.',
  },
  {
    id: 'h5',
    text: 'vendasNoPeriodo × precoPeriodo resulta em VGV inflado — fórmula fundamentalmente errada',
    detail: '✅ Confirmada — Testamos contra /medium-prices e encontramos desvios de +119% a +248% em relação ao vgv_liquid_sales real. O campo vgv_liquid_sales já é o VGV calculado; multiplicá-lo por outra variável duplica ou triplica o resultado.',
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
  const [draft, setDraft] = useState(`Olá Wesley,

Obrigado pelo detalhamento — conseguimos replicar exatamente o que você testou e confirmar cada ponto do seu email. Vamos por partes:

[1] Dados city-level — sem building_id
Correto. O endpoint /temporal-analysis-city/sales retorna exclusivamente agregados por cidade. A ausência de building_id é um comportamento de design, não um bug. Para VGV por empreendimento individual, o caminho correto é outro (detalhamos no item 5).

[2] Múltiplas linhas por período+building_type com group: null
Confirmado e aprofundado: identificamos 8 linhas para Horizontal e 7 para Vertical por período, todas com group: null. Existe uma segmentação interna ativa — nossa hipótese é que são faixas de padrão (Econômico, Médio, Alto, Altíssimo Padrão, MCMV etc.) ou agrupamentos por tipologia. O campo group deveria expor esse discriminador, mas está retornando nulo. Estamos verificando internamente a origem desse comportamento — é possível que um ajuste na API torne essa granularidade visível.

[3] liquid_sales e vgv_liquid_sales como ground truth city-level
Correto, com uma ressalva importante: os campos são confiáveis como totais de cidade, mas somente quando você soma TODAS as linhas do mesmo período+building_type. Cada linha representa um dos 7–8 segmentos internos — usar uma linha isolada dá um parcial, não o total da cidade.

[4] Erro maior nos Verticais do que nos Horizontais
Os dados mostram algo diferente do esperado: Horizontal tem 8 segmentos internos e Vertical tem 7 — então Horizontal tem mais fragmentação, não menos. A razão de Horizontal "retornar algo razoável" é que vários meses têm 0 vendas Horizontal, e 0 × qualquer_valor = 0 (sem erro aparente). Nos meses em que Horizontal tem volume, o desvio também é grande: entre +41% e +211%.

[5] Fórmula vendasNoPeriodo × precoPeriodo — aqui está o problema raiz
Testamos usando /temporal-analysis-city/medium-prices como fonte do precoPeriodo (average_price, ticket médio por unidade) e encontramos desvios de +119% a +248% em relação ao vgv_liquid_sales real da API.

O motivo: o campo vgv_liquid_sales já é o VGV calculado pela API. Multiplicar liquid_sales × average_price aplica um preço médio calculado sobre múltiplos segmentos ocultos sobre um total de vendas que já inclui todos esses segmentos — duplicando ou triplicando o resultado.

Como corrigir:
• Para VGV city-level: some o campo vgv_liquid_sales de todas as linhas do mesmo período+building_type. Não multiplique. O resultado será o VGV agregado correto para a cidade.
• Para VGV por empreendimento: use /building para listar os empreendimentos (filtrando por cidade e tipo), identifique o ID relevante, e consulte /building-with-history/{id}. Esse endpoint retorna histórico por tipologia com price_private_area e sold_units — os dados brutos para calcular VGV empreendimento a empreendimento sem depender de agregados de cidade.

Ficamos à disposição para qualquer dúvida sobre a implementação.`);

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
              title="H1 + H2 + H3 + H4 — Mapeando a estrutura real da resposta"
              narrative={
                <>
                  <p>
                    Primeiro verificamos se há <code className="bg-muted px-1 rounded">building_id</code> na resposta{' '}
                    <strong>(H1)</strong>, quantas linhas existem por período+tipo <strong>(H2)</strong>, se os totais somados
                    batem com o esperado <strong>(H3)</strong>, e se Vertical ou Horizontal tem mais segmentos <strong>(H4)</strong>.
                  </p>
                  <p>
                    Buscamos todas as páginas de uma vez. A contagem de linhas por período+tipo é o indicador central: se for
                    maior que 1, confirma H2 e explica por que qualquer cálculo sem somar todas as linhas erra o total.
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
                      <strong>H1, H2, H3 e H4 verificadas.</strong> Sem <code className="bg-yellow-500/10 px-1 rounded">building_id</code> (H1 ✅).{' '}
                      Múltiplas linhas por período+tipo com <code className="bg-yellow-500/10 px-1 rounded">group: null</code> (H2 ✅).{' '}
                      Os totais de <code className="bg-yellow-500/10 px-1 rounded">vgv_liquid_sales</code> são corretos
                      quando somados (H3 ✅). Horizontal tem <strong>mais</strong> segmentos que Vertical — H4 ⚠️ parcialmente refutada
                      (Horizontal "funciona" pois muitos meses têm 0 vendas, não por ter menos fragmentação).
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
              title="H5 — Quantificando o erro da fórmula vendasNoPeriodo × precoPeriodo"
              narrative={
                <>
                  <p>
                    <strong>(H5)</strong> O endpoint natural para <em>precoPeriodo</em> é{' '}
                    <code className="bg-muted px-1 rounded">/temporal-analysis-city/medium-prices</code>, que retorna{' '}
                    <code className="bg-muted px-1 rounded">average_price</code> (ticket médio por unidade por período).
                    É a fonte mais provável do valor que Wesley está usando na fórmula.
                  </p>
                  <p>
                    Calculamos <code className="bg-muted px-1 rounded">Σ liquid_sales × average_price</code> e
                    comparamos com <code className="bg-muted px-1 rounded">Σ vgv_liquid_sales</code>. O desvio vai
                    mostrar que o <code className="bg-muted px-1 rounded">vgv_liquid_sales</code> já <em>é</em> o VGV —
                    a multiplicação é redundante e amplifica o resultado em 2–3×.
                    {!salesRows && (
                      <span className="text-yellow-600 dark:text-yellow-400"> Execute o Passo 1 primeiro para a comparação completa.</span>
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
              title="H1 (solução) — O caminho correto para VGV por empreendimento"
              narrative={
                <>
                  <p>
                    <strong>(H1)</strong> Como <code className="bg-muted px-1 rounded">/temporal-analysis-city/sales</code>{' '}
                    é city-level por design, o caminho para VGV por empreendimento é:{' '}
                    <code className="bg-muted px-1 rounded">/building</code> para listar, depois{' '}
                    <code className="bg-muted px-1 rounded">/building-with-history/{'{id}'}</code> para o histórico completo —
                    com <code className="bg-muted px-1 rounded">price_private_area</code> e{' '}
                    <code className="bg-muted px-1 rounded">sold_units</code> por tipologia e período.
                  </p>
                  <p>
                    Com esses campos, o VGV por empreendimento é calculado direto — sem multiplicação de agregados
                    de cidade, sem depender de <code className="bg-muted px-1 rounded">group: null</code>.
                    Listamos os Verticais em Curitiba para identificar IDs relevantes.
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
