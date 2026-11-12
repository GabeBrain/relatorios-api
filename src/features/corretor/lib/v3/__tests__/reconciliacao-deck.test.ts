// Regras v0.61 (reconciliação no nível do deck) com dados SINTÉTICOS.
import { describe, expect, it } from 'vitest';
import { binFromLabel, binsFromColumns, checkTableSums, detectBinGap } from '../../audit/engine';
import { ziLabelFindings } from '../../audit/ir-rules';
import type { ExtractedTable, Finding } from '../../audit/model';
import type { Ir } from '../../audit/ir';
import { stitchColumnSplits, type ExtractedTableRef } from '../ia-vision';
import { reconcileDeckFindings } from '../deck-reconcile';
import { crossTableFindings } from '../cross-table';
import { evidenceInSlide } from '../ia-text';

const t = (x: Partial<ExtractedTable>) => ({ title: 'T', columns: [], rows: [], ...x }) as ExtractedTable;
const ref = (slide: number, table: ExtractedTable, secao = 'LACUNAS'): ExtractedTableRef => ({ slide, secao, titulo: '', sha1: `h${slide}${table.title}`, table });

describe('faixas', () => {
  it('“Abaixo de X” é faixa aberta por baixo e a sobreposição aparece mesmo com colunas Absoluto/%', () => {
    expect(binFromLabel('Abaixo de R$ 5.500,00')).toMatchObject({ from: 0, to: 5500 });
    const bins = binsFromColumns(['Abaixo de R$ 5.500,00 | Absoluto', 'Abaixo de R$ 5.500,00 | %', 'R$ 5.000,01 a R$ 8.000,00 | Absoluto', 'R$ 5.000,01 a R$ 8.000,00 | %']);
    expect(detectBinGap(bins).description).toContain('Sobreposição entre «Abaixo de R$ 5.500,00»');
  });
});

describe('tabela larga cortada em fatias pela leitura', () => {
  const slice = (title: string, a: number, b: number) => ({ title, columns: ['Cidade', 'Absoluto', '%'], rows: [['A', a, 50], ['B', b, 50], ['C', 1, 0]], totals: ['Total geral', a + b + 1, null] });

  it('fatias com os mesmos rótulos de linha são costuradas lado a lado', () => {
    const out = stitchColumnSplits([slice('Faixa 1', 10, 20), slice('Faixa 2', 5, 6)]);
    expect(out).toHaveLength(1);
    expect(out[0].columns).toEqual(['Cidade', 'Faixa 1 | Absoluto', 'Faixa 1 | %', 'Faixa 2 | Absoluto', 'Faixa 2 | %']);
    expect(out[0].rows?.[0]).toEqual(['A', 10, 50, 5, 50]);
  });

  it('blocos empilhados (Oferta Lançada / Final) não são costurados', () => {
    const block = (title: string) => ({ title, columns: ['Faixa', '30m²', 'Total'], rows: [['Até R$ 5 mil', 1, 1], ['De R$ 5 a 6 mil', 2, 2], ['Acima de R$ 6 mil', 3, 3]], totals: ['Total', 6, 6] });
    expect(stitchColumnSplits([block('Oferta Lançada'), block('Oferta Final')])).toHaveLength(2);
  });
});

describe('somas', () => {
  it('totais compactos casam pelo valor e acusam a coluna que não fecha', () => {
    const table = t({
      columns: ['Nome', 'Oferta', 'Quartos', 'Unidades'], colKinds: ['label', 'count', 'count', 'count'],
      rows: [['A', 30, 2, 20], ['B', 70, 3, 60]], totals: ['Total', 100, 90],
    });
    const viz = checkTableSums(table);
    expect(viz.totalsByFit).toBe(true);
    expect(viz.notes?.[0]).toContain('«Unidades»: soma 80 ≠ total 90');
  });

  it('coluna com célula não lida vira leitura incompleta, não erro', () => {
    const table = t({ columns: ['Cidade', 'N', 'M', 'Total'], rows: [['A', 10, 2, 12], ['B', null, 3, 8], ['C', 3, 1, 4]], totals: ['Total', 18, 6, 24] });
    const viz = checkTableSums(table);
    expect(viz.incoherentReading).toBe(true);
    expect(viz.notes?.at(-1)).toContain('leitura veio incompleta');
  });
});

