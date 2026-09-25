import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { ProcessedWorkbook } from './report-processor';

const SPREADSHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const OFFICE_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const DERIVED_HEADERS = new Set(['Mês', 'Ano', 'Área Unidade', 'ÁREA RESID', 'ÁREA NÃO RESID']);
const MUTATED_HEADERS = new Set(['Quantidade de Unidades Residênciais', 'Quantidade Unidades Não Residênciais']);

function parseXml(xml: string, label: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const error = document.getElementsByTagName('parsererror')[0];
  if (error) throw new Error(`Não foi possível interpretar ${label} do arquivo XLSX.`);
  return document;
}

function elements(parent: Document | Element, localName: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS('*', localName));
}

function firstElement(parent: Document | Element, localName: string): Element | null {
  return elements(parent, localName)[0] ?? null;
}

function normalizeWorksheetPath(target: string) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = `xl/${target}`.split('/');
  const normalized: string[] = [];
  for (const part of parts) {
    if (part === '..') normalized.pop();
    else if (part !== '.') normalized.push(part);
  }
  return normalized.join('/');
}

function firstWorksheetPath(files: Record<string, Uint8Array>) {
  const workbookXml = files['xl/workbook.xml'];
  const relationshipsXml = files['xl/_rels/workbook.xml.rels'];
  if (!workbookXml || !relationshipsXml) throw new Error('O arquivo não possui a estrutura esperada de uma pasta de trabalho XLSX.');

  const workbook = parseXml(strFromU8(workbookXml), 'a pasta de trabalho');
  const relationships = parseXml(strFromU8(relationshipsXml), 'os relacionamentos da pasta de trabalho');
  const firstSheet = firstElement(workbook, 'sheet');
  const relationshipId = firstSheet?.getAttributeNS(OFFICE_REL_NS, 'id');
  const relationship = elements(relationships, 'Relationship').find((item) => item.getAttribute('Id') === relationshipId);
  const target = relationship?.getAttribute('Target');
  if (!target) throw new Error('Não foi possível localizar a primeira aba da planilha.');
  return normalizeWorksheetPath(target);
}

