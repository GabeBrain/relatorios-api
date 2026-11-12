import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Entrega } from '../types';

interface Props {
  entrega: Entrega;
  /** Versão vigente do trabalho; as anteriores ficam no chat como histórico, marcadas como substituídas. */
  versaoAtual: number;
  baixando?: boolean;
  onBaixar: () => void;
  onVersoesAnteriores?: () => void;
}

/** "Seu deck está pronto — vN" (§9), até 3 linhas do que mudou e o botão Baixar PPTX. */
export function CardEntrega({ entrega, versaoAtual, baixando, onBaixar, onVersoesAnteriores }: Props) {
  const atual = entrega.versao === versaoAtual;
  return (
    <section
      className={cn('space-y-3 rounded-xl border p-5 shadow-sm', atual ? 'border-success/30 bg-success/[0.05]' : 'border-border bg-card')}
      aria-label={`Versão ${entrega.versao}`}
    >
      {atual ? (
        <p className="text-base font-semibold">Seu deck está pronto — v{entrega.versao}</p>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-base font-semibold">Deck v{entrega.versao}</p>
          <p className="text-xs text-muted-foreground">Substituído pela v{versaoAtual}</p>
        </div>
      )}
      {entrega.mudancas.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
          {entrega.mudancas.slice(0, 3).map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onBaixar} disabled={baixando} variant={atual ? 'default' : 'outline'} size={atual ? 'default' : 'sm'}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {baixando ? 'Preparando…' : `Baixar PPTX${atual ? '' : ` (v${entrega.versao})`}`}
        </Button>
        {onVersoesAnteriores && (
          <Button variant="link" className="h-auto p-0" onClick={onVersoesAnteriores}>Versões anteriores</Button>
        )}
      </div>
    </section>
  );
}
