import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { buildPanoramaReportModel } from '../report/model';
import { buildCityCube } from '../domain/cube';
import { AreaIvvSlide, MarketSummarySlide, NarrativeSlide, PriceTableSlide } from '../components/MarketSlides';
import { PanoramaExportDeck, pointLabelPlan } from '../components/ReportPaginator';
import type { PanoramaReportModel, PanoramaScope } from '../types';

/**
 * Prova de saída, não de intenção: aqui as lâminas são realmente montadas e o texto final é lido.
 * A matriz é explícita — "ajustado no componente" sem output final não fecha item.
 */

const scope: PanoramaScope = { uf: 'SP', cities: ['Praia Grande'], endQuarter: '2T2026', engineVersion: 'v3' };
const source = (rows: Record<string, unknown>[] = []) => ({ rows, available: true, source: 'fixture' });
const empty = () => source([]);

const vertical = {
  building_id: 'V1', name: 'Residencial Alfa', building_type: 'Vertical', standard: 'Médio',
  release_date: '2025-02-10', total_units: 100, latitude: -24.0, longitude: -46.4,
  typologies_history: [
    { period: '2025-02-01', number_bedroom: '2', qty: 100, release_price: 400000, private_area: 62 },
    { period: '2026-06-01', number_bedroom: '2', typology_stock: 30, liquid_sales: 70, price: 420000, private_area: 62 },
  ],
};
const condominio = {
  building_id: 'H1', name: 'Residencial Évora', building_type: 'Horizontal', standard: 'Condomínio de Casas/Sobrados',
  release_date: '2025-02-10', total_units: 40,
  typologies_history: [
    { period: '2025-02-01', number_bedroom: '3', qty: 40, release_price: 500000, private_area: 90 },
    { period: '2026-06-01', number_bedroom: '3', typology_stock: 12, liquid_sales: 8, price: 520000, private_area: 90 },
  ],
};
const loteamento = {
  building_id: 'H9', name: 'Terras da Alvorada', building_type: 'Horizontal', standard: 'Loteamento Fechado',
  release_date: '2025-02-10', total_units: 80,
  typologies_history: [{ period: '2025-02-01', number_bedroom: '3', qty: 80, release_price: 300000, private_area: 200 }],
};

function modelOf(buildings: Record<string, unknown>[]): PanoramaReportModel {
  const cube = buildCityCube(buildings, { city: 'Praia Grande', uf: 'SP', endQuarter: '2T2026', engineVersion: 'v3' });
  return buildPanoramaReportModel(scope, [], {
    sales: empty(), salesTypology: empty(), stock: empty(), stockTypology: empty(),
    ivv: empty(), ivvTypology: { rows: [], available: false, source: 'ivv · circuito aberto' },
    ticket: empty(), ticketTypology: empty(), meter: empty(), meterTypology: empty(),
  }, [], { cubes: [cube], provenance: { engineVersion: 'v3', completedCities: ['Praia Grande'] } });
}

describe('JG-36/37/38 · narrativa sem loteamento, sem "API GeoBrain" e com preços separados', () => {
  it('nenhuma das duas páginas de narrativa menciona loteamento ou API GeoBrain', () => {
    const report = modelOf([vertical, condominio, loteamento]);
    for (const continuation of [false, true]) {
      const { container, unmount } = render(<NarrativeSlide report={report} continuation={continuation}/>);
      const text = container.textContent ?? '';
      expect(text.toLowerCase()).not.toContain('loteamento');
      expect(text.toLowerCase()).not.toContain('api geobrain');
      expect(text.toLowerCase()).not.toContain('geobrain');
      unmount();
    }
  });

  it('não apresenta uma média única de vertical + horizontal: cada segmento tem o seu preço', () => {
    const { container } = render(<NarrativeSlide report={modelOf([vertical, condominio])} continuation/>);
    const text = container.textContent ?? '';
    expect(text).toContain('residencial vertical');
    expect(text).toContain('Condomínio de Casas');
    expect(text).toContain('não são combinados em uma média única');
  });

  it('sem condomínio elegível, diz isso em vez de somar o horizontal recusado', () => {
    const { container } = render(<NarrativeSlide report={modelOf([vertical, loteamento])} continuation/>);
    expect(container.textContent).toContain('Não há Condomínio de Casas elegível');
  });
});

describe('JG-20/32 · o horizontal exibido é apenas Condomínio de Casas', () => {
  it('o resumo geral nomeia o universo aceito na própria linha', () => {
    render(<MarketSummarySlide report={modelOf([vertical, condominio, loteamento])}/>);
    expect(screen.getByText(/Total Mercado Residencial Horizontal — Condomínio de Casas/)).toBeTruthy();
  });

  it('a última coluna comunica o sinal por texto, não apenas por cor', () => {
    const { container } = render(<MarketSummarySlide report={modelOf([vertical, condominio])}/>);
    expect(container.querySelectorAll('.panorama-sr-only').length).toBeGreaterThan(0);
    // Um dos cinco estados fechados precisa estar declarado na célula — inclusive `null` e
    // `unavailable`, que são justamente os que não podem virar 0% silencioso.
    expect(container.querySelector('[class*="panorama-cf-"]')).toBeTruthy();
  });
});

