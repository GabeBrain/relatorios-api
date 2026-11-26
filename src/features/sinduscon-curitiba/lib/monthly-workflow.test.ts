// @vitest-environment jsdom
import * as XLSX from 'xlsx';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { consolidateMonthlyBase, generateFinalReport, tabulateConsolidatedBase } from './monthly-workflow';
import { numericColumnWidth, updateReportPresentation } from './report-presentation';

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
  for (const [name, rows] of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    if (name === 'Folha 03 Resid-area') {
      sheet.J6 = { t: 'n', v: 10987, f: 'IF(SUM(B6:I6),SUM(B6:I6),"")' };
      sheet.J8 = { t: 'n', v: 10987, f: 'SUM(J6:J7)' };
      sheet['!ref'] = 'A1:J8';
    }
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  const raw = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const files = unzipSync(new Uint8Array(raw));
  files['xl/charts/chart-test.xml'] = strToU8('<chart/>');
  return zipSync(files).buffer as ArrayBuffer;
}

describe('processMonthlyWorkflow', () => {
  // Real OOXML templates are CPU-heavy; allow the worker to flush progress between cases.
  afterEach(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  it.each(['alvaras', 'cvco'] as const)('atualiza títulos e gráficos até setembro e preserva formatos e objetos em %s', (kind) => {
    const source = workbookBuffer([HEADERS, ['SETEMBRO', 'Cidade Industrial', 'SE-1', 5, 2, 1, 600000, 200000, 400000, 200000, 'Habitação', 'Coletiva', 'Alvenaria', 2026]]);
    const tabulation = tabulateConsolidatedBase(source, kind);
    const template = readFileSync(`public/sinduscon-templates/report-${kind === 'alvaras' ? 'liberados' : 'concluidos'}.xlsx`);
    const before = unzipSync(Uint8Array.from(template));
    const output = generateFinalReport(tabulation.bytes.buffer as ArrayBuffer, Uint8Array.from(template).buffer as ArrayBuffer, kind);
    const after = unzipSync(output.bytes);
    const report = XLSX.read(output.bytes, { type: 'array', cellFormula: true });
    const floors = report.Sheets[report.SheetNames.find((name) => name.includes('Folha 07'))!];
    expect(floors.A72.v).toContain('2026');
    const chart = new DOMParser().parseFromString(strFromU8(after['xl/charts/chart14.xml']), 'application/xml');
    const refs = Array.from(chart.getElementsByTagNameNS('*', 'f')).map((node) => node.textContent);
    const labels = Array.from(chart.getElementsByTagNameNS('*', 'strLit')[0].getElementsByTagNameNS('*', 'v')).map((node) => node.textContent);
    expect(labels).toEqual(['set/25', 'out/25', 'nov/25', 'dez/25', 'jan/26', 'fev/26', 'mar/26', 'abr/26', 'mai/26', 'jun/26', 'jul/26', 'ago/26', 'set/26']);
    expect(chart.getElementsByTagNameNS('*', 'dateAx')).toHaveLength(0);
    expect(chart.getElementsByTagNameNS('*', 'catAx')).toHaveLength(1);
    const originalChart = new DOMParser().parseFromString(strFromU8(before['xl/charts/chart14.xml']), 'application/xml');
    expect(chart.getElementsByTagNameNS('*', 'tx')[0].textContent).toBe(originalChart.getElementsByTagNameNS('*', 'tx')[0].textContent);
    const history = report.Sheets[report.SheetNames.find((name) => /10.*serie hist/i.test(name))!];
    for (const row of [41, 42, 43, 44, 46, 47, 48, 49, 50, 51, 52, 53, 54]) {
      // Excel must not restore the template's drifting +30/+31 formulas on open.
      expect(history[`B${row}`].f).toBeUndefined();
      expect(XLSX.SSF.parse_date_code(history[`B${row}`].v).d).toBe(1);
    }
    expect(refs.some((ref) => ref?.includes('$G$41:$G$44') && ref.includes('$G$46:$G$54'))).toBe(true);
    const cache = Array.from(chart.getElementsByTagNameNS('*', 'numRef')).find((node) => node.textContent?.includes('$G$46:$G$54'))!;
    const last = Array.from(cache.getElementsByTagNameNS('*', 'pt')).at(-1)!;
    expect(Number(last.textContent)).toBe(600000);
    const sectorChart = new DOMParser().parseFromString(strFromU8(after['xl/charts/chart13.xml']), 'application/xml');
    expect(sectorChart.getElementsByTagNameNS('*', 'max')).toHaveLength(0);
    expect(Buffer.from(after['xl/styles.xml']).equals(Buffer.from(before['xl/styles.xml']))).toBe(true);
    for (const path of Object.keys(before).filter((path) => /^(xl\/media\/|xl\/drawings\/)/.test(path))) expect(Buffer.from(after[path]).equals(Buffer.from(before[path]))).toBe(true);
    for (let index = 2; index <= 9; index += 1) {
      const xml = new DOMParser().parseFromString(strFromU8(after[`xl/worksheets/sheet${index}.xml`]), 'application/xml');
      const setup = xml.getElementsByTagNameNS('*', 'pageSetup')[0];
      expect(setup.getAttribute('fitToWidth')).toBe('1');
      expect(setup.getAttribute('fitToHeight')).toBe('1');
      expect(setup.hasAttribute('scale')).toBe(false);
      expect(xml.getElementsByTagNameNS('*', 'pageSetUpPr')[0].getAttribute('fitToPage')).toBe('1');
      expect(xml.getElementsByTagNameNS('*', 'rowBreaks')).toHaveLength(0);
      expect(xml.getElementsByTagNameNS('*', 'colBreaks')).toHaveLength(0);
    }
    const definedNames = (bytes: Uint8Array) => Array.from(new DOMParser().parseFromString(strFromU8(bytes), 'application/xml').getElementsByTagNameNS('*', 'definedName')).filter((node) => node.getAttribute('name') === '_xlnm.Print_Area').map((node) => node.textContent);
    expect(definedNames(after['xl/workbook.xml'])).toEqual(definedNames(before['xl/workbook.xml']));
    const zones = new DOMParser().parseFromString(strFromU8(after['xl/worksheets/sheet4.xml']), 'application/xml');
    const se = Array.from(zones.getElementsByTagNameNS('*', 'col')).find((node) => node.getAttribute('min') === '9' && node.getAttribute('max') === '9');
    expect(Number(se?.getAttribute('width'))).toBeGreaterThan(7.5);
  });

  it('não inclui competências futuras nem os totais anuais no gráfico histórico', () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Mês', '', '', '', '', '', 'Área'],
      ['', 45901, '', '', '', '', 100],
      ['Total em 2025', '', '', '', '', '', 100],
      ['', 46266, '', '', '', '', 200],
      ['', 46296, '', '', '', '', 999],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Folha 10 serie hist');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const files = unzipSync(new Uint8Array(bytes));
    files['xl/charts/chart14.xml'] = strToU8('<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart><c:ser><c:cat><c:numRef><c:f>\'Folha 10 serie hist\'!$B$2:$B$5</c:f></c:numRef></c:cat><c:val><c:numRef><c:f>\'Folha 10 serie hist\'!$G$2:$G$5</c:f></c:numRef></c:val></c:ser></c:chart></c:chartSpace>');
    const output = unzipSync(updateReportPresentation(zipSync(files), 2026, 9));
    const chart = strFromU8(output['xl/charts/chart14.xml']);
    expect(chart).toContain('set/25');
    expect(chart).toContain('set/26');
    expect(chart).toContain('$G$2:$G$2');
    expect(chart).toContain('$G$4:$G$4');
    expect(chart).not.toContain('$B$5');
    expect(chart).not.toContain('999');
  });

  it('amplia proporcionalmente para separadores, totais maiores e fontes em negrito', () => {
    expect(numericColumnWidth('137,441', 10, true)).toBeGreaterThan(6.125);
    expect(numericColumnWidth('1,137,441', 10, true)).toBeGreaterThan(numericColumnWidth('137,441', 10, true));
    expect(numericColumnWidth('137,441', 10, true)).toBeGreaterThan(numericColumnWidth('137,441', 10));
  });

  it.each([[2027, 'Janeiro', 1], [2026, 'Outubro', 10], [2028, 'Dezembro', 12]] as const)('acompanha competência %s/%s sem fixar o ano do modelo', (year, month, monthNumber) => {
    const source = workbookBuffer([HEADERS,
      [month, 'Centro', 'ZR2', 5, 1, 0, 100, 100, 100, 0, 'Habitação', 'Coletiva', 'Alvenaria', year - 1],
      [month, 'Centro', 'ZR2', 5, 2, 0, 200, 100, 200, 0, 'Habitação', 'Coletiva', 'Alvenaria', year],
    ]);
    const tabulation = tabulateConsolidatedBase(source, 'alvaras');
    const template = Uint8Array.from(readFileSync('public/sinduscon-templates/report-liberados.xlsx'));
    const output = generateFinalReport(tabulation.bytes.buffer as ArrayBuffer, template.buffer, 'alvaras');
    const workbook = XLSX.read(output.bytes, { type: 'array', cellFormula: true });
    expect(workbook.Sheets['Folha 07 Resid-Pav'].A72.v).toContain(String(year));
    const history = workbook.Sheets['Folha 10 serie hist'];
    expect(history.B45.v).toBe(`Total em ${year - 1}`);
    expect(history.B58.v).toBe(`Total em ${year}`);
    const chart = new DOMParser().parseFromString(strFromU8(unzipSync(output.bytes)['xl/charts/chart14.xml']), 'application/xml');
    const cat = chart.getElementsByTagNameNS('*', 'strLit')[0];
    const labels = Array.from(cat.getElementsByTagNameNS('*', 'v')).map((node) => node.textContent);
    const monthLabels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    expect(labels).toHaveLength(13);
    expect(labels[0]).toBe(`${monthLabels[monthNumber - 1]}/${String(year - 1).slice(-2)}`);
    expect(labels.at(-1)).toBe(`${monthLabels[monthNumber - 1]}/${String(year).slice(-2)}`);
    for (const reference of Object.keys(history).filter((key) => /^B\d+$/.test(key) && typeof history[key].v === 'number')) {
      expect(history[reference].f).toBeUndefined();
      expect(XLSX.SSF.parse_date_code(history[reference].v).d).toBe(1);
    }
  });

  it.each(['alvaras', 'cvco'] as const)('preenche meses e distingue unidades de áreas no modelo %s', (kind) => {
    const source = workbookBuffer([HEADERS, ['JULHO', 'Centro', 'ZR2', 5, 2, 1, 300, 100, 200, 100, 'Habitação', 'Coletiva', 'Alvenaria', 2026]]);
    const tabulation = tabulateConsolidatedBase(source, kind);
    const template = readFileSync(`public/sinduscon-templates/report-${kind === 'alvaras' ? 'liberados' : 'concluidos'}.xlsx`);
    const files = unzipSync(Uint8Array.from(template));
    const path = 'xl/worksheets/sheet7.xml';
    // Exercise July's missing formula as reported, rather than relying on the clean template.
    const xml = new DOMParser().parseFromString(strFromU8(files[path]), 'application/xml');
    const julyTotal = Array.from(xml.getElementsByTagNameNS('*', 'c')).find((cell) => cell.getAttribute('r') === 'O31');
    for (const child of Array.from(julyTotal?.childNodes ?? [])) julyTotal?.removeChild(child);
    files[path] = strToU8(new XMLSerializer().serializeToString(xml));
    const output = generateFinalReport(tabulation.bytes.buffer as ArrayBuffer, zipSync(files).buffer as ArrayBuffer, kind);
    const report = XLSX.read(output.bytes, { type: 'array', cellFormula: true });
    const sheet = (num: string) => report.Sheets[report.SheetNames.find((name) => name.includes(`Folha ${num}`))!];
    expect(sheet('04').C80.v).toBe(2);
    expect(sheet('07').C80.v).toBe(1);
    expect(sheet('05').D15.v).toBe(2);
    expect(sheet('05').D32.v).toBe(200);
    expect(sheet('08').D14.v).toBe(1);
    expect(sheet('08').D31.v).toBe(100);
    expect(sheet('08').O31.f).toContain('SUM(C31:N31)');
    expect(sheet('08').O31.v).toBe(100);
  });
  it('limita as tabelas acumuladas ao ano da competência mais recente', () => {
    const source = workbookBuffer([
      HEADERS,
      ['JULHO', 'Centro', 'ZR2', 5, 1000, '', 100000, 100, 100000, '', 'Habitação', 'Coletiva', 'Alvenaria', 2025],
      ['JULHO', 'Centro', 'ZR2', 5, 2, '', 200, 100, 200, '', 'Habitação', 'Coletiva', 'Alvenaria', 2026],
      ['JULHO', 'Centro', 'ZR2', 1, 2, '', 0, 0, 0, '', 'Habitação', 'Coletiva', 'Alvenaria', 2026],
    ]);
    const tabulation = tabulateConsolidatedBase(source, 'alvaras');
    const workbook = XLSX.read(tabulation.bytes, { type: 'array' });
    const areaRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Residencial por área'], { header: 1, defval: '', raw: true });
    const historyRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Série histórica'], { header: 1, defval: '', raw: true });
    expect(areaRows.find((row) => row[0] === 'Centro')?.at(-1)).toBe(4);
    expect(historyRows.slice(1).map((row) => row[0])).toEqual(['2025-7', '2026-7']);
  });

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
    expect(report.Sheets['Folha 03 Resid-area'].J6.f).toBe('IF(SUM(B6:I6),SUM(B6:I6),"")');
    expect(report.Sheets['Folha 03 Resid-area'].J6.v).toBe(5);
    expect(report.Sheets['Folha 03 Resid-area'].J8.f).toBe('SUM(J6:J7)');
    expect(report.Sheets['Folha 03 Resid-area'].J8.v).toBe(5);
    expect(report.Sheets['Folha 06 Resid-area'].D6.v).toBe(1);
    expect(consolidation.appendedRows).toBe(1);
    expect(consolidation.totalRows).toBe(2);
  });

  it('atualiza o total em cache da primeira tabela do template real', () => {
    const tabulation = tabulateConsolidatedBase(baseBuffer(), 'alvaras');
    const template = readFileSync('public/sinduscon-templates/report-liberados.xlsx');
    const output = generateFinalReport(tabulation.bytes.buffer as ArrayBuffer, Uint8Array.from(template).buffer as ArrayBuffer, 'alvaras');
    const report = XLSX.read(output.bytes, { type: 'array', cellFormula: true });
    const total = report.Sheets['Folha 03 Resid-area'].U70;
    expect(total.f).toContain('SUM(');
    expect(total.v).toBe(2);
  });
});
