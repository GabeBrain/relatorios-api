import { Bot, Clock, Database, Key } from 'lucide-react';

export default function Assistente() {
  return (
    <div className="flex flex-col h-full items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full border border-border bg-muted p-6">
            <Bot className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Assistente AI</h1>
          <p className="text-sm text-muted-foreground">
            A versão ativa desta funcionalidade está sendo desenvolvida em paralelo
            por outro time, fora do escopo deste repositório.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4 text-left space-y-3">
          <p className="text-sm font-medium">Escopo previsto para a funcionalidade:</p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <Database className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              Backend Supabase — armazenamento de contexto e histórico de conversas
            </li>
            <li className="flex items-start gap-2">
              <Key className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              Chaves de API para modelo LLM (Claude / OpenAI) — configuradas no backend
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              Fluxo de embeddings e retrieval sobre a documentação OpenAPI
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          A rota <code className="bg-muted px-1 py-0.5 rounded">/assistente</code> é mantida como legado
          para preservar a estrutura de navegação planejada.
        </p>
      </div>
    </div>
  );
}
