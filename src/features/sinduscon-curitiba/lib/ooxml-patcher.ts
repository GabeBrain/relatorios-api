import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function parseXml(xml: string, label: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror')[0]) throw new Error(`Não foi possível interpretar ${label} do arquivo XLSX.`);
  return document;
}

function elements(parent: Document | Element, localName: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS('*', localName));
}

function normalizePath(target: string) {
  if (target.startsWith('/')) return target.slice(1);
  const result: string[] = [];
  for (const part of `xl/${target}`.split('/')) {
    if (part === '..') result.pop();
    else if (part !== '.') result.push(part);
  }
  return result.join('/');
}

export function worksheetPaths(files: Record<string, Uint8Array>) {
  const workbookBytes = files['xl/workbook.xml'];
  const relationBytes = files['xl/_rels/workbook.xml.rels'];
  if (!workbookBytes || !relationBytes) throw new Error('O arquivo não possui uma estrutura XLSX válida.');
  const workbook = parseXml(strFromU8(workbookBytes), 'a pasta de trabalho');
  const relations = parseXml(strFromU8(relationBytes), 'os relacionamentos');
  const targets = new Map(elements(relations, 'Relationship').map((item) => [item.getAttribute('Id'), item.getAttribute('Target')]));
  return new Map(elements(workbook, 'sheet').flatMap((sheet) => {
    const id = sheet.getAttributeNS(REL_NS, 'id');
    const target = id ? targets.get(id) : null;
    return target ? [[sheet.getAttribute('name') ?? '', normalizePath(target)] as const] : [];
  }));
}

function cellColumn(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? '';
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return result - 1;
}

function columnName(index: number) {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + value % 26) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function clearValue(cell: Element, keepFormula = false) {
  for (const child of Array.from(cell.childNodes)) {
    if (child.nodeType === 1 && (!keepFormula || (child as Element).localName !== 'f')) cell.removeChild(child);
  }
  cell.removeAttribute('t');
}

export function writeValue(document: XMLDocument, cell: Element, value: unknown, keepFormula = false) {
  clearValue(cell, keepFormula);
  if (value === '' || value === null || value === undefined) return;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const node = document.createElementNS(NS, 'v');
    node.textContent = String(value);
    cell.appendChild(node);
    return;
  }
  if (typeof value === 'boolean') {
    cell.setAttribute('t', 'b');
    const node = document.createElementNS(NS, 'v');
    node.textContent = value ? '1' : '0';
    cell.appendChild(node);
    return;
  }
  cell.setAttribute('t', 'inlineStr');
  const inline = document.createElementNS(NS, 'is');
  const text = document.createElementNS(NS, 't');
  text.textContent = String(value);
  inline.appendChild(text);
  cell.appendChild(inline);
}

function ensureCell(document: XMLDocument, sheetData: Element, reference: string) {
  const rowNumber = Number(reference.match(/\d+$/)?.[0]);
  let row = elements(sheetData, 'row').find((item) => Number(item.getAttribute('r')) === rowNumber);
  if (!row) {
    row = document.createElementNS(NS, 'row');
    row.setAttribute('r', String(rowNumber));
    const next = elements(sheetData, 'row').find((item) => Number(item.getAttribute('r')) > rowNumber);
    sheetData.insertBefore(row, next ?? null);
  }
  let cell = elements(row, 'c').find((item) => item.getAttribute('r')?.toUpperCase() === reference.toUpperCase());
  if (!cell) {
    cell = document.createElementNS(NS, 'c');
    cell.setAttribute('r', reference.toUpperCase());
    const column = cellColumn(reference);
    const template = elements(row, 'c').find((item) => cellColumn(item.getAttribute('r') ?? '') === column - 1)
      ?? elements(row, 'c').find((item) => cellColumn(item.getAttribute('r') ?? '') === column + 1);
    const style = template?.getAttribute('s');
    if (style) cell.setAttribute('s', style);
    const next = elements(row, 'c').find((item) => cellColumn(item.getAttribute('r') ?? '') > column);
    row.insertBefore(cell, next ?? null);
  }
  return cell;
}

