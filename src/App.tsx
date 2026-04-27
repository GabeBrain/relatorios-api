import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/documentacao" element={<Documentacao />} />
            <Route path="/testes-requisicao" element={<TestesRequisicao />} />
            <Route path="/testes-arquitetura" element={<TestesArquitetura />} />
            <Route path="/assistente" element={<Assistente />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
