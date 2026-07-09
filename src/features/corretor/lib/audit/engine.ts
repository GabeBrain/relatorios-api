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

  if (totals) {
    const ncols = Math.max(...table.rows.map((r) => r.length));
    for (let c = 1; c < ncols; c++) {
      const decl = totals[c];
      if (!isNum(decl)) continue;
      const vals = table.rows.map((r) => r[c]).filter(isNum);
      if (vals.length < 2) continue;
      const soma = vals.reduce((a, b) => a + b, 0);
      const isPct = vals.every((v) => v >= 0 && v <= 100) && decl >= 85 && decl <= 115;
      const tol = isPct && Math.round(decl) === 100 ? pctTol : absTol;
      if (Math.abs(soma - decl) > tol) {
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
