import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { Progress } from '@/components/ui/progress';
import type { ProgressoEnvio as Progresso } from '../lib/api';
import { tamanhoLegivel } from '../lib/chat';

/** Envio dos arquivos com a identidade Brain e o progresso real (bytes gravados no Storage). */
export function ProgressoEnvio({ progresso, inicio }: { progresso: Progresso | null; inicio: number | null }) {
  const pct = progresso && progresso.total > 0 ? Math.min(100, Math.round((progresso.enviados / progresso.total) * 100)) : 0;
  const concluido = progresso !== null && progresso.enviados >= progresso.total;
  return (
    <BrainLoadingState
      title={concluido ? 'Conferindo os arquivos' : 'Enviando os arquivos'}
      description={concluido ? 'O Slide Maker confere o que chegou antes de começar a leitura.'
        : progresso ? `${progresso.arquivo} · ${tamanhoLegivel(progresso.enviados)} de ${tamanhoLegivel(progresso.total)}`
        : 'Preparando o envio ao Slide Maker.'}
      startedAt={inicio}
    >
      <Progress value={pct} aria-label="Progresso do envio" className="mt-3 h-2" />
    </BrainLoadingState>
  );
}
