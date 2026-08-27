import { describe, expect, it } from 'vitest';
import { addNullable, buildCityCube, mergeCubes, weightedAverage, type MarketCube } from '../domain/cube';
import {
  cohortMatrix,
  cohortMatrixParticipation,
  horizontalPricesByStandard,
  maturityByStandard,
  maturityByTypology,
  offerByCohort,
  offerByStandard,
  offerByTypology,
  pricesByStandard,
  pricesByTypology,
  totalRowOf,
  universeTotals,
  vgvSummary,
} from '../domain/aggregations';

/** Empreendimento sintético no formato bruto de `building-with-history`. */
function building(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    building_id: 'B1',
    name: 'Residencial Alfa',
    building_type: 'Vertical',
    standard: 'Standard',
    release_date: '2025-02-10',
    total_units: 100,
    latitude: -23.18,
    longitude: -46.88,
    typologies_history: [
      { period: '2025-02-01', typology: '2 dorm', qty: 60, release_price: 400000, private_area: 50 },
      { period: '2025-02-01', typology: '3 dorm', qty: 40, release_price: 600000, private_area: 75 },
      { period: '2026-03-01', typology: '2 dorm', typology_stock: 20, liquid_sales: 40, price: 420000, private_area: 50 },
      { period: '2026-03-01', typology: '3 dorm', typology_stock: 10, liquid_sales: 30, price: 630000, private_area: 75 },
    ],
    ...overrides,
  };
}

const options = { city: 'Jundiaí', uf: 'SP', endQuarter: '1T2026' as const };
const cubeOf = (raw: Record<string, unknown>[], overrides = {}) => buildCityCube(raw, { ...options, ...overrides });

