import type { Fonte, FonteAviso, FonteBloco, FonteItem, FonteValues } from './fonte';

type Cell = string | number | boolean | Date | null | undefined;
type Rows = Cell[][];
type Workbook = { SheetNames: string[]; Sheets: Record<string, unknown> };

const norm = (value: unknown) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const cleaned = (value: Cell): string | number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return !text || ['-', '–', '—', '#REF!', '#DIV/0!', '#VALUE!', '#N/A'].includes(text) ? null : text;
};
const sheet = (wb: Workbook, target: string): string | null =>
  wb.SheetNames.find((name) => norm(name) === norm(target)) ??
  wb.SheetNames.find((name) => norm(name).startsWith(norm(target))) ?? null;

function classify(filename: string): { papel: string | null; recorte: string | null } {
  const name = norm(filename).replace(/[_-]+/g, ' ');
  const roles: Array<[string, RegExp]> = [
    ['base', /^0*0\.? ?base\b|^base\b/], ['oferta', /consolidada|analise vertical otimizada|esgotados|tabela lacunas/],
    ['socio', /sociodemografia|onmaps/], ['absorcao', /absorcao|cenarios/],
    ['populacao', /populacao (e|de) domicilios/], ['revenda', /revenda/], ['locacao', /locacao/],
    ['lazer', /area de lazer/], ['anuncios', /arbnb|airbnb|anuncios/],
  ];
  const scopes: Array<[RegExp, string]> = [[/\b1\s*km\b/, '1 km'], [/\b2\s*km\b/, '2 km'], [/\b3\s*km\b/, '3 km'], [/z\.?i\.?\s*total/, 'z.i. total'], [/\bz\.?i\.?\b/, 'z.i.'], [/his\s*1/, 'his 1'], [/his\s*2/, 'his 2'], [/\bhmp\b/, 'hmp'], [/primaria/, 'primaria'], [/\bcidade\b/, 'cidade']];
  return { papel: roles.find(([, pattern]) => pattern.test(name))?.[0] ?? null, recorte: scopes.find(([pattern]) => pattern.test(name))?.[1] ?? null };
}

const rowsOf = async (xlsx: typeof import('xlsx'), wb: Workbook, name: string): Promise<Rows> =>
  xlsx.utils.sheet_to_json(wb.Sheets[name] as import('xlsx').WorkSheet, { header: 1, raw: true, defval: null }) as Rows;

function concept(value: unknown): string | null {
  const name = norm(value);
  if (/^n[ºo°]? de empreend/.test(name)) return 'n_empreendimentos';
  if (name === 'oferta lancada') return 'oferta_lancada';
  if (name === 'oferta atual' || name === 'oferta final') return 'oferta_atual';
  if (name === 'vendas' || /^vendas s\/ ?o\.?l\.?$/.test(name)) return 'vendas';
  if (/^disp\.? (sobre lancados|s\/ ?o\.?l\.?)$/.test(name)) return 'disponibilidade';
  return null;
}

async function offer(xlsx: typeof import('xlsx'), wb: Workbook, file: string, recorte: string | null, warnings: FonteAviso[]): Promise<FonteBloco[]> {
  const out: FonteBloco[] = [];
  for (const [tabela, wanted] of [['padrao', 'Padrão'], ['ano', 'Ano'], ['tipologia', 'Tipologia']] as const) {
    const tab = sheet(wb, wanted);
    if (!tab) { warnings.push({ tipo: 'aba_ausente', arquivo: file, aba: wanted }); continue; }
    const rows = await rowsOf(xlsx, wb, tab);
    const header = rows.slice(0, 20).findIndex((row) => row.some((cell) => norm(cell) === 'oferta lancada'));
    if (header < 0) { warnings.push({ tipo: 'cabecalho_nao_encontrado', arquivo: file, aba: tab }); continue; }
    const columns = new Map<number, string>();
    rows[header].forEach((cell, index) => { const key = concept(cell); if (key) columns.set(index, key); });
    const labelColumn = rows[header].findIndex((cell, index) => norm(cell) && !columns.has(index));
    const itens: FonteItem[] = []; let total: FonteItem | null = null;
    for (let index = header + 1; index < rows.length; index++) {
      const label = cleaned(rows[index][Math.max(0, labelColumn)]);
      const valores: FonteValues = {};
      columns.forEach((key, column) => { const value = cleaned(rows[index][column]); valores[key] = typeof value === 'number' ? value : null; });
      if (label === null && !Object.values(valores).some((value) => value !== null)) continue;
      const item = { rotulo: label === null ? null : String(label), linha: index + 1, valores };
      if (norm(label).startsWith('total')) { total = item; break; }
      itens.push(item);
    }
    out.push({ papel: 'oferta', tabela, recorte, arquivo: file, aba: tab, cabecalho_linha: header + 1, conceitos: [...new Set(columns.values())], itens, total });
  }
  return out;
}

async function population(xlsx: typeof import('xlsx'), wb: Workbook, file: string, recorte: string | null, warnings: FonteAviso[]): Promise<FonteBloco[]> {
  const out: FonteBloco[] = [];
  for (const [tabela, wanted] of [['populacao', 'População'], ['domicilios', 'Domicilios']] as const) {
    const tab = sheet(wb, wanted);
    if (!tab) { warnings.push({ tipo: 'aba_ausente', arquivo: file, aba: wanted }); continue; }
    const rows = (await rowsOf(xlsx, wb, tab)).slice(0, 40); const itens: FonteItem[] = [];
    rows.forEach((row, index) => {
      const label = row.slice(0, 3).map(cleaned).find((value) => typeof value === 'string') as string | undefined;
      const numeros = row.map(cleaned).filter((value): value is number => typeof value === 'number').slice(0, 8);
      if (!label || numeros.length < 3 || norm(label).startsWith('fonte')) return;
      const atual = numeros.find((value, i) => i > 0 && value === numeros[i - 1]) ?? numeros[2];
      itens.push({ rotulo: label, linha: index + 1, numeros, serie: { atual } });
    });
    out.push({ papel: 'populacao', tabela, recorte, arquivo: file, aba: tab, itens });
  }
  return out;
}

