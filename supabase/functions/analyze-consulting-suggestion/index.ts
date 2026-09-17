// Gera uma sugestão consultiva a partir do texto e das tabelas extraídos do PPTX.
const DEV_ORIGINS = ['http://localhost:8080', 'http://localhost:5173'];
const MAX_SLIDES = 180;
const MAX_CHARS_PER_SLIDE = 6_000;
const MAX_TOTAL_CHARS = 180_000;
const MAX_BATCH_MEMOS = 40;
const MAX_BATCH_MEMO_CHARS = 8_000;
const MAX_COMPILE_CHARS = 160_000;

interface SlidePayload { n: number; titulo: string; conteudo: string }
interface BatchMemoPayload { firstSlide: number; lastSlide: number; content: string }

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

function validateSlides(raw: unknown): SlidePayload[] | string {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Record<string, unknown>).slides)) return 'slides é obrigatório.';
  const slides = (raw as { slides: unknown[] }).slides;
  if (slides.length === 0 || slides.length > MAX_SLIDES) return `Envie entre 1 e ${MAX_SLIDES} slides por lote.`;
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
  return total > MAX_TOTAL_CHARS ? 'O lote excede o limite de conteúdo permitido.' : result;
}

function validateMemos(raw: unknown): BatchMemoPayload[] | string {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Record<string, unknown>).batches)) return 'batches é obrigatório para compilar a análise.';
  const batches = (raw as { batches: unknown[] }).batches;
  if (batches.length === 0 || batches.length > MAX_BATCH_MEMOS) return `Envie entre 1 e ${MAX_BATCH_MEMOS} lotes para compilação.`;
  let total = 0;
  const result: BatchMemoPayload[] = [];
  for (const value of batches) {
    if (!value || typeof value !== 'object') return 'Resumo de lote inválido.';
    const batch = value as Record<string, unknown>;
    if (typeof batch.firstSlide !== 'number' || typeof batch.lastSlide !== 'number') return 'Resumo de lote sem intervalo de slides.';
    const content = String(batch.content ?? '').slice(0, MAX_BATCH_MEMO_CHARS);
    if (!content.trim()) return 'Resumo de lote sem conteúdo.';
    total += content.length;
    result.push({ firstSlide: batch.firstSlide, lastSlide: batch.lastSlide, content });
  }
  return total > MAX_COMPILE_CHARS ? 'Os resumos dos lotes excedem o limite de compilação.' : result;
}

const CONSULTING_RULES = `Você é um consultor imobiliário da Brain. Use SOMENTE as evidências recebidas. Não invente números, localização, produto ou premissas ausentes.

Critérios obrigatórios:
- Converta cada dado relevante em leitura comparativa, implicação e efeito para produto, preço ou risco; não repita tabelas.
- Avalie somente temas presentes: sociodemografia, renda, domicílios, oferta/estoque/vendas, preço por m² e ticket, locação, hotelaria, usos comercial/multiuso e concorrência.
- A recomendação deve derivar explicitamente das evidências e posicionar produto, mix, público, preço/ticket, diferenciais e absorção/faseamento quando houver base.
- Compare venda primária, revendas, renda e velocidade sempre que houver dados. Não trate ausência de oferta como demanda garantida.
- Para compactos, exija evidência de renda, locação, domicílios ou drivers; use “studio”, “1 dormitório” ou “compacto”, nunca “quitinete”. Short stay é upside, salvo evidência robusta de ocupação e diária.
- Em estudos multiuso, trate cada componente (torre, uso ou bloco) como tese própria: residencial compacto, Standard/Médio, Medical Center, Offices, varejo ou hotelaria. Dê a cada um público, métrica, preço/ticket e racional; não reduza um projeto multiuso a uma única tese residencial.
- Não chame estoque lançado recentemente de saturação sem evidência de baixa velocidade, envelhecimento do estoque ou desalinhamento entre oferta e demanda. Estoque jovem pode estar em absorção natural.
- Compactos podem ser premium por m² quando comparáveis compactos específicos mostram esse patamar e liquidez, desde que o ticket absoluto seja viável. Nunca confunda preço por m², ticket total e locação: informe-os como indicadores distintos.
- Avalie Medical Center e Offices como teses próprias quando os dados mostrarem centralidade, acessibilidade, shopping, saúde, ensino, órgãos públicos, eixos viários ou escassez de oferta; não os reduza a comércio de apoio.
- Estoque de unidades maiores exige testar mitigadores de metragem, preço e flexibilidade antes de sugerir corte. Não proponha faseamento artificial para torre única ou escala já definida.
- Diferenciais precisam derivar da concorrência ou de fluxo/localização observados; não liste itens genéricos.
- Mantenha tom consultivo, objetivo e acionável. Limitações, dados ausentes e validações pendentes devem ficar em “Orientação ao analista”, sem desqualificar o estudo.`;

function studyText(slides: SlidePayload[]): string {
  return slides.map((slide) => `### SLIDE ${slide.n} — ${slide.titulo}\n${slide.conteudo}`).join('\n\n');
}

function finalPrompt(evidence: string): string {
  return `${CONSULTING_RULES}

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

EVIDÊNCIAS DO ESTUDO:
${evidence}`;
}

function batchPrompt(slides: SlidePayload[]): string {
  return `${CONSULTING_RULES}

Você está analisando somente um lote de slides de um estudo maior. Produza um MEMO DE EVIDÊNCIAS conciso para a compilação final, sem apresentar uma recomendação definitiva. Registre apenas dados, comparações, oportunidades, riscos, inconsistências e lacunas realmente sustentados neste lote. Sempre indique os números dos slides. Não repita conteúdo e não preencha ausências com suposições.

LOTE EXTRAÍDO:
${studyText(slides)}`;
}

function compilePrompt(memos: BatchMemoPayload[]): string {
  const evidence = memos.map((memo) => `### LOTES ${memo.firstSlide}–${memo.lastSlide}\n${memo.content}`).join('\n\n');
  return finalPrompt(`Os memos abaixo foram gerados de lotes distintos. Consolide-os sem contar a mesma evidência duas vezes e sem inferir conteúdo que não esteja nos memos.\n\n${evidence}`);
}

async function requestCompletion(key: string, content: string, maxTokens: number): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

Deno.serve(async (req) => {
  const headers = corsHeadersFor(req);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const payload = await req.json() as Record<string, unknown>;
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) return json({ error: 'OPENAI_API_KEY não configurada nos secrets.' }, 500);

    if (payload.mode === 'compile') {
      const memos = validateMemos(payload);
      if (typeof memos === 'string') return json({ error: memos }, 400);
      return json({ suggestion: await requestCompletion(key, compilePrompt(memos), 3_500) });
    }

    const slides = validateSlides(payload);
    if (typeof slides === 'string') return json({ error: slides }, 400);
    if (payload.mode === 'batch') return json({ batch: await requestCompletion(key, batchPrompt(slides), 1_200) });
    return json({ suggestion: await requestCompletion(key, finalPrompt(studyText(slides)), 3_500) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro desconhecido.' }, 500);
  }
});
