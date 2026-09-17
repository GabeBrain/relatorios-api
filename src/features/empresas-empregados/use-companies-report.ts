import { useCallback, useEffect, useRef, useState } from 'react';
import { EmployeesApiError, resolveRaisMunicipality } from './api';
import { CompaniesApiError, fetchCompaniesReport } from './companies-api';
import { requestCompaniesMaterialization } from './materialize-request-api';
import type { CompaniesReportResponse, MunicipalityOption } from './types';

export interface CompaniesReportState {
  isLoading: boolean;
  error: string | null;
  municipality: MunicipalityOption | null;
  report: CompaniesReportResponse | null;
  available: boolean;
  /** Materialização automática em andamento para o município selecionado. */
  materializing: boolean;
  /** Mensagem pública da materialização automática (sem detalhes internos). */
  materializeMessage: string | null;
  reload: () => void;
}

/** Municípios já solicitados nesta sessão — evita disparos repetidos e custo extra. */
const autoRequested = new Set<string>();

const POLL_INTERVAL_MS = 15000;
const POLL_ATTEMPTS = 20;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });

/**
 * Estado da aba Empresas para um escopo geográfico do GeoApiScopeEngine.
 * O código IBGE e os agregados vêm sempre do backend — o navegador nunca lê
 * tabelas ou views diretamente. Quando o município ainda não tem competência
 * publicada, a materialização é solicitada automaticamente (uma vez por
 * município por sessão) e o relatório é recarregado ao concluir.
 */
export function useCompaniesReport(scope: { uf: string; city: string }, ready: boolean): CompaniesReportState {
  type InternalState = Omit<CompaniesReportState, 'reload'>;
  const [state, setState] = useState<InternalState>({ isLoading: false, error: null, municipality: null, report: null, available: false, materializing: false, materializeMessage: null });
  const [reloadToken, setReloadToken] = useState(0);
  // Pedido explícito de atualização: ignora o cache e vai à fonte publicada de novo.
  const forceRef = useRef(false);
  const reload = useCallback(() => { forceRef.current = true; setReloadToken((value) => value + 1); }, []);

  useEffect(() => {
    if (!ready || !scope.uf || !scope.city) {
      setState({ isLoading: false, error: null, municipality: null, report: null, available: false, materializing: false, materializeMessage: null });
      return;
    }
    const controller = new AbortController();
    let active = true;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    (async () => {
      const force = forceRef.current;
      forceRef.current = false;
      try {
        const municipality = await resolveRaisMunicipality({ name: scope.city, uf: scope.uf }, controller.signal);
        let report = await fetchCompaniesReport(municipality.ibgeCode, controller.signal, { force });
        if (!active) return;
        setState({ isLoading: false, error: null, municipality, report, available: report.available, materializing: false, materializeMessage: null });

        if (report.available || autoRequested.has(municipality.ibgeCode)) return;
        autoRequested.add(municipality.ibgeCode);

        setState((prev) => ({ ...prev, materializing: true, materializeMessage: 'Preparando os dados deste município pela primeira vez. Isso pode levar alguns minutos.' }));
        const requested = await requestCompaniesMaterialization(municipality, controller.signal);
        if (!active) return;

        if (requested.status === 'error' || requested.status === 'rate_limited') {
          autoRequested.delete(municipality.ibgeCode);
          setState((prev) => ({ ...prev, materializing: false, materializeMessage: requested.message }));
          return;
        }

        for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
          report = await fetchCompaniesReport(municipality.ibgeCode, controller.signal);
          if (!active) return;
          if (report.available) {
            setState({ isLoading: false, error: null, municipality, report, available: true, materializing: false, materializeMessage: null });
            return;
          }
          await sleep(POLL_INTERVAL_MS, controller.signal);
          if (!active || controller.signal.aborted) return;
        }
        setState((prev) => ({ ...prev, materializing: false, materializeMessage: 'A preparação dos dados continua em andamento. Volte a este município em alguns minutos.' }));
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        const message = error instanceof CompaniesApiError || error instanceof EmployeesApiError
          ? error.message
          : 'Não foi possível consultar Empresas para este município.';
        setState({ isLoading: false, error: message, municipality: null, report: null, available: false, materializing: false, materializeMessage: null });
      }
    })();

    return () => { active = false; controller.abort(); };
  }, [ready, scope.uf, scope.city, reloadToken]);

  return { ...state, reload };
}
