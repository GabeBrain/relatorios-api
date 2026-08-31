import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BarChart3, CircleHelp, RefreshCw } from 'lucide-react';
import { useGeoApiScope } from '@/features/shared/geo-api-scope-engine';
import type { GeoScope } from '@/features/shared/geo-api-scope-engine/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchPanoramaReportModel } from '../api';
import { ReportPaginator } from '../components/ReportPaginator';
import { PanoramaCityMultiSelect } from '../components/PanoramaCityMultiSelect';
import { PanoramaQuarterRangePicker } from '../components/PanoramaQuarterRangePicker';
import { PanoramaLoadingState } from '../components/PanoramaLoadingState';
import { availableEndQuarters } from '../domain/quarters';
import { type PanoramaGenerationProgress } from '../domain/generation-progress';
import { PANORAMA_REPORT_MANIFEST } from '../report/manifest';
import type { PanoramaScope, Quarter } from '../types';

export default function PanoramaSecoviFiergsPage() {
  const [geo, setGeo] = useState<GeoScope>({ uf: 'SP', city: '' });
  const [cities, setCities] = useState<string[]>([]);
  const [scope, setScope] = useState<PanoramaScope>({ uf: 'SP', cities: [], startQuarter: '1T2022', endQuarter: '2T2026', entity: 'secovi-sp' });
  const [submitted, setSubmitted] = useState<PanoramaScope | null>(null);
  const [generationProgress, setGenerationProgress] = useState<PanoramaGenerationProgress | null>(null);
  const geoApi = useGeoApiScope({ value: geo, onChange: (next) => { setGeo(next); if (next.uf !== geo.uf) { setCities([]); setScope((current) => ({ ...current, cities: [] })); setSubmitted(null); } } });
  const quarters = useMemo(() => availableEndQuarters('1T2019'), []);
  const queryScope = submitted ? { ...submitted, cities: [...submitted.cities].sort((a, b) => a.localeCompare(b, 'pt-BR')) } : null;
  const report = useQuery({
    queryKey: ['panorama-report', queryScope?.uf, queryScope?.cities, queryScope?.startQuarter, queryScope?.endQuarter, queryScope?.entity],
    queryFn: ({ signal }) => fetchPanoramaReportModel(queryScope!, signal, setGenerationProgress),
    enabled: Boolean(queryScope), staleTime: 5 * 60_000, refetchOnWindowFocus: false, refetchOnReconnect: false, retry: 0,
  });
  const ready = Boolean(geoApi.strictReady && cities.length && scope.startQuarter && scope.endQuarter);
  const updateCities = (next: string[]) => { setCities(next); setGeo((current) => ({ ...current, city: next[0] ?? '' })); setScope((current) => ({ ...current, cities: next })); setSubmitted(null); };
  const updateRange = (startQuarter: Quarter, endQuarter: Quarter) => { setScope((current) => ({ ...current, startQuarter, endQuarter })); setSubmitted(null); };
  const generate = () => { if (!ready || !scope.startQuarter) return; const next = { ...scope, uf: geo.uf, cities: [...cities].sort((a, b) => a.localeCompare(b, 'pt-BR')) }; setGenerationProgress(null); setScope(next); setSubmitted(next); };
  return <div className="mx-auto max-w-[1440px] space-y-5 p-4 sm:p-6 animate-fade-in">
    <header className="max-w-3xl"><h1 className="text-2xl font-semibold tracking-tight">Relatório Secovi/FIERGS</h1></header>
    <section className="overflow-visible rounded-xl border border-border bg-card p-4 shadow-sm"><div className="grid grid-cols-1 items-start gap-x-5 gap-y-3 md:grid-cols-[96px_minmax(0,1fr)_minmax(190px,auto)_auto]">
      {!geoApi.hasToken ? <div className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800 md:col-span-2">Faça login no cabeçalho para carregar as cidades monitoradas.</div> : geoApi.error ? <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive md:col-span-2"><span className="min-w-0 flex-1">Falha ao carregar /monitored-cities: {geoApi.error.message}</span><Button type="button" size="sm" variant="outline" onClick={geoApi.reload}><RefreshCw className="h-3 w-3"/>Tentar novamente</Button></div> : <>
        <div className="w-full space-y-1.5"><label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">UF</label><Select value={geo.uf} onValueChange={geoApi.setUf} disabled={geoApi.isLoading || !geoApi.citiesByUf}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder={geoApi.isLoading ? '…' : 'UF'}/></SelectTrigger><SelectContent>{geoApi.availableUfs.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent></Select></div>
        <div className="min-w-[260px] flex-1"><PanoramaCityMultiSelect cities={cities} options={geoApi.availableCities} onChange={updateCities} loading={geoApi.isLoading} disabled={geoApi.isLoading || !geo.uf} /></div>
      </>}
      <PanoramaQuarterRangePicker start={scope.startQuarter} end={scope.endQuarter} options={quarters} onChange={updateRange} />
      <Button className="self-center h-9 whitespace-nowrap" onClick={generate} disabled={!ready || report.isFetching}><BarChart3/>{report.isFetching ? 'Consultando APIs…' : 'Gerar relatório'}</Button>
    </div></section>
    {!submitted && <Alert><CircleHelp className="h-4 w-4"/><AlertTitle>Defina o recorte</AlertTitle><AlertDescription>Escolha a UF, um ou mais municípios monitorados e o período; nenhuma chamada pesada é feita antes de um escopo válido.</AlertDescription></Alert>}
    {report.isPending && submitted && <PanoramaLoadingState label="Consultando APIs e montando o relatório…" progress={generationProgress} />}
    {report.data && report.isFetching && <PanoramaLoadingState compact label="Atualizando relatório…" progress={generationProgress} />}
    {report.isError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>Não foi possível compor o relatório</AlertTitle><AlertDescription><p className="mt-1 break-words">{report.error instanceof Error ? report.error.message : 'A API não retornou um recorte utilizável.'}</p><Button className="mt-3" variant="outline" size="sm" onClick={() => report.refetch()}><RefreshCw/>Tentar novamente</Button></AlertDescription></Alert>}
    {report.data && <Tabs defaultValue="report"><TabsList><TabsTrigger value="report">Relatório ({PANORAMA_REPORT_MANIFEST.length} páginas)</TabsTrigger><TabsTrigger value="method">Metodologia</TabsTrigger></TabsList><TabsContent value="report"><ReportPaginator report={report.data}/></TabsContent><TabsContent value="method"><Alert><CircleHelp className="h-4 w-4"/><AlertTitle>Estados metodológicos explícitos</AlertTitle><AlertDescription>Os lançamentos vêm de `building-with-history`. Vendas, estoque, IVV, preços, coortes e mapa exibem estado da metodologia e proveniência por município — sem fallback para gabarito ou mock.</AlertDescription></Alert></TabsContent></Tabs>}
  </div>;
}
