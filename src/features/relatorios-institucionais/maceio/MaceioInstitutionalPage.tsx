import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { FileChartColumn, Layers } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { useGeoApiScope, type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { useAuthStore } from '@/store/auth-store';
import { MACEIO_REFERENCES, MACEIO_UF, maceioCities, maceioPeriod, maceioReference, maceioScope, prepareMaceioBlueprint, type MaceioBlueprint, type MaceioSelection, type Periodicity } from './model';
import { useMaceioMarket } from './useMaceioMarket';
import { MaceioGenerationPanel } from './MaceioGenerationPanel';
import { MaceioMarketPanel } from './MaceioMarketPanel';
const MaceioIntroSlides=lazy(()=>import('./MaceioIntroSlides'));

export default function MaceioInstitutionalPage() {
  const [geo, setGeo] = useState<GeoScope>({ uf: MACEIO_UF, city: '' });
  const [initialMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth() - 1, 1); });
  const [periodicity, setPeriodicity] = useState<Periodicity>('monthly');
  const [year, setYear] = useState(initialMonth.getFullYear());
  const [position, setPosition] = useState(initialMonth.getMonth() + 1);
  const [blueprint, setBlueprint] = useState<MaceioBlueprint | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const controller = useRef<AbortController | null>(null);
  const token = useAuthStore(state => state.getToken());
  const scope = useGeoApiScope({ value: geo, onChange: setGeo });
  const authorized = scope.citiesByUf?.[MACEIO_UF] ?? [];
  const capital = authorized.find(city => city.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase() === 'maceio') ?? '';
  useEffect(() => { setGeo({ uf: MACEIO_UF, city: capital }); }, [capital]);
  const selection: MaceioSelection = { ...geo, territory: 'capital-rm', periodicity, year, position };
  const coverage = maceioScope(selection, authorized);
  const studyCities = maceioCities(periodicity);
  const ready = scope.hasToken && scope.strictReady && !scope.isLoading && !scope.error && coverage.valid;
  const market = useMaceioMarket(selection, authorized, token, ready);
  const querying = market.state?.phase === 'loading';
  const busy = running || querying;
  const visibleBlueprint = ready ? market.state?.blueprint ?? blueprint : null;
  const key = `${token}/${geo.uf}/${geo.city}/${periodicity}/${year}/${position}`;
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
      const result = await prepareMaceioBlueprint(selection, authorized, { signal: attempt.signal, onProgress: (completed, total) => setProgress({ completed, total }) });
      if (!attempt.signal.aborted) setBlueprint(result);
    } catch (failure) {
      if (!attempt.signal.aborted) setError(failure instanceof Error ? failure.message : 'Não foi possível preparar a estrutura. Tente novamente.');
    } finally { if (controller.current === attempt) setRunning(false); }
  }

  const reference = maceioReference(periodicity);
  const years = Array.from({ length: Math.max(2026, new Date().getFullYear()) - 2020 }, (_, index) => 2021 + index).reverse();
  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <header className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relatórios institucionais</p>
      <div className="flex items-start gap-3"><span className="shrink-0 rounded-xl bg-primary/10 p-3 text-primary"><FileChartColumn className="h-7 w-7" aria-hidden="true" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="break-words text-2xl font-semibold">Maceió / SINDUSCON-AL</h1><Badge variant="secondary">Em implantação</Badge></div><p className="mt-1 text-sm text-muted-foreground">Base do panorama de Maceió e região metropolitana.</p></div></div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Layers className="h-4 w-4" aria-hidden="true" />Referências verificadas: 82 páginas mensais e 87 trimestrais</p>
    </header>
    <Alert><AlertTitle>Primeiro bloco · slides 1–20</AlertTitle><AlertDescription>Prévia no padrão visual do original {periodicity === 'monthly' ? 'mensal (82 páginas)' : 'trimestral (87 páginas)'}, com abertura, municípios, emprego e lançamentos verticais. Fontes pendentes ficam identificadas nas lâminas. Os slides seguintes e a exportação continuam em implantação.</AlertDescription></Alert>
    <section className="space-y-5 rounded-xl border bg-card p-4 sm:p-6" aria-label="Configuração do estudo">
      <h2 className="font-semibold">Escolha o período</h2>
      <p className="text-sm text-muted-foreground">Recorte do estudo por edição: {periodicity === 'monthly' ? 'Maceió, Pilar, Marechal Deodoro, Paripueira, Rio Largo, Barra de São Miguel e Coqueiro Seco (modelo mensal)' : 'Maceió, Pilar, Marechal Deodoro, Paripueira, Rio Largo e Barra de São Miguel (modelo trimestral)'}.</p>
      {scope.error && <Alert variant="destructive"><AlertTitle>Cidades indisponíveis</AlertTitle><AlertDescription>Não foi possível confirmar os municípios autorizados. Confira seu acesso e tente novamente.<Button className="mt-3 block" variant="outline" onClick={scope.reload}>Tentar novamente</Button></AlertDescription></Alert>}
      {scope.hasToken && !scope.isLoading && !scope.error && !scope.availableUfs.length && <p role="status" className="text-sm text-muted-foreground">Nenhum município monitorado disponível para este acesso.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5"><label htmlFor="maceio-periodicity" className="text-sm font-medium">Tipo de relatório</label><Select value={periodicity} disabled={busy} onValueChange={value => { if (value === periodicity) return; setPosition(value === 'monthly' ? position * 3 : Math.ceil(position / 3)); setPeriodicity(value as Periodicity); }}><SelectTrigger id="maceio-periodicity"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="quarterly">Trimestral</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5"><label htmlFor="maceio-position" className="text-sm font-medium">{periodicity === 'monthly' ? 'Mês de referência' : 'Trimestre de referência'}</label><Select value={String(position)} disabled={busy} onValueChange={value => setPosition(Number(value))}><SelectTrigger id="maceio-position"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: periodicity === 'monthly' ? 12 : 4 }, (_, index) => index + 1).map(value => <SelectItem key={value} value={String(value)}>{periodicity === 'monthly' ? new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, value - 1, 1))) : `${value}º trimestre`}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><label htmlFor="maceio-year" className="text-sm font-medium">Ano de referência</label><Select value={String(year)} disabled={busy} onValueChange={value => setYear(Number(value))}><SelectTrigger id="maceio-year"><SelectValue /></SelectTrigger><SelectContent>{years.map(value => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <p className="text-sm font-medium">Referência selecionada: {maceioPeriod(selection).label}</p>
      {scope.hasToken && !scope.isLoading && !scope.error && coverage.missing.length > 0 && <p role="status" className="text-sm text-destructive">O conjunto exige acesso aos {studyCities.length} municípios da edição. Não disponíveis: {coverage.missing.join(', ')}.</p>}
      <div className="flex flex-wrap items-center gap-3"><Button disabled={!ready || busy} onClick={() => { void market.consult(); }}>Gerar relatório</Button><Button variant="outline" disabled={!ready || busy} onClick={() => { void prepare(); }}>Conferir estrutura</Button></div>
      <p className="text-xs text-muted-foreground">Gerar relatório consulta as fontes verticais, o cadastro de lançamentos e o histórico necessário aos slides. Conferir estrutura organiza apenas o inventário, sem consultar dados.</p>
      {!ready && !scope.isLoading && !scope.error && <p className="text-sm text-muted-foreground">Faça login com acesso aos {studyCities.length} municípios da edição para continuar.</p>}
      {error && <Alert variant="destructive"><AlertTitle>Preparação interrompida</AlertTitle><AlertDescription>{error}<Button className="mt-3 block" variant="outline" disabled={!ready} onClick={() => { void prepare(); }}>Tentar preparar novamente</Button></AlertDescription></Alert>}
    </section>
    {scope.isLoading || busy ? <section aria-label="Carregamento do relatório Maceió" aria-busy="true" className="relative min-h-[32rem] overflow-hidden rounded-xl border bg-card">
    {scope.isLoading && <BrainLoadingState variant="overlay" className="absolute z-10 justify-start overflow-y-auto py-8" title="Conferindo municípios autorizados" description="Aguarde a confirmação do seu acesso ao catálogo de cidades." startedAt={loadingStart.current} />}
    {running && <BrainLoadingState variant="overlay" className="absolute z-10 justify-start overflow-y-auto py-8" title="Organizando páginas do estudo" startedAt={startedAt} description={`${progress.completed} de ${progress.total || reference.slideCount} páginas organizadas`}><Button className="mt-4" variant="outline" onClick={() => { controller.current?.abort(); setRunning(false); }}>Cancelar preparação</Button></BrainLoadingState>}
    {querying && market.state && <BrainLoadingState variant="overlay" className="absolute z-10 justify-start overflow-y-auto py-8" title="Consultando núcleo residencial vertical" startedAt={market.state.startedAt} description={market.state.message}><MaceioGenerationPanel state={market.state} compact /><Button className="mt-4" variant="outline" onClick={market.cancel}>Cancelar consulta</Button></BrainLoadingState>}
    </section> : <>
    {market.state && !querying && <MaceioGenerationPanel state={market.state} />}
    {market.state?.phase === 'cancelled' && <p role="status" className="text-sm text-muted-foreground">{market.state.message}</p>}
    {market.state?.phase === 'error' && <Alert variant="destructive"><AlertTitle>Consulta não concluída</AlertTitle><AlertDescription>{market.state.message}<Button className="mt-3 block" variant="outline" disabled={!ready || busy} onClick={() => { void market.consult(); }}>Tentar consultar novamente</Button></AlertDescription></Alert>}
    {market.state?.report && <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">Conferência do núcleo vertical</summary><div className="mt-4"><MaceioMarketPanel report={market.state.report} /></div></details>}
    {market.state?.hasFailedCities && <Button variant="outline" disabled={!ready || busy} onClick={() => { void market.consult(true); }}>Tentar cidades faltantes</Button>}
    <Tabs defaultValue="structure">
      <TabsList className="flex h-auto max-w-full flex-wrap justify-start"><TabsTrigger value="structure">Slides</TabsTrigger><TabsTrigger value="references">Referências</TabsTrigger><TabsTrigger value="method">Metodologia</TabsTrigger></TabsList>
      <TabsContent value="structure" className="mt-4 space-y-4">
        <Suspense fallback={<BrainLoadingState variant="page" title="Carregando slides de Maceió"/>}><MaceioIntroSlides key={`${periodicity}/${year}/${position}`} selection={selection} data={market.state?.intro??null}/></Suspense>
        <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">Inventário completo · {reference.slideCount} posições</summary><div className="mt-4 space-y-4">{visibleBlueprint ? <>
          <section className="rounded-xl border bg-card p-5" aria-label="Estrutura preparada"><h2 className="font-semibold">Estrutura preparada · {visibleBlueprint.period.label}</h2><p className="mt-1 text-sm text-muted-foreground">{visibleBlueprint.cities.join(', ')} / AL</p><p className="mt-2 text-sm">{visibleBlueprint.pages.length} posições organizadas na ordem exata do original. O conteúdo das páginas ainda está em preparação.</p><p className="mt-1 text-xs text-muted-foreground">Modelo de referência: {visibleBlueprint.reference.label}. Os valores do original são gabarito daquela edição, não dados do novo estudo.</p></section>
          <ol className="grid gap-3 sm:grid-cols-2" aria-label="Páginas do relatório">{visibleBlueprint.pages.map(page => <li key={page.number} className="min-w-0 rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Página {page.number}</p><h3 className="mt-1 break-words text-sm font-medium">{page.title}</h3><p className="mt-2 text-xs text-muted-foreground">{page.status === 'source-pending' ? 'Dados e cálculo a integrar' : 'Conteúdo editorial a revisar'}</p></li>)}</ol>
        </> : <section className="rounded-xl border border-dashed p-6" aria-label="Estrutura não preparada"><h2 className="font-semibold">Prepare o recorte para organizar as páginas</h2><p className="mt-2 text-sm text-muted-foreground">Emprego, lançamentos, vendas, oferta, IVV, preços, estado atual, mercado horizontal{periodicity === 'quarterly' ? ', comercial' : ''} e consultores seguem a sequência do material de referência.</p><p className="mt-2 text-xs text-muted-foreground">Modelo {reference.label}: {reference.slideCount} páginas. Os valores históricos do original não serão usados como dados do novo estudo.</p></section>}</div></details>
      </TabsContent>
      <TabsContent value="references" className="mt-4 grid gap-4 sm:grid-cols-2">{MACEIO_REFERENCES.map(item => <article key={item.id} className="min-w-0 space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">{item.label}</h2><p className="text-sm text-muted-foreground">{item.slideCount} slides · {item.chartCount} gráficos internos · 16:9</p><p className="break-all text-xs text-muted-foreground">{item.file}</p><a className="inline-block text-sm text-primary underline" href={`https://drive.google.com/file/d/${item.sourceId}/view`} target="_blank" rel="noreferrer">Abrir material de referência</a></article>)}</TabsContent>
      <TabsContent value="method" className="mt-4 rounded-xl border bg-card p-5"><h2 className="font-semibold">Regras do material de referência</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm"><li>A edição mensal cobre 7 municípios (inclui Coqueiro Seco); a trimestral cobre 6. A diferença de recorte está em conferência com o analista e não é unificada automaticamente.</li><li>Emprego usa CAGED, fonte externa própria; quando indisponível, o bloco fica pendente sem valores substitutos.</li><li>VGL e VGV aparecem no original com correção pelo INCC; fonte, versão e mês-base do índice precisam de comprovação antes da integração.</li><li>Vendas negativas permanecem visíveis; ausência de informação não representa zero.</li><li>Capital e região metropolitana têm recortes separados. Vertical, horizontal e comercial não são intercambiáveis; o bloco comercial existe só na edição trimestral.</li><li>Fórmulas de IVV, escoamento, tempo médio de oferta e ponderação de preços seguem em comprovação na matriz de indicadores.</li></ul><p className="mt-4 text-sm text-muted-foreground">Esta etapa organiza a estrutura nas posições originais. Consulta a fontes, prévia completa, exportação e revisão metodológica serão habilitadas em blocos verificáveis.</p></TabsContent>
    </Tabs>
    </>}
  </div>;
}
