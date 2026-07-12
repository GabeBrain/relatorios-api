// Motor determinístico da Auditoria v2 — porte TS dos POC Python
// (valida_complemento.py + crosscheck_piloto.py). Funções puras sobre tabelas
// extraídas; nenhuma chamada de IA.

import type { Cell, ExtractedTable, TableViz, SideBySideRow, Bin } from './model';

const ABS_TOL_DEFAULT = 0.5;

function isNum(v: Cell): v is number {
  return typeof v === 'number';
}

/** Soma das células numéricas de uma coluna (ignora rótulos/nulos). */
function columnSum(rows: Cell[][], col: number): number {
  return rows.reduce((acc, r) => (isNum(r[col]) ? acc + (r[col] as number) : acc), 0);
}

/**
 * ABSOLUTE_SUM / PERCENTAGE_SUM — colunas cujas linhas não fecham no total
 * declarado, e linhas cujas células não somam o "Total". Tolerância maior em
 * tabelas de projeção (arredondamento de exibição): passar absTol = nRows/2.
 */
export function checkTableSums(
  table: ExtractedTable,
  opts: { absTol?: number; pctTol?: number } = {}
): TableViz {
  const absTol = opts.absTol ?? ABS_TOL_DEFAULT;
  const pctTol = opts.pctTol ?? 1.5;
  const badColumns: number[] = [];
  const badRows: number[] = [];
  const notes: string[] = [];
  const totals = table.totals;

  // Semântica declarada pela visão (hipótese): colunas que NÃO fecham em soma.
  // É só uma DAS pistas — a aritmética continua decidindo (ver abaixo).
  const notSummable = (c: number) => {
    const k = table.colKinds?.[c];
    return k === 'measure' || k === 'rate' || k === 'share';
  };

  if (totals) {
    const ncols = Math.max(...table.rows.map((r) => r.length));

    // 1ª passada: status de cada coluna somável (média-final não é somável)
    interface ColCheck { c: number; decl: number; tol: number; soma: number; ok: boolean }
    const checks: ColCheck[] = [];
    for (let c = 1; c < ncols; c++) {
      const decl = totals[c];
      if (!isNum(decl)) continue;
      const vals = table.rows.map((r) => r[c]).filter(isNum);
      if (vals.length < 2) continue;
      const soma = vals.reduce((a, b) => a + b, 0);
      const isPct = vals.every((v) => v >= 0 && v <= 100) && decl >= 85 && decl <= 115;
      const tol = isPct && Math.round(decl) === 100 ? pctTol : absTol;
      const ok = Math.abs(soma - decl) <= tol;
      if (!ok) {
        // Nem toda linha final é SOMA: tabelas de m²/preço/taxa fecham em MÉDIA
        // ("Média Geral", "Vendas s/ O.L." etc.). Duas pistas independentes, e
        // basta UMA para não acusar (mantém FP baixo sem esconder erro de soma):
        //  (a) aritmética: declarado cai ENTRE min e max (soma nunca fica aí);
        //  (b) semântica: a visão classificou a coluna como measure/rate/share.
        const mn = Math.min(...vals);
        const mx = Math.max(...vals);
        if ((decl >= mn && decl <= mx) || notSummable(c)) continue;
      }
      checks.push({ c, decl, tol, soma, ok });
    }

    // Detecção de SUBTOTAL no meio da tabela (caso real s39: "A partir de 2022"
    // re-agrega 2022+, então somar tudo conta os anos duas vezes). Se alguma
    // coluna falha e excluir UMA MESMA linha deixa TODAS as colunas somáveis
    // consistentes, a linha é subtotal — não é erro. Um dígito mal lido não passa
    // neste teste: excluir a linha errada quebra as colunas que estavam certas.
    let subtotalRow = -1;
    if (checks.some((k) => !k.ok)) {
      for (let k = 0; k < table.rows.length && subtotalRow < 0; k++) {
        const fixesAll = checks.every(({ c, decl, tol }) => {
          const vals = table.rows.filter((_, i) => i !== k).map((r) => r[c]).filter(isNum);
          if (vals.length < 2) return false;
          return Math.abs(vals.reduce((a, b) => a + b, 0) - decl) <= tol;
        });
        if (fixesAll) subtotalRow = k;
      }
    }

    if (subtotalRow < 0) {
      for (const { c, decl, soma, ok } of checks) {
        if (ok) continue;
        badColumns.push(c);
        notes.push(`Coluna «${table.columns[c] ?? c}»: soma ${round(soma)} ≠ total ${decl}`);
      }
    }
    // linhas com coluna "Total"
    const ti = table.columns.indexOf('Total');
    if (ti > 0) {
      table.rows.forEach((r, i) => {
        const cells = r.slice(1, ti).filter(isNum);
        const rowTotal = r[ti];
        if (cells.length && isNum(rowTotal)) {
          const soma = cells.reduce((a, b) => a + b, 0);
          if (Math.abs(soma - rowTotal) > absTol) {
            badRows.push(i);
            notes.push(`Linha «${r[0]}»: células somam ${round(soma)} ≠ Total ${rowTotal}`);
          }
        }
      });
    }
  }

  return { kind: 'table', table, badColumns, badRows, notes };
}

