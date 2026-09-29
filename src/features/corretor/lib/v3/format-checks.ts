// Corretor v3 — checagens de FORMATO e RÓTULO sobre as tabelas lidas pela visão.
// Nascem dos erros reais que o motor deixou passar no SJC (set/2026):
//   s81 — célula mesclada "0,076" entre percentuais (deveria ser 7,6%) e "13%"
//         num total onde as demais células têm uma casa decimal;
//   s76/s80 — cabeçalho "Arté 35 m²" (erro de digitação de "Até").
// Funções puras; nenhuma chamada de IA.

import type { Cell, ExtractedTable } from '../audit/model';
import { editDistance } from '../audit/engine';

const PCT = /^\s*-?\d{1,3}(?:\.\d{3})*(?:,(\d+))?\s*%\s*$/;
const BARE_DECIMAL = /^\s*0,\d{2,4}\s*$/;

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export interface FormatIssue { where: string; text: string; reason: string }

/** Anomalia de formato apontada pela própria visão (campo `anomalias_formato`). */
export interface RawFormatAnomaly { texto?: unknown; linha?: unknown; coluna?: unknown; bloco?: unknown; motivo?: unknown }

function pctDecimals(v: Cell): number | null {
  if (typeof v !== 'string') return null;
  const m = v.match(PCT);
  return m ? (m[1]?.length ?? 0) : null;
}

function asPercentText(v: string): string {
  const n = Number(v.replace(',', '.')) * 100;
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

/**
 * Formato divergente dentro de uma mesma linha (inclusive a de totais) ou coluna,
 * olhando o TEXTO transcrito. Só se aplica onde a visão preservou strings "x,y%";
 * sem strings a regra se abstém (número JSON não carrega formato).
 */
export function formatIssues(table: ExtractedTable): FormatIssue[] {
  const lines: { where: string; cells: Cell[] }[] = [];
  const all = [...table.rows, ...(table.totals ? [table.totals] : [])];
  all.forEach((row) => lines.push({ where: `linha «${String(row[0] ?? '')}»`, cells: row.slice(1) }));
  for (let c = 1; c < table.columns.length; c++) {
    lines.push({ where: `coluna «${table.columns[c]}»`, cells: all.map((r) => r[c]) });
  }
  const out: FormatIssue[] = [];
  const seen = new Set<string>();
  const push = (issue: FormatIssue) => {
    const key = `${issue.text}|${issue.reason}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(issue);
  };
  for (const { where, cells } of lines) {
    const decimals = cells.map(pctDecimals);
    const pctCount = decimals.filter((d) => d !== null).length;
    if (pctCount < 2) continue;
    cells.forEach((cell) => {
      if (typeof cell === 'string' && BARE_DECIMAL.test(cell)) {
        push({ where, text: cell, reason: `decimal sem formato de percentual entre valores em %; equivale a ${asPercentText(cell)}` });
      }
    });
    // Precisão: uma minoria de células com casas decimais diferentes da maioria.
    const counts = new Map<number, number>();
    for (const d of decimals) if (d !== null) counts.set(d, (counts.get(d) ?? 0) + 1);
    if (counts.size < 2) continue;
    const [major, majorN] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (majorN < 3) continue;
    cells.forEach((cell, i) => {
      const d = decimals[i];
      if (d === null || d === major) return;
      if ((counts.get(d) ?? 0) * 3 > pctCount) return; // não é minoria clara
      push({ where, text: String(cell), reason: `usa ${d} casa(s) decimal(is); as demais células usam ${major}` });
    });
  }
  return out;
}

const BIN_KEYWORDS = ['ate', 'acima', 'abaixo', 'de'];


/**
 * Erro de digitação na palavra que abre um rótulo de faixa ("Arté 35 m²").
 * Só olha rótulos que têm número (faixa de verdade) e palavras de 3+ letras a
 * uma edição de distância de Até/Acima/Abaixo — "De" é curto demais para isso.
 */
export function labelTypos(labels: string[]): FormatIssue[] {
  const out: FormatIssue[] = [];
  for (const label of new Set(labels)) {
    if (!/\d/.test(label)) continue;
    const first = strip(label.trim().split(/\s+/)[0] ?? '').replace(/[^a-z]/g, '');
    if (first.length < 3 || BIN_KEYWORDS.includes(first)) continue;
    const near = BIN_KEYWORDS.filter((k) => k.length >= 3).find((k) => editDistance(first, k) === 1);
    if (near) {
      const fix = near === 'ate' ? 'Até' : near[0].toUpperCase() + near.slice(1);
      out.push({ where: 'rótulo de faixa', text: label, reason: `«${label.trim().split(/\s+/)[0]}» parece erro de digitação de «${fix}»` });
    }
  }
  return out;
}

const DOUBLED_SYMBOL = /(\/\/|%%|,,|\.\.|R\$\s*R\$)/;

/**
 * Anomalia apontada pela visão só vira achado quando uma regra FIXA confirma o
 * texto: decimal sem % (“0,076”) ou símbolo duplicado (“8.000//m²”). O campo
 * livre é ruidoso — na 2ª rodada do SJC, 5 de 6 itens eram opinião do modelo
 * (“100,0%”, “percentual com ','”, “artefato gráfico”). Precisão divergente
 * (“13%”) fica com `formatIssues`, que compara as strings de verdade.
 */
export function visionFormatIssues(raw: RawFormatAnomaly[] | undefined): FormatIssue[] {
  return (raw ?? []).flatMap((a) => {
    const text = typeof a.texto === 'string' ? a.texto.trim() : '';
    if (!text) return [];
    let reason: string | null = null;
    if (BARE_DECIMAL.test(text)) reason = `decimal sem formato de percentual entre valores em %; equivale a ${asPercentText(text)}`;
    else if (DOUBLED_SYMBOL.test(text)) reason = `símbolo duplicado («${text.match(DOUBLED_SYMBOL)?.[0]}»)`;
    if (!reason) return [];
    const where = [a.bloco, a.linha, a.coluna].filter((x) => typeof x === 'string' && x.trim()).join(' · ');
    return [{ where: where || 'tabela', text, reason }];
  });
}
