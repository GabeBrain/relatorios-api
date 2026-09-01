/**
 * Taxonomias canônicas do Panorama. A ordem aqui é a ordem exigida pela analista no retorno de
 * Jundiaí (slides 34–39) e vale para tabela, gráfico e derivados — nunca reordenar no JSX.
 */

export const UNCLASSIFIED = 'Não classificado';

export type TypologyLabel = '1 Dormitório' | '2 Dormitórios' | '3 Dormitórios' | '4 ou + Dormitórios' | typeof UNCLASSIFIED;
export type StandardLabel = 'Compacto' | 'Econômico' | 'Standard' | 'Médio' | 'Médio-Alto' | 'Alto' | 'Luxo' | typeof UNCLASSIFIED;

export const TYPOLOGY_ORDER: TypologyLabel[] = ['1 Dormitório', '2 Dormitórios', '3 Dormitórios', '4 ou + Dormitórios'];
export const STANDARD_ORDER: StandardLabel[] = ['Compacto', 'Econômico', 'Standard', 'Médio', 'Médio-Alto', 'Alto', 'Luxo'];

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Canoniza tipologia. Aceita as grafias da API (`1 dorm`, `Studio`, `4+ dormitórios`, `4 ou mais`)
 * e devolve exatamente um dos rótulos oficiais; desconhecido vira `Não classificado`, nunca é
 * descartado silenciosamente.
 */
export function canonicalTypology(value: unknown): TypologyLabel {
  const raw = normalizeText(value);
  if (!raw) return UNCLASSIFIED;
  if (/(studio|kitnet|kitchenette|loft|conjugad)/.test(raw)) return '1 Dormitório';
  const found = [...raw.matchAll(/(\d+)/g)].map((match) => Number(match[1])).filter((value) => Number.isInteger(value) && value >= 1);
  if (!found.length) return UNCLASSIFIED;
  // "4+", "4 ou mais", "3 a 4" e "acima de 4" caem todos na última faixa aberta.
  const upperBound = found[found.length - 1];
  if (upperBound >= 4) return '4 ou + Dormitórios';
  return TYPOLOGY_ORDER[upperBound - 1] ?? UNCLASSIFIED;
}

/**
 * Canoniza padrão construtivo aos sete padrões Secovi. "Especial" é alias editorial de Compacto
 * (PRE-008) e "Super Luxo"/"Altíssimo" colapsam em Luxo — a analista pediu exatamente sete linhas.
 */
export function canonicalStandard(value: unknown): StandardLabel {
  const raw = normalizeText(value);
  if (!raw) return UNCLASSIFIED;
  if (/(super\s*luxo|altissimo|luxo)/.test(raw)) return 'Luxo';
  if (/medio\s*[-\s]*alto|medio alto/.test(raw)) return 'Médio-Alto';
  if (/^alto|(^|\s)alto(\s|$)/.test(raw)) return 'Alto';
  if (/medio/.test(raw)) return 'Médio';
  if (/standard|padrao medio|normal/.test(raw)) return 'Standard';
  if (/econom|mcmv|popular|social/.test(raw)) return 'Econômico';
  if (/compacto|especial|super\s*economico/.test(raw)) return 'Compacto';
  return UNCLASSIFIED;
}

