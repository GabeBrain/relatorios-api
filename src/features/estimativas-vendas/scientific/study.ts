import { buildingId, buildingName, finite, type Building } from '../source';
import { normalizeOrigin, periodValid, monthIndex, shiftMonth, type Origin, type Provenance } from '../expanded/contract';
import { forecast, type ForecastResult } from '../expanded/models';
import { prepareReferenceModels } from '../expanded/referenceModels';
import { quantile } from '../expanded/evaluation';

export const STUDIES = [
  { id: 'all', title: 'Panorama de Curitiba', question: 'O que conseguimos avaliar neste mercado?', condition: 'Todos os empreendimentos; condições recalculadas em cada data.' },
  { id: 'finotti-horizontal', title: 'Finotti · horizontal', question: 'Onde a referência horizontal pode ser aplicada?', condition: 'Padrão documentado, pelo menos 10 unidades, lançamento desde 2020, estoque positivo e idade 1–48; extensão 49–60 identificada. Suspensos são separados.' },
  { id: 'finotti-vertical', title: 'Finotti · vertical', question: 'Como investigar a referência de comparáveis?', condition: 'Vertical com pelo menos 10 unidades, lançamento desde 2020, estoque positivo e idade 1–36; comparáveis ainda precisam estar disponíveis. Suspensos são separados.' },
  { id: 'old-stock', title: 'Estoque antigo', question: 'Como o estoque restante evolui nos empreendimentos antigos?', condition: 'Estoque positivo; horizontal acima de 60 meses ou vertical acima de 36.' },
  { id: 'short-history', title: 'Histórico curto', question: 'O que podemos aprender com poucas coletas?', condition: 'Menos de quatro datas reportadas até a data analisada.' },
  { id: 'other-pattern', title: 'Outras condições', question: 'Quais situações precisam de outro modelo?', condition: 'Padrão/tipo sem correspondência ou porte/status fora da seleção documentada da referência.' },
  { id: 'data-issues', title: 'Dados a esclarecer', question: 'Quais dados limitam a comparação?', condition: 'Ausência, inconsistência, revisão de oferta ou intervalo irregular nas datas reportadas.' },
  { id: 'sold-out', title: 'Já esgotados', question: 'Quais empreendimentos já estavam sem estoque?', condition: 'Estoque zero na data analisada; separados das métricas de previsão.' },
] as const;
export type StudyId = typeof STUDIES[number]['id'];
export const METHODS = [
  { id: 'constant', label: 'Estoque constante', version: 'constant-v1', explanation: 'Mantém o estoque conhecido na data da previsão. É a referência de ausência de redução futura.' },
  { id: 'stock-trend', label: 'Ritmo recente de estoque', version: 'stock-trend-v1', explanation: 'Prolonga a variação do estoque em três meses, com oferta e tipologias estáveis. A variação de estoque não comprova vendas quando há revisões.' },
  { id: 'finotti-reference', label: 'Referência Finotti', version: 'finotti-drive-2026-10-22', explanation: 'Horizontal: A(t) = 1 − (1 − Aₙ)^((t/n)^k), seguida da cauda documentada. Vertical: trajetória dos comparáveis. Treino até setembro de 2026; datas anteriores ficam bloqueadas na retrospectiva.' },
] as const;
export type StudyMethod = typeof METHODS[number]['id'];
export type Target = 'stock' | 'net';
export type PeriodEvidence = { provenance: Provenance; intervalMonths?: 1 | 3; source: string };
export type StudyDataset = {
  buildings: Building[]; city: string; uf: string; fetchedAt: string; hash: string;
  evidence?: Record<string, PeriodEvidence>;
};
export type InventoryRow = {
  id: string; name: string; type: string; cutoff: string; tags: StudyId[];
  age: number | null; pattern: string | null; units: number | null; stock: number | null;
  sold: number | null; typologies: number; reportedDates: number; gaps: number[];
  cadence: string; origin: Origin | null; reasons: string[]; extension: boolean;
};
export type StudyProtocol = {
  schema: 'curitiba-study-v1'; datasetHash: string; study: StudyId;
  cutoffs: string[]; horizons: number[]; methods: StudyMethod[]; target: Target;
  rounding: 'unrounded-baselines-reference-original';
  purpose: 'exploratory-reported-history'; trainingThrough: '2026-09';
  calibration: 'none'; split: 'no-fitting-development-only';
};
export type StudyTrial = {
  key: string; id: string; name: string; type: string; cutoff: string; targetMonth: string;
  horizon: number; method: StudyMethod; modelVersion: string; target: Target;
  units: number | null; initialStock: number | null; age: number | null;
  predicted: number | null; actual: number | null; error: number | null;
  provenance: Provenance; reason: string; matched: boolean;
};
export type StudyCase = {
  id: string; cutoff: string; inventory: InventoryRow;
  methods: Record<StudyMethod, ForecastResult>;
};
export type StudyResult = {
  protocol: StudyProtocol; trials: StudyTrial[]; cases: StudyCase[];
  exclusions: { id: string; name: string; cutoff: string; reason: string }[];
};
const horizontalPatterns = new Set(['Loteamento Aberto', 'Loteamento Fechado', 'Condomínio de Casas/Sobrados', 'Condomínio de casas', 'Geral']);
export const evidenceKey = (id: string, month: string) => `${id}|${month}`;
/** Keep mathematical inputs, not addresses, contacts or unrelated API fields, in the workbench. */
export function compactBuilding(b: Building): Building {
  return { building_id: b.building_id ?? b.id, name: buildingName(b), release_date: b.release_date, sourceType: b.sourceType,
    typologies_history: b.typologies_history.map(r => ({ period: r.period, typology_id: r.typology_id, pattern: r.pattern,
      qty: r.qty, typology_stock: r.typology_stock, sold_in_period: r.sold_in_period,
      time_on_sale: r.time_on_sale, gross_sales: r.gross_sales, distractions: r.distractions, building_status: r.building_status })) };
}
export const sourcePeriods = (buildings: Building[]) => [...new Set(buildings.flatMap(b => b.typologies_history.map(r => r.period.slice(0, 7))))].filter(periodValid).sort();
const numberSum = (values: unknown[]) => values.every(v => finite(v) !== null) ? values.reduce<number>((s, v) => s + Number(v), 0) : null;
const idsAt = (b: Building, month: string) => b.typologies_history.filter(r => r.period.slice(0, 7) === month).map(r => String(r.typology_id)).sort().join('|');
type AggregatedPeriod = { period: string; units: number | null; stock: number | null; net: number | null; ids: string; valid: boolean };
const aggregates = new WeakMap<Building, AggregatedPeriod[]>();
function aggregate(b: Building) {
  const cached = aggregates.get(b);
  if (cached) return cached;
  const groups = new Map<string, Building['typologies_history']>();
  for (const row of b.typologies_history) {
    const period = row.period.slice(0, 7);
    if (!periodValid(period)) continue;
    const group = groups.get(period) ?? []; group.push(row); groups.set(period, group);
  }
  const rows = [...groups].sort(([a], [c]) => a.localeCompare(c)).map(([period, group]) => {
    const ids = group.map(r => String(r.typology_id)).sort();
    const units = numberSum(group.map(r => r.qty)), stock = numberSum(group.map(r => r.typology_stock));
    return { period, units, stock, net: numberSum(group.map(r => r.sold_in_period)), ids: ids.join('|'),
      valid: new Set(ids).size === ids.length && group.every(r => Number.isSafeInteger(finite(r.qty)) && Number(r.qty) > 0 && Number.isSafeInteger(finite(r.typology_stock)) && Number(r.typology_stock) >= 0 && Number(r.typology_stock) <= Number(r.qty)) };
  });
  aggregates.set(b, rows); return rows;
}
const readable = (text: string) => text.replace(/competência/gi, 'mês dos dados').replace(/posição de estoque/gi, 'estoque reportado').replace(/posição no corte/gi, 'dados na data escolhida').replace(/posição/gi, 'dados').replace(/corte/gi, 'data da previsão');

