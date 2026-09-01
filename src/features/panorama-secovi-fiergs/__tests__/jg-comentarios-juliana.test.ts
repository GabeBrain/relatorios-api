import { describe, expect, it } from 'vitest';
import { SECOVI_SP_V3_POLICY, classifyHorizontalLabel } from '../domain/entity-policy';
import { cohortBuckets, areaBandOf, typologyDisplayLabel } from '../domain/taxonomy';
import { conditionalFormat, shareOf, sharesCloseTo100 } from '../domain/conditional-format';
import { buildCityCube } from '../domain/cube';
import { maturityByStandard, offerByAreaBand, offerByCohort, vgvSummary } from '../domain/aggregations';
import { createPanoramaReportManifest, panoramaManifestOptions } from '../report/manifest';

/**
 * Requisitos verificáveis das 40 anotações de Juliana Guimarães sobre
 * `panorama-jundiai-2T2026 - corrigido.pdf`.
 *
 * Cada bloco cita o ID da matriz. Comentário repetido tem asserção própria: o que se prova aqui é
 * a regra; a evidência de página vive no dossiê, com a captura correspondente.
 */

const options = { city: 'Praia Grande', uf: 'SP', endQuarter: '2T2026' as const, engineVersion: 'v3' as const };

/** Condomínio de casas com a grafia real da API v2, com barra. */
const condominio = (overrides: Record<string, unknown> = {}) => ({
  building_id: 'H1',
  name: 'Residencial Évora',
  building_type: 'Horizontal',
  standard: 'Condomínio de Casas/Sobrados',
  release_date: '2025-02-10',
  total_units: 40,
  typologies_history: [
    { period: '2025-02-01', number_bedroom: '2', qty: 40, release_price: 300000, private_area: 62 },
    { period: '2026-06-01', number_bedroom: '2', typology_stock: 12, liquid_sales: 8, price: 320000, private_area: 62 },
  ],
  ...overrides,
});

describe('JG-05/07/20/32/33/34/35 · universo horizontal PRE-026', () => {
  it('aceita a grafia oficial `Condomínio de Casas/Sobrados`, com barra', () => {
    // Esta é a única grafia que a varredura de 24 municípios produziu. Recusá-la zeraria os 11
    // aceitos e suprimiria por engano o bloco horizontal de Praia Grande.
    expect(SECOVI_SP_V3_POLICY.classify({ segment: 'Horizontal', standard: 'Condomínio de Casas/Sobrados' }).accepted).toBe(true);
    expect(classifyHorizontalLabel('Condomínio de Casas/Sobrados')).toBe('produto_aceito');
  });

  it('aceita pelo histórico quando o `standard` atual não traz o rótulo', () => {
    // 4 dos 11 aceitos só são identificáveis por `typologies_history[].pattern`.
    expect(SECOVI_SP_V3_POLICY.classify({ segment: 'Horizontal', standard: 'Econômico', historicalPatterns: ['Econômico', 'Condomínio de Casas/Sobrados'] }).accepted).toBe(true);
  });

  it('recusa loteamento, chácara, terreno e loteamento comercial, com motivo de produto', () => {
    for (const label of ['Loteamento Fechado', 'Loteamento Aberto', 'Loteamento Comercial', 'Condomínio de Chácaras', 'Terreno']) {
      const decision = SECOVI_SP_V3_POLICY.classify({ segment: 'Horizontal', standard: label });
      expect(decision.accepted).toBe(false);
      expect(decision.reason).toBe('horizontal_fora_da_politica');
    }
  });

  it('nunca deduz condomínio a partir do nome comercial', () => {
    expect(SECOVI_SP_V3_POLICY.classify({ segment: 'Horizontal', rawName: 'Condomínio de Casas Jardins' }).accepted).toBe(false);
  });

  it('trata só-socioeconômico como ausência de informação, não como produto recusado', () => {
    const decision = SECOVI_SP_V3_POLICY.classify({ segment: 'Horizontal', standard: 'Médio' });
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe('subtipo_horizontal_indefinido');
  });

  it('rótulo novo falha de forma ruidosa: recusa sem casar por semelhança textual', () => {
    const decision = SECOVI_SP_V3_POLICY.classify({ segment: 'Horizontal', standard: 'Condomínio de Casas Modulares' });
    expect(decision.accepted).toBe(false);
    expect(classifyHorizontalLabel('Condomínio de Casas Modulares')).toBe('desconhecido');
  });
});

