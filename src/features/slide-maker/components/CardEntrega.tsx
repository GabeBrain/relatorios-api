import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Entrega } from '../types';

interface Props {
  entrega: Entrega;
  /** Esta é a versão vigente (as anteriores aparecem no histórico). */
  atual: boolean;
  baixando?: boolean;
  onBaixar: () => void;
  onVersoesAnteriores?: () => void;
}

/** "Seu deck está pronto — vN" (§9), até 3 linhas do que mudou e o botão Baixar PPTX. */
export function CardEntrega({ entrega, atual, baixando, onBaixar, onVersoesAnteriores }: Props) {
  return (
    <section className="space-y-3 rounded-xl border border-success/30 bg-success/[0.05] p-5 shadow-sm" aria-label={`Versão ${entrega.versao}`}>
      <p className="text-base font-semibold">Seu deck está pronto — v{entrega.versao}</p>
      {entrega.mudancas.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
          {entrega.mudancas.slice(0, 3).map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onBaixar} disabled={baixando} variant={atual ? 'default' : 'outline'}>
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
