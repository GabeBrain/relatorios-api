// Corretor v3 — constantes de custo/orçamento do fluxo de passo único.
// Teto por estudo na fase de testes (Gabriel, 11/jul): R$ 4. Acima disso, o
// pipeline pede confirmação; abaixo, roda direto. Subir quando o fluxo estabilizar.

export const BUDGET_STUDY_BRL = 4;

// Câmbio de referência p/ mostrar custo em R$ (custos_visao_reais.md, jul/2026).
export const FX_BRL_PER_USD = 5.16;

// Quantas imagens de tabela a visão processa em paralelo (corta o tempo de
// relógio de ~10 min sequenciais p/ ~2-3 min sem estourar rate-limit da edge).
export const VISION_CONCURRENCY = 5;

export function usdToBrl(usd: number): number {
  return usd * FX_BRL_PER_USD;
}

export function formatBRL(usd: number): string {
  const brl = usdToBrl(usd);
  if (brl > 0 && brl < 0.01) return '< R$ 0,01';
  return `R$ ${brl.toFixed(2).replace('.', ',')}`;
}
