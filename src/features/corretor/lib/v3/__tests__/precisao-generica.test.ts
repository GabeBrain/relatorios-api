// Regras de precisão v0.60 com dados SINTÉTICOS (não do SJC), para que o
// comportamento valha para qualquer estudo e não só para o caso que o motivou.
import { describe, expect, it } from 'vitest';
import { binFromLabel, checkTableSums, crossBands, summableValues } from '../../audit/engine';
import type { ExtractedTable } from '../../audit/model';
import { visionFormatIssues } from '../format-checks';
import { crossTableFindings } from '../cross-table';
import type { Ir } from '../../audit/ir';
import type { ExtractedTableRef } from '../ia-vision';

const t = (x: Partial<ExtractedTable>) => ({ title: 'T', columns: [], rows: [], ...x }) as ExtractedTable;

describe('célula mesclada repetida pela leitura', () => {
  const table = t({
    columns: ['Empreendimento', 'Oferta', 'Unidades'],
    colKinds: ['label', 'count', 'count'],
    rows: [['Alfa', 50, 20], ['Alfa', 50, 30], ['Beta', 40, 40], ['Gama', 10, 10]],
    totals: ['Total', 100, 100],
  });

  it('mesmo rótulo e mesmo valor em linhas seguidas conta uma vez', () => {
    expect(summableValues(table, 1)).toEqual([50, 40, 10]);
    expect(summableValues(table, 2)).toEqual([20, 30, 40, 10]);
  });

  it('a tabela fecha em vez de acusar 150 ≠ 100', () => {
    expect(checkTableSums(table).badColumns).toEqual([]);
  });

  it('valor igual legítimo em sub-linha (nenhuma outra contagem muda) continua somando', () => {
    const legit = t({
      columns: ['Empreendimento', 'Oferta', 'Unidades', 'Preço'], colKinds: ['label', 'count', 'count', 'measure'],
      rows: [['Alfa', 36, 24, 1000], ['Beta', 64, 32, 900], ['Beta', null, 32, 950]], totals: ['Total', 100, 88, null],
    });
    expect(summableValues(legit, 2)).toEqual([24, 32, 32]);
    expect(checkTableSums(legit).badColumns).toEqual([]);
  });

  it('valores iguais em linhas de rótulos diferentes continuam somando', () => {
    const other = t({ columns: ['A', 'N'], rows: [['x', 5], ['y', 5]], totals: ['Total', 10] });
    expect(checkTableSums(other).badColumns).toEqual([]);
  });
});

describe('anomalias de formato da visão', () => {
  it('só passam as confirmadas por regra fixa', () => {
    const anomalies = [
      { texto: '0,125', motivo: 'decimal sem %' },
      { texto: 'R$ 9.000//m²', motivo: 'símbolo', bloco: 'B', linha: 'A', coluna: 'Preço' },
      { texto: '100,0%', motivo: 'inconsistência com a coluna anterior' },
      { texto: '45,5%', motivo: 'percentual com vírgula' },
      { texto: '0.0', motivo: 'artefato gráfico' },
    ];
    const issues = visionFormatIssues(anomalies, [anomalies[1]]);
    expect(issues.map((i) => i.text)).toEqual(['0,125', 'R$ 9.000//m²']);
    expect(issues[0].reason).toContain('12,5%');
    expect(visionFormatIssues(anomalies).map((i) => i.text)).toEqual(['0,125']);
  });
});

describe('faixas com erro de digitação ou letra mal lida', () => {
  it('“Acma de 90 m²” é lida como “Acima de 90”', () => {
    expect(binFromLabel('Acma de 90 m²')).toMatchObject({ from: 90, to: null });
  });

  it('rótulos quase idênticos não são divergência; número diferente é', () => {
    const rows = crossBands(['2 Quartos', 'Cobertura Duplex'], ['2 Quartas', 'Cobertura Duplex'], 'a', 'b');
    expect(rows.every((r) => !r.mismatch)).toBe(true);
    const diff = crossBands(['2 Dormitórios'], ['3 Dormitórios'], 'a', 'b');
    expect(diff[0].mismatch).toBe(true);
  });
});

describe('cruzamento de domicílios entre tabelas', () => {
  const ir = { slides: [] } as unknown as Ir;
  const ref = (slide: number, table: ExtractedTable): ExtractedTableRef => ({ slide, secao: 'SOCIO', titulo: 'Domicílios', sha1: `x${slide}`, table });

  it('tabela com vários recortes lado a lado não entra na comparação', () => {
    const multi = t({ title: 'Domicílios por renda', columns: ['Faixa', 'Estado Nº Dom.', 'Cidade Nº Dom.'], colKinds: ['label', 'count', 'count'], rows: [['a', 900, 90], ['b', 100, 10]], totals: ['Total', 1000, 100] });
    const single = t({ title: 'Domicílios por tipo', columns: ['Tipo', 'Nº Dom.'], colKinds: ['label', 'count'], rows: [['Casa', 80], ['Apto', 20]], totals: ['Total', 100] });
    expect(crossTableFindings(ir, [ref(20, multi), ref(22, single)])).toHaveLength(0);
  });

  it('duas tabelas de um recorte só com totais diferentes continuam acusadas, com os números', () => {
    const a = t({ title: 'Domicílios por tipo', columns: ['Tipo', 'Nº Dom.'], colKinds: ['label', 'count'], rows: [['Casa', 80], ['Apto', 20]], totals: ['Total', 100] });
    const b = t({ title: 'Domicílios por ocupação', columns: ['Condição', 'Nº Dom.'], colKinds: ['label', 'count'], rows: [['Próprio', 70], ['Alugado', 50]], totals: ['Total', 120] });
    const [f] = crossTableFindings(ir, [ref(20, a), ref(22, b)]);
    expect(f?.detail).toContain('100');
    expect(f?.detail).toContain('120');
  });
});
