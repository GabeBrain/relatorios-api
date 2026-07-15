// Regressão do fix de custo (Fase 0): o gpt-4o-mini cobra imagem com multiplicador
// próprio. Antes, calculateImageTokens usava a fórmula do 4o p/ todos → subestimava
// a visão do mini ~7×. Este teste trava o comportamento corrigido.

import { describe, it, expect } from 'vitest';
import { calculateImageTokens, calculateCost } from '../cost-calculator';
import { formatBRL, usdToBrl } from '../v3/config';

describe('calculateImageTokens — multiplicador por modelo', () => {
  // tabela típica ~1400×450: após escala cabe em 3 tiles (768 alto, ceil(w) largura)
  const w = 1400, h = 450;

  it('gpt-4o usa base 85 + 170/tile', () => {
    // min(w,h)=450<768 → sem escala; tilesX=ceil(1400/512)=3, tilesY=1 → 3 tiles
    expect(calculateImageTokens(w, h, 'gpt-4o')).toBe(3 * 170 + 85);
  });

  it('gpt-4o-mini usa base 2833 + 5667/tile (muito maior)', () => {
    expect(calculateImageTokens(w, h, 'gpt-4o-mini')).toBe(3 * 5667 + 2833);
  });

  it('o mini gera ~33× mais tokens de imagem que o 4o', () => {
    const ratio = calculateImageTokens(w, h, 'gpt-4o-mini') / calculateImageTokens(w, h, 'gpt-4o');
    expect(ratio).toBeGreaterThan(25);
  });

  it('estudo de 84 tabelas no mini estima ~R$ 1,5-2,1 (não R$ 0,26)', () => {
    const perImg = calculateImageTokens(w, h, 'gpt-4o-mini') + 450;
    const inTok = 84 * perImg;
    const outTok = 84 * 700;
    const brl = usdToBrl(calculateCost(inTok, outTok, 'gpt-4o-mini'));
    expect(brl).toBeGreaterThan(1.4);
    expect(brl).toBeLessThan(2.2);
  });
});

describe('config — custo em R$', () => {
  it('formata centavos e sub-centavos', () => {
    expect(formatBRL(1 / 5.16)).toBe('R$ 1,00');
    expect(formatBRL(0.0001)).toBe('< R$ 0,01');
  });
});
