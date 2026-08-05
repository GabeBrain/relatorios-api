import * as XLSX from 'xlsx';
import type {
  AdjustmentRow,
  CellValue,
  IndexName,
  IndexPoint,
  IndexSeries,
  ParsedVgvWorkbook,
  PerformanceRow,
  VgvRow,
} from './types';
import { INDEX_NAMES } from './types';

const MONTH_TOKEN = /^(0[1-9]|1[0-2])\/\d{4}$/;
const MONTH_SUFFIX = /^(.*?)\s((0[1-9]|1[0-2])\/\d{4})$/;
const DEFAULT_METRICS = [
  'Estoque',
  'Vendas',
  'Preço',
  'VGV Total',
  'VGV Oferta Final',
  'Status',
  'Preço de Lançamento',
];

export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function findColumn(columns: string[], candidates: string[]): string | undefined {
  const normalized = new Map(columns.map((column) => [normalizeText(column), column]));
  for (const candidate of candidates) {
    const exact = normalized.get(normalizeText(candidate));
    if (exact) return exact;
  }
  for (const candidate of candidates) {
    const key = normalizeText(candidate);
    const match = columns.find((column) => {
      const current = normalizeText(column);
      return current.includes(key) || key.includes(current);
    });
    if (match) return match;
  }
  return undefined;
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s/g, '');
  if (!text) return null;
  let normalized = text;
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(text)) normalized = text.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(text)) normalized = text.replace(',', '.');
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) normalized = text.replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueName(name: string, used: Set<string>): string {
  let candidate = name;
  let count = 2;
  while (used.has(candidate)) candidate = `${name} (${count++})`;
  used.add(candidate);
  return candidate;
}

