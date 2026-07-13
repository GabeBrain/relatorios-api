import { describe, expect, it } from 'vitest';
import type { Ir } from '../../audit/ir';
import { checkProjectionSeries, checkUnitPlausibility } from '../../audit/engine';
import { ataCoverageFindings, requiredAndExclusionFindings } from '../coverage-rules';
import { crossTableFindings } from '../cross-table';

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
