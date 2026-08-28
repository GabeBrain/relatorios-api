import type { Quarter, Segment } from '../types';
import { compareQuarters, parseQuarter, quarterEndMonth, quarterIndex } from './quarters';
import { canonicalStandard, canonicalTypology, maturityOfMonths, type MaturityLabel, type StandardLabel, type TypologyLabel } from './taxonomy';
import { entityPolicy, type EntityId, type HorizontalSubtype } from './entity-policy';

/**
 * Cubo granular por empreendimento. É a base única de contagem, ponderação e reconciliação: todas
 * as tabelas dos slides 31–51 derivam daqui, e nenhuma delas reconstrói universo próprio.
 *
 * Ausência é representada por `null`. Zero significa zero medido; `null` significa não coberto ou
 * não informado, e nunca deve ser somado como zero.
 */
export interface CubeTypology {
  typology: TypologyLabel;
  /** Unidades lançadas desta tipologia; `null` quando o payload não informa. */
  launchedUnits: number | null;
  finalUnits: number | null;
  soldUnits: number | null;
  averageTicket: number | null;
  averageArea: number | null;
  averagePricePerMeter: number | null;
}

export type CubeCoverage = 'complete' | 'partial' | 'missing';

export interface CubeProject {
  /** Chave única e estável entre cidades: evita colisão de `building_id` em municípios distintos. */
  key: string;
  buildingId: string;
  city: string;
  uf: string;
  name: string;
  segment: Segment;
  horizontalSubtype: HorizontalSubtype | null;
  standard: StandardLabel;
  releaseQuarter: Quarter;
  releaseYear: number;
  maturity: MaturityLabel | null;
  /** Meses entre lançamento e fechamento; `null` quando não calculável. */
  ageMonths: number | null;
  launchedUnits: number | null;
  finalUnits: number | null;
  soldUnits: number | null;
  averageTicket: number | null;
  averageArea: number | null;
  averagePricePerMeter: number | null;
  /** VGV em R$ milhões, preferindo fonte bruta da API; `null` sem preço suficiente. */
  launchedVgvMillions: number | null;
  finalVgvMillions: number | null;
  vgvFormula: string;
  latitude: number | null;
  longitude: number | null;
  typologies: CubeTypology[];
  coverage: CubeCoverage;
}

export interface CubeRejection {
  buildingId: string;
  city: string;
  reason: string;
}

export interface MarketCube {
  projects: CubeProject[];
  rejections: CubeRejection[];
  /** Cidades cujo cubo foi montado com sucesso. */
  cities: string[];
  endQuarter: Quarter;
  entity: EntityId;
}

function toNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).trim().replace(/\s/g, '');
  // A API v2 pode devolver strings JSON com ponto decimal ("-23.1857"). Só tratamos
  // pontuação brasileira como milhar quando a vírgula é o separador decimal final.
  const comma = raw.lastIndexOf(','); const dot = raw.lastIndexOf('.');
  const normalized = comma >= 0 && dot >= 0
    ? (comma > dot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, ''))
    : comma >= 0 ? raw.replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = toNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function firstText(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
  return undefined;
}

/** Soma respeitando ausência: `null + null` continua `null`; um valor presente domina. */
export function addNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

/** Média ponderada real; devolve `null` quando nenhum par (valor, peso) é utilizável. */
export function weightedAverage(entries: Iterable<{ value: number | null; weight: number | null }>): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const { value, weight } of entries) {
    if (value === null || !Number.isFinite(value)) continue;
    const safeWeight = weight === null || !Number.isFinite(weight) || weight <= 0 ? 0 : weight;
    if (safeWeight === 0) continue;
    numerator += value * safeWeight;
    denominator += safeWeight;
  }
  return denominator > 0 ? numerator / denominator : null;
}

function segmentOf(value: unknown): Segment | null {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('vertical')) return 'Vertical';
  if (raw.includes('horizontal') || raw.includes('casa') || raw.includes('loteamento')) return 'Horizontal';
  return null;
}

function monthsBetween(release: string, endMonth: string): number | null {
  const from = /^(\d{4})-(\d{2})/.exec(release);
  const to = /^(\d{4})-(\d{2})/.exec(endMonth);
  if (!from || !to) return null;
  return (Number(to[1]) - Number(from[1])) * 12 + (Number(to[2]) - Number(from[2]));
}

export interface BuildCubeOptions {
  city: string;
  uf: string;
  endQuarter: Quarter;
  entity?: EntityId;
}

/**
 * Converte a resposta bruta de `building-with-history` de UMA cidade no cubo granular, já filtrada
 * pela política da entidade. Deduplica por `building_id` dentro da cidade e prefixa a chave com o
 * município para que duas cidades nunca colidam.
 */
