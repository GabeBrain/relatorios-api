// Regressão do cross-check %↔absoluto e das somas — casos REAIS dos testes do
// Gabriel (11/jul):
// 1) a visão leu 100.198 como 116.817 e 100.850 como 100.895 → o % desmascara a
//    linha 3; a linha 6 (erro de 45) fica no ruído do arredondamento.
// 2) tabela de tipologias (m²/R$/m² + Oferta Final Abs+%): o % do fim pareado com
//    a 1ª coluna numérica gerava 4 falsos positivos → % pareia com a coluna à ESQUERDA.
// 3) linha final que é MÉDIA ("Média Geral" 47; "Vendas s/ O.L." 82,2) não é soma.

import { describe, it, expect } from 'vitest';
import { checkPercentConsistency, checkTableSums } from '../engine';
import type { ExtractedTable } from '../model';

const cols = ['De 10 a 15 min', 'Absoluto', '%'];
const totals = ['Total', 680682, 100];

// tabela como a imagem original (correta) → nada a apontar
const correct: ExtractedTable = {
  title: 'De 10 a 15 min',
  columns: cols,
  totals,
  rows: [
    ['a', 199638, 29.3],
    ['b', 46719, 6.9],
    ['c', 100198, 14.7],
    ['d', 150550, 22.1],
    ['e', 82727, 12.2],
    ['f', 100850, 14.8],
  ],
};

// tabela como a visão extraiu (com os dígitos mal lidos)
const misread: ExtractedTable = {
  ...correct,
  rows: [
    ['a', 199638, 29.3],
    ['b', 46719, 6.9],
    ['c', 116817, 14.7], // ✗ deveria ser 100.198
    ['d', 150550, 22.1],
    ['e', 82727, 12.2],
    ['f', 100895, 14.8], // erro pequeno (100.850) — dentro do ruído
  ],
};

describe('checkPercentConsistency', () => {
  it('não acusa nada na tabela correta', () => {
    const viz = checkPercentConsistency(correct);
    expect(viz).not.toBeNull();
    expect(viz!.badRows).toEqual([]);
  });

  it('aponta a LINHA 3 na extração com dígito mal lido', () => {
    const viz = checkPercentConsistency(misread);
    expect(viz).not.toBeNull();
    expect(viz!.badRows).toContain(2); // índice 2 = linha «c»
    expect(viz!.badRows).not.toContain(5); // linha «f» (erro de 45) fica no ruído
    expect(viz!.notes?.[0]).toMatch(/116817|dígito mal lido/i);
  });

  it('devolve null quando não há par absoluto+%', () => {
    const semPct: ExtractedTable = {
      title: 't', columns: ['Faixa', 'Domicílios'],
      rows: [['a', 10], ['b', 20]], totals: ['Total', 30],
    };
    expect(checkPercentConsistency(semPct)).toBeNull();
  });
});

// ── caso real: tabela de tipologias (imagem s47 do teste do Gabriel) ─────────
// m²/R$ são MÉDIAS por linha; o único par abs+% é Oferta Final. O bug antigo
// pareava o % com "m² Mínimo" → 4 falsos positivos ("24 seria 10.4%…").
const tipologias: ExtractedTable = {
  title: 'Tipologias',
  columns: ['Tipologia', 'm² Mínimo', 'm² Média', 'm² Máximo', 'R$/m² Mínimo', 'R$/m² Média', 'R$/m² Máximo', 'Oferta Final', '%'],
  totals: ['Média Geral', null, 47, null, null, 9083, null, 2301, 100],
  rows: [
    ['1 Dormitório', 24, 25, 28, 7014, 8883, 9416, 171, 7.4],
    ['2 Dormitórios', 31, 41, 70, 5996, 8417, 14452, 1776, 77.2],
    ['3 Dormitórios', 58, 88, 207, 8425, 10498, 15000, 300, 13.0],
    ['4 Dormitórios', 118, 168, 226, 11527, 12651, 14150, 54, 2.3],
  ],
};

// ── caso real: lacunas por padrão (imagem s37) — Vendas s/ O.L. fecha em MÉDIA ──
const padroes: ExtractedTable = {
  title: 'Padrões',
  columns: ['Padrão', 'Nº de Empreend.', '%', 'Oferta Lançada', '%', 'Oferta Final', '%', 'Vendas s/ O.L.', 'Disp. s/ O.L.'],
  totals: ['Total', 49, 100, 12924, 100, 2301, 100, 82.2, 17.8],
  rows: [
    ['Econômico', 19, 38.8, 7165, 55.4, 1338, 58.1, 81.3, 18.7],
    ['Standard', 19, 38.8, 4288, 33.2, 797, 34.6, 81.4, 18.6],
    ['Médio', 6, 12.2, 1156, 8.9, 43, 1.9, 96.3, 3.7],
    ['Alto', 2, 4.1, 124, 1.0, 24, 1.0, 80.6, 19.4],
    ['Luxo', 3, 6.1, 191, 1.5, 99, 4.3, 48.2, 51.8],
  ],
};

describe('pareamento % ↔ coluna à esquerda (tabela de tipologias)', () => {
  it('não gera falso positivo: % valida só contra Oferta Final, não contra m²', () => {
    const viz = checkPercentConsistency(tipologias);
    expect(viz).not.toBeNull();
    expect(viz!.badRows).toEqual([]); // 171/2301=7.4%, 1776→77.2%, 300→13.0%, 54→2.3% ✓
  });

  it('checkTableSums não acusa as colunas de MÉDIA (m², R$/m²)', () => {
    const viz = checkTableSums(tipologias, { absTol: 2 });
    expect(viz.badColumns).toEqual([]); // 47 e 9.083 caem entre min e max → médias
  });
});

describe('linha final que é média (Vendas s/ O.L. = 82,2%)', () => {
  it('checkTableSums não acusa "soma 387,8 ≠ total 82,2"', () => {
    const viz = checkTableSums(padroes, { absTol: 2.5 });
    // Vendas s/O.L. (82,2 entre 48,2 e 96,3) e Disp. (17,8 entre 3,7 e 51,8) são médias
    expect(viz.badColumns).toEqual([]);
  });

  it('cross-check valida os 3 pares abs+% sem falso positivo', () => {
    const viz = checkPercentConsistency(padroes, { tolPp: 0.6 });
    expect(viz).not.toBeNull();
    expect(viz!.badRows).toEqual([]);
  });

  it('e ainda pega dígito mal lido num dos pares', () => {
    const adulterada: ExtractedTable = {
      ...padroes,
      rows: padroes.rows.map((r, i) => (i === 1 ? [...r.slice(0, 3), 4888, ...r.slice(4)] : r)), // 4.288 → 4.888
    };
    const viz = checkPercentConsistency(adulterada, { tolPp: 0.6 });
    expect(viz!.badRows).toContain(1); // Standard: 4.888 seria 37,8%, tabela diz 33,2%
  });
});
