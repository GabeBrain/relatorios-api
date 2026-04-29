import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  Clock,
  Copy,
  FlaskConical,
  Hash,
  Loader2,
  Mail,
  MessageSquare,
  Play,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

const BASE_URL = 'https://geobrain.com.br/public-api';
const CITY = 'Curitiba';
const UF = 'PR';
const BUILDING_TYPE = 'Vertical';

const CASE = {
  client: 'Wesley dos Santos',
  company: 'Piemonte',
  date: '2026-04-29',
  endpoint: '/building-with-history/{id} -> typologies_history[].release_price',
  title: 'Release price no histórico de empreendimento',
  status: 'Preparando análise' as const,
};

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
  releaseOldest: number | null;
  releaseOldestPeriod: string;
  releaseMin: number | null;
  releaseMax: number | null;
  currentLatest: number | null;
  currentLatestPeriod: string;
  currentPrivateAreaPrice: number | null;
  releasePrivateAreaPrice: number | null;
  changed: boolean;
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
      const releaseRows = sorted.filter((row) => toNum(row.release_price) !== null);
      const currentRows = sorted.filter((row) => toNum(row.price) !== null || toNum(row.price_private_area) !== null);
      const releaseOldestRow = releaseRows[0];
      const currentLatestRow = currentRows[currentRows.length - 1] ?? sorted[sorted.length - 1];
      const privateArea = toNum(first?.private_area);
      const releaseValues = Array.from(
        new Set(releaseRows.map((row) => toNum(row.release_price)).filter((value): value is number => value !== null)),
      ).sort((a, b) => a - b);
      const releaseMin = releaseValues[0] ?? null;
      const releaseMax = releaseValues[releaseValues.length - 1] ?? null;
      const releaseOldest = toNum(releaseOldestRow?.release_price);

      return {
        key,
        typologyId: String(first?.typology_id ?? 'N/D'),
        label: typologyLabel(first),
        periods: sorted.length,
        missingReleasePrice: sorted.filter((row) => toNum(row.release_price) === null).length,
        releaseOldest,
        releaseOldestPeriod: String(releaseOldestRow?.period ?? 'N/D'),
        releaseMin,
        releaseMax,
        currentLatest: toNum(currentLatestRow?.price),
        currentLatestPeriod: String(currentLatestRow?.period ?? 'N/D'),
        currentPrivateAreaPrice: toNum(currentLatestRow?.price_private_area),
        releasePrivateAreaPrice: releaseOldest && privateArea ? releaseOldest / privateArea : null,
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

function formatReleaseCell(row: TypologySummary) {
  if (row.releaseOldest === null) return 'N/D';
  if (row.releaseMin !== null && row.releaseMax !== null && row.releaseMin !== row.releaseMax) {
    return `${fmtBRL(row.releaseMin)} / ${fmtBRL(row.releaseMax)}`;
  }
  return fmtBRL(row.releaseOldest);
}

function ReleasePriceDiagram() {
  const steps = [
    {
      title: 'Encontrar o empreendimento',
      endpoint: 'GET /building-with-history',
      params: `city=${CITY}  uf=${UF}  type=${BUILDING_TYPE}`,
      description: 'Lista empreendimentos com histórico e retorna os building_id. Se você já tem o ID, pule direto para o passo 2.',
      sample: '{ "building_id": "1423", "name": "Residencial X", "building_type": "Vertical" }\n{ "building_id": "1891", "name": "Empreendimento Y", "building_type": "Vertical" }\n...',
    },
    {
      title: 'Consultar um empreendimento específico',
      endpoint: 'GET /building-with-history/{id}',
      params: 'ex: id = 1423',
      description: 'Retorna o histórico por tipologia e período dentro de data.typologies_history[].',
      sample: '{ "period": "2024-01-01", "private_area": 65,\n  "release_price": 520000, "price": 610000,\n  "price_private_area": 9384.62 }\n{ "period": "2024-02-01", "private_area": 65,\n  "release_price": 520000, "price": 625000,\n  "price_private_area": 9615.38 }',
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="border-b border-border bg-muted/40 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Diagrama — caminho para release e current price
        </p>
      </div>
      <div className="p-4">
        {steps.map((step, index) => (
          <div key={step.title} className="flex gap-3">
            <div className="flex shrink-0 flex-col items-center">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              {index < steps.length - 1 && <div className="my-1 min-h-8 w-px flex-1 bg-border" />}
            </div>
            <div className={cn('flex-1', index < steps.length - 1 && 'pb-4')}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                  {step.endpoint}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{step.params}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
              <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-background/70 p-3 text-xs text-muted-foreground">
                {step.sample}
              </pre>
            </div>
          </div>
        ))}

        <div className="flex gap-3">
          <div className="flex shrink-0 flex-col items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-xs font-bold text-green-600 dark:text-green-400">
              3
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs text-muted-foreground">
              Campos para responder à dúvida do cliente:
            </p>
            <div className="rounded-md border border-green-500/20 bg-green-500/5 p-3 font-mono text-xs text-green-700 dark:text-green-400">
              <div>valor lançado = release_price</div>
              <div>m² lançado = release_price / private_area</div>
              <div>valor atual = price no período mais recente</div>
              <div>m² atual = price_private_area no período mais recente</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Não existe rota <code className="rounded bg-muted px-1">/BuildingWithHistoricResource/release_price</code>; esse é um campo dentro do JSON retornado.
            </p>
          </div>
        </div>
      </div>
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
          Encontramos mais de um valor de release_price para pelo menos uma tipologia. A tabela mostra os dois extremos no mesmo campo para facilitar a revisão.
        </Callout>
      ) : (
        <Callout type="success">
          Nesta amostra, release_price está estável por tipologia. Isso reforça a leitura de que o campo é referência de lançamento, enquanto price/price_private_area representam o período atual.
        </Callout>
      )}

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Tipologia</th>
              <th className="px-3 py-2 text-right font-medium">Release price</th>
              <th className="px-3 py-2 text-left font-medium">Data release</th>
              <th className="px-3 py-2 text-right font-medium">m² lançado</th>
              <th className="px-3 py-2 text-right font-medium">Current price</th>
              <th className="px-3 py-2 text-left font-medium">Data current</th>
              <th className="px-3 py-2 text-right font-medium">m² atual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summary.map((row) => (
              <tr key={row.key} className={cn('hover:bg-muted/30', row.changed && 'bg-red-500/5')}>
                <td className="px-3 py-1.5">
                  <div className="font-medium">{row.label}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    ID {row.typologyId} · {row.periods} períodos
                  </div>
                </td>
                <td className={cn('px-3 py-1.5 text-right', row.changed && 'font-medium text-red-500')}>
                  {formatReleaseCell(row)}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{row.releaseOldestPeriod}</td>
                <td className="px-3 py-1.5 text-right">{fmtBRL(row.releasePrivateAreaPrice)}</td>
                <td className="px-3 py-1.5 text-right">{fmtBRL(row.currentLatest)}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{row.currentLatestPeriod}</td>
                <td className="px-3 py-1.5 text-right">{fmtBRL(row.currentPrivateAreaPrice)}</td>
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
  const [draft, setDraft] = useState(`Olá Wesley,

Obrigado pelo retorno. Que bom que a questão dos períodos e lançamentos ficou resolvida.

Sobre a dúvida de valor do m² atual e lançado: a diferença principal está na forma de acessar o recurso.

A versão sem ID, /building-with-history, serve para descobrir/listar empreendimentos com filtros e paginação. É útil para encontrar os building_id, por exemplo filtrando por cidade, UF e tipo do empreendimento.

A versão com ID, /building-with-history/{id}, serve para consultar diretamente um empreendimento específico. Nessa resposta vem o histórico detalhado por tipologia e período, dentro de data.typologies_history[].

O campo release_price fica dentro desse histórico de tipologias do empreendimento. Então ele é acessível via /building-with-history/{id}, lendo data.typologies_history[].release_price. Ele não é uma rota separada, por isso /BuildingWithHistoricResource/release_price não retorna valores.

Para montar as métricas:
- valor lançado: data.typologies_history[].release_price
- m² lançado: release_price dividido por private_area, quando release_price representa o valor total da unidade
- valor atual: price no período mais recente da tipologia
- m² atual: price_private_area no período mais recente da tipologia

Em resumo: se você já está baixando os prédios com histórico, não precisa fazer uma chamada separada para release_price. O caminho é acessar esse campo dentro de cada item de typologies_history, preferencialmente usando /building-with-history/{id} quando quiser validar um empreendimento específico.

Se quiser, podemos validar juntos um building_id específico para confirmar os campos retornados em uma tipologia real.`);

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

        <Collapsible title="Testes e investigação" icon={<FlaskConical className="h-4 w-4" />}>
          <div className="space-y-6 pt-1">
            <StepCard
              step={1}
              title="Inspecionar release_price por tipologia"
              narrative={
                <>
                  <p>
                    Com um <code className="rounded bg-muted px-1">building_id</code>, buscamos o histórico individual em <code className="rounded bg-muted px-1">/building-with-history/{'{id}'}</code> e agrupamos por tipologia.
                  </p>
                  <p>O objetivo é comparar o release mais antigo com o current mais novo e confirmar as datas usadas em cada métrica.</p>
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
          </div>
        </Collapsible>

        <Collapsible title="Diagrama de acesso" icon={<MessageSquare className="h-4 w-4" />}>
          <ReleasePriceDiagram />
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
