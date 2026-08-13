// Motor DET sobre o IR completo — porte TS do rules_ir.py.
// Recebe um Ir (carregado de .ir.json) e devolve Finding[] + um StudyFixture,
// para o mesmo pipeline da Auditoria v2 rodar sobre estudos reais no browser.

import { checkTableSums } from './engine';
import { toAuditSection, type Ir, type IrSlide, type IrTable } from './ir';
import type { Cell, ExtractedTable, Finding, StudyFixture } from './model';
import { structureChecklistFinding } from './structure-checklist';
import { resolvePaginatedSums, type SumSlice } from '../v3/paginated-tables';
import { applyDeclaredExclusions } from '../v3/declared-exclusions';
import municipiosPorUf from '@/assets/municipios-br.json';

// Regras desativáveis por decisão de produto. SOURCE_MISSING desligada em
// 09/jul/2026 (Gabriel): veio do doc de parâmetros mais recente, mas na prática
// o time não preenche fonte/elaboração — gerava dezenas de achados sem ação.
// Reativar aqui quando a convenção mudar.
const RULES_ENABLED = {
  SOURCE_MISSING: false,
} as const;

const LEFTOVER = /\b(agrupar|ajustar|revisar|conferir|confirmar|checar|verificar|inserir|colocar|preencher|refazer|corrigir|pendente|trazer|falar com|fale comigo|todo|xxx)\b/i;
const TOTAL_ROW = /^\s*total/i;
const UFS = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']);

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const MUNICIPIO_BY_NORMALIZED = new Map([...new Set(
  Object.values(municipiosPorUf as Record<string, string[]>).flat().map((city) => city.trim()).filter(Boolean)
)].map((city) => [normalized(city), city]));

/** Nome oficial IBGE para um texto normalizado, ou undefined se não for município. */
export function municipioOficial(value: string): string | undefined {
  return MUNICIPIO_BY_NORMALIZED.get(normalized(value));
}

/**
 * Compara nomes de cidade tolerando conectivos ("São José do(s) Campos"): atas
 * digitadas à mão erram artigos e a comparação exata viraria FP contra a própria
 * cidade do estudo (caso Housi SJC v1, jul/2026).
 */
export function sameCity(a: string, b: string): boolean {
  const strip = (v: string) => normalized(v).split(/\s+/).filter((w) => !['de', 'da', 'do', 'das', 'dos', 'e', 'd'].includes(w)).join(' ');
  return strip(a) === strip(b);
}

function slideRef(n: number) { return `s${n}`; }

// ── Comunicação da revisão (ex-LEFTOVER_NOTE) ────────────────────────────────
// Decisão de 31/jul/2026 (Gabriel): comentário de revisão não é erro do estudo —
// é recado do analista para o A&R. No Toledo eram 32 dos 39 achados e afogavam
// todo o resto. Vira UM item agregado, fora da contagem Erro/Provável/Verificar,
// que serve de checklist do que a revisão pediu e de aviso no portão de entrega.

export interface ReviewNote { slide: number; text: string }

/** Comentários de revisão do estudo, na ordem dos slides. */
export function reviewNotesOf(ir: Ir): ReviewNote[] {
  const out: ReviewNote[] = [];
  for (const s of ir.slides) {
    const revisionNotes = (s.notas_revisao ?? []).filter(Boolean);
    const editionNotes = (s.notas_edicao ?? []).filter((t) => t && LEFTOVER.test(t));
    for (const text of [...revisionNotes, ...editionNotes]) out.push({ slide: s.n, text: text.trim() });
  }
  return out;
}