export function describeBuilding(b: Building, cutoff: string): InventoryRow {
  const past = { ...b, typologies_history: b.typologies_history.filter(r => periodValid(r.period.slice(0, 7)) && r.period.slice(0, 7) <= cutoff) };
  const normalized = normalizeOrigin(past, cutoff), o = normalized.origin;
  const dates = sourcePeriods([past]);
  const atDate = past.typologies_history.filter(r => r.period.slice(0, 7) === cutoff);
  const gaps = dates.slice(1).map((p, i) => monthIndex(p) - monthIndex(dates[i]));
  const regular = gaps.length > 0 && new Set(gaps).size === 1;
  const cadence = regular && gaps[0] === 1 ? 'Datas mensais; duração do fluxo não confirmada' : regular && gaps[0] === 3 ? 'Datas trimestrais; duração do fluxo não confirmada' : 'Intervalo irregular ou histórico insuficiente';
  const reasons = [
    'Origem real ou estimada não comprovada por período na API.',
    'O snapshot atual pode conter revisões posteriores. Tipo e lançamento vêm do cadastro atual.',
  ];
  if (!o) reasons.push(readable(normalized.reason));
  const tags: StudyId[] = ['all'];
  if (dates.length < 4) tags.push('short-history');
  const patterns = [...new Set(atDate.map(r => r.pattern))];
  const knownHorizontal = patterns.length > 0 && patterns.every(p => horizontalPatterns.has(p));
  const stock = o?.stock ?? null, age = o?.age ?? null;
  const suspended = atDate.some(r => r.building_status?.trim().toLocaleLowerCase('pt-BR') === 'suspenso');
  const sourceScope = !!o && o.units >= 10 && String(b.release_date ?? '').slice(0, 7) >= '2020-01' && !suspended;
  const extension = b.sourceType === 'Horizontal' && age !== null && age >= 49 && age <= 60;
  if (stock === 0) tags.push('sold-out');
  if (stock !== null && stock > 0 && age !== null) {
    if (sourceScope && b.sourceType === 'Horizontal' && knownHorizontal && age >= 1 && age <= 60) tags.push('finotti-horizontal');
    if (sourceScope && b.sourceType === 'Vertical' && age >= 1 && age <= 36) tags.push('finotti-vertical');
    if (b.sourceType === 'Horizontal' && age > 60 || b.sourceType === 'Vertical' && age > 36) tags.push('old-stock');
  }
  if (b.sourceType === 'Horizontal' && !knownHorizontal || !b.sourceType || o && o.stock > 0 && !sourceScope) tags.push('other-pattern');
  const invalidDate = b.typologies_history.some(r => !periodValid(r.period.slice(0, 7)));
  const changedOffer = o?.history.some(r => r.units !== o.units) ?? false;
  const badFlows = past.typologies_history.some(r => finite(r.sold_in_period) !== null && Number(r.sold_in_period) < 0);
  const badHistoryStock = o?.history.some(r => r.stock === null || r.units === null || r.stock < 0 || r.stock > r.units) ?? false;
  if (!o || changedOffer || badFlows || badHistoryStock || invalidDate || gaps.some(g => g !== 1 && g !== 3) || new Set(gaps).size > 1) tags.push('data-issues');
  if (changedOffer) reasons.push('As unidades lançadas mudam no histórico; revisar o balanço antes de interpretar variação como vendas.');
  if (badFlows) reasons.push('Há vendas líquidas negativas reportadas; a causa não foi inferida.');
  if (badHistoryStock) reasons.push('Há estoque histórico ausente ou inválido.');
  if (invalidDate) reasons.push('Há datas inválidas na fonte; não foram usadas no estudo.');
  if (extension) reasons.push('Idade de 49–60 meses: extensão da referência horizontal, além do ajuste original 1–48.');
  if (stock === 0) reasons.push('Estoque já zerado: não entra nas métricas principais de previsão.');
  if (o && o.units < 10) reasons.push('Menos de 10 unidades: fora do porte usado na seleção documentada do Finotti.');
  if (suspended) reasons.push('Status Suspenso reportado nesta data: fora da seleção da referência.');
  if (atDate.some(r => !r.building_status)) reasons.push('Status histórico ausente: equivalência à seleção da referência permanece limitada.');
  if (atDate.length > 1) reasons.push('Curva agregada do empreendimento; sem distribuição estimada por tipologia.');
  if (patterns.length > 1) reasons.push('Há vários padrões na mesma data; o adaptador Finotti usa o padrão com mais unidades, conforme implementação auditada.');
  return { id: buildingId(b), name: buildingName(b), type: b.sourceType ?? 'Não identificado', cutoff, tags, age,
    pattern: o?.pattern ?? null, units: o?.units ?? null, stock, sold: o?.sold ?? null,
    typologies: atDate.length, reportedDates: dates.length, gaps, cadence, origin: o, reasons, extension };
}

