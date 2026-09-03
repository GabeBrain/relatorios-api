import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

const featureDir = resolve(process.cwd(), 'docs/features/empresas-empregados');

describe('fixtures de homologação RAIS', () => {
  it('confirma os marcos do CSV de Blumenau', () => {
    const file = resolve(featureDir, 'Blumenau-RAIS-2025 - ocupacoes.csv');
    expect(existsSync(file)).toBe(true);
    const lines = readFileSync(file, 'utf8').trim().split(/\r?\n/);
    const rows = lines.slice(1).map((line) => line.split(';'));
    const employeesColumn = lines[0].split(';').findIndex((value) => value.replaceAll('"', '').trim() === 'empregados');
    const total = rows.reduce((sum, row) => sum + Number(row[employeesColumn]?.replaceAll('"', '').replace(',', '.') ?? 0), 0);
    expect(rows).toHaveLength(1390);
    expect(total).toBe(154664);
  });

  it('confirma abas e marcos do XLSX de Rio Verde', () => {
    const file = resolve(featureDir, 'Rio Verde-RAIS-2025.xlsx');
    expect(existsSync(file)).toBe(true);
    const book = XLSX.readFile(file);
    expect(book.SheetNames).toEqual(['Setores', 'Ocupações (CBO)', 'Metodologia']);
    const occupations = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets['Ocupações (CBO)'], { range: 3 });
    const total = occupations.reduce((sum, row) => sum + Number(row.Empregados ?? 0), 0);
    expect(occupations).toHaveLength(1115);
    expect(total).toBe(81601);
  });
});
