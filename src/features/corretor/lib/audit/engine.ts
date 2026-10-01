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

/** Largura real da tabela: a maior entre o cabeçalho e a linha mais longa. */
function tableWidth(table: ExtractedTable): number {
  return table.rows.reduce((max, r) => Math.max(max, r.length), table.columns.length);
}

/**
 * Colunas numéricas — as que participam de soma.
 *
 * `min` é o número de células numéricas exigido. Conferência de soma usa 2 (uma
 * célula só não é soma); identificação de coluna usa 1, para a resposta não
 * mudar conforme o tamanho da fatia.
 */
export function numericColumns(table: ExtractedTable, min = 2): number[] {
  const out: number[] = [];
  for (let c = 0; c < tableWidth(table); c++) {
    if (table.rows.filter((r) => isNum(r[c])).length >= min) out.push(c);
  }
  return out;
}

/**
 * Alinha a linha de totais às colunas.
 *
 * A visão às vezes devolve o array de totais **compacto**, pulando as células
 * vazias que o rótulo "Total" atravessa, enquanto o motor casa total×coluna por
 * índice. O resultado é acusar a coluna errada — caso real s42 do Toledo
 * (12/ago): `["Total",1099,702,397,36.1,1099]` para 15 colunas virou
 * "Oferta Lançada: soma 434 ≠ total 397", sendo 397 o total de *Oferta Atual*.
 * Medido no banco: 19 de 67 tabelas com totais declarados vêm desalinhadas.
 *
 * - Comprimento igual ao da tabela → já está 1:1.
 * - Comprimentos diferentes, mas **tantos totais numéricos quanto colunas
 *   numéricas** → a ordem resolve, realinha.
 * - Fora disso a atribuição é indecidível: devolve `null` para o chamador se
 *   abster em vez de chutar.
 */
export function alignTotals(table: ExtractedTable): { totals: Cell[] | null; realigned: boolean; byFit?: boolean } {
  const totals = table.totals;
  if (!totals || !table.rows.length) return { totals: totals ?? null, realigned: false };

  const width = tableWidth(table);
  if (totals.length === width) return { totals, realigned: false };

  const declared = totals.filter(isNum);
  const cols = numericColumns(table);
  if (!declared.length) return { totals: null, realigned: false };
  if (declared.length !== cols.length) {
    const fitted = alignTotalsByFit(table, declared, cols, width);
    return fitted ? { totals: fitted, realigned: true, byFit: true } : { totals: null, realigned: false };
  }

  const aligned: Cell[] = new Array(width).fill(null);
  cols.forEach((c, i) => {
    aligned[c] = declared[i];
  });
  return { totals: aligned, realigned: true };
}

/**
 * Totais compactos com MENOS valores que colunas numéricas (a imagem não tem
 * total em Quartos/Vagas): casa cada total, na ordem, com a próxima coluna cuja
 * soma fica a até 20% dele ou cujo intervalo o contém (média/taxa). Se algum
 * total não encontra coluna, a atribuição é indecidível e devolve null. Caso
 * real s72 de Campos do Jordão (set/2026): 7 totais para 10 colunas numéricas;
 * sem isso, "Unidades por Tipologia" (24 + 32 + 32 = 88 ≠ 100) nem era conferida.
 */
