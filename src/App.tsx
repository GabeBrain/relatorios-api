import { Component, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/layout/AppLayout';
import Index from './pages/Index.tsx';
import Documentacao from './pages/Documentacao.tsx';
import TestesRequisicao from './pages/TestesRequisicao.tsx';
import TestesArquitetura from './pages/TestesArquitetura.tsx';
import Assistente from './pages/Assistente.tsx';
import NotFound from './pages/NotFound.tsx';

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
            <Routes>
              <Route path="/" element={<Navigate to="/documentacao" replace />} />
              <Route path="/documentacao" element={<Documentacao />} />
              <Route path="/testes-requisicao" element={<TestesRequisicao />} />
              <Route path="/relatorios-secovi" element={<TestesArquitetura />} />
              <Route path="/assistente" element={<Assistente />} />
              <Route path="/mapa" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
