import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BarChart3, CircleHelp, RefreshCw } from 'lucide-react';
import { GeoApiScopeSelector } from '@/features/shared/geo-api-scope-engine';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchPanoramaReportModel } from '../api';
import { ReportPaginator } from '../components/ReportPaginator';
import type { PanoramaScope, Quarter } from '../types';

const quarters: Quarter[] = ['1T2022','2T2022','3T2022','4T2022','1T2023','2T2023','3T2023','4T2023','1T2024','2T2024','3T2024','4T2024','1T2025','2T2025','3T2025','4T2025','1T2026'];
export default function PanoramaSecoviFiergsPage() {
  const [scope, setScope] = useState<PanoramaScope>({ uf: '', city: '', endQuarter: '1T2026' });
  const [submitted, setSubmitted] = useState<PanoramaScope | null>(null);
  const report = useQuery({ queryKey: ['panorama-report', submitted], queryFn: ({ signal }) => fetchPanoramaReportModel(submitted!, signal), enabled: Boolean(submitted), staleTime: 5 * 60_000, retry: 1 });
  const ready = Boolean(scope.uf && scope.city && scope.endQuarter);
  return <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 animate-fade-in"><header><h1 className="text-2xl font-semibold">Relatório Secovi/FIERGS</h1><p className="mt-1 text-sm text-muted-foreground">Livro 16:9 com 62 intenções editoriais. Uma coleta autenticada da API alimenta todas as páginas do recorte.</p></header><section className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex flex-wrap items-end gap-3"><GeoApiScopeSelector value={scope} onChange={(next) => { setScope((current) => ({ ...current, ...next })); setSubmitted(null); }} cityContainerClassName="min-w-[230px] flex-1 space-y-1.5"/><div className="w-36 space-y-1.5"><label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Trimestre final</label><Select value={scope.endQuarter} onValueChange={(v) => { setScope((current) => ({ ...current, endQuarter: v as Quarter })); setSubmitted(null); }}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{quarters.map((quarter) => <SelectItem key={quarter} value={quarter}>{quarter.slice(0,2)} {quarter.slice(2)}</SelectItem>)}</SelectContent></Select></div><Button onClick={() => ready && setSubmitted({ ...scope })} disabled={!ready || report.isFetching}><BarChart3/>{report.isFetching ? 'Consultando APIs…' : 'Gerar relatório'}</Button></div></section>{!submitted && <Alert><CircleHelp className="h-4 w-4"/><AlertTitle>Defina o recorte</AlertTitle><AlertDescription>Escolha uma cidade autorizada; nenhuma chamada pesada é feita antes disso.</AlertDescription></Alert>}{report.isFetching && <div className="space-y-4"><Skeleton className="h-20"/><Skeleton className="h-[540px]"/></div>}{report.isError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>Não foi possível compor o relatório</AlertTitle><AlertDescription><Button className="mt-3" variant="outline" size="sm" onClick={() => report.refetch()}><RefreshCw/>Tentar novamente</Button></AlertDescription></Alert>}{report.data && <Tabs defaultValue="report"><TabsList><TabsTrigger value="report">Relatório (62 páginas)</TabsTrigger><TabsTrigger value="method">Metodologia</TabsTrigger></TabsList><TabsContent value="report"><ReportPaginator report={report.data}/></TabsContent><TabsContent value="method"><Alert><CircleHelp className="h-4 w-4"/><AlertTitle>Estados metodológicos explícitos</AlertTitle><AlertDescription>Os lançamentos vêm de `building-with-history`. Vendas, estoque, IVV, preços, coortes e mapa já possuem suas páginas no PDF, mas exibem estado de metodologia aberta até a homologação com os analistas — sem fallback para gabarito ou mock.</AlertDescription></Alert></TabsContent></Tabs>}</div>;
}