/**
 * Cross-check %↔absoluto — cada coluna de PARTICIPAÇÃO percentual deve bater com
 * `100 · abs_linha / total_abs` da coluna de valor que ela descreve. Diferente de
 * checkTableSums (que confere a coluna contra o total), este pega **dígito mal
 * lido pela visão mesmo quando a soma fecha** e aponta a LINHA exata: se a visão
 * leu 100.198 como 116.817, o % declarado (14,7%) não corresponde (≈17,2%).
 *
 * Salvaguardas (para não virar whack-a-mole por estudo):
 * - **Só valida coluna de % que é PARTICIPAÇÃO** — a própria coluna de % tem de
 *   somar ≈100 (ou ter total declarado ≈100). Assim "Var. %", "Crescimento %",
 *   taxa YoY etc. — que têm "%" no cabeçalho mas NÃO somam 100 — nunca entram e
 *   não geram falso positivo. É a diferença estrutural entre participação e taxa.
 * - **Par com a coluna imediatamente à ESQUERDA** (arranjo padrão dos estudos:
 *   "Oferta Lançada | % | Oferta Final | %"); tabelas com vários % validam cada par.
 * - **Denominador que é MÉDIA** (cai entre min e max) não serve — pula o par.
 * Retorna null quando não há nenhum par participação+valor detectável.
 */
