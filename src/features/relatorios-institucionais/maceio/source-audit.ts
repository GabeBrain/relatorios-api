import { marketMonth, normalizeMarketText, type MarketRow } from './market';
import type { SlideSource } from './market-slides-data';
import { maceioHorizontalProduct } from './classification';
import { maceioHistoricalLaunch } from './historical-launch';

const label = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, 100) || '(não informado)' : '(não informado)';
const countLabels = (values: unknown[]) => {
  const counts = new Map<string, number>();
  for (const value of values) { const key = label(value); counts.set(key, (counts.get(key) ?? 0) + 1); }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => ({ value, count }));
};
const numeric = (value: unknown) => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value.trim()))) return null;
  const parsed = Number(value); return Number.isFinite(parsed) && Math.abs(parsed) < Number.MAX_SAFE_INTEGER / 100 ? parsed : null;
};

/** Aggregate evidence only: no project/typology IDs, names, addresses or raw rows. */
export function auditMaceioSource(source: SlideSource, expectedMonths: string[]) {
  const detailed = source.metric === 'details';
  const fields = ['building_subtype', 'subtype', 'product_type', 'horizontal_type', 'work', 'standard'] as const;
  const observations: MarketRow[] = detailed ? source.rows.flatMap(row => Array.isArray(row.typologies_history)
    ? row.typologies_history.filter((value): value is MarketRow => Boolean(value) && typeof value === 'object' && !Array.isArray(value)) : []) : source.rows;
  const byMonth = new Map<string, MarketRow[]>();
  const eligibleByMonth = new Map<string,{row:MarketRow;building:MarketRow;release:string|null;kind:unknown}[]>();
  const futureByMonth = new Map<string,MarketRow[]>();
  if(detailed)for(const building of source.rows){
    const release=marketMonth(building.release_date);
    const metadata=new Map((Array.isArray(building.typologies)?building.typologies as MarketRow[]:[]).map(row=>[String(row.id??row.typology_id),row.type_of_typology]));
    for(const row of Array.isArray(building.typologies_history)?building.typologies_history as MarketRow[]:[]){
      if(!row||typeof row!=='object')continue;
      const month=marketMonth(row.period);if(!month||!expectedMonths.includes(month))continue;
      if(!release||release>month){const rows=futureByMonth.get(month)??[];rows.push(row);futureByMonth.set(month,rows);continue;}
      const rows=eligibleByMonth.get(month)??[];rows.push({row,building,release,kind:row.type_of_typology??metadata.get(String(row.typology_id))});eligibleByMonth.set(month,rows);
    }
  }
  for (const row of observations) {
    const month = marketMonth(row.period);
    if (month) { const rows = byMonth.get(month) ?? []; rows.push(row); byMonth.set(month, rows); }
  }
  const observed = new Set(byMonth.keys());
  const launches = detailed ? source.rows.map(row => marketMonth(row.release_date)) : [];
  const monthly = expectedMonths.map(month => {
    const rows = byMonth.get(month) ?? [];
    const totals = (field: string) => {
      const values = rows.map(row => numeric(row[field]));
      const missing = values.filter(value => value === null).length;
      const sum = values.reduce<number>((total, value) => total + (value ?? 0), 0);
      return { value: rows.length && !missing && Number.isSafeInteger(sum) ? sum : null, missing };
    };
    const eligible=eligibleByMonth.get(month)??[];
    const measure=(values:unknown[])=>{const numbers=values.map(numeric),missing=numbers.filter(value=>value===null).length;const value=numbers.reduce<number>((a,b)=>a+(b??0),0);return {value:missing||!numbers.length||!Number.isSafeInteger(value)?null:value,missing};};
    const groups=(key:(item:typeof eligible[number])=>unknown)=>{
      const grouped=new Map<string,typeof eligible>();
      for(const item of eligible){const name=label(key(item)),part=grouped.get(name)??[];part.push(item);grouped.set(name,part);}
      return [...grouped].sort(([a],[b])=>a.localeCompare(b)).map(([value,part])=>({value,observations:part.length,stock:measure(part.map(item=>item.row.typology_stock))}));
    };
    return { month, observations: rows.length, stock: totals(detailed ? 'typology_stock' : 'stock'),
      sales: totals(detailed ? 'sold_in_period' : 'liquid_sales'), launches: totals('releases_in_period'),
      ...(detailed ? { capacity: totals('qty'), missingPrice: rows.filter(row => numeric(row.price) === null).length,
        missingArea: rows.filter(row => numeric(row.private_area) === null).length,
        eligibility: { observations:eligible.length,stock:measure(eligible.map(item=>item.row.typology_stock)),
          sales:measure(eligible.map(item=>item.row.sold_in_period)),
          launches:measure(eligible.map(item=>maceioHistoricalLaunch(item.row,item.release,month))),
          excludedFutureOrInvalidReleaseStock:measure((futureByMonth.get(month)??[]).map(row=>row.typology_stock)),
          byStandard:groups(item=>item.row.pattern??item.building.standard),byTypologyKind:groups(item=>item.kind),
          byProduct:groups(item=>normalizeMarketText(item.building.building_type)==='horizontal'?maceioHorizontalProduct(item.building)||'(não identificado)':'(não aplicável)'),
        } } : {}) };
  });
  return {
    observedGroups: detailed ? [] : countLabels(source.rows.map(row => row.group)),
    coverage: { observedMonths: [...observed].filter(month => expectedMonths.includes(month)).sort(), missingMonths: expectedMonths.filter(month => !observed.has(month)) },
    monthly,
    ...(detailed ? {
      standards: countLabels(source.rows.map(row => row.standard)),
      standardFamilies: countLabels(source.rows.map(row => row.standard_family)),
      productLabels: Object.fromEntries(fields.map(field => [field, countLabels(source.rows.map(row => row[field]))])),
      historyTypologyKinds: countLabels(observations.map(row => row.type_of_typology)),
      catalogTypologyKinds: countLabels(source.rows.flatMap(row => Array.isArray(row.typologies) ? row.typologies.map(item => item && typeof item === 'object' ? (item as MarketRow).type_of_typology : null) : [])),
      launchCoverage: { first: launches.filter(Boolean).sort().at(0) ?? null, last: launches.filter(Boolean).sort().at(-1) ?? null, missingDates: launches.filter(value => value === null).length },
    } : {}),
  };
}