function alignTotalsByFit(table: ExtractedTable, declared: number[], cols: number[], width: number): Cell[] | null {
  const aligned: Cell[] = new Array(width).fill(null);
  aligned[0] = table.totals?.[0] ?? 'Total';
  let k = 0;
  for (const t of declared) {
    let placed = false;
    while (k < cols.length && !placed) {
      const c = cols[k++];
      const vals = summableValues(table, c);
      if (vals.length < 2) continue;
      const soma = vals.reduce((a, b) => a + b, 0);
      const fitsSum = t !== 0 && Math.abs(soma - t) / Math.abs(t) <= 0.2;
      const fitsRange = t >= Math.min(...vals) && t <= Math.max(...vals);
      if (fitsSum || fitsRange) {
        aligned[c] = t;
        placed = true;
      }
    }
    if (!placed) return null;
  }
  return aligned;
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
  let omittedBand = false;
  // Totais casados às colunas de verdade; null = desalinhamento indecidível.
  const { totals, byFit } = alignTotals(table);
  const unaligned = Boolean(table.totals?.some(isNum)) && !totals;

  // Semântica declarada pela visão (hipótese): colunas que NÃO fecham em soma.
  // É só uma DAS pistas — a aritmética continua decidindo (ver abaixo).
  const notSummable = (c: number) => {
    const k = table.colKinds?.[c];
    return k === 'measure' || k === 'rate' || k === 'share';
  };

  if (unaligned) {
    // Existe total declarado, mas não dá para saber de qual coluna cada número é.
    // Acusar uma coluna aqui é chute — e chute com nome de coluna errado foi
    // exatamente o FP do s42. Um único aviso, e o veredito fica "Verificar".
    notes.push(
      `A linha de totais não pôde ser alinhada às colunas (${table.totals?.length} totais para ${tableWidth(table)} colunas) — confira os totais na imagem.`
    );
  }

  if (totals) {
    const ncols = tableWidth(table);

    // 1ª passada: status de cada coluna somável (média-final não é somável)
    interface ColCheck { c: number; decl: number; tol: number; soma: number; ok: boolean }
    const checks: ColCheck[] = [];
    for (let c = 1; c < ncols; c++) {
      const decl = totals[c];
      if (!isNum(decl)) continue;
      const vals = summableValues(table, c);
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
        // (c) linha de total deslocada na extração de visão: se a soma da coluna
        // bate com o total DECLARADO de outra coluna, o OCR desalinhou a linha
        // (célula mesclada some) — caso real Housi jul/2026: soma 1.187 acusada
        // contra o "39,8" da coluna % vizinha. Desalinhamento não é erro do estudo.
        const shifted = totals.some((t, c2) => c2 !== c && isNum(t) && Math.abs(soma - t) <= tol);
        if (shifted) continue;
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
        const vals = summableValues(table, c);
        notes.push(`Coluna «${table.columns[c] ?? c}»: soma ${round(soma)} ≠ total ${decl} — ${sumExpression(vals, soma)}, diferença de ${fmt(round(decl - soma))}`);
      }
      // Todas as colunas abaixo do total na MESMA proporção = linha/faixa omitida
      // na tabela, não dígito trocado (caso real s28 SJC: faixas somam 92,5%).
      const failing = checks.filter((k) => !k.ok && k.decl > 0);
      if (failing.length >= 2) {
        const ratios = failing.map((k) => k.soma / k.decl);
        const allShort = ratios.every((r) => r < 1);
        const spread = Math.max(...ratios) - Math.min(...ratios);
        if (allShort && spread <= 0.03) {
          const missing = (1 - ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100;
          notes.unshift(`Todas as ${failing.length} colunas conferidas ficam cerca de ${fmt(round(missing))}% abaixo do total declarado: provável linha ou faixa omitida da tabela.`);
          omittedBand = true;
        }
      }
    }
    // linhas com coluna "Total"
    const ti = table.columns.indexOf('Total');
    if (ti > 0) {
      table.rows.forEach((r, i) => {
        const cellCols = r.slice(1, ti).map((v, k) => (isNum(v) ? k + 1 : -1)).filter((k) => k > 0);
        const cells = cellCols.map((k) => r[k] as number);
        const rowTotal = r[ti];
        if (!cells.length || !isNum(rowTotal)) return;
        const soma = cells.reduce((a, b) => a + b, 0);
        if (!rowIsSummable(cells, rowTotal, cellCols.every(notSummable))) return;
        const isShare = rowIsShare(cells, rowTotal);
        if (Math.abs(soma - rowTotal) > (isShare ? pctTol : absTol)) {
          badRows.push(i);
          notes.push(`Linha «${r[0]}»: células somam ${round(soma)} ≠ Total ${rowTotal} — ${sumExpression(cells, soma)}, diferença de ${fmt(round(rowTotal - soma))}`);
        }
      });
    }
  }

  let incoherent = badColumns.length + badRows.length > 0 ? marginsIncoherence(table, totals) : null;
  // Leitura INCOMPLETA: a coluna que falhou tem célula vazia numa linha que tem
  // números nas outras colunas — a soma “não fecha” porque faltou ler um valor
  // (s41 de Campos do Jordão: 20 números para 21 municípios).
  const holes = badColumns.filter((c) => table.rows.some((r) => r[c] === null && r.filter(isNum).length >= 2));
  if (!incoherent && holes.length) {
    incoherent = `A leitura veio incompleta: a coluna «${table.columns[holes[0]] ?? holes[0]}» tem célula vazia em linha que tem valores nas demais colunas. A diferença pode ser só o valor não lido; confira na imagem.`;
  }
  if (incoherent) notes.push(incoherent);
  return {
    kind: 'table', table, badColumns, badRows, notes,
    ...(unaligned ? { unaligned } : {}),
    ...(incoherent ? { incoherentReading: true } : {}),
    ...(byFit ? { totalsByFit: true } : {}),
    ...(omittedBand ? { omittedBand: true } : {}),
  };
}

