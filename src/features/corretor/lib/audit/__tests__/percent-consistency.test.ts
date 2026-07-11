// Regressão do cross-check %↔absoluto — usa os números REAIS do bug reportado por
// Gabriel (11/jul): a visão leu 100.198 como 116.817 e 100.850 como 100.895. O %
// declarado desmascara a linha 3; a linha 6 (erro de 45) fica no ruído do arredondamento.

import { describe, it, expect } from 'vitest';
import { checkPercentConsistency } from '../engine';
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
