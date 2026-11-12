// Regras v0.66 (rodada de Toledo) com dados SINTÉTICOS.
import { describe, expect, it } from 'vitest';
import { checkTableSums } from '../../audit/engine';
import { irToFindings } from '../../audit/ir-rules';
import type { ExtractedTable, Finding } from '../../audit/model';
import type { Ir } from '../../audit/ir';
import type { ExtractedTableRef } from '../ia-vision';
import { reconcileDeckFindings } from '../deck-reconcile';
import { crossTableFindings } from '../cross-table';
import { sourceCrosscheckFindings } from '../source-crosscheck';
import type { Fonte } from '../fonte';

const t = (x: Partial<ExtractedTable>) => ({ title: 'T', columns: [], rows: [], ...x }) as ExtractedTable;
const ref = (slide: number, table: ExtractedTable): ExtractedTableRef => ({ slide, secao: 'LACUNAS', titulo: '', sha1: `h${slide}${table.title}`, table });

describe('raios × deslocamento até ponto de interesse', () => {
  it('“2 min 950 m” e “1,8 km | 5 min” não entram no conjunto de raios', () => {
    const ir = { slides: [
      { n: 20, titulo: 'Zonas de influência', textos: ['5 min', '10 min', '15 min'], secao_canonica: 'ESTRUTURA', tabelas: [] },
      { n: 21, titulo: 'Zonas', textos: ['5 min', '10 min', '15 min'], secao_canonica: 'ESTRUTURA', tabelas: [] },
      { n: 14, titulo: 'Entorno do Terreno', textos: ['Hospital A', '4 min 1,6 km', '2 min 950 m', '1,8 km | 5 min'], secao_canonica: 'ENTORNO', tabelas: [] },
    ] } as unknown as Ir;
    expect(irToFindings(ir).filter((f) => f.type === 'RADII' && !f.ok)).toHaveLength(0);
  });
});

describe('faixa omitida', () => {
  const renda = t({
    title: 'Faixas de renda', columns: ['Faixa', 'Cidade Nº Dom.', 'Estado Nº Dom.'], colKinds: ['label', 'count', 'count'],
    rows: [['a', 30, 300], ['b', 30, 300], ['c', 32, 320]], totals: ['Total', 100, 1000],
  });

  it('marca omittedBand quando todas as colunas ficam abaixo na mesma proporção', () => {
    expect(checkTableSums(renda).omittedBand).toBe(true);
  });

  it('não vai para o aviso agrupado de leitura insegura', () => {
    const f: Finding = { id: 'r', type: 'ABSOLUTE_SUM', section: 'SOCIO', slideRef: 's30', title: 'x', detail: 'discordam entre si', ok: false, confidence: 3, evidenceSha1: 'e',
      viz: { ...checkTableSums(renda), unaligned: false } };
    const out = reconcileDeckFindings([f], []);
    expect(out.map((x) => x.id)).toEqual(['r']);
  });
});

describe('lacunas', () => {
  const block = (title: string, total: number) => t({ title, columns: ['Tipologia', 'A', 'B', 'Total'], rows: [['1 Dormitório', total - 10, 10, total], ['2 Dormitórios', 0, 0, 0]], totals: ['Total', total - 10, 10, total] });

  it('um par basta quando só um dos slides traz a nota de exclusão', () => {
    const ir = { slides: [
      { n: 67, titulo: 'Lacunas | tipologia vs metragem', textos: ['Até 2 km'], secao_canonica: 'LACUNAS' },
      { n: 68, titulo: 'Lacunas | tipologia vs preço', textos: ['Até 2 km', 'Obs.: Não são considerados na análise as unidades duplex, garden, coberturas e esgotados'], secao_canonica: 'LACUNAS' },
    ] } as unknown as Ir;
    const out = crossTableFindings(ir, [ref(67, block('Oferta Lançada', 1481)), ref(68, block('Oferta Lançada', 1295))]).filter((f) => f.type === 'TOTALS_EQUALITY');
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('1.481');
    expect(out[0].detail).toContain('nota de exclusão');
  });

  it('par único com diferença que não tem forma de exclusão não é acusado (SJC: 1.060 × 450)', () => {
    const ir = { slides: [
      { n: 80, titulo: 'Lacunas', textos: ['Compactos'], secao_canonica: 'LACUNAS' },
      { n: 81, titulo: 'Lacunas', textos: ['Compactos', 'Obs.: Não são considerados na análise as unidades duplex, garden, coberturas e esgotados'], secao_canonica: 'LACUNAS' },
    ] } as unknown as Ir;
    const out = crossTableFindings(ir, [ref(80, block('Oferta Lançada', 1060)), ref(81, block('Oferta Lançada', 450))]).filter((f) => f.type === 'TOTALS_EQUALITY');
    expect(out).toHaveLength(0);
  });
});

describe('contagem de acertos', () => {
  it('conta as comparações com a planilha e as que bateram', () => {
    const fonte = { fonte_version: 2, blocos: [{ papel: 'socio', tabela: 'domicilios_por_tipo', arquivo: 'x.xlsx', aba: 'Dom.p Tipo',
      itens: [{ linha: 7, rotulo: 'Apartamento', recortes: { 'Toledo': { '%': 0.1 }, 'Até 1 km': { '%': 0.3 } } }] }] } as unknown as Fonte;
    const ir = { slides: [{ n: 35, titulo: 'Índice de verticalização', textos: ['10,0%\nToledo', '25,0%\nAté 1 km'], secao_canonica: 'SOCIO' }] } as unknown as Ir;
    const tally = { comparados: 0, batem: 0 };
    const found = sourceCrosscheckFindings(ir, fonte, tally);
    expect(tally).toEqual({ comparados: 2, batem: 1 });
    expect(found).toHaveLength(1);
  });
});
