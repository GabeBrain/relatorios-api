import * as XLSX from 'xlsx';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { ReportKind } from '../types';
import { ooxml, patchWorkbookCells, worksheetPaths, type CellPatches } from './ooxml-patcher';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const AREA_BANDS = ['Até 50', '50–75', '75–100', '100–150', '150–200', '200–250', '250–300', 'Acima de 300'];
const FLOOR_BANDS = ['Até 3 pav.', 'De 4 a 8 pav.', 'Mais de 8 pav.'];
const ZONE_BANDS = ['ZR-1', 'ZR-2', 'ZR-3', '(*)ZR', 'ZR-4', 'CONEC', '(**)SE', 'ZC', 'SEHIS', 'PÓLO-LV', 'ZT', 'Outros'];

export interface MonthlyOutput {
  consolidated: Uint8Array;
  consolidatedFileName: string;
  tabulation: Uint8Array;
  tabulationFileName: string;
  finalReport: Uint8Array;
  finalReportFileName: string;
  appendedRows: number;
  totalRows: number;
  month: string;
  year: number;
  unmatchedNeighborhoods: string[];
}

export interface ConsolidationOutput {
  bytes: Uint8Array;
  fileName: string;
  appendedRows: number;
  totalRows: number;
  month: string;
  year: number;
}

export interface TabulationOutput {
  bytes: Uint8Array;
  fileName: string;
  rowsRead: number;
  month: string;
  year: number;
}

export interface FinalReportOutput {
  bytes: Uint8Array;
  fileName: string;
  month: string;
  year: number;
  unmatchedNeighborhoods: string[];
}

type DataRow = Record<string, unknown>;
type VectorMap = Map<string, { label: string; values: number[] }>;

interface Aggregates {
  residentialArea: VectorMap;
  residentialFloors: VectorMap;
  nonResidentialArea: VectorMap;
  nonResidentialFloors: VectorMap;
  neighborhoodAreas: VectorMap;
  residentialZones: Map<string, number[]>;
  nonResidentialZones: Map<string, number[]>;
  history: Map<string, number[]>;
}

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLowerCase();
}

function canonicalHeader(value: unknown) {
  const header = normalize(value);
  if (/^uso s? alvara$/.test(header)) return 'uso alvara';
  if (/^sub uso s? alvara$/.test(header)) return 'sub uso alvara';
  if (/^materia(l|is|l is)$/.test(header)) return 'material';
  return header;
}

function number(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function columnIndex(headers: unknown[], ...aliases: string[]) {
  const normalized = headers.map(normalize);
  return normalized.findIndex((header) => aliases.some((alias) => header === normalize(alias)));
}

function firstSheetRows(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array', cellFormula: true, sheetStubs: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('A planilha não possui uma aba de dados.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true });
  const headers = matrix[0] ?? [];
  return {
    workbook,
    sheet,
    headers,
    rows: matrix.slice(1).filter((row) => row.some((value) => value !== '' && value !== null && value !== undefined)),
  };
}

function rowObjects(headers: unknown[], rows: unknown[][]): DataRow[] {
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [normalize(header), row[index] ?? ''])));
}

function value(row: DataRow, ...aliases: string[]) {
  for (const alias of aliases) {
    const result = row[normalize(alias)];
    if (result !== undefined) return result;
  }
  return '';
}

function periodFromRows(headers: unknown[], rows: unknown[][], fileName: string) {
  const monthColumn = columnIndex(headers, 'Mês', 'Mes');
  const yearColumn = columnIndex(headers, 'Ano');
  const monthValue = monthColumn >= 0 ? String(rows[0]?.[monthColumn] ?? '') : '';
  const month = MONTHS.find((item) => normalize(item) === normalize(monthValue))
    ?? MONTHS.find((item) => normalize(fileName).includes(normalize(item)))
    ?? MONTHS.find((_, index) => new RegExp(`(?:^|[^a-z])${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][index]}(?:[^a-z]|$)`, 'i').test(normalize(fileName)));
  const year = Number(yearColumn >= 0 ? rows[0]?.[yearColumn] : String(fileName).match(/20\d{2}/)?.[0]);
  if (!month || !year) throw new Error('Não foi possível identificar o mês e o ano no arquivo mensal tratado.');
  return { month, year };
}

