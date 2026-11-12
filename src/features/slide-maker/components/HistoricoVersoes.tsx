import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { VersaoDeck } from '../types';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  versoes: VersaoDeck[];
  baixando: number | null;
  onBaixar: (versao: number) => void;
}

/** Todas as versões entregues, da mais recente para a mais antiga, com o que mudou em cada uma. */
export function HistoricoVersoes({ aberto, onFechar, versoes, baixando, onBaixar }: Props) {
  const ordenadas = [...versoes].sort((a, b) => b.versao - a.versao);
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Versões do deck</DialogTitle>
          <DialogDescription>Cada ajuste gera uma nova versão; as anteriores continuam disponíveis.</DialogDescription>
        </DialogHeader>
        <ol className="max-h-[60vh] space-y-3 overflow-y-auto">
          {ordenadas.map((v, i) => (
            <li key={v.versao} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">
                  v{v.versao}{i === 0 && <span className="ml-2 text-xs font-normal text-primary">atual</span>}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                {v.mudancas.length > 0 && (
                  <ul className="list-disc pl-4 text-xs text-muted-foreground">{v.mudancas.map((m) => <li key={m}>{m}</li>)}</ul>
                )}
              </div>
              <Button size="sm" variant="outline" disabled={baixando !== null} onClick={() => onBaixar(v.versao)} aria-label={`Baixar versão ${v.versao}`}>
                <Download className="h-4 w-4" aria-hidden="true" />
                {baixando === v.versao ? 'Preparando…' : 'Baixar'}
              </Button>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
