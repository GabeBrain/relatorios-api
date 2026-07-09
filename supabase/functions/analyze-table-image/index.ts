// Edge Function: analyze-table-image (Corretor v3.2 — Fase C produtizada)
// Extrai a(s) tabela(s) numérica(s) de UMA imagem para JSON estruturado.
// O chamador cacheia por sha1 (vision_cache) — cada imagem é paga uma vez só.
//
// Deploy: supabase functions deploy analyze-table-image

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

// --- Rate limiting (best-effort) -----------------------------------------
const RATE_LIMIT = 30;
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

// --- Validação -------------------------------------------------------------
const MODELS = ['gpt-4o', 'gpt-4o-mini'] as const;
type ModelId = (typeof MODELS)[number];
const MAX_BASE64_CHARS = 7_000_000;

interface RequestBody {
  base64: string;
  mime: string;
  model: ModelId;
  contexto: string; // "slide 121 · TABELA DE LACUNAS · seção LACUNAS"
}

function validate(body: unknown): { ok: true; value: RequestBody } | { ok: false; error: string; status: number } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Corpo inválido.', status: 400 };
  const b = body as Record<string, unknown>;
  if (typeof b.base64 !== 'string' || !b.base64) return { ok: false, error: 'base64 é obrigatório.', status: 400 };
  if (b.base64.length > MAX_BASE64_CHARS) return { ok: false, error: 'Imagem grande demais.', status: 413 };
  const model = b.model as ModelId;
  if (!MODELS.includes(model)) return { ok: false, error: 'model não suportado.', status: 400 };
  return {
    ok: true,
    value: {
      base64: b.base64,
      mime: typeof b.mime === 'string' && b.mime.startsWith('image/') ? b.mime : 'image/png',
      model,
      contexto: String(b.contexto ?? '').slice(0, 300),
    },
  };
}

const PROMPT = (contexto: string) => `Você transcreve tabelas de estudos imobiliários brasileiros a partir de imagens.
Contexto: ${contexto}.

Transcreva TODAS as tabelas numéricas da imagem, fielmente:
- Números em convenção pt-BR viram números JSON: "1.234" → 1234, "12,5%" → 12.5, "R$ 8.500" → 8500.
- Células vazias ou "-" viram null. Rótulos de linha ficam como texto na 1ª coluna.
- Se houver linha de Total/TOTAL, coloque-a em "totals" (mesma ordem das colunas), não em "rows".
- NÃO invente valores: se um dígito estiver ilegível, use null.
- Legendas de mapa (só cores/faixas, sem valores) NÃO são tabelas: ignore.

Responda EXATAMENTE este JSON (sem markdown):
{"tables": [{"title": "…", "columns": ["…"], "rows": [["rótulo", 123, null]], "totals": ["Total", 456]}]}
Se não houver tabela numérica: {"tables": []}`;

async function callOpenAI(apiKey: string, body: RequestBody, retries = 3) {
  const payload = {
    model: body.model,
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: PROMPT(body.contexto) },
        { type: 'image_url', image_url: { url: `data:${body.mime};base64,${body.base64}`, detail: 'high' } },
      ],
    }],
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
    let content: { tables?: unknown[] } = {};
    try { content = JSON.parse(response.choices?.[0]?.message?.content ?? '{}'); } catch { content = { tables: [] }; }

    return json({
      tables: Array.isArray(content.tables) ? content.tables : [],
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erro desconhecido' }, 500);
  }
});
