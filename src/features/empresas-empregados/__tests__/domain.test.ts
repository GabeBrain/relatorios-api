import { describe, expect, it } from 'vitest';
import { DisabledCompanyReportProvider, isReportKindEnabled } from '../companies';
import { EmployeeReportValidationError, formatCurrency, formatInteger, formatPercentage, methodologyText, normalizeEmployeeReport, validateEmployeeRequest } from '../domain';
import { METHODOLOGY_VERSION, QUERY_VERSION, type EmployeeReport } from '../types';

const request = { municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' }, year: 2025 };

function sampleReport(): EmployeeReport {
  return normalizeEmployeeReport({
    meta: { municipality: request.municipality, year: request.year, generatedAt: '2026-09-03T12:00:00.000Z', queryVersion: QUERY_VERSION, methodologyVersion: METHODOLOGY_VERSION },
    summary: { totalEmployees: 81601, salaryMissingOrZero: 5287, missingCbo: 0, totalLinksInYear: 139441, averageSalary: 3200, medianSalary: 2800 },
    sectors: [{ code: '16', name: 'Comércio Varejista', employees: 100, percentage: 0.5, averageSalary: 2000, medianSalary: 1800 }],
    occupations: [{ code: '411005', majorGroup: 'Administrativo', family: 'Escriturários', occupation: 'Auxiliar', employees: 100, percentage: 0.5, averageSalary: 2000, medianSalary: 1800 }],
  });
}

describe('Empresas e Empregados — domínio V1', () => {
  it('valida um município por requisição e rejeita escopo inválido', () => {
    expect(() => validateEmployeeRequest(request)).not.toThrow();
    expect(() => validateEmployeeRequest({ ...request, municipality: { ...request.municipality, ibgeCode: '123' } })).toThrow(EmployeeReportValidationError);
    expect(() => validateEmployeeRequest({ ...request, year: 2101 })).toThrow('Ano RAIS inválido');
  });

  it('normaliza payloads snake_case e preserva nulos salariais', () => {
    const report = normalizeEmployeeReport({ municipality: request.municipality, year: 2025, summary: { total_vinculos: '81', salarios_zerados: '2', salario_medio: null }, sectors: [{ codigo: '1', empregados: '4', percentual: '0.5', salario_medio: null }], occupations: [{ codigo: null, empregados: '4', percentual: '0.5', descricao: '' }] });
    expect(report.summary.totalEmployees).toBe(81);
    expect(report.summary.salaryMissingOrZero).toBe(2);
    expect(report.sectors[0].averageSalary).toBeNull();
    expect(report.occupations[0].occupation).toBe('Não informado');
  });

  it('publica a metodologia humana com a distinção entre vínculos e pessoas', () => {
    const lines = methodologyText(sampleReport()).join('\n');
    expect(lines).toContain('vínculos formais ativos, não pessoas únicas');
    expect(lines).toContain('31/12/2025');
    expect(formatInteger(sampleReport().summary.totalEmployees)).toBe('81.601');
    expect(formatPercentage(0.125)).toBe('12,5%');
    expect(formatCurrency(1234.5)).toContain('1.234,50');
  });

  it('mantém Empresas desabilitado e sem provider ativo', async () => {
    expect(isReportKindEnabled('employees')).toBe(true);
    expect(isReportKindEnabled('companies')).toBe(false);
    await expect(new DisabledCompanyReportProvider().generate({ ...request, kind: 'companies' })).rejects.toThrow('FEATURE_DISABLED');
  });
});