function reviewNotesFinding(ir: Ir): Finding[] {
  const notes = reviewNotesOf(ir);
  if (notes.length === 0) return [];
  const slides = [...new Set(notes.map((note) => note.slide))];
  const refs = slides.map((n) => slideRef(n));
  return [{
    id: 'review-notes',
    type: 'LEFTOVER_NOTE',
    section: 'GLOBAL',
    slideRef: '—',
    title: `${notes.length} comentário(s) de revisão em ${slides.length} slide(s)`,
    detail: 'Comunicação entre analista e A&R deixada no arquivo — não é erro do estudo. Use como checklist do que a revisão pediu; o portão de entrega avisa se o PPTX final ainda contiver comentários.',
    ok: false,
    viz: {
      kind: 'text',
      evidence: refs.join(', '),
      checklist: notes.map((note) => ({ label: `${slideRef(note.slide)} · “${note.text}”`, status: 'na' as const })),
    },
  }];
}

/**
 * A parte mais valiosa da nota: ela é gabarito parcial de graça. Slide que a
 * revisão apontou e onde o motor não achou NADA é candidato a regra faltante —
 * insumo direto de calibração. Roda no fim da análise, com texto e visão já
 * incluídos, senão acusaria o deck inteiro.
 */
export function reviewNoteBlindSpots(ir: Ir, findings: Finding[]): Finding[] {
  const notes = reviewNotesOf(ir);
  if (notes.length === 0) return [];
  const covered = new Set<number>();
  for (const finding of findings) {
    if (finding.ok || finding.type === 'LEFTOVER_NOTE') continue;
    for (const match of finding.slideRef.matchAll(/\d+/g)) covered.add(Number(match[0]));
  }
  const blind = notes.filter((note) => !covered.has(note.slide));
  const slides = [...new Set(blind.map((note) => note.slide))];
  if (slides.length === 0) return [];
  return [{
    id: 'review-notes-blind',
    type: 'LEFTOVER_NOTE',
    section: 'GLOBAL',
    slideRef: '—',
    title: `A revisão apontou ${slides.length} slide(s) onde o corretor não detectou nada`,
    detail: 'Nestes slides existe comentário da revisão e nenhum achado do motor. Pode ser pedido editorial (cor, legenda, layout) ou uma regra que ainda falta — vale conferir e, se for erro de dado, registrar na calibração.',
    ok: false,
    viz: {
      kind: 'text',
      evidence: slides.map((n) => slideRef(n)).join(', '),
      // 'na' e não 'missing': é pista de calibração, não defeito — a categoria
      // inteira é não-bloqueante e não deve pintar de vermelho.
      checklist: blind.map((note) => ({ label: `${slideRef(note.slide)} · “${note.text}”`, status: 'na' as const })),
    },
  }];
}

// ── SOURCE_MISSING ───────────────────────────────────────────────────────────
function sourceFindings(ir: Ir, cap = 25): Finding[] {
  const out: Finding[] = [];
  for (const s of ir.slides) {
    const temDado = (s.tabelas?.length ?? 0) > 0 || (s.graficos?.length ?? 0) > 0;
    if (temDado && (s.fontes?.length ?? 0) === 0) {
      out.push({
        id: `src-${s.n}`,
        type: 'SOURCE_MISSING',
        section: toAuditSection(s.secao_canonica),
        slideRef: slideRef(s.n),
        title: 'Tabela/gráfico sem fonte em texto',
        detail: `${s.tabelas?.length ?? 0} tabela(s), ${s.graficos?.length ?? 0} gráfico(s) sem “FONTE/ELABORAÇÃO” em texto (pode ser falso positivo se a fonte estiver na imagem).`,
        ok: false,
        viz: { kind: 'text', location: s.titulo ?? undefined },
      });
    }
    if (out.length >= cap) break;
  }
  return out;
}