function toCell(value: unknown): CellValue {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

function monthTimestamp(label: string): number {
  const [month, year] = label.split('/').map(Number);
  return Date.UTC(year, month - 1, 1);
}

function monthDate(label: string): Date {
  return new Date(monthTimestamp(label));
}

function isYes(value: unknown): boolean {
  if (typeof value === 'number') return value > 0;
  return new Set(['sim', 's', 'yes', 'true', '1', 'x']).has(normalizeText(value));
}

function identifyAmenities(base: VgvRow[], monthColumns: Set<string>, columns: string[]): string[] {
  const blocked = [
    'endereco', 'bairro', 'cidade', 'estado', 'latitude', 'longitude', 'incorporadora', 'data',
    'quartos', 'garagem', 'torres', 'elevadores', 'tipologia', 'padrao', 'oferta', 'financiamento',
    'alienacao', 'retrofit', 'tempo de venda', 'id', 'cep', 'numero', 'tipo',
  ];
  return columns.filter((column) => {
    if (column.startsWith('__') || monthColumns.has(column)) return false;
    const name = normalizeText(column);
    if (name.includes(' - interna') || name.includes(' - externa') || name.includes(' - comercial') || name.startsWith('tem ')) return true;
    const values = base.map((row) => row[column]).filter((value) => value !== null && value !== undefined && value !== '');
    if (!values.length || blocked.some((word) => name.includes(word))) return false;
    const booleanCount = values.filter((value) => typeof value === 'string' && ['sim', 'nao', '0', '1', 'true', 'false', 'yes', 'no'].includes(normalizeText(value))).length;
    return booleanCount / values.length >= 0.85;
  });
}

export function parseVgvArrayBuffer(buffer: ArrayBuffer): ParsedVgvWorkbook {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('A planilha não possui uma primeira aba legível.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
  const nonEmptyRows = matrix.filter((row) => row.some((value) => value !== null && value !== undefined && value !== ''));
  if (nonEmptyRows.length < 2) throw new Error('A planilha não possui cabeçalho e linhas de dados.');

  const maxColumns = Math.max(...nonEmptyRows.map((row) => row.length));
  const rawHeaders = Array.from({ length: maxColumns }, (_, index) => String(nonEmptyRows[0][index] ?? `Coluna ${index + 1}`).trim());
  const nonEmptyColumnIndexes = rawHeaders.map((_, index) => index).filter((index) => nonEmptyRows.slice(1).some((row) => row[index] !== null && row[index] !== undefined && row[index] !== ''));
  const headers = nonEmptyColumnIndexes.map((index) => rawHeaders[index]);
  const dataRows = nonEmptyRows.slice(1).map((row) => nonEmptyColumnIndexes.map((index) => row[index]));

  const monthStarts = headers.map((header, index) => (MONTH_TOKEN.test(header) ? index : -1)).filter((index) => index >= 0);
  const used = new Set(headers);
  const renamedHeaders = [...headers];
  monthStarts.forEach((start, position) => {
    const end = monthStarts[position + 1] ?? headers.length;
    const month = headers[start];
    for (let index = start; index < end; index += 1) {
      const firstRowValue = dataRows[0]?.[index];
      const metric = firstRowValue !== null && firstRowValue !== undefined && String(firstRowValue).trim()
        ? String(firstRowValue).trim()
        : DEFAULT_METRICS[index - start] ?? `Métrica ${index - start + 1}`;
      const proposed = MONTH_SUFFIX.test(metric) ? metric : `${metric} ${month}`;
      renamedHeaders[index] = uniqueName(proposed, used);
    }
  });

  const monthlyColumns = renamedHeaders.filter((header) => MONTH_SUFFIX.test(header));
  const firstRowScore = monthlyColumns.reduce((score, header) => {
    const index = renamedHeaders.indexOf(header);
    const value = normalizeText(dataRows[0]?.[index]);
    return score + (/(0[1-9]|1[0-2])\/\d{4}/.test(value) || ['estoque', 'vendas', 'vgv', 'preco', 'status', 'lanc', 'oferta'].some((token) => value.includes(token)) ? 1 : 0);
  }, 0);
  const shouldDropHeaderRow = firstRowScore >= Math.max(3, Math.floor(monthlyColumns.length * 0.25));
  const effectiveRows = shouldDropHeaderRow ? dataRows.slice(1) : dataRows;

  const base: VgvRow[] = effectiveRows.map((values, rowIndex) => {
    const row = { __registro_id: rowIndex + 1 } as VgvRow;
    renamedHeaders.forEach((header, index) => { row[header] = toCell(values[index]); });
    return row;
  });

  const monthMap = new Map<string, Map<string, string>>();
  renamedHeaders.forEach((header) => {
    const match = header.match(MONTH_SUFFIX);
    if (!match) return;
    const [, metric, month] = match;
    if (!monthMap.has(month)) monthMap.set(month, new Map());
    monthMap.get(month)!.set(metric.trim(), header);
  });
  const monthLabels = [...monthMap.keys()].sort((a, b) => monthTimestamp(a) - monthTimestamp(b));
  const empreendimentoColumn = findColumn(renamedHeaders, ['Empreendimento']);
  const tipologiaColumn = findColumn(renamedHeaders, ['Tipologia']);
  const performance: PerformanceRow[] = [];
  for (const row of base) {
    for (const month of monthLabels) {
      const perf: PerformanceRow = {
        __registro_id: row.__registro_id,
        Empreendimento: String(row[empreendimentoColumn ?? ''] ?? ''),
        Tipologia: String(row[tipologiaColumn ?? ''] ?? ''),
        Mes: month,
        MesData: monthDate(month),
      };
      for (const [metric, column] of monthMap.get(month) ?? []) {
        const value = row[column];
        perf[metric] = normalizeText(metric).includes('status') ? String(value ?? '') : toNumber(value);
      }
      performance.push(perf);
    }
  }

  const monthColumnSet = new Set([...monthMap.values()].flatMap((mapping) => [...mapping.values()]));
  return {
    base,
    performance: performance.sort((a, b) => a.MesData.getTime() - b.MesData.getTime() || a.Empreendimento.localeCompare(b.Empreendimento)),
    columns: [...renamedHeaders, '__registro_id'],
    metadata: {
      monthLabels,
      monthColumns: [...monthColumnSet].sort(),
      amenityColumns: identifyAmenities(base, monthColumnSet, renamedHeaders),
    },
  };
}

function excelDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(Date.UTC(value.getFullYear(), value.getMonth(), 1));
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, 1));
  }
  const parsed = new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? null : new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
}

