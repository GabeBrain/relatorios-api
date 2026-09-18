// @vitest-environment jsdom
import * as XLSX from 'xlsx';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { periodFromFileName, processWorkbook } from './report-processor';
import { buildStylePreservingWorkbook } from './style-preserving-workbook';

const headers = ['Uso(s) Alvará', 'Finalidade', 'Área Liberada', 'Quantidade de Unidades Residênciais', 'Quantidade Unidades Não Residênciais', 'Área Vistoria', 'Tipo Vistoria'];

function workbookBuffer(rows: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet['!cols'] = headers.map((_, index) => ({ wch: 12 + index }));
  sheet['!rows'] = [{ hpt: 28 }, { hpt: 34 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

describe('processWorkbook', () => {
  it('identifica a competência no nome do arquivo', () => {
    expect(periodFromFileName('RelatorioMensal_ALV_SET_SET2026_17.09.xls')).toEqual({ month: 'Setembro', year: 2026 });
  });

  it('remove demolições e área liberada zerada, além de normalizar comércio', () => {
    const source = workbookBuffer([
      ['Comércio e Serviço Setorial', 'CONSTRUÇÃO', 100, 2, 1, 90, 'Total'],
      ['Habitação Unifamiliar', 'DEMOLIÇÃO', 100, 1, 0, 90, 'Total'],
      ['Habitação Unifamiliar', 'CONSTRUÇÃO', 0, 1, 0, 90, 'Total'],
    ]);
    const report = processWorkbook(source, 'RelatorioMensal_ALV_SET_SET2026_17.09.xls', 'alvaras');
    expect(report.rows).toHaveLength(1);
    expect(report.rowsRemoved).toBe(2);
    expect(report.rows[0]['Quantidade de Unidades Residênciais']).toBe('');
    expect(report.rows[0]['Quantidade Unidades Não Residênciais']).toBe(1);
    expect(report.rows[0]['Mês']).toBe('Setembro');
    expect(report.rows[0]['Ano']).toBe(2026);
    expect(report.decisions).toMatchObject([{ originalResidential: 2, originalNonResidential: 1, finalResidential: 0, finalNonResidential: 1 }]);
    const sheet = report.workbook.Sheets.Sheet1;
    expect(sheet['!cols']?.[1]?.wch).toBe(12);
    expect(sheet['!cols']?.at(-1)?.wch).toBe(12);
    expect(sheet['!rows']?.[1]?.hpt).toBe(34);

    const originalPackage = unzipSync(new Uint8Array(source));
    const output = buildStylePreservingWorkbook(source, report);
    const outputPackage = unzipSync(output);
    expect(strFromU8(outputPackage['xl/styles.xml'])).toBe(strFromU8(originalPackage['xl/styles.xml']));
    expect(strFromU8(outputPackage['xl/theme/theme1.xml'])).toBe(strFromU8(originalPackage['xl/theme/theme1.xml']));

    const preserved = XLSX.read(output, { type: 'array', cellStyles: true });
    const preservedSheet = preserved.Sheets.Sheet1;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(preservedSheet, { header: 1, defval: '' });
    expect(matrix).toHaveLength(2);
    expect(matrix[0][0]).toBe('Mês');
    expect(matrix[0].at(-1)).toBe('Ano');
    expect(matrix[1][0]).toBe('Setembro');
    expect(matrix[1].at(-1)).toBe(2026);
    expect(preservedSheet['!cols']).toHaveLength(headers.length + 5);
  });

  it('reposiciona área e tipo de vistoria no CVCO e sinaliza uso misto ambíguo', () => {
    const report = processWorkbook(workbookBuffer([
      ['Comércio; Habitação', 'CONSTRUÇÃO', 100, 5, 2, 90, 'Parcial'],
    ]), 'RelatorioMensal_CVCO_SET_SET2026_17.09.xls', 'cvco');
    expect(report.layout.outputHeaders).toEqual(['Mês', 'Uso(s) Alvará', 'Finalidade', 'Área Liberada', 'Área Vistoria', 'Área Unidade', 'ÁREA RESID', 'ÁREA NÃO RESID', 'Tipo Vistoria', 'Quantidade de Unidades Residênciais', 'Quantidade Unidades Não Residênciais', 'Ano']);
    expect(Object.keys(report.rows[0])).toEqual(['Mês', 'Ano', 'Uso(s) Alvará', 'Finalidade', 'Área Liberada', 'Área Vistoria', 'Área Unidade', 'ÁREA RESID', 'ÁREA NÃO RESID', 'Tipo Vistoria', 'Quantidade de Unidades Residênciais', 'Quantidade Unidades Não Residênciais']);
    expect(report.reviews).toHaveLength(1);
  });
});
