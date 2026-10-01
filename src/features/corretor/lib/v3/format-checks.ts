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
    // Cabeçalho embaralhado pela leitura (várias faixas grudadas num rótulo só)
    // não tem palavra de abertura confiável.
    if ((label.match(/\d[\d.]*,\d{2}/g) ?? []).length > 2) continue;
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

// ── Formato literal (v0.67, Rolândia) ───────────────────────────────────────
// Regras fixas sobre a STRING: valem para texto e células nativos e para os
// rótulos que a visão transcreve. (A visão costuma normalizar o valor — “,00,00”
// some na leitura —, então em imagem só pega o que chegar literal.)
const YEAR_WITH_DOT = /^\s*(?:19|20)\d\.\d{2}\s*$|^\s*[12]\.\d{3}\s*$/;
const DOUBLED_DECIMAL = /\d,\d{2},\d{2}(?!\d)/;
const DOUBLE_SPACE_VALUE = /R\$ {2,}\d|\d {2,}\d/;
const UPPER_BOUND = /\ba\s*R?\$?\s*[\d.]+,(\d{2})\s*$/i;

export function literalFormatIssues(texts: string[], where = 'rótulo'): FormatIssue[] {
  const out: FormatIssue[] = [];
  const years = texts.filter((t) => YEAR_WITH_DOT.test(t));
  // Um “2.027” solto pode ser quantidade; uma sequência é coluna de anos.
  if (years.length >= 2) out.push({ where, text: years[0].trim(), reason: `ano escrito com separador de milhar (${years.length} ocorrências, ex.: «${years[0].trim()}» em vez de «${years[0].trim().replace('.', '')}»)` });
  for (const t of texts) {
    const d = DOUBLED_DECIMAL.exec(t);
    if (d) out.push({ where, text: t.trim(), reason: `decimal duplicado («${d[0]}»)` });
    else if (DOUBLE_SPACE_VALUE.test(t)) out.push({ where, text: t.trim(), reason: 'espaço duplo dentro do valor' });
  }
  const bounds = texts.map((t) => ({ t, cents: UPPER_BOUND.exec(t.trim())?.[1] })).filter((b) => b.cents);
  const zeros = bounds.filter((b) => b.cents === '00').length;
  if (bounds.length >= 3 && zeros >= bounds.length - 1) {
    for (const b of bounds) if (b.cents === '01') out.push({ where, text: b.t.trim(), reason: 'limite superior da faixa termina em ,01; os demais terminam em ,00' });
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
export function visionFormatIssues(raw: RawFormatAnomaly[] | undefined, confirmedDoubles: RawFormatAnomaly[] = []): FormatIssue[] {
  const items = raw ?? [];
  const confirmed = new Set(confirmedDoubles.map((a) => `${a.bloco ?? ''}|${a.linha ?? ''}|${a.coluna ?? ''}|${a.texto ?? ''}`.toLowerCase()));
  return items.flatMap((a) => {
    const text = typeof a.texto === 'string' ? a.texto.trim() : '';
    if (!text) return [];
    let reason: string | null = null;
    if (BARE_DECIMAL.test(text)) reason = `decimal sem formato de percentual entre valores em %; equivale a ${asPercentText(text)}`;
    else if (DOUBLED_SYMBOL.test(text) && confirmed.has(`${a.bloco ?? ''}|${a.linha ?? ''}|${a.coluna ?? ''}|${text}`.toLowerCase())) reason = `símbolo duplicado («${text.match(DOUBLED_SYMBOL)?.[0]}»), confirmado em duas leituras`;
    if (!reason) return [];
    const where = [a.bloco, a.linha, a.coluna].filter((x) => typeof x === 'string' && x.trim()).join(' · ');
    return [{ where: where || 'tabela', text, reason }];
  });
}
