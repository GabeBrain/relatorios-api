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
}

const item = (id: string, label: string, section: Finding['section'], ...patterns: RegExp[]): StructureItem => ({ id, label, section, patterns, required: true });

export const CHECKLIST: StructureItem[] = [
  item('1.1', 'Endereço', 'ESTRUTURA', /endere[çc]o/i), item('1.2', 'Latitude/longitude', 'ESTRUTURA', /lat(?:itude)?\s*(?:\/|e)?\s*long/i),
  item('1.3', 'Área do terreno', 'ESTRUTURA', /[áa]rea\s+(?:do\s+)?terreno/i), item('1.4', 'Acessos', 'ENTORNO', /acessos?|vias?\s+de\s+acesso/i),
  item('1.5', 'Entorno varejo/serviços', 'ENTORNO', /varejo|servi[çc]os|entorno/i), item('1.6', 'Entorno revendas', 'ENTORNO', /revendas?/i),
  item('1.7', 'Mapeamento físico', 'ENTORNO', /mapeamento\s+f[íi]sico/i), item('1.9', 'Distância ao centro', 'ENTORNO', /dist[âa]ncia.*centro|centro.*dist[âa]ncia/i),
  item('2.1', 'Dados cidade/estado/Brasil', 'SOCIO', /cidade.*estado|dados\s+(?:da\s+)?cidade|brasil/i), item('2.2', 'Variação da população', 'SOCIO', /varia[çc][ãa]o.*popula|proje[çc][ãa]o.*popula/i),
  item('2.3', 'Variação dos domicílios', 'SOCIO', /varia[çc][ãa]o.*domic|proje[çc][ãa]o.*domic/i), item('2.4', 'População por renda', 'SOCIO', /popula[çc][ãa]o.*renda|renda.*popula[çc][ãa]o/i),
  item('2.4.1', 'Mapa de densidade populacional', 'SOCIO', /mapa.*densidade|densidade.*mapa/i),
  item('2.5', 'Domicílios por renda', 'SOCIO', /domic[íi]lios?.*renda|renda.*domic[íi]lios?/i), item('2.6', 'Domicílios por moradores', 'SOCIO', /domic[íi]lios?.*morador|moradores?.*domic/i),
  item('2.5.1', 'Mapa de renda', 'SOCIO', /mapa.*renda|renda.*mapa/i), item('2.7', 'Domicílios por tipo', 'SOCIO', /domic[íi]lios?.*tipo|verticaliza[çc][ãa]o/i),
  item('2.7.1', 'Mapa de verticalização', 'SOCIO', /mapa.*verticaliza|verticaliza.*mapa/i), item('2.8', 'Ocupação/propriedade', 'SOCIO', /ocupa[çc][ãa]o|propriedade/i),
  item('2.8.1', 'Mapa de propriedade', 'SOCIO', /mapa.*propriedade|propriedade.*mapa/i),
  item('3.1', 'Absorção Z.I. total', 'ABSORCAO', /absor[çc][ãa]o/), item('3.1.1', 'Cenários de absorção', 'ABSORCAO', /cen[áa]rios?.*absor|absor.*cen[áa]rios?/i),
  item('4.1', 'Mapa de localização', 'MERCADO', /mapa.*localiza|localiza[çc][ãa]o.*mapa/i), item('4.2', 'Mapa R$/m²', 'MERCADO', /mapa.*r\$\/?m|r\$\/?m.*mapa/i),
  item('4.3', 'Mapa de estoque', 'MERCADO', /mapa.*estoque|estoque.*mapa/i), item('4.4', 'Mapa de área média', 'MERCADO', /mapa.*[áa]rea|[áa]rea\s+m[ée]dia/i),
  item('4.5', 'Consolidada', 'MERCADO', /consolidad/i), item('4.6', 'Oferta por padrão', 'MERCADO', /oferta.*padr[ãa]o|padr[ãa]o.*oferta/i),
  item('4.7', 'Oferta por ano', 'MERCADO', /oferta.*ano|ano.*lan[çc]amento/i), item('4.8', 'Oferta por tipologia', 'MERCADO', /oferta.*tipologia|tipologia.*oferta/i),
  item('4.9', 'Preços por tipologia', 'MERCADO', /pre[çc]o.*tipologia|tipologia.*pre[çc]o/i), item('4.10', 'Preços por padrão', 'MERCADO', /pre[çc]o.*padr[ãa]o|padr[ãa]o.*pre[çc]o/i),
  item('5.1', 'Lacunas tipologia × metragem', 'LACUNAS', /lacuna.*tipologia.*metragem|tipologia.*metragem/i),
  item('5.2', 'Lacunas tipologia × preço', 'LACUNAS', /lacuna.*tipologia.*pre[çc]o|tipologia.*pre[çc]o/i),
  item('5.3', 'Lacunas preço × metragem', 'LACUNAS', /lacuna.*pre[çc]o.*metragem|pre[çc]o.*metragem/i),
  item('6', 'Fichas técnicas', 'MERCADO', /ficha\s+t[ée]cnica/i), item('7.1', 'Futuros lançamentos', 'MERCADO', /futuros?\s+lan[çc]amentos?/i),
  item('8.1', 'Revenda', 'MERCADO', /revenda/i), item('8.2', 'Revenda por bairro', 'MERCADO', /revenda.*bairro|bairro.*revenda/i),
  item('8.3', 'Revenda por tipologia', 'MERCADO', /revenda.*tipologia|tipologia.*revenda/i), item('8.4', 'Ticket de revenda', 'MERCADO', /ticket.*revenda|revenda.*ticket/i),
];

// Slides de capa/sumário/objetivos listam o índice inteiro — reconhecê-los pela
// seção (ou ausência dela nos primeiros slides) evita o falso "presente" e não
// derruba conteúdo real que apareça cedo no deck (ex.: endereço no slide 4).
const INDEX_SECTIONS = new Set(['CAPA', 'SUMARIO', 'INDICE', 'OBJETIVOS', 'AGENDA', 'METODOLOGIA']);
const SUMMARY_RX = /sum[áa]rio|[íi]ndice|agenda|objetivos\s+do\s+estudo/i;

function isIndexSlide(slide: Ir['slides'][number]): boolean {
  const sec = (slide.secao_canonica ?? '').toUpperCase();
  if (INDEX_SECTIONS.has(sec)) return true;
  if ((!sec || sec === 'IDENTIFICACAO') && SUMMARY_RX.test(slide.titulo ?? '')) return true;
  return slide.n <= 2 && !sec;
}

export function structureChecklistFinding(ir: Ir): Finding {
  const evidence = ir.slides.filter((s) => !isIndexSlide(s)).map((s) => `${s.titulo ?? ''}\n${(s.textos ?? []).slice(0, 2).join('\n')}`).map((text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const status = CHECKLIST.map((entry) => ({ entry, ok: evidence.some((slide) => entry.patterns.some((p) => p.test(slide))) }));
  const missing = status.filter((s) => !s.ok);
  return {
    id: 'structure', type: 'STRUCTURE_MISSING', section: 'ESTRUTURA', slideRef: '—',
    title: `Checklist estrutural (${missing.length} item(ns) a conferir)`,
    detail: 'Cobertura por título e primeiras linhas fora do sumário. β: confirme ausências que dependem de mapa ou imagem.',
    ok: missing.length === 0,
    viz: { kind: 'text', checklist: status.map(({ entry, ok }) => ({ label: `${entry.id} — ${entry.label}`, status: ok ? 'ok' : 'missing' })) },
  };
}
