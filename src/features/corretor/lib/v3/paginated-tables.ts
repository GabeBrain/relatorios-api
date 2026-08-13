// Tabela paginada (28/jul/2026) — uma tabela grande fatiada em slides vizinhos,
// cada fatia repetindo o TOTAL do conjunto inteiro. Investigado no estudo
// Raimundo Leonardi V3 (Toledo/PR): o trio “1099 / 702 / 397” aparece como
// “Total” em s42 E s43, com 12 e 24 linhas — é o total do conjunto repetido em
// cada fatia. Conferir fatia a fatia acusa soma≠total em TODAS: falso positivo.
//
// Em vez de só abster, a paginação vira uma checagem melhor: somam-se as linhas
// distintas de todas as fatias e o resultado é conferido contra o total comum.
// Fecha → os achados por fatia caem; não fecha → UM achado do conjunto.

import { alignTotals, checkTableSums, numericColumns } from '../audit/engine';
import type { AuditSection } from '../error-catalog';
import type { Cell, ExtractedTable, Finding } from '../audit/model';

/** Uma fatia candidata: a tabela e o achado de soma que ela gerou sozinha. */
export interface SumSlice {
  slide: number;
  section: AuditSection;
  /** id do achado por fatia; sai da worklist se a paginação explicar o caso */
  findingId: string;
  table: ExtractedTable;
}

export interface PaginationOutcome {
  /** achados por fatia explicados pela paginação — não vão para a worklist */
  dropIds: Set<string>;
  /** achado único do conjunto, quando a soma das fatias NÃO fecha */
  findings: Finding[];
  /** fatias que a soma do conjunto confirmou (entram como tabela verificada) */
  verified: number;
}

/** Fatias da mesma tabela ficam em slides adjacentes; 2 tolera um slide de quebra. */
const MAX_SLIDE_GAP = 2;

/**
 * Fração das colunas numéricas que duas fatias precisam compartilhar para serem
 * a mesma tabela. 0,7 absorve a coluna a mais e o typo de OCR (10 de 11 = 0,91
 * no par s42×s43 do Toledo) sem casar tabelas de assunto diferente.
 */
const HEADER_OVERLAP_MIN = 0.7;

function isNum(value: Cell): value is number {
  return typeof value === 'number';
}

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nomes normalizados das colunas numéricas — as que participam da soma. */
function headerSet(table: ExtractedTable): Set<string> {
  // min = 1: uma fatia de uma linha só tem de produzir o mesmo conjunto que uma de vinte.
  return new Set(numericColumns(table, 1).map((c) => normalized(String(table.columns[c] ?? c))));
}

/**
 * Duas fatias descrevem a mesma tabela?
 *
 * Comparar a lista de colunas por igualdade exata não sobrevive ao ruído da
 * visão: no Toledo o s42 e o s43 são a mesma tabela, mas saíram com 15 e 16
 * colunas ("Incorporadora Lançamento" virou duas) e um cabeçalho lido como
 * "Vagas de Garage" num slide e "Vagas de Garagem" no outro. Um caractere
 * derrubava o agrupamento.
 *
 * Então a comparação é por **sobreposição dos nomes das colunas numéricas**:
 * tolera a coluna a mais e o typo isolado, mas reprova tabelas de assunto
 * diferente (Domicílios/Renda × Unidades/Vendidas quase não se cruzam).
 */
function sameTable(a: ExtractedTable, b: ExtractedTable): boolean {
  const setA = headerSet(a);
  const setB = headerSet(b);
  if (!setA.size || !setB.size) return false;
  let shared = 0;
  for (const name of setA) if (setB.has(name)) shared++;
  return shared / Math.min(setA.size, setB.size) >= HEADER_OVERLAP_MIN;
}

/**
 * Assinatura dos totais declarados. Exige DOIS ou mais totais numéricos: um
 * único número igual entre tabelas vizinhas é coincidência comum (100%, 0),
 * dois ou três repetidos são a impressão digital da mesma tabela fatiada.
 *
 * Comparado como **conjunto ordenado de valores**, não por índice: o mesmo trio
 * 1099/702/397 aparecia nas posições 1,2,3 do s42 e 4,5,6 do s43 — mesma tabela,
 * chaves diferentes, agrupamento perdido.
 */
function totalsKey(table: ExtractedTable): string | null {
  const values = (table.totals ?? [])
    .filter(isNum)
    .map((cell) => Math.round(cell * 100) / 100)
    .sort((a, b) => a - b);
  return values.length >= 2 ? values.join('|') : null;
}

/** Linha repetida entre fatias (paginação com sobreposição, ou leitura duplicada). */
function rowKey(row: Cell[]): string {
  return row.map((cell) => (cell === null || cell === undefined ? '' : normalized(String(cell)))).join('|');
}