/** Ordena rótulos já canonizados; desconhecidos vão para o fim, em ordem alfabética estável. */
function orderBy<T extends string>(order: readonly T[]) {
  return <L extends T>(labels: Iterable<L>): L[] => {
    const seen = [...new Set(labels)];
    const known = seen.filter((label) => order.includes(label)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const rest = seen.filter((label) => !order.includes(label)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [...known, ...rest];
  };
}

/**
 * JG-37: a analista recusou o rótulo numérico solto — "2" precisa ser lido como "2 Dormitórios".
 * Rótulo que já é editorial passa intacto; só a forma numérica crua é canonizada, para não
 * reescrever nomes vindos de outra dimensão.
 */
export function typologyDisplayLabel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return UNCLASSIFIED;
  if (/^\d+\s*(\+|ou\s*mais)?$/i.test(raw)) return canonicalTypology(raw);
  return raw;
}

export const orderTypologies = orderBy(TYPOLOGY_ORDER);
export const orderStandards = orderBy(STANDARD_ORDER);

/* -------------------------------------------------------------------------- */
/* Coortes por ano de lançamento (slide 33, replicado em 41, 42 e 48)          */
/* -------------------------------------------------------------------------- */

export const COHORT_LEGACY_LABEL = 'Até 2022';
/**
 * JG-22/26/27: a analista corrigiu duas coisas ao mesmo tempo — o subtotal soma os lançados
 * **após** 2024 (não até), e a linha vem **depois** do último ano, isto é, depois de 2026.
 */
export const COHORT_SUBTOTAL_LABEL = 'Subtotal lançados após 2024';
export const COHORT_SUBTOTAL_FROM_YEAR = 2024;
export const COHORT_TOTAL_LABEL = 'Total geral';

export type CohortRowKind = 'cohort' | 'subtotal' | 'total';

export interface CohortBucket {
  label: string;
  kind: CohortRowKind;
  /** Anos concretos que a linha soma; vazio em subtotal/total, que reagregam outras linhas. */
  years: number[];
}

/**
 * Constrói a lista de linhas exigida: `Até 2022`, cada ano em ordem crescente,
 * `Subtotal lançados após 2024` logo depois do último ano, e `Total geral`.
 *
 * O subtotal soma **estritamente** os anos maiores que 2024 (JG-22/26/27). Anos anteriores nunca
 * entram nele — é a diferença que a analista apontou três vezes. A linha só existe quando há pelo
 * menos um ano posterior a 2024: sem base, a tabela não ganha uma linha zerada.
 */
export function cohortBuckets(years: Iterable<number>): CohortBucket[] {
  const present = [...new Set([...years].filter((year) => Number.isInteger(year)))].sort((a, b) => a - b);
  if (!present.length) return [];
  const legacy = present.filter((year) => year <= 2022);
  const buckets: CohortBucket[] = [];
  if (legacy.length) buckets.push({ label: COHORT_LEGACY_LABEL, kind: 'cohort', years: legacy });
  for (const year of present.filter((year) => year > 2022)) buckets.push({ label: String(year), kind: 'cohort', years: [year] });
  const afterSubtotal = present.filter((year) => year > COHORT_SUBTOTAL_FROM_YEAR);
  if (afterSubtotal.length) buckets.push({ label: COHORT_SUBTOTAL_LABEL, kind: 'subtotal', years: afterSubtotal });
  buckets.push({ label: COHORT_TOTAL_LABEL, kind: 'total', years: present });
  return buckets;
}

/** Rótulo da coorte a que um ano pertence, sem subtotal/total. */
export function cohortLabelOf(year: number): string {
  return year <= 2022 ? COHORT_LEGACY_LABEL : String(year);
}

/* -------------------------------------------------------------------------- */
/* Faixas de área útil (slide 27)                                              */
/* -------------------------------------------------------------------------- */

/**
 * JG-19: "ajustar para ficar igual as metragens do 1T/26". As faixas abaixo são as do gabarito
 * congelado do Panorama Piracicaba 1T26, na ordem em que a analista as lê. O slide 27 é "por área
 * útil em m²" — o número solto de dormitórios que estava sendo impresso não é metragem nenhuma.
 */
export const AREA_BAND_ORDER = [
  'Até 44m²', '45–49m²', '50–59m²', '60–69m²', '70–84m²',
  '85–99m²', '100–150m²', '151–200m²', '201–250m²', 'Acima de 250m²',
] as const;
export type AreaBandLabel = (typeof AREA_BAND_ORDER)[number];

const AREA_BAND_CEILINGS: { label: AreaBandLabel; ceiling: number }[] = [
  { label: 'Até 44m²', ceiling: 44 }, { label: '45–49m²', ceiling: 49 }, { label: '50–59m²', ceiling: 59 },
  { label: '60–69m²', ceiling: 69 }, { label: '70–84m²', ceiling: 84 }, { label: '85–99m²', ceiling: 99 },
  { label: '100–150m²', ceiling: 150 }, { label: '151–200m²', ceiling: 200 }, { label: '201–250m²', ceiling: 250 },
  { label: 'Acima de 250m²', ceiling: Number.POSITIVE_INFINITY },
];

/** Faixa de uma área privativa. `null` quando a área não foi informada — nunca cai numa faixa padrão. */
export function areaBandOf(area: number | null | undefined): AreaBandLabel | null {
  if (area === null || area === undefined || !Number.isFinite(area) || area <= 0) return null;
  return AREA_BAND_CEILINGS.find((band) => area <= band.ceiling)?.label ?? 'Acima de 250m²';
}

export const orderAreaBands = orderBy(AREA_BAND_ORDER);

/* -------------------------------------------------------------------------- */
/* Maturidade (slides 43–46)                                                   */
/* -------------------------------------------------------------------------- */

export const MATURITY_ORDER = ['Planta', 'Construção', 'Pronto'] as const;
export type MaturityLabel = (typeof MATURITY_ORDER)[number];

/** PRE-007: faixas 0–6 / 7–36 / 37+ meses desde o lançamento até o fechamento. */
export function maturityOfMonths(months: number | null): MaturityLabel | null {
  if (months === null || !Number.isFinite(months) || months < 0) return null;
  if (months <= 6) return 'Planta';
  if (months <= 36) return 'Construção';
  return 'Pronto';
}
