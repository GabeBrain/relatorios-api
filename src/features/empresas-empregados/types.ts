export type ReportKind = 'employees' | 'companies';

export interface MunicipalityOption {
  ibgeCode: string;
  name: string;
  uf: string;
}

export interface EmployeeReportRequest {
  municipality: MunicipalityOption;
  year: number;
}

export interface EmployeeReportSummary {
  totalEmployees: number;
  salaryMissingOrZero: number;
  missingCbo: number;
  totalLinksInYear: number | null;
  averageSalary: number | null;
  medianSalary: number | null;
}

export interface EmployeeSectorRow {
  code: string;
  name: string;
  employees: number;
  percentage: number;
  averageSalary: number | null;
  medianSalary: number | null;
}

export interface EmployeeOccupationRow {
  code: string;
  majorGroup: string;
  family: string;
  occupation: string;
  employees: number;
  percentage: number;
  averageSalary: number | null;
  medianSalary: number | null;
}

export interface EmployeeReportMeta {
  municipality: MunicipalityOption;
  year: number;
  generatedAt: string;
  source: string;
  referenceDate: string;
  queryVersion: string;
  methodologyVersion: string;
  cacheHit: boolean;
  bytesProcessed: number | null;
  queryDurationMs: number | null;
}

export interface EmployeeReport {
  kind: 'employees';
  meta: EmployeeReportMeta;
  summary: EmployeeReportSummary;
  sectors: EmployeeSectorRow[];
  occupations: EmployeeOccupationRow[];
}

export interface EmployeeHistoryPoint {
  year: number;
  activeEmployees: number;
}

export interface EmployeeHistoryMeta {
  municipality: MunicipalityOption;
  generatedAt: string;
  source: string;
  firstYear: number;
  lastYear: number;
  queryVersion: string;
  methodologyVersion: string;
  cacheHit: boolean;
  bytesProcessed: number | null;
  queryDurationMs: number | null;
}

export interface EmployeeHistoryReport {
  kind: 'employee-history';
  meta: EmployeeHistoryMeta;
  points: EmployeeHistoryPoint[];
}

export interface ReportCapabilities {
  employees: 'enabled';
  companies: 'disabled';
}

export const REPORT_CAPABILITIES: ReportCapabilities = {
  employees: 'enabled',
  companies: 'disabled',
};

export const QUERY_VERSION = 'rais-employees-v1';
export const METHODOLOGY_VERSION = 'rais-employees-methodology-v1';
export const HISTORY_QUERY_VERSION = 'rais-employees-history-v1';
export const HISTORY_METHODOLOGY_VERSION = 'rais-employees-history-methodology-v1';
export const SOURCE_LABEL = 'RAIS · Base dos Dados · BigQuery';
