// Edge Function: analyze-slide
// Proxia a análise de um slide para a OpenAI usando o secret OPENAI_API_KEY.
// A chave nunca é exposta ao frontend.

// --- CORS ---------------------------------------------------------------
// Origens permitidas: localhost de dev + as configuradas no secret ALLOWED_ORIGINS
// (lista separada por vírgula, ex.: "https://app.brain.srv.br,https://studio.brain.srv.br").
// Se ALLOWED_ORIGINS não estiver setado, apenas as origens de dev são liberadas.
const DEV_ORIGINS = ['http://localhost:8080', 'http://localhost:5173'];

function allowedOrigins(): string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS') ?? '';
  const fromEnv = env.split(',').map((o) => o.trim()).filter(Boolean);
  return [...DEV_ORIGINS, ...fromEnv];
}

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const list = allowedOrigins();
  const allow = list.includes(origin) ? origin : list[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// --- Rate limiting (best-effort, em memória) ----------------------------
// Mitigação parcial: instâncias da edge function são efêmeras e podem ser
// múltiplas, então este limite não é garantia forte. Freia abuso trivial.
const RATE_LIMIT = 30; // req por janela
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

// --- Validação ----------------------------------------------------------
const MODELS = ['gpt-4o', 'gpt-4o-mini'] as const;
type ModelId = (typeof MODELS)[number];

// Limite do payload da imagem: ~5MB decodificados (base64 ≈ 4/3 do tamanho bruto).
const MAX_BASE64_CHARS = 7_000_000;

interface RequestBody {
  base64: string;
  slideNumber: number;
  total: number;
  city: string;
  radii: string;
  model: ModelId;
}

function validate(body: unknown): { ok: true; value: RequestBody } | { ok: false; error: string; status: number } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Corpo inválido.', status: 400 };
  const b = body as Record<string, unknown>;

  if (typeof b.base64 !== 'string' || b.base64.length === 0) {
    return { ok: false, error: 'base64 do slide é obrigatório.', status: 400 };
  }
  if (b.base64.length > MAX_BASE64_CHARS) {
    return { ok: false, error: 'Imagem excede o tamanho máximo permitido.', status: 413 };
  }
  if (typeof b.slideNumber !== 'number' || !Number.isFinite(b.slideNumber)) {
    return { ok: false, error: 'slideNumber inválido.', status: 400 };
  }
  if (typeof b.total !== 'number' || !Number.isFinite(b.total)) {
    return { ok: false, error: 'total inválido.', status: 400 };
  }
  const model = b.model as ModelId;
  if (!MODELS.includes(model)) {
    return { ok: false, error: 'model não suportado.', status: 400 };
  }

  return {
    ok: true,
    value: {
      base64: b.base64,
      slideNumber: b.slideNumber,
      total: b.total,
      city: typeof b.city === 'string' ? b.city : '',
      radii: typeof b.radii === 'string' ? b.radii : '',
      model,
    },
  };
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
  const corsHeaders = corsHeadersFor(req);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) {
    return json({ error: 'Limite de requisições excedido. Tente novamente em instantes.' }, 429);
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return json({ error: 'OPENAI_API_KEY não configurada nos secrets.' }, 500);
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ error: 'JSON inválido.' }, 400);
    }

    const parsed = validate(raw);
    if (!parsed.ok) {
      return json({ error: parsed.error }, parsed.status);
    }

    const response = await callOpenAI(apiKey, parsed.value);

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    let content: Record<string, unknown> = {};
    try {
      content = JSON.parse(response.choices?.[0]?.message?.content ?? '{}');
    } catch {
      content = { errors: [], hasData: false, summary: 'Erro ao processar resposta da IA' };
    }

    const skipped = content.noReview === true;

    const result = {
      errors: skipped ? [] : (content.errors ?? []),
      hasData: skipped ? false : (content.hasData ?? true),
      summary: skipped
        ? (content.reason ?? 'Slide ignorado')
        : (content.summary ?? ''),
      inputTokens,
      outputTokens,
      skipped,
    };

    return json(result);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erro desconhecido' }, 500);
  }
});