function formulaFor(header: string, row: number, headers: unknown[]) {
  const released = columnIndex(headers, 'Área Liberada');
  const residential = columnIndex(headers, 'Quantidade de Unidades Residênciais', 'Quantidade de Unidades Residenciais');
  const nonResidential = columnIndex(headers, 'Quantidade Unidades Não Residênciais', 'Quantidade Unidades Não Residenciais');
  const unitArea = columnIndex(headers, 'Área Unidade', 'Area Unidade');
  const col = (index: number) => ooxml.columnName(index);
  const key = normalize(header);
  if (key === normalize('Área Unidade')) return `${col(released)}${row}/(${col(residential)}${row}+${col(nonResidential)}${row})`;
  if (/areas? resid/.test(key) || key === normalize('Área Resid')) return `${col(unitArea)}${row}*${col(residential)}${row}`;
  if (/area nao resid/.test(key)) return `${col(unitArea)}${row}*${col(nonResidential)}${row}`;
  return null;
}

function appendRowsPreservingWorkbook(baseBuffer: ArrayBuffer, currentHeaders: unknown[], currentRows: unknown[][]) {
  const base = firstSheetRows(baseBuffer);
  const baseHeaderKeys = base.headers.map(canonicalHeader);
  const currentHeaderKeys = currentHeaders.map(canonicalHeader);
  const missing = baseHeaderKeys.filter((header) => header && !currentHeaderKeys.includes(header) && !/area(s)? (unidade|resid|nao resid)/.test(header));
  if (missing.length) throw new Error(`O arquivo mensal não possui colunas da base acumulada: ${missing.join(', ')}.`);

  const files = unzipSync(new Uint8Array(baseBuffer));
  const path = worksheetPaths(files).values().next().value as string | undefined;
  const bytes = path ? files[path] : null;
  if (!path || !bytes) throw new Error('Não foi possível localizar a aba principal da base acumulada.');
  const document = ooxml.parseXml(strFromU8(bytes), 'a base acumulada');
  const sheetData = ooxml.elements(document, 'sheetData')[0];
  if (!sheetData) throw new Error('A base acumulada não possui uma grade válida.');
  const xmlRows = ooxml.elements(sheetData, 'row');
  const templateRow = xmlRows.at(-1);
  if (!templateRow) throw new Error('A base acumulada não possui uma linha de modelo.');
  const templateNumber = Number(templateRow.getAttribute('r'));
  const templateCells = new Map(ooxml.elements(templateRow, 'c').map((cell) => [ooxml.cellColumn(cell.getAttribute('r') ?? ''), cell]));

  currentRows.forEach((source, offset) => {
    const rowNumber = templateNumber + offset + 1;
    const row = document.importNode(templateRow, true) as Element;
    for (const child of Array.from(row.childNodes)) row.removeChild(child);
    row.setAttribute('r', String(rowNumber));
    row.setAttribute('spans', `1:${base.headers.length}`);
    base.headers.forEach((header, column) => {
      const templateCell = templateCells.get(column);
      const cell = templateCell ? document.importNode(templateCell, true) as Element : document.createElementNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'c');
      cell.setAttribute('r', `${ooxml.columnName(column)}${rowNumber}`);
      const formula = formulaFor(String(header), rowNumber, base.headers);
      if (formula) {
        ooxml.writeValue(document, cell, null);
        const formulaNode = document.createElementNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'f');
        formulaNode.textContent = formula;
        cell.appendChild(formulaNode);
        const cachedValue = document.createElementNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'v');
        cachedValue.textContent = '0';
        cell.appendChild(cachedValue);
      } else {
        const sourceColumn = currentHeaderKeys.indexOf(baseHeaderKeys[column]);
        ooxml.writeValue(document, cell, sourceColumn >= 0 ? source[sourceColumn] : '');
      }
      row.appendChild(cell);
    });
    sheetData.appendChild(row);
  });

  const dimension = ooxml.elements(document, 'dimension')[0];
  dimension?.setAttribute('ref', `A1:${ooxml.columnName(base.headers.length - 1)}${templateNumber + currentRows.length}`);
  files[path] = strToU8(new XMLSerializer().serializeToString(document));
  ooxml.forceRecalculation(files);
  return { bytes: zipSync(files, { level: 6 }), headers: base.headers, rows: [...base.rows, ...currentRows] };
}