describe('JG-22/26/27 · subtotal dos lançados após 2024', () => {
  it('soma somente anos posteriores a 2024 e fica depois da linha de 2026', () => {
    const labels = cohortBuckets([2018, 2023, 2024, 2025, 2026]).map((bucket) => bucket.label);
    expect(labels).toEqual(['Até 2022', '2023', '2024', '2025', '2026', 'Subtotal lançados após 2024', 'Total geral']);
  });

  it('anos anteriores a 2024 provadamente não entram no subtotal', () => {
    const cube = buildCityCube([
      { building_id: 'V1', building_type: 'Vertical', standard: 'Médio', release_date: '2023-03-01', total_units: 100, typologies_history: [{ period: '2023-03-01', number_bedroom: '2', qty: 100 }, { period: '2026-06-01', number_bedroom: '2', typology_stock: 10 }] },
      { building_id: 'V2', building_type: 'Vertical', standard: 'Médio', release_date: '2025-03-01', total_units: 50, typologies_history: [{ period: '2025-03-01', number_bedroom: '2', qty: 50 }, { period: '2026-06-01', number_bedroom: '2', typology_stock: 20 }] },
    ], { ...options, city: 'Jundiaí' });
    const rows = offerByCohort(cube, 'Vertical');
    const subtotal = rows.find((row) => row.kind === 'subtotal')!;
    expect(subtotal.launchedUnits).toBe(50);
    expect(subtotal.projects).toBe(1);
  });
});

describe('JG-19 · faixas de área útil e IVV', () => {
  it('usa as metragens do gabarito 1T26, não o número de dormitórios', () => {
    expect(areaBandOf(44)).toBe('Até 44m²');
    expect(areaBandOf(62)).toBe('60–69m²');
    expect(areaBandOf(320)).toBe('Acima de 250m²');
    expect(areaBandOf(null)).toBeNull();
  });

  it('calcula IVV do cubo granular pela identidade PRE-009, sem série de zeros', () => {
    const cube = buildCityCube([condominio({ building_id: 'V1', building_type: 'Vertical', standard: 'Médio' })], { ...options, city: 'Jundiaí' });
    const rows = offerByAreaBand(cube);
    const band = rows.find((row) => row.label === '60–69m²')!;
    // vendas 8, oferta final 12 ⇒ IVV = 8 / (12 + 8) = 40%.
    expect(band.ivv).toBeCloseTo(40, 5);
    expect(band.ivv).not.toBe(0);
  });

  it('a oferta anterior nunca é negativa quando o lançamento cabe todo no fechamento', () => {
    // Empreendimento lançado no próprio 2T2026: 60 unidades lançadas, 18 em estoque, 7 vendidas.
    // Sem piso, a identidade daria −35 de oferta anterior, um número impossível na página.
    const cube = buildCityCube([
      { building_id: 'V1', building_type: 'Vertical', standard: 'Médio', release_date: '2026-05-01', total_units: 60,
        typologies_history: [
          { period: '2026-05-01', number_bedroom: '2', qty: 60, private_area: 72 },
          { period: '2026-06-01', number_bedroom: '2', typology_stock: 18, liquid_sales: 7, private_area: 72 },
        ] },
    ], { ...options, city: 'Jundiaí' });
    const band = offerByAreaBand(cube).find((row) => row.kind === 'row')!;
    expect(band.previousUnits).toBe(0);
    expect(band.previousUnits).toBeGreaterThanOrEqual(0);
    // A base do IVV segue sendo a oferta disponível no período: 0 anterior + 60 lançadas.
    expect(band.ivv).toBeCloseTo(7 / 60 * 100, 5);
  });

  it('o total da tabela fecha com a soma das linhas impressas', () => {
    const cube = buildCityCube([
      { building_id: 'V1', building_type: 'Vertical', standard: 'Médio', release_date: '2026-05-01', total_units: 60,
        typologies_history: [{ period: '2026-05-01', number_bedroom: '2', qty: 60, private_area: 72 }, { period: '2026-06-01', number_bedroom: '2', typology_stock: 18, liquid_sales: 7, private_area: 72 }] },
      { building_id: 'V2', building_type: 'Vertical', standard: 'Médio', release_date: '2024-05-01', total_units: 90,
        typologies_history: [{ period: '2024-05-01', number_bedroom: '2', qty: 90, private_area: 48 }, { period: '2026-06-01', number_bedroom: '2', typology_stock: 40, liquid_sales: 12, private_area: 48 }] },
    ], { ...options, city: 'Jundiaí' });
    const rows = offerByAreaBand(cube);
    const linhas = rows.filter((row) => row.kind === 'row');
    const total = rows.find((row) => row.kind === 'total')!;
    for (const key of ['previousUnits', 'finalUnits', 'launchedUnits', 'soldUnits'] as const) {
      expect(total[key]).toBe(linhas.reduce((sum, row) => sum + (row[key] ?? 0), 0));
    }
  });

  it('faixa sem base devolve `null`, e não zero', () => {
    const cube = buildCityCube([{ building_id: 'V9', building_type: 'Vertical', standard: 'Médio', release_date: '2025-01-01', total_units: 10, typologies_history: [{ period: '2026-06-01', number_bedroom: '2', private_area: 62 }] }], { ...options, city: 'Jundiaí' });
    const band = offerByAreaBand(cube).find((row) => row.kind === 'row');
    expect(band?.ivv).toBeNull();
  });
});