async function socio(xlsx: typeof import('xlsx'), wb: Workbook, file: string, recorte: string | null, warnings: FonteAviso[]): Promise<FonteBloco[]> {
  const configs = [['domicilios_por_tipo', 'Dom.p Tipo'], ['condicao_ocupacao', 'Dom.p Cond. Ocup.'], ['populacao_faixa_etaria', 'População - Faixa Etária'], ['domicilios_por_moradores', 'Dom.p nº Moradores']] as const;
  const out: FonteBloco[] = [];
  for (const [tabela, wanted] of configs) {
    const tab = sheet(wb, wanted); if (!tab) { warnings.push({ tipo: 'aba_ausente', arquivo: file, aba: wanted }); continue; }
    const rows = (await rowsOf(xlsx, wb, tab)).slice(0, 80);
    const header = rows.slice(0, 15).findIndex((row) => row.filter((cell) => norm(cell) === 'absoluto').length >= 2);
    if (header <= 0) { warnings.push({ tipo: 'cabecalho_nao_encontrado', arquivo: file, aba: tab }); continue; }
    const mapping = new Map<number, { scope: string; kind: string }>();
    const firstAbsolute = rows[header].findIndex((cell) => norm(cell) === 'absoluto');
    const starts = rows[header - 1]
      .map((cell, col) => ({ col, label: cleaned(cell) }))
      .filter((item) => typeof item.label === 'string' && item.col >= Math.max(0, firstAbsolute));
    starts.forEach((start, i) => {
      const end = starts[i + 1]?.col ?? rows[header].length;
      for (const kind of ['absoluto', '%']) {
        const col = Array.from({ length: end - start.col }, (_, k) => start.col + k).find((candidate) => norm(rows[header][candidate]) === kind);
        if (col !== undefined) mapping.set(col, { scope: String(start.label), kind });
      }
    });
    const itens: FonteItem[] = []; let total: FonteItem | null = null;
    for (let index = header + 1; index < rows.length; index++) {
      const label = rows[index].slice(0, 3).map(cleaned).find((value) => typeof value === 'string') as string | undefined;
      if (!label || norm(label).startsWith('fonte')) { if (total) break; continue; }
      const recortes: Record<string, FonteValues> = {};
      mapping.forEach(({ scope, kind }, col) => { const value = cleaned(rows[index][col]); if (typeof value === 'number') (recortes[scope] ??= {})[kind] = value; });
      if (!Object.keys(recortes).length) continue;
      const item = { rotulo: label, linha: index + 1, recortes };
      if (norm(label).startsWith('total')) { total = item; break; }
      itens.push(item);
    }
    out.push({ papel: 'socio', tabela, recorte, arquivo: file, aba: tab, cabecalho_linha: header + 1, recortes: [...new Set([...mapping.values()].map((item) => item.scope))], itens, total });
  }
  return out;
}

async function sha1(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export async function extractFonteFromExcel(files: File[], slug: string, onProgress?: (done: number, total: number) => void): Promise<Fonte> {
  const xlsx = await import('xlsx'); const avisos: FonteAviso[] = []; const blocos: FonteBloco[] = []; const inventario: Fonte['inventario'] = [];
  const seen = new Map<string, string>();
  for (let index = 0; index < files.length; index++) {
    const file = files[index]; const buffer = await file.arrayBuffer(); const { papel, recorte } = classify(file.name);
    inventario.push({ arquivo: file.name, sha1: await sha1(buffer), papel, recorte, tamanho_kb: Math.round(file.size / 102.4) / 10 });
    if (!papel) { avisos.push({ tipo: 'papel_desconhecido', arquivo: file.name }); onProgress?.(index + 1, files.length); continue; }
    const key = `${papel}:${recorte ?? ''}`;
    if (seen.has(key) && !['base'].includes(papel)) avisos.push({ tipo: 'papel_ambiguo', papel, recorte, arquivos: [seen.get(key), file.name] });
    seen.set(key, seen.get(key) ?? file.name);
    if (!['oferta', 'socio', 'populacao'].includes(papel)) { if (papel === 'absorcao') avisos.push({ tipo: 'cobertura_parcial', arquivo: file.name, papel }); onProgress?.(index + 1, files.length); continue; }
    try {
      const wb = xlsx.read(buffer, { type: 'array', cellDates: false }) as unknown as Workbook;
      blocos.push(...(papel === 'oferta' ? await offer(xlsx, wb, file.name, recorte, avisos) : papel === 'socio' ? await socio(xlsx, wb, file.name, recorte, avisos) : await population(xlsx, wb, file.name, recorte, avisos)));
    } catch (error) { avisos.push({ tipo: 'falha_ao_abrir', arquivo: file.name, erro: error instanceof Error ? error.message : String(error) }); }
    onProgress?.(index + 1, files.length);
  }
  return { fonte_version: 2, estudo: slug, gerado_em: new Date().toISOString(), pasta: 'browser-upload', inventario, blocos, avisos };
}
