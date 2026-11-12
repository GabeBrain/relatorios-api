import type { ReactNode } from 'react';
import { AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tamanhoLegivel } from '../lib/chat';
import type { ArquivoEnviado, Entrega, Mensagem, Narrativa, Pergunta } from '../types';
import { CardEntrega } from './CardEntrega';
import { CardNarrativa } from './CardNarrativa';
import { CardPerguntas } from './CardPerguntas';

export interface AcoesThread {
  idCardAtivo: string | null;
  versaoAtual: number;
  /** Mensagem de erro que oferece "Tentar novamente" (a última, com o trabalho em erro). */
  idErroAtivo: string | null;
  enviando: boolean;
  erroAcao: string | null;
  baixando: number | null;
  onResponder: (r: Record<string, string | string[]>) => void;
  onAprovar: () => void;
  onAjustarNarrativa: (texto: string) => void;
  onBaixar: (versao: number) => void;
  onVersoesAnteriores?: () => void;
  onRetomar: () => void;
}

/** Texto do chat (§9): do colaborador à direita, do Slide Maker à esquerda, avisos do sistema ao centro. */
export function MensagemTexto({ autor, children }: { autor: Mensagem['autor']; children: ReactNode }) {
  return (
    <div className={cn('flex', autor === 'usuario' ? 'justify-end' : autor === 'sistema' ? 'justify-center' : 'justify-start')}>
      <div className={cn(
        'max-w-[85%] whitespace-pre-line rounded-xl px-4 py-2.5 text-sm',
        autor === 'usuario' && 'bg-primary/10 text-foreground',
        autor === 'agente' && 'border border-border bg-card',
        autor === 'sistema' && 'bg-muted text-xs text-muted-foreground',
      )}>
        {children}
      </div>
    </div>
  );
}

export function ChatThread({ mensagens, acoes }: { mensagens: Mensagem[]; acoes: AcoesThread }) {
  // Respostas ficam junto do card de perguntas que respondem (o próximo "respostas" depois dele).
  const respostaDe = (i: number) => mensagens.slice(i + 1).find((m) => m.tipo === 'respostas')?.conteudo as { respostas?: Record<string, string | string[]> } | undefined;

  return (
    <ol className="space-y-4" aria-label="Conversa do trabalho">
      {mensagens.map((m, i) => {
        const c = m.conteudo as Record<string, unknown>;
        let corpo: ReactNode = null;
        switch (m.tipo) {
          case 'texto':
            corpo = <MensagemTexto autor={m.autor}>{String(c.texto ?? '')}</MensagemTexto>;
            break;
          case 'arquivos': {
            const arquivos = (c.arquivos ?? []) as ArquivoEnviado[];
            corpo = (
              <MensagemTexto autor="usuario">
                <span className="mb-1 block font-medium">{arquivos.length === 1 ? '1 arquivo enviado' : `${arquivos.length} arquivos enviados`}</span>
                <ul className="space-y-0.5">
                  {arquivos.map((a) => (
                    <li key={a.id} className="flex items-center gap-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{a.nome}</span>
                      <span className="text-muted-foreground">· {tamanhoLegivel(a.bytes)}</span>
                    </li>
                  ))}
                </ul>
                {typeof c.contexto === 'string' && c.contexto && <span className="mt-1 block text-xs text-muted-foreground">Contexto: {c.contexto}</span>}
              </MensagemTexto>
            );
            break;
          }
          case 'perguntas':
            corpo = (
              <CardPerguntas
                perguntas={(c.perguntas ?? []) as Pergunta[]} ativo={m.id === acoes.idCardAtivo}
                respondidas={respostaDe(i)?.respostas} enviando={acoes.enviando} erro={m.id === acoes.idCardAtivo ? acoes.erroAcao : null}
                onEnviar={acoes.onResponder}
              />
            );
            break;
          case 'respostas':
            corpo = null; // exibidas dentro do card de perguntas
            break;
          case 'narrativa':
            corpo = (
              <CardNarrativa
                narrativa={c.narrativa as Narrativa} ativo={m.id === acoes.idCardAtivo} enviando={acoes.enviando}
                erro={m.id === acoes.idCardAtivo ? acoes.erroAcao : null}
                onAprovar={acoes.onAprovar} onAjustar={acoes.onAjustarNarrativa}
              />
            );
            break;
          case 'aprovacao':
            corpo = (
              <MensagemTexto autor="usuario">
                {c.acao === 'aprovar' ? 'Narrativa aprovada. Pode produzir.' : `Ajuste na narrativa: ${String(c.texto ?? '')}`}
              </MensagemTexto>
            );
            break;
          case 'entrega': {
            const entrega = c.entrega as Entrega;
            const atual = entrega.versao === acoes.versaoAtual;
            corpo = (
              <CardEntrega
                entrega={entrega} versaoAtual={acoes.versaoAtual} baixando={acoes.baixando === entrega.versao}
                onBaixar={() => acoes.onBaixar(entrega.versao)}
                onVersoesAnteriores={atual && acoes.versaoAtual > 1 ? acoes.onVersoesAnteriores : undefined}
              />
            );
            break;
          }
          case 'erro':
            corpo = (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-4 text-sm" role={m.id === acoes.idErroAtivo ? 'alert' : undefined}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                <div className="space-y-2">
                  <p>{String(c.mensagem ?? 'Não foi possível concluir esta etapa.')}</p>
                  {m.id === acoes.idErroAtivo && (
                    <Button size="sm" variant="outline" onClick={acoes.onRetomar} disabled={acoes.enviando}>Tentar novamente</Button>
                  )}
                </div>
              </div>
            );
            break;
          default:
            corpo = null;
        }
        return corpo ? <li key={m.id}>{corpo}</li> : null;
      })}
    </ol>
  );
}
