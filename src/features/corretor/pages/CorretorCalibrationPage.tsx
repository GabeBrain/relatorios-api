import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { errorLabel, ERROR_CATALOG, type ErrorType } from '../lib/error-catalog';
import { VizSwitch } from '../components/audit/FindingCard';
import {
  acknowledgeCalibrationFinding,
  acknowledgeCalibrationType,
  loadCalibrationDashboard,
  type CalibrationDashboard,
  type CalibrationFinding,
  type CalibrationHealth,
} from '../lib/v3/db';

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportCsv(rows: CalibrationFinding[]) {
  const header = ['regra', 'estudo', 'cidade', 'uf', 'slide', 'titulo', 'detalhe', 'origem', 'reconhecido'];
  const body = rows.map((item) => [
    item.finding.type, item.studyName, item.studyCity, item.studyUf, item.finding.slideRef,
    item.finding.title, item.finding.detail, item.origem, item.verdictRevisado ? 'sim' : 'não',
  ]);
  const csv = `\uFEFF${[header, ...body].map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `calibracao-corretor-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function pct(value: number) {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export default function CorretorCalibrationPage() {
  const [dashboard, setDashboard] = useState<CalibrationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDashboard(await loadCalibrationDashboard());
    } catch (error) {
      toast.error('Falha ao carregar calibração', { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const health = useMemo(() => {
    const measured = new Map((dashboard?.health ?? []).map((row) => [row.tipo, row]));
    return Object.keys(ERROR_CATALOG).map((tipo) => measured.get(tipo) ?? {
      tipo, total: 0, fps: 0, corrigidos: 0, fpPct: 0, corrigidosPct: 0,
    } satisfies CalibrationHealth).sort((a, b) => b.fpPct - a.fpPct || b.total - a.total);
  }, [dashboard]);

  const groups = useMemo(() => {
    const map = new Map<string, CalibrationFinding[]>();
    for (const item of dashboard?.queue ?? []) {
      const group = map.get(item.finding.type) ?? [];
      group.push(item);
      map.set(item.finding.type, group);
    }
    return [...map.entries()].sort((a, b) => {
      const newA = a[1].filter((item) => !item.verdictRevisado).length;
      const newB = b[1].filter((item) => !item.verdictRevisado).length;
      return newB - newA || b[1].length - a[1].length;
    });
  }, [dashboard]);

  async function acknowledgeOne(item: CalibrationFinding) {
    const key = `${item.studyId}:${item.ruleId}`;
    setSaving(key);
    try {
      await acknowledgeCalibrationFinding(item.studyId, item.ruleId);
      setDashboard((current) => current && ({
        ...current,
        queue: current.queue.map((row) => row.studyId === item.studyId && row.ruleId === item.ruleId
          ? { ...row, verdictRevisado: true } : row),
      }));
    } catch (error) {
      toast.error('Falha ao reconhecer FP', { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(null);
    }
  }

  async function acknowledgeGroup(tipo: string) {
    setSaving(`group:${tipo}`);
    try {
      await acknowledgeCalibrationType(tipo);
      setDashboard((current) => current && ({
        ...current,
        queue: current.queue.map((row) => row.finding.type === tipo ? { ...row, verdictRevisado: true } : row),
      }));
      toast.success('Grupo reconhecido');
    } catch (error) {
      toast.error('Falha ao reconhecer grupo', { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(null);
    }
  }

  const newCount = dashboard?.queue.filter((item) => !item.verdictRevisado).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/corretor" className="text-muted-foreground hover:text-foreground" title="Voltar ao corretor"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-base font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Calibração do Corretor</h1>
            <p className="text-xs text-muted-foreground">Falsos positivos de todos os estudos · {newCount} novo(s)</p>
          </div>
        </div>
        <button
          onClick={() => dashboard && exportCsv(dashboard.queue)}
          disabled={!dashboard?.queue.length}
          className="text-xs rounded-md px-3 py-1.5 border border-border hover:border-primary/50 inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Carregando calibração…</div>
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Saúde por regra</h2><div className="flex-1 border-t border-border" /></div>
              <div className="rounded-lg border bg-card overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground"><tr><th className="text-left px-3 py-2">Regra</th><th className="text-right px-3 py-2">Achados</th><th className="text-right px-3 py-2">FP</th><th className="text-right px-3 py-2">% FP</th><th className="text-right px-3 py-2">% corrigidos</th></tr></thead>
                  <tbody>{health.map((row) => (
                    <tr key={row.tipo} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{errorLabel(row.tipo as ErrorType)}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.total}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.fps}</td>
                      <td className={cn('px-3 py-2 text-right font-mono', row.fpPct >= 20 && 'text-red-600 dark:text-red-400 font-semibold')}>{pct(row.fpPct)}</td>
                      <td className="px-3 py-2 text-right font-mono">{pct(row.corrigidosPct)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Fila de falsos positivos</h2><span className="text-[10px] text-muted-foreground">{dashboard?.queue.length ?? 0} ocorrência(s)</span><div className="flex-1 border-t border-border" /></div>
              {!groups.length && <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum falso positivo registrado.</div>}
              {groups.map(([tipo, items]) => {
                const pending = items.filter((item) => !item.verdictRevisado).length;
                return (
                  <div key={tipo} className="rounded-lg border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/40 flex items-center gap-3">
                      <div className="flex-1"><h3 className="text-sm font-semibold">{errorLabel(tipo as ErrorType)}</h3><p className="text-[11px] text-muted-foreground">{items.length} FP · {pending} novo(s)</p></div>
                      <button onClick={() => void acknowledgeGroup(tipo)} disabled={pending === 0 || saving !== null} className="text-xs rounded-md border border-border px-2.5 py-1.5 hover:border-primary/50 disabled:opacity-40 inline-flex items-center gap-1.5">
                        {saving === `group:${tipo}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Reconhecer grupo
                      </button>
                    </div>
                    <div className="divide-y divide-border">{items.map((item) => {
                      const key = `${item.studyId}:${item.ruleId}`;
                      return (
                        <article key={key} className={cn('p-4 space-y-3', item.verdictRevisado && 'opacity-55')}>
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{item.finding.title}</span><span className="text-[10px] font-mono rounded border px-1">{item.finding.slideRef}</span>{item.verdictRevisado && <span className="text-[10px] text-emerald-600">✓ reconhecido</span>}</div>
                              <p className="text-xs text-muted-foreground mt-1">{item.finding.detail}</p>
                              <Link to={`/corretor?study=${encodeURIComponent(item.studyId)}`} className="text-[11px] text-primary hover:underline mt-1 inline-block">{item.studyName}{item.studyCity ? ` · ${item.studyCity}${item.studyUf ? `/${item.studyUf}` : ''}` : ''}</Link>
                            </div>
                            <button onClick={() => void acknowledgeOne(item)} disabled={item.verdictRevisado || saving !== null} className="text-[11px] rounded-md border border-border px-2.5 py-1.5 hover:border-primary/50 disabled:opacity-40">
                              {saving === key ? 'Salvando…' : item.verdictRevisado ? 'Reconhecido' : 'Reconhecer'}
                            </button>
                          </div>
                          {item.finding.evidenceImage && <a href={item.finding.evidenceImage} target="_blank" rel="noreferrer"><img src={item.finding.evidenceImage} alt={`Evidência ${item.finding.slideRef}`} className="max-h-64 rounded border object-contain bg-white" /></a>}
                          {item.finding.viz && <VizSwitch finding={item.finding} />}
                        </article>
                      );
                    })}</div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
