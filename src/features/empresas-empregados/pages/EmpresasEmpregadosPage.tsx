import { lazy, Suspense } from 'react';
import { Building2, LockKeyhole, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { useAuthStore } from '@/store/auth-store';

const EmployeesReportWorkspace = lazy(() => import('../components/EmployeesReportWorkspace'));
const CompaniesPlaceholder = lazy(() => import('../components/CompaniesPlaceholder'));

function WorkspaceLoading() {
  return <div className="space-y-5" aria-label="Carregando relatório"><BrainLoadingState variant="page" title="Preparando relatório" description="Carregando a experiência de dados." /><div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div></div>;
}

export default function EmpresasEmpregadosPage() {
  const hasToken = useAuthStore((state) => state.hasValidToken());

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 animate-fade-in"><header className="border-b border-border bg-card px-5 py-4 shadow-sm sm:px-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 space-y-1"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Relatórios · Dados agregados</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Empresas e Empregados</h1><p className="text-sm text-muted-foreground">Emprego formal no município selecionado.</p></div><div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4" />{hasToken ? 'Acesso GeoBrain' : 'Login GeoBrain necessário'}</div></div></header>

    <Tabs defaultValue="employees" className="space-y-5"><TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto"><TabsTrigger value="employees" className="gap-2"><Users className="h-4 w-4" />Empregados<Badge className="ml-1 bg-primary/90 text-primary-foreground">Disponível</Badge></TabsTrigger><TabsTrigger value="companies" className="gap-2"><Building2 className="h-4 w-4" />Empresas<Badge variant="outline" className="ml-1">Em preparação</Badge></TabsTrigger></TabsList>
      <TabsContent value="employees" className="mt-0"><Suspense fallback={<WorkspaceLoading />}><EmployeesReportWorkspace /></Suspense></TabsContent>
      <TabsContent value="companies" className="mt-0"><Suspense fallback={<WorkspaceLoading />}><CompaniesPlaceholder /></Suspense></TabsContent>
    </Tabs>
  </div>;
}