function areaBand(value: number) {
  return value <= 50 ? 0 : value <= 75 ? 1 : value <= 100 ? 2 : value <= 150 ? 3 : value <= 200 ? 4 : value <= 250 ? 5 : value <= 300 ? 6 : 7;
}

function floorBand(value: number) { return value <= 3 ? 0 : value <= 8 ? 1 : 2; }

function zoneBand(raw: unknown) {
  const zone = normalize(raw).replace(/\s+/g, '');
  if (/^zr1/.test(zone)) return 0;
  if (/^zr2/.test(zone)) return 1;
  if (/^zr3/.test(zone)) return 2;
  if (/^zr4/.test(zone)) return 4;
  if (/^zr/.test(zone)) return 3;
  if (/^(eco|conec)/.test(zone)) return 5;
  if (/^(ee|se-?\d|setorespecial)/.test(zone) && !/sehis/.test(zone)) return 6;
  if (/^zc/.test(zone)) return 7;
  if (/sehis/.test(zone)) return 8;
  if (/polo/.test(zone)) return 9;
  if (/^zt/.test(zone)) return 10;
  return 11;
}

function addVector(map: VectorMap, label: string, index: number, amount: number, size: number) {
  const key = normalize(label);
  if (!key || !amount) return;
  const entry = map.get(key) ?? { label, values: Array(size).fill(0) };
  entry.values[index] += amount;
  map.set(key, entry);
}

function addArray(map: Map<string, number[]>, key: string, index: number, amount: number, size: number) {
  if (!amount) return;
  const values = map.get(key) ?? Array(size).fill(0);
  values[index] += amount;
  map.set(key, values);
}

function buildAggregates(headers: unknown[], matrix: unknown[][]): Aggregates {
  const result: Aggregates = {
    residentialArea: new Map(), residentialFloors: new Map(), nonResidentialArea: new Map(), nonResidentialFloors: new Map(),
    neighborhoodAreas: new Map(), residentialZones: new Map(), nonResidentialZones: new Map(), history: new Map(),
  };
  for (const row of rowObjects(headers, matrix)) {
    const neighborhood = String(value(row, 'Bairro') || '').trim();
    const residential = number(value(row, 'Quantidade de Unidades Residênciais', 'Quantidade de Unidades Residenciais'));
    const nonResidential = number(value(row, 'Quantidade Unidades Não Residênciais', 'Quantidade Unidades Não Residenciais'));
    const released = number(value(row, 'Área Liberada'));
    const unitArea = number(value(row, 'Área Unidade')) || (residential + nonResidential ? released / (residential + nonResidential) : 0);
    const residentialArea = number(value(row, 'Área Resid', 'Areas Resid', 'Área Residencial')) || unitArea * residential;
    const nonResidentialArea = number(value(row, 'Área Não Resid', 'Área Não Residencial')) || unitArea * nonResidential;
    const floors = number(value(row, 'Quantidade Pavimentos'));
    const month = MONTHS.findIndex((item) => normalize(item) === normalize(value(row, 'Mês', 'Mes')));
    const year = number(value(row, 'Ano'));
    if (neighborhood && unitArea > 0) {
      addVector(result.residentialArea, neighborhood, areaBand(unitArea), residential, 8);
      addVector(result.nonResidentialArea, neighborhood, areaBand(unitArea), nonResidential, 8);
      addVector(result.residentialFloors, neighborhood, floorBand(floors), residential, 3);
      addVector(result.nonResidentialFloors, neighborhood, floorBand(floors), nonResidential, 3);
      addVector(result.neighborhoodAreas, neighborhood, 0, residentialArea, 2);
      addVector(result.neighborhoodAreas, neighborhood, 1, nonResidentialArea, 2);
    }
    if (month >= 0 && year) {
      const monthKey = `${year}-${month + 1}`;
      addArray(result.residentialZones, monthKey, zoneBand(value(row, 'Grupo Zoneamento')), residential, 12);
      addArray(result.nonResidentialZones, monthKey, zoneBand(value(row, 'Grupo Zoneamento')), nonResidential, 12);
      addArray(result.history, monthKey, 0, residentialArea, 4);
      addArray(result.history, monthKey, 1, nonResidentialArea, 4);
      addArray(result.history, monthKey, 2, residential, 4);
      addArray(result.history, monthKey, 3, nonResidential, 4);
    }
  }
  return result;
}