// ── Numéricas (ABSOLUTE_SUM / PERCENTAGE_SUM) ────────────────────────────────
/** Converte tabela nativa do IR para o contrato comum da visão/cross-check. */
export function irTableToExtracted(t: IrTable): ExtractedTable | null {
  if (!t.linhas || t.linhas.length < 2) return null;
  const header = (t.linhas[0] ?? []).map((c) => (c ?? '').toString());
  const totalIdx = t.linhas.findIndex((r, i) => i > 0 && TOTAL_ROW.test((r?.[0] ?? '').toString()));
  const cellAt = (i: number, c: number): Cell => {
    const num = t.linhas_num?.[i]?.[c];
    if (typeof num === 'number') return num;
    const raw = t.linhas?.[i]?.[c];
    return raw == null ? null : raw;
  };
  const dataRows: Cell[][] = [];
  for (let i = 1; i < t.linhas.length; i++) {
    if (i === totalIdx) continue;
    dataRows.push(header.map((_, c) => cellAt(i, c)));
  }
  const totals = totalIdx >= 0 ? header.map((_, c) => cellAt(totalIdx, c)) : undefined;
  return { title: header[0] || 'Tabela', columns: header, rows: dataRows, totals };
}

function numericFindings(ir: Ir): { findings: Finding[]; verified: number; numericTables: number } {
  const findings: Finding[] = [];
  const slices: SumSlice[] = [];
  let verified = 0;
  let numericTables = 0;
  for (const s of ir.slides) {
    for (let ti = 0; ti < (s.tabelas?.length ?? 0); ti++) {
      const t = s.tabelas[ti];
      const hasNum = (t.linhas_num ?? []).some((r) => r.some((c) => typeof c === 'number'));
      if (!hasNum) continue;
      const ext = irTableToExtracted(t);
      if (!ext || !ext.totals) continue;
      numericTables++;
      const nRows = ext.rows.length;
      const viz = checkTableSums(ext, { absTol: Math.max(0.5, nRows / 2) });
      const bad = (viz.badColumns?.length ?? 0) + (viz.badRows?.length ?? 0);
      if (bad > 0 || viz.unaligned) {
        const id = `sum-${s.n}-${ti}`;
        findings.push({
          id,
          type: 'ABSOLUTE_SUM',
          section: toAuditSection(s.secao_canonica),
          slideRef: slideRef(s.n),
          title: viz.unaligned ? 'Totais da tabela não conferidos' : 'Tabela não fecha no total declarado',
          detail: viz.unaligned
            ? `A linha de totais do slide ${s.n} não pôde ser casada com as colunas, então a soma não foi conferida.`
            : `Checagem determinística de soma sobre a tabela nativa do slide ${s.n}.`,
          ok: false,
          viz,
          // Sem alinhamento não há acusação a sustentar: é convite a olhar, não erro.
          ...(viz.unaligned ? { confidence: 3 as const } : {}),
        });
        slices.push({ slide: s.n, section: toAuditSection(s.secao_canonica), findingId: id, table: ext });
      } else {
        verified++;
      }
    }
  }

  // Fatias da mesma tabela repetindo o total do conjunto não são N erros: a soma
  // do conjunto é que decide (ver paginated-tables).
  const paged = resolvePaginatedSums(slices);
  return {
    findings: findings.filter((f) => !paged.dropIds.has(f.id)).concat(paged.findings),
    verified: verified + paged.verified,
    numericTables,
  };
}

// ── RADII (nível 1 DET) — consistência dos raios/zonas de tempo ──────────────
const MIN_TOKEN = /\b(\d{1,3})\s*min\b/gi;

function radiiOf(s: IrSlide): string[] {
  const text = [s.titulo ?? '', ...(s.textos ?? [])].join(' ');
  const found = new Set<number>();
  let m: RegExpExecArray | null;
  MIN_TOKEN.lastIndex = 0;
  while ((m = MIN_TOKEN.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 180) found.add(n);
  }
  return [...found].sort((a, b) => a - b).map((n) => `${n} min`);
}

