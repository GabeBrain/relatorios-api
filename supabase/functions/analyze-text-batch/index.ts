// Edge Function: analyze-text-batch (Corretor v3.1)
// Revisão de TEXTO em lote sobre o IR do estudo — ortografia (SPELLING),
// cidade/contexto (CITY_NAME) e coerência texto×tabela (COHERENCE).
// ~10× mais barato que a visão por slide da v1: manda só texto, N slides por chamada.
// A OPENAI_API_KEY vive nos secrets do Supabase, nunca no frontend.
//
// Deploy: supabase functions deploy analyze-text-batch

// --- CORS (mesmo modelo do analyze-slide) --------------------------------
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// --- Rate limiting (best-effort, em memória) -----------------------------
const RATE_LIMIT = 20;
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

// --- Validação ------------------------------------------------------------
const MODELS = ['gpt-4o', 'gpt-4o-mini'] as const;
type ModelId = (typeof MODELS)[number];

const MAX_SLIDES_PER_BATCH = 20;
const MAX_CHARS_PER_SLIDE = 6000;

interface SlidePayload {
  n: number;
  titulo: string;
  texto: string;   // textos do IR unidos
  tabelas: string; // resumo textual das tabelas nativas (linhas '|'-separadas)
}

interface RequestBody {
  city: string;
  model: ModelId;
  slides: SlidePayload[];
}

function validate(body: unknown): { ok: true; value: RequestBody } | { ok: false; error: string; status: number } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Corpo inválido.', status: 400 };
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.slides) || b.slides.length === 0) {
    return { ok: false, error: 'slides é obrigatório.', status: 400 };
  }
  if (b.slides.length > MAX_SLIDES_PER_BATCH) {
    return { ok: false, error: `Máximo de ${MAX_SLIDES_PER_BATCH} slides por chamada.`, status: 413 };
  }
  const model = b.model as ModelId;
  if (!MODELS.includes(model)) return { ok: false, error: 'model não suportado.', status: 400 };
  const slides: SlidePayload[] = [];
  for (const s of b.slides as Record<string, unknown>[]) {
    if (typeof s.n !== 'number') return { ok: false, error: 'slide sem número.', status: 400 };
    slides.push({
      n: s.n,
      titulo: String(s.titulo ?? '').slice(0, 200),
      texto: String(s.texto ?? '').slice(0, MAX_CHARS_PER_SLIDE),
      tabelas: String(s.tabelas ?? '').slice(0, MAX_CHARS_PER_SLIDE),
    });
  }
  return { ok: true, value: { city: String(b.city ?? ''), model, slides } };
}

// --- Prompt ----------------------------------------------------------------
function buildPrompt(city: string, slides: SlidePayload[]): string {
  const blocks = slides.map((s) =>
    `### SLIDE ${s.n} — ${s.titulo}\nTEXTO:\n${s.texto || '(sem texto)'}\n` +
    (s.tabelas ? `TABELAS:\n${s.tabelas}\n` : '')
  ).join('\n');

  return `Você é um revisor de apresentações de Estudos Vocacionais do mercado imobiliário brasileiro.
O estudo é sobre a cidade de "${city}". Abaixo, o TEXTO EXTRAÍDO de ${slides.length} slides.

Verifique, em cada slide:
- SPELLING: erros reais de ortografia/gramática em português (ignore siglas, nomes próprios, unidades como m², R$, abreviações de mercado).
- CITY_NAME: menção a cidade/região DIFERENTE de "${city}" que pareça vazamento de outro estudo (ignore comparações intencionais explícitas e nomes de estados).
- COHERENCE: número citado no texto que contradiga os valores das TABELAS do mesmo slide.

Seja conservador: reporte apenas o que tiver confiança alta. Sem achados = lista vazia.

Responda EXATAMENTE este JSON (sem markdown):
{"findings": [{"slide": 12, "type": "SPELLING", "description": "…", "evidence": "trecho exato", "severity": "LOW|MEDIUM|HIGH"}]}`;
}

async function callOpenAI(apiKey: string, body: RequestBody, retries = 3) {
  const payload = {
    model: body.model,
    max_tokens: 1500,
    messages: [{ role: 'user', content: buildPrompt(body.city, body.slides) }],
    response_format: { type: 'json_object' },
  };
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    if (res.status === 429 && attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
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

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) return json({ error: 'Limite de requisições excedido.' }, 429);

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'OPENAI_API_KEY não configurada nos secrets.' }, 500);

    let raw: unknown;
    try { raw = await req.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
    const parsed = validate(raw);
    if (!parsed.ok) return json({ error: parsed.error }, parsed.status);

    const response = await callOpenAI(apiKey, parsed.value);
    let content: { findings?: unknown[] } = {};
    try { content = JSON.parse(response.choices?.[0]?.message?.content ?? '{}'); } catch { content = { findings: [] }; }

    return json({
      findings: Array.isArray(content.findings) ? content.findings : [],
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erro desconhecido' }, 500);
  }
});
