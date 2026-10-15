import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GeoApiScopeSelector, useGeoApiScope, type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { availableEndQuarters } from '@/features/panorama-secovi-fiergs/domain/quarters';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { useAuthStore } from '@/store/auth-store';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { buildSpPreview, SP_INSTITUTIONAL, type SpPreview } from './model';
import { buildSpTemporalPreview } from './temporal';
import { SpReportPages } from './SpReportPages';
import { buildSpTypologies } from './typologies';

const labels = { projects: 'Empreendimentos lançados', launches: 'Unidades lançadas', sales: 'Vendas líquidas', stock: 'Oferta final' } as const;
const formatMonth = (value: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
const sameCity = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'sao paulo';

export default function SpInstitutionalPage() {
  const [geo, setGeo] = useState<GeoScope>({ uf: '', city: '' });
  const [quarter, setQuarter] = useState<Quarter>('3T2026');
  const [preview, setPreview] = useState<{ key: string; report: SpPreview } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [typologyError, setTypologyError] = useState(false);
  const version = useRef(0);
  const controller = useRef(new AbortController());
  const lastMode = useRef<'api' | 'fixture'>('api');
  const [progress, setProgress] = useState('Preparando consulta…');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const token = useAuthStore(state => state.getToken());
  const invalidate = useCallback(() => { controller.current.abort(); controller.current = new AbortController(); version.current += 1; setPreview(null); setLoading(false); setError(false); setTypologyError(false); setStartedAt(null); }, []);
  useEffect(() => { invalidate(); return () => { controller.current.abort(); version.current += 1; }; }, [token, invalidate]);
  const changeGeo = (next: GeoScope) => { invalidate(); setGeo(next); };
  const scope = useGeoApiScope({ value: geo, onChange: changeGeo });
  const supported = geo.uf === 'SP' && sameCity(geo.city);
  const ready = scope.strictReady && scope.hasToken && !scope.isLoading && !scope.error && supported;
  const key = `${geo.uf}/${geo.city}/${quarter}`;
  const report = ready && preview?.key === key ? preview.report : null;
  const isApi = report?.source === 'api' || report?.source === 'recorded-api';

  async function preparePreview(mode: 'api' | 'fixture') {
    if (!ready || loading) return;
    controller.current.abort(); controller.current = new AbortController();
    const signal = controller.current.signal;
    lastMode.current = mode;
    const requestVersion = ++version.current;
    setLoading(true); setError(false); setTypologyError(false); setPreview(null); setStartedAt(Date.now()); setProgress(mode === 'api' ? 'Conferindo os meses disponíveis…' : 'Preparando o exemplo do estudo…');
    try {
      let next: SpPreview;
      if (mode === 'api') {
        const { fetchSpTemporalInput } = await import('./api');
        const input = await fetchSpTemporalInput(quarter, { signal, onProgress: message => { if (requestVersion === version.current) setProgress(message); } });
        next = buildSpTemporalPreview(input, quarter);
      } else {
        const { spFixture } = await import('./fixture');
        next = buildSpPreview(spFixture(), quarter);
      }
      if (requestVersion === version.current) setPreview({ key, report: next });
    } catch {
      if (requestVersion === version.current) setError(true);
    } finally {
      if (requestVersion === version.current) setLoading(false);
    }
  }

  async function prepareTypologies() {
    if (!ready || loading || !isApi || report?.status !== 'partial') return;
    controller.current.abort(); controller.current = new AbortController();
    const requestVersion = ++version.current;
    const signal = controller.current.signal;
    setLoading(true); setTypologyError(false); setStartedAt(Date.now()); setProgress('Conferindo as tipologias nos mesmos meses…');
    // Remove an earlier breakdown while retaining the municipal baseline for comparison.
    const baseline = { ...report, typologies: undefined };
    setPreview({ key, report: baseline });
    try {
      const { fetchSpTemporalInput } = await import('./api');
      const input = await fetchSpTemporalInput(quarter, { groupBy: 'Tipologia', signal, onProgress: message => { if (requestVersion === version.current) setProgress(message); } });
      const typologies = buildSpTypologies(input, baseline);
      if (requestVersion === version.current) setPreview({ key, report: { ...baseline, typologies } });
    } catch {
      if (requestVersion === version.current) setTypologyError(true);
    } finally {
      if (requestVersion === version.current) setLoading(false);
    }
  }

  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relatórios institucionais</p>
      <h1 className="text-2xl font-semibold">{SP_INSTITUTIONAL.label}</h1>
      <p className="text-sm text-muted-foreground">Núcleo residencial vertical de São Paulo capital.</p>
    </header>
    <Alert><AlertTitle>{report && !isApi ? 'Prévia de desenvolvimento · dados fictícios' : 'Conferência municipal · relatório em validação'}</AlertTitle><AlertDescription>
      {report && !isApi ? 'Os números do exemplo não representam o mercado.' : 'A consulta curta confere lançamentos, vendas e estoque até o limite informado na amostra. A contagem de empreendimentos depende da coleta granular completa.'} Não há exportação disponível nesta etapa.
    </AlertDescription></Alert>
    <section aria-label="Seleção do estudo" className="space-y-4 rounded-lg border border-border bg-card p-4">
      {scope.error ? <Alert variant="destructive"><AlertTitle>Não foi possível carregar as cidades autorizadas</AlertTitle><AlertDescription><p>Confira sua autenticação e tente novamente. O estudo permanece bloqueado.</p><Button className="mt-3" variant="outline" onClick={scope.reload}>Tentar carregar cidades novamente</Button></AlertDescription></Alert>
        : <GeoApiScopeSelector value={geo} onChange={changeGeo} disabled={loading} />}
      {scope.isLoading && <p role="status" className="text-sm text-muted-foreground">Carregando municípios autorizados…</p>}
      {geo.city && !supported && <p className="text-sm text-muted-foreground">O primeiro piloto contempla somente São Paulo capital. Selecione SP e São Paulo.</p>}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-48 space-y-1.5"><label htmlFor="sp-quarter" className="text-sm font-medium">Trimestre do estudo</label>
          <Select value={quarter} onValueChange={value => { invalidate(); setQuarter(value as Quarter); }} disabled={loading}>
            <SelectTrigger id="sp-quarter"><SelectValue /></SelectTrigger>
            <SelectContent>{availableEndQuarters('1T2026').reverse().map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={() => preparePreview('api')} disabled={!ready || loading}>Conferir dados reais</Button>
        <Button variant="outline" onClick={() => preparePreview('fixture')} disabled={!ready || loading}>Ver prévia com dados de teste</Button>
      </div>
      {!scope.error && !scope.isLoading && !ready && <p className="text-sm text-muted-foreground">Faça login e selecione um município autorizado para continuar.</p>}
      <p className="text-xs text-muted-foreground">Consulta curta: amostra de um empreendimento e séries municipais. A coleta de todos os históricos não é iniciada. O exemplo fictício permanece separado.</p>
    </section>
    {loading && <div className="space-y-3"><BrainLoadingState title={progress} startedAt={startedAt} /><Button variant="outline" onClick={invalidate}>Cancelar consulta</Button></div>}
    {error && <Alert variant="destructive"><AlertTitle>Não foi possível preparar a prévia</AlertTitle><AlertDescription><p>A consulta não foi concluída. Confira sua autenticação e tente novamente mantendo o recorte.</p><Button className="mt-3" variant="outline" onClick={() => preparePreview(lastMode.current)} disabled={!ready || loading}>Tentar novamente</Button></AlertDescription></Alert>}
    {typologyError && <Alert variant="destructive"><AlertTitle>Não foi possível conferir as tipologias</AlertTitle><AlertDescription>A consulta não terminou. Os totais municipais foram mantidos; tente novamente em Conferir tipologias.</AlertDescription></Alert>}
    {!report && !loading && !error && <p className="text-sm text-muted-foreground">Nenhuma prévia preparada. Selecione o recorte e o trimestre para visualizar o exemplo.</p>}
    {report && <section aria-label="Prévia do estudo" className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div><h2 className="text-lg font-semibold">São Paulo / SP · {report.quarter}{isApi && report.throughMonth ? ` · parcial até ${formatMonth(report.throughMonth)}` : ''}</h2><p className="text-sm text-muted-foreground">{isApi ? 'Dados da API · fechamento informado na amostra' : 'Dados fictícios · fechamento do exemplo'}: {report.closingMonth ? formatMonth(report.closingMonth) : 'não informado'}.</p></div>
      {report.status === 'partial' ? <Alert><AlertTitle>Conferência parcial de dados da API</AlertTitle><AlertDescription>{report.issues.map(issue => <p key={issue}>{issue}</p>)}</AlertDescription></Alert>
        : report.status === 'ready' ? <Alert><AlertTitle>Prévia reconciliada com dados de teste</AlertTitle><AlertDescription>As verificações do exemplo fecharam. Isso não comprova dados reais, publicação ou homologação do relatório.</AlertDescription></Alert>
        : <Alert variant={report.status === 'awaiting-closure' ? 'default' : 'destructive'}><AlertTitle>{report.status === 'awaiting-closure' ? 'Trimestre ainda não fechado' : 'Dados insuficientes para concluir o estudo'}</AlertTitle><AlertDescription>{report.issues.map(issue => <p key={issue}>{issue}</p>)}<p className="mt-2">Os indicadores permanecem indisponíveis; meses ausentes não são preenchidos com zero.</p></AlertDescription></Alert>}
      <Table><TableCaption>{isApi ? 'Lançamentos e vendas somados somente nos meses conferidos; oferta final no último mês. Empreendimentos: coleta granular pendente.' : 'Contagens do trimestre selecionado; oferta final no fechamento. Todos os valores desta prévia são fictícios.'}</TableCaption><TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead className="text-right">Quantidade</TableHead></TableRow></TableHeader><TableBody>
        {Object.entries(labels).map(([metric, label]) => <TableRow key={metric}><TableCell>{label}</TableCell><TableCell className="text-right tabular-nums">{report.metrics[metric as keyof typeof labels]?.toLocaleString('pt-BR') ?? 'Indisponível'}</TableCell></TableRow>)}
      </TableBody></Table>
      {report.monthly && report.monthly.length > 0 && <div className="space-y-2"><p id="sp-monthly-label" className="text-sm text-muted-foreground">Balanço mensal: estoque anterior + lançamentos − vendas líquidas = estoque final.</p><p className="text-xs text-muted-foreground sm:hidden">Deslize a tabela para conferir estoque e diferenças.</p><Table aria-labelledby="sp-monthly-label" tabIndex={0}><TableHeader><TableRow><TableHead>Mês</TableHead><TableHead>Lançamentos</TableHead><TableHead>Vendas</TableHead><TableHead>Estoque final</TableHead><TableHead>Diferença</TableHead></TableRow></TableHeader><TableBody>{report.monthly.map(row => <TableRow key={row.month}><TableCell>{formatMonth(row.month)}</TableCell><TableCell>{row.launches.toLocaleString('pt-BR')}</TableCell><TableCell>{row.sales.toLocaleString('pt-BR')}</TableCell><TableCell>{row.closingStock.toLocaleString('pt-BR')}</TableCell><TableCell>{row.delta.toLocaleString('pt-BR')}</TableCell></TableRow>)}</TableBody></Table></div>}
      {report.checks.length > 0 && <details><summary className="cursor-pointer text-sm font-medium">{isApi ? 'Conferência das fontes municipais' : 'Conferência dos números do exemplo'}</summary><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{report.checks.map(check => <li key={check.label}>{check.label}: diferença de {check.delta.toLocaleString('pt-BR')} unidades.</li>)}</ul></details>}
    </section>}
    {isApi && report?.status === 'partial' && <section aria-label="Conferência por tipologia" className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">Dados por tipologia</h2><p className="text-sm text-muted-foreground">Consulta curta dos mesmos meses por grupo de dormitórios. Os três slides só mostram valores se todas as somas coincidirem com os totais municipais.</p>
      <Button variant="outline" onClick={prepareTypologies} disabled={!ready || loading}>Conferir tipologias</Button>
      {report.typologies?.status === 'ready' && <p role="status" className="text-sm">Tipologias conferidas: lançamentos, vendas e oferta somam os totais municipais. Slides 23, 37 e 47 disponíveis na prévia.</p>}
      {report.typologies?.status === 'blocked' && <Alert variant="destructive"><AlertTitle>Tipologias ainda não reconciliadas</AlertTitle><AlertDescription>{report.typologies.issues.map(issue => <p key={issue}>{issue}</p>)}</AlertDescription></Alert>}
      {!!report.typologies?.checks.length && <details><summary className="cursor-pointer text-sm font-medium">Conferência das somas por tipologia</summary><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{report.typologies.checks.map(check => <li key={check.label}>{check.label}: municipal {check.expected.toLocaleString('pt-BR')}, tipologias {check.actual.toLocaleString('pt-BR')}, diferença {check.delta.toLocaleString('pt-BR')}.</li>)}</ul></details>}
    </section>}
    {report && <SpReportPages key={`${key}/${report.source}/${report.throughMonth}`} report={report} />}
  </div>;
}
