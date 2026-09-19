// @vitest-environment jsdom
import * as XLSX from 'xlsx';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { consolidateMonthlyBase, generateFinalReport, tabulateConsolidatedBase } from './monthly-workflow';

const HEADERS = ['MÊS', 'Bairro', 'Grupo Zoneamento', 'Quantidade Pavimentos', 'Quantidade de Unidades Residênciais', 'Quantidade Unidades Não Residênciais', 'Área Liberada', 'AREA UNIDADE', 'AREAS RESID', 'AREA NÃO RESID', 'Uso Alvará', 'Sub-Uso Alvará', 'Material', 'ANO'];

function workbookBuffer(rows: unknown[][], name = 'Dados') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

function baseBuffer() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ['JULHO', 'Centro', 'ZR2', 5, 2, '', 120, '', '', '', 'Habitação', 'Coletiva', 'Alvenaria', 2026]]);
  sheet.H2 = { t: 'n', v: 60, f: 'G2/(E2+F2)' };
  sheet.I2 = { t: 'n', v: 120, f: 'H2*E2' };
  sheet.J2 = { t: 'n', v: 0, f: 'H2*F2' };
  sheet['!ref'] = 'A1:N2';
  XLSX.utils.book_append_sheet(workbook, sheet, 'Base');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

function reportBuffer() {
  const workbook = XLSX.utils.book_new();
  const sheets: Array<[string, unknown[][]]> = [
    ['Folha 03 Resid-area', [['NÚMERO DE UNIDADES RESIDENCIAIS - JANEIRO A JULHO DE 2026'], [], ['SETORES'], [], [], ['Centro'], ['Água Verde', 99]]],
    ['Folha 04 Resid-Pav', [[], [], ['SETORES'], [], [], ['Centro']]],
    ['Folha 05 Resid-zona', [[], [], [], [], [], ['POR ZONA - 2026'], ['Mês'], ['Janeiro'], ['Fevereiro'], ['Março'], ['Abril'], ['Maio'], ['Junho'], ['Julho'], ['Agosto']]],
    ['Folha 06 Resid-area', [[], [], ['SETORES'], [], [], ['Centro']]],
    ['Folha 07 Resid-Pav', [[], [], ['SETORES'], [], [], ['Centro']]],
    ['Folha 08 Resid-zona', [[], [], [], [], [], ['Mês'], ['Janeiro'], ['Fevereiro'], ['Março'], ['Abril'], ['Maio'], ['Junho'], ['Julho'], ['Agosto']]],
    ['Folha 09 area por bairro', [[], [], ['SETORES'], [], [], ['Centro']]],
    ['Folha 10 serie hist', [[], [], [], [], [], [], [new Date(2026, 7, 1)]]],
  ];
  for (const [name, rows] of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  const raw = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const files = unzipSync(new Uint8Array(raw));
  files['xl/charts/chart-test.xml'] = strToU8('<chart/>');
  return zipSync(files).buffer as ArrayBuffer;
}

describe('processMonthlyWorkflow', () => {
  it('anexa o mês, estende fórmulas e mantém os objetos do relatório', () => {
    const currentHeaders = [...HEADERS];
    currentHeaders[10] = 'Uso(s) Alvará';
    currentHeaders[11] = 'Sub-Uso(s) Alvará';
    currentHeaders[12] = 'Material(is)';
    const current = workbookBuffer([currentHeaders, ['AGOSTO', 'Centro', 'ZR2', 9, 3, 1, 400, 100, 300, 100, 'Habitação', 'Coletiva', 'Alvenaria', 2026]]);
    const consolidation = consolidateMonthlyBase(baseBuffer(), current, 'RelatorioMensal_ALV_AGOSTO2026.xlsx', 'alvaras');
    const consolidated = XLSX.read(consolidation.bytes, { type: 'array', cellFormula: true });
    const base = consolidated.Sheets.Base;
    expect(base.H3.f).toBe('G3/(E3+F3)');
    expect(base.I3.f).toBe('H3*E3');
    expect(base.J3.f).toBe('H3*F3');
    expect(base.K3.v).toBe('Habitação');
    expect(base.L3.v).toBe('Coletiva');
    expect(base.M3.v).toBe('Alvenaria');
    const tabulation = tabulateConsolidatedBase(consolidation.bytes.buffer as ArrayBuffer, 'alvaras');
    const output = generateFinalReport(tabulation.bytes.buffer as ArrayBuffer, reportBuffer(), 'alvaras');
    expect(Object.keys(unzipSync(output.bytes))).toContain('xl/charts/chart-test.xml');
    const report = XLSX.read(output.bytes, { type: 'array', cellFormula: true });
    expect(report.Sheets['Folha 03 Resid-area'].A1.v).toContain('AGOSTO DE 2026');
    expect(report.Sheets['Folha 03 Resid-area'].D6.v).toBe(3);
    expect(report.Sheets['Folha 03 Resid-area'].B7).toBeUndefined();
    expect(report.Sheets['Folha 06 Resid-area'].D6.v).toBe(1);
    expect(consolidation.appendedRows).toBe(1);
    expect(consolidation.totalRows).toBe(2);
  });
});
