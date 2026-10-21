import { expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildCompaniesSvg, buildCompaniesWorkbook, companiesFilename } from '../companies-export';
import type { CompaniesExportInput } from '../companies-export';

const input: CompaniesExportInput = {
  municipality: { ibgeCode: '3550308', name: 'São Paulo', uf: 'SP' },
  meta: { competencia: '2026-04-01', targetCompetencia: '2026-07-01', source: 'Base dos Dados · CNPJ · BigQuery', queryVersion: 'empresas-pilot-v1', methodologyVersion: 'empresas-pilot-methodology-v1', simplesReadAt: null },
  rows: [{ id_municipio: '3550308', cnae_secao: 'G', porte: '01', matriz_filial: 1, regime_simples: 'nenhum', quantidade: 10 }],
};

it('exporta a competência efetiva e explica o recuo no Excel e na imagem', () => {
  expect(companiesFilename(input, 'csv')).toBe('empresas_sao_paulo_sp_2026-04-01.csv');
  const book = buildCompaniesWorkbook(input, XLSX);
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(book.Sheets.Metodologia, { header: 1 });
  expect(rows).toContainEqual(['Competência', 'abril/2026']);
  expect(rows).toContainEqual(['Competência solicitada', 'julho/2026']);
  expect(buildCompaniesSvg(input)).toContain('Períodos mais recentes indisponíveis');
});