describe('OP-4 · cubo granular', () => {
  it('monta o empreendimento com padrão, tipologias, maturidade e cobertura', () => {
    const cube = cubeOf([building()]);
    expect(cube.projects).toHaveLength(1);
    const project = cube.projects[0];
    expect(project.standard).toBe('Standard');
    expect(project.releaseQuarter).toBe('1T2025');
    expect(project.releaseYear).toBe(2025);
    expect(project.launchedUnits).toBe(100);
    expect(project.finalUnits).toBe(30);
    expect(project.soldUnits).toBe(70);
    // 13 meses entre 02/2025 e 03/2026 → faixa de Construção.
    expect(project.ageMonths).toBe(13);
    expect(project.maturity).toBe('Construção');
    expect(project.typologies.map((row) => row.typology)).toEqual(['2 Dormitórios', '3 Dormitórios']);
  });

  it('lê number_bedroom e os nomes oficiais do histórico sem criar Não classificado', () => {
    const cube = cubeOf([building({
      typologies_history: [
        { period: '2025-02-01', number_bedroom: '2', qty: 60, release_price: 400000, private_area: 50 },
        { period: '2025-02-01', number_bedroom: '3', qty: 40, release_price: 600000, private_area: 75 },
        { period: '2026-03-01', number_bedroom: '2', typology_stock: 20, sold_in_period: 40, price: 420000, price_private_area: 8400, private_area: 50 },
        { period: '2026-03-01', number_bedroom: '3', typology_stock: 10, sold_in_period: 30, price: 630000, price_private_area: 8400, private_area: 75 },
      ],
    })]);
    const project = cube.projects[0];
    expect(project.typologies.map((row) => row.typology)).toEqual(['2 Dormitórios', '3 Dormitórios']);
    expect(project.typologies.some((row) => row.typology === 'Não classificado')).toBe(false);
    expect(project.soldUnits).toBe(70);
  });

  it('usa chave por cidade, de modo que building_id igual em cidades distintas não colide', () => {
    const jundiai = cubeOf([building()]);
    const piracicaba = cubeOf([building()], { city: 'Piracicaba' });
    const merged = mergeCubes([jundiai, piracicaba], '1T2026');
    expect(merged.projects).toHaveLength(2);
    expect(new Set(merged.projects.map((project) => project.key)).size).toBe(2);
    expect(universeTotals(merged).projects).toBe(2);
  });

  it('deduplica o mesmo building_id repetido dentro da mesma cidade', () => {
    const cube = cubeOf([building(), building()]);
    expect(cube.projects).toHaveLength(1);
  });

  it('aplica a política Secovi: exclui loteamento e horizontal sem subtipo', () => {
    const cube = cubeOf([
      building(),
      building({ building_id: 'B2', building_type: 'Horizontal', building_subtype: 'Condomínio de Casas', name: 'Vila Bela' }),
      building({ building_id: 'B3', building_type: 'Horizontal', building_subtype: 'Loteamento', name: 'Loteamento Sol' }),
      // Sem subtipo e sem nome informativo: a API não permite afirmar que é condomínio de casas.
      building({ building_id: 'B4', building_type: 'Horizontal', name: 'Horizontal' }),
    ]);
    expect(cube.projects.map((project) => project.buildingId).sort()).toEqual(['B1', 'B2']);
    const reasons = cube.rejections.map((row) => row.reason).sort();
    expect(reasons).toEqual(['horizontal_fora_da_politica', 'subtipo_horizontal_indefinido']);
  });

  it('descarta lançamento posterior ao fechamento e registra o motivo', () => {
    const cube = cubeOf([building({ building_id: 'B9', release_date: '2026-08-01' })]);
    expect(cube.projects).toHaveLength(0);
    expect(cube.rejections[0].reason).toBe('lançamento posterior ao fechamento');
  });

  it('ignora snapshots posteriores ao fechamento ao calcular a oferta final', () => {
    const cube = cubeOf([building({
      typologies_history: [
        { period: '2025-02-01', typology: '2 dorm', qty: 100, release_price: 400000, private_area: 50 },
        { period: '2026-03-01', typology: '2 dorm', typology_stock: 30, price: 420000, private_area: 50 },
        { period: '2026-09-01', typology: '2 dorm', typology_stock: 5, price: 450000, private_area: 50 },
      ],
    })]);
    expect(cube.projects[0].finalUnits).toBe(30);
  });

  it('prefere VGV bruto da API e registra a fórmula usada', () => {
    const withRaw = cubeOf([building({ vgv_released: 50_000_000 })]);
    expect(withRaw.projects[0].launchedVgvMillions).toBe(50);
    expect(withRaw.projects[0].vgvFormula).toMatch(/bruto/i);

    const fromHistory = cubeOf([building()]);
    // 60 × 400.000 + 40 × 600.000 = 48.000.000
    expect(fromHistory.projects[0].launchedVgvMillions).toBeCloseTo(48, 6);
    expect(fromHistory.projects[0].vgvFormula).toMatch(/release_price/);
  });

  it('ausência de preço mantém VGV nulo, sem virar zero', () => {
    const cube = cubeOf([building({
      total_units: 80,
      typologies_history: [{ period: '2025-02-01', typology: '2 dorm', qty: 80 }],
    })]);
    expect(cube.projects[0].launchedVgvMillions).toBeNull();
    expect(cube.projects[0].vgvFormula).toMatch(/indisponível/i);
    expect(cube.projects[0].coverage).toBe('partial');
  });

  it('distingue ausência de zero na soma', () => {
    expect(addNullable(null, null)).toBeNull();
    expect(addNullable(null, 5)).toBe(5);
    expect(addNullable(0, null)).toBe(0);
  });

  it('média ponderada não é média simples de médias', () => {
    // 400.000 com peso 60 e 600.000 com peso 40 → 480.000, não 500.000.
    expect(weightedAverage([{ value: 400000, weight: 60 }, { value: 600000, weight: 40 }])).toBe(480000);
    expect(weightedAverage([{ value: 400000, weight: 0 }])).toBeNull();
    expect(weightedAverage([])).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

/** Universo de quatro empreendimentos verticais e um horizontal permitido. */
function scenarioCube(): MarketCube {
  return cubeOf([
    building({ building_id: 'V1', standard: 'Econômico', release_date: '2021-05-01', total_units: 50,
      typologies_history: [
        { period: '2021-05-01', typology: '1 dorm', qty: 50, release_price: 200000, private_area: 35 },
        { period: '2026-03-01', typology: '1 dorm', typology_stock: 5, liquid_sales: 45, price: 210000, private_area: 35 },
      ] }),
    building({ building_id: 'V2', standard: 'Standard', release_date: '2023-03-01', total_units: 80,
      typologies_history: [
        { period: '2023-03-01', typology: '2 dorm', qty: 80, release_price: 400000, private_area: 50 },
        { period: '2026-03-01', typology: '2 dorm', typology_stock: 20, liquid_sales: 60, price: 420000, private_area: 50 },
      ] }),
    building({ building_id: 'V3', standard: 'Alto', release_date: '2024-07-01', total_units: 60,
      typologies_history: [
        { period: '2024-07-01', typology: '3 dorm', qty: 60, release_price: 800000, private_area: 90 },
        { period: '2026-03-01', typology: '3 dorm', typology_stock: 25, liquid_sales: 35, price: 820000, private_area: 90 },
      ] }),
    building({ building_id: 'V4', standard: 'Standard', release_date: '2025-11-01', total_units: 40,
      typologies_history: [
        { period: '2025-11-01', typology: '2 dorm', qty: 40, release_price: 450000, private_area: 52 },
        { period: '2026-03-01', typology: '2 dorm', typology_stock: 30, liquid_sales: 10, price: 455000, private_area: 52 },
      ] }),
    building({ building_id: 'H1', building_type: 'Horizontal', building_subtype: 'Condomínio de Casas',
      standard: 'Médio', release_date: '2023-09-01', total_units: 30,
      typologies_history: [
        { period: '2023-09-01', typology: '3 dorm', qty: 30, release_price: 900000, private_area: 120 },
        { period: '2026-03-01', typology: '3 dorm', typology_stock: 8, liquid_sales: 22, price: 920000, private_area: 120 },
      ] }),
    building({ building_id: 'H2', building_type: 'Horizontal', building_subtype: 'Loteamento', name: 'Loteamento Fora' }),
  ]);
}

describe('OP-5 · slide 31 — oferta por padrão', () => {
  const rows = offerByStandard(scenarioCube(), 'Vertical');

  it('conta empreendimentos por IDs distintos, não deixa a coluna zerada', () => {
    expect(rows.find((row) => row.label === 'Standard')!.projects).toBe(2);
    expect(rows.find((row) => row.label === 'Econômico')!.projects).toBe(1);
    expect(totalRowOf(rows)!.projects).toBe(4);
  });

  it('usa a ordem canônica dos padrões e termina com Total', () => {
    expect(rows.map((row) => row.label)).toEqual(['Econômico', 'Standard', 'Alto', 'Total']);
  });

  it('reconcilia lançada e final com o universo vertical', () => {
    const total = totalRowOf(rows)!;
    expect(total.launchedUnits).toBe(230);
    expect(total.finalUnits).toBe(80);
    expect(universeTotals(scenarioCube(), 'Vertical').launchedUnits).toBe(230);
  });

  it('calcula disponibilidade sobre oferta lançada, não sobre zero', () => {
    expect(totalRowOf(rows)!.availability).toBeCloseTo(80 / 230 * 100, 6);
  });

  it('não mistura horizontal no universo vertical', () => {
    expect(rows.some((row) => row.label === 'Médio')).toBe(false);
  });
});

describe('OP-5 · slides 34/35 — oferta por tipologia', () => {
  const rows = offerByTypology(scenarioCube(), 'Vertical');

  it('usa os rótulos e a ordem canônicos exigidos pela analista', () => {
    expect(rows.map((row) => row.label)).toEqual(['1 Dormitório', '2 Dormitórios', '3 Dormitórios', 'Total']);
  });

  it('fecha no mesmo total do universo vertical do slide 31', () => {
    const total = totalRowOf(rows)!;
    expect(total.launchedUnits).toBe(230);
    expect(total.finalUnits).toBe(80);
    expect(total.launchedUnits).toBe(totalRowOf(offerByStandard(scenarioCube(), 'Vertical'))!.launchedUnits);
  });

  it('soma por tipologia sem duplicar unidades do empreendimento', () => {
    expect(rows.find((row) => row.label === '2 Dormitórios')!.launchedUnits).toBe(120);
    expect(rows.find((row) => row.label === '2 Dormitórios')!.finalUnits).toBe(50);
  });
});

describe('OP-5 · slides 33/48 — coortes', () => {
  it('produz Até 2022, anos, subtotal até 2024 e total geral', () => {
    const rows = offerByCohort(scenarioCube(), 'Vertical');
    expect(rows.map((row) => row.label)).toEqual(['Até 2022', '2023', '2024', 'Subtotal até 2024', '2025', 'Total geral']);
  });

  it('o subtotal até 2024 soma exatamente as coortes acima dele', () => {
    const rows = offerByCohort(scenarioCube(), 'Vertical');
    const subtotal = rows.find((row) => row.label === 'Subtotal até 2024')!;
    const above = rows.filter((row) => ['Até 2022', '2023', '2024'].includes(row.label));
    expect(subtotal.launchedUnits).toBe(above.reduce((sum, row) => sum + row.launchedUnits!, 0));
    expect(subtotal.projects).toBe(3);
  });

  it('o total geral fecha com o universo vertical', () => {
    const total = totalRowOf(offerByCohort(scenarioCube(), 'Vertical'))!;
    expect(total.launchedUnits).toBe(230);
    expect(total.projects).toBe(4);
  });

  it('a coorte horizontal traz apenas Condomínio de Casas', () => {
    const rows = offerByCohort(scenarioCube(), 'Horizontal');
    const total = totalRowOf(rows)!;
    expect(total.projects).toBe(1);
    expect(total.launchedUnits).toBe(30);
  });
});

describe('OP-5 · slides 41/42 — matriz ano × padrão', () => {
  const matrix = cohortMatrix(scenarioCube(), 'Vertical');

  it('traz oferta lançada preenchida, e não zerada como no PDF de Jundiaí', () => {
    const row2023 = matrix.rows.find((row) => row.label === '2023')!;
    expect(row2023.cells.Standard.launchedUnits).toBe(80);
    expect(row2023.cells.Standard.finalUnits).toBe(20);
  });

  it('usa a ordem canônica de padrões e o agrupamento de anos do slide 33', () => {
    expect(matrix.standards).toEqual(['Econômico', 'Standard', 'Alto']);
    expect(matrix.rows.map((row) => row.label)).toEqual(['Até 2022', '2023', '2024', 'Subtotal até 2024', '2025', 'Total geral']);
  });

  it('a linha de total reconcilia com os slides 31 e 33', () => {
    const total = matrix.rows.find((row) => row.label === 'Total geral')!;
    expect(total.total.launchedUnits).toBe(230);
    expect(total.total.finalUnits).toBe(80);
  });

  it('cada linha soma horizontalmente para o seu próprio total', () => {
    for (const row of matrix.rows) {
      const sum = matrix.standards.reduce((acc, standard) => acc + (row.cells[standard].launchedUnits ?? 0), 0);
      expect(sum).toBe(row.total.launchedUnits ?? 0);
    }
  });

  it('a participação deriva da matriz corrigida, fecha 100% e não produz NaN', () => {
    const participation = cohortMatrixParticipation(matrix);
    const total = participation.rows.find((row) => row.label === 'Total geral')!;
    expect(total.total.launchedUnits).toBe(100);
    expect(total.total.finalUnits).toBe(100);
    const cohorts = participation.rows.filter((row) => row.kind === 'row');
    const sum = cohorts.reduce((acc, row) => acc + (row.total.launchedUnits ?? 0), 0);
    expect(sum).toBeCloseTo(100, 6);
    for (const row of participation.rows) {
      for (const standard of participation.standards) {
        expect(Number.isNaN(row.cells[standard].launchedUnits ?? 0)).toBe(false);
      }
    }
  });
});

describe('OP-5 · slides 43–46 — maturidade, somente vertical', () => {
  it('preenche as faixas em vez de deixar tudo zerado', () => {
    const rows = maturityByStandard(scenarioCube());
    const total = totalRowOf(rows)!;
    expect(total.final.total).toBe(80);
    expect(total.launched.total).toBe(230);
    // V4 lançou em 11/2025: 4 meses até o fechamento → Planta.
    expect(total.launched.Planta).toBe(40);
  });

  it('a soma das faixas é igual ao total vertical', () => {
    const total = totalRowOf(maturityByStandard(scenarioCube()))!;
    const sum = (total.launched.Planta ?? 0) + (total.launched['Construção'] ?? 0) + (total.launched.Pronto ?? 0);
    expect(sum).toBe(total.launched.total);
    expect(sum).toBe(universeTotals(scenarioCube(), 'Vertical').launchedUnits);
  });

  it('a maturidade por tipologia usa os rótulos canônicos e fecha no mesmo total', () => {
    const rows = maturityByTypology(scenarioCube());
    expect(rows.map((row) => row.label)).toEqual(['1 Dormitório', '2 Dormitórios', '3 Dormitórios', 'Total']);
    expect(totalRowOf(rows)!.final.total).toBe(80);
  });

  it('não inclui empreendimento horizontal na maturidade', () => {
    const rows = maturityByStandard(scenarioCube());
    expect(rows.some((row) => row.label === 'Médio')).toBe(false);
  });
});

describe('OP-5 · slides 36–39 e 49 — preços', () => {
  it('ordena padrões canonicamente e pondera a média geral pelo universo', () => {
    const rows = pricesByStandard(scenarioCube(), 'Vertical');
    expect(rows.map((row) => row.label)).toEqual(['Econômico', 'Standard', 'Alto', 'Média Geral']);
    const general = totalRowOf(rows)!;
    const simpleAverage = rows.filter((row) => row.kind === 'row').reduce((sum, row) => sum + row.averageTicket!, 0) / 3;
    // A média geral é ponderada pelo estoque, portanto difere da média simples das linhas.
    expect(general.averageTicket).not.toBeCloseTo(simpleAverage, 2);
  });

  it('ordena tipologias de 1 a 4+ e traz média geral ponderada', () => {
    const rows = pricesByTypology(scenarioCube());
    expect(rows.map((row) => row.label)).toEqual(['1 Dormitório', '2 Dormitórios', '3 Dormitórios', 'Média Geral']);
    expect(totalRowOf(rows)!.averageTicket).not.toBeNull();
  });

  it('o slide 49 abre o horizontal por padrão, sem loteamento', () => {
    const rows = horizontalPricesByStandard(scenarioCube());
    expect(rows.map((row) => row.label)).toEqual(['Médio', 'Média Geral']);
    expect(rows[0].projects).toBe(1);
  });
});

describe('OP-5 · slide 51 — VGV geral', () => {
  const rows = vgvSummary(scenarioCube());

  it('estrutura verticais, subtotal vertical, horizontais e total geral', () => {
    expect(rows.map((row) => row.label)).toEqual([
      'Econômico', 'Standard', 'Alto', 'Subtotal vertical', 'Médio', 'Subtotal horizontal', 'Total geral',
    ]);
  });

  it('preenche a quantidade de empreendimentos, que estava zerada', () => {
    expect(rows.find((row) => row.label === 'Subtotal vertical')!.projects).toBe(4);
    expect(rows.find((row) => row.label === 'Subtotal horizontal')!.projects).toBe(1);
    expect(totalRowOf(rows)!.projects).toBe(5);
  });

  it('subtotais e total fecham em empreendimentos, unidades e VGV', () => {
    const vertical = rows.find((row) => row.label === 'Subtotal vertical')!;
    const horizontal = rows.find((row) => row.label === 'Subtotal horizontal')!;
    const total = totalRowOf(rows)!;
    expect(total.projects).toBe(vertical.projects + horizontal.projects);
    expect(total.launchedUnits).toBe(vertical.launchedUnits! + horizontal.launchedUnits!);
    expect(total.finalUnits).toBe(vertical.finalUnits! + horizontal.finalUnits!);
    expect(total.launchedVgvMillions).toBeCloseTo(vertical.launchedVgvMillions! + horizontal.launchedVgvMillions!, 6);
  });

  it('o subtotal vertical reconcilia com o total do slide 31', () => {
    const vertical = rows.find((row) => row.label === 'Subtotal vertical')!;
    expect(vertical.launchedUnits).toBe(totalRowOf(offerByStandard(scenarioCube(), 'Vertical'))!.launchedUnits);
  });
});

describe('OP-4/OP-5 · universo vazio não fabrica dados', () => {
  const empty = cubeOf([]);

  it('devolve linhas vazias em vez de zeros inventados', () => {
    expect(offerByCohort(empty, 'Vertical')).toEqual([]);
    expect(cohortMatrix(empty, 'Vertical').rows).toEqual([]);
    expect(universeTotals(empty).launchedUnits).toBeNull();
  });

  it('a linha Total existe mas com ausência explícita, não com zero', () => {
    const total = totalRowOf(offerByStandard(empty, 'Vertical'))!;
    expect(total.projects).toBe(0);
    expect(total.launchedUnits).toBeNull();
    expect(total.availability).toBeNull();
  });
});
