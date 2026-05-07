import OpenAI from 'openai';
import { calculateCost } from './cost-calculator';
import type { ModelId, SlideError } from '../store/analysis-store';

let _client: OpenAI | null = null;
let _lastKey = '';

function getClient(apiKey: string): OpenAI {
  if (!_client || apiKey !== _lastKey) {
    _client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    _lastKey = apiKey;
  }
  return _client;
}

export interface AnalysisResult {
  errors: SlideError[];
  hasData: boolean;
  summary: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  skipped: boolean;
}

function buildPrompt(slideNumber: number, total: number, city: string, radii: string): string {
  return `Você é um revisor especializado em apresentações de Estudos Vocacionais do mercado imobiliário brasileiro.

Você está analisando o slide ${slideNumber} de ${total} de um estudo sobre a cidade de "${city}".
Os raios de estudo esperados para este projeto são: ${radii}.

REGRA FUNDAMENTAL: Verifique SEMPRE — em qualquer tipo de slide (capa, título, seção, tabela, gráfico):
- CITY_NAME: Se qualquer nome de cidade aparecer no slide (em títulos, subtítulos, barras de busca, legendas, rodapés, tabelas), verifique se é "${city}". Qualquer outra cidade é um erro a reportar.
- SPELLING: Se houver texto legível, verifique erros de ortografia em português.

Apenas se o slide contiver tabelas com dados numéricos, verifique também:
- PERCENTAGE_SUM: Cada coluna de percentual (%) deve somar 100% na linha "Total"/"TOTAL".
- RADII: Referências a raios/zonas de tempo devem ser: ${radii}.
- COHERENCE: Números citados em texto descritivo devem coincidir com os valores da tabela.

Slides sem absolutamente nenhum texto legível (apenas foto de fundo pura, sem palavras nem números) retorne:
{"noReview": true, "reason": "slide sem texto legível"}

Para todos os outros slides, retorne exatamente este JSON (sem markdown, sem blocos de código):
{
  "errors": [
    {
      "type": "CITY_NAME",
      "severity": "HIGH",
      "description": "Descrição clara do erro em português",
      "location": "Localização exata no slide, ex: Barra de busca do título, Cabeçalho da tabela"
    }
  ],
  "hasData": true,
  "summary": "Resumo breve do que foi verificado"
}

Se não houver erros, retorne: {"errors": [], "hasData": true, "summary": "Slide verificado sem erros."}`;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error &&
        'status' in err &&
        (err as { status?: number }).status === 429;
      if (isRateLimit && attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function analyzeSlide(
  base64: string,
  slideNumber: number,
  total: number,
  city: string,
  radii: string,
  model: ModelId,
  apiKey: string
): Promise<AnalysisResult> {
  const client = getClient(apiKey);
  const prompt = buildPrompt(slideNumber, total, city, radii);

  const response = await withRetry(() =>
    client.chat.completions.create({
      model,
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    })
  );

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const cost = calculateCost(inputTokens, outputTokens, model);

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(response.choices[0].message.content ?? '{}');
  } catch {
    parsed = { errors: [], hasData: false, summary: 'Erro ao processar resposta da IA' };
  }

  if (parsed.noReview) {
    return {
      errors: [],
      hasData: false,
      summary: (parsed.reason as string) ?? 'Slide ignorado',
      inputTokens,
      outputTokens,
      cost,
      skipped: true,
    };
  }

  return {
    errors: (parsed.errors as SlideError[]) ?? [],
    hasData: (parsed.hasData as boolean) ?? true,
    summary: (parsed.summary as string) ?? '',
    inputTokens,
    outputTokens,
    cost,
    skipped: false,
  };
}
