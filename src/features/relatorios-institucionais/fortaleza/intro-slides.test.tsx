import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import FortalezaIntroSlide from './FortalezaIntroSlide';
import { INTRO_LAYOUTS, introTableOffset } from './intro-layout';
import { buildIntroView } from './intro-view';
import { monthlySelection } from './__tests__/market-fixture';
import { buildIntroProject, type IntroData } from './intro-data';
afterEach(cleanup);
const cities = ['Fortaleza', 'Aquiraz', 'Caucaia', 'Eusébio', 'Maracanaú'];
describe('Fortaleza — composição dos dez slides originais', () => {
  it.each(['junho', 'julho'] as const)('mantém dez lâminas 16:9 e não carrega cifras antigas no modelo %s', model => {
    const view = buildIntroView({ ...monthlySelection, periodicity: model === 'junho' ? 'quarterly' : 'monthly', position: model === 'junho' ? 2 : 7, year: 2030 }, cities, null);
    expect(INTRO_LAYOUTS[model]).toHaveLength(10);
    for (const layout of INTRO_LAYOUTS[model]) {
      const { container, unmount } = render(<FortalezaIntroSlide model={model} page={layout.number} view={view} />);
      expect(container.querySelector('svg').getAttribute('viewBox')).toBe('0 0 1280 720');
      expect(screen.getByRole('img', { name: `Fortaleza · slide ${layout.number}` })).toBeTruthy();
      expect(container.textContent).not.toContain('2026');
      for (const shape of layout.shapes) {
        for (const cell of shape.cells ?? []) {
          if (cell.row > 0) expect(cell.text).toBeUndefined();
          expect(Number.isFinite(cell.x + cell.y + cell.width + cell.height)).toBe(true);
        }
      }
      unmount();
    }
  });
  it('continua tabelas sem repetir linhas e preserva as cinco páginas nativas', () => {
    for (const model of ['junho', 'julho'] as const) {
      expect(introTableOffset(model, 3)).toBe(0);
      expect(introTableOffset(model, 5)).toBe(0);
      for (const page of [4, 6, 7]) {
        const previous = INTRO_LAYOUTS[model][page - 2].shapes.find(shape => shape.slot === 'table');
        expect(introTableOffset(model, page)).toBe(introTableOffset(model, page - 1) + previous.rows - 1);
      }
    }
  });
  it('renderiza catálogo conferido, sem transformar o total cadastral em amostra', () => {
    const project = buildIntroProject({ building_id: 1, name: 'Projeto sintético conferido', release_date: '2026-06-01', city: 'Fortaleza', building_type: 'Vertical', incorporators: [{ name: 'Empresa sintética' }] });
    const data: IntroData = { status: 'ready', projects: [project], issues: [], requests: 1, startedAt: '', finishedAt: '' };
    const view = buildIntroView(monthlySelection, ['Fortaleza'], data);
    const { rerender, container } = render(<FortalezaIntroSlide model="julho" page={3} view={view} />);
    expect(screen.getByText(project.name)).toBeTruthy();
    expect(screen.getByText('Empresa sintética')).toBeTruthy();
    rerender(<FortalezaIntroSlide model="julho" page={2} view={view} />);
    expect(view.sample.projects).toBe(1);expect(view.sampleMethod).toBe('registry');
    expect(container.textContent).not.toContain(project.name);
    expect(container.textContent).toContain('Base consultada:');expect(container.textContent).toContain('não representa');
    rerender(<FortalezaIntroSlide model="julho" page={10} view={view} />);
    expect(screen.getAllByLabelText('Histórico de empreendimentos pendente')).toHaveLength(2);
  });
});
