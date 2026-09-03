import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildEmployeeWorkbook, reportFilename } from '../export-xlsx';
import { normalizeEmployeeReport } from '../domain';

const report = normalizeEmployeeReport({
  meta: { municipality: { ibgeCode: '4202404', name: 'Blumenau', uf: 'SC' }, year: 2025, generatedAt: '2026-09-03T12:00:00.000Z' },
  summary: { totalEmployees: 154664, salaryMissingOrZero: 0, missingCbo: 0 },
  sectors: [{ code: '25', name: 'Agropecuária', employees: 10, percentage: 0.1, averageSalary: 100, medianSalary: 90 }],
  occupations: [{ code: '123456', majorGroup: 'Grupo', family: 'Família', occupation: 'Ocupação', employees: 10, percentage: 0.1, averageSalary: 100, medianSalary: 90 }],
});
describe('exportação local RAIS', () => {
  it('produz as três abas do contrato e tipos numéricos', () => {
    const workbook = buildEmployeeWorkbook(report, XLSX);
    expect(workbook.SheetNames).toEqual(['Setores', 'Ocupações (CBO)', 'Metodologia']);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Setores)[0]).toMatchObject({ Setor: 'Agropecuária', Empregados: 10 });
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Ocupações (CBO)'])[0]).toMatchObject({ 'Código CBO': '123456', Empregados: 10 });
  });

  it('gera nome sem acentos com data e hora', () => {
    expect(reportFilename(report, new Date(2026, 0, 1, 14, 32))).toBe('empregados_blumenau_sc_01_jan_2026_14h32.xlsx');
  });
});
