// Cruzamentos WS2/WS5 do Corretor v3. Todas as funções são puras: recebem as
// tabelas já extraídas (nativas ou visão), sem nova chamada/custo de IA.

import { checkProjectionSeries, crossBands, rowLabels } from '../audit/engine';
import { irTableToExtracted } from '../audit/ir-rules';
import { toAuditSection, type Ir } from '../audit/ir';
import type { Cell, ExtractedTable, Finding } from '../audit/model';
import type { ExtractedTableRef } from './ia-vision';

export interface CrossTableRef extends ExtractedTableRef { source: 'ir' | 'vision' }

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const titleOf = (r: CrossTableRef) => norm(`${r.titulo ?? ''} ${r.table.title} ${r.table.columns.join(' ')}`);
const refLabel = (r: CrossTableRef) => `s${r.slide}${r.table.title ? ` — ${r.table.title.slice(0, 42)}` : ''}`;
const numeric = (v: Cell): v is number => typeof v === 'number' && Number.isFinite(v);

export function nativeTableRefs(ir: Ir): CrossTableRef[] {
  const out: CrossTableRef[] = [];
  for (const slide of ir.slides) for (const table of slide.tabelas ?? []) {
    const ext = irTableToExtracted(table);
    if (ext) out.push({ slide: slide.n, secao: slide.secao_canonica, titulo: slide.titulo, sha1: `ir-s${slide.n}`, table: ext, source: 'ir' });
  }
  return out;
}

function asCross(refs: ExtractedTableRef[]): CrossTableRef[] {
  return refs.map((r) => ({ ...r, source: 'vision' as const }));
}

function mismatch(id: string, type: 'CROSS_TABLE_MISMATCH' | 'TOTALS_EQUALITY', section: Finding['section'], left: CrossTableRef, right: CrossTableRef, title: string, detail: string, rows: ReturnType<typeof crossBands>): Finding | null {
  if (!rows.some((r) => r.mismatch)) return null;
  return {
    id, type, section, slideRef: `s${left.slide} × s${right.slide}`, title, detail, ok: false,
    viz: { kind: 'sidebyside', leftLabel: refLabel(left), rightLabel: refLabel(right), rows },
    evidenceSha1: left.source === 'vision' ? left.sha1 : right.source === 'vision' ? right.sha1 : undefined,
  };
}

function totalOf(table: ExtractedTable, matcher: RegExp): number | null {
  const col = table.columns.findIndex((c) => matcher.test(norm(c)));
  if (col < 0) return null;
  const declared = table.totals?.[col];
  if (numeric(declared)) return declared;
  const totalRow = table.rows.find((row) => /^total/i.test(String(row[0] ?? '')));
  if (totalRow && numeric(totalRow[col])) return totalRow[col] as number;
  const values = table.rows.map((r) => r[col]).filter(numeric);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}

function totalRows(left: CrossTableRef, right: CrossTableRef, matcher: RegExp, label: string) {
  const a = totalOf(left.table, matcher), b = totalOf(right.table, matcher);
  if (a === null || b === null) return [];
  return [{ label, left: a, right: b, mismatch: Math.abs(a - b) > 0.5 }];
}

function grandTotal(table: ExtractedTable): number | null {
  const declared = (table.totals ?? []).find(numeric);
  if (declared !== undefined) return declared;
  const total = table.rows.find((row) => /^total/i.test(String(row[0] ?? '')))?.find(numeric);
  if (total !== undefined) return total;
  for (let col = 1; col < table.columns.length; col++) {
    const values = table.rows.map((row) => row[col]).filter(numeric);
    if (values.length >= 2) return values.reduce((sum, value) => sum + value, 0);
  }
  return null;
}

/**
 * WS2: renda SOCIO×ABSORÇÃO, lacunas entre quebras e totais da consolidada.
 * A classificação depende de assinatura explícita no título/colunas para não
 * comparar tabelas Brasil/Estado ou grandezas diferentes por acidente.
 */