export function inventory(buildings: Building[], cutoff: string) {
  if (!periodValid(cutoff)) throw new Error('Escolha um mês válido para o inventário.');
  const ids = buildings.map(buildingId);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Empreendimentos sem ID ou duplicados na fonte.');
  return buildings.map(b => describeBuilding(b, cutoff));
}

export function defaultProtocol(dataset: StudyDataset, study: StudyId): StudyProtocol {
  const periods = sourcePeriods(dataset.buildings), latest = periods.at(-1);
  const cutoffs = latest ? [12, 6, 3].map(n => shiftMonth(latest, -n)).filter(p => periods.includes(p)) : [];
  return { schema: 'curitiba-study-v1', datasetHash: dataset.hash, study,
    cutoffs: cutoffs.length ? cutoffs : periods.slice(-1), horizons: [3, 6, 12], methods: METHODS.map(m => m.id), target: 'stock',
    rounding: 'unrounded-baselines-reference-original', purpose: 'exploratory-reported-history', trainingThrough: '2026-09', calibration: 'none', split: 'no-fitting-development-only' };
}

function stableHistory(b: Building, o: Origin, from: string, through = o.cutoff) {
  const relevant = o.history.filter(r => r.period >= from && r.period <= through);
  return relevant.length > 0 && relevant.every(r => r.units === o.units && r.stock !== null && Number.isSafeInteger(r.stock) && r.stock >= 0 && r.stock <= o.units && idsAt(b, r.period) === idsAt(b, o.cutoff));
}

