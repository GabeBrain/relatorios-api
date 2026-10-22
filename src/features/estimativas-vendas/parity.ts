import { buildingId, finite, monthKey, type Building } from './source';

export type ParityRow = { key: string; field: 'stock' | 'sales'; api: number | null; excel: number | null; status: 'equal' | 'different' | 'api-only' | 'excel-only' | 'both-missing' };
const normalized = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const period = (v: unknown) => { const m = /^(\d{2})\/(\d{4})$/.exec(String(v ?? '')); return m ? `${m[2]}-${m[1]}` : null; };

/** SheetJS is loaded only after a local file selection. No upload or persistence. */
export async function readExcel(file: File): Promise<{ rows: Map<string, { stock: number | null; sales: number | null }>; duplicates: string[]; cities: string[]; periods: string[] }> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Selecione um arquivo .xlsx.');
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Arquivo sem aba de tipologias.');
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const head = grid[0] ?? [], subhead = grid[1] ?? [];
  const field = (label: string) => head.findIndex(v => normalized(v) === label);
  const idCol = field('id do empreendimento'), typCol = field('id da tipologia'), cityCol = field('cidade'), typeCol = field('tipo');
  if ([idCol, typCol, cityCol, typeCol].some(i => i < 0)) throw new Error('Cabeçalhos cadastrais ausentes. Use Análise Temporal Excel em formato Colunas.');
  const blocks = head.flatMap((value, i) => { const p = period(value); return p && normalized(subhead[i]).includes('estoque') ? [{ p, i }] : []; });
  if (!blocks.length) throw new Error('Competências mensais/estoque não encontrados.');
  const rows = new Map<string, { stock: number | null; sales: number | null }>(), duplicates: string[] = [];
  const cities = new Set<string>();
  for (const row of grid.slice(2)) {
    if (!row?.[idCol] || !row?.[typCol] || normalized(row[typeCol]) !== 'horizontal') continue;
    cities.add(String(row[cityCol] ?? ''));
    for (const { p, i } of blocks) {
      const key = `${row[idCol]}|${row[typCol]}|${p}`;
      if (rows.has(key)) duplicates.push(key);
      else rows.set(key, { stock: finite(row[i]), sales: finite(row[i + 1]) });
    }
  }
  return { rows, duplicates, cities: [...cities], periods: blocks.map(b => b.p) };
}

export function compareExcel(buildings: Building[], excel: Awaited<ReturnType<typeof readExcel>>, selectedCity: string): ParityRow[] {
  if (excel.cities.some(c => normalized(c) !== normalized(selectedCity))) throw new Error('O Excel contém cidade diferente do recorte da página.');
  const api = new Map<string, { stock: number | null; sales: number | null }>();
  for (const b of buildings) for (const row of b.typologies_history ?? []) {
    const key = `${buildingId(b)}|${row.typology_id}|${monthKey(row.period)}`;
    if (excel.periods.includes(monthKey(row.period))) api.set(key, { stock: finite(row.typology_stock), sales: finite(row.sold_in_period) });
  }
  const output: ParityRow[] = [];
  for (const key of new Set([...api.keys(), ...excel.rows.keys()])) for (const [field, prop] of [['stock', 'stock'], ['sales', 'sales']] as const) {
    const a = api.get(key)?.[prop] ?? null, e = excel.rows.get(key)?.[prop] ?? null;
    const status = a === null && e === null ? 'both-missing' : a === null ? 'excel-only' : e === null ? 'api-only' : a === e ? 'equal' : 'different';
    output.push({ key, field, api: a, excel: e, status });
  }
  return output;
}
