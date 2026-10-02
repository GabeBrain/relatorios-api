import type { PanoramaReportModel } from '../types';

const columns = ['tipo_registro','cidade','building_id','empreendimento','segmento','subtipo_horizontal','padrao','trimestre_lancamento','unidades_lancadas','unidades_vendidas','oferta_final','vgv_lancado_milhoes','ticket_medio','area_media','preco_m2','cobertura','motivo_rejeicao','metrica','fonte','formula','universo','periodo_observado','total_canonico','total_dimensional','delta','tolerancia','status','critico','codigo_aviso','severidade','paginas_afetadas','slides_oficiais_afetados','decisao_exibicao'] as const;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Evidência operacional para reconciliar o fechamento com o analista, sem alterar o relatório. */
export function buildFiergsAuditCsv(report: PanoramaReportModel): string {
  const projectRows = report.cube.projects.map((project) => ({
    tipo_registro: 'empreendimento', cidade: project.city, building_id: project.buildingId, empreendimento: project.name,
    segmento: project.segment, subtipo_horizontal: project.horizontalSubtype, padrao: project.standard,
    trimestre_lancamento: project.releaseQuarter, unidades_lancadas: project.launchedUnits, unidades_vendidas: project.soldUnits,
    oferta_final: project.finalUnits, vgv_lancado_milhoes: project.launchedVgvMillions, ticket_medio: project.averageTicket,
    area_media: project.averageArea, preco_m2: project.averagePricePerMeter, cobertura: project.coverage, motivo_rejeicao: '',
  }));
  const rejectionRows = report.cube.rejections.map((rejection) => ({
    tipo_registro: 'rejeicao', cidade: rejection.city, building_id: rejection.buildingId, empreendimento: '', segmento: '',
    subtipo_horizontal: '', padrao: '', trimestre_lancamento: '', unidades_lancadas: '', unidades_vendidas: '', oferta_final: '',
    vgv_lancado_milhoes: '', ticket_medio: '', area_media: '', preco_m2: '', cobertura: '', motivo_rejeicao: rejection.reason,
  }));
  const reconciliationRows = (report.reconciliation?.rows ?? []).map((item) => ({
    tipo_registro: 'reconciliacao', metrica: item.metricId, fonte: item.source, formula: item.formula,
    universo: item.universe, periodo_observado: item.period, total_canonico: item.canonicalTotal,
    total_dimensional: item.dimensionalTotal, delta: item.delta, tolerancia: item.tolerance,
    status: item.status, critico: item.critical,
  }));
  const noticeRows = (report.notices ?? []).map((notice) => ({
    tipo_registro: 'aviso_geracao', codigo_aviso: notice.code, severidade: notice.severity,
    metrica: notice.indicator, fonte: notice.source, periodo_observado: notice.period,
    motivo_rejeicao: notice.reason, paginas_afetadas: notice.affectedPages.join(','),
    slides_oficiais_afetados: notice.affectedOfficialSlides.join(','),
    decisao_exibicao: notice.displayDecision,
  }));
  const rows: Record<string, unknown>[] = [...projectRows, ...rejectionRows, ...reconciliationRows, ...noticeRows];
  return `\uFEFF${columns.join(';')}\r\n${rows.map((row) => columns.map((column) => cell(row[column])).join(';')).join('\r\n')}`;
}

export function downloadFiergsAudit(report: PanoramaReportModel): void {
  const blob = new Blob([buildFiergsAuditCsv(report)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `auditoria-fiergs-${report.scope.endQuarter.toLowerCase()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