export function buildCityCube(raw: Record<string, unknown>[], options: BuildCubeOptions): MarketCube {
  const entity = options.entity ?? 'secovi-sp';
  const policy = entityPolicy(entity);
  const endMonth = quarterEndMonth(options.endQuarter);
  const endIndex = quarterIndex(options.endQuarter);
  const projects: CubeProject[] = [];
  const rejections: CubeRejection[] = [];
  const seen = new Set<string>();

  for (const building of raw) {
    const buildingId = String(firstText(building, ['building_id', 'id']) ?? '');
    const decision = policy.classify({
      segment: segmentOf(building.building_type ?? building.type ?? building.segment),
      rawSubtype: firstText(building, ['building_subtype', 'subtype', 'sub_type', 'horizontal_type', 'product_type']),
      rawType: firstText(building, ['building_type', 'type']),
      rawName: firstText(building, ['name', 'building_name']),
    });

    if (!buildingId) {
      rejections.push({ buildingId: '(sem id)', city: options.city, reason: 'empreendimento sem identificador estável' });
      continue;
    }
    if (!decision.accepted || !decision.segment) {
      rejections.push({ buildingId, city: options.city, reason: decision.reason ?? 'segmento_desconhecido' });
      continue;
    }

    const releaseRaw = String(firstText(building, ['release_date', 'release_period']) ?? '');
    const releaseQuarter = parseQuarter(releaseRaw);
    if (!releaseQuarter) {
      rejections.push({ buildingId, city: options.city, reason: 'sem release_date interpretável' });
      continue;
    }
    if (quarterIndex(releaseQuarter) > endIndex) {
      rejections.push({ buildingId, city: options.city, reason: 'lançamento posterior ao fechamento' });
      continue;
    }
    const key = `${options.uf}/${options.city}#${buildingId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const history = (Array.isArray(building.typologies_history) ? building.typologies_history : []) as Record<string, unknown>[];
    const withinWindow = history.filter((entry) => String(entry.period ?? '').slice(0, 7) <= endMonth);
    const releaseMonth = releaseRaw.slice(0, 7);
    const releaseEntries = withinWindow.filter((entry) => String(entry.period ?? '').slice(0, 7) === releaseMonth);
    const latestMonth = withinWindow.map((entry) => String(entry.period ?? '').slice(0, 7)).sort().at(-1) ?? null;
    const latestEntries = latestMonth ? withinWindow.filter((entry) => String(entry.period ?? '').slice(0, 7) === latestMonth) : [];

    const standard = canonicalStandard(
      firstText(building, ['standard', 'pattern'])
      ?? firstText(latestEntries[0] ?? {}, ['pattern', 'standard'])
      ?? firstText(releaseEntries[0] ?? {}, ['pattern', 'standard']),
    );

    const byTypology = new Map<TypologyLabel, CubeTypology>();
    const ensure = (label: TypologyLabel) => {
      const current = byTypology.get(label)
        ?? { typology: label, launchedUnits: null, finalUnits: null, soldUnits: null, averageTicket: null, averageArea: null, averagePricePerMeter: null };
      byTypology.set(label, current);
      return current;
    };
    for (const entry of releaseEntries) {
      // O contrato oficial de `building-with-history` usa `number_bedroom`;
      // os aliases anteriores permanecem para não quebrar respostas legadas.
      const row = ensure(canonicalTypology(firstText(entry, ['number_bedroom', 'typology', 'typology_name', 'type_of_typology', 'bedrooms', 'dorms'])));
      row.launchedUnits = addNullable(row.launchedUnits, firstNumber(entry, ['qty', 'released_units', 'units']));
    }
    for (const entry of latestEntries) {
      const row = ensure(canonicalTypology(firstText(entry, ['number_bedroom', 'typology', 'typology_name', 'type_of_typology', 'bedrooms', 'dorms'])));
      row.finalUnits = addNullable(row.finalUnits, firstNumber(entry, ['typology_stock', 'stock']));
      row.soldUnits = addNullable(row.soldUnits, firstNumber(entry, ['sold_in_period', 'liquid_sales', 'sold', 'sales']));
      const area = firstNumber(entry, ['private_area', 'area', 'average_area']);
      const price = firstNumber(entry, ['price', 'average_price', 'release_price']);
      const meter = firstNumber(entry, ['price_private_area', 'price_per_meter', 'average_price_per_meter']);
      row.averageArea = row.averageArea ?? area;
      row.averageTicket = row.averageTicket ?? price;
      row.averagePricePerMeter = row.averagePricePerMeter ?? meter ?? (price !== null && area ? price / area : null);
    }

    const typologies = [...byTypology.values()];
    const weights = typologies.map((row) => row.finalUnits ?? row.launchedUnits);
    const launchedFromTypology = typologies.reduce<number | null>((sum, row) => addNullable(sum, row.launchedUnits), null);
    const launchedUnits = firstNumber(building, ['total_units', 'qty']) ?? launchedFromTypology;
    const finalUnits = firstNumber(building, ['stock', 'final_stock'])
      ?? typologies.reduce<number | null>((sum, row) => addNullable(sum, row.finalUnits), null);
    const soldUnits = typologies.reduce<number | null>((sum, row) => addNullable(sum, row.soldUnits), null)
      ?? (launchedUnits !== null && finalUnits !== null ? launchedUnits - finalUnits : null);

    const averageArea = weightedAverage(typologies.map((row, index) => ({ value: row.averageArea, weight: weights[index] })));
    const averageTicket = weightedAverage(typologies.map((row, index) => ({ value: row.averageTicket, weight: weights[index] })))
      ?? firstNumber(building, ['average_price']);
    const averagePricePerMeter = weightedAverage(typologies.map((row, index) => ({ value: row.averagePricePerMeter, weight: weights[index] })))
      ?? (averageTicket !== null && averageArea ? averageTicket / averageArea : null);

    // VGV: fonte bruta quando existe; senão Σ(qty × preço) do mês de lançamento; senão unidades × ticket.
    const rawLaunchedVgv = firstNumber(building, ['vgv_released', 'vgv_launched', 'launch_vgv']);
    const rawFinalVgv = firstNumber(building, ['vgv_stock', 'vgv_final']) ?? firstNumber(latestEntries[0] ?? {}, ['vgv_stock']);
    const releaseVgvFromHistory = releaseEntries.length
      ? releaseEntries.reduce<number | null>((sum, entry) => {
        const qty = firstNumber(entry, ['qty', 'units']);
        const price = firstNumber(entry, ['release_price', 'price']);
        return sum === null || qty === null || price === null ? null : sum + qty * price;
      }, 0)
      : null;
    const launchedVgvMillions = rawLaunchedVgv !== null ? rawLaunchedVgv / 1_000_000
      : releaseVgvFromHistory !== null ? releaseVgvFromHistory / 1_000_000
        : launchedUnits !== null && averageTicket !== null ? launchedUnits * averageTicket / 1_000_000
          : null;
    const finalVgvMillions = rawFinalVgv !== null ? rawFinalVgv / 1_000_000
      : finalUnits !== null && averageTicket !== null ? finalUnits * averageTicket / 1_000_000
        : null;
    const vgvFormula = rawLaunchedVgv !== null ? 'VGV bruto da API (vgv_released).'
      : releaseVgvFromHistory !== null ? 'Σ(qty × release_price) das tipologias no mês de lançamento.'
        : launchedVgvMillions !== null ? 'Unidades lançadas × ticket médio ponderado.'
          : 'Sem preço suficiente: VGV permanece indisponível.';

    const ageMonths = monthsBetween(releaseRaw, `${endMonth}-01`);
    const coverage: CubeCoverage = launchedUnits === null && finalUnits === null ? 'missing'
      : launchedUnits === null || finalUnits === null || averageTicket === null ? 'partial'
        : 'complete';

    projects.push({
      key,
      buildingId,
      city: options.city,
      uf: options.uf,
      name: String(firstText(building, ['name', 'building_name']) ?? 'Empreendimento'),
      segment: decision.segment,
      horizontalSubtype: decision.horizontalSubtype,
      standard,
      releaseQuarter,
      releaseYear: Number(releaseQuarter.slice(2)),
      maturity: maturityOfMonths(ageMonths),
      ageMonths,
      launchedUnits,
      finalUnits,
      soldUnits,
      averageTicket,
      averageArea,
      averagePricePerMeter,
      launchedVgvMillions,
      finalVgvMillions,
      vgvFormula,
      latitude: firstNumber(building, ['latitude', 'lat']),
      longitude: firstNumber(building, ['longitude', 'lng', 'lon']),
      typologies,
      coverage,
    });
  }

  projects.sort((a, b) => compareQuarters(a.releaseQuarter, b.releaseQuarter) || a.name.localeCompare(b.name, 'pt-BR'));
  return { projects, rejections, cities: [options.city], endQuarter: options.endQuarter, entity };
}

/** Une cubos municipais preservando as chaves por cidade; nunca deduplica entre municípios. */
export function mergeCubes(cubes: MarketCube[], endQuarter: Quarter, entity: EntityId = 'secovi-sp'): MarketCube {
  return {
    projects: cubes.flatMap((cube) => cube.projects),
    rejections: cubes.flatMap((cube) => cube.rejections),
    cities: cubes.flatMap((cube) => cube.cities),
    endQuarter,
    entity,
  };
}

export const verticalProjects = (cube: MarketCube) => cube.projects.filter((project) => project.segment === 'Vertical');
export const horizontalProjects = (cube: MarketCube) => cube.projects.filter((project) => project.segment === 'Horizontal');
