// Motor DET sobre o IR completo — porte TS do rules_ir.py.
// Recebe um Ir (carregado de .ir.json) e devolve Finding[] + um StudyFixture,
// para o mesmo pipeline da Auditoria v2 rodar sobre estudos reais no browser.

import { checkTableSums } from './engine';
import { toAuditSection, type Ir, type IrSlide, type IrTable } from './ir';
import type { Cell, ExtractedTable, Finding, StudyFixture } from './model';
import { structureChecklistFinding } from './structure-checklist';
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

function slideRef(n: number) { return `s${n}`; }

// ── LEFTOVER_NOTE ────────────────────────────────────────────────────────────
function noteFindings(ir: Ir): Finding[] {
  const out: Finding[] = [];
  for (const s of ir.slides) {
    const revisionNotes = (s.notas_revisao ?? []).filter(Boolean);
    const editionNotes = (s.notas_edicao ?? []).filter((t) => t && LEFTOVER.test(t));
    const notes = [...revisionNotes, ...editionNotes];
    notes.forEach((t, i) => {
      out.push({
        id: `note-${s.n}-${i}`,
        type: 'LEFTOVER_NOTE',
        section: toAuditSection(s.secao_canonica),
        slideRef: slideRef(s.n),
        title: 'Nota interna de revisão no slide',
        detail: 'Comentário de revisão deixado no deck (rede de segurança — estudos entregues não devem conter notas).',
        ok: false,
        viz: { kind: 'text', location: s.titulo ?? undefined, evidence: `“${t.trim()}”` },
      });
    });
  }
  return out;
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
      if (bad > 0) {
        findings.push({
          id: `sum-${s.n}-${ti}`,
          type: 'ABSOLUTE_SUM',
          section: toAuditSection(s.secao_canonica),
          slideRef: slideRef(s.n),
          title: 'Tabela não fecha no total declarado',
          detail: `Checagem determinística de soma sobre a tabela nativa do slide ${s.n}.`,
          ok: false,
          viz,
        });
      } else {
        verified++;
      }
    }
  }
  return { findings, verified, numericTables };
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
      const words = match[1].trim().split(/\s+/);
      let found: string | undefined;
      for (let size = Math.min(7, words.length); size >= 1; size--) {
        found = MUNICIPIO_BY_NORMALIZED.get(words.slice(-size).join(' '));
        if (found) break;
      }
      if (!found || normalized(found) === expectedNormalized) continue;
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
    ...noteFindings(ir),
    ...(RULES_ENABLED.SOURCE_MISSING ? sourceFindings(ir) : []),
    ...radiiFindings(ir),
    ...num.findings,
    ...wrongCityFindings(ir, ctx?.city),
    ...wrongUfFindings(ir, ctx?.uf),
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
  return findings;
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
