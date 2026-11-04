/** Offline replay of Finoti's contracts. No network/authentication fallback.
 * Build with esbuild (same approach as fiergs-history-contract-replay.ts).
 * Raw inputs remain ignored; default output never overwrites the historic evidence.
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fetchPanoramaReportModel } from '../../src/features/panorama-secovi-fiergs/api';
import { buildFiergsAuditCsv } from '../../src/features/panorama-secovi-fiergs/lib/fiergs-audit';
import { panoramaExportBlockReason } from '../../src/features/panorama-secovi-fiergs/export-store';
import { quarterEndMonth, quarterIndex } from '../../src/features/panorama-secovi-fiergs/domain/quarters';
import { useAuthStore } from '../../src/store/auth-store';
import type { PanoramaScope } from '../../src/features/panorama-secovi-fiergs/types';

const root = '.local-inputs/panorama-finoti-2026-11-04';
const output = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? `${root}/replayed`;
const archive = '.local-inputs/fiergs-incidente-20261027/raw';
await mkdir(output, { recursive: true });
const exact = new Map<string, { status: number; body: unknown }>();
for (const file of await readdir(`${root}/exact-raw`)) {
  const cached = JSON.parse(await readFile(`${root}/exact-raw/${file}`, 'utf8'));
  exact.set(cached.url, cached);
}
let exactMode = false;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  let cached = exactMode || url.hostname === 'servicodados.ibge.gov.br' ? exact.get(String(url)) : undefined;
  if (!cached) {
    if (exactMode) throw new Error(`Cache exato incompleto: ${url.hostname}${url.pathname}`);
    // Retrospective close from the 2026 archive, not a database-as-of-2025 claim.
    if (url.pathname.includes('temporal-analysis-city')) url.searchParams.set('end_period', '2026-06-30');
    const key = createHash('sha256').update(`${init?.method ?? 'GET'} ${url}`).digest('hex');
    cached = JSON.parse(await readFile(`${archive}/${key}.json`, 'utf8'));
  }
  return new Response(JSON.stringify(cached.body), { status: cached.status, headers: { 'Content-Type': 'application/json' } });
};
useAuthStore.getState().setToken('offline-not-a-credential', 'offline');
const cities = [['Porto Alegre'], ['Gramado', 'Canela'], ['Gramado'], ['Canela'], ['Canoas', 'Esteio', 'São Leopoldo']];
const summaries = [];
for (const quarter of ['2T2026', '4T2025', '3T2026'] as const) for (const selected of cities) {
  if (quarter === '3T2026' && selected.join('|') !== 'Gramado|Canela') continue;
  exactMode = quarter === '3T2026';
  const scope: PanoramaScope = { entity: 'fiergs-rs', engineVersion: 'v4', uf: 'RS', cities: selected,
    startQuarter: exactMode || selected.length === 3 ? '1T2023' : '1T2021', endQuarter: quarter };
  const report = await fetchPanoramaReportModel(scope);
  const block = panoramaExportBlockReason(report);
  if (block || !report.reconciliation.homologable) throw new Error(`Regressão de cobertura/conservação: ${selected.join(',')} ${quarter}`);
  if (report.cube.projects.some((p) => p.historyAudit?.closingMonth && p.historyAudit.closingMonth > quarterEndMonth(quarter))) throw new Error('Competência futura');
  if (report.sales.units.series.some((r) => quarterIndex(r.quarter) > quarterIndex(quarter))) throw new Error('Série futura');
  const id = `${selected.join('-').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll(' ', '-').toLowerCase()}-${quarter}`;
  const csv = buildFiergsAuditCsv(report);
  await writeFile(`${output}/${id}-report.json`, JSON.stringify(report));
  await writeFile(`${output}/${id}-audit.csv`, csv);
  summaries.push({ scope, projects: report.cube.projects.length, csvSha256: createHash('sha256').update(csv).digest('hex'),
    verticalIvv: report.ivv.series.at(-1)?.vertical, canonicalVertical: report.closingFacts.vertical,
    criticalMismatches: report.reconciliation.rows.filter((r) => r.critical && r.status === 'mismatch').length });
}
await writeFile(`${output}/summary.json`, JSON.stringify(summaries, null, 2));
console.log(`PASS ${summaries.length} modelos offline; nenhuma chamada de rede.`);
