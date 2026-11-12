import { readFile } from 'node:fs/promises';

/** Leitura agregada e sem gravação: node scripts/diagnostics/estimativas-api-audit.mjs CE Fortaleza */

const raw = await readFile(new URL('../../.secrets/geobrain.env', import.meta.url), 'utf8');
const env = Object.fromEntries(raw.split(/\r?\n/).flatMap(line => {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  return match ? [[match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2')]] : [];
}));
const [uf = 'CE', city = 'Fortaleza'] = process.argv.slice(2);
let token = env.GEOBRAIN_TOKEN;

async function probeCities(candidate) {
  return fetch('https://geobrain.com.br/public-api/monitored-cities?per_page=5&page=1', {
    headers: { Authorization: `Bearer ${candidate}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000),
  });
}

let cities = token ? await probeCities(token) : null;
if (!cities?.ok) {
  const login = await fetch('https://geobrain.com.br/public-api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: env.GEOBRAIN_EMAIL, password: env.GEOBRAIN_PASSWORD }), signal: AbortSignal.timeout(20_000),
  });
  if (!login.ok) throw new Error(`Login HTTP ${login.status}`);
  token = (await login.json()).token;
  if (!token) throw new Error('Login sem token');
  cities = await probeCities(token);
}
const cityBody = cities.ok ? await cities.json() : null;
if (!cities.ok) throw new Error(`Cidades monitoradas HTTP ${cities.status}`);
const query = new URLSearchParams({ type: 'Horizontal', uf, city, per_page: '100', page: '1' });
async function historyPage(page) {
  query.set('page', String(page));
  const response = await fetch(`https://app.geobrain.com.br/public-api/v2/building-with-history-internal?${query}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Histórico HTTP ${response.status}, página ${page}`);
  return response.json();
}
const body = await historyPage(1);
const pageCount = Number(body?.meta?.last_page ?? 1);
if (!Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > 10) throw new Error(`Paginação inválida ou acima do teto de 10 páginas: ${pageCount}`);
const buildings = Array.isArray(body?.data) ? [...body.data] : [];
for (let page = 2; page <= pageCount; page += 1) {
  const payload = await historyPage(page);
  if (!Array.isArray(payload?.data)) throw new Error(`Página ${page} sem data[]`);
  buildings.push(...payload.data);
}
const history = buildings.flatMap(building => Array.isArray(building.typologies_history) ? building.typologies_history : []);
const periods = history.map(row => String(row.period ?? '').slice(0, 7)).filter(Boolean).sort();
const count = key => history.filter(row => row[key] !== null && row[key] !== undefined && row[key] !== '').length;
const distribution = (rows, key) => Object.fromEntries([...new Set(rows.map(row => String(row[key] ?? '(ausente)')))].sort().map(value => [value, rows.filter(row => String(row[key] ?? '(ausente)') === value).length]));
const number = value => value === null || value === undefined || value === '' ? null : Number(value);
const reconciled = history.filter(row => [row.sold_in_period, row.gross_sales, row.distractions].every(value => number(value) !== null));
const matchingSales = reconciled.filter(row => Math.abs(number(row.gross_sales) - number(row.distractions) - number(row.sold_in_period)) < 0.001).length;
const duplicateKeys = buildings.reduce((total, building) => {
  const keys = (building.typologies_history ?? []).map(row => `${row.typology_id}|${row.period}`);
  return total + keys.length - new Set(keys).size;
}, 0);
const byBuilding = buildings.map(building => {
  const rows = building.typologies_history ?? [];
  return { rows: rows.length, months: new Set(rows.map(row => String(row.period ?? '').slice(0, 7))).size };
});
const productLabels = new Set(['Loteamento Aberto', 'Loteamento Fechado']);
const productByBuilding = buildings.map(building => {
  const patterns = new Set((building.typologies_history ?? []).map(row => row.pattern).filter(value => productLabels.has(value)));
  return { labels: patterns.size, estimated: String(building.estimation) === '1', releaseYear: Number(String(building.release_date ?? '').slice(0, 4)) };
});
console.log(JSON.stringify({
  scope: `${uf}/${city}`,
  auditedAtUtc: new Date().toISOString(),
  monitoredCitiesHttp: cities.status,
  monitoredCitiesFirstPage: Array.isArray(cityBody?.data) ? cityBody.data.length : null,
  historyHttp: 200,
  historyPages: pageCount,
  horizontalTotalReported: body?.meta?.total ?? null,
  sampleBuildings: buildings.length,
  sampleHistoryRows: history.length,
  firstPeriod: periods[0] ?? null,
  lastPeriod: periods.at(-1) ?? null,
  sampleBuildingFields: [...new Set(buildings.flatMap(building => Object.keys(building)))].sort(),
  sampleHistoryFields: [...new Set(history.flatMap(row => Object.keys(row)))].sort(),
  fieldPresence: Object.fromEntries(['period', 'typology_id', 'pattern', 'qty', 'typology_stock', 'sold_in_period', 'gross_sales', 'distractions', 'time_on_sale', 'estimation'].map(key => [key, count(key)])),
  estimationByBuilding: distribution(buildings, 'estimation'),
  patternByHistoryRow: distribution(history, 'pattern'),
  negativeMonthlyNetSales: history.filter(row => number(row.sold_in_period) !== null && number(row.sold_in_period) < 0).length,
  grossMinusDistractionsComparable: reconciled.length,
  grossMinusDistractionsMatchesNet: matchingSales,
  duplicateTypologyPeriodKeys: duplicateKeys,
  buildingsWithoutHistory: byBuilding.filter(item => item.rows === 0).length,
  buildingsWithAtLeastSixMonths: byBuilding.filter(item => item.months >= 6).length,
  buildingsWithAtLeastTwelveMonths: byBuilding.filter(item => item.months >= 12).length,
  currentStandardByBuilding: distribution(buildings, 'standard'),
  release2020Onward: productByBuilding.filter(item => item.releaseYear >= 2020).length,
  withExplicitHorizontalProductInHistory: productByBuilding.filter(item => item.labels === 1).length,
  withConflictingHorizontalProductsInHistory: productByBuilding.filter(item => item.labels > 1).length,
  release2020OnwardExplicitProductAndEstimationZero: productByBuilding.filter(item => item.releaseYear >= 2020 && item.labels === 1 && !item.estimated).length,
}, null, 2));