function tableRows(map: VectorMap, headers: string[]) {
  return [['Bairro', ...headers, 'Total'], ...[...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')).map((entry) => [entry.label, ...entry.values.map(blankZero), entry.values.reduce((sum, item) => sum + item, 0)])];
}

function blankZero(value: number) { return value ? value : ''; }

function appendStyledSheet(workbook: XLSX.WorkBook, name: string, rows: unknown[][]) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = rows[0].map((_, index) => ({ wch: index === 0 ? 28 : 16 }));
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, rows.length - 1), c: Math.max(0, rows[0].length - 1) } }) };
  sheet['!freeze'] = { xSplit: 1, ySplit: 1, topLeftCell: 'B2', activePane: 'bottomRight', state: 'frozen' };
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function buildTabulation(aggregates: Aggregates) {
  const workbook = XLSX.utils.book_new();
  appendStyledSheet(workbook, 'Residencial por área', tableRows(aggregates.residentialArea, AREA_BANDS));
  appendStyledSheet(workbook, 'Residencial por pavimento', tableRows(aggregates.residentialFloors, FLOOR_BANDS));
  appendStyledSheet(workbook, 'Não resid. por área', tableRows(aggregates.nonResidentialArea, AREA_BANDS));
  appendStyledSheet(workbook, 'Não resid. por pavimento', tableRows(aggregates.nonResidentialFloors, FLOOR_BANDS));
  appendStyledSheet(workbook, 'Áreas por bairro', tableRows(aggregates.neighborhoodAreas, ['Área residencial', 'Área não residencial']));
  const zoneRows = (map: Map<string, number[]>) => [['Período', ...ZONE_BANDS, 'Total'], ...[...map].sort(([a], [b]) => a.localeCompare(b)).map(([key, values]) => [key, ...values.map(blankZero), values.reduce((sum, item) => sum + item, 0)])];
  appendStyledSheet(workbook, 'Residencial por zona', zoneRows(aggregates.residentialZones));
  appendStyledSheet(workbook, 'Não resid. por zona', zoneRows(aggregates.nonResidentialZones));
  appendStyledSheet(workbook, 'Série histórica', [['Período', 'Área residencial', 'Área não residencial', 'Unidades residenciais', 'Unidades não residenciais'], ...[...aggregates.history].sort(([a], [b]) => a.localeCompare(b)).map(([key, values]) => [key, ...values.map(blankZero)])]);
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
}

function vectorMapFromSheet(workbook: XLSX.WorkBook, sheetName: string, size: number): VectorMap {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`A tabulação não possui a aba “${sheetName}”.`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true }).slice(1);
  return new Map(rows.filter((row) => String(row[0] ?? '').trim()).map((row) => {
    const label = String(row[0]).trim();
    return [normalize(label), { label, values: Array.from({ length: size }, (_, index) => number(row[index + 1])) }];
  }));
}

function periodMapFromSheet(workbook: XLSX.WorkBook, sheetName: string, size: number) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`A tabulação não possui a aba “${sheetName}”.`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true }).slice(1);
  return new Map(rows.filter((row) => /^20\d{2}-\d{1,2}$/.test(String(row[0]))).map((row) => [String(row[0]), Array.from({ length: size }, (_, index) => number(row[index + 1]))]));
}

function aggregatesFromTabulation(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array', cellFormula: true });
  return {
    residentialArea: vectorMapFromSheet(workbook, 'Residencial por área', 8),
    residentialFloors: vectorMapFromSheet(workbook, 'Residencial por pavimento', 3),
    nonResidentialArea: vectorMapFromSheet(workbook, 'Não resid. por área', 8),
    nonResidentialFloors: vectorMapFromSheet(workbook, 'Não resid. por pavimento', 3),
    neighborhoodAreas: vectorMapFromSheet(workbook, 'Áreas por bairro', 2),
    residentialZones: periodMapFromSheet(workbook, 'Residencial por zona', 12),
    nonResidentialZones: periodMapFromSheet(workbook, 'Não resid. por zona', 12),
    history: periodMapFromSheet(workbook, 'Série histórica', 4),
  } satisfies Aggregates;
}