/**
 * Valores de uma coluna para SOMA. Célula mesclada repetida pela leitura (mesmo
 * rótulo de linha e mesmo valor em linhas seguidas: um empreendimento com uma
 * sub-linha por tipologia) conta uma vez — senão 77+77+77 entra no lugar de 77.
 */
export function summableValues(table: ExtractedTable, c: number): number[] {
  const kinds = table.colKinds;
  const out: number[] = [];
  table.rows.forEach((r, i) => {
    const v = r[c];
    if (!isNum(v)) return;
    const prev = table.rows[i - 1];
    if (kinds && prev && v !== 0 && prev[c] === v && String(prev[0] ?? '') !== '' && prev[0] === r[0]) {
      // Só é mescla repetida se a sub-linha tem OUTRA contagem própria, diferente
      // da linha de cima (unidades 44 → 22 com oferta 77 → 77). Se nenhuma outra
      // contagem muda, o valor igual é legítimo (32 unidades em cada tipologia).
      const ownCount = kinds.some((k, j) => j !== c && k === 'count' && isNum(r[j]) && r[j] !== prev[j]);
      if (ownCount) return;
    }
    out.push(v);
  });
  return out;
}

/** Número em pt-BR para as notas (1.187; 39,8). */
function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/** "44 + 112 + 236 = 392" — a conta que o analista refaz de cabeça. */
function sumExpression(values: number[], soma: number): string {
  const terms = values.filter((v) => v !== 0);
  if (!terms.length) return `as células somam 0`;
  if (terms.length > 8) return `${terms.length} células somam ${fmt(round(soma))}`;
  return `${terms.map(fmt).join(' + ')} = ${fmt(round(soma))}`;
}

/**
 * Uma linha só é conferida como SOMA quando parece de quantidades. Linha de
 * disponibilidade/taxa (37,4% · 31,1% · 32,9% → Total 33,7%) fecha por razão,
 * não por soma: acusá-la foi o FP do s76/s82 de São José dos Campos (set/2026).
 */
function rowIsSummable(cells: number[], total: number, allColsNotSummable: boolean): boolean {
  if (allColsNotSummable) return false;
  if (rowIsShare(cells, total)) return true; // participação: fecha em ~100
  const values = [...cells, total];
  const fractional = values.some((v) => !Number.isInteger(v));
  if (fractional && values.every((v) => v >= 0 && v <= 100)) return false; // percentuais
  const nonZero = cells.filter((v) => v !== 0);
  // Total estritamente ENTRE o menor e o maior valor não-nulo é média, nunca soma.
  if (nonZero.length >= 2 && total > Math.min(...nonZero) && total < Math.max(...nonZero)) return false;
  return true;
}

