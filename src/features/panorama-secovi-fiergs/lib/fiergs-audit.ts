import type { PanoramaReportModel } from '../types';
import { scopeExportPeriod, scopeFileSlug } from '../types';
import { panoramaScopeIdentity } from '../scope-identity';

const columns = ['tipo_registro','cidade','building_id','empreendimento','segmento','subtipo_horizontal','padrao','trimestre_lancamento','unidades_lancadas','unidades_vendidas','oferta_final','vgv_lancado_milhoes','ticket_medio','area_media','preco_m2','cobertura','motivo_rejeicao','metrica','fonte','formula','universo','periodo_observado','total_canonico','total_dimensional','delta','tolerancia','status','critico','codigo_aviso','severidade','paginas_afetadas','slides_oficiais_afetados','decisao_exibicao','operacao_coleta','tentativas','requisicoes','duracao_ms','gerado_em','uf_recorte','modo_recorte','preset_id','cidades_recorte','inicio_recorte','fim_recorte',
  'classe_verificacao','contrato_identidade','contrato_capacidade','competencia_cadastro','competencia_fechamento','unidades_lancamento_original','capacidade_derivada','total_cadastral','controle_cadastral_compativel','linhas_recebidas','linhas_conservadas','duplicatas_removidas','identidade_historica','indices_origem','codigo_integridade','modo_identidade'] as const;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Evidência operacional para reconciliar o fechamento com o analista, sem alterar o relatório. */
export function buildFiergsAuditCsv(report: PanoramaReportModel): string {
  const identity = report.scope ? panoramaScopeIdentity(report.scope) : null;
  const scopeRows = identity ? [{ tipo_registro: 'escopo_geracao', cidade: identity.cityList,
    metrica: identity.presetId ?? 'recorte_personalizado', fonte: 'Escopo e proveniência da geração',
    universo: `${report.scope.entity ?? 'secovi-sp'} · ${identity.uf} · ${identity.cityList}`,
    periodo_observado: `${report.scope.startQuarter ?? 'histórico'}–${report.scope.endQuarter}`,
    status: identity.mode, cobertura: report.dataState,
    formula: 'Seleção explícita de municípios em uma única UF; modo oficial somente por igualdade do conjunto.' }] : [];
  const projectRows = report.cube.projects.map((project) => ({
    tipo_registro: 'empreendimento', cidade: project.city, building_id: project.buildingId, empreendimento: project.name,
    segmento: project.segment, subtipo_horizontal: project.horizontalSubtype, padrao: project.standard,
    trimestre_lancamento: project.releaseQuarter, unidades_lancadas: project.launchedUnits, unidades_vendidas: project.soldUnits,
    oferta_final: project.finalUnits, vgv_lancado_milhoes: project.launchedVgvMillions, ticket_medio: project.averageTicket,
    area_media: project.averageArea, preco_m2: project.averagePricePerMeter, cobertura: project.coverage, motivo_rejeicao: '',
    fonte: project.historyAudit?.source?.source ?? 'cubo / entrada direta',
    contrato_identidade: project.historyAudit?.identityVersion, contrato_capacidade: project.historyAudit?.capacityVersion,
    competencia_cadastro: project.historyAudit?.registryMonth, competencia_fechamento: project.historyAudit?.closingMonth,
    unidades_lancamento_original: project.historyAudit?.releaseObservedUnits, capacidade_derivada: project.historyAudit?.capacityAtClosing,
    total_cadastral: project.historyAudit?.registryTotalUnits, controle_cadastral_compativel: project.historyAudit?.registryComparable,
    linhas_recebidas: project.historyAudit?.received, linhas_conservadas: project.historyAudit?.retained,
    duplicatas_removidas: project.historyAudit?.duplicates.reduce((sum, item) => sum + item.removed, 0), modo_identidade: project.historyAudit?.identityMode,
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
    classe_verificacao: item.checkKind,
  }));
  const noticeRows = (report.notices ?? []).map((notice) => ({
    tipo_registro: 'aviso_geracao', codigo_aviso: notice.code, severidade: notice.severity,
    metrica: notice.indicator, fonte: notice.source, periodo_observado: notice.period,
    motivo_rejeicao: notice.reason, paginas_afetadas: notice.affectedPages.join(','),
    slides_oficiais_afetados: notice.affectedOfficialSlides.join(','),
    decisao_exibicao: notice.displayDecision,
  }));
  const recoveredRows = (report.provenance?.cityCollectionAttempts ?? []).map((item) => ({
    tipo_registro: 'coleta_cidade', cidade: item.city, status: item.recovered ? 'recuperada' : 'concluída', tentativas: item.attempts,
  }));
  const collectionMetricRows = (report.provenance?.cityCollectionMetrics ?? []).map((item) => ({
    tipo_registro: 'coleta_operacao', cidade: item.city, operacao_coleta: item.operation,
    requisicoes: item.requests, duracao_ms: item.durationMs,
  }));
  const historyRows = report.cube.projects.flatMap((project) => [
    ...(project.historyAudit?.duplicates ?? []).map((item) => ({ tipo_registro: 'duplicata_historica', cidade: project.city,
      building_id: project.buildingId, identidade_historica: item.identity, indices_origem: item.indices.join(','),
      duplicatas_removidas: item.removed, contrato_identidade: project.historyAudit?.identityVersion, status: 'equivalente_removida', critico: false })),
    ...(project.historyAudit?.issues ?? []).map((item) => ({ tipo_registro: 'integridade_historica', cidade: project.city,
      building_id: project.buildingId, identidade_historica: item.identity, indices_origem: item.indices.join(','),
      codigo_integridade: item.code, contrato_identidade: project.historyAudit?.identityVersion, status: 'impeditivo', critico: true })),
  ]);
  const rows: Record<string, unknown>[] = [...scopeRows, ...projectRows, ...rejectionRows, ...reconciliationRows, ...historyRows, ...noticeRows, ...recoveredRows, ...collectionMetricRows];
  const context = identity ? { gerado_em: report.generatedAt, uf_recorte: identity.uf, modo_recorte: identity.mode,
    preset_id: identity.presetId, cidades_recorte: identity.cityList, inicio_recorte: report.scope.startQuarter, fim_recorte: report.scope.endQuarter } : {};
  return `\uFEFF${columns.join(';')}\r\n${rows.map((row) => columns.map((column) => cell(({ ...context, ...row } as Record<string, unknown>)[column])).join(';')).join('\r\n')}`;
}

export function downloadFiergsAudit(report: PanoramaReportModel): void {
  const blob = new Blob([buildFiergsAuditCsv(report)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fiergsAuditFilename(report);
  anchor.click();
  URL.revokeObjectURL(url);
}

export function fiergsAuditFilename(report: Pick<PanoramaReportModel, 'scope'>): string {
  return panoramaScopeIdentity(report.scope).official ? `auditoria-fiergs-${report.scope.endQuarter.toLowerCase()}.csv`
    : `auditoria-${scopeFileSlug(report.scope)}-${scopeExportPeriod(report.scope).toLowerCase()}.csv`;
}