function forceRecalculation(files: Record<string, Uint8Array>) {
  const bytes = files['xl/workbook.xml'];
  if (!bytes) return;
  const document = parseXml(strFromU8(bytes), 'a pasta de trabalho');
  let calc = elements(document, 'calcPr')[0];
  if (!calc) {
    calc = document.createElementNS(NS, 'calcPr');
    document.documentElement.appendChild(calc);
  }
  calc.setAttribute('calcMode', 'auto');
  calc.setAttribute('fullCalcOnLoad', '1');
  calc.setAttribute('forceFullCalc', '1');
  files['xl/workbook.xml'] = strToU8(new XMLSerializer().serializeToString(document));
  delete files['xl/calcChain.xml'];
}

const VISUAL_PART_PREFIXES = [
  'xl/styles.xml', 'xl/theme/', 'xl/charts/', 'xl/drawings/', 'xl/media/', 'xl/printerSettings/',
];

const WORKSHEET_LAYOUT_TAGS = [
  'sheetPr', 'sheetViews', 'sheetFormatPr', 'cols', 'mergeCells', 'conditionalFormatting', 'hyperlinks',
  'printOptions', 'pageMargins', 'pageSetup', 'headerFooter', 'drawing', 'legacyDrawing', 'picture',
];

function sameBytes(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

function visualParts(files: Record<string, Uint8Array>) {
  return new Map(Object.entries(files).filter(([path]) => VISUAL_PART_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))));
}

function assertVisualParts(before: Map<string, Uint8Array>, after: Record<string, Uint8Array>) {
  for (const [path, bytes] of before) {
    if (!after[path] || !sameBytes(bytes, after[path])) throw new Error(`A geração foi interrompida porque o componente visual “${path}” seria alterado.`);
  }
}

function worksheetLayoutSignature(document: XMLDocument) {
  const serializer = new XMLSerializer();
  return WORKSHEET_LAYOUT_TAGS.map((tag) => elements(document, tag).map((element) => serializer.serializeToString(element)).join('')).join('|');
}

export interface FormulaCachePatch { formulaCache: unknown }
export type CellPatchValue = unknown | FormulaCachePatch;
export type CellPatches = Map<string, Map<string, CellPatchValue>>;

export function formulaCache(value: unknown): FormulaCachePatch { return { formulaCache: value }; }

function isFormulaCachePatch(value: CellPatchValue): value is FormulaCachePatch {
  return typeof value === 'object' && value !== null && 'formulaCache' in value;
}

export function patchWorkbookCells(buffer: ArrayBuffer, patches: CellPatches) {
  const files = unzipSync(new Uint8Array(buffer));
  const originalVisualParts = visualParts(files);
  const paths = worksheetPaths(files);
  for (const [sheetName, changes] of patches) {
    const path = paths.get(sheetName);
    const bytes = path ? files[path] : null;
    if (!path || !bytes) throw new Error(`Não foi possível localizar a aba “${sheetName}” no relatório.`);
    const document = parseXml(strFromU8(bytes), `a aba ${sheetName}`);
    const layoutBefore = worksheetLayoutSignature(document);
    const sheetData = elements(document, 'sheetData')[0];
    if (!sheetData) throw new Error(`A aba “${sheetName}” não possui uma grade válida.`);
    for (const [reference, value] of changes) {
      const cell = ensureCell(document, sheetData, reference);
      if (isFormulaCachePatch(value)) writeValue(document, cell, value.formulaCache, true);
      else writeValue(document, cell, value);
    }
    if (worksheetLayoutSignature(document) !== layoutBefore) throw new Error(`A geração foi interrompida porque o layout da aba “${sheetName}” seria alterado.`);
    files[path] = strToU8(new XMLSerializer().serializeToString(document));
  }
  forceRecalculation(files);
  assertVisualParts(originalVisualParts, files);
  return zipSync(files, { level: 6 });
}

export const ooxml = { parseXml, elements, columnName, cellColumn, writeValue, forceRecalculation };