function rowIsShare(cells: number[], total: number): boolean {
  return cells.length >= 2 && Math.abs(total - 100) <= 1 && cells.every((v) => v >= 0 && v <= 100);
}

/**
 * Coerência interna da LEITURA: numa tabela real (fórmula de Excel) a soma dos
 * totais de linha e a soma dos totais de coluna dão o mesmo total geral. Se a
 * própria leitura não fecha nas margens, a visão trocou células de lugar — foi
 * o caso dos s80/s81/s82 de São José dos Campos (tabelas com barras coloridas).
 * Devolve a explicação, ou null quando as margens batem ou não dá para conferir.
 */
export function marginsIncoherence(table: ExtractedTable, totals: Cell[] | null): string | null {
  const ti = table.columns.indexOf('Total');
  if (ti <= 0 || !totals) return null;
  const grand = totals[ti];
  if (!isNum(grand) || grand === 0) return null;
  const rowTotals = table.rows.map((r) => r[ti]).filter(isNum);
  const colTotals = totals.slice(1, ti).filter(isNum);
  if (rowTotals.length < 2 || colTotals.length < 2) return null;
  // Percentuais não têm margem somável.
  if ([...rowTotals, ...colTotals, grand].some((v) => !Number.isInteger(v))) return null;
  const byRows = rowTotals.reduce((a, b) => a + b, 0);
  const byCols = colTotals.reduce((a, b) => a + b, 0);
  const tol = Math.max(0.5, table.rows.length / 2);
  if (Math.abs(byRows - grand) <= tol && Math.abs(byCols - grand) <= tol) return null;
  return `A própria leitura é incoerente: os totais das linhas somam ${fmt(byRows)} e os das colunas somam ${fmt(byCols)}, mas o total geral lido é ${fmt(grand)}. Numa tabela gerada por fórmula isso não acontece: provável erro de leitura da imagem. Confira na imagem antes de corrigir.`;
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
    const binA = binFromLabel(a);
    const binB = binFromLabel(b);
    rows.push({
      label: `Faixa ${i + 1}`,
      left: a,
      right: b,
      // “Até R$ 2.000” e “De R$ 0 a R$ 2.000” são a mesma faixa. Rótulos textuais
      // quase idênticos (“3 Dormatórios” × “3 Dormitórios”) são o mesmo rótulo com
      // uma letra mal lida ou digitada — ortografia não é divergência de faixa.
      mismatch: binA && binB ? binA.from !== binB.from || binA.to !== binB.to : !sameTextLabel(a, b),
    });
  }
  return rows;
}

