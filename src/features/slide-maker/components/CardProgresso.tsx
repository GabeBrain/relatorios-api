import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { EtapaProgresso } from '../types';

interface Props {
  etapa: EtapaProgresso | null;
  inicio: number | null;
  /** Já existe uma versão entregue: cancelar volta para ela. */
  temVersao: boolean;
  cancelando?: boolean;
  onCancelar: () => void;
}

/** Fase em andamento (§9): etapa real vinda do serviço e tempo decorrido real, sem ETA. */
export function CardProgresso({ etapa, inicio, temVersao, cancelando, onCancelar }: Props) {
  return (
    <div className="space-y-2">
      <BrainLoadingState
        title={etapa ?? 'Processando'}
        description="Cada etapa pode levar alguns minutos. Você pode sair desta página: o trabalho continua."
        startedAt={inicio}
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={cancelando}>{cancelando ? 'Cancelando…' : 'Cancelar esta etapa'}</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              {temVersao
                ? 'O ajuste em andamento será interrompido e o trabalho volta para a última versão entregue.'
                : 'O processamento será interrompido e o trabalho será encerrado. Para continuar depois, será preciso criar uma nova apresentação.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar processando</AlertDialogCancel>
            <AlertDialogAction onClick={onCancelar}>Cancelar etapa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
