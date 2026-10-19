// Contrato compartilhado, sem credenciais ou dependência do runtime Deno.
export const PROMPT_VERSION = 'brain-2026-09-15-v1';
export interface RecommendationProfile {
  id: string; configVersion: string; model: string; promptVersion: string; priceVersion: string;
  provider: 'openai'; endpoint: 'chat/completions'; serviceTier: 'default';
  reasoningEffort: 'high' | null;
  prices: { input: number; cached: number; output: number };
  maxOutput: { single: number; batch: number; compile: number };
  contextWindow: number; hashNamespace: string;
}
export const LEGACY_RECOMMENDATION_PROFILE: RecommendationProfile = {
  id: 'mini-legacy-2026-10-16', configVersion: 'recommendation-v1', model: 'gpt-4o-mini',
  promptVersion: PROMPT_VERSION, priceVersion: 'openai-2026-10-16', provider: 'openai',
  endpoint: 'chat/completions', serviceTier: 'default', reasoningEffort: null,
  prices: { input: 0.15, cached: 0.075, output: 0.6 },
  maxOutput: { single: 3500, batch: 1200, compile: 3500 }, contextWindow: 128000, hashNamespace: 'recommendation-v1',
};
const PROFILES: Record<string, RecommendationProfile> = {
  [LEGACY_RECOMMENDATION_PROFILE.id]: LEGACY_RECOMMENDATION_PROFILE,
  'luna-high-2026-10-19': {
    id: 'luna-high-2026-10-19', configVersion: 'recommendation-profiles-v2', model: 'gpt-6-luna',
    promptVersion: PROMPT_VERSION, priceVersion: 'openai-standard-2026-10-19', provider: 'openai',
    endpoint: 'chat/completions', serviceTier: 'default', reasoningEffort: 'high',
    prices: { input: 0.10, cached: 0.01, output: 0.50 },
    maxOutput: { single: 32768, batch: 32768, compile: 32768 }, contextWindow: 128000, hashNamespace: 'recommendation-profiles-v2',
  },
};
/** Flag técnica versionada. Afeta só novas gerações; nunca troca uma execução iniciada. */
export const ACTIVE_RECOMMENDATION_PROFILE = 'luna-high-2026-10-19';
export function recommendationProfile(id = ACTIVE_RECOMMENDATION_PROFILE): RecommendationProfile {
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(PROFILES,id)) throw new Error('Configuração de geração indisponível. Procure a equipe de suporte.');
  const profile = PROFILES[id];
  if (!profile) throw new Error('Configuração de geração indisponível. Procure a equipe de suporte.');
  return structuredClone(profile);
}
const stable = (value: unknown) => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
/** Valida o retrato persistido contra contratos conhecidos, sem confiar em taxas do cliente. */
export function executionRecommendationProfile(context: Record<string, unknown>): RecommendationProfile {
  if (context.profile && typeof context.profile === 'object') {
    const snapshot = context.profile as RecommendationProfile;
    const profile = recommendationProfile(snapshot.id);
    if (stable(snapshot) === stable(profile) && context.model === profile.model
      && context.promptVersion === profile.promptVersion && context.priceVersion === profile.priceVersion) return profile;
  } else if (context.model === LEGACY_RECOMMENDATION_PROFILE.model
    && context.promptVersion === LEGACY_RECOMMENDATION_PROFILE.promptVersion
    && context.priceVersion === LEGACY_RECOMMENDATION_PROFILE.priceVersion) return recommendationProfile(LEGACY_RECOMMENDATION_PROFILE.id);
  throw new Error('A configuração desta execução precisa de conferência técnica. O histórico foi preservado.');
}
export const RECOMMENDATION_MODEL = recommendationProfile().model;
export const PRICE_VERSION = recommendationProfile().priceVersion;
export const PRICES = recommendationProfile().prices;
export const MAX_MEMO_BYTES = 8000;
export const MAX_BATCHES = 10;
export interface SlidePayload { n: number; titulo: string; conteudo: string }
export interface BatchMemoPayload { firstSlide: number; lastSlide: number; content: string }
export const utf8 = (text: string) => new TextEncoder().encode(text).length;

