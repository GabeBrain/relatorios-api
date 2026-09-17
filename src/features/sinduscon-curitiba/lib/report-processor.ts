import * as XLSX from 'xlsx';
import type { ProcessedReport, ReportKind, ReviewItem } from '../types';

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

function applyUnitRule(row: Record<string, unknown>, rowNumber: number, reviews: ReviewItem[]) {
  const usage = String(row[COLUMN.usage] ?? '');
  const residential = numberValue(row[COLUMN.residential]);
  const nonResidential = numberValue(row[COLUMN.nonResidential]);
  const commercial = isCommercial(usage);
  const residentialUse = isResidential(usage);

  if (commercial && !residentialUse) {
    row[COLUMN.residential] = '';
    row[COLUMN.nonResidential] = residential + nonResidential || '';
  } else if (residentialUse && !commercial) {
    row[COLUMN.residential] = residential + nonResidential || '';
    row[COLUMN.nonResidential] = '';
  } else if (commercial && residentialUse && residential && nonResidential) {
    if (residential >= nonResidential * 3) {
      row[COLUMN.residential] = residential;
      row[COLUMN.nonResidential] = '';
    } else if (residential <= nonResidential * 2) {
      row[COLUMN.residential] = '';
      row[COLUMN.nonResidential] = nonResidential;
    } else {
      reviews.push({ id: `row-${rowNumber}`, rowNumber, usage, residential, nonResidential, reason: 'Uso misto comercial/residencial em faixa intermediária; revise a classificação.' });
    }
  }
  row[COLUMN.residential] = numberOrBlank(row[COLUMN.residential]);
  row[COLUMN.nonResidential] = numberOrBlank(row[COLUMN.nonResidential]);
}

export function processWorkbook(buffer: ArrayBuffer, fileName: string, kind: ReportKind): ProcessedReport {
  const { month, year } = periodFromFileName(fileName);
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('A planilha não possui uma aba de dados.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const headers = (matrix[0] ?? []).map(normalizedHeader);
  const required = [COLUMN.usage, COLUMN.purpose, COLUMN.releasedArea, COLUMN.residential, COLUMN.nonResidential];
  const missing = required.filter((header) => !headers.includes(header));
  if (kind === 'cvco' && !headers.includes(COLUMN.inspectionArea)) missing.push(COLUMN.inspectionArea);
  if (missing.length) throw new Error(`Não encontrei as colunas esperadas: ${missing.join(', ')}.`);

  const reviews: ReviewItem[] = [];
  const sourceRows = matrix.slice(1).filter((values) => values.some((value) => value !== ''));
  const rows = sourceRows.flatMap((values, index) => {
    const source = Object.fromEntries(headers.map((header, column) => [header, decode(values[column])]));
    if (/demoli[cç][aã]o/i.test(String(source[COLUMN.purpose] ?? '')) || numberValue(source[COLUMN.releasedArea]) === 0) return [];
    applyUnitRule(source, index + 2, reviews);
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
    return [output];
  });
  return { kind, fileName, month, year, rowsRead: sourceRows.length, rowsRemoved: sourceRows.length - rows.length, rows, reviews };
}

export function exportReport(report: ProcessedReport) {
  const workbook = XLSX.utils.book_new();
  const reviewRows = report.reviews.length ? report.reviews.map((item) => ({ Linha: item.rowNumber, 'Uso(s) Alvará': item.usage, 'Unidades residenciais': item.residential, 'Unidades não residenciais': item.nonResidential, Motivo: item.reason })) : [{ Status: 'Nenhuma revisão humana pendente.' }];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.rows), report.kind === 'alvaras' ? 'Alvarás tratados' : 'CVCO tratado');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reviewRows), 'Revisão humana');
  XLSX.writeFile(workbook, `${report.kind === 'alvaras' ? 'Alvaras' : 'CVCO'}_tratado_${report.month}_${report.year}.xlsx`);
}
