import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { montarRespostas, OUTRO, type Selecao } from '../lib/chat';
import type { Pergunta } from '../types';

interface Props {
  perguntas: Pergunta[];
  /** Card aceita resposta agora (último card, trabalho aguardando respostas). */
  ativo: boolean;
  /** Respostas já enviadas, quando o card é do histórico. */
  respondidas?: Record<string, string | string[]>;
  enviando?: boolean;
  erro?: string | null;
  onEnviar: (respostas: Record<string, string | string[]>) => void;
}

/**
 * Card de perguntas (§9): uma pergunta por bloco, opções como botões com descrição, "(Recomendado)"
 * visível, "Outro" com campo livre, múltipla escolha quando `multipla`. Um único "Enviar respostas",
 * habilitado quando todas as perguntas tiverem resposta.
 */
export function CardPerguntas({ perguntas, ativo, respondidas, enviando, erro, onEnviar }: Props) {
  const [sel, setSel] = useState<Record<string, Selecao | undefined>>({});
  const respostas = montarRespostas(perguntas, sel);

  const alternar = (p: Pergunta, valor: string) => {
    setSel((s) => {
      const atual = s[p.pergunta] ?? { opcoes: [], outro: '' };
      const tem = atual.opcoes.includes(valor);
      const opcoes = p.multipla ? (tem ? atual.opcoes.filter((o) => o !== valor) : [...atual.opcoes, valor]) : [valor];
      return { ...s, [p.pergunta]: { ...atual, opcoes } };
    });
  };

  return (
    <section className="space-y-5 rounded-xl border border-primary/20 bg-card p-5 shadow-sm" aria-label="Perguntas do Slide Maker">
      <p className="text-sm text-muted-foreground">
        {ativo ? 'Antes de montar a narrativa, preciso confirmar alguns pontos.' : 'Perguntas respondidas.'}
      </p>
      {perguntas.map((p, i) => {
        const s = sel[p.pergunta];
        const dada = respondidas?.[p.pergunta];
        const escolhidas = ativo ? (s?.opcoes ?? []) : [dada ?? []].flat();
        const idGrupo = `pergunta-${i}`;
        return (
          <fieldset key={p.pergunta} className="space-y-2" aria-describedby={`${idGrupo}-tipo`}>
            <legend className="space-y-1">
              <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{p.cabecalho}</span>
              <span className="block text-sm font-medium text-foreground">{p.pergunta}</span>
            </legend>
            <span id={`${idGrupo}-tipo`} className="sr-only">{p.multipla ? 'Escolha uma ou mais opções.' : 'Escolha uma opção.'}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {[...p.opcoes.map((o) => ({ valor: o.rotulo, ...o })), { valor: OUTRO, rotulo: 'Outro', descricao: 'Escreva sua resposta.' }].map((o) => {
                const marcado = ativo ? escolhidas.includes(o.valor) : escolhidas.includes(o.rotulo) || (o.valor === OUTRO && escolhidas.some((e) => !p.opcoes.some((x) => x.rotulo === e)));
                return (
                  <button
                    key={o.valor} type="button" disabled={!ativo || enviando} aria-pressed={marcado}
                    onClick={() => alternar(p, o.valor)}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border border-border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      marcado ? 'border-primary bg-primary/10' : ativo && 'hover:border-primary/40 hover:bg-muted/50',
                      !ativo && 'cursor-default',
                    )}
                  >
                    <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border', p.multipla ? 'rounded-sm' : 'rounded-full', marcado ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')} aria-hidden="true">
                      {marcado && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium">{o.rotulo}{'recomendada' in o && o.recomendada && <span className="font-normal text-primary"> (Recomendado)</span>}</span>
                      {o.descricao && <span className="mt-0.5 block text-xs text-muted-foreground">{o.descricao}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            {ativo && s?.opcoes.includes(OUTRO) && (
              <Input
                aria-label={`Outra resposta para: ${p.pergunta}`} placeholder="Sua resposta" value={s.outro} disabled={enviando}
                onChange={(e) => setSel((x) => ({ ...x, [p.pergunta]: { ...x[p.pergunta]!, outro: e.target.value } }))}
              />
            )}
            {!ativo && dada !== undefined && <p className="text-xs text-muted-foreground">Resposta: {[dada].flat().join(', ')}</p>}
          </fieldset>
        );
      })}
      {ativo && (
        <div className="space-y-2">
          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
          <Button disabled={!respostas || enviando} onClick={() => respostas && onEnviar(respostas)}>
            {enviando ? 'Enviando…' : 'Enviar respostas'}
          </Button>
          {!respostas && <p className="text-xs text-muted-foreground">Responda todas as perguntas para enviar.</p>}
        </div>
      )}
    </section>
  );
}
