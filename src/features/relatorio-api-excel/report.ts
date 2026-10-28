import type { RawBuilding } from './api';
import { mcmvBand } from './mcmv';

export type Cell = string | number | null;
export type Row = Record<string, Cell>;
export type Granularity = 'month' | 'quarter';
export type PriceMode = 'current' | 'period';
export type BuildingAverageMode = 'simple' | 'quantity' | 'stock' | 'simple-standard' | 'quantity-standard' | 'stock-standard';
export const BUILDING_AVERAGE_OPTIONS: { value: BuildingAverageMode; label: string }[] = [
  { value: 'simple', label: 'Média simples' },
  { value: 'quantity', label: 'Ponderado pela oferta lançada' },
  { value: 'stock', label: 'Ponderada pelo estoque' },
  { value: 'simple-standard', label: 'Média simples (somente tip. Padrão)' },
  { value: 'quantity-standard', label: 'Ponderado pela oferta lançada (somente tip. Padrão)' },
  { value: 'stock-standard', label: 'Ponderada pelo estoque (somente tip. Padrão)' },
];
export type Layout = 'columns' | 'rows';
export type VgvScale = 'standard' | 'thousand' | 'million';
export const VGV_UNITS: Record<VgvScale, string> = { standard: 'R$', thousand: 'R$ mil', million: 'R$ milhões' };
export interface ReportOptions {
  granularity: Granularity;
  priceMode: PriceMode;
  buildingAverageMode: BuildingAverageMode;
  layout: Layout;
  from: string;
  to: string;
  statuses: string[];
  municipalities?: string[];
  buildingTypes?: string[];
  standards?: string[];
  periodRange?: 'day' | 'month';
  vgvScale?: VgvScale;
}
export const FIXED_COLUMNS = [
  'ID Empreendimento', 'ID Tipologia', 'Status Empreendimento', 'Status Tipologia',
  'Região', 'Região Administrativa', 'Cidade/UF', 'Tipo', 'Padrão', 'Faixa MCMV', 'Preço Médio para Faixa MCMV', 'Tipologia',
  'Preço de Lançamento', 'M² Lançado', 'R$/m² Lançado', 'Tempo de Vendas', 'Empreendimentos',
  'Taxa Administrativa', 'Bairro', 'Endereço', 'Número', 'Incorporadoras', 'Unidades por Tipologia', 'Unidades Totais do Empreendimento',
  'Data de Lançamento', 'Ano', 'Data de Entrega', 'Quartos', 'Garagem', 'Entrada', 'Nº de Parcelas', 'Valor da parcela',
  '% de Juros Mensal', 'Indíce de Juros', 'Desconto à Vista', 'm2 Priv.',
];
export const MEASURES = [
  'Vendas Brutas', 'Distratos', 'Vendas Líquidas', 'Estoque', 'Preço Atual',
  'Preço Médio Empreendimento', 'Preço m²', 'VGV Lançado', 'VGV Vendas Brutas',
  'VGV Distratos', 'VGV Vendas Líquidas', 'VGV Estoque',
] as const;
export const PRICE_MEASURES = new Set(['Preço Atual', 'Preço Médio Empreendimento', 'Preço m²']);
export const REPORT_FIELDS = [...FIXED_COLUMNS, 'Período', ...MEASURES];
export const PERCENT_COLUMNS = new Set(['Entrada', '% de Juros Mensal', 'Desconto à Vista']);
export interface Period { key: string; label: string }
export interface Report {
  columns: string[];
  rows: Row[];
  periods: Period[];
  series: Row[];
  typologyCount: number;
  typologyRows?: Row[];
  vgvScale?: VgvScale;
}

export function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

