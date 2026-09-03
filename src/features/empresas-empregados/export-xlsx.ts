import type * as XLSX from 'xlsx';
import { methodologyText } from './domain';
import type { EmployeeReport } from './types';

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function slug(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function reportFilename(report: EmployeeReport, date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const month = MONTHS_PT[date.getMonth()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `empregados_${slug(report.meta.municipality.name)}_${report.meta.municipality.uf.toLowerCase()}_${dd}_${month}_${date.getFullYear()}_${hh}h${mm}.xlsx`;
}

type XlsxModule = typeof import('xlsx');

function autosize(sheet: XLSX.WorkSheet, xlsx: XlsxModule): void {
  const range = xlsx.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
  sheet['!cols'] = Array.from({ length: range.e.c + 1 }, (_, column) => {
    let width = 12;
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      const cell = sheet[xlsx.utils.encode_cell({ r: row, c: column })];
      width = Math.max(width, String(cell?.v ?? '').length + 2);
    }
    return { wch: Math.min(width, 48) };
  });
}

export function buildEmployeeWorkbook(report: EmployeeReport, xlsx: XlsxModule): XLSX.WorkBook {
  const sectors = report.sectors.map((row) => ({
    Setor: row.name,
    Empregados: row.employees,
    Percentual: row.percentage,
    'Salário médio': row.averageSalary,
    'Salário mediano': row.medianSalary,
  }));
  const occupations = report.occupations.map((row) => ({
    'Grande grupo': row.majorGroup,
    'Família ocupacional': row.family,
    Ocupação: row.occupation,
    'Código CBO': row.code,
    Empregados: row.employees,
    Percentual: row.percentage,
    'Salário médio': row.averageSalary,
    'Salário mediano': row.medianSalary,
  }));
  const book = xlsx.utils.book_new();
  const sectorsSheet = xlsx.utils.json_to_sheet(sectors);
  const occupationsSheet = xlsx.utils.json_to_sheet(occupations);
  const methodologySheet = xlsx.utils.aoa_to_sheet([['Metodologia'], ...methodologyText(report).map((line) => [line])]);
  for (const sheet of [sectorsSheet, occupationsSheet, methodologySheet]) autosize(sheet, xlsx);
  sectorsSheet['!autofilter'] = { ref: sectorsSheet['!ref'] ?? 'A1:E1' };
  occupationsSheet['!autofilter'] = { ref: occupationsSheet['!ref'] ?? 'A1:H1' };
  sectorsSheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  occupationsSheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  xlsx.utils.book_append_sheet(book, sectorsSheet, 'Setores');
  xlsx.utils.book_append_sheet(book, occupationsSheet, 'Ocupações (CBO)');
  xlsx.utils.book_append_sheet(book, methodologySheet, 'Metodologia');
  return book;
}

export async function downloadEmployeeWorkbook(report: EmployeeReport): Promise<string> {
  const xlsx = await import('xlsx');
  const filename = reportFilename(report);
  const book = buildEmployeeWorkbook(report, xlsx);
  xlsx.writeFile(book, filename, { bookType: 'xlsx', compression: true });
  return filename;
}