/** Only past rows reach the model. Future rows are used exclusively in labelsForTarget. */
export function predictCase(b: Building, cutoff: string, horizons: number[], methods: StudyMethod[]): StudyCase {
  const past: Building = { ...b, typologies_history: b.typologies_history.filter(r => r.period.slice(0, 7) <= cutoff) };
  const item = describeBuilding(past, cutoff), origin = item.origin;
  const results = {} as Record<StudyMethod, ForecastResult>;
  for (const method of METHODS.map(m => m.id)) {
    const fail = (reason: string): ForecastResult => ({ id: item.id, name: item.name, forecast: null, reason });
    if (!methods.includes(method)) results[method] = fail('Método não selecionado neste protocolo.');
    else if (!origin) results[method] = fail(item.reasons.at(2) ?? 'Dados insuficientes na data escolhida.');
    else if (origin.stock === 0) results[method] = fail('Já esgotado na data da previsão; separado da avaliação principal.');
    else if (method === 'stock-trend' && !stableHistory(past, origin, shiftMonth(cutoff, -3))) results[method] = fail('Ritmo recente exige oferta, tipologias e estoque válidos na janela de três meses.');
    else if (method === 'finotti-reference' && !item.tags.some(t => t === 'finotti-horizontal' || t === 'finotti-vertical')) results[method] = fail('Fora das condições documentadas da referência Finotti.');
    else results[method] = forecast(origin, method, Math.max(...horizons));
    results[method].reason = readable(results[method].reason);
  }
  return { id: item.id, cutoff, inventory: item, methods: results };
}

function labelsForTarget(b: Building, item: InventoryRow, dataset: StudyDataset, targetMonth: string, target: Target) {
  const empty = (reason: string) => ({ actual: null as number | null, provenance: 'unknown' as Provenance, reason });
  const o = item.origin;
  if (!o) return empty('Não há dados válidos na data da previsão.');
  const periods = aggregate(b), future = periods.find(r => r.period === targetMonth), start = periods.find(r => r.period === item.cutoff);
  if (!future?.valid) return empty('Sem estoque válido reportado na data de comparação.');
  if (future.units !== o.units || future.ids !== start?.ids) return empty('Oferta ou conjunto de tipologias mudou; alvo não comparável.');
  const allRelevant = periods.filter(r => r.period >= item.cutoff && r.period <= targetMonth);
  if (allRelevant.some(r => !r.valid || r.units !== o.units || r.ids !== start?.ids)) return empty('Oferta ou tipologias revisadas dentro do intervalo de comparação.');
  const targetEvidence = dataset.evidence?.[evidenceKey(item.id, targetMonth)];
  if (target === 'stock') return { actual: future.stock, provenance: targetEvidence?.source ? targetEvidence.provenance : 'unknown' as Provenance, reason: targetEvidence?.provenance === 'observed' && targetEvidence.source ? 'Comparação com estoque de coleta confirmada; snapshot ainda pode conter revisões.' : 'Comparação exploratória com estoque reportado; origem não comprovada.' };
  const after = allRelevant.filter(r => r.period > item.cutoff);
  let previous = item.cutoff;
  for (const row of after) {
    const evidence = dataset.evidence?.[evidenceKey(item.id, row.period)];
    if (!evidence?.source || !evidence.intervalMonths || monthIndex(row.period) - monthIndex(previous) !== evidence.intervalMonths || row.net === null) return empty('Vendas do intervalo exigem duração comprovada de cada coleta e fluxos completos.');
    previous = row.period;
  }
  const net = numberSum(after.map(r => r.net));
  if (!after.length || previous !== targetMonth || net === null || o.stock - net !== future.stock) return empty('Vendas reportadas não conciliam com estoque no intervalo.');
  const evidence = after.map(r => dataset.evidence![evidenceKey(item.id, r.period)]);
  return { actual: net, provenance: evidence.every(e => e.provenance === 'observed') ? 'observed' as Provenance : evidence.every(e => e.provenance === 'synthetic') ? 'synthetic' as Provenance : 'unknown' as Provenance, reason: 'Vendas líquidas reportadas no intervalo, com duração documentada e balanço conciliado.' };
}

