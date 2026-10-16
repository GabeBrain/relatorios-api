import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SpReportPages } from './SpReportPages';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { syntheticTypologyInput } from './__tests__/typology';
import { buildSpTypologies } from './typologies';
import { buildSpLaunchHistory } from './history';
import { syntheticLaunchHistory } from './__tests__/history';

describe('páginas SP', () => {
  it('mostra meses equivalentes e remove o comparativo quando a validação bloqueia', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    const view = render(<SpReportPages report={report} />);
    fireEvent.click(screen.getByRole('button', { name: '12. Comparativo de lançamentos' }));
    expect(screen.getByText('Comparativo de lançamentos indisponível')).toBeInTheDocument();
    const launchHistory = buildSpLaunchHistory(syntheticLaunchHistory(), report);
    view.rerender(<SpReportPages report={{ ...report, launchHistory }} />);
    expect(screen.getByText('julho / agosto · 2025 × 2026')).toBeInTheDocument();
    expect(screen.getByText('Variação: +21,8%')).toBeInTheDocument();
    const zero = syntheticLaunchHistory(); zero.previous.forEach(row => { row.releases_in_period = 0; });
    view.rerender(<SpReportPages report={{ ...report, launchHistory: buildSpLaunchHistory(zero, report) }} />);
    expect(screen.getByText('Variação não calculável: base anterior zero')).toBeInTheDocument();
    view.rerender(<SpReportPages report={{ ...report, launchHistory: { status: 'blocked', issues: ['Fonte divergente'], totals: null, rows: [], checks: [] } }} />);
    expect(screen.getByText('Fonte divergente')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Lançamentos nos mesmos meses do ano atual e anterior' })).not.toBeInTheDocument();
  });
  it('preenche os três segmentos com a regra confirmada e bloqueia padrões inválidos', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    const view = render(<SpReportPages report={{ ...report, typologies: buildSpTypologies(syntheticTypologyInput(), report) }} />);
    for (const title of ['9. Lançamentos por segmento', '10. Vendas por segmento', '11. Oferta por segmento']) {
      fireEvent.click(screen.getByRole('button', { name: title }));
      expect(screen.getByRole('img', { name: 'Distribuição por segmento em unidades e participação percentual' })).toBeInTheDocument();
      for (const group of ['Compactos', 'MCMV', 'Médio Padrão', 'Luxo']) expect(screen.getByText(group)).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: 'Distribuição por tipologia em unidades e participação percentual' })).not.toBeInTheDocument();
    }
    view.rerender(<SpReportPages report={{ ...report, patterns: undefined }} />);
    expect(screen.getByText('Dados por segmento indisponíveis')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Distribuição por segmento em unidades e participação percentual' })).not.toBeInTheDocument();
    expect(screen.queryByText('124.706')).not.toBeInTheDocument();
  });
  it('preenche os três slides de tipologia só depois de reconciliar as fontes', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    const view = render(<SpReportPages report={report} />);
    fireEvent.click(screen.getByRole('button', { name: '6. Lançamentos por tipologia' }));
    expect(screen.getByText('Dados por tipologia indisponíveis')).toBeInTheDocument();
    const typologies = buildSpTypologies(syntheticTypologyInput(), report);
    view.rerender(<SpReportPages report={{ ...report, typologies }} />);
    for (const title of ['6. Lançamentos por tipologia', '7. Vendas por tipologia', '8. Oferta por tipologia']) {
      fireEvent.click(screen.getByRole('button', { name: title }));
      expect(screen.getByRole('img', { name: 'Distribuição por tipologia em unidades e participação percentual' })).toBeInTheDocument();
      expect(screen.queryByText('Dados por tipologia indisponíveis')).not.toBeInTheDocument();
    }
    view.rerender(<SpReportPages report={{ ...report, typologies: { status: 'blocked', issues: ['test'], rows: [], checks: [] } }} />);
    expect(screen.getByText('Dados por tipologia indisponíveis')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Distribuição por tipologia em unidades e participação percentual' })).not.toBeInTheDocument();
  });
  it('mantém o período parcial e usa os indicadores conferidos nas páginas', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    render(<SpReportPages report={report} />);
    expect(screen.getByText(/Modelo original do PowerPoint/)).toHaveTextContent('Parcial até agosto de 2026');
    expect(screen.getByRole('img', { name: 'Capa original Brain Inteligência Estratégica' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2. Empreendimentos' }));
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3. Unidades lançadas' }));
    expect(screen.getByText('24.351')).toBeInTheDocument();
    expect(screen.getByText('julho de 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '4. Vendas líquidas' }));
    expect(screen.getByText('26.824')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '5. Oferta final' }));
    expect(screen.getAllByText('124.706')).toHaveLength(2);
    expect(screen.getByText('julho de 2026')).toBeInTheDocument();
    expect(screen.queryByText('setembro de 2026')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar slides' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5. Oferta final' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('não monta páginas quando os dados estão bloqueados', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    render(<SpReportPages report={{ ...report, status: 'incomplete' }} />);
    expect(screen.queryByRole('region', { name: 'Páginas do relatório' })).not.toBeInTheDocument();
  });
});