function columnName(index: number) {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function cellColumn(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return -1;
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return result - 1;
}

function rowCells(row: Element) {
  return Array.from(row.childNodes).filter((node): node is Element => node.nodeType === 1 && (node as Element).localName === 'c');
}

function cellsByColumn(row: Element) {
  return new Map(rowCells(row).map((cell) => [cellColumn(cell.getAttribute('r') ?? ''), cell]));
}

function templateColumn(header: string, sourceHeaders: string[]) {
  if (header === 'Mês' || header === 'Ano') return 0;
  if (header === 'Área Unidade' || header === 'ÁREA RESID' || header === 'ÁREA NÃO RESID') return sourceHeaders.indexOf('Área Liberada');
  return sourceHeaders.indexOf(header);
}

function removeCellValue(cell: Element) {
  for (const child of Array.from(cell.childNodes)) cell.removeChild(child);
  cell.removeAttribute('t');
}

function writeCellValue(document: XMLDocument, cell: Element, value: unknown) {
  removeCellValue(cell);
  if (value === '' || value === null || value === undefined) return;

  if (typeof value === 'number') {
    const node = document.createElementNS(SPREADSHEET_NS, 'v');
    node.textContent = String(value);
    cell.appendChild(node);
    return;
  }
  if (typeof value === 'boolean') {
    cell.setAttribute('t', 'b');
    const node = document.createElementNS(SPREADSHEET_NS, 'v');
    node.textContent = value ? '1' : '0';
    cell.appendChild(node);
    return;
  }

  cell.setAttribute('t', 'inlineStr');
  const inline = document.createElementNS(SPREADSHEET_NS, 'is');
  const text = document.createElementNS(SPREADSHEET_NS, 't');
  text.textContent = String(value);
  inline.appendChild(text);
  cell.appendChild(inline);
}

function emptyCell(document: XMLDocument, style?: string | null) {
  const cell = document.createElementNS(SPREADSHEET_NS, 'c');
  if (style) cell.setAttribute('s', style);
  return cell;
}

function cloneCell(document: XMLDocument, source?: Element | null, fallback?: Element | null) {
  const template = source ?? fallback;
  return template ? document.importNode(template, true) as Element : emptyCell(document);
}

function styleForOutputRow(sourceCell: Element | null, sourceColumn: number, outputRow: number, stripeRows: Array<Map<number, Element>>) {
  const sourceStyle = sourceCell?.getAttribute('s');
  const firstStyle = stripeRows[0]?.get(sourceColumn)?.getAttribute('s');
  const secondStyle = stripeRows[1]?.get(sourceColumn)?.getAttribute('s');
  if (!sourceStyle || !firstStyle || !secondStyle || (sourceStyle !== firstStyle && sourceStyle !== secondStyle)) return sourceStyle;
  return stripeRows[(outputRow - 2) % 2]?.get(sourceColumn)?.getAttribute('s') ?? sourceStyle;
}

function rebuildColumns(document: XMLDocument, outputHeaders: string[], sourceHeaders: string[]) {
  const cols = firstElement(document, 'cols');
  if (!cols) return;
  const definitions = elements(cols, 'col');
  const definitionFor = (sourceColumn: number) => definitions.find((definition) => {
    const min = Number(definition.getAttribute('min'));
    const max = Number(definition.getAttribute('max'));
    return sourceColumn + 1 >= min && sourceColumn + 1 <= max;
  });
  for (const child of Array.from(cols.childNodes)) cols.removeChild(child);
  outputHeaders.forEach((header, outputColumn) => {
    const sourceColumn = Math.max(0, templateColumn(header, sourceHeaders));
    const source = definitionFor(sourceColumn);
    if (!source) return;
    const clone = document.importNode(source, true) as Element;
    clone.setAttribute('min', String(outputColumn + 1));
    clone.setAttribute('max', String(outputColumn + 1));
    cols.appendChild(clone);
  });
}

function assertSupportedStructure(document: XMLDocument) {
  const unsupported = [
    ['f', 'fórmulas'],
    ['mergeCell', 'células mescladas'],
    ['tablePart', 'tabelas estruturadas'],
    ['drawing', 'desenhos ou gráficos'],
    ['conditionalFormatting', 'formatação condicional'],
  ] as const;
  const found = unsupported.filter(([tag]) => elements(document, tag).length > 0).map(([, label]) => label);
  if (found.length) throw new Error(`Esta planilha contém recursos que ainda não podem ser reposicionados com segurança: ${found.join(', ')}.`);
}

export function buildStylePreservingWorkbook(buffer: ArrayBuffer, processed: ProcessedWorkbook) {
  const files = unzipSync(new Uint8Array(buffer));
  const worksheetPath = firstWorksheetPath(files);
  const worksheetBytes = files[worksheetPath];
  if (!worksheetBytes) throw new Error('Não foi possível ler a primeira aba da planilha.');

  const document = parseXml(strFromU8(worksheetBytes), 'a primeira aba');
  assertSupportedStructure(document);
  const sheetData = firstElement(document, 'sheetData');
  if (!sheetData) throw new Error('A primeira aba não possui uma grade de dados válida.');
  const sourceRows = elements(sheetData, 'row');
  const sourceRowsByNumber = new Map(sourceRows.map((row) => [Number(row.getAttribute('r')), row]));
  const headerRow = sourceRowsByNumber.get(1);
  if (!headerRow) throw new Error('Não foi possível localizar o cabeçalho da planilha.');

  const headerCells = cellsByColumn(headerRow);
  const stripeRows = [sourceRowsByNumber.get(2), sourceRowsByNumber.get(3)].map((row) => row ? cellsByColumn(row) : new Map<number, Element>());
  for (const child of Array.from(sheetData.childNodes)) sheetData.removeChild(child);

  const outputHeaderRow = document.importNode(headerRow, true) as Element;
  for (const child of Array.from(outputHeaderRow.childNodes)) outputHeaderRow.removeChild(child);
  outputHeaderRow.setAttribute('r', '1');
  processed.layout.outputHeaders.forEach((header, outputColumn) => {
    const sourceColumn = Math.max(0, templateColumn(header, processed.layout.sourceHeaders));
    const cell = cloneCell(document, headerCells.get(sourceColumn), headerCells.get(0));
    cell.setAttribute('r', `${columnName(outputColumn)}1`);
    writeCellValue(document, cell, header);
    outputHeaderRow.appendChild(cell);
  });
  sheetData.appendChild(outputHeaderRow);

  processed.rows.forEach((values, index) => {
    const outputRowNumber = index + 2;
    const sourceRowNumber = processed.layout.sourceRows[index] + 1;
    const sourceRow = sourceRowsByNumber.get(sourceRowNumber);
    if (!sourceRow) throw new Error(`Não foi possível recuperar a linha ${sourceRowNumber} da planilha original.`);
    const sourceCells = cellsByColumn(sourceRow);
    const outputRow = document.importNode(sourceRow, true) as Element;
    for (const child of Array.from(outputRow.childNodes)) outputRow.removeChild(child);
    outputRow.setAttribute('r', String(outputRowNumber));

    processed.layout.outputHeaders.forEach((header, outputColumn) => {
      const sourceColumn = Math.max(0, templateColumn(header, processed.layout.sourceHeaders));
      const sourceCell = sourceCells.get(sourceColumn) ?? null;
      const fallback = sourceCells.get(0) ?? null;
      const cell = cloneCell(document, sourceCell, fallback);
      cell.setAttribute('r', `${columnName(outputColumn)}${outputRowNumber}`);
      const style = styleForOutputRow(sourceCell, sourceColumn, outputRowNumber, stripeRows);
      if (style) cell.setAttribute('s', style);
      else cell.removeAttribute('s');
      if (DERIVED_HEADERS.has(header) || MUTATED_HEADERS.has(header)) writeCellValue(document, cell, values[header]);
      outputRow.appendChild(cell);
    });
    sheetData.appendChild(outputRow);
  });

  rebuildColumns(document, processed.layout.outputHeaders, processed.layout.sourceHeaders);
  const dimension = firstElement(document, 'dimension');
  const lastColumn = columnName(Math.max(0, processed.layout.outputHeaders.length - 1));
  dimension?.setAttribute('ref', `A1:${lastColumn}${Math.max(1, processed.rows.length + 1)}`);

  files[worksheetPath] = strToU8(new XMLSerializer().serializeToString(document));
  return zipSync(files, { level: 6 });
}
