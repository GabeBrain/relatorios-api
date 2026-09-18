import * as XLSX from 'xlsx';
import type { ProcessedReport, ReportKind, ReviewItem, UnitDecision } from '../types';

const MONTHS: Record<string, string> = {
  JAN: 'Janeiro', FEV: 'Fevereiro', MAR: 'Março', ABR: 'Abril', MAI: 'Maio', JUN: 'Junho',
  JUL: 'Julho', AGO: 'Agosto', SET: 'Setembro', OUT: 'Outubro', NOV: 'Novembro', DEZ: 'Dezembro',
};

const COLUMN = {
  usage: 'Uso(s) Alvará', purpose: 'Finalidade', releasedArea: 'Área Liberada', inspectionArea: 'Área Vistoria',
  residential: 'Quantidade de Unidades Residênciais', nonResidential: 'Quantidade Unidades Não Residênciais',
};

function decode(value: unknown) {
  if (typeof value !== 'string') return value;
  const element = document.createElement('textarea');
  element.innerHTML = value;
  return element.value.trim();
}

function numberOrBlank(value: unknown): number | '' {
  if (value === null || value === undefined || value === '') return '';
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : '';
}

function numberValue(value: unknown) {
  const result = numberOrBlank(value);
  return typeof result === 'number' ? result : 0;
}

export function periodFromFileName(fileName: string) {
  const upper = fileName.toUpperCase();
  const token = Object.keys(MONTHS).find((key) => new RegExp(`(?:_|-)${key}(?:_|-)`).test(upper));
  const year = Number(upper.match(/20\d{2}/)?.[0]);
  if (!token || !year) throw new Error('Não foi possível identificar mês e ano no nome do arquivo. Use o padrão com SET_2026, por exemplo.');
  return { month: MONTHS[token], year };
}

function normalizedHeader(header: unknown) { return String(decode(header) ?? '').replace(/\s+/g, ' ').trim(); }
function isCommercial(usage: string) { return /com[eé]rcio|servi[cç]o/i.test(usage); }
function isResidential(usage: string) { return /habita[cç][aã]o|residencial/i.test(usage); }

function applyUnitRule(row: Record<string, unknown>, rowNumber: number, reviews: ReviewItem[], decisions: UnitDecision[]) {
  const usage = String(row[COLUMN.usage] ?? '');
  const residential = numberValue(row[COLUMN.residential]);
  const nonResidential = numberValue(row[COLUMN.nonResidential]);
  const commercial = isCommercial(usage);
  const residentialUse = isResidential(usage);
  const recordDecision = (decision: string) => decisions.push({
    id: `decision-${rowNumber}`, rowNumber, usage, originalResidential: residential, originalNonResidential: nonResidential,
    finalResidential: numberValue(row[COLUMN.residential]), finalNonResidential: numberValue(row[COLUMN.nonResidential]), decision,
  });

  if (commercial && !residentialUse) {
    row[COLUMN.residential] = '';
    if (residential) recordDecision('Uso comercial: unidades residenciais foram excluídas; a quantidade não residencial original foi mantida.');
  } else if (residentialUse && !commercial) {
    row[COLUMN.nonResidential] = '';
    if (nonResidential) recordDecision('Uso residencial: unidades não residenciais foram excluídas; a quantidade residencial original foi mantida.');
  } else if (commercial && residentialUse && residential && nonResidential) {
    if (residential >= nonResidential * 3) {
      row[COLUMN.residential] = residential;
      row[COLUMN.nonResidential] = '';
      recordDecision('Uso misto com predominância residencial: mantidas as unidades residenciais.');
    } else if (residential <= nonResidential * 2) {
      row[COLUMN.residential] = '';
      row[COLUMN.nonResidential] = nonResidential;
      recordDecision('Uso misto comercial: mantidas as unidades não residenciais.');
    } else {
      reviews.push({ id: `row-${rowNumber}`, rowNumber, usage, residential, nonResidential, reason: 'Uso misto comercial/residencial em faixa intermediária; revise a classificação.' });
    }
  }
  row[COLUMN.residential] = numberOrBlank(row[COLUMN.residential]);
  row[COLUMN.nonResidential] = numberOrBlank(row[COLUMN.nonResidential]);
}