describe('reconciliação no nível do deck', () => {
  const typo = (slide: number, text: string): Finding => ({
    id: `iavis-labeltypo-${slide}`, type: 'SPELLING', section: 'SOCIO', slideRef: `s${slide}`, title: 't', detail: 'd', ok: false,
    viz: { kind: 'table', table: { title: 'Formato', columns: ['Onde', 'Texto', 'Inc'], rows: [['rótulo', text, `«${text.split(' ')[0]}» parece erro de digitação de «Abaixo»`]] } },
  });

  it('erro de digitação some quando o rótulo aparece escrito certo em outra tabela', () => {
    const tables = [ref(10, t({ title: 'x', columns: ['Cidade', 'Abaixo de R$ 1.000,00'], rows: [['A', 1], ['B', 2]] }))];
    expect(reconcileDeckFindings([typo(11, 'Abaxo de R$ 1.000,00')], tables)).toHaveLength(0);
    expect(reconcileDeckFindings([typo(11, 'Abaxo de R$ 2.000,00')], tables)).toHaveLength(1);
  });

  it('furo de faixa some quando outra tabela mostra a faixa que faltou', () => {
    const bins = binsFromColumns(['Até R$ 10', 'De R$ 11 a R$ 20', 'Acima de R$ 30']);
    const gap = detectBinGap(bins);
    const f: Finding = { id: 'g', type: 'BINNING_RULE', section: 'LACUNAS', slideRef: 's20', title: 'x', detail: gap.description!, ok: false, evidenceSha1: 'x',
      viz: { kind: 'binrange', unit: '', bins: gap.normalizedBins!, gapAfterIndex: gap.gapAfterIndex, gapDescription: gap.description } };
    const full = ref(21, t({ columns: ['T', 'Até R$ 10', 'De R$ 11 a R$ 20', 'De R$ 21 a R$ 30', 'Acima de R$ 30'], rows: [['a', 1, 1, 1, 1], ['b', 1, 1, 1, 1]] }));
    expect(reconcileDeckFindings([f], [full])).toHaveLength(0);
    expect(reconcileDeckFindings([f], [])).toHaveLength(1);
  });

  it('somas de leitura insegura viram um aviso único de cobertura', () => {
    const unsafe = (slide: number): Finding => ({ id: `u${slide}`, type: 'ABSOLUTE_SUM', section: 'SOCIO', slideRef: `s${slide}`, title: 'x', detail: 'd', ok: false, confidence: 3, evidenceSha1: 'e',
      viz: { kind: 'table', table: t({}), unaligned: true } });
    const out = reconcileDeckFindings([unsafe(5), unsafe(9)], []);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('IMAGE_NOT_READ');
    expect(out[0].detail).toContain('s5, s9');
  });
});

describe('totais entre análises de lacunas', () => {
  const ir = { slides: [20, 21, 22].map((n) => ({ n, titulo: 'Lacunas', textos: ['Recorte X'], secao_canonica: 'LACUNAS' })) } as unknown as Ir;
  const block = (total: number) => t({ title: 'Oferta Lançada', columns: ['Tipologia', 'A', 'B', 'Total'], rows: [['1 Dormitório', total - 10, 10, total], ['2 Dormitórios', 0, 0, 0]], totals: ['Total', total - 10, 10, total] });

  it('acusa o slide que destoa de dois outros que concordam', () => {
    const out = crossTableFindings(ir, [ref(20, block(120)), ref(21, block(100)), ref(22, block(100))]).filter((f) => f.type === 'TOTALS_EQUALITY');
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('O s20 soma 120');
  });

  it('com só dois slides divergentes, não há consenso e a regra se abstém', () => {
    const out = crossTableFindings(ir, [ref(20, block(120)), ref(21, block(100))]).filter((f) => f.type === 'TOTALS_EQUALITY');
    expect(out).toHaveLength(0);
  });
});

describe('texto', () => {
  it('Z.I. entre parênteses depois do raio não é ligada ao raio da frase seguinte', () => {
    const ir = { slides: [
      { n: 5, titulo: 'Z.I.', textos: ['Z.I. Primária: 2 km; Z.I. Secundária: 4 km'], secao_canonica: 'ESTRUTURA' },
      { n: 9, titulo: 'Conclusão', textos: ['O raio de 2 km (Z.I. primária) tem 100 domicílios e o raio de 4 km (Z.I. secundária), 300.'], secao_canonica: 'SOCIO' },
    ] } as unknown as Ir;
    expect(ziLabelFindings(ir)).toHaveLength(0);
  });

  it('evidência citada pela IA precisa existir no slide', () => {
    expect(evidenceInSlide('A cidade possui mais de 100 opções.', 'mais de 100 opções', true)).toBe(true);
    expect(evidenceInSlide('Casa de 400 m2, 4 suítes', 'são mais de 100 opções', true)).toBe(false);
    expect(evidenceInSlide('qualquer', undefined, true)).toBe(false);
  });
});