describe('JG-29/30/31 · percentuais de participação', () => {
  it('cada coluna de maturidade divide pelo total da própria coluna e fecha 100%', () => {
    const cube = buildCityCube([
      { building_id: 'A', building_type: 'Vertical', standard: 'Médio', release_date: '2026-04-01', total_units: 60, typologies_history: [{ period: '2026-04-01', number_bedroom: '2', qty: 60 }, { period: '2026-06-01', number_bedroom: '2', typology_stock: 30 }] },
      { building_id: 'B', building_type: 'Vertical', standard: 'Alto', release_date: '2026-04-01', total_units: 40, typologies_history: [{ period: '2026-04-01', number_bedroom: '3', qty: 40 }, { period: '2026-06-01', number_bedroom: '3', typology_stock: 10 }] },
    ], { ...options, city: 'Jundiaí' });
    const rows = maturityByStandard(cube);
    const total = rows.find((row) => row.kind === 'total')!;
    const shares = rows.filter((row) => row.kind === 'row').map((row) => shareOf(row.launched.total, total.launched.total));
    expect(sharesCloseTo100(shares)).toBe(true);
    // O defeito corrigido: dividir a coluna lançada pelo total FINAL dava soma diferente de 100%.
    const wrong = rows.filter((row) => row.kind === 'row').map((row) => shareOf(row.launched.total, total.final.total));
    expect(sharesCloseTo100(wrong)).toBe(false);
  });

  it('participação sem base devolve `null`, nunca 0%', () => {
    expect(shareOf(10, 0)).toBeNull();
    expect(shareOf(10, null)).toBeNull();
    expect(shareOf(null, 100)).toBeNull();
  });
});

describe('JG-20/21/23/24/28/29/31 · formatação condicional', () => {
  it('define os cinco estados e nunca comunica só por cor', () => {
    expect(conditionalFormat('variation', { value: 12 })).toMatchObject({ state: 'positive', symbol: '▲' });
    expect(conditionalFormat('variation', { value: -12 })).toMatchObject({ state: 'negative', symbol: '▼' });
    expect(conditionalFormat('variation', { value: 0 }).state).toBe('neutral');
    expect(conditionalFormat('share', { value: null, reference: 10 }).state).toBe('null');
    expect(conditionalFormat('ivv', { value: 30, unavailable: true }).state).toBe('unavailable');
    // Todo estado carrega texto acessível: é o canal que sobrevive ao PDF em preto e branco.
    for (const state of ['positive', 'negative', 'neutral', 'null', 'unavailable'] as const) {
      const verdict = conditionalFormat('share', { value: state === 'null' ? null : 50, reference: 10, unavailable: state === 'unavailable' });
      expect(verdict.srLabel.length).toBeGreaterThan(0);
    }
  });

  it('disponibilidade alta é o resultado ruim, e o sinal inverte de acordo', () => {
    expect(conditionalFormat('availability', { value: 80, reference: 20 }).state).toBe('negative');
    expect(conditionalFormat('availability', { value: 10, reference: 20 }).state).toBe('positive');
  });

  it('sem referência utilizável, o valor não recebe sinal inventado', () => {
    expect(conditionalFormat('share', { value: 50, reference: 0 }).state).toBe('neutral');
    expect(conditionalFormat('share', { value: 50 }).state).toBe('neutral');
  });
});

