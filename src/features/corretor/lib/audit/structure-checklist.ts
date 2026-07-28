// WS4 — checklist determinístico do deck oficial. É propositalmente BETA:
// reconhece presença por título/texto, não substitui a leitura qualitativa.

import type { Ir } from './ir';
import type { Finding } from './model';

export interface StructureItem {
  id: string;
  label: string;
  section: Finding['section'];
  patterns: RegExp[];
  required?: boolean;
  /**
   * Item cujo conteúdo é mapa/imagem/print: quando o texto não confirma, o deck
   * pode tê-lo mesmo assim (CH-1 do sprint de jul/2026 — a analista viu 15 itens
   * presentes acusados como ausentes). Nesses casos o veredito é "conferir",
   * nunca "ausente".
   */
  visual?: boolean;
}

const item = (id: string, label: string, section: Finding['section'], ...patterns: RegExp[]): StructureItem => ({ id, label, section, patterns, required: true });
const visualItem = (id: string, label: string, section: Finding['section'], ...patterns: RegExp[]): StructureItem => ({ id, label, section, patterns, required: true, visual: true });

export const CHECKLIST: StructureItem[] = [
  // 1.x vivem na ficha do terreno / mapas de entorno — quase sempre em imagem.
  visualItem('1.1', 'Endereço', 'ESTRUTURA', /endere[çc]o/i, /identifica[çc][ãa]o\s+do\s+terreno/i, /\b(?:avenida|rua|rodovia|estrada|alameda|travessa)\b/i),
  visualItem('1.2', 'Latitude/longitude', 'ESTRUTURA', /lat(?:itude)?\s*(?:\/|e)?\s*long/i, /identifica[çc][ãa]o\s+do\s+terreno/i, /-?\d{1,2}[.,]\d{4,}\s*[,;]\s*-?\d{1,2}[.,]\d{4,}/),
  visualItem('1.3', 'Área do terreno', 'ESTRUTURA', /[áa]rea\s+(?:do\s+)?terreno/i, /identifica[çc][ãa]o\s+do\s+terreno/i),
  visualItem('1.4', 'Acessos', 'ENTORNO', /acessos?|vias?\s+de\s+acesso/i, /conecta\s+com/i, /entorno\s+do\s+terreno/i),
  item('1.5', 'Entorno varejo/serviços', 'ENTORNO', /varejo|servi[çc]os|entorno/i), item('1.6', 'Entorno revendas', 'ENTORNO', /revendas?/i),
  visualItem('1.7', 'Mapeamento físico', 'ENTORNO', /mapeamento\s+f[íi]sico/i, /entorno\s+do\s+terreno/i),
  visualItem('1.9', 'Distância ao centro', 'ENTORNO', /dist[âa]ncia.*centro|centro.*dist[âa]ncia/i, /zonas?\s+de\s+influ[êe]ncia/i),
  item('2.1', 'Dados cidade/estado/Brasil', 'SOCIO', /cidade.*estado|dados\s+(?:da\s+)?cidade|brasil/i), item('2.2', 'Variação da população', 'SOCIO', /varia[çc][ãa]o.*popula|proje[çc][ãa]o.*popula/i),
  item('2.3', 'Variação dos domicílios', 'SOCIO', /varia[çc][ãa]o.*domic|proje[çc][ãa]o.*domic/i),
  item('2.4', 'População por renda', 'SOCIO', /popula[çc][ãa]o.*renda|renda.*popula[çc][ãa]o|popula[çc][ãa]o\s+por\s+faixa/i),
  // "Mapa de X" no deck real aparece como o próprio tema ("Densidade demográfica").
  visualItem('2.4.1', 'Mapa de densidade populacional', 'SOCIO', /mapa.*densidade|densidade.*mapa|densidade\s+demogr[áa]fica/i),
  item('2.5', 'Domicílios por renda', 'SOCIO', /domic[íi]lios?.*renda|renda.*domic[íi]lios?/i), item('2.6', 'Domicílios por moradores', 'SOCIO', /domic[íi]lios?.*morador|moradores?.*domic/i),
  visualItem('2.5.1', 'Mapa de renda', 'SOCIO', /mapa.*renda|renda.*mapa|renda\s+domiciliar/i), item('2.7', 'Domicílios por tipo', 'SOCIO', /domic[íi]lios?.*tipo|verticaliza[çc][ãa]o/i),
  visualItem('2.7.1', 'Mapa de verticalização', 'SOCIO', /mapa.*verticaliza|verticaliza.*mapa|[íi]ndice\s+de\s+verticaliza[çc][ãa]o/i),
  visualItem('2.8', 'Ocupação/propriedade', 'SOCIO', /ocupa[çc][ãa]o|propriedade|domic[íi]lios?\s+por\s+tipo/i),
  visualItem('2.8.1', 'Mapa de propriedade', 'SOCIO', /mapa.*propriedade|propriedade.*mapa|domic[íi]lios?\s+por\s+tipo/i),
  item('3.1', 'Absorção Z.I. total', 'ABSORCAO', /absor[çc][ãa]o/), item('3.1.1', 'Cenários de absorção', 'ABSORCAO', /cen[áa]rios?.*absor|absor.*cen[áa]rios?/i),
  visualItem('4.1', 'Mapa de localização', 'MERCADO', /mapa.*localiza|localiza[çc][ãa]o.*mapa|localiza[çc][ãa]o\s+dos\s+empreendimentos/i),
  visualItem('4.2', 'Mapa R$/m²', 'MERCADO', /mapa.*r\$\/?m|r\$\/?m.*mapa|localiza[çc][ãa]o\s+dos\s+empreendimentos/i),
  visualItem('4.3', 'Mapa de estoque', 'MERCADO', /mapa.*estoque|estoque.*mapa|localiza[çc][ãa]o\s+dos\s+empreendimentos/i),
  visualItem('4.4', 'Mapa de área média', 'MERCADO', /mapa.*[áa]rea|[áa]rea\s+m[ée]dia|localiza[çc][ãa]o\s+dos\s+empreendimentos/i),
  visualItem('4.5', 'Consolidada', 'MERCADO', /consolidad/i, /empreendimentos\s+(?:at[ée]|de)\s+\d+\s*km/i), item('4.6', 'Oferta por padrão', 'MERCADO', /oferta.*padr[ãa]o|padr[ãa]o.*oferta/i),
  item('4.7', 'Oferta por ano', 'MERCADO', /oferta.*ano|ano.*lan[çc]amento/i), item('4.8', 'Oferta por tipologia', 'MERCADO', /oferta.*tipologia|tipologia.*oferta/i),
  item('4.9', 'Preços por tipologia', 'MERCADO', /pre[çc]o.*tipologia|tipologia.*pre[çc]o/i), item('4.10', 'Preços por padrão', 'MERCADO', /pre[çc]o.*padr[ãa]o|padr[ãa]o.*pre[çc]o/i),
  item('5.1', 'Lacunas tipologia × metragem', 'LACUNAS', /lacuna.*tipologia.*metragem|tipologia.*metragem/i),
  item('5.2', 'Lacunas tipologia × preço', 'LACUNAS', /lacuna.*tipologia.*pre[çc]o|tipologia.*pre[çc]o/i),
  item('5.3', 'Lacunas preço × metragem', 'LACUNAS', /lacuna.*pre[çc]o.*metragem|pre[çc]o.*metragem/i),
  visualItem('6', 'Fichas técnicas', 'MERCADO', /ficha\s+t[ée]cnica/i, /concorrentes/i), item('7.1', 'Futuros lançamentos', 'MERCADO', /futuros?\s+lan[çc]amentos?/i),
  item('8.1', 'Revenda', 'MERCADO', /revenda/i), item('8.2', 'Revenda por bairro', 'MERCADO', /revenda.*bairro|bairro.*revenda/i),
  item('8.3', 'Revenda por tipologia', 'MERCADO', /revenda.*tipologia|tipologia.*revenda/i), item('8.4', 'Ticket de revenda', 'MERCADO', /ticket.*revenda|revenda.*ticket/i),
];

