import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  Copy,
  FileJson,
  FlaskConical,
  Hash,
  Info,
  Lightbulb,
  ListChecks,
  Loader2,
  Mail,
  MessageSquare,
  Play,
  Search,
  Square,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

const BASE_URL = 'https://geobrain.com.br/public-api';
const CITY = 'Curitiba';
const UF = 'PR';
const BUILDING_TYPE = 'Vertical';
const CLIENT_KEYWORD = 'Piemonte';
const MAX_LIST_PAGES = 10;

const CASE = {
  client: 'Wesley dos Santos',
  company: 'Piemonte',
  date: '2026-04-29',
  endpoint: '/building-with-history/{id} -> typologies_history[].release_price',
  title: 'Release price no histórico de empreendimento',
  status: 'Preparando análise' as const,
};

const INITIAL_HYPOTHESES = [
  {
    id: 'h1',
    text: 'release_price é um campo do histórico de tipologias, não um endpoint independente',
    detail:
      'Pelo contrato OpenAPI, o recurso é BuildingWithHistoricResource. O campo fica em data.typologies_history[].release_price dentro de /building-with-history ou /building-with-history/{id}.',
  },
  {
    id: 'h2',
    text: 'release_price deve representar o preço de lançamento da tipologia',
    detail:
      'A expectativa técnica é que seja um valor de referência da tipologia. O teste verifica se ele permanece estável ao longo dos períodos de uma mesma tipologia.',
  },
  {
    id: 'h3',
    text: 'release_price não deve ser tratado como preço corrente nem como VGV',
    detail:
      'A investigação compara release_price com price, price_private_area, vgv_total e vgv_stock para separar preço de lançamento, preço do período e métricas de VGV.',
  },
];

type Params = Record<string, string | string[]>;

interface IncorporatorResource {
  name?: string;
  [key: string]: unknown;
}

interface TypologyHistoryRow {
  typology_id?: string;
  type_of_typology?: string;
  garage?: string;
  qty?: string;
  number_bedroom?: string;
  private_area?: number | string;
  public_area?: number | string;
  release_price?: number | string | null;
  period?: string;
  price?: number | string | null;
  price_private_area?: number | string | null;
  price_public_area?: number | string | null;
  vgv_total?: number | string | null;
  vgv_stock?: number | string | null;
  typology_stock?: string;
  sold?: string;
  sold_in_period?: string;
  [key: string]: unknown;
}

interface BuildingWithHistory {
  building_id: string;
  name?: string;
  city?: string;
  state?: string;
  building_type?: string;
  status?: string;
  builder_name?: string;
  incorporators?: IncorporatorResource[];
  typologies_history?: TypologyHistoryRow[];
  [key: string]: unknown;
}

interface TypologySummary {
  key: string;
  typologyId: string;
  label: string;
  periods: number;
  missingReleasePrice: number;
  releaseValues: number[];
  releaseMin: number | null;
  releaseMax: number | null;
  firstPeriod: string;
  lastPeriod: string;
  latestPrice: number | null;
  latestPrivateAreaPrice: number | null;
  latestVgvTotal: number | null;
  latestVgvStock: number | null;
  variationFromReleasePct: number | null;
  changed: boolean;
}

function buildUrl(path: string, params: Params = {}, page?: number, perPage = 30): string {
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(`${key}[]`, item));
    else url.searchParams.set(key, value);
  }
  if (page) url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  return url.toString();
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.message ? `: ${body.message}` : '';
    } catch {
      detail = '';
    }
    throw new Error(`HTTP ${res.status}${detail}`);
  }

  return res.json();
}

async function fetchAllPages<T>(
  path: string,
  params: Params,
  token: string,
  onProgress?: (message: string) => void,
): Promise<T[]> {
  onProgress?.('Buscando página 1...');
  const first = await fetchJson<{ data?: T[]; meta?: { last_page?: number } }>(
    buildUrl(path, params, 1),
    token,
  );

  const all = [...(first.data ?? [])];
  const apiLastPage = first.meta?.last_page ?? 1;
  const lastPage = Math.min(apiLastPage, MAX_LIST_PAGES);

  if (lastPage > 1) {
    onProgress?.(`Buscando páginas 2 a ${lastPage}...`);
    for (let page = 2; page <= lastPage; page += 1) {
      const next = await fetchJson<{ data?: T[] }>(buildUrl(path, params, page), token);
      all.push(...(next.data ?? []));
    }
  }

  onProgress?.(
    apiLastPage > MAX_LIST_PAGES
      ? `Listagem limitada às primeiras ${MAX_LIST_PAGES} páginas.`
      : '',
  );
  return all;
}

