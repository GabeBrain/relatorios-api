import {
  METHODOLOGY_VERSION,
  QUERY_VERSION,
  SOURCE_LABEL,
  type EmployeeReport,
  type EmployeeReportRequest,
  type EmployeeOccupationRow,
  type EmployeeSectorRow,
} from './types';

export class EmployeeReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmployeeReportValidationError';
  }
}

export function validateEmployeeRequest(request: EmployeeReportRequest): void {
  if (!request?.municipality) throw new EmployeeReportValidationError('Escolha um município.');
  if (!/^[A-Z]{2}$/.test(request.municipality.uf)) {
    throw new EmployeeReportValidationError('UF inválida.');
  }
  if (!/^\d{7}$/.test(request.municipality.ibgeCode)) {
    throw new EmployeeReportValidationError('O código IBGE deve ter sete dígitos.');
  }
  if (!request.municipality.name.trim()) {
    throw new EmployeeReportValidationError('Nome do município ausente.');
  }
  if (!Number.isInteger(request.year) || request.year < 1985 || request.year > new Date().getFullYear()) {
    throw new EmployeeReportValidationError('Ano RAIS inválido.');
  }
}

function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function normalizeSectorRow(row: Partial<EmployeeSectorRow> & Record<string, unknown>): EmployeeSectorRow {
  return {
    code: String(row.code ?? row.codigo ?? '').trim() || 'não informado',
    name: String(row.name ?? row.nome ?? 'Não informado').trim() || 'Não informado',
    employees: Math.max(0, Math.round(finiteNumber(row.employees ?? row.empregados))),
    percentage: Math.max(0, finiteNumber(row.percentage ?? row.percentual)),
    averageSalary: nullableNumber(row.averageSalary ?? row.salario_medio),
    medianSalary: nullableNumber(row.medianSalary ?? row.salario_mediano),
  };
}

export function normalizeOccupationRow(row: Partial<EmployeeOccupationRow> & Record<string, unknown>): EmployeeOccupationRow {
  return {
    code: String(row.code ?? row.codigo ?? '').trim() || 'não informado',
    majorGroup: String(row.majorGroup ?? row.grande_grupo ?? 'Não informado').trim() || 'Não informado',
    family: String(row.family ?? row.familia ?? row.familia_ocupacional ?? 'Não informado').trim() || 'Não informado',
    occupation: String(row.occupation ?? row.descricao ?? 'Não informado').trim() || 'Não informado',
    employees: Math.max(0, Math.round(finiteNumber(row.employees ?? row.empregados))),
    percentage: Math.max(0, finiteNumber(row.percentage ?? row.percentual)),
    averageSalary: nullableNumber(row.averageSalary ?? row.salario_medio),
    medianSalary: nullableNumber(row.medianSalary ?? row.salario_mediano),
  };
}

export function normalizeEmployeeReport(payload: unknown): EmployeeReport {
  if (!payload || typeof payload !== 'object') throw new Error('Resposta do relatório inválida.');
  const raw = record(payload);
  const rawMeta = record(raw.meta);
  const municipality = record(rawMeta.municipality ?? raw.municipality);
  const request: EmployeeReportRequest = {
    municipality: {
      ibgeCode: String(municipality?.ibgeCode ?? municipality?.codigo_ibge ?? ''),
      name: String(municipality?.name ?? municipality?.municipio ?? ''),
      uf: String(municipality?.uf ?? '').toUpperCase(),
    },
    year: Number(rawMeta.year ?? raw.year),
  };
  validateEmployeeRequest(request);

  const sectors = (Array.isArray(raw.sectors) ? raw.sectors : []).map(normalizeSectorRow);
  const occupations = (Array.isArray(raw.occupations) ? raw.occupations : []).map(normalizeOccupationRow);
  const rawSummary = record(raw.summary);

  return {
    kind: 'employees',
    meta: {
      municipality: request.municipality,
      year: request.year,
      generatedAt: String(rawMeta.generatedAt ?? new Date().toISOString()),
      source: String(rawMeta.source ?? SOURCE_LABEL),
      referenceDate: String(rawMeta.referenceDate ?? `31/12/${request.year}`),
      queryVersion: String(rawMeta.queryVersion ?? QUERY_VERSION),
      methodologyVersion: String(rawMeta.methodologyVersion ?? METHODOLOGY_VERSION),
      cacheHit: Boolean(rawMeta.cacheHit),
      bytesProcessed: nullableNumber(rawMeta.bytesProcessed),
      queryDurationMs: nullableNumber(rawMeta.queryDurationMs),
    },
    summary: {
      totalEmployees: Math.max(0, Math.round(finiteNumber(rawSummary.totalEmployees ?? rawSummary.total_vinculos))),
      salaryMissingOrZero: Math.max(0, Math.round(finiteNumber(rawSummary.salaryMissingOrZero ?? rawSummary.salarios_zerados))),
      missingCbo: Math.max(0, Math.round(finiteNumber(rawSummary.missingCbo ?? rawSummary.cbo_ausente))),
      totalLinksInYear: nullableNumber(rawSummary.totalLinksInYear ?? rawSummary.vinculos_no_ano),
      averageSalary: nullableNumber(rawSummary.averageSalary ?? rawSummary.salario_medio),
      medianSalary: nullableNumber(rawSummary.medianSalary ?? rawSummary.salario_mediano),
    },
    sectors,
    occupations,
  };
}

export function methodologyText(report: EmployeeReport): string[] {
  return [
    `Município: ${report.meta.municipality.name}/${report.meta.municipality.uf} · IBGE ${report.meta.municipality.ibgeCode}`,
    `Ano-base: ${report.meta.year} · referência: vínculos ativos em 31/12/${report.meta.year}`,
    `Fonte: ${report.meta.source}`,
    'O relatório conta vínculos formais ativos, não pessoas únicas. Uma pessoa com mais de um vínculo pode aparecer mais de uma vez.',
    'Remunerações ausentes, nulas ou menores/iguais a zero permanecem na contagem de vínculos, mas são excluídas das médias e medianas salariais.',
    'Setores usam o subsetor IBGE da RAIS. Ocupações usam CBO 2002 e preservam categorias não mapeadas como “Não informado”.',
    `Versão da consulta: ${report.meta.queryVersion} · metodologia: ${report.meta.methodologyVersion}`,
    `Gerado em: ${new Date(report.meta.generatedAt).toLocaleString('pt-BR')}`,
  ];
}

export function formatInteger(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('pt-BR').format(value);
}

export function formatPercentage(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

export function formatCurrency(value: number | null | undefined): string {
  return value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value);
}

export function sortRows<T extends { employees: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.employees - a.employees);
}
