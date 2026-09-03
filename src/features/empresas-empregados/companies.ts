import type { EmployeeReportRequest, ReportKind } from './types';

export interface CompanyReportRequest extends EmployeeReportRequest {
  kind: 'companies';
}

export interface CompanyReportProvider {
  readonly kind: 'companies';
  generate(request: CompanyReportRequest): Promise<never>;
}

export class DisabledCompanyReportProvider implements CompanyReportProvider {
  readonly kind = 'companies' as const;

  async generate(_request: CompanyReportRequest): Promise<never> {
    throw new Error('FEATURE_DISABLED: o relatório de Empresas ainda está em preparação.');
  }
}

export function isReportKindEnabled(kind: ReportKind): boolean {
  return kind === 'employees';
}

export const disabledCompanyReportProvider = new DisabledCompanyReportProvider();
