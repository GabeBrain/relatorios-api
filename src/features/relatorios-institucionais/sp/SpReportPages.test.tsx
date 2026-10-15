import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SpReportPages } from './SpReportPages';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';

describe('páginas SP', () => {
  it('mantém o período parcial e usa os indicadores conferidos nas páginas', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    render(<SpReportPages report={report} />);
    expect(screen.getByText('Parcial até agosto de 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2. Indicadores' }));
    expect(screen.getByText('24.351')).toBeInTheDocument();
    expect(screen.getByText('26.824')).toBeInTheDocument();
    expect(screen.getByText('124.706')).toBeInTheDocument();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3. Evolução mensal' }));
    expect(screen.getByText('julho de 2026')).toBeInTheDocument();
    expect(screen.queryByText('setembro de 2026')).not.toBeInTheDocument();
  });
  it('não monta páginas quando os dados estão bloqueados', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    render(<SpReportPages report={{ ...report, status: 'incomplete' }} />);
    expect(screen.queryByRole('region', { name: 'Páginas do relatório' })).not.toBeInTheDocument();
  });
});
