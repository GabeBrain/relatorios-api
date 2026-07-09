// Motor DET sobre o IR completo — porte TS do rules_ir.py.
// Recebe um Ir (carregado de .ir.json) e devolve Finding[] + um StudyFixture,
// para o mesmo pipeline da Auditoria v2 rodar sobre estudos reais no browser.

import { checkTableSums } from './engine';
import { toAuditSection, type Ir, type IrSlide, type IrTable } from './ir';
import type { Cell, ExtractedTable, Finding, StudyFixture } from './model';

const LEFTOVER = /\b(agrupar|ajustar|revisar|conferir|confirmar|checar|verificar|inserir|colocar|preencher|refazer|corrigir|pendente|trazer|falar com|fale comigo|todo|xxx)\b/i;
const TOTAL_ROW = /^\s*total/i;
const CANONICAS = ['IDENTIFICACAO', 'SOCIO', 'MERCADO', 'ABSORCAO', 'LACUNAS', 'ENTORNO', 'CONCLUSAO'];

function slideRef(n: number) { return `s${n}`; }

// ── LEFTOVER_NOTE ────────────────────────────────────────────────────────────
function noteFindings(ir: Ir): Finding[] {
  const out: Finding[] = [];
  for (const s of ir.slides) {
    const notes = (s.notas_edicao ?? []).filter((t) => t && LEFTOVER.test(t));
    notes.forEach((t, i) => {
      out.push({
        id: `note-${s.n}-${i}`,
        type: 'LEFTOVER_NOTE',
        section: toAuditSection(s.secao_canonica),
        slideRef: slideRef(s.n),
        title: 'Nota interna de edição no slide',
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
function irTableToExtracted(t: IrTable): ExtractedTable | null {
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

// ── Cobertura de seções (STRUCTURE_MISSING) ──────────────────────────────────
function structureFinding(ir: Ir): Finding {
  const present = new Set(ir.slides.map((s) => (s.secao_canonica ?? '').toUpperCase()));
  return {
    id: 'structure',
    type: 'STRUCTURE_MISSING',
    section: 'ESTRUTURA',
    slideRef: '—',
    title: 'Cobertura de seções canônicas (β — dicionário v0)',
    detail: 'Seções detectadas pelo dicionário v0 do extrator (a calibrar com a analista).',
    ok: CANONICAS.every((c) => present.has(c)),
    viz: {
      kind: 'text',
      checklist: CANONICAS.map((c) => ({
        label: c.charAt(0) + c.slice(1).toLowerCase(),
        status: present.has(c) ? ('ok' as const) : ('missing' as const),
      })),
    },
  };
}

// ── Diagnóstico de cobertura numérica (números em imagem) ────────────────────
function coverageFinding(ir: Ir, numericTables: number): Finding | null {
  const imgs = ir.slides.reduce((a, s) => a + (s.n_imagens ?? 0), 0);
  const tabelas = ir.slides.reduce((a, s) => a + (s.tabelas?.length ?? 0), 0);
  if (numericTables > 0) return null;
  return {
    id: 'coverage',
    type: 'MAP_CHART_MISMATCH',
    section: 'GLOBAL',
    slideRef: '—',
    title: 'Números presos em imagem (auditoria numérica limitada)',
    detail: `Este estudo tem ${tabelas} tabela(s) nativa(s), nenhuma com número parseável, e ${imgs} imagens. As regras de soma/consistência dependem da Fase C (visão) ou de tabelas nativas no PPT.`,
    ok: false,
    viz: { kind: 'text', evidence: `tabelas nativas: ${tabelas} · numéricas: 0 · imagens: ${imgs}` },
  };
}

export function irToFindings(ir: Ir): Finding[] {
  const num = numericFindings(ir);
  const findings: Finding[] = [
    ...noteFindings(ir),
    ...sourceFindings(ir),
    ...num.findings,
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
  const cov = coverageFinding(ir, num.numericTables);
  if (cov) findings.push(cov);
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