async function fetchBuilding(id: string, token: string): Promise<BuildingWithHistory> {
  const json = await fetchJson<{ data: BuildingWithHistory }>(
    `${BASE_URL}/building-with-history/${encodeURIComponent(id)}`,
    token,
  );
  return json.data;
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function fmtBRL(value: number | null | undefined) {
  if (value === null || value === undefined) return 'N/D';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function fmtNum(value: number | null | undefined) {
  if (value === null || value === undefined) return 'N/D';
  return value.toLocaleString('pt-BR');
}

function fmtPct(value: number | null | undefined) {
  if (value === null || value === undefined) return 'N/D';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function normalize(value: string | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function buildingMatchesClient(building: BuildingWithHistory) {
  const target = normalize(CLIENT_KEYWORD);
  const haystack = [
    building.name,
    building.builder_name,
    ...(building.incorporators ?? []).map((incorporator) => incorporator.name),
  ]
    .map(normalize)
    .join(' ');

  return haystack.includes(target);
}

function getIncorporatorsLabel(building: BuildingWithHistory) {
  const names = (building.incorporators ?? [])
    .map((incorporator) => incorporator.name)
    .filter(Boolean);

  return names.length ? names.join(', ') : building.builder_name ?? 'N/D';
}

function typologyKey(row: TypologyHistoryRow) {
  return [
    row.typology_id,
    row.type_of_typology,
    row.number_bedroom,
    row.private_area,
    row.garage,
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .join('|');
}

function typologyLabel(row: TypologyHistoryRow) {
  return [
    row.type_of_typology,
    row.number_bedroom ? `${row.number_bedroom} dorm.` : null,
    row.private_area ? `${row.private_area} m²` : null,
    row.garage ? `${row.garage} vaga(s)` : null,
  ]
    .filter(Boolean)
    .join(' | ') || 'Tipologia sem descrição';
}

function summarizeTypologies(rows: TypologyHistoryRow[]): TypologySummary[] {
  const map = new Map<string, TypologyHistoryRow[]>();

  for (const row of rows) {
    const key = typologyKey(row) || `sem-id-${map.size}`;
    map.set(key, [...(map.get(key) ?? []), row]);
  }

  return Array.from(map.entries())
    .map(([key, entries]) => {
      const sorted = [...entries].sort((a, b) => String(a.period ?? '').localeCompare(String(b.period ?? '')));
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];
      const releaseValues = Array.from(
        new Set(sorted.map((row) => toNum(row.release_price)).filter((value): value is number => value !== null)),
      ).sort((a, b) => a - b);
      const releaseMin = releaseValues[0] ?? null;
      const releaseMax = releaseValues[releaseValues.length - 1] ?? null;
      const latestPrice = toNum(latest?.price);
      const variationFromReleasePct =
        releaseMin && latestPrice ? ((latestPrice - releaseMin) / releaseMin) * 100 : null;

      return {
        key,
        typologyId: String(first?.typology_id ?? 'N/D'),
        label: typologyLabel(first),
        periods: sorted.length,
        missingReleasePrice: sorted.filter((row) => toNum(row.release_price) === null).length,
        releaseValues,
        releaseMin,
        releaseMax,
        firstPeriod: String(first?.period ?? 'N/D'),
        lastPeriod: String(latest?.period ?? 'N/D'),
        latestPrice,
        latestPrivateAreaPrice: toNum(latest?.price_private_area),
        latestVgvTotal: toNum(latest?.vgv_total),
        latestVgvStock: toNum(latest?.vgv_stock),
        variationFromReleasePct,
        changed: releaseValues.length > 1,
      };
    })
    .sort((a, b) => a.typologyId.localeCompare(b.typologyId));
}

function Collapsible({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
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
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        {label}
      </button>
      {progress && <span className="text-xs text-muted-foreground">{progress}</span>}
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
      className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiado' : label}
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
  narrative: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {step}
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">{narrative}</div>
        </div>
      </div>
      <div className="ml-8 space-y-3">{children}</div>
    </div>
  );
}

function Callout({ type, children }: { type: 'info' | 'warning' | 'success'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-xs leading-relaxed',
        type === 'info' && 'border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-400',
        type === 'warning' && 'border-yellow-500/20 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400',
        type === 'success' && 'border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400',
      )}
    >
      {children}
    </div>
  );
}

function ReleasePriceSummary({ building }: { building: BuildingWithHistory }) {
  const history = useMemo(() => building.typologies_history ?? [], [building.typologies_history]);
  const summary = useMemo(() => summarizeTypologies(history), [history]);
  const missingCount = summary.reduce((total, item) => total + item.missingReleasePrice, 0);
  const changedCount = summary.filter((item) => item.changed).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-muted px-2 py-1">
          Empreendimento: <strong>{building.name ?? building.building_id}</strong>
        </span>
        <span className="rounded bg-muted px-2 py-1">
          Históricos: <strong>{history.length}</strong>
        </span>
        <span className="rounded bg-muted px-2 py-1">
          Tipologias: <strong>{summary.length}</strong>
        </span>
        <span
          className={cn(
            'rounded px-2 py-1 font-medium',
            missingCount > 0 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'bg-green-500/10 text-green-600 dark:text-green-400',
          )}
        >
          release_price ausente: <strong>{missingCount}</strong>
        </span>
        <span
          className={cn(
            'rounded px-2 py-1 font-medium',
            changedCount > 0 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-500/10 text-green-600 dark:text-green-400',
          )}
        >
          tipologias com variação: <strong>{changedCount}</strong>
        </span>
      </div>

      {changedCount > 0 ? (
        <Callout type="warning">
          Encontramos mais de um valor de release_price para pelo menos uma tipologia. Isso deve ser investigado antes de responder ao cliente, porque o campo é descrito como preço de lançamento.
        </Callout>
      ) : (
        <Callout type="success">
          Nesta amostra, release_price está estável por tipologia. Isso reforça a leitura de que o campo é referência de lançamento, não preço corrente.
        </Callout>
      )}

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Tipologia</th>
              <th className="px-3 py-2 text-left font-medium">Períodos</th>
              <th className="px-3 py-2 text-right font-medium">Release min</th>
              <th className="px-3 py-2 text-right font-medium">Release max</th>
              <th className="px-3 py-2 text-right font-medium">Preço último período</th>
              <th className="px-3 py-2 text-right font-medium">Variação vs release</th>
              <th className="px-3 py-2 text-right font-medium">VGV total</th>
              <th className="px-3 py-2 text-right font-medium">VGV estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summary.map((row) => (
              <tr key={row.key} className={cn('hover:bg-muted/30', row.changed && 'bg-red-500/5')}>
                <td className="px-3 py-1.5">
                  <div className="font-medium">{row.label}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">ID {row.typologyId}</div>
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">
                  {row.periods} ({row.firstPeriod} a {row.lastPeriod})
                </td>
                <td className="px-3 py-1.5 text-right">{fmtBRL(row.releaseMin)}</td>
                <td className={cn('px-3 py-1.5 text-right', row.changed && 'font-medium text-red-500')}>
                  {fmtBRL(row.releaseMax)}
                </td>
                <td className="px-3 py-1.5 text-right">{fmtBRL(row.latestPrice)}</td>
                <td className="px-3 py-1.5 text-right">{fmtPct(row.variationFromReleasePct)}</td>
                <td className="px-3 py-1.5 text-right">{fmtBRL(row.latestVgvTotal)}</td>
                <td className="px-3 py-1.5 text-right">{fmtBRL(row.latestVgvStock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyBtn value={summary} label="Copiar resumo" />
        <CopyBtn value={building} label="Copiar bruto" />
      </div>
    </div>
  );
}

export default function TQPiemonteReleasePrice() {
  const token = useAuthStore((state) => state.getToken()) ?? '';
  const hasToken = !!token;

  const [email, setEmail] = useState(`Gabriel, obrigado pelo retorno, consegui resolver a questão dos períodos e os seus lançamentos, testei para Curitiba, O fetch inicial agora baixa 13k+ prédios com histórico.

Outro ponto que estou tendo um pouco de dificuldade é na questão de valor do m² atual e lançado,

Como /building não retorna release_price (só price), onde consigo essas duas métricas?

Sempre que tento buscar em BuildingWithHistoricResource/release_price, não consigo retornar os valores.`);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState(`Olá Wesley,

Vamos analisar o campo release_price dentro do histórico de empreendimento.

Ponto técnico inicial
No contrato da API, release_price aparece dentro de data.typologies_history[] no recurso BuildingWithHistoricResource. Ou seja: a chamada correta para investigar esse campo é /building-with-history/{id}; release_price não parece ser um endpoint isolado.

Leitura que vamos validar
release_price deve representar o preço de lançamento da tipologia. Por isso, vamos verificar se ele se mantém estável por tipologia ao longo dos períodos e comparar com price, price_private_area, vgv_total e vgv_stock para separar preço de lançamento, preço corrente e VGV.

Resultado da investigação
[preencher após executar os testes]
`);

  const [buildings, setBuildings] = useState<BuildingWithHistory[] | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listProgress, setListProgress] = useState('');
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingWithHistory | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const draftRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (draftRef.current) {
      draftRef.current.style.height = 'auto';
      draftRef.current.style.height = `${draftRef.current.scrollHeight}px`;
    }
  }, [draft]);

  const clientBuildings = useMemo(
    () => (buildings ?? []).filter(buildingMatchesClient),
    [buildings],
  );

  async function runList() {
    setListLoading(true);
    setListError(null);
    setListProgress('');

    try {
      const rows = await fetchAllPages<BuildingWithHistory>(
        '/building-with-history',
        { city: CITY, uf: UF, type: BUILDING_TYPE },
        token,
        setListProgress,
      );

      setBuildings(rows);
      const firstClientBuilding = rows.find(buildingMatchesClient);
      if (firstClientBuilding && !selectedId) {
        setSelectedId(firstClientBuilding.building_id);
      }
    } catch (error) {
      setListError(String(error));
    } finally {
      setListLoading(false);
    }
  }

  async function runDetail(id = selectedId) {
    const cleanId = id.trim();
    if (!cleanId) {
      setDetailError('Informe um building_id para consultar.');
      return;
    }

    setSelectedId(cleanId);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const building = await fetchBuilding(cleanId, token);
      setSelectedBuilding(building);
    } catch (error) {
      setDetailError(String(error));
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold">{CASE.title}</h1>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{CASE.endpoint}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Clock className="h-3 w-3" />
              {CASE.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {CASE.client}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {CASE.company}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {new Date(CASE.date).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        <hr className="border-border" />

        <Collapsible title="Email original" icon={<Mail className="h-4 w-4" />}>
          <textarea
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email original do cliente"
            className="min-h-44 w-full resize-y rounded-md border border-border bg-background px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Collapsible>

        <Collapsible title="Hipóteses" icon={<Lightbulb className="h-4 w-4" />}>
          <div className="space-y-3">
            {INITIAL_HYPOTHESES.map((hypothesis) => (
              <div key={hypothesis.id} className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setChecked((prev) => ({ ...prev, [hypothesis.id]: !prev[hypothesis.id] }))}
                  className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                >
                  {checked[hypothesis.id] ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
                <div>
                  <p className={cn('text-sm font-medium', checked[hypothesis.id] && 'text-muted-foreground line-through')}>
                    {hypothesis.text}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hypothesis.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>

        <Collapsible title="Testes e investigação" icon={<FlaskConical className="h-4 w-4" />}>
          <div className="space-y-6 pt-1">
            <StepCard
              step={1}
              title="Contrato do recurso"
              narrative={
                <>
                  <p>
                    Primeiro tratamos a ambiguidade do nome informado: <code className="rounded bg-muted px-1">BuildingWithHistoricResource/release_price</code> é a leitura do schema, não a URL final.
                  </p>
                  <p>
                    A chamada investigada é <code className="rounded bg-muted px-1">GET /building-with-history/{'{id}'}</code>, e o campo fica em <code className="rounded bg-muted px-1">data.typologies_history[].release_price</code>.
                  </p>
                </>
              }
            >
              <Callout type="info">
                O teste deve responder três perguntas: o campo vem preenchido, fica estável por tipologia e como ele se diferencia de price, price_private_area e VGV.
              </Callout>
            </StepCard>

            <div className="border-t border-border" />

            <StepCard
              step={2}
              title="Localizar empreendimentos Piemonte"
              narrative={
                <>
                  <p>
                    Buscamos <code className="rounded bg-muted px-1">/building-with-history</code> em {CITY}/{UF}, tipo {BUILDING_TYPE}, e filtramos localmente por nome, construtora ou incorporadora contendo Piemonte.
                  </p>
                  <p>
                    A listagem é limitada às primeiras {MAX_LIST_PAGES} páginas para evitar uma chamada muito pesada; se o ID já for conhecido, use o campo do passo 3 diretamente.
                  </p>
                </>
              }
            >
              <RunButton
                onClick={runList}
                loading={listLoading}
                hasToken={hasToken}
                label={`Buscar ${CLIENT_KEYWORD} em /building-with-history`}
                progress={listProgress}
              />

              {listError && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {listError}
                </p>
              )}

              {buildings && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-muted px-2 py-1">
                      Registros carregados: <strong>{buildings.length}</strong>
                    </span>
                    <span
                      className={cn(
                        'rounded px-2 py-1 font-medium',
                        clientBuildings.length > 0
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
                      )}
                    >
                      Matches Piemonte: <strong>{clientBuildings.length}</strong>
                    </span>
                  </div>

                  {clientBuildings.length === 0 ? (
                    <Callout type="warning">
                      Nenhum empreendimento Piemonte apareceu na amostra carregada. Se você tiver o building_id do caso, informe no passo 3 para consultar diretamente.
                    </Callout>
                  ) : (
                    <div className="overflow-x-auto rounded border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">ID</th>
                            <th className="px-3 py-2 text-left font-medium">Empreendimento</th>
                            <th className="px-3 py-2 text-left font-medium">Status</th>
                            <th className="px-3 py-2 text-left font-medium">Construtora/Incorporadora</th>
                            <th className="px-3 py-2 text-right font-medium">Históricos</th>
                            <th className="px-3 py-2 text-right font-medium">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {clientBuildings.map((building) => (
                            <tr key={building.building_id} className="hover:bg-muted/30">
                              <td className="px-3 py-1.5 font-mono text-muted-foreground">{building.building_id}</td>
                              <td className="px-3 py-1.5">{building.name ?? 'N/D'}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{building.status ?? 'N/D'}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{getIncorporatorsLabel(building)}</td>
                              <td className="px-3 py-1.5 text-right">{fmtNum(building.typologies_history?.length ?? 0)}</td>
                              <td className="px-3 py-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => runDetail(building.building_id)}
                                  className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent"
                                >
                                  Analisar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <CopyBtn value={clientBuildings.length ? clientBuildings : buildings} label="Copiar listagem" />
                </div>
              )}
            </StepCard>

            <div className="border-t border-border" />

            <StepCard
              step={3}
              title="Inspecionar release_price por tipologia"
              narrative={
                <>
                  <p>
                    Com um <code className="rounded bg-muted px-1">building_id</code>, buscamos o histórico individual e agrupamos por tipologia para validar preenchimento, estabilidade e diferença contra preço corrente e VGV.
                  </p>
                </>
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  building_id
                </label>
                <input
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  placeholder="Ex: 12345"
                  className="h-8 w-40 rounded-md border border-border bg-background px-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <RunButton
                  onClick={() => runDetail()}
                  loading={detailLoading}
                  hasToken={hasToken}
                  label="Buscar histórico"
                />
              </div>

              {detailError && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {detailError}
                </p>
              )}

              {selectedBuilding && <ReleasePriceSummary building={selectedBuilding} />}
            </StepCard>

            <div className="border-t border-border" />

            <StepCard
              step={4}
              title="Checklist para fechar a resposta"
              narrative={
                <>
                  <p>
                    Este bloco traduz os achados técnicos para uma resposta objetiva ao cliente depois que o email e os IDs específicos forem confirmados.
                  </p>
                </>
              }
            >
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                    <Info className="h-3.5 w-3.5" />
                    Confirmar definição
                  </div>
                  release_price é preço de lançamento da tipologia no histórico do empreendimento.
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                    <ListChecks className="h-3.5 w-3.5" />
                    Validar estabilidade
                  </div>
                  Se variar por período, separar bug de dado, regra de negócio ou mudança cadastral.
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                    <Search className="h-3.5 w-3.5" />
                    Comparar campos
                  </div>
                  price e price_private_area descrevem o período; vgv_total e vgv_stock descrevem valor agregado.
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                    <FileJson className="h-3.5 w-3.5" />
                    Evidenciar com JSON
                  </div>
                  Anexar um trecho bruto do empreendimento testado para sustentar a conclusão.
                </div>
              </div>
            </StepCard>
          </div>
        </Collapsible>

        <Collapsible title="Rascunho de resposta" icon={<MessageSquare className="h-4 w-4" />}>
          <textarea
            ref={draftRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escreva aqui a resposta para o cliente..."
            className="w-full resize-none overflow-hidden rounded-md border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            rows={1}
          />
        </Collapsible>
      </div>
    </div>
  );
}
