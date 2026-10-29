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
import { isSpMunicipalPreview, spPeriodLabel, buildSpPreview, SP_INSTITUTIONAL, type SpPreview } from './model';
import { buildSpTemporalPreview } from './temporal';
import { SpReportPages } from './SpReportPages';
import { buildSpTypologies } from './typologies';
import { buildSpSegments, SP_SEGMENT_RULE } from './segments';
import { buildSpHistoryBatch } from './history-batch';
import { blockedSpProjects, fetchSpProjects, fetchSpBuildingRecords } from './projects';
import { blockedSpLaunchSeries, buildSpLaunchSeries, buildSpSalesSeries } from './launch-series';
import { buildSpTypologyHistory, blockedSpTypologyHistory } from './typology-history';
import { priorYearQuarter } from './history-batch';
import { fetchSpTemporalInput, fetchSpLaunchSeriesRows, fetchSpSalesSeriesRows, fetchSpStockSeriesRows, fetchSpHistoryBatch } from './api';
import { buildSpVglSeries, buildSpVgvSeries } from './vgl-series';
import { buildSpStockSeries, blockedSpStockSeries } from './stock-series';
import { buildSpSalesNeighborhoods, blockedSpSalesNeighborhoods } from './sales-neighborhoods';
import { buildSpGranularDetailsAsync, blockedSpGranularDetails, SP_DETAIL_SLIDES } from './granular-details';

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
  const [historyError, setHistoryError] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsProgress, setProjectsProgress] = useState('Preparando contagem de empreendimentos…');
  const [projectsStartedAt, setProjectsStartedAt] = useState<number | null>(null);
  const projectsController = useRef(new AbortController());
  const projectsVersion = useRef(0);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesProgress, setSeriesProgress] = useState('Preparando séries de lançamentos…');
  const [seriesStartedAt, setSeriesStartedAt] = useState<number | null>(null);
  const seriesController = useRef(new AbortController());
  const seriesVersion = useRef(0);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesProgress, setSalesProgress] = useState('Preparando séries de vendas…');
  const [salesStartedAt, setSalesStartedAt] = useState<number | null>(null);
  const salesController = useRef(new AbortController());
  const salesVersion = useRef(0);
  const [typologiesLoading, setTypologiesLoading] = useState(false);
  const [typologiesProgress, setTypologiesProgress] = useState('Conferindo tipologias…');
  const [typologiesStartedAt, setTypologiesStartedAt] = useState<number | null>(null);
  const typologiesController = useRef(new AbortController());
  const typologiesVersion = useRef(0);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockProgress, setStockProgress] = useState('Conferindo oferta histórica…');
  const [stockStartedAt, setStockStartedAt] = useState<number | null>(null);
  const stockController = useRef(new AbortController()), stockVersion = useRef(0);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false);
  const [neighborhoodsProgress, setNeighborhoodsProgress] = useState('Conferindo vendas por bairro…');
  const [neighborhoodsStartedAt, setNeighborhoodsStartedAt] = useState<number | null>(null);
  const neighborhoodsController = useRef(new AbortController()), neighborhoodsVersion = useRef(0);
  const granularCache = useRef<{ key: string; buildings: Record<string,unknown>[]; stock: SpPreview['stockSeries'] } | null>(null);
  const version = useRef(0);
  const controller = useRef(new AbortController());
  const lastMode = useRef<'api' | 'fixture'>('api');
  const [progress, setProgress] = useState('Preparando consulta…');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const token = useAuthStore(state => state.getToken());
  const stopProjects = useCallback(() => { projectsController.current.abort(); projectsVersion.current++; }, []);
  const stopSeries = useCallback(() => { seriesController.current.abort(); seriesVersion.current++; }, []);
  const stopSales = useCallback(() => { salesController.current.abort(); salesVersion.current++; }, []);
  const stopTypologies = useCallback(() => { typologiesController.current.abort(); typologiesVersion.current++; }, []);
  const stopStock = useCallback(() => { stockController.current.abort(); stockVersion.current++; }, []);
  const stopNeighborhoods = useCallback(() => { neighborhoodsController.current.abort(); neighborhoodsVersion.current++; }, []);
  const invalidate = useCallback(() => { granularCache.current = null; stopStock(); stopNeighborhoods(); setStockLoading(false); setNeighborhoodsLoading(false); stopSales(); stopTypologies(); setSalesLoading(false); setTypologiesLoading(false); stopSeries(); setSeriesLoading(false); stopProjects(); setProjectsLoading(false); controller.current.abort(); controller.current = new AbortController(); version.current += 1; setPreview(null); setLoading(false); setError(false); setTypologyError(false); setHistoryError(false); setStartedAt(null); }, [stopProjects, stopSeries, stopSales, stopTypologies, stopStock, stopNeighborhoods]);
  useEffect(() => { invalidate(); return () => { stopStock(); stopNeighborhoods(); stopSales(); stopTypologies(); stopSeries(); stopProjects(); controller.current.abort(); version.current += 1; }; }, [token, invalidate, stopProjects, stopSeries, stopSales, stopTypologies, stopStock, stopNeighborhoods]);
  const changeGeo = (next: GeoScope) => { invalidate(); setGeo(next); };
  const scope = useGeoApiScope({ value: geo, onChange: changeGeo });
  const supported = geo.uf === 'SP' && sameCity(geo.city);
  const ready = scope.strictReady && scope.hasToken && !scope.isLoading && !scope.error && supported;
  const key = `${geo.uf}/${geo.city}/${quarter}`;
  const report = ready && preview?.key === key ? preview.report : null;
  const isApi = report?.source === 'api' || report?.source === 'recorded-api';
  const segments = report ? buildSpSegments(report) : null;

  async function prepareProjects(baseline: SpPreview) {
    projectsController.current.abort(); projectsController.current = new AbortController();
    const signal = projectsController.current.signal, requestVersion = ++projectsVersion.current;
    setProjectsLoading(true); setProjectsStartedAt(Date.now()); setProjectsProgress('Conferindo o cadastro de empreendimentos…');
    setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, projects: undefined, metrics: { ...previous.report.metrics, projects: null } } } : previous);
    try {
      const projects = await fetchSpProjects(baseline, { signal, onProgress: message => { if (requestVersion === projectsVersion.current) setProjectsProgress(message); } });
      if (requestVersion === projectsVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, projects, metrics: { ...previous.report.metrics, projects: projects.total } } } : previous);
    } catch {
      if (requestVersion === projectsVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, projects: blockedSpProjects(signal.aborted ? 'Contagem cancelada. Os dados municipais foram mantidos; você pode tentar novamente.' : 'A contagem não confirmou toda a cobertura. Tente conferir os empreendimentos novamente. Os dados municipais foram mantidos.') } } : previous);
    } finally {
      if (requestVersion === projectsVersion.current) setProjectsLoading(false);
    }
  }

  async function prepareLaunchSeries(baseline: SpPreview) {
    seriesController.current.abort(); seriesController.current = new AbortController();
    const signal = seriesController.current.signal, requestVersion = ++seriesVersion.current;
    setSeriesLoading(true); setSeriesStartedAt(Date.now()); setSeriesProgress('Preparando séries de unidades lançadas…');
    setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, launchSeries: undefined, vglSeries: undefined } } : previous);
    try {

      const rows = await fetchSpLaunchSeriesRows(baseline, { signal, onProgress: message => { if (requestVersion === seriesVersion.current) setSeriesProgress(message); } });
      const launchSeries = buildSpLaunchSeries(rows, baseline);
      const vglSeries = buildSpVglSeries(rows, baseline);
      if (requestVersion === seriesVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, launchSeries, vglSeries } } : previous);
    } catch {
      const message = signal.aborted ? 'Série histórica cancelada. Os dados municipais foram mantidos.' : 'Não foi possível concluir a série histórica de lançamentos. Tente novamente.';
      if (requestVersion === seriesVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, launchSeries: blockedSpLaunchSeries(message), vglSeries: blockedSpLaunchSeries(message) } } : previous);
    } finally { if (requestVersion === seriesVersion.current) setSeriesLoading(false); }
  }

  async function preparePreview(mode: 'api' | 'fixture') {
    if (!ready || loading) return;
    granularCache.current = null;
    stopStock(); stopNeighborhoods(); setStockLoading(false); setNeighborhoodsLoading(false);
    stopSales(); stopTypologies(); setSalesLoading(false); setTypologiesLoading(false); stopSeries(); setSeriesLoading(false); stopProjects(); setProjectsLoading(false);
    controller.current.abort(); controller.current = new AbortController();
    const signal = controller.current.signal;
    lastMode.current = mode;
    const requestVersion = ++version.current;
    setLoading(true); setError(false); setTypologyError(false); setHistoryError(false); setPreview(null); setStartedAt(Date.now()); setProgress(mode === 'api' ? 'Conferindo os meses disponíveis…' : 'Preparando o exemplo do estudo…');
    try {
      let next: SpPreview;
      if (mode === 'api') {

        const input = await fetchSpTemporalInput(quarter, { signal, onProgress: message => { if (requestVersion === version.current) setProgress(message); } });
        next = buildSpTemporalPreview(input, quarter);
      } else {
        const { spFixture } = await import('./fixture');
        next = buildSpPreview(spFixture(), quarter);
      }
      if (requestVersion === version.current) {
        setPreview({ key, report: next });
        if (mode === 'api' && isSpMunicipalPreview(next)) { void prepareProjects(next); void prepareLaunchSeries(next); void prepareSalesSeries(next); void prepareTypologies(next); }
      }
    } catch {
      if (requestVersion === version.current) setError(true);
    } finally {
      if (requestVersion === version.current) setLoading(false);
    }
  }

  async function prepareTypologies(baseline: SpPreview) {
    if (!isSpMunicipalPreview(baseline)) return;
    typologiesController.current.abort(); typologiesController.current = new AbortController();
    const requestVersion = ++typologiesVersion.current, signal = typologiesController.current.signal;
    setTypologiesLoading(true); setTypologyError(false); setTypologiesStartedAt(Date.now()); setTypologiesProgress('Conferindo as tipologias nos mesmos meses…');
    setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, typologies: undefined, typologyHistory: undefined } } : previous);
    try {

      const options = { groupBy: 'Tipologia' as const, signal, onProgress: (message: string) => { if (requestVersion === typologiesVersion.current) setTypologiesProgress(message); } };
      const input = await fetchSpTemporalInput(baseline.quarter, { ...options, windowEnd: baseline.throughMonth });
      const typologies = buildSpTypologies(input, baseline);
      if (requestVersion === typologiesVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, typologies } } : previous);
      if (typologies.status === 'ready') {
        const end = `${Number(baseline.throughMonth!.slice(0, 4)) - 1}${baseline.throughMonth!.slice(4)}`;
        const previousInput = await fetchSpTemporalInput(priorYearQuarter(baseline.quarter), { ...options, windowEnd: end });
        const typologyHistory = buildSpTypologyHistory(input, previousInput, baseline);
        if (requestVersion === typologiesVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, typologyHistory } } : previous);
      }
    } catch {
      if (requestVersion === typologiesVersion.current) {
        setTypologyError(!signal.aborted);
        setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, typologyHistory: blockedSpTypologyHistory(signal.aborted ? 'Comparativo de tipologias cancelado. Os totais municipais foram mantidos.' : 'Não foi possível concluir as tipologias nos dois anos.') } } : previous);
      }
    } finally {
      if (requestVersion === typologiesVersion.current) setTypologiesLoading(false);
    }
  }

  async function prepareSalesSeries(baseline: SpPreview) {
    salesController.current.abort(); salesController.current = new AbortController();
    const signal = salesController.current.signal, requestVersion = ++salesVersion.current;
    setSalesLoading(true); setSalesStartedAt(Date.now()); setSalesProgress('Preparando séries de vendas líquidas…');
    setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, salesSeries: undefined, vgvSeries: undefined } } : previous);
    try {

      const rows = await fetchSpSalesSeriesRows(baseline, { signal, onProgress: message => { if (requestVersion === salesVersion.current) setSalesProgress(message); } });
      const salesSeries = buildSpSalesSeries(rows, baseline);
      const vgvSeries = buildSpVgvSeries(rows, baseline);
      if (requestVersion === salesVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, salesSeries, vgvSeries } } : previous);
    } catch {
      const message = signal.aborted ? 'Série de vendas cancelada. Os dados municipais foram mantidos.' : 'Não foi possível concluir a série de vendas. Tente novamente.';
      if (requestVersion === salesVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, salesSeries: blockedSpLaunchSeries(message), vgvSeries: blockedSpLaunchSeries(message) } } : previous);
    } finally { if (requestVersion === salesVersion.current) setSalesLoading(false); }
  }

  const prepareStockSeries = useCallback(async (baseline: SpPreview) => {
    stockController.current.abort(); stockController.current = new AbortController();
    const signal = stockController.current.signal, requestVersion = ++stockVersion.current;
    setStockLoading(true); setStockStartedAt(Date.now()); setStockProgress('Conferindo oferta histórica…');
    setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, stockSeries: undefined } } : previous);
    try {
      const rows = await fetchSpStockSeriesRows(baseline, { signal, onProgress: message => { if (requestVersion === stockVersion.current) setStockProgress(message); } });
      const stockSeries = buildSpStockSeries(rows, baseline);
      if (requestVersion === stockVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, stockSeries } } : previous);
    } catch {
      if (requestVersion === stockVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, stockSeries: blockedSpStockSeries(signal.aborted ? 'Oferta histórica cancelada. Os demais dados foram mantidos.' : 'Não foi possível conferir a oferta histórica. Tente novamente.') } } : previous);
    } finally { if (requestVersion === stockVersion.current) setStockLoading(false); }
  }, [key]);
  useEffect(() => {
    if (report && isApi && isSpMunicipalPreview(report) && report.projects && !projectsLoading && !stockLoading && !report.stockSeries) void prepareStockSeries(report);
  }, [report, isApi, projectsLoading, stockLoading, prepareStockSeries]);

  const prepareSalesNeighborhoods = useCallback(async (baseline: SpPreview, refresh = false) => {
    neighborhoodsController.current.abort(); neighborhoodsController.current = new AbortController();
    const signal = neighborhoodsController.current.signal, requestVersion = ++neighborhoodsVersion.current;
    setNeighborhoodsLoading(true); setNeighborhoodsStartedAt(Date.now()); setNeighborhoodsProgress('Conferindo históricos detalhados…');
    setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, salesNeighborhoods: undefined, granularDetails: undefined } } : previous);
    try {
      const options = { signal, onProgress: (message:string) => { if (requestVersion === neighborhoodsVersion.current) setNeighborhoodsProgress(message.replace('vendas por bairro','históricos detalhados')); } };
      const buildings = !refresh && granularCache.current?.key === key ? granularCache.current.buildings : await fetchSpBuildingRecords(baseline, options);
      if (requestVersion !== neighborhoodsVersion.current) return;
      if (signal.aborted) throw new DOMException('Consulta cancelada.','AbortError');
      granularCache.current = { key, buildings, stock: baseline.stockSeries };
      const granularDetails = await buildSpGranularDetailsAsync(buildings, baseline, options);
      if (requestVersion !== neighborhoodsVersion.current) return;
      if (signal.aborted) throw new DOMException('Processamento cancelado.','AbortError');
      const salesNeighborhoods = buildSpSalesNeighborhoods(buildings, baseline);
      if (requestVersion === neighborhoodsVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, salesNeighborhoods, granularDetails } } : previous);
    } catch {
      const message = signal.aborted ? 'Históricos detalhados cancelados. Os demais dados foram mantidos.' : 'Não foi possível conferir os históricos completos. Tente novamente.';
      if (requestVersion === neighborhoodsVersion.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, salesNeighborhoods: blockedSpSalesNeighborhoods(message), granularDetails: blockedSpGranularDetails(message) } } : previous);
    } finally { if (requestVersion === neighborhoodsVersion.current) setNeighborhoodsLoading(false); }
  }, [key]);
  useEffect(() => {
    if (report && isApi && !stockLoading && !neighborhoodsLoading && granularCache.current?.key === key && granularCache.current.stock !== report.stockSeries) void prepareSalesNeighborhoods(report);
  }, [report, isApi, stockLoading, neighborhoodsLoading, key, prepareSalesNeighborhoods]);

  async function prepareHistories() {
    if (!ready || loading || !isApi || !isSpMunicipalPreview(report) || report.patterns?.status !== 'ready') return;
    controller.current.abort(); controller.current = new AbortController();
    const requestVersion = ++version.current, signal = controller.current.signal;
    setLoading(true); setHistoryError(false); setStartedAt(Date.now()); setProgress('Conferindo os períodos do comparativo…');
    const baseline = { ...report, launchHistory: undefined, historyBatch: undefined };
    setPreview({ key, report: baseline });
    try {

      const input = await fetchSpHistoryBatch(baseline, { signal, onProgress: message => { if (requestVersion === version.current) setProgress(message); } });
      const historyBatch = buildSpHistoryBatch(input, baseline);
      if (requestVersion === version.current) setPreview(previous => previous?.key === key ? { ...previous, report: { ...previous.report, historyBatch } } : previous);
    } catch {
      if (requestVersion === version.current) setHistoryError(true);
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
      {report && !isApi ? 'Os números do exemplo não representam o mercado.' : 'A consulta curta busca lançamentos, vendas e estoque do trimestre selecionado e identifica os meses disponíveis nas três fontes. A contagem de empreendimentos continua em paralelo e preenche os slides 13–17 quando terminar.'} Não há exportação disponível nesta etapa.
    </AlertDescription></Alert>
    <section aria-label="Seleção do estudo" className="space-y-4 rounded-lg border border-border bg-card p-4">
      {scope.error ? <Alert variant="destructive"><AlertTitle>Não foi possível carregar as cidades autorizadas</AlertTitle><AlertDescription><p>Confira sua autenticação e tente novamente. O estudo permanece bloqueado.</p><Button className="mt-3" variant="outline" onClick={scope.reload}>Tentar carregar cidades novamente</Button></AlertDescription></Alert>
        : <GeoApiScopeSelector value={geo} onChange={changeGeo} disabled={loading} />}
      {scope.isLoading && <BrainLoadingState variant="field" title="Carregando municípios autorizados…" />}
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
      <p className="text-xs text-muted-foreground">A cada nova geração, consultamos os meses disponíveis nas três séries municipais. Um ou dois meses geram uma parcial; três meses completam o trimestre. Diferenças de balanço ficam indicadas para conferência. Os dados municipais ficam disponíveis enquanto a contagem de empreendimentos termina. Cancelar a contagem preserva esses dados e permite tentar novamente. O exemplo fictício permanece separado.</p>
    </section>
    {loading && <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Consulta do relatório" onKeyDown={event => { if (event.key === 'Escape') invalidate(); if (event.key === 'Tab') event.preventDefault(); }}><BrainLoadingState variant="overlay" title={progress} startedAt={startedAt} /><Button autoFocus className="fixed bottom-10 left-1/2 z-[51] -translate-x-1/2" variant="outline" onClick={invalidate}>Cancelar consulta</Button></div>}
    {error && <Alert variant="destructive"><AlertTitle>Não foi possível preparar a prévia</AlertTitle><AlertDescription><p>A consulta não foi concluída. Confira sua autenticação e tente novamente mantendo o recorte.</p><Button className="mt-3" variant="outline" onClick={() => preparePreview(lastMode.current)} disabled={!ready || loading}>Tentar novamente</Button></AlertDescription></Alert>}
    {typologyError && <Alert variant="destructive"><AlertTitle>Não foi possível conferir as tipologias</AlertTitle><AlertDescription>A consulta não terminou. Os totais municipais foram mantidos; tente novamente em Conferir tipologias.</AlertDescription></Alert>}
    {historyError && <Alert variant="destructive"><AlertTitle>Não foi possível conferir os históricos</AlertTitle><AlertDescription>A consulta não terminou. Os totais atuais foram mantidos; tente novamente em Conferir históricos.</AlertDescription></Alert>}
    {!report && !loading && !error && <p className="text-sm text-muted-foreground">Nenhuma prévia preparada. Selecione o recorte e o trimestre para visualizar o exemplo.</p>}
    {report && <section aria-label="Prévia do estudo" className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div><h2 className="text-lg font-semibold">São Paulo / SP · {report.quarter}{isApi && report.throughMonth ? ` · ${spPeriodLabel(report).toLocaleLowerCase('pt-BR')}` : ''}</h2><p className="text-sm text-muted-foreground">{isApi ? 'Dados da API · último mês disponível nas três séries' : 'Dados fictícios · fechamento do exemplo'}: {report.closingMonth ? formatMonth(report.closingMonth) : 'não informado'}.</p></div>
      {isSpMunicipalPreview(report) ? <Alert><AlertTitle>{report.status === 'quarter-closed' ? 'Trimestre completo nas séries municipais da API' : 'Conferência parcial de dados da API'}</AlertTitle><AlertDescription>{report.issues.map(issue => <p key={issue}>{issue}</p>)}</AlertDescription></Alert>
        : report.status === 'ready' ? <Alert><AlertTitle>Prévia reconciliada com dados de teste</AlertTitle><AlertDescription>As verificações do exemplo fecharam. Isso não comprova dados reais, publicação ou homologação do relatório.</AlertDescription></Alert>
        : <Alert variant={report.status === 'awaiting-closure' ? 'default' : 'destructive'}><AlertTitle>{report.status === 'awaiting-closure' ? 'Trimestre ainda não fechado' : 'Dados insuficientes para concluir o estudo'}</AlertTitle><AlertDescription>{report.issues.map(issue => <p key={issue}>{issue}</p>)}<p className="mt-2">Os indicadores permanecem indisponíveis; meses ausentes não são preenchidos com zero.</p></AlertDescription></Alert>}
      {projectsLoading && <div className="space-y-2"><BrainLoadingState variant="operation" title={projectsProgress} startedAt={projectsStartedAt} description="Os dados municipais já estão disponíveis. A contagem preenche os slides 13–17 quando terminar." /><Button variant="outline" onClick={() => projectsController.current.abort()}>Cancelar contagem</Button></div>}
      {report.projects?.status === 'blocked' && <Alert variant="destructive"><AlertTitle>Contagem de empreendimentos indisponível</AlertTitle><AlertDescription>{report.projects.issues.map(issue => <p key={issue}>{issue}</p>)}</AlertDescription></Alert>}
      {isSpMunicipalPreview(report) && !projectsLoading && report.projects?.status !== 'ready' && <Button variant="outline" disabled={!ready || loading} onClick={() => void prepareProjects(report)}>Conferir empreendimentos</Button>}
      {report.projects?.status === 'ready' && <p role="status" className="text-sm">Cobertura conferida: {report.projects.distinct.toLocaleString('pt-BR')} empreendimentos verticais de São Paulo/SP. Contagem por ID distinto e data de lançamento nos meses do relatório.</p>}
      {seriesLoading && <div className="space-y-2"><BrainLoadingState variant="operation" title={seriesProgress} startedAt={seriesStartedAt} description="Os slides 18–22 de unidades lançadas serão preenchidos ao concluir a conferência." /><Button variant="outline" onClick={() => seriesController.current.abort()}>Cancelar série de lançamentos</Button></div>}
      {report.launchSeries?.status === 'blocked' && <Alert variant="destructive"><AlertTitle>Séries de lançamentos indisponíveis</AlertTitle><AlertDescription>{report.launchSeries.issues.map(issue => <p key={issue}>{issue}</p>)}</AlertDescription></Alert>}
      {isSpMunicipalPreview(report) && !seriesLoading && report.launchSeries?.status !== 'ready' && <Button variant="outline" disabled={!ready || loading} onClick={() => void prepareLaunchSeries(report)}>Conferir séries de lançamentos</Button>}
      {report.launchSeries?.status === 'ready' && <p role="status" className="text-sm">Séries de unidades lançadas conferidas desde janeiro de 2021. Cinco páginas históricas disponíveis.</p>}
      {salesLoading && <div className="space-y-2"><BrainLoadingState variant="operation" title={salesProgress} startedAt={salesStartedAt} description="Os slides 32–36 e o comparativo por segmento serão preenchidos após a conferência." /><Button variant="outline" onClick={() => salesController.current.abort()}>Cancelar série de vendas</Button></div>}
      {report.salesSeries?.status === 'blocked' && <Alert variant="destructive"><AlertTitle>Séries de vendas indisponíveis</AlertTitle><AlertDescription>{report.salesSeries.issues.map(issue => <p key={issue}>{issue}</p>)}</AlertDescription></Alert>}
      {isSpMunicipalPreview(report) && !salesLoading && report.salesSeries?.status !== 'ready' && <Button variant="outline" disabled={!ready || loading} onClick={() => void prepareSalesSeries(report)}>Conferir séries de vendas</Button>}
      {report.salesSeries?.status === 'ready' && <p role="status" className="text-sm">Séries de vendas líquidas conferidas desde janeiro de 2021, com valores negativos preservados.</p>}
      {report.vgvSeries?.status === 'ready' && <p role="status" className="text-sm">VGV vendido corrigido pelo INCC-DI para {report.vgvSeries.baseMonth}, com sinais preservados e a mesma base no MCMV.</p>}
      {stockLoading && <div className="space-y-2"><BrainLoadingState variant="operation" title={stockProgress} startedAt={stockStartedAt} description="Conferindo fotografias de estoque para oferta e IVV, sem bloquear os demais slides." /><Button variant="outline" onClick={() => stockController.current.abort()}>Cancelar oferta histórica</Button></div>}
      {report.stockSeries?.status === 'blocked' && <Alert variant="destructive"><AlertTitle>Oferta histórica indisponível</AlertTitle><AlertDescription>{report.stockSeries.issues[0]}</AlertDescription></Alert>}
      {isSpMunicipalPreview(report) && !stockLoading && report.stockSeries?.status !== 'ready' && <Button variant="outline" disabled={!ready || loading} onClick={() => void prepareStockSeries(report)}>Conferir oferta histórica</Button>}
      {report.stockSeries?.status === 'ready' && <p role="status" className="text-sm">Oferta histórica conferida desde janeiro de 2021. Fotografias mensais preservadas.</p>}
      {neighborhoodsLoading && <div className="space-y-2"><BrainLoadingState variant="operation" title={neighborhoodsProgress} startedAt={neighborhoodsStartedAt} description="Históricos compartilhados de vendas por bairro, áreas e preços. Os demais slides permanecem disponíveis." /><Button variant="outline" onClick={() => neighborhoodsController.current.abort()}>Cancelar históricos detalhados</Button></div>}
      {report.salesNeighborhoods?.status === 'blocked' && <Alert variant="destructive"><AlertTitle>Vendas por bairro indisponíveis</AlertTitle><AlertDescription>{report.salesNeighborhoods.issues[0]}</AlertDescription></Alert>}
      {isSpMunicipalPreview(report) && !neighborhoodsLoading && report.salesNeighborhoods?.status === 'blocked' && <Button variant="outline" disabled={!ready || loading} onClick={() => void prepareSalesNeighborhoods(report,true)}>Conferir vendas por bairro</Button>}
      {report.salesNeighborhoods?.status === 'ready' && <p role="status" className="text-sm">Vendas por bairro conferidas por mês e padrão contra os totais municipais.</p>}
      {report.granularDetails && <p role="status" className="text-sm">Históricos de áreas e preços processados. Cobertura e médias são conferidas em cada fotografia; valores ausentes ficam indicados no slide.</p>}
      {isSpMunicipalPreview(report) && !neighborhoodsLoading && report.granularDetails && <Button variant="outline" disabled={!ready || loading} onClick={() => void prepareSalesNeighborhoods(report,true)}>Atualizar históricos de áreas e preços</Button>}
      {report.vglSeries?.status === 'ready' && <p role="status" className="text-sm">VGL corrigido pelo INCC-DI para {report.vglSeries.baseMonth}, com a mesma base no total e no MCMV. Índices: SindusconPR/FGV.</p>}
      <Table><TableCaption>{isApi ? 'Lançamentos e vendas somados somente nos meses conferidos; oferta final no último mês. Empreendimentos por ID distinto e data de lançamento, após conferir toda a paginação.' : 'Contagens do trimestre selecionado; oferta final no fechamento. Todos os valores desta prévia são fictícios.'}</TableCaption><TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead className="text-right">Quantidade</TableHead></TableRow></TableHeader><TableBody>
        {Object.entries(labels).map(([metric, label]) => <TableRow key={metric}><TableCell>{label}</TableCell><TableCell className="text-right tabular-nums">{report.metrics[metric as keyof typeof labels]?.toLocaleString('pt-BR') ?? 'Indisponível'}</TableCell></TableRow>)}
      </TableBody></Table>
      {report.monthly && report.monthly.length > 0 && <div className="space-y-2"><p id="sp-monthly-label" className="text-sm text-muted-foreground">Balanço mensal: estoque anterior + lançamentos − vendas líquidas = estoque final.</p><p className="text-xs text-muted-foreground sm:hidden">Deslize a tabela para conferir estoque e diferenças.</p><Table aria-labelledby="sp-monthly-label" tabIndex={0}><TableHeader><TableRow><TableHead>Mês</TableHead><TableHead>Lançamentos</TableHead><TableHead>Vendas</TableHead><TableHead>Estoque final</TableHead><TableHead>Diferença</TableHead></TableRow></TableHeader><TableBody>{report.monthly.map(row => <TableRow key={row.month}><TableCell>{formatMonth(row.month)}</TableCell><TableCell>{row.launches.toLocaleString('pt-BR')}</TableCell><TableCell>{row.sales.toLocaleString('pt-BR')}</TableCell><TableCell>{row.closingStock.toLocaleString('pt-BR')}</TableCell><TableCell>{row.delta.toLocaleString('pt-BR')}</TableCell></TableRow>)}</TableBody></Table></div>}
      {!!report.balanceByGroup?.some(row => row.delta !== 0) && <details><summary className="cursor-pointer text-sm font-medium">Diferenças de balanço por grupo</summary><p className="mt-2 text-sm text-muted-foreground">Estoque esperado = anterior + lançamentos − vendas líquidas. Diferenças são diagnósticas; não alteram os valores da API e não comprovam sua causa.</p><Table><TableHeader><TableRow><TableHead>Mês</TableHead><TableHead>Grupo</TableHead><TableHead>Esperado</TableHead><TableHead>Informado</TableHead><TableHead>Diferença</TableHead></TableRow></TableHeader><TableBody>{report.balanceByGroup.filter(row => row.delta !== 0).map(row => <TableRow key={`${row.month}/${row.group}`}><TableCell>{row.month}</TableCell><TableCell>{row.group}</TableCell><TableCell>{row.expected.toLocaleString('pt-BR')}</TableCell><TableCell>{row.actual.toLocaleString('pt-BR')}</TableCell><TableCell>{row.delta.toLocaleString('pt-BR')}</TableCell></TableRow>)}</TableBody></Table></details>}
      {report.checks.length > 0 && <details><summary className="cursor-pointer text-sm font-medium">{isApi ? 'Diagnóstico do balanço municipal' : 'Conferência dos números do exemplo'}</summary><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{report.checks.map(check => <li key={check.label}>{check.label}: diferença de {check.delta.toLocaleString('pt-BR')} unidades.</li>)}</ul></details>}
    </section>}
    {isApi && isSpMunicipalPreview(report) && <section aria-label="Conferência por tipologia" className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">Dados por tipologia</h2><p className="text-sm text-muted-foreground">Consulta curta dos mesmos meses por grupo de dormitórios. Os três slides só mostram valores se todas as somas coincidirem com os totais municipais.</p>
      <Button variant="outline" onClick={() => report && void prepareTypologies(report)} disabled={!ready || loading || typologiesLoading}>Conferir tipologias</Button>
      {typologiesLoading && <div className="space-y-2"><BrainLoadingState variant="operation" title={typologiesProgress} startedAt={typologiesStartedAt} description="Conferindo os mesmos meses por tipologia nos dois anos, sem bloquear os demais dados." /><Button variant="outline" onClick={() => typologiesController.current.abort()}>Cancelar tipologias</Button></div>}
      {report.typologies?.status === 'ready' && <p role="status" className="text-sm">Tipologias conferidas: lançamentos, vendas e oferta somam os totais municipais. A comparação anual dos slides 23 e 37 depende também do ano anterior.</p>}
      {report.typologies?.status === 'blocked' && <Alert variant="destructive"><AlertTitle>Tipologias ainda não reconciliadas</AlertTitle><AlertDescription>{report.typologies.issues.map(issue => <p key={issue}>{issue}</p>)}</AlertDescription></Alert>}
      {!!report.typologies?.checks.length && <details><summary className="cursor-pointer text-sm font-medium">Conferência das somas por tipologia</summary><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{report.typologies.checks.map(check => <li key={check.label}>{check.label}: municipal {check.expected.toLocaleString('pt-BR')}, tipologias {check.actual.toLocaleString('pt-BR')}, diferença {check.delta.toLocaleString('pt-BR')}.</li>)}</ul></details>}
    </section>}
    {isApi && isSpMunicipalPreview(report) && <section aria-label="Conferência dos padrões" className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">Padrões e segmentos do relatório</h2>
      <p className="text-sm text-muted-foreground">Agrupamento confirmado para este relatório SP: Compactos = Compacto; MCMV = Econômico; Médio Padrão = Standard, Médio e Médio-Alto; Luxo = Alto e Luxo.</p>
      {segments?.status === 'ready' ? <p role="status" className="text-sm">Segmentos conferidos: os quatro grupos somam os totais municipais. Os slides 24 e 38 usam as séries dos dois anos; o slide 48 depende de Conferir históricos.</p> : <Alert variant="destructive"><AlertTitle>Segmentos ainda não reconciliados</AlertTitle><AlertDescription>{segments?.issues.map(issue => <p key={issue}>{issue}</p>)}</AlertDescription></Alert>}
      <p className="text-xs text-muted-foreground">Regra confirmada por {SP_SEGMENT_RULE.confirmedBy} em 15/10/2026, específica deste modelo.</p>
      {report.patterns?.status === 'ready' ? <details><summary className="cursor-pointer text-sm font-medium">Ver padrões recebidos da API</summary><Table><TableCaption>Grupos originais da consulta municipal, sem reclassificação. Lançamentos e vendas acumulados; oferta somente no último mês conferido.</TableCaption><TableHeader><TableRow><TableHead>Padrão da API</TableHead><TableHead>Lançamentos</TableHead><TableHead>Vendas</TableHead><TableHead>Oferta final</TableHead></TableRow></TableHeader><TableBody>{report.patterns.rows.map(row => <TableRow key={row.group}><TableCell>{row.group}</TableCell><TableCell>{row.launches.toLocaleString('pt-BR')}</TableCell><TableCell>{row.sales.toLocaleString('pt-BR')}</TableCell><TableCell>{row.stock.toLocaleString('pt-BR')}</TableCell></TableRow>)}</TableBody></Table></details> : <p className="text-sm text-muted-foreground">Confira os dados reais novamente para obter o detalhamento por padrão.</p>}
    </section>}
    {isApi && isSpMunicipalPreview(report) && <section aria-label="Comparativos históricos" className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">Históricos de lançamentos, vendas e oferta</h2><p className="text-sm text-muted-foreground">Uma consulta para os três comparativos dos mesmos meses nos dois anos. Lançamentos e vendas são acumulados; oferta é a posição no último mês. As duas janelas devem cobrir meses equivalentes e a releitura deve coincidir com os dados atuais. Diferenças de balanço permanecem no diagnóstico.</p>
      <Button variant="outline" onClick={prepareHistories} disabled={!ready || loading || report.patterns?.status !== 'ready'}>Conferir históricos</Button>
      {report.historyBatch?.status === 'ready' && <p role="status" className="text-sm">Três comparativos conferidos para meses equivalentes. Veja os slides 24, 38 e 48, nas posições originais.</p>}
      {report.historyBatch?.status === 'blocked' && <Alert variant="destructive"><AlertTitle>Lote histórico ainda não reconciliado</AlertTitle><AlertDescription>{report.historyBatch.issues.map(issue => <p key={issue}>{issue}</p>)}</AlertDescription></Alert>}
      {!!report.historyBatch?.checks.length && <details><summary className="cursor-pointer text-sm font-medium">Conferência dos balanços e da releitura</summary><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{report.historyBatch.checks.map(check => <li key={check.label}>{check.label}: esperado {check.expected.toLocaleString('pt-BR')}, observado {check.actual.toLocaleString('pt-BR')}, diferença {check.delta.toLocaleString('pt-BR')}.</li>)}</ul></details>}
    </section>}
    {report && <SpReportPages key={`${key}/${report.source}/${report.throughMonth}`} report={report} onSelectSlide={number => { if ((number === 39 && !report.salesNeighborhoods || (SP_DETAIL_SLIDES as readonly number[]).includes(number) && !report.granularDetails) && isApi && !loading && !projectsLoading && !seriesLoading && !salesLoading && !stockLoading && !typologiesLoading && !neighborhoodsLoading) void prepareSalesNeighborhoods(report); }} />}
  </div>;
}
