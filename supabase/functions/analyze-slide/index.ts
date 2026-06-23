// Edge Function: analyze-slide
// Proxia a análise de um slide para a OpenAI usando o secret OPENAI_API_KEY.
// A chave nunca é exposta ao frontend.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ModelId = 'gpt-4o' | 'gpt-4o-mini';

interface RequestBody {
  base64: string;
  slideNumber: number;
  total: number;
  city: string;
  radii: string;
  model: ModelId;
}

function buildPrompt(
  slideNumber: number,
  total: number,
  city: string,
  radii: string
): string {
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

async function callOpenAI(apiKey: string, body: RequestBody, retries = 3) {
  const prompt = buildPrompt(body.slideNumber, body.total, body.city, body.radii);

  const payload = {
    model: body.model,
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${body.base64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 429 && attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI ${res.status}: ${text}`);
    }

    return await res.json();
  }

  throw new Error('Max retries exceeded');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY não configurada nos secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json()) as RequestBody;
    if (!body?.base64) {
      return new Response(
        JSON.stringify({ error: 'base64 do slide é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await callOpenAI(apiKey, body);

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(response.choices?.[0]?.message?.content ?? '{}');
    } catch {
      parsed = { errors: [], hasData: false, summary: 'Erro ao processar resposta da IA' };
    }

    const skipped = parsed.noReview === true;

    const result = {
      errors: skipped ? [] : (parsed.errors ?? []),
      hasData: skipped ? false : (parsed.hasData ?? true),
      summary: skipped
        ? (parsed.reason ?? 'Slide ignorado')
        : (parsed.summary ?? ''),
      inputTokens,
      outputTokens,
      skipped,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
