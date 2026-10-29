import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { SpReportPages } from './SpReportPages';
import { SP_ORIGINAL_SLIDES } from './original-slides';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { syntheticLaunchSeries } from './__tests__/launch-series';
import { syntheticTypologyInput } from './__tests__/typology';
import { syntheticHistoryBatch } from './__tests__/history-batch';
import { buildSpTypologies } from './typologies';
import { buildSpHistoryBatch } from './history-batch';
import { buildSpProjects } from './projects';
import { buildSpLaunchSeries } from './launch-series';

afterEach(cleanup);
const current = () => buildSpTemporalPreview(recordedInput(), '3T2026');
const open = (number: number) => fireEvent.click(screen.getByRole('button', { name: `${number}. ${SP_ORIGINAL_SLIDES[number - 1].title}` }));
function reportWithTrends() {
  const report = current();
  const buildings = [2021, 2022, 2023, 2024, 2025, 2026].flatMap(year => ['Compacto', 'Econômico', 'Standard', 'Luxo'].map((standard, index) => ({ building_id: `${year}-${index}`, city: 'São Paulo', state: 'SP', building_type: 'Vertical', release_date: `${year}-07-01`, standard })));
  return { ...report, projects: buildSpProjects(buildings, report), launchSeries: buildSpLaunchSeries(syntheticLaunchSeries(), report) };
}
describe('SP — estrutura original e dez slides de lançamentos', () => {
  it('preserva as 85 posições e todos os títulos originais, sem inserir complementos', () => {
    render(<SpReportPages report={current()} />);
    expect(SP_ORIGINAL_SLIDES).toHaveLength(85);
    expect(within(screen.getByRole('navigation', { name: 'Navegação dos slides originais' })).getAllByRole('button').map(button => button.textContent)).toEqual(SP_ORIGINAL_SLIDES.map(item => `${item.number}. ${item.title}`));
    open(2); expect(screen.getByRole('img', { name: 'Sobre este relatório' })).toBeInTheDocument();
    expect(screen.getByRole('article')).toHaveTextContent('São Paulo capital');
    open(6); expect(screen.getByRole('img', { name: 'Sumário original' })).toBeInTheDocument();
    open(12); expect(screen.getByRole('article')).toHaveTextContent('LANÇAMENTOS VERTICAIS');
    open(85); expect(screen.getByRole('img', { name: 'Conteúdo pendente: slide 85' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quadro de lançamentos por padrão/ })).not.toBeInTheDocument();
  });
  it('preenche exatamente os dez slides 13 a 22 e preserva a parcial', () => {
    render(<SpReportPages report={reportWithTrends()} />);
    for (let number = 13; number <= 22; number++) {
      open(number);
      expect(screen.getByRole('article')).toHaveAttribute('aria-label', `Slide ${number}: ${SP_ORIGINAL_SLIDES[number - 1].title}`);
      expect(screen.getByRole('article')).not.toHaveTextContent('Dados em conferência');
      expect(screen.getByRole('article')).toHaveTextContent('Parcial até agosto de 2026');
    }
    open(13); expect(screen.getByRole('article')).toHaveTextContent('3T2026*');
    open(14); expect(screen.getByRole('article')).toHaveTextContent('ACUMULADO 12 MESES');
    open(15); expect(screen.getByRole('article')).toHaveTextContent('MCMV');
    open(22); expect(screen.getByRole('article')).toHaveTextContent('PARTICIPAÇÃO ANUAL POR SEGMENTO');
  });
  it('não usa um total municipal como substituto de histórico ausente', () => {
    const report = current();
    const view = render(<SpReportPages report={report} />);
    open(18); expect(screen.getByRole('article')).toHaveTextContent('Dados em conferência');
    view.rerender(<SpReportPages report={{ ...report, launchSeries: { status: 'blocked', issues: ['Falta um mês.'] } }} />);
    expect(screen.getByRole('article')).toHaveTextContent('Falta um mês.');
    expect(screen.getByRole('article')).not.toHaveTextContent('24.351');
  });
  it('mantém gerais quando classificação falta e bloqueia só o recorte', () => {
    const report = reportWithTrends(); report.projects.breakdown = { status: 'blocked', issues: ['Padrão ausente.'] };
    render(<SpReportPages report={report} />);
    open(13); expect(screen.getByRole('article')).not.toHaveTextContent('Dados em conferência');
    open(15); expect(screen.getByRole('article')).toHaveTextContent('Padrão ausente.');
  });
  it('preserva tipologias e segmentos nas posições 23/24,37/38,47/48', () => {
    const report = current();
    render(<SpReportPages report={{ ...report, typologies: buildSpTypologies(syntheticTypologyInput(), report), historyBatch: buildSpHistoryBatch(syntheticHistoryBatch(), report) }} />);
    for (const number of [23, 37, 47]) { open(number); expect(screen.getByRole('img', { name: 'Distribuição por tipologia em unidades e participação percentual' })).toBeInTheDocument(); }
    for (const number of [24, 38, 48]) { open(number); expect(screen.getByRole('img', { name: 'Comparação por segmento nos mesmos meses dos dois anos' })).toBeInTheDocument(); }
    open(46); expect(screen.getByRole('article')).toHaveTextContent('124.706');
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar slides' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `46. ${SP_ORIGINAL_SLIDES[45].title}` })).toHaveAttribute('aria-pressed', 'true');
  });
  it('não monta o relatório com dados municipais bloqueados', () => {
    render(<SpReportPages report={{ ...current(), status: 'incomplete' }} />);
    expect(screen.queryByRole('region', { name: 'Páginas do relatório' })).not.toBeInTheDocument();
  });
});
