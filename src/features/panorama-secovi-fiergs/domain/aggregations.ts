import type { CubeProject, MarketCube } from './cube';
import { addNullable, horizontalProjects, verticalProjects, weightedAverage } from './cube';
import { SECOVI_HORIZONTAL_LABEL } from './entity-policy';
import {
  COHORT_SUBTOTAL_LABEL,
  COHORT_TOTAL_LABEL,
  MATURITY_ORDER,
  areaBandOf,
  cohortBuckets,
  cohortLabelOf,
  orderAreaBands,
  orderStandards,
  orderTypologies,
  type CohortRowKind,
  type AreaBandLabel,
  type MaturityLabel,
  type TypologyLabel,
} from './taxonomy';

/**
 * Agregações consumidas pelos slides 31–51. Toda linha aqui deriva do mesmo cubo, portanto padrão,
 * tipologia, coorte, maturidade e VGV fecham no mesmo universo aprovado pela política da entidade.
 *
 * Convenção de ausência: `null` é ausência real. Contagens de empreendimento são sempre IDs
 * distintos (`key` do cubo), nunca soma de linhas.
 */

export type RowKind = 'row' | 'subtotal' | 'total';

export interface OfferRow {
  label: string;
  kind: RowKind;
  /** Empreendimentos distintos que compõem a linha. */
  projects: number;
  launchedUnits: number | null;
  finalUnits: number | null;
  soldUnits: number | null;
  /** Oferta final / oferta lançada, em %; `null` quando a base é zero ou indisponível. */
  availability: number | null;
}

export interface PriceRow {
  label: string;
  kind: RowKind;
  projects: number;
  averageTicket: number | null;
  averageArea: number | null;
  averagePricePerMeter: number | null;
}

export interface MaturityRow {
  label: string;
  kind: RowKind;
  projects: number;
  launched: Record<MaturityLabel, number | null> & { total: number | null };
  final: Record<MaturityLabel, number | null> & { total: number | null };
}

export interface CohortMatrixCell {
  launchedUnits: number | null;
  finalUnits: number | null;
}

export interface CohortMatrixRow {
  label: string;
  kind: RowKind;
  cells: Record<string, CohortMatrixCell>;
  total: CohortMatrixCell;
}

export interface CohortMatrix {
  standards: string[];
  rows: CohortMatrixRow[];
}