/** Extrai faixas numéricas de títulos/rótulos em formatos usuais pt-BR. */
export function binFromLabel(label: string): Bin | null {
  // "Faixa | Absoluto" (grupo de colunas costurado): a faixa é o que vem antes.
  const raw = label.split(' | ')[0].trim();
  // Unidade colada ao número ("9.001/m²", "31m²", "8.000//m²") quebrava o casamento
  // "de X a Y": as faixas de preço do s82 do SJC nem eram lidas como faixas.
  const compact = fixBinKeyword(raw.toLowerCase().replace(/\/*\s*m[²2]/g, ' ').replace(/\s+/g, ' '));
  const number = (value: string) => Number(value.replace(/\./g, '').replace(',', '.'));
  const token = 'r?\\$?\\s*([0-9][0-9.,]*)';
  let match = compact.match(new RegExp(`^at[eé]\\s*(?:de\\s*)?${token}`, 'i'));
  if (match) return { label: raw, from: 0, to: number(match[1]) };
  // "Abaixo de R$ 27.511,00" é o mesmo corte aberto por baixo que "Até".
  match = compact.match(new RegExp(`^abaixo\\s*(?:de\\s*)?${token}`, 'i'));
  if (match) return { label: raw, from: 0, to: number(match[1]) };
  match = compact.match(new RegExp(`^acima\\s*(?:de\\s*)?${token}`, 'i'));
  if (match) return { label: raw, from: number(match[1]), to: null };
  match = compact.match(new RegExp(`(?:de\\s*)?${token}\\s*(?:a|at[eé]|[-–])\\s*(?:r?\\$?\\s*)?([0-9][0-9.,]*)`, 'i'));
  if (match) return { label: raw, from: number(match[1]), to: number(match[2]) };
  return null;
}

/** Distância de edição (Levenshtein) — pequena, para rótulos curtos. */
export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return dp[a.length][b.length];
}

/**
 * Palavra de abertura com erro de digitação ("arté 30") é lida como a palavra-chave
 * mais próxima. O erro em si é acusado pela regra de ortografia de rótulos; aqui
 * só evitamos que ele desalinhe a régua de faixas e gere uma cascata de FPs.
 */
function fixBinKeyword(compact: string): string {
  const [first, ...rest] = compact.split(' ');
  const plain = first.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  if (plain.length < 3 || ['ate', 'acima', 'abaixo'].includes(plain)) return compact;
  const near = ['ate', 'acima', 'abaixo'].find((k) => editDistance(plain, k) === 1);
  return near ? [near === 'ate' ? 'até' : near, ...rest].join(' ') : compact;
}

/** Faixas presentes nos cabeçalhos, reutilizável entre visão e cruzamentos. */
export function binsFromColumns(columns: string[]): Bin[] {
  return columns.map(binFromLabel).filter((bin): bin is Bin => bin !== null);
}

export interface UnitRecord {
  tipologia?: unknown;
  m2?: unknown;
  vagas?: unknown;
  preco?: unknown;
  preco_m2?: unknown;
}

/**
 * WS6 — plausibilidade conservadora das unidades de ficha técnica. Só acusa
 * relações aritméticas ou inversões suficientemente explícitas; o texto do
 * achado sempre pede conferência porque posicionamento/andar podem explicar
 * diferenças de preço legítimas.
 */
export function checkUnitPlausibility(units: UnitRecord[]): TableViz | null {
  const rows: Cell[][] = units.map((u) => [
    typeof u.tipologia === 'string' ? u.tipologia : 'Unidade',
    numberOrNull(u.m2), numberOrNull(u.vagas), numberOrNull(u.preco), numberOrNull(u.preco_m2),
  ]);
  if (!rows.length) return null;
  const table: ExtractedTable = { title: 'Ficha técnica', columns: ['Tipologia', 'm²', 'Vagas', 'Preço', 'R$/m²'], rows };
  const bad = new Set<number>();
  const notes: string[] = [];
  rows.forEach((row, i) => {
    const [label, m2, vagas, preco, precoM2] = row;
    if (isNum(m2) && isNum(preco) && isNum(precoM2) && m2 > 0) {
      const calculated = preco / m2;
      if (Math.abs(calculated - precoM2) / calculated > 0.02) {
        bad.add(i); notes.push(`«${label}»: R$/m² ${round(precoM2)} não bate com preço ÷ área (${round(calculated)}).`);
      }
    }
    if (isNum(m2) && isNum(vagas) && m2 < 45 && vagas >= 2) {
      bad.add(i); notes.push(`«${label}»: ${m2}m² com ${vagas} vagas — verificar plausibilidade.`);
    }
  });
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    const aM2 = a[1], bM2 = b[1], aVagas = a[2], bVagas = b[2], aPm = a[4], bPm = b[4];
    if (!isNum(aM2) || !isNum(bM2) || !isNum(aVagas) || !isNum(bVagas) || !isNum(aPm) || !isNum(bPm)) continue;
    const sameProfile = String(a[0]).toLowerCase() === String(b[0]).toLowerCase() && Math.abs(aM2 - bM2) / Math.max(aM2, bM2) <= 0.1;
    if (sameProfile && aVagas !== bVagas) {
      const withGarage = aVagas > bVagas ? [i, aPm, j, bPm] : [j, bPm, i, aPm];
      if (withGarage[1] < withGarage[3] * 0.98) {
        bad.add(withGarage[0]); bad.add(withGarage[2]);
        notes.push(`Unidades comparáveis: a opção com mais vagas tem R$/m² menor — verificar.`);
      }
    }
    if (Math.abs(aM2 - bM2) / Math.max(aM2, bM2) > 0.1 && isNum(a[3]) && isNum(b[3]) && Math.abs(a[3] - b[3]) <= 1) {
      bad.add(i); bad.add(j); notes.push(`Tickets idênticos para metragens bem diferentes — verificar.`);
    }
  }
  return { kind: 'table', table, badRows: [...bad].sort((a, b) => a - b), notes };
}

/** WS5 — confere série anual contra taxa explícita; sem taxa só marca variação muito irregular. */
export function checkProjectionSeries(
  table: ExtractedTable,
  opts: { currentYear?: number; tolerance?: number } = {},
): TableViz | null {
  const yearCols = table.columns.map((c, i) => ({ i, year: Number(c.match(/\b(20\d{2})\b/)?.[1]) })).filter((x) => Number.isFinite(x.year));
  if (yearCols.length < 2) return null;
  const bad = new Set<number>();
  const notes: string[] = [];
  const tolerance = opts.tolerance ?? 0.01;
  const rateCol = table.columns.findIndex((c) => /taxa|varia[çc]/i.test(c) && /%|anual/i.test(c));
  table.rows.forEach((row, ri) => {
    const values = yearCols.map(({ i, year }) => ({ year, value: row[i] })).filter((x): x is { year: number; value: number } => isNum(x.value));
    if (values.length < 2) return;
    const rate = rateCol >= 0 && isNum(row[rateCol]) ? row[rateCol] / 100 : null;
    const ratios: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1].value <= 0) continue;
      const ratio = values[i].value / values[i - 1].value;
      ratios.push(ratio);
      if (rate !== null && Math.abs(ratio - (1 + rate)) > tolerance) {
        bad.add(ri); notes.push(`«${row[0]}»: ${values[i].year} não segue a taxa anual informada.`); break;
      }
    }
    if (rate === null && ratios.length >= 3) {
      const avg = ratios.reduce((a, v) => a + v, 0) / ratios.length;
      if (avg > 0 && ratios.some((v) => Math.abs(v - avg) / avg > 0.2)) {
        bad.add(ri); notes.push(`«${row[0]}»: variação anual irregular na projeção — verificar fórmula.`);
      }
    }
  });
  return { kind: 'table', table, badRows: [...bad].sort((a, b) => a - b), notes };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export interface BinGapResult {
  gapAfterIndex?: number;
  description?: string;
  /** Ordem usada na comparação; evita uma régua invertida quando a tabela vem decrescente. */
  normalizedBins?: Bin[];
}