function radiiFindings(ir: Ir): Finding[] {
  // considera só slides com >=2 raios (legendas de mapa), evita prosa solta
  const perSlide = ir.slides
    .map((s) => ({ n: s.n, sec: toAuditSection(s.secao_canonica), set: radiiOf(s) }))
    .filter((p) => p.set.length >= 2);
  if (perSlide.length === 0) return [];

  // canônico = a legenda COMPLETA (maior cardinalidade) mais frequente do estudo.
  // Subconjuntos dela são legítimos; só sinalizamos raio ESTRANHO ao canônico.
  const maxLen = Math.max(...perSlide.map((p) => p.set.length));
  const fullCounts = new Map<string, number>();
  for (const p of perSlide) {
    if (p.set.length === maxLen) {
      const k = p.set.join('|');
      fullCounts.set(k, (fullCounts.get(k) ?? 0) + 1);
    }
  }
  const canonical = [...fullCounts.entries()].sort((a, b) => b[1] - a[1])[0][0].split('|');
  const canonSet = new Set(canonical.map((r) => r.toLowerCase()));

  const out: Finding[] = [];
  for (const p of perSlide) {
    const foreign = p.set.filter((r) => !canonSet.has(r.toLowerCase()));
    if (foreign.length > 0) {
      out.push({
        id: `radii-${p.n}`,
        type: 'RADII',
        section: p.sec,
        slideRef: slideRef(p.n),
        title: 'Raio estranho ao padrão do estudo',
        detail: `Raio(s) ${foreign.join(', ')} não fazem parte do conjunto canônico do estudo (${canonical.join(', ')}). Possível slide de outro estudo.`,
        ok: false,
        viz: { kind: 'map', expected: canonical, detected: p.set },
      });
    }
  }
  if (out.length === 0) {
    out.push({
      id: 'radii-ok',
      type: 'RADII',
      section: 'GLOBAL',
      slideRef: '—',
      title: 'Raios consistentes em todo o estudo',
      detail: `Todos os ${perSlide.length} slides com legenda de raio são coerentes com o conjunto canônico.`,
      ok: true,
      viz: { kind: 'map', expected: canonical, detected: canonical },
    });
  }
  return out;
}

// ── Cobertura de seções (STRUCTURE_MISSING) ──────────────────────────────────
function structureFinding(ir: Ir): Finding {
  return structureChecklistFinding(ir);
}

/**
 * DET gratuito para o caso explícito "Cidade – UF" em capa/título. Só aceita UFs
 * brasileiras para não confundir siglas como Z.I. e A&R com estado.
 */
export function wrongUfFindings(ir: Ir, uf?: string): Finding[] {
  const expected = uf?.trim().toUpperCase();
  if (!expected || !UFS.has(expected)) return [];
  const out: Finding[] = [];
  const rx = /(?:–|-|\/)\s*([A-Z]{2})\b/g;
  for (const s of ir.slides) {
    // Listas de comparáveis em Mercado costumam citar várias praças legítimas.
    // Contexto de cidade/UF contratado é mais confiável em capa, socio e absorção.
    if (!['CAPA', 'IDENTIFICACAO', 'SOCIO', 'ABSORCAO'].includes((s.secao_canonica ?? '').toUpperCase())) continue;
    const source = [s.titulo ?? '', ...(s.textos ?? [])].join('\n');
    let match: RegExpExecArray | null;
    rx.lastIndex = 0;
    while ((match = rx.exec(source)) !== null) {
      const found = match[1];
      if (!UFS.has(found) || found === expected) continue;
      out.push({
        id: `wrong-uf-${s.n}-${found.toLowerCase()}`,
        type: 'WRONG_CONTEXT',
        section: toAuditSection(s.secao_canonica),
        slideRef: slideRef(s.n),
        title: `UF divergente do estudo (${found} ≠ ${expected})`,
        detail: `O slide declara a UF ${found}, mas a ata identifica o estudo como ${expected}. Confira possível conteúdo de outro estudo.`,
        ok: false,
        viz: { kind: 'text', location: s.titulo ?? undefined, evidence: match[0].trim() },
      });
    }
  }
  return out;
}