interface SourceRow { values: unknown[]; sourceRow: number; }

export interface ProcessedWorkbook extends ProcessedReport {
  workbook: XLSX.WorkBook;
  layout: {
    sourceHeaders: string[];
    outputHeaders: string[];
    sourceRows: number[];
  };
}

function outputHeaders(headers: string[], kind: ReportKind) {
  const result = ['Mês'];
  for (const header of headers) {
    if (kind === 'cvco' && (header === COLUMN.inspectionArea || header === 'Tipo Vistoria')) continue;
    result.push(header);
    if (header === COLUMN.releasedArea) {
      if (kind === 'cvco') result.push(COLUMN.inspectionArea);
      result.push('Área Unidade', 'ÁREA RESID', 'ÁREA NÃO RESID');
      if (kind === 'cvco') result.push('Tipo Vistoria');
    }
  }
  return [...result, 'Ano'];
}

function templateColumn(header: string, headers: string[]) {
  if (header === 'Mês' || header === 'Ano') return 0;
  if (header === 'Área Unidade' || header === 'ÁREA RESID' || header === 'ÁREA NÃO RESID') return headers.indexOf(COLUMN.releasedArea);
  return headers.indexOf(header);
}

function clonedCell(cell?: XLSX.CellObject): XLSX.CellObject {
  return cell ? { ...cell, s: cell.s ? { ...cell.s } : cell.s } : { t: 'z' };
}

function writeValue(cell: XLSX.CellObject, value: unknown) {
  delete cell.f;
  delete cell.w;
  if (value === '' || value === null || value === undefined) {
    cell.t = 'z';
    delete cell.v;
    return cell;
  }
  cell.v = value as string | number | boolean | Date;
  cell.t = typeof value === 'number' ? 'n' : typeof value === 'boolean' ? 'b' : value instanceof Date ? 'd' : 's';
  return cell;
}

function formattedSheet(source: XLSX.WorkSheet, headers: string[], output: Record<string, unknown>[], sourceRows: SourceRow[], columns: string[]) {
  const sheet: XLSX.WorkSheet = {};
  const sourceColumns = source['!cols'] ?? [];
  const sourceHeights = source['!rows'] ?? [];
  columns.forEach((header, targetColumn) => {
    const sourceColumn = templateColumn(header, headers);
    if (sourceColumn >= 0 && sourceColumns[sourceColumn]) {
      sheet['!cols'] ??= [];
      sheet['!cols'][targetColumn] = { ...sourceColumns[sourceColumn] };
    }
    const headerCell = clonedCell(source[XLSX.utils.encode_cell({ r: 0, c: Math.max(0, sourceColumn) })]);
    sheet[XLSX.utils.encode_cell({ r: 0, c: targetColumn })] = writeValue(headerCell, header);
  });
  if (sourceHeights[0]) sheet['!rows'] = [{ ...sourceHeights[0] }];
  output.forEach((row, targetRow) => {
    const originalRow = sourceRows[targetRow].sourceRow;
    if (sourceHeights[originalRow]) {
      sheet['!rows'] ??= [];
      sheet['!rows'][targetRow + 1] = { ...sourceHeights[originalRow] };
    }
    columns.forEach((header, targetColumn) => {
      const sourceColumn = templateColumn(header, headers);
      const sourceCell = source[XLSX.utils.encode_cell({ r: originalRow, c: Math.max(0, sourceColumn) })];
      const cell = clonedCell(sourceCell);
      sheet[XLSX.utils.encode_cell({ r: targetRow + 1, c: targetColumn })] = writeValue(cell, row[header]);
    });
  });
  sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, output.length), c: Math.max(0, columns.length - 1) } });
  return sheet;
}