/**
 * Agrupa as fatias por cabeçalho + totais declarados e devolve o veredito do
 * conjunto. Fora de um grupo válido (grupo de 1, slides distantes, totais sem
 * assinatura) nada muda: o achado por fatia segue como está.
 */
export function resolvePaginatedSums(slices: SumSlice[]): PaginationOutcome {
  const dropIds = new Set<string>();
  const findings: Finding[] = [];
  let verified = 0;

  // Chaveia pela assinatura dos totais (forte: ≥2 números iguais entre vizinhos) e
  // só então separa por tabela, já que o cabeçalho exige comparação tolerante e
  // não serve como chave de Map.
  const byTotals = new Map<string, SumSlice[]>();
  for (const slice of slices) {
    const totals = totalsKey(slice.table);
    if (!totals) continue;
    const bucket = byTotals.get(totals);
    if (bucket) bucket.push(slice);
    else byTotals.set(totals, [slice]);
  }

  const groups: SumSlice[][] = [];
  for (const bucket of byTotals.values()) {
    const local: SumSlice[][] = [];
    for (const slice of bucket) {
      const group = local.find((g) => sameTable(g[0].table, slice.table));
      if (group) group.push(slice);
      else local.push([slice]);
    }
    groups.push(...local);
  }

  for (const group of groups) {
    const slideNumbers = [...new Set(group.map((slice) => slice.slide))].sort((a, b) => a - b);
    if (slideNumbers.length < 2) continue;
    if (slideNumbers.some((n, i) => i > 0 && n - slideNumbers[i - 1] > MAX_SLIDE_GAP)) continue;

    // Linhas distintas das fatias. A dedupe protege contra a fatia repetida e
    // contra a linha lida em dobro pela visão (caso “Jardim Real” do s43).
    const seen = new Set<string>();
    const rows: Cell[][] = [];
    for (const slice of group) {
      for (const row of slice.table.rows) {
        const key = rowKey(row);
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(row);
      }
    }

    // Representante do conjunto: a fatia cujos totais o motor consegue casar com
    // as colunas. As fatias declaram o mesmo total, mas nem todas o transcrevem
    // alinhado — usar uma alinhada é o que permite conferir o conjunto.
    const first =
      group.map((slice) => slice.table).find((table) => alignTotals(table).totals !== null) ?? group[0].table;
    const merged: ExtractedTable = {
      title: first.title,
      columns: first.columns,
      rows,
      totals: first.totals,
      colKinds: first.colKinds,
      totalKind: first.totalKind,
      shareOf: first.shareOf,
    };
    // Mesmo verificador das tabelas comuns: herda as abstenções já calibradas
    // (coluna de média, subtotal no meio, linha de total deslocada).
    const viz = checkTableSums(merged, { absTol: Math.max(0.5, rows.length / 2) });
    const bad = (viz.badColumns?.length ?? 0) + (viz.badRows?.length ?? 0);

    for (const slice of group) dropIds.add(slice.findingId);
    const refs = slideNumbers.map((n) => `s${n}`);

    // Sem alinhamento não houve conferência: encerrar as fatias aqui esconderia
    // um total que ninguém checou. Só conta como verificado quando fechou de fato.
    if (bad === 0 && !viz.unaligned) {
      verified += group.length;
      continue;
    }
    findings.push({
      id: `paged-sum-${slideNumbers.join('-')}`,
      type: 'ABSOLUTE_SUM',
      section: group[0].section,
      slideRef: refs.join(' × '),
      title: viz.unaligned
        ? `Totais da tabela paginada não conferidos (${group.length} fatias)`
        : `Tabela paginada não fecha somando as ${group.length} fatias`,
      detail: viz.unaligned
        ? `Os slides ${refs.join(', ')} repetem o mesmo total declarado — são fatias da mesma tabela. A linha de totais não pôde ser casada com as colunas em nenhuma das fatias, então a soma do conjunto não foi conferida: confira na imagem.`
        : `Os slides ${refs.join(', ')} repetem o mesmo total declarado — são fatias da mesma tabela, então cada fatia sozinha nunca fecharia. Somando as ${rows.length} linhas distintas: ${viz.notes?.[0] ?? 'o conjunto não fecha no total.'} Confira se falta uma fatia ou se alguma linha foi lida errado.`,
      ok: false,
      viz,
      // O conjunto depende de TODAS as fatias terem sido lidas certo; uma linha
      // mal lida basta para desfechar. Fica em “Verificar”, não em “Erro”.
      confidence: 3,
    });
  }

  return { dropIds, findings, verified };
}
