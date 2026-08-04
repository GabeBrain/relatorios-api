// Aceite do ajuste A (tabela paginada) desenhado no checkpoint de 28/jul e
// decidido em 31/jul. Caso real: Raimundo Leonardi V3 (Toledo/PR) — o trio
// “1099 / 702 / 397” aparece como Total em s42 E s43, com 12 e 24 linhas.

import { describe, expect, it } from 'vitest';

import { resolvePaginatedSums, type SumSlice } from '../paginated-tables';
import type { Cell, ExtractedTable } from '../../audit/model';

const COLUMNS = ['Empreendimento', 'Unidades', 'Vendidas', 'Estoque'];
/** Total do CONJUNTO, repetido em toda fatia — é isso que denuncia a paginação. */
const TOTALS: Cell[] = ['Total', 1099, 702, 397];

function table(rows: Cell[][], overrides: Partial<ExtractedTable> = {}): ExtractedTable {
  return { title: 'Oferta por empreendimento', columns: COLUMNS, rows, totals: TOTALS, ...overrides };
}

function slice(slide: number, rows: Cell[][], overrides: Partial<ExtractedTable> = {}): SumSlice {
  return { slide, section: 'MERCADO', findingId: `iavis-sum-${slide}`, table: table(rows, overrides) };
}

describe('tabela paginada — fatias que repetem o total do conjunto', () => {
  it('soma as fatias e encerra os achados por fatia quando o conjunto fecha', () => {
    const out = resolvePaginatedSums([
      slice(42, [['Alfa', 600, 400, 200], ['Beta', 199, 102, 97]]),
      slice(43, [['Gama', 200, 150, 50], ['Delta', 100, 50, 50]]),
    ]);

    expect([...out.dropIds]).toEqual(['iavis-sum-42', 'iavis-sum-43']);
    expect(out.findings).toEqual([]);
    // as duas fatias contam como tabela verificada no relatório de entrega
    expect(out.verified).toBe(2);
  });

  it('quando o conjunto NÃO fecha, emite UM achado do conjunto em “Verificar”', () => {
    const out = resolvePaginatedSums([
      slice(42, [['Alfa', 600, 400, 200], ['Beta', 199, 102, 97]]),
      slice(43, [['Gama', 100, 150, 50]]),
    ]);

    expect(out.dropIds.size).toBe(2);
    expect(out.findings).toHaveLength(1);
    const [finding] = out.findings;
    expect(finding.id).toBe('paged-sum-42-43');
    expect(finding.slideRef).toBe('s42 × s43');
    // depende de todas as fatias terem sido lidas certo → nunca “Erro”
    expect(finding.confidence).toBe(3);
    expect(finding.detail).toMatch(/fatias da mesma tabela/);
  });

  it('linha repetida entre fatias conta uma vez (leitura duplicada da visão)', () => {
    // “Beta” aparece nas duas fatias; contar duas vezes estouraria o total.
    const out = resolvePaginatedSums([
      slice(42, [['Alfa', 600, 400, 200], ['Beta', 199, 102, 97]]),
      slice(43, [['Beta', 199, 102, 97], ['Gama', 200, 150, 50], ['Delta', 100, 50, 50]]),
    ]);
    expect(out.findings).toEqual([]);
    expect(out.dropIds.size).toBe(2);
  });

  it('não agrupa fatia solta, slides distantes nem total sem assinatura', () => {
    // uma fatia só: sem conjunto, o achado individual continua valendo
    expect(resolvePaginatedSums([slice(42, [['Alfa', 1, 1, 1]])]).dropIds.size).toBe(0);

    // s42 e s60 não são fatias vizinhas — coincidência de total não basta
    const distantes = resolvePaginatedSums([
      slice(42, [['Alfa', 600, 400, 200]]),
      slice(60, [['Gama', 200, 150, 50]]),
    ]);
    expect(distantes.dropIds.size).toBe(0);

    // um único total numérico (ex.: “100%”) repete por acaso o tempo todo
    const umTotal = resolvePaginatedSums([
      slice(42, [['Alfa', 60, 'n/d', 'n/d']], { totals: ['Total', 100, null, null] }),
      slice(43, [['Gama', 20, 'n/d', 'n/d']], { totals: ['Total', 100, null, null] }),
    ]);
    expect(umTotal.dropIds.size).toBe(0);
  });

  it('cabeçalho diferente não é fatia da mesma tabela', () => {
    const out = resolvePaginatedSums([
      slice(42, [['Alfa', 600, 400, 200]]),
      slice(43, [['Gama', 200, 150, 50]], { columns: ['Bairro', 'Domicílios', 'Renda', 'Estoque'] }),
    ]);
    expect(out.dropIds.size).toBe(0);
  });
});