export function partitionSlides(slides: SlidePayload[]): SlidePayload[][] {
  const batches: SlidePayload[][] = []; let batch: SlidePayload[] = [], chars = 0, bytes = 0;
  for (const slide of slides) {
    const size = utf8(JSON.stringify(slide));
    if (batch.length && (batch.length >= 180 || chars + slide.conteudo.length > 180000 || bytes + size > 90000)) {
      batches.push(batch); batch = []; chars = 0; bytes = 0;
    }
    batch.push(slide); chars += slide.conteudo.length; bytes += size;
  }
  if (batch.length) batches.push(batch);
  return batches;
}
export function validateRecommendationSlides(value: unknown): SlidePayload[] {
  if (!Array.isArray(value) || !value.length || value.length > 1800) throw new Error('Envie conteúdo de uma apresentação com até 1.800 slides úteis.');
  const seen = new Set<number>();
  const slides = value.map(s => {
    if (!s || !Number.isInteger(s.n) || s.n < 1 || seen.has(s.n) || typeof s.titulo !== 'string' || s.titulo.length > 200 || typeof s.conteudo !== 'string' || s.conteudo.length > 6000) throw new Error('Conteúdo de slide inválido.');
    seen.add(s.n); return { n: s.n, titulo: s.titulo, conteudo: s.conteudo };
  });
  if (partitionSlides(slides).length > MAX_BATCHES) throw new Error('Este estudo excede os dez lotes suportados. Nenhuma IA foi iniciada.');
  return slides;
}
export interface RecommendationQuote { estimateUsd: number; maximumUsd: number; requests: number; batches: number; slides: number; inputTokensEstimated: number; outputTokensMaximum: number; model: string; promptVersion: string; priceVersion: string; profileId: string; configVersion: string }
export function recommendationCost(input: number, output: number, cached = 0, profile = recommendationProfile()): number {
  if (![input,output,cached].every(n=>Number.isInteger(n)&&n>=0) || cached > input) throw new Error('Uso de tokens inválido.');
  return ((input-cached)*profile.prices.input+cached*profile.prices.cached+output*profile.prices.output)/1e6;
}
export function prepareRequest(payload: { mode?: string; slides?: unknown; batches?: BatchMemoPayload[] }, profile = recommendationProfile()): { prompt: string; maxOutputTokens: number; mode: string; reserveUsd: number } {
  const mode = payload.mode ?? 'single'; let prompt: string;
  if (mode === 'compile') {
    if (!Array.isArray(payload.batches) || !payload.batches.length || payload.batches.length > MAX_BATCHES || payload.batches.some(b=>!Number.isInteger(b.firstSlide)||!Number.isInteger(b.lastSlide)||b.firstSlide<1||b.lastSlide<b.firstSlide||typeof b.content!=='string'||!b.content.trim()||utf8(b.content)>MAX_MEMO_BYTES)) throw new Error('Memos de compilação inválidos.');
    prompt = compilePrompt(payload.batches);
  } else {
    if (!['single','batch'].includes(mode)) throw new Error('Etapa consultiva inválida.');
    const slides = validateRecommendationSlides(payload.slides);
    if (partitionSlides(slides).length !== 1) throw new Error('O conteúdo precisa ser dividido em lotes antes de gerar.');
    prompt = mode === 'batch' ? batchPrompt(slides) : finalPrompt(studyText(slides));
  }
  const inputBound = utf8(prompt) + 64, maxOutputTokens = profile.maxOutput[mode as keyof RecommendationProfile['maxOutput']];
  if (inputBound + maxOutputTokens > profile.contextWindow) throw new Error('Conteúdo acima da janela permitida.');
  return { prompt, maxOutputTokens, mode, reserveUsd: recommendationCost(inputBound,maxOutputTokens,0,profile) };
}
export function quoteRecommendation(value: unknown, profile = recommendationProfile()): RecommendationQuote {
  const slides = validateRecommendationSlides(value), batches = partitionSlides(slides);
  const requests = batches.map(batch=>prepareRequest({mode:batches.length===1?'single':'batch',slides:batch},profile));
  if (batches.length>1) requests.push(prepareRequest({mode:'compile',batches:batches.map(b=>({firstSlide:b[0].n,lastSlide:b.at(-1)!.n,content:'x'.repeat(MAX_MEMO_BYTES)}))},profile));
  const inputTokensEstimated = requests.reduce((n,r)=>n+Math.ceil(utf8(r.prompt)/3)+64,0);
  const outputTokensMaximum = requests.reduce((n,r)=>n+r.maxOutputTokens,0);
  return {estimateUsd:recommendationCost(inputTokensEstimated,outputTokensMaximum,0,profile),maximumUsd:requests.reduce((n,r)=>n+r.reserveUsd,0),requests:requests.length,batches:batches.length,slides:slides.length,inputTokensEstimated,outputTokensMaximum,model:profile.model,promptVersion:profile.promptVersion,priceVersion:profile.priceVersion,profileId:profile.id,configVersion:profile.configVersion};
}
export const CONSULTING_RULES = `Você é um consultor imobiliário da Brain. Use SOMENTE as evidências recebidas. Não invente números, localização, produto ou premissas ausentes.

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

export function finalPrompt(evidence: string): string {
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

export function batchPrompt(slides: SlidePayload[]): string {
  return `${CONSULTING_RULES}

Você está analisando somente um lote de slides de um estudo maior. Produza um MEMO DE EVIDÊNCIAS conciso para a compilação final, sem apresentar uma recomendação definitiva. Registre apenas dados, comparações, oportunidades, riscos, inconsistências e lacunas realmente sustentados neste lote. Sempre indique os números dos slides. Não repita conteúdo e não preencha ausências com suposições.

LOTE EXTRAÍDO:
${studyText(slides)}`;
}

export function compilePrompt(memos: BatchMemoPayload[]): string {
  const evidence = memos.map((memo) => `### LOTES ${memo.firstSlide}–${memo.lastSlide}\n${memo.content}`).join('\n\n');
  return finalPrompt(`Os memos abaixo foram gerados de lotes distintos. Consolide-os sem contar a mesma evidência duas vezes e sem inferir conteúdo que não esteja nos memos.\n\n${evidence}`);
}
