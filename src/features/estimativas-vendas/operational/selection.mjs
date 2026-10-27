// Internal review policy. Not a Geobrain import contract or an operational approval.
export const POLICY_VERSION = 'candidate-2026-10-27';
export function monthIndex(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5)) - 1;
}
export function shiftMonth(value, offset) {
  const index = monthIndex(value);
  if (index === null || !Number.isInteger(offset)) throw new Error('Invalid period');
  const next = index + offset;
  return `${Math.floor(next / 12)}-${String(next % 12 + 1).padStart(2, '0')}`;
}
const validPosition = r => Number.isInteger(r.units) && r.units > 0 && Number.isInteger(r.stock) && r.stock >= 0 && r.stock <= r.units;

/** rows: one building, stable typology IDs, ISO month, raw period lineage (never current cadastro flag).
 * Cadence is explicitly supplied. Caller must identify inferred versus authoritative cadence.
 * Only a single-typology building is calculated in this pilot; no proportional allocation.
 */
export function assessBuilding(rows, { cutoff, cadence }) {
  if (monthIndex(cutoff) === null || ![1, 3].includes(cadence)) throw new Error('Cutoff/cadence invalid');
  const target = shiftMonth(cutoff, cadence);
  const result = { policyVersion: POLICY_VERSION, cutoff, target, cadence, reasons: [], warnings: [],
    decision: 'PENDENTE', calculationAllowed: false, importable: false, stockBuilding: null,
    typologies: [], sourceRows: [], origin: null };
  const add = reason => result.reasons.push(reason);
  const ids = new Set(rows.map(r => r.buildingId));
  if (ids.size !== 1 || rows.some(r => !r.buildingId || !r.typologyId || monthIndex(r.period) === null)) {
    add('IDENTIDADE_OU_COMPETENCIA_INVALIDA'); return result;
  }
  result.buildingId = rows[0].buildingId;
  if (rows.some(r => r.period > cutoff && r.period <= target)) add('ALVO_JA_POSSUI_REGISTRO');
  const past = rows.filter(r => r.period <= cutoff);
  const keys = past.map(r => `${r.typologyId}|${r.period}`);
  if (new Set(keys).size !== keys.length) add('CHAVE_DUPLICADA');
  const current = past.filter(r => r.period === cutoff);
  if (!current.length) add('SEM_POSICAO_NO_CORTE');
  const known = new Set(past.map(r => r.typologyId));
  if (known.size !== new Set(current.map(r => r.typologyId)).size) add('TIPOLOGIA_AUSENTE_NO_CORTE');
  result.typologies = current.map(r => r.typologyId).sort();
  if (current.length && current.every(validPosition)) {
    result.stockBuilding = current.reduce((s, r) => s + r.stock, 0);
    if (result.stockBuilding <= 5 || result.stockBuilding > 30) add('ESTOQUE_EXIGE_COLETA');
  } else add('POSICAO_INVALIDA');
  if (current.some(r => r.estimated === true)) add('PERIODO_ANTERIOR_ESTIMADO');
  if (current.some(r => r.estimated !== false && r.estimated !== true)) add('ORIGEM_ANTERIOR_DESCONHECIDA');
  const expected = Array.from({length: 4}, (_, i) => shiftMonth(cutoff, -i * cadence));
  for (const row of current) {
    const history = past.filter(r => r.typologyId === row.typologyId).sort((a,b) => a.period.localeCompare(b.period));
    const window = history.filter(r => expected.includes(r.period));
    result.sourceRows.push(...window.map(r => r.sourceRow));
    if (history.length < 4) add('MENOS_QUATRO_PERIODOS');
    if (window.length !== 4) add('JANELA_QUATRO_PERIODOS_INCOMPLETA');
    if (history.slice(-4).some((r,i,a) => i > 0 && monthIndex(r.period) - monthIndex(a[i-1].period) !== cadence)) add('CADENCIA_INCONSISTENTE');
    if (window.some(r => !validPosition(r))) add('POSICAO_HISTORICA_INVALIDA');
    if (window.some(r => r.units !== row.units)) add('OFERTA_REVISADA');
    if (window.some(r => r.estimated !== false)) add('QUATRO_COLETAS_NAO_COMPROVADAS');
    if (window.some(r => r.status !== 'Ativo')) add('STATUS_REQUER_REVISAO');
    const ordered = window.slice().sort((a,b)=>a.period.localeCompare(b.period));
    if (ordered.some((r,i) => i > 0 && (!Number.isInteger(r.net) || ordered[i-1].stock-r.stock !== r.net))) add('FLUXO_ESTOQUE_DIVERGENTE');
  }
  if (known.size !== 1) add('MULTITIPOLOGIA_SEM_REGRA_DE_CALCULO');
  if (current.length === 1) {
    const r = current[0], release = monthIndex(r.release);
    const age = release === null ? null : monthIndex(cutoff) - release + 1;
    const vertical = r.type === 'Vertical';
    if (!['Horizontal','Vertical'].includes(r.type)) add('TIPO_NAO_SUPORTADO');
    if (age === null || age < 1 || age > (vertical ? 36 : 60)) add('IDADE_FORA_DO_MODELO');
    if (!vertical && !['Loteamento Aberto','Loteamento Fechado'].includes(r.pattern)) add('PADRAO_REQUER_REVISAO');
    if (cutoff < '2026-09') add('CORTE_ANTERIOR_AO_TREINO');
    if (!vertical && age > 48) result.warnings.push('EXTRAPOLACAO_49_A_60');
    result.origin = {...r, age, sold: r.units - r.stock};
  }
  result.reasons = [...new Set(result.reasons)].sort();
  result.calculationAllowed = result.reasons.length === 0;
  result.decision = result.reasons.some(r => ['ESTOQUE_EXIGE_COLETA','PERIODO_ANTERIOR_ESTIMADO','MENOS_QUATRO_PERIODOS'].includes(r)) ? 'COLETA' : result.calculationAllowed ? 'CANDIDATO_CONDICIONAL' : 'PENDENTE';
  // These missing external decisions cannot be inferred from numeric eligibility.
  result.blockers = ['CONTRATO_BELOGIC', 'GRANULARIDADE', 'CADENCIA_OFICIAL', 'SEMANTICA_FLAG', 'ATUALIDADE_E_AUSENCIA_COLETA_ALVO', 'DIVISAO_METADE', 'POLITICA_PRECO', 'RECONCILIACAO'];
  return result;
}

export function candidateOutput(selection, cumulative, method) {
  if (!selection.calculationAllowed || !selection.origin) throw new Error('Selection not calculable');
  const o = selection.origin;
  if (!Number.isInteger(cumulative) || cumulative < o.sold || cumulative > o.units) throw new Error('Invalid model result');
  return { buildingId: o.buildingId, typologyId: o.typologyId, baseId: null, city: o.city,
    type: o.type, pattern: o.pattern, cutoff: selection.cutoff, periodStart: shiftMonth(selection.cutoff,1),
    competence: selection.target, cadenceMonths: selection.cadence, units: o.units,
    initialStock: o.stock, initialCumulative: o.sold, estimatedNetPeriod: cumulative-o.sold,
    estimatedCumulative: cumulative, finalStock: o.units-cumulative,
    price: null, pricePolicy: 'PENDENTE', estimatedCancellations: null,
    estimatedGross: null, intendedEstimation: true, ivvBatchId: null,
    method, status: 'CANDIDATO_NAO_IMPORTAR', importable: false,
    sourceRows: selection.sourceRows, blockers: selection.blockers,
    rounding: 'Motor Finotti: acumulado inteiro; fluxo = acumulado final - inicial' };
}
