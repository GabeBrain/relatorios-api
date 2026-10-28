import { buildingId, type Building } from '../source';
import { monthIndex, periodValid, shiftMonth, type Provenance } from '../expanded/contract';
import { classify } from '../operational/workbench';
import { defaultProtocol, describeBuilding, METHODS, predictCase, runStudy, type InventoryRow, type StudyDataset, type StudyMethod, type StudyResult, type StudyTrial } from '../scientific/study';
import { prepareReferenceModels } from '../expanded/referenceModels';

export type Area = { city: string; uf: string };
export type Universe = StudyDataset & {
  schema: 'forecast-universe-v1'; complete: true; areas: Area[];
  locations: Record<string, Area>; requests: (Area & { type: string; pages: number })[]; missingIds: string[];
};
export type Measure = 'stock' | 'sold' | 'net';
export const measureLabel = (m: Measure) => m === 'stock' ? 'Estoque' : m === 'sold' ? 'Vendas acumuladas' : 'Vendas no intervalo';
export type AnalysisSpec = { cutoff: string; duration: number; methods: StudyMethod[] };
export type CaseAnalysis = { id: string; spec: AnalysisSpec; hash: string; stock: StudyResult; net: StudyResult; evidence?: StudyDataset['evidence'] };
export type Presentation = { row: InventoryRow; method: StudyMethod | null; reason: string; status: string };
export type ChartRow = { month: string; history: number | null; reported: number | null; [key: string]: string | number | null };
export const ALL_METHODS: StudyMethod[] = ['finotti-reference', 'stock-trend', 'constant'];
export const methodLabel = (id: StudyMethod) => METHODS.find(m => m.id === id)!.label;
export const cleanReason = (s: string) => s.replace(/competência/gi, 'mês dos dados').replace(/posição/gi, 'registro').replace(/corte/gi, 'data escolhida');
export const specKey = (hash: string, id: string, spec: AnalysisSpec) => JSON.stringify([hash, id, spec.cutoff, spec.duration, [...spec.methods].sort(), METHODS.map(m => m.version)]);
export function validSpec(spec: AnalysisSpec) {
  return periodValid(spec.cutoff) && Number.isInteger(spec.duration) && spec.duration >= 1 && spec.duration <= 36 && spec.methods.length > 0 && new Set(spec.methods).size === spec.methods.length && spec.methods.every(m => ALL_METHODS.includes(m));
}
export async function analyzeCase(dataset: StudyDataset, id: string, spec: AnalysisSpec): Promise<CaseAnalysis> {
  if (!validSpec(spec)) throw new Error('Data, duração ou métodos inválidos.');
  const building = dataset.buildings.find(b => buildingId(b) === id);
  if (!building) throw new Error('Empreendimento ausente do universo.');
  const subset = { ...dataset, buildings: [building] };
  const protocol = { ...defaultProtocol(subset, 'all'), cutoffs: [spec.cutoff], horizons: Array.from({ length: spec.duration }, (_, i) => i + 1), methods: spec.methods };
  const stock = await runStudy(subset, { ...protocol, target: 'stock' });
  const net = await runStudy(subset, { ...protocol, target: 'net' });
  return { id, spec, hash: dataset.hash, stock, net, evidence: dataset.evidence ? Object.fromEntries(Object.entries(dataset.evidence).filter(([key]) => key.startsWith(`${id}|`))) : undefined };
}
export function present(analysis: CaseAnalysis): Presentation {
  const item = analysis.stock.cases[0];
  const method = ALL_METHODS.find(m => item.methods[m].forecast) ?? null;
  const row = item.inventory;
  return { row, method, status: row.stock === 0 ? 'Esgotado na data' : method === 'finotti-reference' ? 'Referência Finotti disponível' : method ? 'Método exploratório' : 'Sem previsão disponível',
    reason: method === 'finotti-reference' ? 'Disponibilidade matemática; elegibilidade operacional é conferida separadamente.' : cleanReason(item.methods['finotti-reference'].reason) };
}
export function operationStatus(universe: Universe, analysis: CaseAnalysis) {
  const building = universe.buildings.find(b => buildingId(b) === analysis.id)!;
  const c = analysis.stock.cases[0];
  return classify({ building, ...universe.locations[analysis.id] }, analysis.spec.cutoff, new Map(ALL_METHODS.map(m => [m, c.methods[m]])));
}
export function observations(building: Building) {
  const periods = [...new Set(building.typologies_history.map(r => r.period.slice(0, 7)))].filter(periodValid).sort();
  return periods.map(month => {
    const rows = building.typologies_history.filter(r => r.period.slice(0, 7) === month);
    const valid = rows.length > 0 && new Set(rows.map(r => String(r.typology_id))).size === rows.length && rows.every(r => r.qty !== null && Number.isSafeInteger(r.qty) && r.qty > 0 && r.typology_stock !== null && Number.isSafeInteger(r.typology_stock) && r.typology_stock >= 0 && r.typology_stock <= r.qty);
    const units = valid ? rows.reduce((s, r) => s + r.qty!, 0) : null;
    const stock = valid ? rows.reduce((s, r) => s + r.typology_stock!, 0) : null;
    return { month, units, stock };
  });
}
export function chartRows(building: Building, analysis: CaseAnalysis, measure: Measure, step: 1 | 3 | 12 = 1): ChartRow[] {
  const { cutoff, duration } = analysis.spec, item = analysis.stock.cases[0];
  const obs = observations(building), first = obs[0]?.month ?? cutoff;
  const start = Math.max(monthIndex(first), monthIndex(cutoff) - 120);
  const rows: ChartRow[] = [];
  for (let n = start; n <= monthIndex(cutoff) + duration; n++) {
    const month = shiftMonth(cutoff, n - monthIndex(cutoff)), offset = n - monthIndex(cutoff);
    if (offset !== 0 && offset % step !== 0) continue;
    const observation = obs.find(r => r.month === month);
    const row: ChartRow = { month, history: null, reported: null };
    if (offset <= 0 && measure !== 'net' && observation?.stock !== null && observation?.stock !== undefined) row.history = measure === 'stock' ? observation.stock : observation.units! - observation.stock;
    if (offset <= 0 && measure === 'net') {
      const before = shiftMonth(month, -step), initial = obs.find(r => r.month === before);
      const interval = obs.filter(r => r.month > before && r.month <= month);
      let previous = before, total = 0, valid = initial?.stock !== null && initial?.stock !== undefined && observation?.stock !== null && observation?.stock !== undefined;
      const initialIds = building.typologies_history.filter(r => r.period.slice(0, 7) === before).map(r => String(r.typology_id)).sort().join('|');
      for (const r of interval) {
        const evidence = analysis.evidence?.[`${analysis.id}|${r.month}`];
        const group = building.typologies_history.filter(t => t.period.slice(0, 7) === r.month);
        const ids = group.map(t => String(t.typology_id)).sort().join('|');
        valid = valid && !!evidence?.source && !!evidence.intervalMonths && monthIndex(r.month) - monthIndex(previous) === evidence.intervalMonths && r.units === initial?.units && ids === initialIds && group.every(t => t.sold_in_period !== null && Number.isFinite(t.sold_in_period));
        previous = r.month; total += group.reduce((s, t) => s + (t.sold_in_period ?? 0), 0);
      }
      if (valid && previous === month && initialIds && initial!.stock! - total === observation!.stock) row.history = total;
    }
    // Flow labels only exist with evidence of complete, reconciled collection intervals.
    for (const m of analysis.spec.methods) {
      const model = item.methods[m].forecast;
      const point = model?.points.find(p => p.period === month);
      const previous = offset === step ? item.inventory.sold : model?.points.find(p => p.offset === offset - step)?.predicted;
      row[m] = offset === 0 ? measure === 'stock' ? item.inventory.stock : measure === 'sold' ? item.inventory.sold : null
        : !point ? null : measure === 'stock' ? point.stock : measure === 'sold' ? point.predicted : point.predicted !== null && previous !== null && previous !== undefined ? point.predicted - previous : null;
    }
    if (offset > 0) {
      const target = measure === 'net' ? analysis.net : analysis.stock;
      const label = target.trials.find(t => t.horizon === offset && t.actual !== null);
      if (label) {
        if (measure === 'stock') row.reported = label.actual;
        else if (measure === 'sold') row.reported = item.inventory.units! - label.actual!;
        else {
          const prev = offset === step ? 0 : target.trials.find(t => t.horizon === offset - step && t.actual !== null)?.actual;
          row.reported = prev !== null && prev !== undefined ? label.actual! - prev : null;
        }
      }
    }
    rows.push(row);
  }
  return rows;
}
export function metricTrials(analysis: CaseAnalysis, measure: Measure, step: 1 | 3 | 12): StudyTrial[] {
  const source = measure === 'net' ? analysis.net : analysis.stock;
  return source.trials.filter(t => t.horizon % step === 0).map(t => {
    if (measure === 'stock') return t;
    if (measure === 'sold') {
      const predicted = t.predicted === null || t.units === null ? null : t.units - t.predicted;
      const actual = t.actual === null || t.units === null ? null : t.units - t.actual;
      return { ...t, predicted, actual, error: predicted !== null && actual !== null ? predicted - actual : null };
    }
    const prev = t.horizon === step ? { predicted: 0, actual: 0 } : source.trials.find(p => p.horizon === t.horizon - step && p.method === t.method);
    const predicted = t.predicted !== null && prev?.predicted !== null && prev?.predicted !== undefined ? t.predicted - prev.predicted : null;
    const actual = t.actual !== null && prev?.actual !== null && prev?.actual !== undefined ? t.actual - prev.actual : null;
    return { ...t, predicted, actual, error: predicted !== null && actual !== null ? predicted - actual : null };
  });
}
export function pairedTrials(trials: StudyTrial[], methods: StudyMethod[]) {
  const available = methods.filter(m => trials.some(t => t.method === m && t.error !== null));
  const good = new Set(trials.filter(t => t.error !== null).map(t => t.key));
  for (const key of good) if (available.some(m => !trials.some(t => t.key === key && t.method === m && t.error !== null))) good.delete(key);
  return trials.filter(t => t.error !== null && good.has(t.key));
}
export function summarizeInventory(buildings: Building[], cutoff: string) {
  // The list needs classification, not a second copy of every historical series.
  return buildings.map(b => ({ ...describeBuilding(b, cutoff), origin: null }));
}
export async function capabilities(dataset: StudyDataset, ids: string[], cutoff: string) {
  if (cutoff >= '2026-09') await prepareReferenceModels();
  return Object.fromEntries(ids.map(id => {
    const b = dataset.buildings.find(b => buildingId(b) === id);
    if (!b) throw new Error('Cadastro ausente da classificação.');
    const c = predictCase(b, cutoff, [1], ALL_METHODS);
    return [id, ALL_METHODS.filter(m => !!c.methods[m].forecast)];
  }));
}
export const provenanceLabel = (p: Provenance) => ({ observed: 'Coleta confirmada', estimated: 'Dado também estimado', unknown: 'Histórico informado; origem não confirmada', synthetic: 'Demonstração sintética' })[p];

export function aggregatePortfolio(analyses: CaseAnalysis[], method: StudyMethod | 'shown', measure: Measure, step: 1 | 3 | 12) {
  if (!analyses.length) return [];
  if (analyses.some(a => a.spec.cutoff !== analyses[0].spec.cutoff || a.spec.duration !== analyses[0].spec.duration || a.hash !== analyses[0].hash)) throw new Error('A carteira exige os mesmos dados, data e duração.');
  const through = analyses[0].spec.duration;
  return Array.from({ length: Math.floor(through / step) }, (_, i) => {
    const offset = (i + 1) * step;
    const trials = analyses.map(a => metricTrials(a, measure, step).find(t => t.horizon === offset && t.method === (method === 'shown' ? present(a).method : method)));
    const missing = trials.filter(t => t?.predicted === null || t?.predicted === undefined).length;
    const actualMissing = trials.filter(t => t?.actual === null || t?.actual === undefined).length;
    return { month: shiftMonth(analyses[0].spec.cutoff, offset), missing, actualMissing,
      predicted: missing ? null : trials.reduce((s, t) => s + t!.predicted!, 0), reported: actualMissing ? null : trials.reduce((s, t) => s + t!.actual!, 0) };
  });
}