export function validateProtocol(dataset: StudyDataset, p: StudyProtocol) {
  if (p.schema !== 'curitiba-study-v1' || p.datasetHash !== dataset.hash || !dataset.hash) throw new Error('Protocolo não corresponde ao snapshot carregado.');
  if (!STUDIES.some(s => s.id === p.study) || !['stock', 'net'].includes(p.target)) throw new Error('Estudo ou alvo inválido.');
  if (!p.cutoffs.length || p.cutoffs.length > 24 || new Set(p.cutoffs).size !== p.cutoffs.length || p.cutoffs.some(c => !periodValid(c))) throw new Error('Selecione de uma a 24 datas diferentes.');
  if (!p.horizons.length || new Set(p.horizons).size !== p.horizons.length || p.horizons.some(h => !Number.isInteger(h) || h < 1 || h > 36)) throw new Error('Horizontes devem ser meses inteiros de 1 a 36.');
  if (!p.methods.length || new Set(p.methods).size !== p.methods.length || p.methods.some(m => !METHODS.some(x => x.id === m))) throw new Error('Escolha métodos válidos sem repetição.');
  if (p.calibration !== 'none' || p.split !== 'no-fitting-development-only' || p.trainingThrough !== '2026-09' || p.rounding !== 'unrounded-baselines-reference-original' || p.purpose !== 'exploratory-reported-history') throw new Error('Esta versão não ajusta nem calibra modelos.');
}

export async function runStudy(dataset: StudyDataset, protocol: StudyProtocol, signal?: AbortSignal, progress?: (done: number, total: number) => void): Promise<StudyResult> {
  validateProtocol(dataset, protocol);
  inventory(dataset.buildings, protocol.cutoffs[0]);
  if (protocol.methods.includes('finotti-reference') && protocol.cutoffs.some(c => c >= protocol.trainingThrough)) await prepareReferenceModels();
  const result: StudyResult = { protocol, trials: [], cases: [], exclusions: [] };
  let done = 0;
  const total = dataset.buildings.length * protocol.cutoffs.length;
  for (const cutoff of [...protocol.cutoffs].sort()) for (const b of dataset.buildings) {
    if (signal?.aborted) throw new DOMException('Estudo cancelado', 'AbortError');
    const c = predictCase(b, cutoff, protocol.horizons, protocol.methods), item = c.inventory;
    if (!item.tags.includes(protocol.study)) result.exclusions.push({ id: item.id, name: item.name, cutoff, reason: 'Não atende à condição escolhida nesta data.' });
    else {
      result.cases.push(c);
      for (const horizon of protocol.horizons) {
        const targetMonth = shiftMonth(cutoff, horizon);
        const label = labelsForTarget(b, item, dataset, targetMonth, protocol.target);
        for (const method of protocol.methods) {
          const prediction = c.methods[method], p = prediction.forecast?.points.find(p => p.offset === horizon);
          const predicted = p && item.origin ? protocol.target === 'stock' ? p.stock : p.predicted === null ? null : p.predicted - item.origin.sold : null;
          const error = predicted !== null && label.actual !== null ? predicted - label.actual : null;
          result.trials.push({ key: `${item.id}|${cutoff}|${horizon}|${protocol.target}`, id: item.id, name: item.name, type: item.type, cutoff, targetMonth, horizon, method,
            modelVersion: prediction.forecast?.version ?? METHODS.find(m => m.id === method)!.version, target: protocol.target,
            units: item.units, initialStock: item.stock, age: item.age, predicted, actual: label.actual, error, provenance: label.provenance,
            reason: predicted === null ? prediction.reason : label.reason, matched: false });
        }
      }
    }
    if (++done % 10 === 0 || done === total) { progress?.(done, total); await new Promise(resolve => setTimeout(resolve, 0)); }
  }
  if (signal?.aborted) throw new DOMException('Estudo cancelado', 'AbortError');
  // Pair only methods with at least one evaluable trial; an entirely unavailable reference
  // remains visible but does not erase the baseline comparison.
  for (const horizon of protocol.horizons) for (const provenance of ['observed', 'estimated', 'unknown', 'synthetic'] as Provenance[]) {
    const rows = result.trials.filter(t => t.horizon === horizon && t.provenance === provenance);
    const available = protocol.methods.filter(m => rows.some(t => t.method === m && t.error !== null));
    const common = new Set(rows.filter(t => t.error !== null).map(t => t.key));
    for (const key of common) if (available.some(m => !rows.some(t => t.key === key && t.method === m && t.error !== null))) common.delete(key);
    for (const row of rows) row.matched = row.error !== null && common.has(row.key);
  }
  return result;
}