/**
 * BINNING_RULE — furo/sobreposição em faixas exclusivas "de X a Y" / "acima de Z".
 *
 * Guardrail importante: cabeçalhos como "Até 5 min / Até 10 min / Até 15 min"
 * são raios cumulativos, não faixas. Como todos partem implicitamente de zero,
 * compará-los como intervalos exclusivos inventa sobreposições.
 */
export function detectBinGap(bins: Bin[]): BinGapResult {
  // A mesma faixa repetida (colunas "Absoluto" e "%" da faixa, ou blocos) é uma
  // faixa só — e precisa sair ANTES da regra de cortes cumulativos abaixo, senão
  // duas cópias de "Abaixo de X" pareciam dois cortes 0→X e a regra se abstinha.
  bins = bins.filter((bin, i) => bins.findIndex((o) => o.from === bin.from && o.to === bin.to) === i);
  if (bins.length < 2) return {};

  // Duas ou mais faixas 0→X representam cortes cumulativos (raios, acumulados etc.).
  // Sem evidência explícita de limites inferiores exclusivos, a regra se abstém.
  if (bins.filter((bin) => bin.from === 0 && bin.to !== null).length > 1) return {};

  // A mesma faixa repetida (colunas "Absoluto" e "%" da faixa, ou blocos) é uma
  // faixa só: sem isso, "27.320–36.511 | Absoluto" × "… | %" virava sobreposição.
  bins = bins.filter((bin, i) => bins.findIndex((o) => o.from === bin.from && o.to === bin.to) === i);
  if (bins.length < 2) return {};
  const normalizedBins = [...bins].sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;
    return (a.to ?? Number.POSITIVE_INFINITY) - (b.to ?? Number.POSITIVE_INFINITY);
  });
  const step = binStep(normalizedBins);
  const epsilon = Math.max(step / 100, Number.EPSILON * 10);

  // Faixa aberta ("Acima de R$ 8.000") só pode ser a última. Se existe outra faixa
  // que começa depois dela, as duas se sobrepõem — caso real s82 do SJC (set/2026):
  // «Acima de R$ 8.000» seguida de «De 9.001 a 10.000», quando deveria ser
  // «De 8.001 a 9.000». O laço abaixo pulava esse caso (prev.to === null).
  const openIdx = normalizedBins.findIndex((bin) => bin.to === null);
  if (openIdx >= 0) {
    const open = normalizedBins[openIdx];
    const after = normalizedBins.find((bin, i) => i !== openIdx && bin.from > open.from);
    if (after) {
      return {
        gapAfterIndex: openIdx,
        normalizedBins,
        description: `A faixa aberta «${open.label}» não é a última: «${after.label}» começa acima dela, então os intervalos se sobrepõem. Provável rótulo errado (deveria ser uma faixa fechada, como «De ${fmt(open.from + step)} a ${fmt(after.from - step)}»).`,
      };
    }
  }

  for (let i = 1; i < normalizedBins.length; i++) {
    const prev = normalizedBins[i - 1];
    const cur = normalizedBins[i];
    if (prev.to === null) continue;

    const delta = cur.from - prev.to;
    const isAdjacent = Math.abs(delta) <= epsilon || Math.abs(delta - step) <= epsilon;
    if (isAdjacent) continue;

    return {
      gapAfterIndex: i - 1,
      normalizedBins,
      description:
        delta > step
          ? `Furo entre «${prev.label}» e «${cur.label}»: a sequência pula valores.`
          : `Sobreposição entre «${prev.label}» e «${cur.label}»: os intervalos cobrem valores em comum.`,
    };
  }
  return { normalizedBins };
}

/** Menor unidade explícita dos rótulos: centavos quando há decimal; 1 nos demais casos. */
function binStep(bins: Bin[]): number {
  const decimalPlaces = bins.reduce((max, bin) => {
    const matches = [...bin.label.matchAll(/,([0-9]{1,6})(?![0-9])/g)];
    return Math.max(max, ...matches.map((match) => match[1].length), 0);
  }, 0);
  return decimalPlaces > 0 ? 10 ** -decimalPlaces : 1;
}

function sameTextLabel(a: string, b: string): boolean {
  const x = norm(a), y = norm(b);
  if (x === y) return true;
  if (!x || !y || x.replace(/\D/g, '') !== y.replace(/\D/g, '')) return false; // número tem de bater
  return Math.min(x.length, y.length) >= 8 && editDistance(x, y) <= 2;
}

function norm(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}
function round(n: number): number {
  return Math.round(n * 10) / 10;
}
