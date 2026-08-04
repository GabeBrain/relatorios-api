// Tabela paginada (28/jul/2026) — uma tabela grande fatiada em slides vizinhos,
// cada fatia repetindo o TOTAL do conjunto inteiro. Investigado no estudo
// Raimundo Leonardi V3 (Toledo/PR): o trio “1099 / 702 / 397” aparece como
// “Total” em s42 E s43, com 12 e 24 linhas — é o total do conjunto repetido em
// cada fatia. Conferir fatia a fatia acusa soma≠total em TODAS: falso positivo.
//
// Em vez de só abster, a paginação vira uma checagem melhor: somam-se as linhas
// distintas de todas as fatias e o resultado é conferido contra o total comum.
// Fecha → os achados por fatia caem; não fecha → UM achado do conjunto.

import { checkTableSums } from '../audit/engine';
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

/** Assinatura do cabeçalho — fatias da mesma tabela repetem as colunas. */
function headerKey(table: ExtractedTable): string {
  return table.columns.map((column) => normalized(String(column ?? ''))).join('|');
}

/**
 * Assinatura dos totais declarados. Exige DOIS ou mais totais numéricos: um
 * único número igual entre tabelas vizinhas é coincidência comum (100%, 0),
 * dois ou três repetidos são a impressão digital da mesma tabela fatiada.
 */
function totalsKey(table: ExtractedTable): string | null {
  const parts = (table.totals ?? [])
    .map((cell, index) => (isNum(cell) ? `${index}:${Math.round(cell * 100) / 100}` : null))
    .filter((part): part is string => part !== null);
  return parts.length >= 2 ? parts.join('|') : null;
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

  const groups = new Map<string, SumSlice[]>();
  for (const slice of slices) {
    const totals = totalsKey(slice.table);
    if (!totals) continue;
    const key = `${headerKey(slice.table)}#${totals}`;
    const group = groups.get(key);
    if (group) group.push(slice);
    else groups.set(key, [slice]);
  }

  for (const group of groups.values()) {
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

    const first = group[0].table;
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

    if (bad === 0) {
      verified += group.length;
      continue;
    }
    findings.push({
      id: `paged-sum-${slideNumbers.join('-')}`,
      type: 'ABSOLUTE_SUM',
      section: group[0].section,
      slideRef: refs.join(' × '),
      title: `Tabela paginada não fecha somando as ${group.length} fatias`,
      detail: `Os slides ${refs.join(', ')} repetem o mesmo total declarado — são fatias da mesma tabela, então cada fatia sozinha nunca fecharia. Somando as ${rows.length} linhas distintas: ${viz.notes?.[0] ?? 'o conjunto não fecha no total.'} Confira se falta uma fatia ou se alguma linha foi lida errado.`,
      ok: false,
      viz,
      // O conjunto depende de TODAS as fatias terem sido lidas certo; uma linha
      // mal lida basta para desfechar. Fica em “Verificar”, não em “Erro”.
      confidence: 3,
    });
  }

  return { dropIds, findings, verified };
}