export function crossTableFindings(ir: Ir, visionTables: ExtractedTableRef[]): Finding[] {
  const refs = [...nativeTableRefs(ir), ...asCross(visionTables)];
  const out: Finding[] = [];
  const income = refs.filter((r) => /renda/.test(titleOf(r)));
  const socioIncome = income.filter((r) => (r.secao ?? '').toUpperCase() === 'SOCIO' && /domic/.test(titleOf(r)));
  const absIncome = income.filter((r) => (r.secao ?? '').toUpperCase() === 'ABSORCAO');
  for (const left of socioIncome) for (const right of absIncome) {
    const rows = crossBands(rowLabels(left.table), rowLabels(right.table), refLabel(left), refLabel(right));
    const f = mismatch(`cross-renda-${left.slide}-${right.slide}`, 'CROSS_TABLE_MISMATCH', 'ABSORCAO', left, right,
      'Faixas de renda divergem entre sociodemografia e absorção',
      'As faixas de renda da absorção devem reproduzir a tabela “Domicílios por faixa de renda”.', rows);
    if (f) out.push(f);
  }

  for (const measure of [
    { key: 'populacao', label: 'População', pattern: /popula[cç][aã]o/ },
    { key: 'domicilios', label: 'Domicílios', pattern: /domic[ií]lios?/ },
  ]) {
    const tables = refs.filter((r) => (r.secao ?? '').toUpperCase() === 'SOCIO' && measure.pattern.test(titleOf(r)));
    for (let i = 0; i < tables.length; i++) for (let j = i + 1; j < tables.length; j++) {
      const left = tables[i], right = tables[j];
      if (Math.abs(left.slide - right.slide) > 10) continue;
      const a = grandTotal(left.table), b = grandTotal(right.table);
      if (a === null || b === null) continue;
      const rows = [{ label: `Total de ${measure.label.toLowerCase()}`, left: a, right: b, mismatch: Math.abs(a - b) > 0.5 }];
      const f = mismatch(`cross-${measure.key}-${left.slide}-${right.slide}`, 'CROSS_TABLE_MISMATCH', 'SOCIO', left, right,
        `${measure.label} diverge entre tabelas sociodemográficas`,
        `O total de ${measure.label.toLowerCase()} deve ser o mesmo nas tabelas da mesma Z.I.; confira escala e origem.`, rows);
      if (f) out.push(f);
    }
  }

  const lacunas = refs.filter((r) => (r.secao ?? '').toUpperCase() === 'LACUNAS' && /lacuna|oferta/.test(titleOf(r)));
  for (let i = 0; i < lacunas.length; i++) for (let j = i + 1; j < lacunas.length; j++) {
    const left = lacunas[i], right = lacunas[j];
    // Só compara tabelas próximas ou da mesma referência textual; evita cruzar Z.I.s diferentes.
    if (Math.abs(left.slide - right.slide) > 5) continue;
    const rows = crossBands(rowLabels(left.table), rowLabels(right.table), refLabel(left), refLabel(right));
    const f = mismatch(`cross-lacunas-bins-${left.slide}-${right.slide}`, 'CROSS_TABLE_MISMATCH', 'LACUNAS', left, right,
      'Faixas de lacunas divergem entre as análises',
      'A tabela geral e suas quebras devem usar o mesmo conjunto de faixas. Confira a lacuna indicada.', rows);
    if (f) out.push(f);
  }

  const consolidated = refs.filter((r) => /consolid/.test(titleOf(r)));
  const offerAnalysis = refs.filter((r) => /oferta/.test(titleOf(r)) && /padrao|tipologia|ano/.test(titleOf(r)));
  for (const left of consolidated) for (const right of offerAnalysis) {
    if (Math.abs(left.slide - right.slide) > 8) continue;
    const rows = [
      ...totalRows(left, right, /oferta\s*lanc|lancada/, 'Oferta lançada'),
      ...totalRows(left, right, /oferta\s*(final|atual)|estoque/, 'Oferta atual/final'),
    ];
    const f = mismatch(`cross-consolidada-${left.slide}-${right.slide}`, 'TOTALS_EQUALITY', 'MERCADO', left, right,
      'Total da consolidada diverge da análise de oferta',
      'Os totais de oferta da consolidada e das análises por padrão/tipologia/ano devem coincidir.', rows);
    if (f) out.push(f);
  }
  return out;
}

/** WS5: janela canônica (ano atual+1..+6) e fórmula/ritmo de projeção. */
export function projectionFindings(refs: CrossTableRef[], currentYear = new Date().getFullYear()): Finding[] {
  const out: Finding[] = [];
  for (const ref of refs) {
    if (!/projec|varia/.test(titleOf(ref))) continue;
    const years = ref.table.columns.map((c) => Number(c.match(/\b(20\d{2})\b/)?.[1])).filter(Number.isFinite);
    if (years.length >= 2) {
      const expected = Array.from({ length: 6 }, (_, i) => currentYear + 1 + i);
      const found = [...new Set(years)].sort((a, b) => a - b);
      const rows = expected.map((year) => ({ label: String(year), left: String(year), right: found.includes(year) ? String(year) : '—', mismatch: !found.includes(year) }));
      if (rows.some((r) => r.mismatch)) out.push({
        id: `temporal-${ref.slide}-${found.join('-')}`, type: 'TEMPORAL_WINDOW', section: toAuditSection(ref.secao), slideRef: `s${ref.slide}`,
        title: 'Janela de projeção incompleta ou deslocada', detail: `Esperado: ${expected[0]}–${expected.at(-1)}; encontrado: ${found.join(', ')}.`, ok: false,
        viz: { kind: 'sidebyside', leftLabel: 'Janela esperada', rightLabel: refLabel(ref), rows }, evidenceSha1: ref.source === 'vision' ? ref.sha1 : undefined,
      });
    }
    const viz = checkProjectionSeries(ref.table);
    if (viz && (viz.badRows?.length ?? 0) > 0) out.push({
      id: `projection-formula-${ref.slide}`, type: 'PROJECTION_FORMULA', section: toAuditSection(ref.secao), slideRef: `s${ref.slide}`,
      title: 'Série de projeção pede conferência da fórmula', detail: viz.notes?.[0] ?? 'A série não segue a taxa/ritmo informado.', ok: false,
      viz, evidenceSha1: ref.source === 'vision' ? ref.sha1 : undefined,
    });
  }
  return out;
}
