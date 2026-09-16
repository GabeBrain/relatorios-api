import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AlertCircle, Building2, Clock3, LockKeyhole, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { GeoApiScopeSelector, useGeoApiScope, type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { useAuthStore } from '@/store/auth-store';
import { useCompaniesReport } from '../use-companies-report';

const EmployeesReportWorkspace = lazy(() => import('../components/EmployeesReportWorkspace'));
const CompaniesWorkspace = lazy(() => import('../components/CompaniesWorkspace'));

function WorkspaceLoading() {
  return <div className="space-y-5" aria-label="Carregando relatório"><BrainLoadingState variant="page" title="Preparando relatório" description="Carregando a experiência de dados." /><div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div></div>;
}

export default function EmpresasEmpregadosPage() {
  const hasToken = useAuthStore((state) => state.hasValidToken());
  const [tab, setTab] = useState('employees');
  const [scope, setScope] = useState<GeoScope>({ uf: '', city: '' });
  const onScopeChange = useCallback((next: GeoScope) => setScope(next), []);
  const { strictReady } = useGeoApiScope({ value: scope, onChange: onScopeChange });
  const companies = useCompaniesReport(scope, strictReady);

  useEffect(() => {
    if (tab === 'companies' && !companies.available) setTab('employees');
  }, [tab, companies.available]);

  const companiesUnavailableMessage = companies.report && !companies.report.available ? companies.report.message : null;

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 animate-fade-in"><header className="border-b border-border bg-card px-5 py-4 shadow-sm sm:px-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 space-y-1"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Relatórios · Dados agregados</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Empresas e Empregados</h1><p className="text-sm text-muted-foreground">Emprego formal e estabelecimentos ativos no município selecionado.</p></div><div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4" />{hasToken ? 'Acesso GeoBrain' : 'Login GeoBrain necessário'}</div></div></header>

    <Card className="border-primary/15 shadow-sm"><CardContent className="space-y-2 p-4 sm:p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Escopo geográfico · Empresas</p><GeoApiScopeSelector value={scope} onChange={onScopeChange} />{companies.isLoading && <BrainLoadingState variant="field" title="Verificando competência de Empresas publicada" />}</CardContent></Card>

    {companies.error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Não foi possível consultar Empresas</AlertTitle><AlertDescription>{companies.error}</AlertDescription></Alert>}

    {!companies.isLoading && !companies.error && companiesUnavailableMessage && <Card className="border-dashed"><CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Clock3 className="h-5 w-5" /></span><div><p className="font-medium">Competência de Empresas ainda não disponível</p><p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{companiesUnavailableMessage} Escolha outro município ou aguarde a publicação da competência.</p></div></CardContent></Card>}

    <Tabs value={tab} onValueChange={setTab} className="space-y-5"><TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto"><TabsTrigger value="employees" className="gap-2"><Users className="h-4 w-4" />Empregados<Badge className="ml-1 bg-primary/90 text-primary-foreground">Disponível</Badge></TabsTrigger><TabsTrigger value="companies" disabled={!companies.available} className="gap-2"><Building2 className="h-4 w-4" />Empresas{companies.available ? <Badge className="ml-1 bg-primary/90 text-primary-foreground">Disponível</Badge> : <Badge variant="outline" className="ml-1">Sem competência</Badge>}</TabsTrigger></TabsList>
      <TabsContent value="employees" className="mt-0"><Suspense fallback={<WorkspaceLoading />}><EmployeesReportWorkspace /></Suspense></TabsContent>
      <TabsContent value="companies" className="mt-0">{companies.available && companies.report?.available && companies.municipality && <Suspense fallback={<WorkspaceLoading />}><CompaniesWorkspace municipality={companies.municipality} meta={companies.report.meta} rows={companies.report.rows} /></Suspense>}</TabsContent>
    </Tabs>
  </div>;
}