describe('V4 · IVV granular no material exportado', () => {
  it('explica o cálculo sem expor falha técnica ou indisponibilidade da API', () => {
    const { container } = render(<AreaIvvSlide report={modelOf([vertical, condominio])}/>);
    const text = container.textContent ?? '';
    expect(text).toContain('calculado por faixa a partir do histórico granular por empreendimento');
    expect(text).not.toMatch(/api|http|indisponível|circuito/i);
  });
});

describe('JG-34 · lâmina horizontal sem empreendimento ativo', () => {
  it('quando não há condomínio elegível, a página explica a exclusão em vez de zerar', () => {
    const { container } = render(<PriceTableSlide report={modelOf([vertical, loteamento])} dimension="pattern" horizontal/>);
    expect(container.textContent).toContain('Não há Condomínio de Casas elegível');
    expect(container.querySelector('table')).toBeNull();
  });
});

describe('JG-40 · encerramento do consultor', () => {
  it('sem foto, a lâmina não imprime o texto "FOTO DO CONSULTOR"', () => {
    const report = modelOf([vertical, condominio]);
    const { container } = render(<PanoramaExportDeck report={report} rootRef={{ current: null }}/>);
    expect(container.textContent).not.toContain('FOTO DO CONSULTOR');
    expect(container.textContent).not.toContain('Espaço reservado para a finalização');
  });

  it('com foto, renderiza a imagem com texto alternativo', () => {
    const report = { ...modelOf([vertical]), presentation: { consultant: { name: 'Ana Souza', role: 'Consultora', photoUrl: 'https://exemplo/ana.png' } } };
    const { container } = render(<PanoramaExportDeck report={report} rootRef={{ current: null }}/>);
    const photo = [...container.querySelectorAll('img')].find((image) => image.getAttribute('src') === 'https://exemplo/ana.png');
    expect(photo?.getAttribute('alt')).toBe('Ana Souza');
  });
});

describe('JG-05 · tabela comparativa com tratamento uniforme', () => {
  it('o rótulo do segmento usa a mesma célula nas três linhas e nomeia o universo horizontal', () => {
    const report = modelOf([vertical, condominio]);
    const { container } = render(<PanoramaExportDeck report={report} rootRef={{ current: null }}/>);
    const comparison = container.querySelector('.panorama-comparison-table');
    expect(comparison).toBeTruthy();
    const cells = [...comparison!.querySelectorAll('td.panorama-segment-cell')].map((cell) => cell.textContent);
    expect(cells).toContain('Residencial Vertical');
    expect(cells).toContain('Condomínio de Casas');
    expect(cells).toContain('Total Mercado');
    // Nenhum rótulo de segmento fica de fora da classe comum — era o cinza isolado do Horizontal.
    const labelColumn = [...comparison!.querySelectorAll('tbody tr')].map((row) => row.querySelector('td'));
    expect(labelColumn.length).toBeGreaterThan(0);
    expect(labelColumn.every((cell) => cell?.classList.contains('panorama-segment-cell'))).toBe(true);
  });
});

describe('JG-01 a JG-04 · tipografia das institucionais', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/features/panorama-secovi-fiergs/print/panorama-print.css'), 'utf8');

  it('as páginas institucionais medem a fonte pela lâmina (cqw), como o resto do deck', () => {
    const rule = css.match(/\.panorama-v2-page \.panorama-corporate \{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('cqw');
    // Regressão proibida: `vw` mede a janela, não a lâmina — era o que deixava o texto menor no
    // preview e travado em 1,25rem na exportação a 1920px.
    expect(rule).not.toContain('vw');
    expect(rule).not.toContain('clamp(');
  });

  it('título institucional não volta a ficar menor que o das demais lâminas de conteúdo', () => {
    const heading = css.match(/\.panorama-v2-page \.panorama-corporate h2 \{[^}]*\}/)?.[0] ?? '';
    const size = Number(heading.match(/font-size:([\d.]+)cqw/)?.[1] ?? 0);
    expect(size).toBeGreaterThanOrEqual(2.55);
  });
});

describe('JG-07 a JG-12 e JG-15 a JG-18 · rótulo e fundo nos gráficos temporais', () => {
  it('o rótulo zero aparece — era o que apagava o 2T26 dos gráficos', () => {
    expect(pointLabelPlan(0, '2T2026', '2').render).toBe(true);
    expect(pointLabelPlan(329, '2T2026', '2').render).toBe(true);
    // Só ausência real deixa de imprimir rótulo.
    expect(pointLabelPlan(null, '2T2026', '2').render).toBe(false);
    expect(pointLabelPlan(undefined, '2T2026', '2').render).toBe(false);
  });

  it('a placa branca existe só nos segundos trimestres, identificados por valor', () => {
    expect(pointLabelPlan(10, '2T2026', '2').plate).toBe('chip');
    expect(pointLabelPlan(10, '2T2022', '2').plate).toBe('chip');
    for (const quarter of ['1T2026', '3T2025', '4T2024']) {
      expect(pointLabelPlan(10, quarter, '2').plate).toBe('none');
    }
  });

  it('a regra segue o fechamento selecionado, não a posição na série', () => {
    expect(pointLabelPlan(10, '1T2026', '1').plate).toBe('chip');
    expect(pointLabelPlan(10, '2T2026', '1').plate).toBe('none');
  });

  it('o trimestre de fechamento está na série usada pelos gráficos', () => {
    const report = modelOf([vertical, condominio]);
    expect(report.launches.projects.map((item) => item.quarter)).toContain('2T2026');
    expect(report.launches.quarters.at(-1)).toBe('2T2026');
  });
});