export function checkPercentConsistency(
  table: ExtractedTable,
  opts: { tolPp?: number } = {}
): TableViz | null {
  const tolPp = opts.tolPp ?? 0.5; // pontos percentuais de tolerância (arredondamento)
  const cols = table.columns;

  const isNumericCol = (c: number) => table.rows.filter((r) => isNum(r[c])).length >= 2;
  const colTotal = (c: number): number => {
    const decl = table.totals?.[c];
    if (isNum(decl)) return decl;
    return columnSum(table.rows, c);
  };
  // PARTICIPAÇÃO: valores em [0,100] E somam ~100 (declarado ou pela soma das linhas).
  // Uma taxa de variação ("+39,9%", "-11%") não soma 100 → não é participação.
  // A semântica declarada (colKinds) só REFORÇA a decisão aritmética, nunca a substitui:
  // se a visão marcou "rate", nem consideramos; se marcou "share", ainda exigimos somar 100.
  const isShareCol = (i: number): boolean => {
    if (i < 1 || !isNumericCol(i)) return false;
    if (table.colKinds?.[i] === 'rate') return false; // taxa nunca é participação
    const vals = table.rows.map((r) => r[i]).filter(isNum);
    if (vals.length < 2 || !vals.every((v) => v >= 0 && v <= 100)) return false;
    const decl = table.totals?.[i];
    if (isNum(decl) && Math.abs(decl - 100) <= 1) return true;
    return Math.abs(vals.reduce((a, b) => a + b, 0) - 100) <= 1.5;
  };

  const badSet = new Set<number>();
  const notes: string[] = [];
  let pairs = 0;

  for (let p = 1; p < cols.length; p++) {
    if (!isShareCol(p)) continue;
    // pareamento: usa share_of declarado (índice exato) se válido; senão, a coluna
    // de valor imediatamente à esquerda (arranjo padrão dos estudos)
    const declaredPair = table.shareOf?.[p];
    const a = (typeof declaredPair === 'number' && declaredPair >= 1 && declaredPair < cols.length && declaredPair !== p)
      ? declaredPair : p - 1;
    if (a < 1 || !isNumericCol(a) || isShareCol(a)) continue;
    const totalAbs = colTotal(a);
    if (!(totalAbs > 0)) continue;
    // total declarado que é MÉDIA (cai entre min e max) não serve de denominador
    const vals = table.rows.map((r) => r[a]).filter(isNum);
    if (vals.length >= 2 && totalAbs >= Math.min(...vals) && totalAbs <= Math.max(...vals)) continue;
    pairs++;

    table.rows.forEach((r, i) => {
      const abs = r[a];
      const pct = r[p];
      if (!isNum(abs) || !isNum(pct)) return;
      const expected = (100 * abs) / totalAbs;
      if (Math.abs(pct - expected) > tolPp) {
        badSet.add(i);
        notes.push(`Linha «${r[0]}» (${cols[a]}): ${abs} seria ${round(expected)}% do total, mas a tabela diz ${pct}% (possível dígito mal lido na visão).`);
      }
    });
  }

  if (pairs === 0) return null;
  return { kind: 'table', table, badColumns: [], badRows: [...badSet].sort((x, y) => x - y), notes };
}

/** Rótulos da 1ª coluna (faixas de renda etc.) de uma tabela. */
export function rowLabels(table: ExtractedTable): string[] {
  return table.rows.map((r) => (typeof r[0] === 'string' ? r[0] : '')).filter(Boolean);
}

/** CROSS_TABLE_MISMATCH — compara rótulos de faixa entre duas tabelas. */
export function crossBands(
  labelsA: string[],
  labelsB: string[],
  leftLabel: string,
  rightLabel: string
): SideBySideRow[] {
  const n = Math.max(labelsA.length, labelsB.length);
  const rows: SideBySideRow[] = [];
  for (let i = 0; i < n; i++) {
    const a = labelsA[i] ?? '';
    const b = labelsB[i] ?? '';
    rows.push({
      label: `Faixa ${i + 1}`,
      left: a,
      right: b,
      mismatch: norm(a) !== norm(b),
    });
  }
  return rows;
}

/** BINNING_RULE — furo/sobreposição na sequência de faixas "de X a Y" / "acima de Z". */
export function detectBinGap(bins: Bin[]): { gapAfterIndex?: number; description?: string } {
  for (let i = 1; i < bins.length; i++) {
    const prev = bins[i - 1];
    const cur = bins[i];
    if (prev.to !== null && cur.from !== prev.to && cur.from !== prev.to + 1) {
      return {
        gapAfterIndex: i - 1,
        description:
          cur.from > (prev.to ?? 0)
            ? `Furo: faixa termina em ${prev.to} e a próxima começa em ${cur.from} (${prev.to + 1}–${cur.from - 1} inexistente).`
            : `Sobreposição: faixa termina em ${prev.to} e a próxima começa em ${cur.from}.`,
      };
    }
  }
  return {};
}

function norm(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}
function round(n: number): number {
  return Math.round(n * 10) / 10;
}
