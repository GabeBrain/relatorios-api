import { Link } from 'react-router-dom';
import { Presentation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROTULO_ESTADO } from '../lib/chat';
import type { Estado } from '../lib/state-machine';
import { RESPONSAVEL_ROTULO, type ResumoTrabalho } from '../types';

const TOM: Partial<Record<Estado, string>> = {
  entregue: 'bg-success/10 text-success',
  erro: 'bg-destructive/10 text-destructive',
  cancelado: 'bg-muted text-muted-foreground',
  aguardando_respostas: 'bg-warning/10 text-warning',
  aguardando_aprovacao: 'bg-warning/10 text-warning',
};

export function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', TOM[estado] ?? 'bg-info/10 text-info')}>
      {ROTULO_ESTADO[estado]}
    </span>
  );
}

interface Props {
  itens: ResumoTrabalho[];
  /** Trabalhos com token neste navegador abrem o chat; os demais só mostram metadados. */
  meus: Set<string>;
}

/** Lista de trabalhos (§9, §15.1 item 3): título, autor, responsável, situação, versão e datas. */
export function ListaTrabalhos({ itens, meus }: Props) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {itens.map((t) => {
        const titulo = t.titulo || 'Sem título';
        const data = new Date(t.updated_at).toLocaleDateString('pt-BR');
        return (
          <li key={t.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Presentation className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                {meus.has(t.id)
                  ? <Link to={`/slide-maker/${t.id}`} className="font-medium hover:underline focus-visible:underline">{titulo}</Link>
                  : <span className="font-medium">{titulo}</span>}
                <p className="truncate text-xs text-muted-foreground">
                  {t.colaborador_email}{t.responsavel && ` · apresenta: ${RESPONSAVEL_ROTULO[t.responsavel]}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pl-8 text-xs text-muted-foreground sm:pl-0">
              <EstadoBadge estado={t.estado} />
              {t.versao_atual > 0 && <span>v{t.versao_atual}</span>}
              <time dateTime={t.updated_at}>{data}</time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
