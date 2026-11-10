import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import FortalezaMonthlyLaunchSlide from './FortalezaMonthlyLaunchSlide';
import FortalezaIntroSlides from './FortalezaIntroSlides';
import { monthlySelection } from './__tests__/market-fixture';
import { monthlyLaunchFixture } from './__tests__/monthly-launch-fixture';
import { blockedLaunchSeries, monthlyUnitLaunches } from './monthly-launches';
afterEach(cleanup);
const selection = { ...monthlySelection, position: 7 };
describe('Fortaleza mensal — lâminas e navegação', () => {
  it('usa o mês selecionado e separa as variações mensal e acumulada', () => {
    const series = monthlyUnitLaunches(monthlyLaunchFixture(), selection, ['Fortaleza'], 'capital');
    const { container } = render(<FortalezaMonthlyLaunchSlide page={13} selection={selection} series={series} />);
    expect(screen.getByText('julho de 2026')).toBeTruthy();
    expect(screen.getByText('a julho de 2025')).toBeTruthy();
    expect(screen.getByText('+133,3%')).toBeTruthy(); expect(screen.getByText('+200%')).toBeTruthy();
    expect(screen.getByText('acumulado no ano')).toBeTruthy();
    expect(container.querySelectorAll('circle')).toHaveLength(28); // 25 months + 2 YTD + legend.
    expect(container.textContent).not.toContain('400 mil');
  });
  it.each([11,13,15] as const)('mantém ausência explícita e período novo no slide %s', page => {
    const { container } = render(<FortalezaMonthlyLaunchSlide page={page} selection={{ ...selection, year: 2027, position: 1 }} series={blockedLaunchSeries('Fonte pendente')} />);
    expect(screen.getByLabelText('Histórico de lançamentos pendente')).toBeTruthy();
    expect(screen.getByText('janeiro de 2027')).toBeTruthy(); expect(container.textContent).not.toContain('2025');
    expect(container.querySelectorAll('circle')).toHaveLength(1); // Only static legend, no fake zero observations.
  });
  it('preserva números originais, informa lacunas e navega sem renumerar slides', () => {
    render(<FortalezaIntroSlides selection={selection} cities={['Fortaleza']} data={null} monthlyLaunches={monthlyLaunchFixture()} />);
    fireEvent.click(screen.getByRole('button', { name: '11' }));
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByRole('img', { name: 'Fortaleza · slide 12' })).toBeTruthy();
    expect(screen.getByLabelText('Slide em preparação')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByRole('img', { name: 'Fortaleza · slide 13' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByRole('img', { name: 'Fortaleza · slide 14' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByRole('img', { name: 'Fortaleza · slide 15' })).toBeTruthy();
    expect(screen.getAllByText('O recorte não inclui todos os municípios desta análise.', { exact: true }).length).toBeGreaterThan(0);
  });
});