export function parseIndexArrayBuffer(buffer: ArrayBuffer, sheetName: string): IndexPoint[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[sheetName] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
  const byMonth = new Map<string, IndexPoint>();
  for (const row of matrix.slice(2)) {
    const date = excelDate(row[0]);
    const value = toNumber(row[1]);
    if (!date || value === null) continue;
    const monthKey = `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
    byMonth.set(monthKey, { monthKey, date, value });
  }
  return [...byMonth.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function loadBundledIndexSeries(): Promise<IndexSeries> {
  const sources: Record<IndexName, { url: string; sheet: string }> = {
    'INCC-DI': { url: '/atualizador-vgv/INCC_Series_MeDI.xlsx', sheet: 'INCC-DI' },
    IPCA: { url: '/atualizador-vgv/343b-serie-historica-ipca-ibge.xlsx', sheet: 'Plan1' },
    'IGP-DI': { url: '/atualizador-vgv/8dec-serie-historica-igp-di-fgv.xlsx', sheet: 'Plan1' },
  };
  const entries = await Promise.all(INDEX_NAMES.map(async (name) => {
    const response = await fetch(sources[name].url);
    if (!response.ok) throw new Error(`Não foi possível carregar ${name}.`);
    return [name, parseIndexArrayBuffer(await response.arrayBuffer(), sources[name].sheet)] as const;
  }));
  return Object.fromEntries(entries) as IndexSeries;
}

function resolveBase(series: IndexPoint[], target: Date): IndexPoint | undefined {
  return series.find((point) => point.date.getTime() === target.getTime())
    ?? [...series].reverse().find((point) => point.date <= target)
    ?? series.at(-1);
}

export function buildAdjustments(performance: PerformanceRow[], series: IndexSeries, baseDate = new Date(Date.UTC(2025, 11, 1))): AdjustmentRow[] {
  const vgvColumn = findColumn(Object.keys(performance[0] ?? {}), ['VGV Oferta Final']);
  if (!vgvColumn) return [];
  const bases = Object.fromEntries(INDEX_NAMES.map((name) => [name, resolveBase(series[name], baseDate)])) as Record<IndexName, IndexPoint | undefined>;
  return performance.flatMap((row) => {
    const nominal = toNumber(row[vgvColumn]);
    if (nominal === null) return [];
    const indices: Partial<Record<IndexName, number>> = {};
    const corrected: Partial<Record<IndexName, number>> = {};
    for (const name of INDEX_NAMES) {
      const point = series[name].find((candidate) => candidate.monthKey === row.Mes);
      const base = bases[name];
      if (!point || !base || point.value === 0) continue;
      indices[name] = point.value;
      corrected[name] = nominal * base.value / point.value;
    }
    return [{
      __registro_id: row.__registro_id,
      Empreendimento: row.Empreendimento,
      Mes: row.Mes,
      MesData: row.MesData,
      nominal,
      indices,
      corrected,
    }];
  });
}

export function extractAmenities(row: VgvRow, columns: string[]): Record<'Interna' | 'Externa' | 'Comercial' | 'Geral', string[]> {
  const groups: Record<'Interna' | 'Externa' | 'Comercial' | 'Geral', string[]> = { Interna: [], Externa: [], Comercial: [], Geral: [] };
  for (const column of columns) {
    if (!isYes(row[column])) continue;
    const normalized = normalizeText(column);
    let group: keyof typeof groups = 'Geral';
    let label = column;
    if (normalized.includes(' - interna')) group = 'Interna';
    else if (normalized.includes(' - externa')) group = 'Externa';
    else if (normalized.includes(' - comercial')) group = 'Comercial';
    if (group !== 'Geral') label = column.replace(/\s-\s[^-]+$/, '');
    else if (normalized.startsWith('tem ')) label = column.slice(4);
    groups[group].push(label);
  }
  for (const group of Object.keys(groups) as (keyof typeof groups)[]) groups[group] = [...new Set(groups[group])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return groups;
}

export function exportVgvWorkbook(base: VgvRow[], performance: PerformanceRow[], adjustments: AdjustmentRow[], fileName: string): void {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(base), 'Empreendimentos');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(performance), 'Performance_Mensal');
  const adjustmentRows = adjustments.map((row) => ({
    __registro_id: row.__registro_id,
    Empreendimento: row.Empreendimento,
    Mes: row.Mes,
    MesData: row.MesData,
    'VGV Nominal': row.nominal,
    ...Object.fromEntries(INDEX_NAMES.flatMap((name) => [[name, row.indices[name]], [`VGV Corrigido ${name}`, row.corrected[name]]])),
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(adjustmentRows), 'Reajuste_Indices');
  XLSX.writeFile(workbook, fileName, { compression: true });
}
