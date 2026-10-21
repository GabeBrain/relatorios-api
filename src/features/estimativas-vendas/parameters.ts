/** Coeficientes arredondados publicados no slide 7 do PPTX Finotti, 21/10/2026. */
export const HORIZONTAL_PARAMETERS = {
  version: 'finotti-horizontal-ppt-2026-10-21',
  source: 'docs/features/estimativas-vendas/fontes/EXTRACAO_PPTX_2026-10-21.md#slide-7',
  aberto: { c0: 0.186, c1: 0.291, c2: -0.382, c3: -0.019, tailMonths: 5 },
  fechado: { c0: 0.061, c1: 0.227, c2: -0.382, c3: -0.037, tailMonths: 6 },
} as const;

export type HorizontalPattern = 'aberto' | 'fechado';
