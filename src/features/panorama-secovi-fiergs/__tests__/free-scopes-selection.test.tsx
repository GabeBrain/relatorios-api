import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIERGS_RM_PORTO_ALEGRE_STUDY_CITIES } from '../presets';
import PanoramaSecoviFiergsPage from '../pages/PanoramaSecoviFiergsPage';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(async (scope) => ({ scope })), session: vi.fn(() => ({})) }));
vi.mock('../api', () => ({ fetchPanoramaReportModel: mocks.fetch, createPanoramaCollectionSession: mocks.session, PanoramaCollectionError: class extends Error {} }));
vi.mock('@/features/shared/geo-api-scope-engine', () => ({ useGeoApiScope: ({ value, onChange }) => {
  const citiesByUf = { RS: [...FIERGS_RM_PORTO_ALEGRE_STUDY_CITIES, 'Porto Alegre'], SP: ['Jundiaí'], PR: ['Curitiba'] };
  const availableCities = citiesByUf[value.uf] ?? [];
  return { hasToken: true, citiesByUf, availableCities, availableUfs: Object.keys(citiesByUf),
    strictReady: availableCities.includes(value.city), isLoading: false, error: null,
    setUf: (uf) => onChange({ uf, city: '' }), reload: vi.fn() };
} }));
vi.mock('../components/ReportPaginator', () => ({ ReportPaginator: ({ report }) => <div data-testid="report-scope">{report.scope.cities.join(', ')}/{report.scope.uf}</div> }));
vi.mock('../components/GenerationNoticesPanel', () => ({ GenerationNoticesPanel: () => null }));
vi.mock('../components/PanoramaLoadingState', () => ({ PanoramaLoadingState: () => null }));
vi.mock('../components/PanoramaCityMultiSelect', () => ({ PanoramaCityMultiSelect: ({ onChange, options, cities, disabled }) => <div>
  <span data-testid="selected-cities">{cities.join(', ')}</span>
  <button disabled={disabled} onClick={() => onChange(options.slice(0, 1))}>Uma cidade</button>
  <button disabled={disabled} onClick={() => onChange(options.slice(0, 2))}>Duas cidades</button>
  <button disabled={disabled} onClick={() => onChange([options[0], 'Cidade não autorizada'])}>Recorte inválido</button>
</div> }));
// Primitives simplificados só no teste de estado; componentes de produção permanecem Radix.
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }) => <select value={value} onChange={(event) => onValueChange(event.target.value)} disabled={disabled}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null, SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
}));
afterEach(() => { cleanup(); mocks.fetch.mockClear(); mocks.session.mockClear(); });

describe('seleção FIERGS e invalidação de resultado', () => {
  function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(<QueryClientProvider client={client}><PanoramaSecoviFiergsPage/></QueryClientProvider>);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'fiergs-rs' } });
  }
  it('aplica preset, permite cidade única e remove resultado ao trocar para conjunto', async () => {
    setup();
    expect(screen.getByTestId('selected-cities').textContent).toContain('Viamão');
    fireEvent.click(screen.getByText('Uma cidade'));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar relatório' }));
    await waitFor(() => expect(screen.getByTestId('report-scope').textContent).toBe('Alvorada/RS'));
    expect(mocks.fetch.mock.calls[0][0].cities).toEqual(['Alvorada']);
    const sessions = mocks.session.mock.calls.length;
    fireEvent.click(screen.getByText('Duas cidades'));
    expect(screen.queryByTestId('report-scope')).toBeNull();
    expect(mocks.session.mock.calls.length).toBeGreaterThan(sessions);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar relatório' }));
    await waitFor(() => expect(screen.getByTestId('report-scope').textContent).toBe('Alvorada, Cachoeirinha/RS'));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar preset FIERGS RS' }));
    expect(screen.queryByTestId('report-scope')).toBeNull();
    expect(screen.getByTestId('selected-cities').textContent).toContain('Viamão');
  });
  it('trocar UF limpa cidades e rejeita seleção parcialmente não autorizada', async () => {
    setup();
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'PR' } });
    expect(screen.getByTestId('selected-cities').textContent).toBe('');
    expect(screen.getByRole('button', { name: 'Gerar relatório' })).toBeDisabled();
    fireEvent.click(screen.getByText('Recorte inválido'));
    expect(screen.getByRole('button', { name: 'Gerar relatório' })).toBeDisabled();
    expect(mocks.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Uma cidade'));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar relatório' }));
    await waitFor(() => expect(screen.getByTestId('report-scope').textContent).toBe('Curitiba/PR'));
  });
});