export function processWorkbook(buffer: ArrayBuffer, fileName: string, kind: ReportKind): ProcessedWorkbook {
  const { month, year } = periodFromFileName(fileName);
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellStyles: true, cellNF: true, sheetStubs: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('A planilha não possui uma aba de dados.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const headers = (matrix[0] ?? []).map(normalizedHeader);
  const required = [COLUMN.usage, COLUMN.purpose, COLUMN.releasedArea, COLUMN.residential, COLUMN.nonResidential];
  const missing = required.filter((header) => !headers.includes(header));
  if (kind === 'cvco' && !headers.includes(COLUMN.inspectionArea)) missing.push(COLUMN.inspectionArea);
  if (missing.length) throw new Error(`Não encontrei as colunas esperadas: ${missing.join(', ')}.`);

  const reviews: ReviewItem[] = [];
  const decisions: UnitDecision[] = [];
  const sourceRows = matrix.slice(1).map((values, index) => ({ values, sourceRow: index + 1 })).filter(({ values }) => values.some((value) => value !== ''));
  const keptRows: SourceRow[] = [];
  const rows = sourceRows.flatMap(({ values, sourceRow }) => {
    const source = Object.fromEntries(headers.map((header, column) => [header, decode(values[column])]));
    if (/demoli[cç][aã]o/i.test(String(source[COLUMN.purpose] ?? '')) || numberValue(source[COLUMN.releasedArea]) === 0) return [];
    applyUnitRule(source, sourceRow + 1, reviews, decisions);
    const releasedArea = numberValue(source[COLUMN.releasedArea]);
    const residential = numberValue(source[COLUMN.residential]);
    const nonResidential = numberValue(source[COLUMN.nonResidential]);
    const unitArea = releasedArea && residential + nonResidential ? releasedArea / (residential + nonResidential) : '';
    const output: Record<string, unknown> = { 'Mês': month, 'Ano': year };
    for (const header of headers) {
      if (kind === 'cvco' && (header === COLUMN.inspectionArea || header === 'Tipo Vistoria')) continue;
      output[header] = source[header];
      if (header === COLUMN.releasedArea) {
        if (kind === 'cvco') output[COLUMN.inspectionArea] = source[COLUMN.inspectionArea];
        output['Área Unidade'] = unitArea;
        output['ÁREA RESID'] = typeof unitArea === 'number' && residential ? unitArea * residential : '';
        output['ÁREA NÃO RESID'] = typeof unitArea === 'number' && nonResidential ? unitArea * nonResidential : '';
        if (kind === 'cvco') output['Tipo Vistoria'] = source['Tipo Vistoria'];
      }
    }
    keptRows.push({ values, sourceRow });
    return [output];
  });
  const columns = outputHeaders(headers, kind);
  workbook.Sheets[workbook.SheetNames[0]] = formattedSheet(sheet, headers, rows, keptRows, columns);
  return {
    kind,
    fileName,
    month,
    year,
    rowsRead: sourceRows.length,
    rowsRemoved: sourceRows.length - rows.length,
    rows,
    rowsKept: rows.length,
    reviews,
    decisions,
    workbook,
    layout: {
      sourceHeaders: headers,
      outputHeaders: columns,
      sourceRows: keptRows.map(({ sourceRow }) => sourceRow),
    },
  };
}

export function exportReport(report: ProcessedReport) {
  const workbook = XLSX.utils.book_new();
  const reviewRows = report.reviews.length ? report.reviews.map((item) => ({ Linha: item.rowNumber, 'Uso(s) Alvará': item.usage, 'Unidades residenciais': item.residential, 'Unidades não residenciais': item.nonResidential, Motivo: item.reason })) : [{ Status: 'Nenhuma revisão humana pendente.' }];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.rows), report.kind === 'alvaras' ? 'Alvarás tratados' : 'CVCO tratado');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reviewRows), 'Revisão humana');
  XLSX.writeFile(workbook, `${report.kind === 'alvaras' ? 'Alvaras' : 'CVCO'}_tratado_${report.month}_${report.year}.xlsx`);
}
