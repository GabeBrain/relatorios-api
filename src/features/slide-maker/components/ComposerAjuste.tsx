import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  /** Ativo só com o deck entregue (§9); fora disso, explica por quê. */
  habilitado: boolean;
  motivo: string;
  enviando?: boolean;
  erro?: string | null;
  onEnviar: (texto: string) => void;
}

/** Pedido de ajuste pelo chat: com o deck entregue, cada pedido gera uma nova versão. */
export function ComposerAjuste({ habilitado, motivo, enviando, erro, onEnviar }: Props) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const enviar = (e?: FormEvent) => {
    e?.preventDefault();
    if (!habilitado || enviando || !texto.trim()) return;
    onEnviar(texto.trim());
    setTexto('');
  };
  const atalho = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviar();
  };
  return (
    <form onSubmit={enviar} className="space-y-1.5 border-t border-border bg-card px-4 py-3 sm:px-6">
      <label htmlFor={id} className="sr-only">Pedir ajuste no deck</label>
      <div className="flex items-end gap-2">
        <Textarea
          id={id} rows={2} maxLength={4000} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={atalho}
          disabled={!habilitado || enviando} aria-describedby={`${id}-ajuda`}
          placeholder={habilitado ? 'Peça um ajuste: "troque o título do slide 4", "inclua os dados de 2026"…' : ''}
          className="min-h-[2.75rem] resize-none"
        />
        <Button type="submit" size="icon" disabled={!habilitado || enviando || !texto.trim()} aria-label="Enviar pedido de ajuste">
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <p id={`${id}-ajuda`} className={erro ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'} role={erro ? 'alert' : undefined}>
        {erro ?? (habilitado ? 'Ctrl+Enter envia. Cada pedido gera uma nova versão do deck.' : motivo)}
      </p>
    </form>
  );
}
