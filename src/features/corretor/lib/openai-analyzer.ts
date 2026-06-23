import { supabase } from '@/integrations/supabase/client';
import { calculateCost } from './cost-calculator';
import type { ModelId, SlideError } from '../store/analysis-store';

export interface AnalysisResult {
  errors: SlideError[];
  hasData: boolean;
  summary: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  skipped: boolean;
}

interface EdgeResponse {
  errors?: SlideError[];
  hasData?: boolean;
  summary?: string;
  inputTokens?: number;
  outputTokens?: number;
  skipped?: boolean;
  error?: string;
}

export async function analyzeSlide(
  base64: string,
  slideNumber: number,
  total: number,
  city: string,
  radii: string,
  model: ModelId
): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke<EdgeResponse>('analyze-slide', {
    body: { base64, slideNumber, total, city, radii, model },
  });

  if (error) throw error;
  if (!data || data.error) {
    throw new Error(data?.error ?? 'Falha na análise do slide');
  }

  const inputTokens = data.inputTokens ?? 0;
  const outputTokens = data.outputTokens ?? 0;
  const cost = calculateCost(inputTokens, outputTokens, model);

  return {
    errors: data.errors ?? [],
    hasData: data.hasData ?? true,
    summary: data.summary ?? '',
    inputTokens,
    outputTokens,
    cost,
    skipped: data.skipped ?? false,
  };
}