function latestPeriod(aggregates: Aggregates) {
  const periods = [...aggregates.history.keys()].map((key) => key.split('-').map(Number) as [number, number]).sort(([yearA, monthA], [yearB, monthB]) => yearA - yearB || monthA - monthB);
  const [year, monthNumber] = periods.at(-1) ?? [];
  if (!year || !monthNumber || !MONTHS[monthNumber - 1]) throw new Error('Não foi possível identificar o período mais recente nos dados.');
  return { year, month: MONTHS[monthNumber - 1] };
}

function setVector(changes: Map<string, unknown>, startColumn: number, row: number, values: number[]) {
  values.forEach((item, offset) => changes.set(`${ooxml.columnName(startColumn + offset)}${row}`, blankZero(item)));
}

function updateReport(template: ArrayBuffer, aggregates: Aggregates, month: string, year: number) {
  const workbook = XLSX.read(template, { type: 'array', cellFormula: true, sheetStubs: true });
  const patches: CellPatches = new Map();
  const matched = new Set<string>();
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const name = normalize(sheetName);
    const changes = new Map<string, unknown>();
    patches.set(sheetName, changes);
    let vectors: VectorMap | null = null;
    let width = 0;
    if (/03.*resid.*area/.test(name)) { vectors = aggregates.residentialArea; width = 8; }
    else if (/06.*resid.*area/.test(name)) { vectors = aggregates.nonResidentialArea; width = 8; }
    else if (/04.*resid.*pav/.test(name)) { vectors = aggregates.residentialFloors; width = 3; }
    else if (/07.*resid.*pav/.test(name)) { vectors = aggregates.nonResidentialFloors; width = 3; }
    else if (/area por bairro/.test(name)) { vectors = aggregates.neighborhoodAreas; width = 2; }

    const labelColumns = vectors ? new Set(Object.entries(sheet).flatMap(([reference, cell]) => {
      if (reference.startsWith('!') || normalize((cell as XLSX.CellObject).v) !== 'setores') return [];
      return [XLSX.utils.decode_cell(reference).c];
    })) : new Set<number>();

    for (const [reference, cell] of Object.entries(sheet)) {
      if (reference.startsWith('!') || !cell || typeof cell !== 'object') continue;
      const typed = cell as XLSX.CellObject;
      if (typeof typed.v === 'string') {
        let title = typed.v;
        title = title.replace(/JANEIRO\s+A\s+[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ]+(?:\s+DE)?\s+20\d{2}/i, `JANEIRO A ${month.toUpperCase()} DE ${year}`);
        title = title.replace(/(POR\s+ZONA\s*-\s*)20\d{2}/i, `$1${year}`);
        if (title !== typed.v) changes.set(reference, title);
      }
      if (vectors && typeof typed.v === 'string') {
        const address = XLSX.utils.decode_cell(reference);
        if (labelColumns.has(address.c) && address.r >= 4 && !/^(setor|subtotal|total)/.test(normalize(typed.v))) {
          setVector(changes, address.c + 1, address.r + 1, Array(width).fill(0));
          const entry = vectors.get(normalize(typed.v));
          if (entry) {
          setVector(changes, address.c + 1, address.r + 1, entry.values.slice(0, width));
          matched.add(normalize(entry.label));
          }
        }
      }
    }

    if (/05.*resid.*zona/.test(name) || /08.*resid.*zona/.test(name)) {
      const source = /05/.test(name) ? aggregates.residentialZones : aggregates.nonResidentialZones;
      for (const [reference, cell] of Object.entries(sheet)) {
        if (reference.startsWith('!') || typeof (cell as XLSX.CellObject).v !== 'string') continue;
        const monthIndex = MONTHS.findIndex((item) => normalize(item) === normalize((cell as XLSX.CellObject).v));
        if (monthIndex >= 0) {
          const address = XLSX.utils.decode_cell(reference);
          setVector(changes, address.c + 1, address.r + 1, source.get(`${year}-${monthIndex + 1}`) ?? Array(12).fill(0));
        }
      }
    }

    if (/10.*serie hist/.test(name)) {
      for (const [reference, cell] of Object.entries(sheet)) {
        if (reference.startsWith('!') || XLSX.utils.decode_cell(reference).c !== 1 || typeof (cell as XLSX.CellObject).v !== 'number') continue;
        const parsed = XLSX.SSF.parse_date_code((cell as XLSX.CellObject).v as number);
        if (!parsed) continue;
        const values = aggregates.history.get(`${parsed.y}-${parsed.m}`) ?? Array(4).fill(0);
        setVector(changes, 2, XLSX.utils.decode_cell(reference).r + 1, values);
      }
    }
    if (!changes.size) patches.delete(sheetName);
  }
  const allNeighborhoods = new Set([...aggregates.residentialArea.keys(), ...aggregates.nonResidentialArea.keys(), ...aggregates.neighborhoodAreas.keys()]);
  const unmatchedNeighborhoods = [...allNeighborhoods].filter((key) => !matched.has(key)).map((key) => aggregates.neighborhoodAreas.get(key)?.label ?? key);
  return { bytes: patchWorkbookCells(template, patches), unmatchedNeighborhoods };
}

