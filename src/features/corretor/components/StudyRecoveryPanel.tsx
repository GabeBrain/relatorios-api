import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import CorretorLoadingState from './CorretorLoadingState';
import type { ReviewRecovery } from '../lib/v3/execution';

export default function StudyRecoveryPanel({ recovery, loading, error, savedCount, message, preparing, onPrepare, onReview, onRefresh }: {
  recovery: ReviewRecovery | null; loading: boolean; error?: string; savedCount: number; message?: string;
  preparing: boolean; onPrepare: () => void; onReview: () => void; onRefresh: () => void;
}) {
  return <section className="cp-panel" aria-label="Continuidade da avaliação">
    <h2 className="flex items-center gap-2"><AlertTriangle size={18} aria-hidden="true"/>Avaliação ainda não concluída</h2>
    <p>{savedCount ? `${savedCount} apontamento(s) salvos. Você já pode revisá-los; a avaliação completa e a entrega continuam pendentes.` : 'Os materiais estão guardados. Confira a preparação para continuar a avaliação.'}</p>
    {message && <p className="cp-muted">{message}</p>}
    {loading ? <CorretorLoadingState compact title="Conferindo a retomada…"/> : error ? <p role="alert">{error}</p> : recovery && <div role="status">
      <p className="cp-muted">{recovery.completedBatches} lote(s) com retorno confirmado. Esses resultados serão reaproveitados na retomada.</p>
      {!recovery.canResume && <p>Uma tentativa anterior precisa de conferência pela equipe antes de continuar. Seus resultados e documentos estão preservados.</p>}
    </div>}
    <div className="cp-actions">
      {preparing ? savedCount > 0 && <Button variant="outline" onClick={onReview}>Ver resultados salvos</Button> : <Button variant="outline" onClick={onPrepare}>{recovery?.canResume ? 'Continuar avaliação' : 'Conferir materiais'}</Button>}
      <Button variant="ghost" className="text-[color:var(--gb-tinta)]" disabled={loading} onClick={onRefresh}>Conferir retomada</Button>
    </div>
  </section>;
}
