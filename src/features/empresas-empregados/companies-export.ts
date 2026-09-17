import type * as XLSX from 'xlsx';
import { PORTE_COLUMNS, buildCompaniesBreakdown, buildSectorSizeMatrix, formatCompetencia } from './companies-domain';
import type { CompaniesAggregatedRow, CompaniesReportMeta, MunicipalityOption } from './types';

type XlsxModule = typeof import('xlsx');

export interface CompaniesExportInput {
  municipality: MunicipalityOption;
  meta: CompaniesReportMeta;
  rows: CompaniesAggregatedRow[];
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function companiesFilename({ municipality, meta }: CompaniesExportInput, extension: string): string {
  return `empresas_${slug(municipality.name)}_${municipality.uf.toLowerCase()}_${meta.competencia}.${extension}`;
}

const num = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const pct = (value: number) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** Matriz macro setor × porte em linhas planas (rótulos + valores numéricos). */
export function sectorSizeTableRows(rows: CompaniesAggregatedRow[]): (string | number)[][] {
  const matrix = buildSectorSizeMatrix(rows);
  const header = ['Setor'];
  for (const column of PORTE_COLUMNS) header.push(column.label, `${column.label} (%)`);
  header.push('Total', 'Total (%)');

  const body = matrix.rows.map((row) => {
    const line: (string | number)[] = [row.sector];
    for (const column of PORTE_COLUMNS) {
      line.push(row.cells[column.code].quantidade, Number(row.cells[column.code].percentage.toFixed(1)));
    }
    line.push(row.total, Number(row.totalPercentage.toFixed(1)));
    return line;
  });

  const totalLine: (string | number)[] = ['Total'];
  for (const column of PORTE_COLUMNS) {
    const quantidade = matrix.totals[column.code] ?? 0;
    totalLine.push(quantidade, Number((matrix.grandTotal > 0 ? (quantidade / matrix.grandTotal) * 100 : 0).toFixed(1)));
  }
  totalLine.push(matrix.grandTotal, 100);

  return [header, ...body, totalLine];
}

function breakdownSheetRows(items: { label: string; quantidade: number; percentage: number }[]): (string | number)[][] {
  return [
    ['Categoria', 'Estabelecimentos', 'Participação (%)'],
    ...items.map((item) => [item.label, item.quantidade, Number(item.percentage.toFixed(1))]),
  ];
}

export function buildCompaniesWorkbook(input: CompaniesExportInput, xlsx: XlsxModule): XLSX.WorkBook {
  const breakdown = buildCompaniesBreakdown(input.rows);
  const book = xlsx.utils.book_new();

  const sheets: [string, (string | number)[][]][] = [
    ['Macro setor x porte', sectorSizeTableRows(input.rows)],
    ['Seção CNAE', breakdownSheetRows(breakdown.cnaeSections)],
    ['Porte', breakdownSheetRows(breakdown.porte)],
    ['Matriz e filial', breakdownSheetRows(breakdown.matrizFilial)],
    ['Regime Simples-MEI', breakdownSheetRows(breakdown.regimeSimples)],
    [
      'Metodologia',
      [
        ['Município', `${input.municipality.name}/${input.municipality.uf}`],
        ['Competência', formatCompetencia(input.meta.competencia)],
        ['Fonte', input.meta.source],
        ['Versão da metodologia', input.meta.methodologyVersion],
        ['Percentuais', 'Cada célula é % sobre o total do próprio setor; a coluna Total é % do município.'],
      ],
    ],
  ];

  for (const [name, aoa] of sheets) {
    const sheet = xlsx.utils.aoa_to_sheet(aoa);
    sheet['!cols'] = (aoa[0] ?? []).map((_, column) => ({
      wch: Math.min(44, Math.max(12, ...aoa.map((line) => String(line[column] ?? '').length + 2))),
    }));
    xlsx.utils.book_append_sheet(book, sheet, name.slice(0, 31));
  }

  return book;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function downloadCompaniesWorkbook(input: CompaniesExportInput): Promise<string> {
  const xlsx = await import('xlsx');
  const filename = companiesFilename(input, 'xlsx');
  xlsx.writeFile(buildCompaniesWorkbook(input, xlsx), filename, { bookType: 'xlsx', compression: true });
  return filename;
}

export function buildCompaniesCsv(input: CompaniesExportInput): string {
  const escape = (value: string | number) => {
    const text = typeof value === 'number' ? String(value).replace('.', ',') : value;
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return sectorSizeTableRows(input.rows)
    .map((line) => line.map(escape).join(';'))
    .join('\r\n');
}

export function downloadCompaniesCsv(input: CompaniesExportInput): string {
  const filename = companiesFilename(input, 'csv');
  triggerDownload(new Blob([`\uFEFF${buildCompaniesCsv(input)}`], { type: 'text/csv;charset=utf-8' }), filename);
  return filename;
}

const COL_LABEL = 260;
const COL_VALUE = 92;
const ROW_HEIGHT = 30;
const HEADER_HEIGHT = 78;

export function buildCompaniesSvg(input: CompaniesExportInput): string {
  const table = sectorSizeTableRows(input.rows);
  const [header, ...body] = table;
  const columns = header.length;
  const width = COL_LABEL + (columns - 1) * COL_VALUE + 48;
  const height = HEADER_HEIGHT + (body.length + 1) * ROW_HEIGHT + 32;
  const x = (index: number) => 24 + (index === 0 ? 0 : COL_LABEL + (index - 1) * COL_VALUE);
  const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cellText = (value: string | number, index: number) =>
    index === 0 ? esc(String(value)) : typeof value === 'number' ? (index % 2 === 0 ? pct(value) : num(value)) : esc(String(value));

  const lines: string[] = [];
  lines.push(
    `<text x="24" y="30" font-family="Archivo, Arial, sans-serif" font-size="16" font-weight="600" fill="#1f2a14">Macro setor × porte — ${esc(input.municipality.name)}/${esc(input.municipality.uf)}</text>`,
    `<text x="24" y="50" font-family="Archivo, Arial, sans-serif" font-size="11" fill="#6b7280">Competência ${esc(formatCompetencia(input.meta.competencia))} · ${esc(input.meta.source)}</text>`,
  );

  header.forEach((value, index) => {
    lines.push(
      `<text x="${x(index) + (index === 0 ? 0 : COL_VALUE - 8)}" y="${HEADER_HEIGHT - 8}" text-anchor="${index === 0 ? 'start' : 'end'}" font-family="Archivo, Arial, sans-serif" font-size="11" font-weight="600" fill="#3f4a2c">${esc(String(value))}</text>`,
    );
  });
  lines.push(`<line x1="24" y1="${HEADER_HEIGHT}" x2="${width - 24}" y2="${HEADER_HEIGHT}" stroke="#5B7537" stroke-width="1.5" />`);

  body.forEach((row, rowIndex) => {
    const y = HEADER_HEIGHT + (rowIndex + 1) * ROW_HEIGHT - 9;
    const isTotal = row[0] === 'Total';
    if (isTotal) {
      lines.push(
        `<rect x="24" y="${y - 19}" width="${width - 48}" height="${ROW_HEIGHT}" fill="#F8D000" fill-opacity="0.18" />`,
      );
    }
    row.forEach((value, index) => {
      lines.push(
        `<text x="${x(index) + (index === 0 ? 0 : COL_VALUE - 8)}" y="${y}" text-anchor="${index === 0 ? 'start' : 'end'}" font-family="Archivo, Arial, sans-serif" font-size="11" font-weight="${isTotal || index === 0 ? 600 : 400}" fill="${index > 0 && index % 2 === 0 ? '#6b7280' : '#1f2a14'}">${cellText(value, index)}</text>`,
      );
    });
    lines.push(`<line x1="24" y1="${y + 10}" x2="${width - 24}" y2="${y + 10}" stroke="#e5e7eb" stroke-width="1" />`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#ffffff" />${lines.join('')}</svg>`;
}

export function downloadCompaniesSvg(input: CompaniesExportInput): string {
  const filename = companiesFilename(input, 'svg');
  triggerDownload(new Blob([buildCompaniesSvg(input)], { type: 'image/svg+xml;charset=utf-8' }), filename);
  return filename;
}