export function processMonthlyWorkflow(baseBuffer: ArrayBuffer, currentBuffer: ArrayBuffer, currentFileName: string, reportTemplate: ArrayBuffer, kind: ReportKind): MonthlyOutput {
  const current = firstSheetRows(currentBuffer);
  const { month, year } = periodFromRows(current.headers, current.rows, currentFileName);
  const appended = appendRowsPreservingWorkbook(baseBuffer, current.headers, current.rows);
  const aggregates = buildAggregates(appended.headers, appended.rows);
  const tabulation = new Uint8Array(buildTabulation(aggregates));
  const report = updateReport(reportTemplate, aggregates, month, year);
  const monthToken = normalize(month).replace(/\s+/g, '_').toUpperCase();
  const isAlvaras = kind === 'alvaras';
  return {
    consolidated: appended.bytes,
    consolidatedFileName: `${isAlvaras ? 'Liberados' : 'CVCO'}_${monthToken}_${year}.xlsx`,
    tabulation,
    tabulationFileName: `Tabulacao_${isAlvaras ? 'Liberados' : 'CVCO'}_${monthToken}_${year}.xlsx`,
    finalReport: report.bytes,
    finalReportFileName: `Relatorio ${isAlvaras ? 'Liberado' : 'Concluido'} ${month.toUpperCase()} ${year}.xlsx`,
    appendedRows: current.rows.length,
    totalRows: appended.rows.length,
    month,
    year,
    unmatchedNeighborhoods: report.unmatchedNeighborhoods,
  };
}

export function consolidateMonthlyBase(baseBuffer: ArrayBuffer, currentBuffer: ArrayBuffer, currentFileName: string, kind: ReportKind): ConsolidationOutput {
  const current = firstSheetRows(currentBuffer);
  const { month, year } = periodFromRows(current.headers, current.rows, currentFileName);
  const appended = appendRowsPreservingWorkbook(baseBuffer, current.headers, current.rows);
  const token = normalize(month).replace(/\s+/g, '_').toUpperCase();
  return {
    bytes: appended.bytes,
    fileName: `${kind === 'alvaras' ? 'Liberados' : 'CVCO'}_${token}_${year}.xlsx`,
    appendedRows: current.rows.length,
    totalRows: appended.rows.length,
    month,
    year,
  };
}

export function tabulateConsolidatedBase(buffer: ArrayBuffer, kind: ReportKind): TabulationOutput {
  const source = firstSheetRows(buffer);
  const aggregates = buildAggregates(source.headers, source.rows);
  const { month, year } = latestPeriod(aggregates);
  const token = normalize(month).replace(/\s+/g, '_').toUpperCase();
  return {
    bytes: new Uint8Array(buildTabulation(aggregates)),
    fileName: `Tabulacao_${kind === 'alvaras' ? 'Liberados' : 'CVCO'}_${token}_${year}.xlsx`,
    rowsRead: source.rows.length,
    month,
    year,
  };
}

export function generateFinalReport(tabulationBuffer: ArrayBuffer, templateBuffer: ArrayBuffer, kind: ReportKind): FinalReportOutput {
  const aggregates = aggregatesFromTabulation(tabulationBuffer);
  const { month, year } = latestPeriod(aggregates);
  const report = updateReport(templateBuffer, aggregates, month, year);
  return {
    bytes: report.bytes,
    fileName: `Relatorio ${kind === 'alvaras' ? 'Liberado' : 'Concluido'} ${month.toUpperCase()} ${year}.xlsx`,
    month,
    year,
    unmatchedNeighborhoods: report.unmatchedNeighborhoods,
  };
}
