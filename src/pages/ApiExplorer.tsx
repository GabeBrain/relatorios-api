import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, TerminalSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OperationSpec } from '@/lib/openapi-engine';
import Documentacao from './Documentacao';
import TestesRequisicao, { type Preselect } from './TestesRequisicao';

/**
 * API Explorer — Documentação e Console de requisições num lugar só.
 * "Testar endpoint" na aba Documentação troca para a aba Console com o
 * endpoint já selecionado, sem trocar de página.
 */
export default function ApiExplorer() {
  const location = useLocation();
  const [tab, setTab] = useState<'docs' | 'console'>('docs');
  const [preselect, setPreselect] = useState<Preselect | null>(null);

  // Navegações antigas (/testes-requisicao com state.preselect) caem direto no console
  useEffect(() => {
    const fromState = location.state?.preselect as Preselect | undefined;
    if (fromState) {
      setPreselect(fromState);
      setTab('console');
    }
  }, [location.state]);

  function handleTest(op: OperationSpec) {
    setPreselect({ docId: op.documentId, opId: op.operationId });
    setTab('console');
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'docs' | 'console')} className="flex flex-col h-full">
        <div className="border-b border-border bg-card px-6 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
            <div>
              <h1 className="text-lg font-semibold">API Explorer</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Documentação e console das APIs GeoBrain e Sócio — teste qualquer endpoint sem sair da página.
              </p>
            </div>
            <TabsList className="h-8">
              <TabsTrigger value="docs" className="text-xs gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Documentação
              </TabsTrigger>
              <TabsTrigger value="console" className="text-xs gap-1.5">
                <TerminalSquare className="h-3.5 w-3.5" /> Console
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* forceMount mantém o console vivo ao navegar na documentação (não perde inputs) */}
        <TabsContent forceMount value="docs" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
          <Documentacao onTest={handleTest} />
        </TabsContent>
        <TabsContent forceMount value="console" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
          <TestesRequisicao preselect={preselect} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