// ── ZI_LABEL_MISMATCH (FN-3) ─────────────────────────────────────────────────
const ZI_ORDINAIS = ['primaria', 'secundaria', 'terciaria', 'quaternaria'] as const;

/**
 * FN-3 do feedback (Lucas Finoti): o estudo declara a convenção de Z.I. num
 * slide ("Z.I. primária: 1 km; secundária: 2 km; terciária: 3 km") e depois um
 * texto troca o rótulo ("não foram encontrados empreendimentos na Z.I.
 * secundária (até 2 Km)" quando 2 km é a primária daquele estudo).
 *
 * DET puro e conservador: só roda se o deck declarar a convenção pelo menos uma
 * vez com 2+ pares ordinal→raio consistentes; e só acusa quando o MESMO texto
 * traz ordinal + raio explícitos que contradizem a tabela declarada.
 */
export function ziLabelFindings(ir: Ir): Finding[] {
  const pairRx = /z\.?\s*i\.?\s*(primaria|secundaria|terciaria|quaternaria)\s*:?\s*(?:de\s*\d+\s*km\s*a\s*)?(\d+)\s*km/gi;
  const declared = new Map<string, number>();
  const conflicting = new Set<string>();

  for (const slide of ir.slides) {
    const source = normalized([slide.titulo ?? '', ...(slide.textos ?? [])].join('\n'));
    for (const match of source.matchAll(pairRx)) {
      const ordinal = match[1].toLowerCase(), km = Number(match[2]);
      if (!Number.isFinite(km)) continue;
      const known = declared.get(ordinal);
      if (known === undefined) declared.set(ordinal, km);
      else if (known !== km) conflicting.add(ordinal);
    }
  }
  // Convenção ambígua no próprio deck: sem base segura, a regra se abstém.
  for (const ordinal of conflicting) declared.delete(ordinal);
  if (declared.size < 2) return [];

  const out: Finding[] = [];
  // Frases que citam ordinal e raio juntos, incluindo o formato "(até 2 Km)".
  const usageRx = /z\.?\s*i\.?\s*(primaria|secundaria|terciaria|quaternaria)[^.;]{0,60}?\(?\s*(?:ate|de\s*\d+\s*km\s*a)?\s*(\d+)\s*km/gi;
  for (const slide of ir.slides) {
    const source = normalized([slide.titulo ?? '', ...(slide.textos ?? [])].join('\n'));
    for (const match of source.matchAll(usageRx)) {
      const ordinal = match[1].toLowerCase(), km = Number(match[2]);
      const expected = declared.get(ordinal);
      if (expected === undefined || !Number.isFinite(km) || expected === km) continue;
      const correct = ZI_ORDINAIS.find((o) => declared.get(o) === km);
      out.push({
        id: `zi-label-${slide.n}-${ordinal}-${km}`,
        type: 'WRONG_CONTEXT',
        section: toAuditSection(slide.secao_canonica),
        slideRef: slideRef(slide.n),
        title: `Z.I. ${ordinal} não corresponde a ${km} km neste estudo`,
        detail: `O estudo define Z.I. ${ordinal} = ${expected} km${correct ? `; ${km} km é a Z.I. ${correct}` : ''}. Confira o rótulo usado no texto.`,
        ok: false,
        viz: { kind: 'text', location: slide.titulo ?? undefined, evidence: match[0].trim() },
      });
      break; // um apontamento por slide basta
    }
  }
  return out;
}

/**
 * DET pós-Ata para vazamento explícito "Cidade – UF". Cobre o caso em que a
 * UF ainda é a correta, como Curitiba–MG num estudo de Brumadinho/MG. A regra
 * exige município IBGE + UF literal para não inferir cidade por capitalização.
 */
export function wrongCityFindings(ir: Ir, city?: string): Finding[] {
  const expected = city?.trim();
  if (!expected) return [];
  const expectedNormalized = normalized(expected);
  const out: Finding[] = [];

  for (const slide of ir.slides) {
    const source = normalized([slide.titulo ?? '', ...(slide.textos ?? [])].join('\n'));
    // Primeiro reconhece o padrão literal "<até 7 palavras> – UF"; só depois
    // consulta o dicionário IBGE. Assim não percorremos ~5.500 municípios por slide.
    const cityUf = /([a-z']+(?:\s+[a-z']+){0,6})\s*(?:-|–|\/)\s*([a-z]{2})\b/gi;
    let match: RegExpExecArray | null;
    while ((match = cityUf.exec(source)) !== null) {
      // Sigla que não é UF brasileira ("Santos – FC") não é padrão Cidade – UF.
      if (!UFS.has(match[2].toUpperCase())) continue;
      const words = match[1].trim().split(/\s+/);
      let found: string | undefined;
      for (let size = Math.min(7, words.length); size >= 1; size--) {
        found = MUNICIPIO_BY_NORMALIZED.get(words.slice(-size).join(' '));
        if (found) break;
      }
      if (!found || normalized(found) === expectedNormalized || sameCity(found, expected)) continue;
      out.push({
        id: `wrong-city-${slide.n}-${normalized(found).replace(/[^a-z0-9]+/g, '-').slice(0, 36)}`,
        type: 'WRONG_CONTEXT',
        section: toAuditSection(slide.secao_canonica),
        slideRef: slideRef(slide.n),
        title: `Cidade divergente do estudo (${found} ≠ ${expected})`,
        detail: `O slide declara “${found} – ${match[2].toUpperCase()}”, mas a Ata confirmada define o estudo como ${expected}. Possível conteúdo de outro estudo.`,
        ok: false,
        viz: { kind: 'text', location: slide.titulo ?? undefined, evidence: `${found} – ${match[2].toUpperCase()}` },
      });
      // Uma ocorrência literal por slide é suficiente e evita cascata de alertas.
      break;
    }
  }
  return out;
}