describe('JG-34/39 · páginas condicionais decididas no manifesto', () => {
  const base = { provenance: { engineVersion: 'v3' as const }, cityComparisons: { enabled: false }, locations: [] as { latitude: number; longitude: number }[] };

  it('suprime o bloco horizontal quando não há Condomínio de Casas com oferta ativa', () => {
    const semAtivo = panoramaManifestOptions({ ...base, cube: { projects: [{ segment: 'Horizontal', finalUnits: 0 }] } });
    expect(semAtivo.includeHorizontal).toBe(false);
    const manifest = createPanoramaReportManifest(semAtivo);
    expect(manifest.some((page) => [47, 48, 49].includes(page.referenceSlide))).toBe(false);
  });

  it('mantém o bloco horizontal quando há oferta ativa', () => {
    const comAtivo = panoramaManifestOptions({ ...base, cube: { projects: [{ segment: 'Horizontal', finalUnits: 12 }] } });
    expect(comAtivo.includeHorizontal).toBe(true);
    expect(createPanoramaReportManifest(comAtivo).some((page) => page.referenceSlide === 48)).toBe(true);
  });

  it('sem token de mapa, divisor e mapa saem juntos — nunca um divisor órfão', () => {
    const semMapa = panoramaManifestOptions({ ...base, cube: { projects: [] }, locations: [{ latitude: -23.18, longitude: -46.88 }] }, '');
    expect(semMapa.includeMap).toBe(false);
    const manifest = createPanoramaReportManifest(semMapa);
    expect(manifest.some((page) => page.referenceSlide === 55)).toBe(false);
    expect(manifest.some((page) => page.referenceSlide === 56)).toBe(false);
  });

  it('com token e coordenadas válidas, a lâmina de mapa existe', () => {
    const comMapa = panoramaManifestOptions({ ...base, cube: { projects: [] }, locations: [{ latitude: -23.18, longitude: -46.88 }] }, 'pk.token');
    expect(comMapa.includeMap).toBe(true);
    expect(createPanoramaReportManifest(comMapa).some((page) => page.referenceSlide === 56)).toBe(true);
  });

  it('preview, PDF e PPT compartilham a mesma decisão e a mesma contagem', () => {
    const subject = { ...base, cube: { projects: [{ segment: 'Horizontal', finalUnits: 12 }] }, locations: [{ latitude: -23.18, longitude: -46.88 }] };
    const first = createPanoramaReportManifest(panoramaManifestOptions(subject, 'pk.token'));
    const second = createPanoramaReportManifest(panoramaManifestOptions(subject, 'pk.token'));
    expect(first.map((page) => page.referenceSlide)).toEqual(second.map((page) => page.referenceSlide));
    expect(first.map((page) => page.page)).toEqual(first.map((_, index) => index + 1));
  });
});

describe('JG-35 · VGV com condomínios depois do subtotal vertical', () => {
  it('ordena verticais, subtotal vertical, condomínios e total geral', () => {
    const cube = buildCityCube([
      { building_id: 'V1', building_type: 'Vertical', standard: 'Médio', release_date: '2025-02-01', total_units: 100, typologies_history: [{ period: '2025-02-01', number_bedroom: '2', qty: 100, release_price: 500000 }, { period: '2026-06-01', number_bedroom: '2', typology_stock: 20, price: 520000 }] },
      condominio(),
    ], options);
    const labels = vgvSummary(cube).map((row) => row.label);
    expect(labels.indexOf('Subtotal vertical')).toBeLessThan(labels.findIndex((label) => label.startsWith('Condomínio de Casas ·')));
    expect(labels.at(-1)).toBe('Total geral');
  });

  it('sem condomínio aceito, não cria linha horizontal vazia', () => {
    const cube = buildCityCube([
      { building_id: 'V1', building_type: 'Vertical', standard: 'Médio', release_date: '2025-02-01', total_units: 100, typologies_history: [{ period: '2025-02-01', number_bedroom: '2', qty: 100 }, { period: '2026-06-01', number_bedroom: '2', typology_stock: 20 }] },
      { building_id: 'H9', building_type: 'Horizontal', standard: 'Loteamento Fechado', release_date: '2025-02-01', total_units: 80, typologies_history: [{ period: '2025-02-01', number_bedroom: '3', qty: 80 }] },
    ], options);
    const labels = vgvSummary(cube).map((row) => row.label);
    expect(labels.some((label) => label.startsWith('Condomínio de Casas ·'))).toBe(false);
    expect(labels).not.toContain('Subtotal horizontal');
  });
});

describe('JG-37 · rótulo de tipologia por extenso', () => {
  it('converte número solto em dormitórios e preserva rótulo já editorial', () => {
    expect(typologyDisplayLabel('2')).toBe('2 Dormitórios');
    expect(typologyDisplayLabel('1')).toBe('1 Dormitório');
    expect(typologyDisplayLabel('4+')).toBe('4 ou + Dormitórios');
    expect(typologyDisplayLabel('3 Dormitórios')).toBe('3 Dormitórios');
    expect(typologyDisplayLabel('Não classificado')).toBe('Não classificado');
  });
});
