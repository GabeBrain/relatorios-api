import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SpReportPages } from './SpReportPages';
import { SP_DETAIL_PAGES, SP_PATTERN_PAGES, SP_TABLE_PAGES } from './segments';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { syntheticTypologyInput } from './__tests__/typology';
import { buildSpTypologies } from './typologies';
import { buildSpLaunchHistory } from './history';
import { syntheticLaunchHistory } from './__tests__/history';
import { syntheticHistoryBatch } from './__tests__/history-batch';
import { buildSpHistoryBatch } from './history-batch';

describe('páginas SP', () => {
  it('monta as vinte páginas por padrão e quadros, sem reaproveitar histórico inválido', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    const historyBatch = buildSpHistoryBatch(syntheticHistoryBatch(), report);
    const typologies = buildSpTypologies(syntheticTypologyInput(), report);
    const view = render(<SpReportPages report={{ ...report, historyBatch, typologies }} />);
    expect(SP_PATTERN_PAGES.length + SP_TABLE_PAGES.length).toBe(20);
    for (const [index, detail] of SP_PATTERN_PAGES.entries()) {
      fireEvent.click(screen.getByRole('button', { name: `${index + 27}. ${detail.title}` }));
      expect(screen.getByText(`Padrão da API: ${detail.pattern}`)).toBeInTheDocument();
      expect(screen.getByText('julho / agosto · 2025 × 2026')).toBeInTheDocument();
    }
    for (const [index, table] of SP_TABLE_PAGES.entries()) {
      fireEvent.click(screen.getByRole('button', { name: `${index + 41}. ${table.title}` }));
      expect(screen.getByRole('img', { name: `Quadro reconciliado por ${table.dimension === 'patterns' ? 'padrão' : 'tipologia'}` })).toBeInTheDocument();
    }
    view.rerender(<SpReportPages report={report} />);
    expect(screen.getByText('Quadro por tipologia indisponível')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `27. ${SP_PATTERN_PAGES[0].title}` }));
    expect(screen.getByText('Comparativo de lançamentos indisponível')).toBeInTheDocument();
  });
  it('monta doze detalhes complementares e invalida todos com o lote', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    const historyBatch = buildSpHistoryBatch(syntheticHistoryBatch(), report);
    const view = render(<SpReportPages report={{ ...report, historyBatch }} />);
    expect(SP_DETAIL_PAGES).toHaveLength(12);
    for (const [index, detail] of SP_DETAIL_PAGES.entries()) {
      fireEvent.click(screen.getByRole('button', { name: `${index + 15}. ${detail.title}` }));
      expect(screen.getByText(`${detail.segment} · classificação SP de Lucas`)).toBeInTheDocument();
      expect(screen.getByText('julho / agosto · 2025 × 2026')).toBeInTheDocument();
      expect(screen.getByText(`2026: ${historyBatch.segmentDetails![detail.segment][detail.metric].totals!.current.toLocaleString('pt-BR')} unidades`)).toBeInTheDocument();
    }
    view.rerender(<SpReportPages report={{ ...report, historyBatch: undefined }} />);
    expect(screen.getByText('Comparativo de oferta indisponível')).toBeInTheDocument();
    expect(screen.queryByText('julho / agosto · 2025 × 2026')).not.toBeInTheDocument();
  });
  it('compara segmentos e remove o comparativo bloqueado', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    const historyBatch = buildSpHistoryBatch(syntheticHistoryBatch(), report);
    const view = render(<SpReportPages report={{ ...report, historyBatch }} />);
    for (const title of ['9. Lançamentos por segmento', '10. Vendas por segmento', '11. Oferta por segmento']) {
      fireEvent.click(screen.getByRole('button', { name: title }));
      expect(screen.getByRole('img', { name: 'Comparação por segmento nos mesmos meses dos dois anos' })).toBeInTheDocument();
      for (const group of ['Compactos', 'MCMV', 'Médio Padrão', 'Luxo']) expect(screen.getByText(group)).toBeInTheDocument();
    }
    expect(screen.getByText('2025 · 101.000 unidades')).toBeInTheDocument();
    view.rerender(<SpReportPages report={{ ...report, historyBatch: { status: 'blocked', issues: ['Divergência'], comparisons: {}, checks: [] } }} />);
    expect(screen.queryByRole('img', { name: 'Comparação por segmento nos mesmos meses dos dois anos' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Distribuição por segmento em unidades e participação percentual' })).toBeInTheDocument();
  });
  it('preenche o lote completo e mantém a oferta como fotografia, com bases negativas explícitas', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    const historyBatch = buildSpHistoryBatch(syntheticHistoryBatch(), report);
    const view = render(<SpReportPages report={{ ...report, historyBatch }} />);
    for (const [button, graph] of [['12. Comparativo de lançamentos', 'Lançamentos'], ['13. Comparativo de vendas', 'Vendas'], ['14. Comparativo de oferta', 'Oferta']]) {
      fireEvent.click(screen.getByRole('button', { name: button }));
      expect(screen.getByRole('img', { name: `${graph} nos mesmos meses do ano atual e anterior` })).toBeInTheDocument();
      expect(screen.getByText('julho / agosto · 2025 × 2026')).toBeInTheDocument();
    }
    expect(screen.getByText('2026: 124.706 unidades')).toBeInTheDocument();
    expect(screen.getByText('Oferta: fotografia do último mês, sem somar estoques.')).toBeInTheDocument();
    view.rerender(<SpReportPages report={{ ...report, historyBatch: buildSpHistoryBatch(syntheticHistoryBatch([-700, -1400]), report) }} />);
    fireEvent.click(screen.getByRole('button', { name: '13. Comparativo de vendas' }));
    expect(screen.getByText('Variação não calculável: base anterior negativa')).toBeInTheDocument();
    view.rerender(<SpReportPages report={{ ...report, historyBatch: { status: 'blocked', issues: ['Fonte divergente'], comparisons: {}, checks: [] } }} />);
    expect(screen.getByText('Fonte divergente')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Vendas nos mesmos meses do ano atual e anterior' })).not.toBeInTheDocument();
  });
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
