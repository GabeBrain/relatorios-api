import type { PanoramaReportModel } from '../types';

export interface ConsistencyAlert { id: string; title: string; description: string; kind: 'adjustment' | 'consistency' | 'notice'; }
const period = (value: string | null) => value ? `${value.slice(5, 7)}/${value.slice(0, 4)}` : 'competência não informada';
const number = (value: number | null) => value === null ? 'não informado' : value.toLocaleString('pt-BR', { maximumFractionDigits: 4 });

/** Explain actual operations, not alleged repairs in the upstream database. */
export function reportConsistencyAlerts(report: PanoramaReportModel): ConsistencyAlert[] {
  const alerts: ConsistencyAlert[] = [];
  for (const project of report.cube.projects) {
    const h = project.historyAudit;
    if (!h || h.identityMode !== 'identified') continue;
    const name = `${project.name} · ${project.city}`;
    const removed = h.duplicates.reduce((sum, d) => sum + d.removed, 0);
    if (removed) alerts.push({ id: `dedup:${project.key}`, title: name, kind: 'adjustment',
      description: `${removed} registro(s) histórico(s) repetido(s) foram considerados uma única vez, evitando duplicação de unidades e valores.` });
    if (h.registryTotalUnits !== null && h.capacityAtClosing !== null && h.registryTotalUnits !== h.capacityAtClosing)
      alerts.push({ id: `registry:${project.key}`, title: name, kind: 'consistency',
        description: `O cadastro de ${period(h.registryMonth)} informa ${number(h.registryTotalUnits)} unidades. A base adotada no estudo é a soma tipológica de ${period(h.closingMonth)}, com ${number(h.capacityAtClosing)} unidades. A diferença permanece registrada na auditoria.` });
    else if (h.releaseObservedUnits !== null && h.capacityAtClosing !== null && h.releaseObservedUnits !== h.capacityAtClosing)
      alerts.push({ id: `period:${project.key}`, title: name, kind: 'adjustment',
        description: `Lançamento original: ${number(h.releaseObservedUnits)} unidades. Fotografia de ${period(h.closingMonth)}: ${number(h.capacityAtClosing)} unidades. As bases foram separadas para comparar valores da mesma competência.` });
    if (h.issues.length) alerts.push({ id: `issues:${project.key}`, title: name, kind: 'consistency',
      description: `${h.issues.length} ocorrência(s) de conflito, identidade ou informação histórica incompleta. Os detalhes estão na auditoria; não foram criados valores para preencher essas diferenças.` });
  }
  const represented = new Set(['HISTORY_DUPLICATES_REMOVED', 'CAPACITY_DIFFERS_FROM_ORIGINAL', 'HISTORY_INTEGRITY_BLOCKED']);
  for (const notice of report.notices ?? []) if (!represented.has(notice.code))
    alerts.push({ id: `${notice.code}:${notice.indicator}`, title: notice.indicator, description: notice.reason,
      kind: notice.severity === 'critical' ? 'consistency' : 'notice' });
  const critical = report.reconciliation?.rows?.filter((r) => r.critical && r.status !== 'match') ?? [];
  for (const item of critical) alerts.push({ id: `check:${item.metricId}`, title: 'Conferência de consistência', kind: 'consistency',
    description: `${item.formula} Referência: ${number(item.canonicalTotal)}. Total observado: ${number(item.dimensionalTotal)}. Diferença: ${number(item.delta)}.` });
  if (report.scope.entity === 'fiergs-rs' && !report.reconciliation?.homologable && !critical.length)
    alerts.push({ id: 'checks-unavailable', title: 'Conferência de consistência', kind: 'consistency',
      description: 'A conferência de consistência não retornou um resultado completo para esta geração. Consulte a auditoria para os dados disponíveis.' });
  return alerts;
}
