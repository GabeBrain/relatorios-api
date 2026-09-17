import { useCallback, useEffect, useState } from 'react';
import { EmployeesApiError, resolveRaisMunicipality } from './api';
import { CompaniesApiError, fetchCompaniesReport } from './companies-api';
import type { CompaniesReportResponse, MunicipalityOption } from './types';

export interface CompaniesReportState {
  isLoading: boolean;
  error: string | null;
  municipality: MunicipalityOption | null;
  report: CompaniesReportResponse | null;
  available: boolean;
  reload: () => void;
}

/**
 * Estado da aba Empresas para um escopo geográfico do GeoApiScopeEngine.
 * O código IBGE e os agregados vêm sempre do backend — o navegador nunca lê
 * tabelas ou views diretamente.
 */
export function useCompaniesReport(scope: { uf: string; city: string }, ready: boolean): CompaniesReportState {
  type InternalState = Omit<CompaniesReportState, 'reload'>;
  const [state, setState] = useState<InternalState>({ isLoading: false, error: null, municipality: null, report: null, available: false });
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    if (!ready || !scope.uf || !scope.city) {
      setState({ isLoading: false, error: null, municipality: null, report: null, available: false });
      return;
    }
    const controller = new AbortController();
    let active = true;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    (async () => {
      try {
        const municipality = await resolveRaisMunicipality({ name: scope.city, uf: scope.uf }, controller.signal);
        const report = await fetchCompaniesReport(municipality.ibgeCode, controller.signal);
        if (!active) return;
        setState({ isLoading: false, error: null, municipality, report, available: report.available });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        const message = error instanceof CompaniesApiError || error instanceof EmployeesApiError
          ? error.message
          : 'Não foi possível consultar Empresas para este município.';
        setState({ isLoading: false, error: message, municipality: null, report: null, available: false });
      }
    })();

    return () => { active = false; controller.abort(); };
  }, [ready, scope.uf, scope.city]);

  return state;
}
