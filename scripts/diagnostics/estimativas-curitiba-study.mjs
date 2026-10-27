// Read-only source snapshot and reproducible scientific study. No Geobrain writes.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const folder = '.local-inputs/estimativas-vendas/curitiba-ciencia-20261027';
await mkdir(folder, { recursive: true });
let snapshot;
if (process.argv.includes('--replay')) {
  snapshot = JSON.parse(await readFile(`${folder}/snapshot.json`, 'utf8'));
} else {
  const raw = await readFile('.secrets/geobrain.env', 'utf8');
  const env = Object.fromEntries(raw.split(/\r?\n/).flatMap(line => {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    return m ? [[m[1], m[2].trim().replace(/^(['"])(.*)\1$/, '$2')]] : [];
  }));
  let token = env.GEOBRAIN_TOKEN;
  const headers = () => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
  const probe = () => fetch('https://geobrain.com.br/public-api/monitored-cities?per_page=1&page=1', { headers: headers(), signal: AbortSignal.timeout(30000) });
  if (!token || !(await probe()).ok) {
    const response = await fetch('https://geobrain.com.br/public-api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: env.GEOBRAIN_EMAIL, password: env.GEOBRAIN_PASSWORD }), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Authentication HTTP ${response.status}`);
    token = (await response.json()).token;
    if (!token) throw new Error('Authentication returned no token');
  }
  let url = 'https://geobrain.com.br/public-api/monitored-cities?per_page=100&page=1', authorized = false, catalogPages = 0;
  const visited = new Set();
  while (url) {
    if (visited.has(url) || ++catalogPages > 100) throw new Error('Invalid city pagination');
    visited.add(url);
    const parsed = new URL(url);
    if (!['geobrain.com.br', 'app.geobrain.com.br'].includes(parsed.hostname)) throw new Error('Untrusted next link');
    const response = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`City catalog HTTP ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body.data)) throw new Error('Invalid city catalog');
    authorized ||= body.data.some(row => row.city === 'Curitiba' && (row.state === 'PR' || row.uf === 'PR'));
    url = body.links?.next ?? '';
  }
  if (!authorized) throw new Error('Curitiba/PR is not in the authorized catalog');
  const buildings = [], requests = [];
  for (const type of ['Horizontal', 'Vertical']) {
    let total = 1;
    const pages = new Map();
    const read = async page => {
      const query = new URLSearchParams({ uf: 'PR', city: 'Curitiba', type, per_page: '100', page: String(page) });
      let response;
      for (let attempt = 0; attempt < 3; attempt++) {
        response = await fetch(`https://app.geobrain.com.br/public-api/v2/building-with-history-internal?${query}`, { method: 'POST', headers: headers(), signal: AbortSignal.timeout(60000) });
        requests.push({ type, page, attempt, status: response.status });
        if (![429, 502, 503, 504].includes(response.status) || attempt === 2) break;
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
      if (!response.ok) throw new Error(`History ${type}/${page} HTTP ${response.status}`);
      const body = await response.json(), count = Number(body.meta?.last_page ?? 1);
      if (!Array.isArray(body.data) || !Number.isSafeInteger(count) || count < 1 || count > 30) throw new Error('Invalid history pagination');
      if (page === 1) total = count;
      else if (count !== total) throw new Error('History pagination changed');
      pages.set(page, body.data.map(b => ({ ...b, sourceType: type })));
    };
    await read(1);
    let next = 2;
    await Promise.all(Array.from({ length: Math.min(8, total - 1) }, async () => {
      while (next <= total) await read(next++);
    }));
    buildings.push(...[...pages].sort(([a], [b]) => a - b).flatMap(([, rows]) => rows));
  }
  const ids = buildings.map(b => String(b.building_id ?? b.id ?? ''));
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Missing or duplicate building IDs');
  snapshot = { schema: 'curitiba-study-source-v1', city: 'Curitiba', uf: 'PR', fetchedAt: new Date().toISOString(), requests, buildings };
  await writeFile(`${folder}/snapshot.json`, JSON.stringify(snapshot));
}
const sha256 = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
const dates = [...new Set(snapshot.buildings.flatMap(b => b.typologies_history.map(r => r.period.slice(0, 7))))].sort();
console.log(JSON.stringify({ city: snapshot.city, buildings: snapshot.buildings.length, rows: snapshot.buildings.reduce((s, b) => s + b.typologies_history.length, 0), from: dates[0], through: dates.at(-1), sha256, requests: snapshot.requests, buildingFields: Object.keys(snapshot.buildings[0] ?? {}), historyFields: Object.keys(snapshot.buildings[0]?.typologies_history[0] ?? {}) }, null, 2));
if (!process.argv.includes('--collect-only')) {
  await build({ entryPoints: ['src/features/estimativas-vendas/scientific/study.ts'], bundle: true, platform: 'node', format: 'esm', outfile: `${folder}/engine.mjs` });
  const engine = await import(new URL(`../../${folder}/engine.mjs`, import.meta.url));
  const dataset = { buildings: snapshot.buildings, city: 'Curitiba', uf: 'PR', fetchedAt: snapshot.fetchedAt, hash: sha256 };
  const inventory = engine.inventory(dataset.buildings, dates.at(-1));
  const protocol = engine.defaultProtocol(dataset, 'all');
  const results = await engine.runStudy(dataset, protocol);
  await writeFile(`${folder}/inventory.json`, JSON.stringify(inventory, null, 2));
  await writeFile(`${folder}/study.json`, JSON.stringify(results, null, 2));
  const summary = engine.summarizeStudy(dataset, inventory, results);
  await writeFile(`${folder}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}
