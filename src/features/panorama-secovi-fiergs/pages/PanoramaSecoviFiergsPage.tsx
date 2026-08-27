import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BarChart3, CircleHelp, RefreshCw } from 'lucide-react';
import { useGeoApiScope } from '@/features/shared/geo-api-scope-engine';
import type { GeoScope } from '@/features/shared/geo-api-scope-engine/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchPanoramaReportModel } from '../api';
import { ReportPaginator } from '../components/ReportPaginator';
import { availableEndQuarters } from '../domain/quarters';
import type { PanoramaScope, Quarter } from '../types';

export default function PanoramaSecoviFiergsPage() {
  const [geo, setGeo] = useState<GeoScope>({ uf: 'SP', city: '' });
  const [cities, setCities] = useState<string[]>([]);
  const [scope, setScope] = useState<PanoramaScope>({ uf: 'SP', cities: [], endQuarter: '1T2026', entity: 'secovi-sp' });
  const [submitted, setSubmitted] = useState<PanoramaScope | null>(null);
  const geoApi = useGeoApiScope({ value: geo, onChange: (next) => { setGeo(next); if (next.uf !== geo.uf) setCities([]); } });
  const quarters = useMemo(() => availableEndQuarters('1T2019'), []);
  const report = useQuery({ queryKey: ['panorama-report', submitted], queryFn: ({ signal }) => fetchPanoramaReportModel(submitted!, signal), enabled: Boolean(submitted), staleTime: 5 * 60_000, retry: 1 });
  const ready = Boolean(geoApi.strictReady && cities.length && scope.endQuarter);
  const updateCities = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = [...event.target.selectedOptions].map((option) => option.value);
    setCities(next); setGeo((current) => ({ ...current, city: next[0] ?? '' })); setSubmitted(null);
  };
  const generate = () => { if (!ready) return; const next = { ...scope, uf: geo.uf, cities: [...cities] }; setScope(next); setSubmitted(next); };
  return <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 animate-fade-in"><header><h1 className="text-2xl font-semibold">Relatório Secovi/FIERGS</h1><p className="mt-1 text-sm text-muted-foreground">Livro 16:9 com 62 intenções editoriais. Uma coleta autenticada da API alimenta todas as páginas do recorte.</p></header><section className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex flex-wrap items-end gap-3">
    {!geoApi.hasToken ? <div className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800">Faça login no cabeçalho para carregar as cidades monitoradas.</div> : geoApi.error ? <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"><span>Falha ao carregar /monitored-cities: {geoApi.error.message}</span><Button type="button" size="sm" variant="outline" onClick={geoApi.reload}><RefreshCw className="h-3 w-3"/>Tentar novamente</Button></div> : <>
      <div className="w-24 space-y-1.5"><label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">UF</label><Select value={geo.uf} onValueChange={geoApi.setUf} disabled={geoApi.isLoading || !geoApi.citiesByUf}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder={geoApi.isLoading ? '…' : 'UF'}/></SelectTrigger><SelectContent>{geoApi.availableUfs.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent></Select></div>
      <div className="min-w-[260px] flex-1 space-y-1.5"><label htmlFor="panorama-cities" className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Municípios (selecione um ou mais)</label><select id="panorama-cities" multiple value={cities} onChange={updateCities} disabled={geoApi.isLoading || !geo.uf || !geoApi.availableCities.length} className="h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring">{geoApi.availableCities.map((city) => <option key={city} value={city}>{city}</option>)}</select></div>
    </>}
    <div className="w-36 space-y-1.5"><label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Trimestre final</label><Select value={scope.endQuarter} onValueChange={(value) => { setScope((current) => ({ ...current, endQuarter: value as Quarter })); setSubmitted(null); }}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{quarters.map((quarter) => <SelectItem key={quarter} value={quarter}>{quarter.slice(0,2)} {quarter.slice(2)}</SelectItem>)}</SelectContent></Select></div><Button onClick={generate} disabled={!ready || report.isFetching}><BarChart3/>{report.isFetching ? 'Consultando APIs…' : 'Gerar relatório'}</Button></div></section>{!submitted && <Alert><CircleHelp className="h-4 w-4"/><AlertTitle>Defina o recorte</AlertTitle><AlertDescription>Escolha a UF e um ou mais municípios monitorados; nenhuma chamada pesada é feita antes de um escopo válido.</AlertDescription></Alert>}{report.isFetching && <div className="space-y-4"><Skeleton className="h-20"/><Skeleton className="h-[540px]"/></div>}{report.isError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>Não foi possível compor o relatório</AlertTitle><AlertDescription><Button className="mt-3" variant="outline" size="sm" onClick={() => report.refetch()}><RefreshCw/>Tentar novamente</Button></AlertDescription></Alert>}{report.data && <Tabs defaultValue="report"><TabsList><TabsTrigger value="report">Relatório (62 páginas)</TabsTrigger><TabsTrigger value="method">Metodologia</TabsTrigger></TabsList><TabsContent value="report"><ReportPaginator report={report.data}/></TabsContent><TabsContent value="method"><Alert><CircleHelp className="h-4 w-4"/><AlertTitle>Estados metodológicos explícitos</AlertTitle><AlertDescription>Os lançamentos vêm de `building-with-history`. Vendas, estoque, IVV, preços, coortes e mapa exibem estado da metodologia e proveniência por município — sem fallback para gabarito ou mock.</AlertDescription></Alert></TabsContent></Tabs>}</div>;
}
