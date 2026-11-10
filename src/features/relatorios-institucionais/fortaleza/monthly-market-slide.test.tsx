import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it } from 'vitest';
import FortalezaMonthlyMarketSlide from './FortalezaMonthlyMarketSlide';
import FortalezaIntroSlides from './FortalezaIntroSlides';
import { buildMonthlySlide } from './monthly-market';
import { monthlyMarketFixture,monthlyMarketSelection as selection } from './__tests__/monthly-market-fixture';
import { FORTALEZA_CITIES } from './model';
afterEach(cleanup);
const cities = [...FORTALEZA_CITIES];
describe('Fortaleza — prévia mensal12/14 e16–25', () => {
  it.each([12,14,16,17,19,20,22,23,24,25])('slide %s renderiza dados próprios e mantém geometria16:9', page => {
    const data = buildMonthlySlide(page,monthlyMarketFixture(),selection,cities);
    expect(data.status).toBe('ready');
    const { container } = render(<FortalezaMonthlyMarketSlide page={page} selection={selection} cities={cities} data={data} />);
    expect(screen.getByRole('img',{ name:`Fortaleza · slide ${page}` })).toBeTruthy();
    expect(container.querySelector('svg').getAttribute('viewBox')).toBe('0 0 1280 720');
    expect(container.querySelector('[aria-label="Histórico mensal pendente"]')).toBeNull();
    expect(container.textContent).not.toContain('2º Trimestre');
    if (page === 24) expect(screen.getByLabelText('Séries móveis de 12 meses')).toBeTruthy();
    else expect(screen.getByLabelText('Histórico mensal')).toBeTruthy();
  });
  it.each([18,21])('divisória %s identifica municípios e mês escolhidos, sem fixar recorte antigo', page => {
    const { container } = render(<FortalezaMonthlyMarketSlide page={page} selection={{ ...selection,position:1,year:2027 }} cities={['Fortaleza']} data={null} />);
    expect(screen.getByText('Fortaleza')).toBeTruthy(); expect(screen.getByText('janeiro de 2027')).toBeTruthy(); expect(container.textContent).not.toContain('Aquiraz');
  });
  it('navegação percorre11até25 sem saltos, inclusive12/14com gráficos implementados', () => {
    const fixture = monthlyMarketFixture();
    render(<FortalezaIntroSlides selection={selection} cities={cities} data={null} monthlyLaunches={{ sources:[],issues:[],market:fixture }} />);
    fireEvent.click(screen.getByRole('button',{ name:'11' }));
    for (let page=12;page<=25;page++) {
      fireEvent.click(screen.getByRole('button',{ name:'Próximo' }));
      expect(screen.getByRole('img',{ name:`Fortaleza · slide ${page}` })).toBeTruthy();
      if (page !== 13 && page !== 15) expect(document.querySelector('[aria-label="Histórico mensal pendente"]')).toBeNull();
    }
  });
  it('sem fonte aparece indisponibilidade, sem fingir gráfico de zeros', () => {
    const result = buildMonthlySlide(12,null,selection,cities);
    const { container } = render(<FortalezaMonthlyMarketSlide page={12} selection={selection} cities={cities} data={result} />);
    expect(screen.getByLabelText('Histórico mensal pendente')).toBeTruthy();
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });
});
