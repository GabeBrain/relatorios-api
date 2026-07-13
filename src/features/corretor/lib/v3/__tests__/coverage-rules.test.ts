import { describe, expect, it } from 'vitest';
import type { Ir } from '../../audit/ir';
import { checkProjectionSeries, checkUnitPlausibility } from '../../audit/engine';
import { ataCoverageFindings, requiredAndExclusionFindings, sourceFindingsFromVision } from '../coverage-rules';
import { crossTableFindings, projectionFindings } from '../cross-table';

const ir = (slides: Ir['slides']): Ir => ({ ir_version: 1, arquivo: 'teste', n_slides: slides.length, slides });
const slide = (n: number, secao_canonica: string, titulo: string, textos: string[] = []) => ({
  n, titulo, secao_canonica, textos, fontes: [], notas: [], notas_edicao: [], notas_revisao: [], tabelas: [], graficos: [], n_imagens: 0,
});

describe('Coverage 90 — regras puras finais', () => {
  it('acha faixas de renda diferentes entre socio e absorção', () => {
    const study = ir([slide(10, 'SOCIO', 'Domicílios por faixa de renda'), slide(20, 'ABSORCAO', 'Absorção por renda')]);
    const refs = [
      { slide: 10, secao: 'SOCIO', titulo: 'Domicílios por faixa de renda', sha1: 'a', table: { title: 'Domicílios por renda', columns: ['Faixa', 'Qtd'], rows: [['Até 10 mil', 1], ['Acima de 10 mil', 2]] } },
      { slide: 20, secao: 'ABSORCAO', titulo: 'Absorção por renda', sha1: 'b', table: { title: 'Renda', columns: ['Faixa', 'Qtd'], rows: [['Até 15 mil', 1], ['Acima de 15 mil', 2]] } },
    ];
    expect(crossTableFindings(study, refs).some((f) => f.type === 'CROSS_TABLE_MISMATCH')).toBe(true);
  });

  it('aceita faixas equivalentes com formatação diferente', () => {
    const study = ir([slide(10, 'SOCIO', 'Domicílios por faixa de renda'), slide(20, 'ABSORCAO', 'Absorção por renda')]);
    const refs = [
      { slide: 10, secao: 'SOCIO', titulo: 'Domicílios por faixa de renda', sha1: 'a', table: { title: 'Domicílios por renda', columns: ['Faixa', 'Qtd'], rows: [['Até R$ 2.000', 1], ['Acima de R$ 2.000', 2]] } },
      { slide: 20, secao: 'ABSORCAO', titulo: 'Absorção por renda', sha1: 'b', table: { title: 'Renda', columns: ['Faixa', 'Qtd'], rows: [['De R$ 0 a R$ 2.000', 1], ['Acima de R$ 2.000', 2]] } },
    ];
    expect(crossTableFindings(study, refs).filter((f) => f.type === 'CROSS_TABLE_MISMATCH')).toEqual([]);
  });

  it('não trata oferta histórica por ano como projeção', () => {
    const refs = [{
      slide: 50, secao: 'MERCADO', titulo: 'Oferta lançada por ano de lançamento', sha1: 'a', source: 'vision' as const,
      table: { title: 'Oferta', columns: ['Padrão', 'Var. %', '2018', '2019', '2020'], rows: [['Médio', 2, 10, 4, 18]] },
    }];
    expect(projectionFindings(refs, 2026)).toEqual([]);
  });

  it('não cruza linhas de lacunas com eixos diferentes sem bins comparáveis', () => {
    const study = ir([slide(120, 'LACUNAS', 'Lacunas por tipologia e metragem'), slide(121, 'LACUNAS', 'Lacunas por preço e metragem')]);
    const refs = [
      { slide: 120, secao: 'LACUNAS', titulo: 'Lacunas', sha1: 'a', table: { title: 'Tipologia x metragem', columns: ['Tipo', 'Oferta'], rows: [['2 dorms', 1], ['3 dorms', 2]] } },
      { slide: 121, secao: 'LACUNAS', titulo: 'Lacunas', sha1: 'b', table: { title: 'Preço x metragem', columns: ['Preço', 'Oferta'], rows: [['R$ 200 mil', 1], ['R$ 300 mil', 2]] } },
    ];
    expect(crossTableFindings(study, refs).filter((f) => f.slideRef.includes('120') && f.slideRef.includes('121'))).toEqual([]);
  });

  it('não compara total de participação como total de população', () => {
    const study = ir([slide(10, 'SOCIO', 'População por renda'), slide(11, 'SOCIO', 'População por idade')]);
    const refs = [
      { slide: 10, secao: 'SOCIO', titulo: 'População', sha1: 'a', table: { title: 'População', columns: ['Faixa', 'População', '%'], colKinds: ['label', 'count', 'share'], rows: [['A', 1000, 50], ['B', 1000, 50]], totals: ['Total', 2000, 100] } },
      { slide: 11, secao: 'SOCIO', titulo: 'População', sha1: 'b', table: { title: 'População', columns: ['Faixa', 'População', '%'], colKinds: ['label', 'count', 'share'], rows: [['A', 1000, 50], ['B', 1000, 50]], totals: ['Total', 2000, 100] } },
    ];
    expect(crossTableFindings(study, refs).filter((f) => f.type === 'CROSS_TABLE_MISMATCH')).toEqual([]);
  });

  it('não acusa fonte em imagem que não foi analisada', () => {
    const study = ir([{ ...slide(8, 'SOCIO', 'Mapa de renda'), n_imagens: 1 }]);
    expect(sourceFindingsFromVision(study, [], [])).toEqual([]);
  });

  it('marca pedido da ata quando não encontra evidência e aceita produto proposto', () => {
    const study = ir([slide(1, 'IDENTIFICACAO', 'Produto proposto', ['Empreendimento com 8 torres'])]);
    const findings = ataCoverageFindings(study, {
      cliente: null, projeto: null, cidade: null, uf: null, localizacao_fonte: null, endereco: null, bairro: null,
      area_terreno_m2: null, preco_m2_viabilidade: null, observacoes_localizacao: [], duvidas_cliente: [],
      pedidos_analista: ['Trazer tabela de lacunas de vagas'], produto: { torres: 8, unidades: null, dorms: null, m2_min: null, m2_max: null, vagas_pct: null, programa: null, observacoes: [] },
    });
    expect(findings[0].ok).toBe(false);
    expect(findings[0].viz?.kind === 'text' && findings[0].viz.checklist?.some((x) => x.label.startsWith('Produto') && x.status === 'ok')).toBe(true);
  });

  it('pega aritmética de ficha e série de projeção fora da taxa', () => {
    expect(checkUnitPlausibility([{ tipologia: '2 dorms', m2: 50, vagas: 1, preco: 500000, preco_m2: 8000 }])?.badRows).toEqual([0]);
    const viz = checkProjectionSeries({ title: 'Projeção população', columns: ['Indicador', 'Taxa anual %', '2027', '2028', '2029'], rows: [['População', 10, 100, 110, 150]] });
    expect(viz?.badRows).toEqual([0]);
  });

  it('exige nota de segunda moradia e exclusões de lacunas', () => {
    const study = ir([slide(1, 'ABSORCAO', 'Absorção'), slide(2, 'LACUNAS', 'Lacunas')]);
    const findings = requiredAndExclusionFindings(study, []);
    expect(findings.map((f) => f.type)).toEqual(expect.arrayContaining(['REQUIRED_NOTE', 'EXCLUSION_RULE']));
  });
});