export function studyMetrics(trials: StudyTrial[]) {
  const good = trials.filter((t): t is StudyTrial & { error: number } => t.error !== null);
  const ids = [...new Set(good.map(t => t.id))];
  const mean = (xs: number[]) => xs.length ? xs.reduce((s, n) => s + n, 0) / xs.length : null;
  const projectErrors = ids.map(id => good.filter(t => t.id === id));
  return { attempted: trials.length, evaluated: good.length, buildings: ids.length,
    coverage: trials.length ? good.length / trials.length : 0,
    maeUnits: mean(projectErrors.map(rows => mean(rows.map(t => Math.abs(t.error)))!)),
    biasUnits: mean(projectErrors.map(rows => mean(rows.map(t => t.error))!)),
    medianUnits: quantile(good.map(t => Math.abs(t.error)), .5), p90Units: quantile(good.map(t => Math.abs(t.error)), .9),
    medianPp: quantile(good.flatMap(t => t.units ? [100 * Math.abs(t.error) / t.units] : []), .5) };
}
export function groupedMetrics(result: StudyResult, paired = false) {
  return (['observed', 'estimated', 'unknown', 'synthetic'] as Provenance[]).flatMap(provenance => result.protocol.horizons.flatMap(horizon => result.protocol.methods.map(method => {
    const rows = result.trials.filter(t => t.provenance === provenance && t.horizon === horizon && t.method === method);
    return { provenance, horizon, method, ...studyMetrics(paired ? rows.filter(t => t.matched) : rows), totalAttempted: rows.length };
  })));
}
export function summarizeStudy(dataset: StudyDataset, rows: InventoryRow[], result: StudyResult) {
  return { schema: 'curitiba-study-summary-v1', city: dataset.city, source: 'Geobrain API, read-only', hash: dataset.hash, fetchedAt: dataset.fetchedAt,
    buildings: dataset.buildings.length, historyRows: dataset.buildings.reduce((s, b) => s + b.typologies_history.length, 0),
    byType: Object.fromEntries(['Horizontal', 'Vertical'].map(type => [type, dataset.buildings.filter(b => b.sourceType === type).length])),
    inventoryCutoff: rows[0]?.cutoff, conditions: Object.fromEntries(STUDIES.map(s => [s.id, rows.filter(r => r.tags.includes(s.id)).length])),
    horizontalWithinOriginalAge: rows.filter(r => r.tags.includes('finotti-horizontal') && !r.extension).length,
    horizontalAgeExtension: rows.filter(r => r.tags.includes('finotti-horizontal') && r.extension).length,
    protocol: result.protocol,
    partition: { fitting: false, trainingIds: [], calibrationIds: [], finalTestIds: [],
      exploratoryEvaluationIds: [...new Set(result.cases.map(c => c.id))],
      referenceTraining: 'Artefato Finotti congelado, finotti-drive-2026-10-22; IDs originais não reconstruídos como partição independente desta consulta.' },
    evaluations: groupedMetrics(result), pairedEvaluations: groupedMetrics(result, true),
    limitations: ['Origem por período e duração oficial dos fluxos não confirmadas na API.', 'Snapshot atual pode conter revisões de dados históricos.', 'Universo consultado hoje; não comprova cobertura integral do mercado que existia em cada data passada.', 'Finotti congelado treinado até setembro/2026; retrospectivas anteriores bloqueadas.', 'Estudo exploratório sem ajuste, calibração ou seleção de vencedor no teste final.', 'Cartões se sobrepõem; estoques já zerados separados da avaliação principal.'] };
}