// Removido em v3.3 (11/jul): o antigo "coverageFinding" ("Números presos em
// imagem — auditoria limitada, depende da Fase C") ficou obsoleto — a visão agora
// roda automaticamente no passo único, então números em imagem SÃO auditados.

export function irToFindings(ir: Ir, ctx?: { city?: string; uf?: string }): Finding[] {
  const num = numericFindings(ir);
  const findings: Finding[] = [
    ...reviewNotesFinding(ir),
    ...(RULES_ENABLED.SOURCE_MISSING ? sourceFindings(ir) : []),
    ...radiiFindings(ir),
    ...num.findings,
    ...wrongCityFindings(ir, ctx?.city),
    ...wrongUfFindings(ir, ctx?.uf),
    ...ziLabelFindings(ir),
  ];
  if (num.verified > 0) {
    findings.push({
      id: 'sum-ok',
      type: 'ABSOLUTE_SUM',
      section: 'GLOBAL',
      slideRef: '—',
      title: `${num.verified} tabela(s) nativa(s) fecham nos totais`,
      detail: 'Checagem determinística de soma consistente nas tabelas com dados numéricos.',
      ok: true,
      viz: { kind: 'text', evidence: `${num.verified}/${num.numericTables} tabelas numéricas consistentes` },
    });
  }
  findings.push(structureFinding(ir));
  // CH-6: total que não fecha por exclusão declarada no slide vira “Verificar”.
  return applyDeclaredExclusions(ir, findings);
}

function basename(path: string): string {
  return (path.split(/[\\/]/).pop() ?? path).replace(/\.(pptx|ir\.json|json)$/i, '');
}

export function parseIrToStudy(ir: Ir, filename: string): StudyFixture {
  const findings = irToFindings(ir);
  return {
    id: `ir-${basename(filename)}`.slice(0, 60),
    label: basename(ir.arquivo || filename),
    city: '—',
    type: 'IR carregado',
    slides: ir.n_slides,
    radii: '—',
    findings,
  };
}
