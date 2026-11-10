import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { FileChartColumn, Layers } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { GeoApiScopeSelector, useGeoApiScope, type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { useAuthStore } from '@/store/auth-store';
import { FORTALEZA_CITIES, FORTALEZA_REFERENCES, fortalezaPeriod, fortalezaScope, prepareFortalezaBlueprint, type FortalezaBlueprint, type FortalezaSelection, type Periodicity, type Territory } from './model';
import { useFortalezaMarket } from './useFortalezaMarket';
import { FortalezaMarketPanel } from './FortalezaMarketPanel';
import { FortalezaGenerationPanel } from './FortalezaGenerationPanel';
const FortalezaIntroSlides = lazy(() => import('./FortalezaIntroSlides'));

export default function FortalezaInstitutionalPage() {
  const [geo, setGeo] = useState<GeoScope>({ uf: '', city: '' });
  const [initialMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth() - 1, 1); });
  const [periodicity, setPeriodicity] = useState<Periodicity>('monthly');
  const [year, setYear] = useState(initialMonth.getFullYear());
  const [position, setPosition] = useState(initialMonth.getMonth() + 1);
  const [territory, setTerritory] = useState<Territory>('city');
  const [blueprint, setBlueprint] = useState<FortalezaBlueprint | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const controller = useRef<AbortController | null>(null);
  const token = useAuthStore(state => state.getToken());
  const changeGeo = (value: GeoScope) => { controller.current?.abort(); setBlueprint(null); setGeo(value); };
  const scope = useGeoApiScope({ value: geo, onChange: changeGeo });
  const selection: FortalezaSelection = { ...geo, territory, periodicity, year, position };
  const coverage = fortalezaScope(selection, scope.citiesByUf?.CE ?? []);
  const ready = scope.hasToken && scope.strictReady && !scope.isLoading && !scope.error && coverage.valid;
  const market = useFortalezaMarket(selection, scope.citiesByUf?.CE ?? [], token, ready);
  const querying = market.state?.phase === 'loading';
  const busy = running || querying;
  const visibleBlueprint = ready ? market.state?.blueprint ?? blueprint : null;
  const key = `${token}/${geo.uf}/${geo.city}/${territory}/${periodicity}/${year}/${position}`;
  useEffect(() => {
    controller.current?.abort();
    setBlueprint(null); setError(''); setRunning(false);
    return () => { controller.current?.abort(); };
  }, [key]);
  const loadingStart = useRef(Date.now());
  useEffect(() => { if (scope.isLoading) loadingStart.current = Date.now(); }, [scope.isLoading]);

  async function prepare() {
    if (!ready || running) return;
    const attempt = new AbortController(); controller.current?.abort(); controller.current = attempt;
    setRunning(true); setStartedAt(Date.now()); setError(''); setBlueprint(null); setProgress({ completed: 0, total: 0 });
    try {
      const result = await prepareFortalezaBlueprint(selection, scope.citiesByUf?.CE ?? [], { signal: attempt.signal, onProgress: (completed, total) => setProgress({ completed, total }) });
      if (!attempt.signal.aborted) setBlueprint(result);
    } catch (failure) {
      if (!attempt.signal.aborted) setError(failure instanceof Error ? failure.message : 'Não foi possível preparar a estrutura. Tente novamente.');
    } finally { if (controller.current === attempt) setRunning(false); }
  }

  const reference = FORTALEZA_REFERENCES[periodicity === 'quarterly' ? 0 : 1];
  const years = Array.from({ length: Math.max(2026, new Date().getFullYear()) - 2020 }, (_, index) => 2021 + index).reverse();
  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <header className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relatórios institucionais</p>
      <div className="flex items-start gap-3"><span className="shrink-0 rounded-xl bg-primary/10 p-3 text-primary"><FileChartColumn className="h-7 w-7" aria-hidden="true" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="break-words text-2xl font-semibold">Fortaleza / SINDUSCON-CE</h1><Badge variant="secondary">Em preparação</Badge></div><p className="mt-1 text-sm text-muted-foreground">Base do panorama de Fortaleza e região metropolitana.</p></div></div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Layers className="h-4 w-4" aria-hidden="true" />Referências verificadas: 89 páginas trimestrais e 60 mensais</p>
    </header>
    <Alert><AlertTitle>Relatório em implantação</AlertTitle><AlertDescription>{periodicity === 'monthly' ? 'Prévia mensal até o slide 35, com lançamentos, vendas, VGL/VGV e oferta final. Os demais blocos e a exportação continuam em preparação.' : 'Consulte o núcleo vertical e os dez slides iniciais. A continuação trimestral e a exportação estão em preparação.'}</AlertDescription></Alert>
    <section className="space-y-5 rounded-xl border bg-card p-4 sm:p-6" aria-label="Configuração do estudo">
      <h2 className="font-semibold">Configure o estudo</h2>
      {!scope.error && <GeoApiScopeSelector value={geo} onChange={changeGeo} disabled={busy} />}
      {scope.error && <Alert variant="destructive"><AlertTitle>Cidades indisponíveis</AlertTitle><AlertDescription>Não foi possível confirmar os municípios autorizados. Confira seu acesso e tente novamente.<Button className="mt-3 block" variant="outline" onClick={scope.reload}>Tentar novamente</Button></AlertDescription></Alert>}
      {scope.hasToken && !scope.isLoading && !scope.error && !scope.availableUfs.length && <p role="status" className="text-sm text-muted-foreground">Nenhum município monitorado disponível para este acesso.</p>}
      {geo.city && !coverage.supported && <p role="status" className="text-sm text-destructive">Selecione CE e um dos municípios do estudo: {FORTALEZA_CITIES.join(', ')}.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5"><label htmlFor="fortaleza-periodicity" className="text-sm font-medium">Tipo de relatório</label><Select value={periodicity} disabled={busy} onValueChange={value => { if (value === periodicity) return; setPosition(value === 'monthly' ? position * 3 : Math.ceil(position / 3)); setPeriodicity(value as Periodicity); }}><SelectTrigger id="fortaleza-periodicity"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="quarterly">Trimestral</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5"><label htmlFor="fortaleza-position" className="text-sm font-medium">{periodicity === 'monthly' ? 'Mês de referência' : 'Trimestre de referência'}</label><Select value={String(position)} disabled={busy} onValueChange={value => setPosition(Number(value))}><SelectTrigger id="fortaleza-position"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: periodicity === 'monthly' ? 12 : 4 }, (_, index) => index + 1).map(value => <SelectItem key={value} value={String(value)}>{periodicity === 'monthly' ? new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, value - 1, 1))) : `${value}º trimestre`}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><label htmlFor="fortaleza-year" className="text-sm font-medium">Ano de referência</label><Select value={String(year)} disabled={busy} onValueChange={value => setYear(Number(value))}><SelectTrigger id="fortaleza-year"><SelectValue /></SelectTrigger><SelectContent>{years.map(value => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><label htmlFor="fortaleza-territory" className="text-sm font-medium">Recorte territorial</label><Select value={territory} disabled={busy} onValueChange={value => setTerritory(value as Territory)}><SelectTrigger id="fortaleza-territory"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="city">Município selecionado</SelectItem><SelectItem value="capital-rm">Fortaleza e RM · 5 municípios</SelectItem></SelectContent></Select></div>
      </div>
      <p className="text-sm font-medium">Referência selecionada: {fortalezaPeriod(selection).label}</p>
      {territory === 'capital-rm' && scope.hasToken && !scope.isLoading && !scope.error && coverage.missing.length > 0 && <p role="status" className="text-sm text-destructive">O conjunto exige acesso aos cinco municípios. Não disponíveis: {coverage.missing.join(', ')}.</p>}
      <div className="flex flex-wrap items-center gap-3"><Button disabled={!ready || busy} onClick={() => { void market.consult(); }}>{periodicity === 'monthly' ? 'Gerar prévia mensal' : 'Gerar prévia vertical'}</Button><Button variant="outline" disabled={!ready || busy} onClick={() => { void prepare(); }}>Preparar estrutura</Button></div>
      <p className="text-xs text-muted-foreground">Uma ação valida o recorte, consulta as fontes municipais, confere os balanços e organiza a prévia. Preparar estrutura organiza apenas as páginas localmente.</p>
      {!ready && !scope.isLoading && !scope.error && <p className="text-sm text-muted-foreground">Faça login e selecione um município autorizado do estudo para continuar.</p>}
      {error && <Alert variant="destructive"><AlertTitle>Preparação interrompida</AlertTitle><AlertDescription>{error}<Button className="mt-3 block" variant="outline" disabled={!ready} onClick={() => { void prepare(); }}>Tentar preparar novamente</Button></AlertDescription></Alert>}
    </section>
    {scope.isLoading || busy ? <section aria-label="Carregamento do relatório Fortaleza" aria-busy="true" className="relative min-h-[48rem] overflow-hidden rounded-xl border bg-card">
    {scope.isLoading && <BrainLoadingState variant="overlay" className="absolute z-10 justify-start overflow-y-auto py-8" title="Conferindo municípios autorizados" description="Aguarde a confirmação do seu acesso ao catálogo de cidades." startedAt={loadingStart.current} />}
    {running && <BrainLoadingState variant="overlay" className="absolute z-10 justify-start overflow-y-auto py-8" title="Organizando páginas do estudo" startedAt={startedAt} description={`${progress.completed} de ${progress.total || reference.slideCount} páginas organizadas`}><Button className="mt-4" variant="outline" onClick={() => { controller.current?.abort(); setRunning(false); }}>Cancelar preparação</Button></BrainLoadingState>}
    {querying && <BrainLoadingState variant="overlay" className="absolute z-10 justify-start overflow-y-auto py-8" title={periodicity === 'monthly' ? 'Consultando fontes do relatório mensal' : 'Consultando núcleo residencial vertical'} startedAt={market.state.startedAt} description={market.state.message}><FortalezaGenerationPanel state={market.state} compact /><Button className="mt-4" variant="outline" onClick={market.cancel}>Cancelar consulta</Button></BrainLoadingState>}
    </section> : <>
    {market.state && !querying && <FortalezaGenerationPanel state={market.state} />}
    {market.state?.phase === 'cancelled' && <p role="status" className="text-sm text-muted-foreground">{market.state.message}</p>}
    {market.state?.phase === 'error' && <Alert variant="destructive"><AlertTitle>Consulta não concluída</AlertTitle><AlertDescription>{market.state.message}<Button className="mt-3 block" variant="outline" disabled={!ready || busy} onClick={() => { void market.consult(); }}>Tentar consultar novamente</Button></AlertDescription></Alert>}
    {market.state?.report && <FortalezaMarketPanel report={market.state.report} />}
    {market.state?.hasFailedCities && <Button variant="outline" disabled={!ready || busy} onClick={() => { void market.consult(true); }}>Tentar cidades faltantes</Button>}
    <Tabs defaultValue="slides">
      <TabsList className="flex h-auto max-w-full flex-wrap justify-start"><TabsTrigger value="slides">Slides</TabsTrigger><TabsTrigger value="structure">Estrutura</TabsTrigger><TabsTrigger value="references">Referências</TabsTrigger><TabsTrigger value="method">Metodologia</TabsTrigger></TabsList>
      <TabsContent value="slides" className="mt-4"><Suspense fallback={<BrainLoadingState variant="page" title="Carregando os slides iniciais de Fortaleza" />}><FortalezaIntroSlides key={`${periodicity}/${year}/${position}`} selection={selection} cities={ready ? coverage.cities : []} data={market.state?.intro ?? null} monthlyLaunches={market.state?.monthlyLaunches ?? null} /></Suspense></TabsContent>
      <TabsContent value="structure" className="mt-4 space-y-4">
        {visibleBlueprint ? <>
          <section className="rounded-xl border bg-card p-5" aria-label="Estrutura preparada"><h2 className="font-semibold">Estrutura preparada · {visibleBlueprint.period.label}</h2><p className="mt-1 text-sm text-muted-foreground">{visibleBlueprint.cities.join(', ')} / CE</p><p className="mt-2 text-sm">{visibleBlueprint.pages.length} posições editoriais organizadas. O núcleo vertical é apresentado acima; o conteúdo completo das páginas ainda está em preparação.</p><p className="mt-1 text-xs text-muted-foreground">Modelo de referência: {visibleBlueprint.reference.label}. O período de referência não é uma coleta do recorte escolhido.</p></section>
          <ol className="grid gap-3 sm:grid-cols-2" aria-label="Páginas do relatório">{visibleBlueprint.pages.map(page => <li key={page.number} className="min-w-0 rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Página {page.number}</p><h3 className="mt-1 break-words text-sm font-medium">{page.title}</h3><p className="mt-2 text-xs text-muted-foreground">{page.status === 'source-pending' ? 'Dados e cálculo a integrar' : 'Conteúdo editorial a revisar'}</p></li>)}</ol>
        </> : <section className="rounded-xl border border-dashed p-6" aria-label="Estrutura não preparada"><h2 className="font-semibold">Prepare o recorte para organizar as páginas</h2><p className="mt-2 text-sm text-muted-foreground">Lançamentos, vendas, oferta final, preços e análise geral seguem a sequência do material de referência.</p><p className="mt-2 text-xs text-muted-foreground">Modelo {reference.label}: {reference.slideCount} páginas. Os valores históricos do original não serão usados como dados do novo estudo.</p></section>}
      </TabsContent>
      <TabsContent value="references" className="mt-4 grid gap-4 sm:grid-cols-2">{FORTALEZA_REFERENCES.map(item => <article key={item.id} className="min-w-0 space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">{item.label}</h2><p className="text-sm text-muted-foreground">{item.slideCount} slides · {item.chartCount} gráficos internos · 16:9</p><p className="break-all text-xs text-muted-foreground">{item.file}</p><a className="inline-block text-sm text-primary underline" href={`https://drive.google.com/file/d/${item.sourceId}/view`} target="_blank" rel="noreferrer">Abrir material de referência</a></article>)}</TabsContent>
      <TabsContent value="method" className="mt-4 rounded-xl border bg-card p-5"><h2 className="font-semibold">Regras do material de referência</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm"><li>Lançamentos seguem o mês e ano de início das vendas. O núcleo municipal usa o fluxo de lançamentos informado pela API; a reconciliação granular de datas ainda está pendente.</li><li>Vendas, estoque e distratos exigem comparação de tabelas mensais do mesmo universo. Distratos brutos não são inferidos das vendas líquidas.</li><li>Capital e região metropolitana têm recortes separados. Casas, loteamentos e comercial não são intercambiáveis.</li><li>Preço usa a tabela vigente por unidade. Ponderação, exclusões e correção pelo INCC precisam de comprovação por análise.</li><li>Vendas negativas permanecem visíveis; ausência de informação não representa zero.</li></ul><p className="mt-4 text-sm text-muted-foreground">O núcleo vertical soma fluxos mensais e usa a oferta no fechamento. Ainda não gera PDF ou PowerPoint nem substitui a revisão metodológica do estudo.</p></TabsContent>
    </Tabs>
    </>}
  </div>;
}
