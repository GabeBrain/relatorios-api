// Edge Function: analyze-ata-image (Corretor v3.3 — Fase A do PLAN_ata_estrela_guia)
// Extrai a ATA/BRIEFING de abertura para JSON estruturado fechado. Aceita a ata como
// IMAGEM (base64, print colado no slide) OU como TEXTO (extraído de um DOCX — ~10× mais
// barato, sem visão). O chamador cacheia por sha1 (vision_cache).
//
// Deploy: supabase functions deploy analyze-ata-image

// --- CORS (mesmo modelo do analyze-table-image) --------------------------
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
const MAX_TEXT_CHARS = 40_000;

interface RequestBody {
  model: ModelId;
  base64?: string; // ata como imagem
  mime?: string;
  texto?: string;  // ata como texto (DOCX)
}

/**
 * Cidade/UF é dado de alto impacto. Quando a LLM devolve a citação literal da ata,
 * a aplicação deriva esses dois campos dela em vez de confiar numa interpretação solta.
 */
function normalizeAtaLocation(ata: unknown): unknown {
  if (!ata || typeof ata !== 'object') return ata;
  const data = ata as Record<string, unknown>;
  const source = typeof data.localizacao_fonte === 'string' ? data.localizacao_fonte.trim() : '';
  if (!source) return ata;
  const match = source.match(/([^|,/\n]+?)\s*\/\s*([a-z]{2})\b/i);
  if (!match) return ata;
  const city = match[1].trim().replace(/^[|,\-–—\s]+/, '');
  if (!city) return ata;
  return { ...data, cidade: city, uf: match[2].toUpperCase() };
}

function validate(body: unknown): { ok: true; value: RequestBody } | { ok: false; error: string; status: number } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Corpo inválido.', status: 400 };
  const b = body as Record<string, unknown>;
  const model = b.model as ModelId;
  if (!MODELS.includes(model)) return { ok: false, error: 'model não suportado.', status: 400 };

  const hasImg = typeof b.base64 === 'string' && b.base64.length > 0;
  const hasTxt = typeof b.texto === 'string' && b.texto.length > 0;
  if (!hasImg && !hasTxt) return { ok: false, error: 'Envie base64 (imagem) ou texto.', status: 400 };
  if (hasImg && (b.base64 as string).length > MAX_BASE64_CHARS) return { ok: false, error: 'Imagem grande demais.', status: 413 };

  return {
    ok: true,
    value: {
      model,
      base64: hasImg ? (b.base64 as string) : undefined,
      mime: typeof b.mime === 'string' && b.mime.startsWith('image/') ? b.mime : 'image/png',
      texto: hasTxt ? (b.texto as string).slice(0, MAX_TEXT_CHARS) : undefined,
    },
  };
}

const PROMPT = `Você extrai a ATA/BRIEFING de abertura de um estudo imobiliário brasileiro.
A ata é a especificação do projeto: cliente, produto pretendido, terreno, preço-guia, dúvidas
do cliente e PEDIDOS ao analista. Extraia FIELMENTE para JSON fechado.

Regras:
- Números em convenção pt-BR viram números JSON: "1.912" → 1912, "R$ 8.500" → 8500, "36" → 36.
- Campo que NÃO aparece na ata = null. NUNCA invente.
- "localizacao_fonte" é a TRANSCRIÇÃO LITERAL do trecho que prova cidade/UF (normalmente
  o bullet do endereço, por exemplo "... bairro São Roque | Guarulhos/SP"). Extraia
  "cidade" e "uf" SOMENTE desse trecho. Se não existir cidade/UF explícita, ambos são null.
- "duvidas_cliente" e "pedidos_analista" são TRANSCRIÇÃO FIEL dos bullets (não parafraseie,
  não resuma, não complete e não omita a última palavra) — eles viram um checklist do que o estudo tem de responder/entregar.
- Pedidos destacados/realçados (ex.: bloco "Analista da Rebrain") entram em "pedidos_analista".
- "dorms" é a lista de números de dormitórios (ex.: [2] ou [1,2,3]).
- "produto.observacoes" recebe literalmente qualquer detalhe do produto que não caiba nos
  campos estruturados (ex.: "Todas as unidades de 2 dorm com e sem sacada").
- "observacoes_localizacao" recebe literalmente os bullets de terreno/localização que não sejam
  endereço, bairro, cidade/UF ou área. Não descarte fatos como Via Dutra, aeroporto ou Parque CECAP.
- A imagem pode ser um slide com fundo decorativo e uma ata/cartão branco inserido no centro.
  Leia o documento inserido: se contiver "Produto pretendido", "Terreno e localização",
  "Dúvida do cliente" ou "Analista da Rebrain", ele É uma ata, mesmo com capa/fundo ao redor.

Responda EXATAMENTE este JSON (sem markdown):
{"ata": {
  "cliente": "…", "projeto": "…",
  "cidade": "…", "uf": "…", "localizacao_fonte": "…", "endereco": "…", "bairro": "…",
  "area_terreno_m2": 25000,
  "produto": {"torres": 8, "unidades": 1912, "dorms": [2], "m2_min": 36, "m2_max": 41,
              "vagas_pct": 50, "programa": "MCMV", "observacoes": ["Todas as unidades de 2 dorm com e sem sacada."]},
  "preco_m2_viabilidade": 8500,
  "observacoes_localizacao": ["Excelente localização colado na Via Dutra"],
  "duvidas_cliente": ["…"],
  "pedidos_analista": ["…"]
}}
Se a imagem/texto não for uma ata: {"ata": null}`;

async function callOpenAI(apiKey: string, body: RequestBody, retries = 3) {
  const content: unknown[] = [{ type: 'text', text: PROMPT }];
  if (body.base64) {
    content.push({ type: 'image_url', image_url: { url: `data:${body.mime};base64,${body.base64}`, detail: 'high' } });
  } else {
    content.push({ type: 'text', text: `ATA (texto):\n${body.texto}` });
  }
  const payload = {
    model: body.model,
    max_tokens: 2000,
    messages: [{ role: 'user', content }],
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
    let content: { ata?: unknown } = {};
    try { content = JSON.parse(response.choices?.[0]?.message?.content ?? '{}'); } catch { content = { ata: null }; }

    return json({
      ata: normalizeAtaLocation(content.ata ?? null),
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erro desconhecido' }, 500);
  }
});
