import { buildSpSegments } from './segments';
import { summarizeSpGroups } from './distribution';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { isSpMunicipalPreview, monthOf, type SpHistoryBatch, type SpHistoryMetric, type SpLaunchHistory, type SpPreview } from './model';
import { matchedLaunchMonths } from './history';
import { buildSpTemporalPreview, priorMonth, type SpTemporalInput } from './temporal';

export interface SpHistoryBatchInput { current: SpTemporalInput; previous?: SpTemporalInput }
export function priorYearQuarter(quarter: Quarter): Quarter {
  return `${quarter.slice(0, 2)}${Number(quarter.slice(2)) - 1}` as Quarter;
}

/** Publish the three comparisons together only after both windows reconcile. */
export function buildSpHistoryBatch(input: SpHistoryBatchInput, municipal: SpPreview): SpHistoryBatch {
  const blocked = (message: string): SpHistoryBatch => ({ status: 'blocked', issues: [message], comparisons: {}, checks: [] });
  const months = matchedLaunchMonths(municipal);
  if (!months || municipal.patterns?.status !== 'ready') return blocked('Confira os totais municipais e seus padrões antes dos históricos.');
  if (!input.previous) return blocked('A janela do ano anterior não foi concluída.');
  const windows = [input.current, input.previous];
  for (let index = 0; index < windows.length; index++) {
    const source = windows[index], periods = index === 0 ? months.current : months.previous;
    if (source.city !== 'São Paulo' || source.uf !== 'SP' || source.groupBy !== 'Padrão' || source.windowEnd !== periods.at(-1)) return blocked('O escopo ou a janela das fontes históricas não coincide com a seleção.');
    for (const name of ['releases', 'sales', 'stock'] as const) {
      const allowed = name === 'stock' ? [priorMonth(periods[0]), ...periods] : periods;
      if (source[name].some(row => !allowed.includes(monthOf(row.period) ?? ''))) return blocked('A fonte retornou meses fora da janela equivalente. Nenhum mês extra foi incorporado.');
    }
  }
  const current = buildSpTemporalPreview(input.current, municipal.quarter);
  const previous = buildSpTemporalPreview(input.previous, priorYearQuarter(municipal.quarter));
  if (!isSpMunicipalPreview(current) || current.patterns?.status !== 'ready') return { ...blocked(`A janela atual não foi conferida. ${current.issues[0] ?? 'Confira os padrões retornados.'}`), checks: current.checks };
  if (!isSpMunicipalPreview(previous) || previous.patterns?.status !== 'ready') return { ...blocked(`A janela do ano anterior não foi conferida. ${previous.issues[0] ?? 'Confira os padrões retornados.'}`), checks: [...current.checks, ...previous.checks] };
  if (current.monthly!.map(row => row.month).join('|') !== months.current.join('|') || previous.monthly!.map(row => row.month).join('|') !== months.previous.join('|')) return blocked('As janelas dos dois anos não cobrem os mesmos meses.');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const groupKeys = (report: SpPreview) => report.patterns!.rows.map(row => normalize(row.group)).sort().join('|');
  if (groupKeys(current) !== groupKeys(municipal) || groupKeys(previous) !== groupKeys(municipal)) return blocked('Os grupos cobertos diferem entre as fontes ou os anos. Confirme o universo antes de comparar.');
  const labels = { openingStock: 'Oferta inicial', launches: 'Lançamentos', sales: 'Vendas líquidas', closingStock: 'Oferta final', stock: 'Oferta final' };
  const checks = [...current.checks, ...previous.checks];
  const metrics: SpHistoryMetric[] = ['launches', 'sales', 'stock'];
  for (const expected of municipal.monthly!) {
    const actual = current.monthly!.find(row => row.month === expected.month)!;
    for (const field of ['openingStock', 'launches', 'sales', 'closingStock'] as const) checks.push({ label: `Releitura ${expected.month} · ${labels[field]}`, expected: expected[field], actual: actual[field], delta: actual[field] - expected[field] });
  }
  for (const row of municipal.patterns.rows) {
    const actual = current.patterns.rows.find(value => normalize(value.group) === normalize(row.group))!;
    for (const field of metrics) checks.push({ label: `${row.group} · ${labels[field]}`, expected: row[field], actual: actual[field], delta: actual[field] - row[field] });
  }
  for (const field of metrics) {
    if (municipal.metrics[field] === null || current.metrics[field] === null || previous.metrics[field] === null) return blocked('Os totais das janelas ainda não foram comprovados.');
    checks.push({ label: `Total atual · ${labels[field]}`, expected: municipal.metrics[field]!, actual: current.metrics[field]!, delta: current.metrics[field]! - municipal.metrics[field]! });
  }
  if (checks.some(check => check.kind !== 'balance' && check.delta !== 0 || !Number.isSafeInteger(check.actual))) return { ...blocked('A releitura diverge dos totais municipais. Confira os dados reais novamente; o lote não mistura resultados de consultas diferentes.'), checks };
  const compare = (now: number, before: number) => ({ current: now, previous: before, delta: now - before, variation: before > 0 ? (now - before) / before * 100 : null });
  const comparisons: SpHistoryBatch['comparisons'] = {};
  for (const metric of metrics) {
    const field = metric === 'stock' ? 'closingStock' : metric;
    const rows = current.monthly!.map((row, index) => ({ currentMonth: row.month, previousMonth: previous.monthly![index].month, ...compare(row[field], previous.monthly![index][field]) }));
    // Stock totals are end-of-window snapshots; flows are accumulated in buildSpTemporalPreview.
    const totals = compare(current.metrics[metric]!, previous.metrics[metric]!);
    if (![totals.current, totals.previous, ...rows.flatMap(row => [row.current, row.previous])].every(Number.isSafeInteger)) return blocked('Os valores excedem a precisão segura do comparativo.');
    comparisons[metric] = { status: 'ready', issues: [], rows, totals, checks } satisfies SpLaunchHistory;
  }
  const currentSegments = buildSpSegments(current), previousSegments = buildSpSegments(previous);
  if (currentSegments.status !== 'ready' || previousSegments.status !== 'ready') return blocked('A classificação dos segmentos não foi reconciliada nos dois anos.');
  const monthlySegments = windows.map((source, year) => {
    const preview = year === 0 ? current : previous;
    return preview.monthly!.map(row => buildSpSegments({ ...preview,
      patterns: summarizeSpGroups(source, [row.month], row.month),
      metrics: { projects: null, launches: row.launches, sales: row.sales, stock: row.closingStock },
    }));
  });
  if (monthlySegments.flat().some(result => result.status !== 'ready')) return blocked('Os segmentos mensais não reconciliaram com os totais das duas janelas.');
  const segmentDetails: NonNullable<SpHistoryBatch['segmentDetails']> = {};
  for (const segment of currentSegments.rows) {
    const details = {} as Record<SpHistoryMetric, SpLaunchHistory>;
    for (const metric of metrics) {
      const rows = months.current.map((currentMonth, index) => ({ currentMonth, previousMonth: months.previous[index],
        ...compare(monthlySegments[0][index].rows.find(row => row.group === segment.group)![metric], monthlySegments[1][index].rows.find(row => row.group === segment.group)![metric]),
      }));
      const totals = compare(segment[metric], previousSegments.rows.find(row => row.group === segment.group)![metric]);
      const aggregate = (field: 'current' | 'previous') => metric === 'stock' ? rows.at(-1)![field] : rows.reduce((sum, row) => sum + row[field], 0);
      if (aggregate('current') !== totals.current || aggregate('previous') !== totals.previous) return blocked('O detalhamento mensal diverge do segmento acumulado.');
      details[metric] = { status: 'ready', issues: [], rows, totals, checks };
    }
    segmentDetails[segment.group] = details;
  }
  const monthlyPatterns = windows.map((source, year) => (year === 0 ? current : previous).monthly!.map(row => summarizeSpGroups(source, [row.month], row.month)));
  const patternDetails: NonNullable<SpHistoryBatch['patternDetails']> = {};
  for (const pattern of current.patterns.rows) {
    const details = {} as Record<SpHistoryMetric, SpLaunchHistory>;
    const before = previous.patterns.rows.find(row => normalize(row.group) === normalize(pattern.group))!;
    for (const metric of metrics) {
      const rows = months.current.map((currentMonth, index) => ({ currentMonth, previousMonth: months.previous[index],
        ...compare(monthlyPatterns[0][index].rows.find(row => normalize(row.group) === normalize(pattern.group))![metric], monthlyPatterns[1][index].rows.find(row => normalize(row.group) === normalize(pattern.group))![metric]),
      }));
      const totals = compare(pattern[metric], before[metric]);
      const aggregate = (field: 'current' | 'previous') => metric === 'stock' ? rows.at(-1)![field] : rows.reduce((sum, row) => sum + row[field], 0);
      if (aggregate('current') !== totals.current || aggregate('previous') !== totals.previous) return blocked('O detalhe mensal diverge dos totais por padrão.');
      details[metric] = { status: 'ready', issues: [], rows, totals, checks };
    }
    patternDetails[normalize(pattern.group)] = details;
  }
  return { status: 'ready', issues: [], comparisons, checks, segmentDetails, patternDetails, segments: { current: currentSegments, previous: previousSegments, currentMonth: months.current.at(-1)!, previousMonth: months.previous.at(-1)! } };
}
