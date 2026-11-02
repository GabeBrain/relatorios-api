import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { ExportPreview } from './ExportPreview';
import { downloadFile, downloadPackage, forecastWorkbook, type ExportPlan } from './export';
import type { ForecastColumn } from './exportColumns';

export function ExportContent({ plan, columns, onColumns, disabled = false, onBusy, children, actionsFirst = false }: {
  plan: ExportPlan; columns: ForecastColumn[]; onColumns: (columns: ForecastColumn[]) => void; disabled?: boolean; onBusy?: (busy: boolean) => void; children?: React.ReactNode; actionsFirst?: boolean;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const locked = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function download(evidence = false) {
    if (locked.current || disabled) return;
    locked.current = true; setBusy(true); onBusy?.(true); setError('');
    const layout = [...columns];
    try { if (evidence) await downloadPackage(plan, layout, () => alive.current); else { const bytes = await forecastWorkbook(plan, layout); if (alive.current) downloadFile(bytes as BlobPart, 'previsoes.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); } }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { locked.current = false; if (alive.current) { setBusy(false); onBusy?.(false); } }
  }
  const actions = <footer className="eve-footer"><div className="evx-actions"><Button disabled={disabled || busy || !plan.forecasts.length} onClick={() => void download()}>{busy ? 'Preparando arquivo' : 'Baixar previsões em Excel'}</Button><Button variant="ghost" disabled={disabled || busy} onClick={() => void download(true)}>Baixar relatório e evidências</Button>{children}</div>
      <small>Arquivo para revisão; formato de importação ainda não homologado.</small>
      {busy && <BrainLoadingState variant="field" title="Gerando arquivo revisável" />}{error && <p role="alert">{error} Tente baixar novamente.</p>}
    </footer>;
  return <>{actionsFirst && actions}<ExportPreview rows={plan.forecasts} columns={columns} onChange={onColumns} disabled={disabled || busy} />{!actionsFirst && actions}</>;
}