// Slides de capa/sumário/objetivos listam o índice inteiro — reconhecê-los pela
// seção (ou ausência dela nos primeiros slides) evita o falso "presente" e não
// derruba conteúdo real que apareça cedo no deck (ex.: endereço no slide 4).
const INDEX_SECTIONS = new Set(['CAPA', 'SUMARIO', 'INDICE', 'OBJETIVOS', 'AGENDA', 'METODOLOGIA']);
// "índice" sozinho é ambíguo: o deck real tem "Índice de verticalização", que é
// CONTEÚDO, não sumário. Exige-se a forma de sumário ("índice" isolado/"índice
// do estudo"), nunca "índice de <métrica>".
const SUMMARY_RX = /sum[áa]rio|[íi]ndice(?!\s+de\s+\w)|agenda|objetivos\s+do\s+estudo/i;

function isIndexSlide(slide: Ir['slides'][number]): boolean {
  const sec = (slide.secao_canonica ?? '').toUpperCase();
  if (INDEX_SECTIONS.has(sec)) return true;
  if ((!sec || sec === 'IDENTIFICACAO') && SUMMARY_RX.test(slide.titulo ?? '')) return true;
  return slide.n <= 2 && !sec;
}

export function structureChecklistFinding(ir: Ir): Finding {
  const evidence = ir.slides.filter((s) => !isIndexSlide(s)).map((s) => `${s.titulo ?? ''}\n${(s.textos ?? []).join('\n')}`).map((text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  // Item visual só é declarado ausente se o deck não tiver imagem nenhuma —
  // com imagens presentes, a ausência textual não prova ausência do conteúdo.
  const hasImages = ir.slides.some((s) => (s.n_imagens ?? 0) > 0);
  const status = CHECKLIST.map((entry) => {
    if (evidence.some((slide) => entry.patterns.some((p) => p.test(slide)))) return { entry, status: 'ok' as const };
    return { entry, status: entry.visual && hasImages ? ('na' as const) : ('missing' as const) };
  });

  const missing = status.filter((s) => s.status === 'missing');
  const toCheck = status.filter((s) => s.status === 'na');
  const parts = [
    missing.length ? `${missing.length} ausente(s)` : '',
    toCheck.length ? `${toCheck.length} a conferir em imagem` : '',
  ].filter(Boolean);
  return {
    id: 'structure', type: 'STRUCTURE_MISSING', section: 'ESTRUTURA', slideRef: '—',
    title: `Checklist estrutural (${parts.join(' · ') || 'completo'})`,
    detail: 'Cobertura por título e texto do slide, fora do sumário. Itens “a conferir” são mapas/prints: o conteúdo pode estar dentro da imagem — confirme visualmente antes de tratar como ausência.',
    ok: missing.length === 0,
    viz: { kind: 'text', checklist: status.map(({ entry, status: s }) => ({ label: `${entry.id} — ${entry.label}`, status: s })) },
  };
}