/** ISO, dd/mm/aaaa e mm/aaaa; datas sem dia representam o primeiro dia do mês. */
export function isoDate(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  let match = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?(?:$|T|\s)/.exec(raw);
  let year: number, month: number, day: number;
  if (match) {
      year = Number(match[1]); month = Number(match[2]); day = Number(match[3] ?? 1);
  } else {
    match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
    if (match) {
      year = Number(match[3]); month = Number(match[2]); day = Number(match[1]);
    } else {
      match = /^(\d{1,2})\/(\d{4})$/.exec(raw);
      if (!match) return null;
      year = Number(match[2]); month = Number(match[1]); day = 1;
    }
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

export function periodOf(date: string, granularity: Granularity): Period {
  const month = Number(date.slice(5, 7));
  const year = date.slice(0, 4);
  if (granularity === 'quarter') {
    const q = Math.ceil(month / 3);
    return { key: `${year}-${String((q - 1) * 3 + 1).padStart(2, '0')}`, label: `${q}T/${year}` };
  }
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return { key: date.slice(0, 7), label: `${months[month - 1]}/${year}` };
}

export function monthStart(date: string): string {
  return date ? `${date.slice(0, 7)}-01` : '';
}

export function monthEnd(date: string): string {
  if (!date) return '';
  return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).toISOString().slice(0, 10);
}

type DatedEntry = { date: string; entry: RawBuilding };
function entriesOf(building: RawBuilding): DatedEntry[] {
  const history = Array.isArray(building.typologies_history) ? building.typologies_history : [];
  const release = isoDate(building.release_date);
  return history.flatMap((entry: RawBuilding) => {
    const date = isoDate(entry.period);
    return date && (!release || date.slice(0, 7) >= release.slice(0, 7)) ? [{ date, entry }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function dateBounds(buildings: RawBuilding[]) {
  let from = '', to = '';
  for (const building of buildings) {
    const history = Array.isArray(building.typologies_history) ? building.typologies_history : [];
    const release = isoDate(building.release_date);
    for (const entry of history) {
      const date = isoDate(entry.period);
      if (!date || (release && date.slice(0, 7) < release.slice(0, 7))) continue;
      if (!from || date < from) from = date;
      if (!to || date > to) to = date;
    }
  }
  return { from, to };
}

export const municipalityKey = (building: RawBuilding) => `${String(building.city ?? '')}/${String(building.state ?? '')}`;

const rounded = (value: number) => Math.round(value * 100) / 100;
const product = (a: number | null, b: number | null) => a === null || b === null ? null : rounded(a * b);
const text = (value: unknown) => String(value ?? '');
const asRecord = (value: unknown): RawBuilding => value && typeof value === 'object' ? value as RawBuilding : {};

function fixedRow(building: RawBuilding, id: string, entries: DatedEntry[]): Row {
  const last = entries.at(-1)!.entry;
  const qty = numeric(last.qty);
  const stock = numeric(last.typology_stock);
  const area = numeric(last.private_area);
  const launch = isoDate(building.release_date);
  const launchEntry = launch ? entries.find(({ date }) => date === launch)?.entry : undefined;
  const launchPrice = numeric(launchEntry?.price);
  const launchArea = numeric(launchEntry?.private_area);
  const lastActive = entries.filter(({ entry }) => entry.building_status === 'Ativo').at(-1)?.date;
  const months = launch && lastActive ? Math.max(0,
    (Number(lastActive.slice(0, 4)) - Number(launch.slice(0, 4))) * 12 + Number(lastActive.slice(5, 7)) - Number(launch.slice(5, 7))) : null;
  const incorporators = Array.isArray(building.incorporators) ? building.incorporators : [];
  return {
    'ID Empreendimento': text(building.building_id), 'ID Tipologia': id,
    'Status Empreendimento': text(building.status), 'Status Tipologia': stock === null ? '' : stock > 0 ? 'Ativo' : 'Esgotado',
    'Região': text(building.region ?? building.administrative_region),
    'Região Administrativa': text(building.administrative_area),
    'Cidade/UF': municipalityKey(building), 'Tipo': text(building.building_type), 'Padrão': text(building.standard),
    'Tipologia': text(last.type_of_typology), 'Preço de Lançamento': launchPrice,
    'M² Lançado': product(qty, area),
    'R$/m² Lançado': launchPrice !== null && launchArea !== null && launchArea > 0 ? rounded(launchPrice / launchArea) : null,
    'Tempo de Vendas': months === null ? '' : months <= 6 ? 'Até 6 Meses' : months <= 24 ? 'De 7 a 24 Meses' : months <= 48 ? 'De 25 a 48 Meses' : 'Acima de 49 Meses',
    'Empreendimentos': text(building.name), 'Taxa Administrativa': numeric(last.taxa_associativa),
    'Bairro': text(building.neighborhood), 'Endereço': text(building.address), 'Número': text(building.address_number),
    'Incorporadoras': incorporators.map((incorporator) => text(asRecord(incorporator).name).trim()).filter(Boolean).join(', '),
    'Unidades por Tipologia': qty,
    'Unidades Totais do Empreendimento': numeric(building.total_units),
    'Data de Lançamento': text(building.release_date), 'Ano': launch?.slice(0, 4) ?? '', 'Data de Entrega': text(building.delivery_date),
    'Quartos': numeric(last.number_bedroom), 'Garagem': text(last.garage),
    'Entrada': numeric(building.down_payment_percentage), 'Nº de Parcelas': numeric(building.number_of_installments),
    'Valor da parcela': numeric(building.installment_value), '% de Juros Mensal': numeric(building.interest_rate_tax),
    'Indíce de Juros': text(building.interest_rate_index), 'Desconto à Vista': numeric(building.discount_percentage),
    'm2 Priv.': area || null,
  };
}

/** Ausência de qualquer fechamento impede publicar um fluxo parcial como total. */
function sumField(entries: DatedEntry[], field: string): number | null {
  if (!entries.length) return null;
  const values = entries.map(({ entry }) => numeric(entry[field]));
  return values.some((value) => value === null) ? null : values.reduce<number>((sum, value) => sum + value!, 0);
}

function flowVgv(entries: DatedEntry[], field: string, mode: PriceMode, currentPrice: number | null): number | null {
  const units = sumField(entries, field);
  if (units === null) return null;
  if (mode === 'current') return product(units, currentPrice);
  if (entries.some(({ entry }) => numeric(entry[field]) !== 0 && numeric(entry.price) === null)) return null;
  return rounded(entries.reduce((sum, { entry }) => sum + numeric(entry[field])! * (numeric(entry.price) ?? 0), 0));
}

/** Uma posição por tipologia, nunca uma média dos fechamentos mensais do trimestre. */
function buildingAverage(snapshots: RawBuilding[], mode: BuildingAverageMode): number | null {
  let numerator = 0, denominator = 0;
  for (const entry of snapshots) {
    if (mode.endsWith('-standard') && text(entry.type_of_typology).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() !== 'padrao') continue;
    const price = numeric(entry.price);
    const weight = mode.startsWith('simple') ? 1 : numeric(mode.startsWith('quantity') ? entry.qty : entry.typology_stock);
    if (price === null || weight === null || weight <= 0) continue;
    numerator += price * weight; denominator += weight;
  }
  return denominator > 0 ? rounded(numerator / denominator) : null;
}

/** Função pura: recebe exclusivamente a coleta completa; nunca consulta a API. */
export function buildReport(buildings: RawBuilding[], options: ReportOptions): Report {
  if (options.periodRange === 'month') options = { ...options, from: monthStart(options.from), to: monthEnd(options.to) };
  const empty: Report = { columns: [], rows: [], periods: [], series: [], typologyCount: 0, vgvScale: options.vgvScale ?? 'standard' };
  if (!options.from || !options.to || options.from > options.to) return empty;
  buildings = buildings.filter((building) => options.statuses.includes(text(building.status))
    && (options.municipalities === undefined || options.municipalities.includes(municipalityKey(building)))
    && (options.buildingTypes === undefined || options.buildingTypes.includes(text(building.building_type)))
    && (options.standards === undefined || options.standards.includes(text(building.standard))));
  const periodsMap = new Map<string, Period>();
  // Apenas períodos observados na coleta dentro das datas inclusivas, sem inventar fechamentos.
  for (const building of buildings) for (const { date } of entriesOf(building)) {
    if (date < options.from || date > options.to) continue;
    const period = periodOf(date, options.granularity);
    periodsMap.set(period.key, period);
  }
  const periods = [...periodsMap.values()].sort((a, b) => a.key.localeCompare(b.key));
  const wideRows: Row[] = [];
  const longRows: Row[] = [];
  const series = periods.map((period) => ({ 'Período': period.label } as Row));
  const priceCounts = periods.map(() => new Map<string, number>());
  // Não deduplicar building_id: o contrato do Dashboard preserva cada registro.
  for (const building of buildings) {
    if (!options.statuses.includes(text(building.status))) continue;
    const typologies = new Map<string, DatedEntry[]>();
    const release = isoDate(building.release_date);
    const releaseKey = release ? periodOf(release, options.granularity).key : null;
    for (const item of entriesOf(building)) {
      if (item.date > options.to || (releaseKey && periodOf(item.date, options.granularity).key < releaseKey)) continue;
      const id = text(item.entry.typology_id);
      if (!id) continue;
      const history = typologies.get(id) ?? [];
      history.push(item);
      typologies.set(id, history);
    }
    const mcmvAverage = buildingAverage([...typologies.values()].map((history) => history.at(-1)!.entry), 'quantity-standard');
    const mcmv = mcmvBand(building, mcmvAverage);
    const historicalMcmv: string[] = [];
    const historicalMcmvPrices: (number | null)[] = [];
    const averages = periods.map((period, index) => {
      const snapshots = [...typologies.values()].flatMap((history) => {
        const snapshot = history.filter(({ date }) => date >= options.from && periodOf(date, options.granularity).key === period.key).at(-1);
        return snapshot ? [snapshot.entry] : [];
      });
      const average = buildingAverage(snapshots, options.buildingAverageMode);
      const mcmvPrice = buildingAverage(snapshots, 'quantity-standard');
      historicalMcmvPrices.push(mcmvPrice);
      historicalMcmv.push(mcmvBand(building, mcmvPrice));
      if (average !== null) {
        series[index]['Preço Médio Empreendimento'] = (numeric(series[index]['Preço Médio Empreendimento']) ?? 0) + average;
        priceCounts[index].set('Preço Médio Empreendimento', (priceCounts[index].get('Preço Médio Empreendimento') ?? 0) + 1);
      }
      return average;
    });
    for (const [id, history] of typologies) {
      const inRange = history.filter(({ date }) => date >= options.from);
      if (!inRange.length) continue;
      const currentPrice = numeric(history.at(-1)!.entry.price);
      const fixed = fixedRow(building, id, history);
      fixed['Faixa MCMV'] = mcmv;
      fixed['Preço Médio para Faixa MCMV'] = mcmvAverage;
      const wide: Row = { ...fixed };
      for (const [index, period] of periods.entries()) {
        const entries = inRange.filter(({ date }) => periodOf(date, options.granularity).key === period.key);
        const last = entries.at(-1)?.entry;
        const beforeRelease = releaseKey !== null && period.key < releaseKey;
        wide[`Faixa MCMV ${period.label}`] = last ? historicalMcmv[index] : '';
        wide[`Preço Médio para Faixa MCMV ${period.label}`] = last ? historicalMcmvPrices[index] : null;
        const gross = sumField(entries, 'gross_sales');
        const cancellations = sumField(entries, 'distractions');
        const net = gross === null || cancellations === null ? null : gross - cancellations;
        const stock = numeric(last?.typology_stock);
        const price = options.priceMode === 'current' ? currentPrice : numeric(last?.price);
        const qty = numeric(last?.qty);
        const grossVgv = flowVgv(entries, 'gross_sales', options.priceMode, currentPrice);
        const cancellationsVgv = flowVgv(entries, 'distractions', options.priceMode, currentPrice);
        const values: Row = {
          'Vendas Brutas': gross, 'Distratos': cancellations, 'Vendas Líquidas': net,
          'Estoque': stock, 'Preço Atual': numeric(last?.price),
          'Preço Médio Empreendimento': last ? averages[index] : null,
          'Preço m²': numeric(last?.price_private_area),
          'VGV Lançado': product(qty, price), 'VGV Vendas Brutas': grossVgv,
          'VGV Distratos': cancellationsVgv,
          'VGV Vendas Líquidas': grossVgv === null || cancellationsVgv === null ? null : rounded(grossVgv - cancellationsVgv),
          'VGV Estoque': product(stock, price),
        };
        for (const metric of MEASURES) {
          const value = beforeRelease ? null : values[metric];
          values[metric] = value;
          wide[`${metric} ${period.label}`] = value;
          if (typeof value === 'number' && metric !== 'Preço Médio Empreendimento') {
            series[index][metric] = (numeric(series[index][metric]) ?? 0) + value;
            if (PRICE_MEASURES.has(metric)) priceCounts[index].set(metric, (priceCounts[index].get(metric) ?? 0) + 1);
          }
        }
        if (options.layout === 'rows' && last && !beforeRelease) longRows.push({ ...fixed, 'Faixa MCMV': historicalMcmv[index], 'Preço Médio para Faixa MCMV': historicalMcmvPrices[index], 'Período': period.label, ...values });
      }
      wideRows.push(wide);
    }
  }
  for (const [index, row] of series.entries()) for (const [metric, count] of priceCounts[index]) {
    row[metric] = rounded(Number(row[metric]) / count);
  }
  const compare = (a: Row, b: Row) => {
    const active = (row: Row) => row['Status Empreendimento'] === 'Ativo' ? 0 : 1;
    return active(a) - active(b) || (isoDate(a['Data de Lançamento']) ?? '').localeCompare(isoDate(b['Data de Lançamento']) ?? '')
      || text(a.Empreendimentos).localeCompare(text(b.Empreendimentos))
      || text(a['ID Tipologia']).localeCompare(text(b['ID Tipologia']), undefined, { numeric: true });
  };
  const columns = options.layout === 'columns'
    ? [...FIXED_COLUMNS.flatMap((column) => ['Faixa MCMV', 'Preço Médio para Faixa MCMV'].includes(column) ? [column, ...periods.map((period) => `${column} ${period.label}`)] : [column]), ...MEASURES.flatMap((metric) => periods.map((period) => `${metric} ${period.label}`))]
    : [...FIXED_COLUMNS, 'Período', ...MEASURES];
  return { columns, rows: (options.layout === 'columns' ? wideRows : longRows).sort(compare), periods, series, typologyCount: wideRows.length, typologyRows: wideRows, vgvScale: options.vgvScale ?? 'standard' };
}

/** Expande nomes de campos somente na geração, preservando a ordem das métricas. */
export function selectReportFields(report: Report, fields: string[] | null): Report {
  if (fields === null) return report;
  const selected = new Set(fields);
  const columns = report.columns.filter((column) => selected.has(column)
    || (selected.has('Faixa MCMV') && column.startsWith('Faixa MCMV '))
    || (selected.has('Preço Médio para Faixa MCMV') && column.startsWith('Preço Médio para Faixa MCMV '))
    || MEASURES.some((measure) => selected.has(measure) && column.startsWith(`${measure} `)));
  return selectedReport(report, columns);
}

export function selectedReport(report: Report, selected: string[] | null): Report {
  const columns = selected === null ? report.columns : report.columns.filter((column) => selected.includes(column));
  return { ...report, columns, rows: report.rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? null]))) };
}

/** Escala só na apresentação/serialização; o motor conserva os valores monetários calculados. */
export function exportValue(column: string, value: Cell, scale: VgvScale = 'standard'): Cell {
  if (value === null || value === undefined || value === '') return null;
  if (column.startsWith('VGV')) return numeric(value) === null ? null : Number(value) / (scale === 'thousand' ? 1_000 : scale === 'million' ? 1_000_000 : 1);
  if (PERCENT_COLUMNS.has(column)) return numeric(value) === null ? null : Number(value) / 100;
  if (column === 'Data de Lançamento' || column === 'Data de Entrega') {
    const date = isoDate(value);
    if (date) return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
  }
  return value;
}

export async function createWorkbook(report: Report) {
  if (!report.columns.length || !report.rows.length) throw new Error('Selecione colunas e um recorte com dados para exportar.');
  if (report.columns.length > 16_384 || report.rows.length + 1 > 1_048_576) throw new Error('O recorte excede o limite do Excel. Reduza o período ou as colunas.');
  const { utils } = await import('xlsx');
  const worksheet = utils.aoa_to_sheet([report.columns, ...report.rows.map((row) => report.columns.map((column) => exportValue(column, row[column], report.vgvScale)))]);
  for (const [index, column] of report.columns.entries()) {
    const z = PERCENT_COLUMNS.has(column) ? '0.00%' : column.startsWith('VGV') || column.startsWith('Preço Médio para Faixa MCMV') ? '0.00' : undefined;
    if (!z) continue;
    for (let row = 1; row <= report.rows.length; row++) {
      const cell = worksheet[utils.encode_cell({ r: row, c: index })];
      if (cell?.t === 'n') cell.z = z;
    }
  }
  worksheet['!autofilter'] = { ref: worksheet['!ref']! };
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'RELATÓRIO API EXCEL');
  return workbook;
}
