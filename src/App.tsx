import { Component, lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/layout/AppLayout';
import MapaLegado from './pages/MapaLegado.tsx';
import Home from './pages/Home.tsx';
import ApiExplorer from './pages/ApiExplorer.tsx';
import TestesArquitetura from './pages/TestesArquitetura.tsx';
import Assistente from './pages/Assistente.tsx';
import TQPiemonteVgv from './pages/TQPiemonteVgv.tsx';
import TQPiemonteReleasePrice from './pages/TQPiemonteReleasePrice.tsx';
import TQCidValidacaoBase from './pages/TQCidValidacaoBase.tsx';
import NotFound from './pages/NotFound.tsx';
import DashboardGeobrain from './pages/DashboardGeobrain.tsx';

const CorretorPage = lazy(() => import('./features/corretor/pages/CorretorPage.tsx'));
const CorretorAnalysisPage = lazy(() => import('./features/corretor/pages/CorretorAnalysisPage.tsx'));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-sm text-destructive">
          <div className="space-y-1 text-center">
            <p className="font-semibold">Erro inesperado na página</p>
            <p className="text-xs text-muted-foreground font-mono">{(this.state.error as Error).message}</p>
            <button
              className="mt-2 text-xs underline text-muted-foreground"
              onClick={() => this.setState({ error: null })}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors closeButton />
      <BrowserRouter>
        <AppLayout>
          <ErrorBoundary>
            <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando...</div>}>
              <Routes>
                <Route path="/" element={<Navigate to="/inicio" replace />} />
                <Route path="/inicio" element={<Home />} />

                {/* Relatórios */}
                <Route path="/relatorios/secovi" element={<TestesArquitetura />} />
                <Route path="/relatorios/dashboard-geobrain" element={<DashboardGeobrain />} />

                {/* Auditoria de Estudos (Corretor) */}
                <Route path="/auditoria" element={<CorretorPage />} />
                <Route path="/auditoria/analise" element={<CorretorAnalysisPage />} />

                {/* Qualidade de Dados (por cliente) */}
                <Route path="/qualidade/piemonte/vgv" element={<TQPiemonteVgv />} />
                <Route path="/qualidade/piemonte/release-price" element={<TQPiemonteReleasePrice />} />
                <Route path="/qualidade/cid/validacao-base" element={<TQCidValidacaoBase />} />

                {/* APIs */}
                <Route path="/apis/explorer" element={<ApiExplorer />} />

                {/* Legado (cascas informativas) */}
                <Route path="/assistente" element={<Assistente />} />
                <Route path="/mapa" element={<MapaLegado />} />

                {/* Redirects das rotas antigas (bookmarks/links) */}
                <Route path="/documentacao" element={<Navigate to="/apis/explorer" replace />} />
                <Route path="/testes-requisicao" element={<Navigate to="/apis/explorer" replace />} />
                <Route path="/relatorios-secovi" element={<Navigate to="/relatorios/secovi" replace />} />
                <Route path="/dashboard-geobrain" element={<Navigate to="/relatorios/dashboard-geobrain" replace />} />
                <Route path="/relatorios/corretor" element={<Navigate to="/auditoria" replace />} />
                <Route path="/relatorios/corretor/analise" element={<Navigate to="/auditoria/analise" replace />} />
                <Route path="/testes-qualidade/piemonte-vgv" element={<Navigate to="/qualidade/piemonte/vgv" replace />} />
                <Route path="/testes-qualidade/piemonte-release-price" element={<Navigate to="/qualidade/piemonte/release-price" replace />} />
                <Route path="/testes-qualidade/cid-validacao-base" element={<Navigate to="/qualidade/cid/validacao-base" replace />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
