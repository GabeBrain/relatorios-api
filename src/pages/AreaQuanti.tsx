import { Database, Plug, Table2, LineChart } from 'lucide-react';

export default function AreaQuanti() {
  return (
    <div className="flex flex-col h-full items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full border border-border bg-muted p-6">
            <Database className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-semibold">Área Quanti</h1>
            <span className="rounded-md bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
              em implementação
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Área dedicada aos dados quantitativos da Brain. Será conectada por API
            ao banco Quanti, em outro banco de dados.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4 text-left space-y-3">
          <p className="text-sm font-medium">Escopo previsto:</p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <Plug className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              Conexão via APIs com o banco Quanti (autenticação e client dedicados)
            </li>
            <li className="flex items-start gap-2">
              <Table2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              Consulta e exploração das bases quantitativas
            </li>
            <li className="flex items-start gap-2">
              <LineChart className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              Relatórios e visualizações sobre os dados quanti
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          A rota <code className="bg-muted px-1 py-0.5 rounded">/quanti</code> já está
          reservada na navegação; a integração será construída nas próximas etapas.
        </p>
      </div>
    </div>
  );
}