export interface VgvRow {
  label: string;
  kind: RowKind;
  segment: 'Vertical' | 'Horizontal' | 'Total';
  projects: number;
  averageTicket: number | null;
  launchedUnits: number | null;
  finalUnits: number | null;
  soldUnits: number | null;
  launchedVgvMillions: number | null;
  finalVgvMillions: number | null;
  soldVgvMillions: number | null;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const distinctProjects = (projects: CubeProject[]) => new Set(projects.map((project) => project.key)).size;
const sumOf = (projects: CubeProject[], pick: (project: CubeProject) => number | null): number | null =>
  projects.reduce<number | null>((sum, project) => addNullable(sum, pick(project)), null);

function availabilityOf(launched: number | null, final: number | null): number | null {
  if (launched === null || final === null || launched === 0) return null;
  return final / launched * 100;
}

function offerRow(label: string, kind: RowKind, projects: CubeProject[]): OfferRow {
  const launchedUnits = sumOf(projects, (project) => project.launchedUnits);
  const finalUnits = sumOf(projects, (project) => project.finalUnits);
  return {
    label,
    kind,
    projects: distinctProjects(projects),
    launchedUnits,
    finalUnits,
    soldUnits: sumOf(projects, (project) => project.soldUnits),
    availability: availabilityOf(launchedUnits, finalUnits),
  };
}

function priceRow(label: string, kind: RowKind, projects: CubeProject[]): PriceRow {
  const weight = (project: CubeProject) => project.finalUnits ?? project.launchedUnits;
  return {
    label,
    kind,
    projects: distinctProjects(projects),
    averageTicket: weightedAverage(projects.map((project) => ({ value: project.averageTicket, weight: weight(project) }))),
    averageArea: weightedAverage(projects.map((project) => ({ value: project.averageArea, weight: weight(project) }))),
    averagePricePerMeter: weightedAverage(projects.map((project) => ({ value: project.averagePricePerMeter, weight: weight(project) }))),
  };
}

function groupBy<K>(projects: CubeProject[], key: (project: CubeProject) => K): Map<K, CubeProject[]> {
  const groups = new Map<K, CubeProject[]>();
  for (const project of projects) {
    const bucket = groups.get(key(project)) ?? [];
    bucket.push(project);
    groups.set(key(project), bucket);
  }
  return groups;
}

/** Projetos que declaram uma tipologia; um empreendimento pode aparecer em mais de uma. */
function projectsByTypology(projects: CubeProject[]): Map<TypologyLabel, CubeProject[]> {
  const groups = new Map<TypologyLabel, CubeProject[]>();
  for (const project of projects) {
    for (const typology of project.typologies) {
      const bucket = groups.get(typology.typology) ?? [];
      bucket.push(project);
      groups.set(typology.typology, bucket);
    }
  }
  return groups;
}

/** Soma por tipologia sem duplicar unidades: usa a linha de tipologia, não o total do projeto. */
function typologyOfferRow(label: string, projects: CubeProject[]): OfferRow {
  const rows = projects.flatMap((project) => project.typologies.filter((typology) => typology.typology === label));
  const launchedUnits = rows.reduce<number | null>((sum, row) => addNullable(sum, row.launchedUnits), null);
  const finalUnits = rows.reduce<number | null>((sum, row) => addNullable(sum, row.finalUnits), null);
  return {
    label,
    kind: 'row',
    projects: distinctProjects(projects),
    launchedUnits,
    finalUnits,
    soldUnits: rows.reduce<number | null>((sum, row) => addNullable(sum, row.soldUnits), null),
    availability: availabilityOf(launchedUnits, finalUnits),
  };
}

/* -------------------------------------------------------------------------- */
/* Slides 31, 34, 35 — oferta por padrão e por tipologia                       */
/* -------------------------------------------------------------------------- */

/** Slide 31: oferta lançada/final por padrão, universo vertical, com nº de empreendimentos real. */
export function offerByStandard(cube: MarketCube, segment: 'Vertical' | 'Horizontal' = 'Vertical'): OfferRow[] {
  const universe = segment === 'Vertical' ? verticalProjects(cube) : horizontalProjects(cube);
  const groups = groupBy(universe, (project) => project.standard);
  const rows = orderStandards(groups.keys()).map((label) => offerRow(label, 'row', groups.get(label) ?? []));
  return [...rows, offerRow('Total', 'total', universe)];
}

/** Slides 34/35: oferta por tipologia canônica, universo vertical. */
export function offerByTypology(cube: MarketCube, segment: 'Vertical' | 'Horizontal' = 'Vertical'): OfferRow[] {
  const universe = segment === 'Vertical' ? verticalProjects(cube) : horizontalProjects(cube);
  const groups = projectsByTypology(universe);
  const rows = orderTypologies(groups.keys()).map((label) => typologyOfferRow(label, groups.get(label) ?? []));
  const launchedUnits = rows.reduce<number | null>((sum, row) => addNullable(sum, row.launchedUnits), null);
  const finalUnits = rows.reduce<number | null>((sum, row) => addNullable(sum, row.finalUnits), null);
  return [...rows, {
    label: 'Total',
    kind: 'total',
    projects: distinctProjects(universe),
    launchedUnits,
    finalUnits,
    soldUnits: rows.reduce<number | null>((sum, row) => addNullable(sum, row.soldUnits), null),
    availability: availabilityOf(launchedUnits, finalUnits),
  }];
}

/* -------------------------------------------------------------------------- */
/* Slides 33 e 48 — coortes por ano de lançamento                              */
/* -------------------------------------------------------------------------- */

const COHORT_KIND: Record<CohortRowKind, RowKind> = { cohort: 'row', subtotal: 'subtotal', total: 'total' };

/**
 * Slides 33 (vertical) e 48 (horizontal permitido): `Até 2022`, `2023`, `2024`,
 * `Subtotal até 2024`, anos posteriores e `Total geral`. Subtotal e total reagregam os projetos,
 * portanto a contagem de empreendimentos continua distinta e não soma linhas.
 */
export function offerByCohort(cube: MarketCube, segment: 'Vertical' | 'Horizontal' = 'Vertical'): OfferRow[] {
  const universe = segment === 'Vertical' ? verticalProjects(cube) : horizontalProjects(cube);
  const buckets = cohortBuckets(universe.map((project) => project.releaseYear));
  return buckets.map((bucket) => {
    const years = new Set(bucket.years);
    const projects = universe.filter((project) => years.has(project.releaseYear));
    return offerRow(bucket.label, COHORT_KIND[bucket.kind], projects);
  });
}

/* -------------------------------------------------------------------------- */
/* Slides 41 e 42 — matriz ano de lançamento × padrão                          */
/* -------------------------------------------------------------------------- */

/**
 * Slide 41: oferta lançada **e** final por ano × padrão. A oferta lançada vem do cubo granular —
 * era exatamente a coluna que a analista viu zerada por depender de uma série ausente.
 */
export function cohortMatrix(cube: MarketCube, segment: 'Vertical' | 'Horizontal' = 'Vertical'): CohortMatrix {
  const universe = segment === 'Vertical' ? verticalProjects(cube) : horizontalProjects(cube);
  const standards = orderStandards(universe.map((project) => project.standard));
  const buckets = cohortBuckets(universe.map((project) => project.releaseYear));

  const cellOf = (projects: CubeProject[]): CohortMatrixCell => ({
    launchedUnits: sumOf(projects, (project) => project.launchedUnits),
    finalUnits: sumOf(projects, (project) => project.finalUnits),
  });

  const rows = buckets.map((bucket) => {
    const years = new Set(bucket.years);
    const scoped = universe.filter((project) => years.has(project.releaseYear));
    const cells: Record<string, CohortMatrixCell> = {};
    for (const standard of standards) cells[standard] = cellOf(scoped.filter((project) => project.standard === standard));
    return { label: bucket.label, kind: COHORT_KIND[bucket.kind], cells, total: cellOf(scoped) };
  });

  return { standards, rows };
}

/**
 * Slide 42: participação percentual derivada exclusivamente da matriz do slide 41 — a base é a
 * coluna `Total geral`, de modo que a soma das linhas de coorte fecha 100% sem `NaN`.
 */
export function cohortMatrixParticipation(matrix: CohortMatrix): CohortMatrix {
  const total = matrix.rows.find((row) => row.label === COHORT_TOTAL_LABEL)?.total;
  const share = (value: number | null, base: number | null | undefined) =>
    value === null || base === null || base === undefined || base === 0 ? null : value / base * 100;
  return {
    standards: matrix.standards,
    rows: matrix.rows.map((row) => ({
      label: row.label,
      kind: row.kind,
      cells: Object.fromEntries(matrix.standards.map((standard) => [standard, {
        launchedUnits: share(row.cells[standard].launchedUnits, total?.launchedUnits),
        finalUnits: share(row.cells[standard].finalUnits, total?.finalUnits),
      }])),
      total: { launchedUnits: share(row.total.launchedUnits, total?.launchedUnits), finalUnits: share(row.total.finalUnits, total?.finalUnits) },
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Slides 43–46 — maturidade, somente vertical                                 */
/* -------------------------------------------------------------------------- */

const emptyMaturity = () => ({ Planta: null as number | null, 'Construção': null as number | null, Pronto: null as number | null, total: null as number | null });

function maturityRow(label: string, kind: RowKind, projects: CubeProject[]): MaturityRow {
  const launched = emptyMaturity();
  const final = emptyMaturity();
  for (const project of projects) {
    if (!project.maturity) continue;
    launched[project.maturity] = addNullable(launched[project.maturity], project.launchedUnits);
    final[project.maturity] = addNullable(final[project.maturity], project.finalUnits);
  }
  launched.total = MATURITY_ORDER.reduce<number | null>((sum, key) => addNullable(sum, launched[key]), null);
  final.total = MATURITY_ORDER.reduce<number | null>((sum, key) => addNullable(sum, final[key]), null);
  return { label, kind, projects: distinctProjects(projects), launched, final };
}

/** Slides 43/44: maturidade × padrão, exclusivamente vertical. */
export function maturityByStandard(cube: MarketCube): MaturityRow[] {
  const universe = verticalProjects(cube);
  const groups = groupBy(universe, (project) => project.standard);
  const rows = orderStandards(groups.keys()).map((label) => maturityRow(label, 'row', groups.get(label) ?? []));
  return [...rows, maturityRow('Total', 'total', universe)];
}

/** Slides 45/46: maturidade × tipologia, exclusivamente vertical, com rótulos canônicos. */
export function maturityByTypology(cube: MarketCube): MaturityRow[] {
  const universe = verticalProjects(cube);
  const groups = projectsByTypology(universe);
  const rows = orderTypologies(groups.keys()).map((label) => {
    const projects = groups.get(label) ?? [];
    const launched = emptyMaturity();
    const final = emptyMaturity();
    for (const project of projects) {
      if (!project.maturity) continue;
      for (const typology of project.typologies.filter((item) => item.typology === label)) {
        launched[project.maturity] = addNullable(launched[project.maturity], typology.launchedUnits);
        final[project.maturity] = addNullable(final[project.maturity], typology.finalUnits);
      }
    }
    launched.total = MATURITY_ORDER.reduce<number | null>((sum, key) => addNullable(sum, launched[key]), null);
    final.total = MATURITY_ORDER.reduce<number | null>((sum, key) => addNullable(sum, final[key]), null);
    return { label, kind: 'row' as RowKind, projects: distinctProjects(projects), launched, final };
  });
  const totalLaunched = emptyMaturity();
  const totalFinal = emptyMaturity();
  for (const key of MATURITY_ORDER) {
    totalLaunched[key] = rows.reduce<number | null>((sum, row) => addNullable(sum, row.launched[key]), null);
    totalFinal[key] = rows.reduce<number | null>((sum, row) => addNullable(sum, row.final[key]), null);
  }
  totalLaunched.total = MATURITY_ORDER.reduce<number | null>((sum, key) => addNullable(sum, totalLaunched[key]), null);
  totalFinal.total = MATURITY_ORDER.reduce<number | null>((sum, key) => addNullable(sum, totalFinal[key]), null);
  return [...rows, { label: 'Total', kind: 'total', projects: distinctProjects(universe), launched: totalLaunched, final: totalFinal }];
}

/* -------------------------------------------------------------------------- */
/* Slides 36–39 e 49 — preços                                                  */
/* -------------------------------------------------------------------------- */

/** Slides 38/39: ticket, área e R$/m² por padrão, universo vertical, ordem canônica. */
export function pricesByStandard(cube: MarketCube, segment: 'Vertical' | 'Horizontal' = 'Vertical'): PriceRow[] {
  const universe = segment === 'Vertical' ? verticalProjects(cube) : horizontalProjects(cube);
  const groups = groupBy(universe, (project) => project.standard);
  const rows = orderStandards(groups.keys()).map((label) => priceRow(label, 'row', groups.get(label) ?? []));
  // Média geral ponderada pelo universo inteiro — nunca média simples das linhas acima.
  return [...rows, priceRow('Média Geral', 'total', universe)];
}

/** Slides 36/37: ticket, área e R$/m² por tipologia canônica, universo vertical. */
export function pricesByTypology(cube: MarketCube): PriceRow[] {
  const universe = verticalProjects(cube);
  const groups = projectsByTypology(universe);
  const rows = orderTypologies(groups.keys()).map((label) => {
    const entries = (groups.get(label) ?? []).flatMap((project) => project.typologies.filter((item) => item.typology === label));
    const weight = (row: typeof entries[number]) => row.finalUnits ?? row.launchedUnits;
    return {
      label,
      kind: 'row' as RowKind,
      projects: distinctProjects(groups.get(label) ?? []),
      averageTicket: weightedAverage(entries.map((row) => ({ value: row.averageTicket, weight: weight(row) }))),
      averageArea: weightedAverage(entries.map((row) => ({ value: row.averageArea, weight: weight(row) }))),
      averagePricePerMeter: weightedAverage(entries.map((row) => ({ value: row.averagePricePerMeter, weight: weight(row) }))),
    };
  });
  return [...rows, priceRow('Média Geral', 'total', universe)];
}

/**
 * Slide 49: preços horizontais abertos por padrão. O universo já chega restrito a Condomínio de
 * Casas pela política Secovi, portanto não há loteamento nesta tabela.
 */
export function horizontalPricesByStandard(cube: MarketCube): PriceRow[] {
  return pricesByStandard(cube, 'Horizontal');
}

/* -------------------------------------------------------------------------- */
/* Slide 27 — oferta final e IVV por área útil                                 */
/* -------------------------------------------------------------------------- */

export interface AreaBandRow {
  label: string;
  kind: RowKind;
  /** Oferta final do fechamento anterior, reconstituída por identidade contábil. */
  previousUnits: number | null;
  finalUnits: number | null;
  /** Unidades lançadas **no fechamento**, não o total histórico do empreendimento. */
  launchedUnits: number | null;
  soldUnits: number | null;
  /** PRE-009: vendas / (oferta anterior + lançamentos). `null` quando a base não existe. */
  ivv: number | null;
}

/**
 * Slide 27 (JG-19). Duas correções na mesma página:
 *
 * 1. o eixo é **área útil em m²**, nas faixas do gabarito 1T26 — o número de dormitórios solto que
 *    estava impresso não é metragem;
 * 2. o IVV vem da identidade reconciliada PRE-009 sobre o cubo granular, e não do endpoint
 *    `ivv?group_by=Tipologia`, que responde 500 de forma sistemática e produzia uma coluna inteira
 *    de zeros. Onde a base não existe, a célula é `null` e a página imprime indisponibilidade —
 *    nunca zero.
 *
 * `oferta anterior = max(0, final + vendas − lançamentos do período)` e
 * `IVV = vendas / (oferta anterior + lançamentos)`. Enquanto o piso não age, a base equivale a
 * `final + vendas`. Uma faixa sem área informada não é distribuída: fica de fora, e a diferença
 * entre o total das faixas e o total do universo permanece visível.
 */
export function offerByAreaBand(cube: MarketCube): AreaBandRow[] {
  const universe = verticalProjects(cube);
  const buckets = new Map<AreaBandLabel, { final: number | null; launched: number | null; sold: number | null }>();
  for (const project of universe) {
    const launchedInPeriod = project.releaseQuarter === cube.endQuarter;
    for (const typology of project.typologies) {
      const band = areaBandOf(typology.averageArea);
      if (!band) continue;
      const bucket = buckets.get(band) ?? { final: null, launched: null, sold: null };
      bucket.final = addNullable(bucket.final, typology.finalUnits);
      // Empreendimento lançado antes do fechamento contribui com zero **medido** neste período —
      // não com ausência. Tratar isso como `null` propagaria indisponibilidade para a oferta
      // anterior e para o IVV de faixas que têm base perfeitamente calculável.
      bucket.launched = addNullable(bucket.launched, launchedInPeriod ? typology.launchedUnits ?? 0 : 0);
      bucket.sold = addNullable(bucket.sold, typology.soldUnits);
      buckets.set(band, bucket);
    }
  }
  const rowOf = (label: string, kind: RowKind, value: { final: number | null; launched: number | null; sold: number | null }): AreaBandRow => {
    // A oferta anterior é reconstituída por identidade contábil, mas não pode ser negativa: um
    // empreendimento lançado **dentro** do fechamento não tinha oferta no período anterior. Sem o
    // piso em zero, uma faixa cujo lançamento supera final + vendas imprimia uma oferta negativa.
    const previous = value.final === null || value.sold === null || value.launched === null
      ? null
      : Math.max(0, value.final + value.sold - value.launched);
    // A base do IVV é a oferta disponível para venda no período: anterior + lançamentos. Com o piso
    // aplicado, ela permanece igual a `final + vendas` sempre que o piso não age.
    const base = previous === null || value.launched === null ? null : previous + value.launched;
    return {
      label, kind,
      previousUnits: previous,
      finalUnits: value.final,
      launchedUnits: value.launched,
      soldUnits: value.sold,
      ivv: value.sold === null || base === null || base === 0 ? null : value.sold / base * 100,
    };
  };
  const rows = orderAreaBands(buckets.keys()).map((label) => rowOf(label, 'row', buckets.get(label)!));
  if (!rows.length) return [];
  const sum = (pick: (row: AreaBandRow) => number | null) => rows.reduce<number | null>((total, row) => addNullable(total, pick(row)), null);
  /**
   * O total soma **as linhas impressas**, não o universo. É a diferença que importa depois do piso
   * em zero da oferta anterior: totalizar o universo à parte produziria uma coluna cujo total não
   * fecha com o que está na página, e a analista leria como erro de conta.
   */
  const previousUnits = sum((row) => row.previousUnits);
  const launchedUnits = sum((row) => row.launchedUnits);
  const soldUnits = sum((row) => row.soldUnits);
  const base = previousUnits === null || launchedUnits === null ? null : previousUnits + launchedUnits;
  return [...rows, {
    label: 'Total',
    kind: 'total',
    previousUnits,
    finalUnits: sum((row) => row.finalUnits),
    launchedUnits,
    soldUnits,
    ivv: soldUnits === null || base === null || base === 0 ? null : soldUnits / base * 100,
  }];
}

/* -------------------------------------------------------------------------- */
/* Slide 51 — VGV geral                                                        */
/* -------------------------------------------------------------------------- */

function vgvRow(label: string, kind: RowKind, segment: VgvRow['segment'], projects: CubeProject[]): VgvRow {
  const soldUnits = sumOf(projects, (project) => project.soldUnits);
  const launchedVgv = sumOf(projects, (project) => project.launchedVgvMillions);
  const finalVgv = sumOf(projects, (project) => project.finalVgvMillions);
  return {
    label,
    kind,
    segment,
    projects: distinctProjects(projects),
    averageTicket: weightedAverage(projects.map((project) => ({ value: project.averageTicket, weight: project.finalUnits ?? project.launchedUnits }))),
    launchedUnits: sumOf(projects, (project) => project.launchedUnits),
    finalUnits: sumOf(projects, (project) => project.finalUnits),
    soldUnits,
    launchedVgvMillions: launchedVgv,
    finalVgvMillions: finalVgv,
    soldVgvMillions: launchedVgv === null || finalVgv === null ? null : launchedVgv - finalVgv,
  };
}

/**
 * Slide 51: padrões verticais → `Subtotal vertical` → padrões horizontais permitidos →
 * `Total geral`. A contagem de empreendimentos é de IDs distintos, e por isso deixa de ser zero.
 */
export function vgvSummary(cube: MarketCube): VgvRow[] {
  const vertical = verticalProjects(cube);
  const horizontal = horizontalProjects(cube);
  const rowsFor = (projects: CubeProject[], segment: 'Vertical' | 'Horizontal') => {
    const groups = groupBy(projects, (project) => project.standard);
    // JG-35: os condomínios entram depois do subtotal Vertical e precisam ser reconhecíveis como
    // tal — um "Econômico" solto logo abaixo do subtotal seria lido como mais uma linha vertical.
    return orderStandards(groups.keys()).map((label) => vgvRow(segment === 'Horizontal' ? `${SECOVI_HORIZONTAL_LABEL} · ${label}` : label, 'row', segment, groups.get(label) ?? []));
  };
  const rows: VgvRow[] = [...rowsFor(vertical, 'Vertical')];
  if (vertical.length) rows.push(vgvRow('Subtotal vertical', 'subtotal', 'Vertical', vertical));
  rows.push(...rowsFor(horizontal, 'Horizontal'));
  if (horizontal.length) rows.push(vgvRow('Subtotal horizontal', 'subtotal', 'Horizontal', horizontal));
  rows.push(vgvRow(COHORT_TOTAL_LABEL, 'total', 'Total', cube.projects));
  return rows;
}

/* -------------------------------------------------------------------------- */
/* Reconciliação                                                               */
/* -------------------------------------------------------------------------- */

export interface UniverseTotals {
  projects: number;
  launchedUnits: number | null;
  finalUnits: number | null;
}

/** Total do universo aprovado; referência única para reconciliar todas as dimensões. */
export function universeTotals(cube: MarketCube, segment?: 'Vertical' | 'Horizontal'): UniverseTotals {
  const projects = segment === 'Vertical' ? verticalProjects(cube) : segment === 'Horizontal' ? horizontalProjects(cube) : cube.projects;
  return {
    projects: distinctProjects(projects),
    launchedUnits: sumOf(projects, (project) => project.launchedUnits),
    finalUnits: sumOf(projects, (project) => project.finalUnits),
  };
}

/** Linha `Total`/`Total geral` de um conjunto de linhas agregadas. */
export const totalRowOf = <T extends { kind: RowKind }>(rows: T[]): T | undefined => rows.find((row) => row.kind === 'total');

export const subtotalLabel = COHORT_SUBTOTAL_LABEL;
