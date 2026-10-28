// Frozen-source replay: five reviewable cases, real IDs locally only. No API writes.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const folder = '.local-inputs/estimativas-vendas/essencial-v1-20261028'; await mkdir(folder, { recursive: true });
await build({ entryPoints: ['src/features/estimativas-vendas/experience/domain.ts'], bundle: true, platform: 'node', format: 'esm', outfile: `${folder}/domain.mjs` });
await build({ entryPoints: ['src/features/estimativas-vendas/scientific/study.ts'], bundle: true, platform: 'node', format: 'esm', outfile: `${folder}/study.mjs` });
const D = await import(pathToFileURL(resolve(`${folder}/domain.mjs`))), S = await import(pathToFileURL(resolve(`${folder}/study.mjs`)));
const bytes = await readFile('.local-inputs/estimativas-vendas/curitiba-ciencia-20261027/snapshot.json'); const raw = JSON.parse(bytes);
const buildings = raw.buildings.map(S.compactBuilding), cutoff = S.sourcePeriods(buildings).at(-1), rows = S.inventory(buildings, cutoff);
const conditions = [
  ['tipologia_unica_finotti', r => r.typologies === 1 && r.tags.some(t => t.startsWith('finotti-'))],
  ['varias_tipologias_finotti', r => r.typologies > 1 && r.tags.some(t => t.startsWith('finotti-'))],
  ['estoque_antigo', r => r.tags.includes('old-stock')],
  ['esgotado_atual_com_estoque_passado', r => r.stock === 0 && buildings.find(b => String(b.building_id) === r.id).typologies_history.some(t => t.typology_stock > 0)],
  ['historico_curto', r => r.tags.includes('short-history')],
];
const evidence = [];
for (const [condition, predicate] of conditions) {
  const row = rows.find(predicate); if (!row) { evidence.push({ condition, available: false }); continue; }
  const b = buildings.find(b => String(b.building_id) === row.id);
  const start = condition === 'esgotado_atual_com_estoque_passado' ? [...S.sourcePeriods([b])].reverse().find(date => S.describeBuilding(b, date).stock > 0) : cutoff;
  const data = { buildings: [b], hash: createHash('sha256').update(JSON.stringify(b)).digest('hex'), city: 'Curitiba', uf: 'PR', fetchedAt: raw.fetchedAt };
  const spec = { cutoff: start, duration: 12, methods: D.ALL_METHODS }, result = await D.analyzeCase(data, row.id, spec), presentation = D.present(result);
  const single = b.typologies_history.filter(r => r.period.slice(0, 7) === start).length === 1;
  evidence.push({ condition, available: true, id: row.id, name: row.name, sourceHash: data.hash, start, presentation, candidateStructure: single, operationallyApproved: false,
    pending: ['Origem por período', 'Cadência oficial', ...(single ? [] : ['Rateio entre tipologias']), 'Contrato Belogic'], result });
}
await writeFile(`${folder}/amostra-revisavel.json`, JSON.stringify(evidence, null, 2));
await writeFile(`${folder}/amostra-entradas.json`, JSON.stringify(evidence.flatMap(e => e.available ? buildings.filter(b => String(b.building_id) === e.id) : [])));
const summary = { rawSnapshotSha256: createHash('sha256').update(bytes).digest('hex'), cutoff, buildings: buildings.length, selectedConditions: evidence.map(e => ({ condition: e.condition, available: e.available, method: e.presentation?.method, typologies: e.presentation?.row.typologies, start: e.start, candidateStructure: e.candidateStructure })), noImportableRows: true };
await writeFile(`${folder}/amostra-resumo.json`, JSON.stringify(summary, null, 2)); console.log(JSON.stringify(summary, null, 2));
