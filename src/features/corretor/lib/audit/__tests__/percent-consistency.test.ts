// Regressão do cross-check %↔absoluto e das somas — casos REAIS dos testes do
// Gabriel (11/jul):
// 1) a visão leu 100.198 como 116.817 e 100.850 como 100.895 → o % desmascara a
//    linha 3; a linha 6 (erro de 45) fica no ruído do arredondamento.
// 2) tabela de tipologias (m²/R$/m² + Oferta Final Abs+%): o % do fim pareado com
//    a 1ª coluna numérica gerava 4 falsos positivos → % pareia com a coluna à ESQUERDA.
// 3) linha final que é MÉDIA ("Média Geral" 47; "Vendas s/ O.L." 82,2) não é soma.

import { describe, it, expect } from 'vitest';
import { checkPercentConsistency, checkTableSums } from '../engine';
import { toExtracted } from '../../v3/ia-vision';
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

// ── caso real s28: a visão derrubou o rótulo "Total" e os totais escorregaram ──
// uma célula à esquerda (16.848.551 caiu na coluna de rótulos, 100 sob "SP Abs."…)
// → toda coluna comparava com o total errado. toExtracted realinha.
describe('realinhamento de totais deslocados (s28)', () => {
  const rawS28 = {
    title: 'Domicílios por número de moradores',
    columns: ['MORADORES', 'SP Abs.', 'SP %', 'São Paulo Abs.', 'São Paulo %', 'Até 10 Abs.', 'Até 10 %'],
    rows: [
      ['1 morador', 2143822, 12.7, 612693, 13.8, 4280, 10.8],
      ['2 moradores', 4107806, 24.4, 1098442, 24.8, 8767, 22.1],
      ['3 moradores', 4451380, 26.4, 1129626, 25.5, 10733, 27.0],
      ['4 moradores', 3492130, 20.7, 908485, 20.5, 8772, 22.1],
      ['5 ou mais', 2653414, 15.7, 687524, 15.5, 7187, 18.1],
    ],
    // SEM o rótulo "Total" — deslocado, como a visão devolveu
    totals: [16848551, 100, 4436770, 100, 39739, 100],
  };

  it('reinsere o rótulo e realinha os totais às colunas', () => {
    const ext = toExtracted(rawS28)!;
    expect(ext.totals?.[0]).toBe('Total');
    expect(ext.totals?.[1]).toBe(16848551); // sob "SP Abs.", não sob rótulos
  });

  it('após realinhar, checkTableSums verifica a tabela sem achado', () => {
    const ext = toExtracted(rawS28)!;
    const viz = checkTableSums(ext, { absTol: Math.max(0.5, ext.rows.length / 2) });
    expect(viz.badColumns).toEqual([]); // somas fecham (diferenças de 1 = arredondamento)
  });
});

// ── caso real s39: linha "A partir de 2022" é SUBTOTAL (re-agrega 2022+) ──────
// Somar todas as linhas conta os anos duas vezes (Nº: 8+10+5+15+11+41=90 ≠ 49).
describe('subtotal no meio da tabela (s39)', () => {
  const s39: ExtractedTable = {
    title: 'Oferta lançada e final por ano de lançamento',
    columns: ['Ano Lançamento', 'Nº de Empreend.', 'Em %', 'Oferta Lançada', 'Em %', 'Oferta Final', 'Em %'],
    totals: ['Total', 49, 100, 12924, 100, 2301, 100],
    rows: [
      ['Até 2021', 8, 16.3, 1971, 15.3, 80, 3.5],
      ['2022', 10, 20.4, 1807, 14.0, 168, 7.3],
      ['2023', 5, 10.2, 776, 6.0, 85, 3.7],
      ['2024', 15, 30.6, 5151, 39.9, 543, 23.6],
      ['2025', 11, 22.4, 3219, 24.9, 1425, 61.9],
      ['2026*', null, null, null, null, null, null],
      ['A partir de 2022', 41, 84, 10953, 85, 2221, 97],
    ],
  };

  it('reconhece o subtotal e não gera achado', () => {
    const viz = checkTableSums(s39, { absTol: Math.max(0.5, s39.rows.length / 2) });
    expect(viz.badColumns).toEqual([]); // excluindo "A partir de 2022", tudo fecha
  });

  it('dígito mal lido NÃO se esconde atrás do subtotal', () => {
    const adulterada: ExtractedTable = {
      ...s39,
      rows: s39.rows.map((r, i) => (i === 2 ? [r[0], r[1], r[2], 876, r[4], r[5], r[6]] : r)), // 776 → 876
    };
    const viz = checkTableSums(adulterada, { absTol: Math.max(0.5, s39.rows.length / 2) });
    expect(viz.badColumns.length).toBeGreaterThan(0); // nenhuma exclusão única conserta tudo
  });
});
