// Gera uma sugestão consultiva a partir do texto e das tabelas extraídos do PPTX.
const DEV_ORIGINS = ['http://localhost:8080', 'http://localhost:5173'];
const MAX_SLIDES = 180;
const MAX_CHARS_PER_SLIDE = 6_000;
const MAX_TOTAL_CHARS = 180_000;

interface SlidePayload { n: number; titulo: string; conteudo: string }

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const configured = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  const allowed = [...DEV_ORIGINS, ...configured];
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : DEV_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

function validate(raw: unknown): SlidePayload[] | string {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Record<string, unknown>).slides)) return 'slides é obrigatório.';
  const slides = (raw as { slides: unknown[] }).slides;
  if (slides.length === 0 || slides.length > MAX_SLIDES) return `Envie entre 1 e ${MAX_SLIDES} slides.`;
  let total = 0;
  const result: SlidePayload[] = [];
  for (const value of slides) {
    if (!value || typeof value !== 'object') return 'Slide inválido.';
    const slide = value as Record<string, unknown>;
    if (typeof slide.n !== 'number') return 'Slide sem número.';
    const conteudo = String(slide.conteudo ?? '').slice(0, MAX_CHARS_PER_SLIDE);
    total += conteudo.length;
    result.push({ n: slide.n, titulo: String(slide.titulo ?? '').slice(0, 200), conteudo });
  }
  return total > MAX_TOTAL_CHARS ? 'O estudo excede o limite de conteúdo para uma única sugestão.' : result;
}

function prompt(slides: SlidePayload[]): string {
  const study = slides.map((slide) => `### SLIDE ${slide.n} — ${slide.titulo}\n${slide.conteudo}`).join('\n\n');
  return `Você é um consultor imobiliário da Brain. Elabore uma sugestão de análise para um Estudo Vocacional usando SOMENTE as evidências disponíveis abaixo. Não invente números, localização, produto ou premissas ausentes.

Critérios obrigatórios:
- Converta cada dado relevante em leitura comparativa, implicação e efeito para produto, preço ou risco; não repita tabelas.
- Avalie somente temas presentes: sociodemografia, renda, domicílios, oferta/estoque/vendas, preço por m² e ticket, locação, hotelaria, usos comercial/multiuso e concorrência.
- A recomendação deve derivar explicitamente das evidências da avaliação e posicionar produto, mix, público, preço/ticket, diferenciais e absorção/faseamento quando houver base.
- Compare venda primária, revendas, renda e velocidade sempre que houver dados. Não trate ausência de oferta como demanda garantida.
- Para compactos, exija evidência de renda, locação, domicílios ou drivers; use “studio”, “1 dormitório” ou “compacto”, nunca “quitinete”. Short stay é upside, salvo evidência robusta de ocupação e diária.
- Estoque de unidades maiores exige testar mitigadores de metragem, preço e flexibilidade antes de sugerir corte. Não proponha faseamento artificial para torre única ou escala já definida.
- Diferenciais/amenities precisam derivar da concorrência ou de fluxo/localização observados; não liste itens genéricos.
- Mantenha tom consultivo, objetivo e acionável. Limitações, dados ausentes e validações pendentes devem ficar em “Orientação ao analista”, sem desqualificar o estudo.

Responda em Markdown, estritamente nesta estrutura:
## Avaliação da Consultoria
### [temas sustentados pelos dados]
[cada parágrafo cita a evidência e sua implicação]
### Síntese da avaliação

## Recomendação
### Tese recomendada
### Produto e mix
### Preço, ticket e locação
### Diferenciais e cuidados
### Absorção e faseamento

## Orientação ao analista
[somente validações necessárias ou dados que faltam para aumentar a precisão]

ESTUDO EXTRAÍDO:
${study}`;
}

Deno.serve(async (req) => {
  const headers = corsHeadersFor(req);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const slides = validate(await req.json());
    if (typeof slides === 'string') return json({ error: slides }, 400);
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) return json({ error: 'OPENAI_API_KEY não configurada nos secrets.' }, 500);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 3_500, messages: [{ role: 'user', content: prompt(slides) }] }),
    });
    if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return json({ suggestion: data.choices?.[0]?.message?.content ?? '' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro desconhecido.' }, 500);
  }
});
