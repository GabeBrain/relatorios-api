import { marketMonth, normalizeMarketText, type MarketRow } from './market';
import { readNumber, type SlideSource } from './market-slides-data';

type Observation = { building: MarketRow; row: MarketRow };
const label = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, 100) || '(não informado)' : '(não informado)';
const stockTotal = (rows: MarketRow[], field: string) => {
  const numbers = rows.map(row => readNumber(row[field], false)), missing = numbers.filter(value => value === null).length;
  const sum = numbers.reduce<number>((total, value) => total + (value ?? 0), 0);
  return { observations: rows.length, missing, value: missing || !Number.isSafeInteger(sum) || Math.abs(sum) >= Number.MAX_SAFE_INTEGER / 100 ? null : sum };
};
const buckets = (rows: Observation[], key: (row: Observation) => unknown) => {
  const groups = new Map<string, MarketRow[]>();
  for (const observation of rows) { const name = label(key(observation)), items = groups.get(name) ?? []; items.push(observation.row); groups.set(name, items); }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => ({ category, ...stockTotal(items, 'typology_stock') }));
};

/** Source evidence before report exclusions. Never exports project/typology identities. */
export function auditMaceioStock(sources: SlideSource[] | undefined, cities: readonly string[], month: string) {
  return cities.map(city => {
    const selected = (sources ?? []).filter(source => normalizeMarketText(source.city) === normalizeMarketText(city));
    const detailed = selected.filter(source => source.metric === 'details'), municipal = selected.filter(source => source.metric === 'stock' && source.group === 'Padrão');
    const complete = detailed.length === 1 && municipal.length === 1 && detailed[0].complete && municipal[0].complete;
    const observations: Observation[] = [], invalid = { missingReleaseDates: 0, invalidHistory: 0, duplicateProjects: 0, duplicateSnapshots: 0, invalidTypologyIds: 0, missingEstablishedSnapshots: 0, missingSnapshotProjects: 0 };
    const projects = new Set<string>();
    for (const building of detailed.flatMap(source => source.rows)) {
      const id = String(building.building_id ?? building.id ?? '').trim();
      if (!id || projects.has(id)) invalid.duplicateProjects++;
      projects.add(id);
      if (!marketMonth(building.release_date)) invalid.missingReleaseDates++;
      if (!Array.isArray(building.typologies_history)) { invalid.invalidHistory++; continue; }
      const seen = new Set<string>(), established = new Set<string>();
      for (const value of building.typologies_history) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) { invalid.invalidHistory++; continue; }
        const row = value as MarketRow, period = marketMonth(row.period);
        if (!period) { invalid.invalidHistory++; continue; }
        const typology = String(row.typology_id ?? '').trim();
        if (typology && period <= month) established.add(typology);
        if (period !== month) continue;
        if (!typology) invalid.invalidTypologyIds++;
        if (seen.has(typology)) invalid.duplicateSnapshots++;
        seen.add(typology); observations.push({ building, row });
      }
      const release = marketMonth(building.release_date);
      if (release && release <= month) {
        if (!seen.size) invalid.missingSnapshotProjects++;
        invalid.missingEstablishedSnapshots += [...established].filter(typology => !seen.has(typology)).length;
      }
    }
    const eligible = observations.filter(({ building }) => { const release = marketMonth(building.release_date); return release !== null && release <= month; });
    const raw = stockTotal(observations.map(item => item.row), 'typology_stock'), eligibleStock = stockTotal(eligible.map(item => item.row), 'typology_stock');
    const municipalRows = municipal.flatMap(source => source.rows).filter(row => marketMonth(row.period) === month), total = stockTotal(municipalRows, 'stock');
    // An unavailable or ambiguous source is not a completed scan of zero units.
    if (detailed.length !== 1 || !detailed[0].complete) { raw.value = null; eligibleStock.value = null; }
    if (municipal.length !== 1 || !municipal[0].complete) total.value = null;
    const groups = new Set<string>();
    const invalidMunicipalGroups = municipalRows.some(row => { const group = normalizeMarketText(row.group); if (!group || /^(total|subtotal)(\b|$)/.test(group) || groups.has(group)) return true; groups.add(group); return false; });
    const valid = complete && !invalidMunicipalGroups && Object.values(invalid).every(count => count === 0) && eligibleStock.value !== null && total.value !== null;
    const delta = valid ? eligibleStock.value! - total.value! : null;
    return { city, month, complete, comparison: valid ? delta === 0 ? 'matched' : 'mismatch' : 'unavailable',
      basis: 'source-before-report-exclusions; release-date-at-or-before-month; not-slide-homologation',
      municipal: { ...total, invalidGroups: invalidMunicipalGroups }, granularRaw: raw, granularEligible: eligibleStock, delta, invalid,
      byLaunchScope: buckets(observations, ({ building }) => { const release = marketMonth(building.release_date); return !release ? 'data ausente' : release > month ? 'posterior ao fechamento' : 'até o fechamento'; }),
      byTypologyKind: buckets(eligible, ({ row }) => row.type_of_typology),
      byHistoricalStatus: buckets(eligible, ({ row }) => row.building_status),
      byCatalogStandard: buckets(eligible, ({ building }) => building.standard),
      byBedrooms: buckets(eligible, ({ row }) => row.number_bedroom),
    };
  });
}
