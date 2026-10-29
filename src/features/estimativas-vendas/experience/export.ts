import { strToU8, zipSync } from 'fflate';
import { buildingId } from '../source';
import { periodValid, shiftMonth } from '../expanded/contract';
import { studyMetrics, type StudyTrial } from '../scientific/study';
import { buildingSpec, methodLabel, metricTrials, operationStatus, pairedTrials, present, provenanceLabel, type AnalysisSpec, type CaseAnalysis, type Measure, type Universe } from './domain';
import { FORECAST_COLUMNS, forecastTable, validateForecastColumns, type ForecastColumn } from './exportColumns';

export const IVV_HEADERS = ['ID Empreendimento', 'Empreendimento', 'ID Tipologia', 'M2', 'Dormitórios', 'Cidade', 'Tipo', 'Padrão', 'Tipologia', 'Status', 'Data de lançamento', 'Mês de referência', 'Foi estimado?', 'Qtd Lançada', 'Venda Bruta', 'Distrato', 'Venda Líquida', 'Estoque Final', 'Tempo em venda', 'INCC-DI', 'INCC-M', 'IVV Atual', 'IVV Dash', 'Preço', 'Flag Esgotamento', 'Flag Lançamento'];
export const htmlEscape = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function csv(rows: Record<string, unknown>[], headers?: string[]) {
  const keys = headers ?? [...new Set(rows.flatMap(r => Object.keys(r)))];
  const cell = (v: unknown) => { let s = v === null || v === undefined ? '' : String(v); if (typeof v === 'string' && /^[=+@\-\t\r]/.test(s)) s = `'${s}`; return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '\ufeff' + [keys.map(cell).join(';'), ...rows.map(r => keys.map(k => cell(r[k])).join(';'))].join('\r\n');
}
const htmlPage = (title: string, body: string) => `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(title)}</title><style>body{font:16px/1.6 system-ui;max-width:900px;margin:40px auto;padding:24px;color:#253322}h1{font-size:28px}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:8px;border-bottom:1px solid #ccc}small{color:#555}@media print{body{margin:0;padding:0}}</style><h1>${htmlEscape(title)}</h1>${body}</html>`;
export function backtestHtml(analyses: CaseAnalysis[], measure: Measure, step: 1 | 3 | 12) {
  const trials = pairedTrials(analyses.flatMap(a => metricTrials(a, measure, step)), analyses[0]?.spec.methods ?? []);
  const groups = [...new Set(trials.map(t => `${t.method}|${t.horizon}|${t.provenance}`))];
  const last = Math.max(0, ...trials.map(t => t.horizon));
  const dates = [...new Set(analyses.map(a => a.spec.cutoff))];
  return htmlPage('Resumo da comparação histórica', `<p>${new Set(analyses.map(a => a.id)).size} empreendimentos · inícios ${htmlEscape(dates.join(', '))} · previsão por ${analyses[0]?.spec.duration ?? 0} meses · ${htmlEscape(measure === 'stock' ? 'Estoque' : measure === 'sold' ? 'Vendas acumuladas' : 'Vendas no intervalo')} em unidades.</p><p>Resumo no horizonte de ${last} meses. Erro = previsto menos informado. Métodos na mesma amostra por horizonte e origem. Repetições do empreendimento não são observações independentes.</p>${groups.length ? '<table><tr><th>Método / horizonte</th><th>Erro médio</th><th>Tendência</th><th>Cobertura</th></tr>' + groups.filter(key => Number(key.split('|')[1]) === last).map(key => {
    const [method, horizon, origin] = key.split('|'); const rows = trials.filter(t => t.method === method && String(t.horizon) === horizon && t.provenance === origin); const m = studyMetrics(rows);
    return `<tr><td>${htmlEscape(methodLabel(method as AnalysisSpec['methods'][number]))} · ${horizon} meses<br><small>${htmlEscape(provenanceLabel(rows[0].provenance))}</small></td><td>${m.maeUnits?.toFixed(2)}</td><td>${m.biasUnits?.toFixed(2)}</td><td>${m.buildings} empreendimentos / ${m.evaluated} comparações</td></tr>`;
  }).join('') + '</table>' : '<p>Sem comparações válidas neste conjunto e intervalo. Nenhuma precisão foi comprovada.</p>'}<p>Histórico informado pode conter estimativas e revisões. Referência Finotti congelada: testes anteriores ao treinamento ficam bloqueados. Sem faixa calibrada nesta análise.</p>`);
}
export function downloadBacktestData(analyses: CaseAnalysis[], measure: Measure, step: 1 | 3 | 12) {
  const trials = analyses.flatMap(a => metricTrials(a, measure, step));
  const files = { 'resumo.html': strToU8(backtestHtml(analyses, measure, step)), 'comparacoes.csv': strToU8(csv(trials.map(t => ({ ...t, target: measure })), ['id', 'cutoff', 'horizon', 'targetMonth', 'method', 'modelVersion', 'target', 'predicted', 'actual', 'error', 'provenance', 'reason'])), 'protocolo.json': strToU8(JSON.stringify({ measure, step, runs: analyses.map(a => ({ id: a.id, snapshotHash: a.hash, spec: a.spec })), pairing: 'Mesmos IDs, datas, alvos e horizonte; sem inferência de independência entre repetições.' }, null, 2)) };
  downloadFile(zipSync(files) as BlobPart, 'backtest-auditavel.zip', 'application/zip');
}
export type ExportPlan = ReturnType<typeof buildExportPlan>;
export function buildExportPlan(universe: Universe, ids: string[], analyses: CaseAnalysis[], spec: AnalysisSpec) {
  if (!universe.complete || !ids.length || new Set(ids).size !== ids.length) throw new Error('Revise o conjunto completo antes de exportar.');
  const map = new Map(analyses.map(a => [a.id, a]));
  if (ids.some(id => { const a = map.get(id); return !a || a.hash !== universe.hash || JSON.stringify(a.spec) !== JSON.stringify(buildingSpec(universe, id, spec)); })) throw new Error('Resultados desatualizados ou ausentes para a seleção.');
  const forecasts: Record<string, unknown>[] = [], history: Record<string, unknown>[] = [], exclusions: Record<string, unknown>[] = [];
  const candidates: Record<string, unknown>[] = [], trials: StudyTrial[] = [];
  const methods: Record<string, number> = {};
  for (const id of ids) {
    const a = map.get(id)!, p = present(a), b = universe.buildings.find(b => buildingId(b) === id)!;
    const start = a.spec.cutoff;
    const area = universe.locations[id], operational = operationStatus(universe, a);
    const rows = b.typologies_history.filter(r => r.period.slice(0, 7) <= start);
    for (const r of rows) history.push({ id_empreendimento: id, id_tipologia: String(r.typology_id), cidade: area.city, uf: area.uf, mes: r.period.slice(0, 7), unidades: r.qty, estoque: r.typology_stock, venda_liquida_informada: r.sold_in_period, origem: universe.evidence?.[`${id}|${r.period.slice(0, 7)}`]?.provenance ?? 'unknown' });
    trials.push(...a.stock.trials, ...a.net.trials);
    if (!p.method) { exclusions.push({ id, nome: p.row.name, arquivo: 'previsoes.csv', motivo: p.status + ': ' + p.reason }); continue; }
    methods[p.method] = (methods[p.method] ?? 0) + 1;
    const f = a.stock.cases[0].methods[p.method].forecast!;
    const at = b.typologies_history.filter(r => r.period.slice(0, 7) === start);
    const one = at.length === 1 && /^\d+$/.test(String(at[0].typology_id)) && /^\d+$/.test(id);
    const targetExists = new Set(b.typologies_history.map(r => r.period.slice(0, 7)));
    // Unknown cadence permits analytical monthly paths, never an approved operational interval.
    const cadence = universe.evidence?.[`${id}|${start}`]?.intervalMonths;
    if (!one) exclusions.push({ id, nome: p.row.name, arquivo: 'CANDIDATO_NAO_IMPORTAR.xlsx', motivo: 'ID único de tipologia e distribuição de unidades não resolvidos.' });
    let previous = p.row.stock!;
    for (const point of f.points.filter(p => p.offset > 0)) {
      if (point.stock === null || point.predicted === null) { exclusions.push({ id, mes: point.period, arquivo: 'previsoes.csv', motivo: 'Previsão sem valor; não convertida em zero.' }); break; }
      const net = previous - point.stock;
      forecasts.push({ id_empreendimento: id, empreendimento: p.row.name, cidade: area.city, uf: area.uf, inicio: start, mes: point.period, unidades: p.row.units, vendas_liquidas_estimadas: net, estoque_estimado: point.stock, metodo: p.method, versao: f.version, estimado: 'Sim', finalidade: targetExists.has(point.period) ? 'comparacao_historica' : 'projecao', elegibilidade_operacional: operational.status, importavel: false });
      if (one && !targetExists.has(point.period) && (!cadence || point.offset % cadence === 0)) {
        const prevStock = cadence && point.offset > cadence ? f.points.find(p => p.offset === point.offset - cadence)?.stock : p.row.stock;
        // With unknown cadence these are explicitly monthly analytical candidate lines.
        const candidateNet = cadence ? prevStock === null || prevStock === undefined ? null : prevStock - point.stock : net;
        if (candidateNet !== null) {
          const row: Record<string, unknown> = Object.fromEntries(IVV_HEADERS.map(k => [k, null]));
          const release = String(b.release_date ?? '').slice(0, 10);
          Object.assign(row, { 'ID Empreendimento': id, Empreendimento: p.row.name, 'ID Tipologia': String(at[0].typology_id), Cidade: area.city, Tipo: b.sourceType, Padrão: p.row.pattern,
            'Data de lançamento': /^\d{4}-\d{2}-\d{2}$/.test(release) ? release.split('-').reverse().join('/') : null,
            'Mês de referência': `${point.period.slice(5, 7)}/${point.period.slice(0, 4)}`, 'Foi estimado?': 'Sim', 'Qtd Lançada': p.row.units, 'Venda Líquida': candidateNet, 'Estoque Final': point.stock });
          candidates.push(row);
        }
      }
      previous = point.stock;
    }
    exclusions.push({ id, nome: p.row.name, arquivo: 'lote_operacional', motivo: operational.reasons.join(' | ') });
  }
  const selected = ids.map(id => map.get(id)!);
  const manifest = { schema: 'forecast-review-package-v1', createdAt: new Date().toISOString(), snapshotHash: universe.hash, fetchedAt: universe.fetchedAt, areas: universe.areas, requests: universe.requests,
    selectedIds: [...ids], spec, methods, selected: ids.length, included: Object.values(methods).reduce((s, n) => s + n, 0), forecastRows: forecasts.length, candidateRows: candidates.length,
    importable: false, candidateCadence: 'Linhas mensais analíticas quando cadência oficial é desconhecida; NÃO IMPORTAR.', pendingFields: IVV_HEADERS.filter(h => candidates.every(r => r[h] === null)),
    reconciliation: 'Não sobrescrever histórico. Reconciliação quando a coleta real chegar depende de definição externa.',
    appliedMethods: selected.map(a => { const m = present(a).method; return { id: a.id, start: a.spec.cutoff, method: m, version: m ? a.stock.cases[0].methods[m].forecast?.version : null }; }),
    backtest: { validComparisons: trials.filter(t => t.error !== null).length, origin: [...new Set(trials.filter(t => t.error !== null).map(t => t.provenance))], metricsPurpose: 'exploratory-reported-history' } };
  const summary = htmlPage('Resumo do conjunto para revisão', `<p><strong>Arquivo candidato para revisão — NÃO IMPORTAR.</strong></p><p>${ids.length} selecionados; ${manifest.included} com previsão; ${forecasts.length} linhas analíticas; ${candidates.length} linhas candidatas estruturais.</p><p>Início ${htmlEscape(spec.cutoff === 'latest' ? 'datas individuais: ' + selected.map(a => a.spec.cutoff).filter((v, i, all) => all.indexOf(v) === i).join(', ') : spec.cutoff)} · duração ${spec.duration} meses. O arquivo corresponde a esse intervalo; períodos existentes permanecem apenas em comparação histórica.</p><p>Métodos: ${htmlEscape(JSON.stringify(methods))}.</p><p>${manifest.backtest.validComparisons ? manifest.backtest.validComparisons + ' comparações válidas de métodos/alvos; detalhes no arquivo de backtests.' : 'Nenhum backtest válido realizado neste conjunto/intervalo.'}</p><p>Cadência, origem por período, preço, tipologias e reconciliação podem impedir uso operacional. Valores vazios são pendências, não zeros.</p><p>Identificação dos dados: ${htmlEscape(universe.hash)}. Consulte manifesto, exclusões e histórico acompanhantes.</p>`);
  return { manifest, forecasts, history, exclusions, candidates, trials, summary, report: backtestHtml(selected, 'stock', 1) };
}
export async function packageFiles(plan: ExportPlan, columns?: readonly ForecastColumn[]) {
  const selectedColumns = columns ? validateForecastColumns(columns) : undefined;
  const files: Record<string, Uint8Array> = {
    'previsoes.csv': strToU8(csv(plan.forecasts, ['id_empreendimento', 'empreendimento', 'cidade', 'uf', 'inicio', 'mes', 'unidades', 'vendas_liquidas_estimadas', 'estoque_estimado', 'metodo', 'versao', 'estimado', 'finalidade', 'elegibilidade_operacional', 'importavel'])),
    'historico_utilizado.csv': strToU8(csv(plan.history, ['id_empreendimento', 'id_tipologia', 'cidade', 'uf', 'mes', 'unidades', 'estoque', 'venda_liquida_informada', 'origem'])), 'resumo.html': strToU8(plan.summary), 'manifesto.json': strToU8(JSON.stringify(plan.manifest, null, 2)),
    'backtests.csv': strToU8(csv(plan.trials as unknown as Record<string, unknown>[], ['id', 'cutoff', 'targetMonth', 'horizon', 'method', 'modelVersion', 'target', 'predicted', 'actual', 'error', 'provenance', 'reason'])),
    'exclusoes.csv': strToU8(csv(plan.exclusions, ['id', 'nome', 'mes', 'arquivo', 'motivo'])), 'comparacao_historica.html': strToU8(plan.report),
  };
  if (selectedColumns) {
    files['previsoes.csv'] = strToU8(csv(plan.forecasts, selectedColumns));
    files['manifesto.json'] = strToU8(JSON.stringify({ ...plan.manifest, analyticalExportColumns: selectedColumns, omittedAnalyticalColumns: FORECAST_COLUMNS.filter(c => !selectedColumns.includes(c)) }, null, 2));
  }
  if (plan.candidates.length) {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([IVV_HEADERS, ...plan.candidates.map(r => IVV_HEADERS.map(h => r[h] ?? null))]), 'CANDIDATO_NAO_IMPORTAR');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Estado', 'NÃO IMPORTAR — contrato externo não homologado'], ['Cadência', plan.manifest.candidateCadence], ['Campos pendentes', plan.manifest.pendingFields.join(' | ')], ['Origem e elegibilidade', 'Consultar manifesto e exclusoes.csv; nenhuma linha aprovada operacionalmente.']]), 'LEIA_ANTES');
    files['CANDIDATO_NAO_IMPORTAR.xlsx'] = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  }
  const hashes: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) hashes[name] = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))].map(n => n.toString(16).padStart(2, '0')).join('');
  files['integridade.json'] = strToU8(JSON.stringify(hashes, null, 2));
  return files;
}
export function downloadFile(bytes: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadPackage(plan: ExportPlan, columns?: readonly ForecastColumn[]) { const files = await packageFiles(plan, columns); downloadFile(zipSync(files) as BlobPart, `estimativas-revisao-${plan.manifest.spec.cutoff}.zip`, 'application/zip'); }
export async function forecastWorkbook(plan: ExportPlan, selected: readonly ForecastColumn[] = FORECAST_COLUMNS) {
  const columns = validateForecastColumns(selected);
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(forecastTable(plan.forecasts, columns));
  ws['!cols'] = columns.map(c => ({ wch: Math.max(14, Math.min(32, c.length + 2)) }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: plan.forecasts.length, c: columns.length - 1 }) };
  XLSX.utils.book_append_sheet(wb, ws, 'previsoes');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Estado', 'Previsões analíticas para revisão; importação não homologada'], ['Dados', plan.manifest.snapshotHash], ['Duração', plan.manifest.spec.duration], ['Início', plan.manifest.spec.cutoff === 'latest' ? 'Último período de cada empreendimento; ver coluna inicio' : plan.manifest.spec.cutoff], ['Colunas exportadas', columns.join(' | ')], ['Colunas omitidas', FORECAST_COLUMNS.filter(c => !columns.includes(c)).join(' | ') || 'Nenhuma'], ['Aviso', 'Vendas e estoque previstos; não substituem coleta. Cadência e origem histórica podem estar pendentes.']]), 'leia_me');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}
export function finalMonth(spec: AnalysisSpec) { return periodValid(spec.cutoff) ? shiftMonth(spec.cutoff, spec.duration) : ''; }
