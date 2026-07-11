import type { ModelId } from '../store/analysis-store';
export type { ModelId };

export const MODEL_PRICING: Record<ModelId, { inputPer1M: number; outputPer1M: number; label: string }> = {
  'gpt-4o': {
    inputPer1M: 2.5,
    outputPer1M: 10.0,
    label: 'GPT-4o — Preciso',
  },
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.6,
    label: 'GPT-4o Mini — Econômico',
  },
};

// OpenAI high-detail image token calculation.
// Conta os tiles de 512px, depois aplica base + custo/tile do MODELO. O gpt-4o-mini
// cobra imagem com um multiplicador próprio (~33×): base 2.833 + 5.667/tile, enquanto
// o gpt-4o usa base 85 + 170/tile. Ignorar isso subestimava o custo de visão do mini
// em ~7× no painel de estimativa (o custo cobrado, via `usage`, sempre esteve certo).
// Fonte: OpenAI pricing (jul/2026) + docs/features/corretor-vocacionais/custos_visao_reais.md
const IMAGE_TOKEN_RATES: Record<ModelId, { base: number; perTile: number }> = {
  'gpt-4o': { base: 85, perTile: 170 },
  'gpt-4o-mini': { base: 2833, perTile: 5667 },
};

export function calculateImageTokens(
  widthPx: number,
  heightPx: number,
  model: ModelId = 'gpt-4o',
  detail: 'low' | 'high' = 'high'
): number {
  const rate = IMAGE_TOKEN_RATES[model];
  if (detail === 'low') return rate.base;

  let w = widthPx;
  let h = heightPx;

  if (w > 2048 || h > 2048) {
    const scale = 2048 / Math.max(w, h);
    w = Math.floor(w * scale);
    h = Math.floor(h * scale);
  }

  if (Math.min(w, h) > 768) {
    const scale = 768 / Math.min(w, h);
    w = Math.floor(w * scale);
    h = Math.floor(h * scale);
  }

  const tilesX = Math.ceil(w / 512);
  const tilesY = Math.ceil(h / 512);
  return tilesX * tilesY * rate.perTile + rate.base;
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelId
): number {
  const p = MODEL_PRICING[model];
  return (inputTokens / 1_000_000) * p.inputPer1M + (outputTokens / 1_000_000) * p.outputPer1M;
}

const SLIDE_W = 1440;
const SLIDE_H = 810;
const AVG_PROMPT_TOKENS = 480;
const AVG_OUTPUT_TOKENS = 320;

export function estimateProjectCost(slideCount: number, model: ModelId) {
  const imageTokens = calculateImageTokens(SLIDE_W, SLIDE_H, model);
  const totalInputPerSlide = imageTokens + AVG_PROMPT_TOKENS;
  const perSlide = calculateCost(totalInputPerSlide, AVG_OUTPUT_TOKENS, model);
  return {
    perSlide,
    total: perSlide * slideCount,
    imageTokens,
    promptTokens: AVG_PROMPT_TOKENS,
    outputTokens: AVG_OUTPUT_TOKENS,
  };
}

export function formatUSD(value: number): string {
  if (value < 0.0001) return '< $0.0001';
  return `$${value.toFixed(4)}`;
}

export function formatUSDTotal(value: number): string {
  return `$${value.toFixed(4)}`;
}
