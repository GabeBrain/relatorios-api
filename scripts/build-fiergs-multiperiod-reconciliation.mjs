import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [inputArg, outputPrefixArg] = process.argv.slice(2);
if (!inputArg || !outputPrefixArg) {
  throw new Error('Uso: node scripts/build-fiergs-multiperiod-reconciliation.mjs INPUT.json OUTPUT_PREFIX');
}

const input = JSON.parse(await readFile(resolve(inputArg), 'utf8'));
const outputPrefix = resolve(outputPrefixArg);
await mkdir(dirname(outputPrefix), { recursive: true });

const projects = input.cities.flatMap((city) => city.granular.projects);
const numeric = (value) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const quote = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const csv = (headers, rows) => `${headers.join(';')}\n${rows.map((row) => headers.map((header) => quote(row[header])).join(';')).join('\n')}\n`;
const contributes = (project) => numeric(project.launchedUnits) !== 0 || numeric(project.finalUnits) !== 0 || numeric(project.soldUnits) !== 0;
const excluded = projects.filter((project) => !project.inLaunchWindow && contributes(project));

const projectRows = excluded.map((project) => ({
  period: input.scope.endQuarter,
  source: 'building-with-history-internal / cubo granular',
  city: project.city,
  project_key: project.key,
  building_id: project.buildingId,
  project: project.name,
  segment: project.segment,
  standard: project.standard,
  horizontal_subtype: project.horizontalSubtype,
  release_quarter: project.releaseQuarter,
  in_selected_launch_window: project.inLaunchWindow,
  launched_units: project.launchedUnits,
  final_units: project.finalUnits,
  sold_units: project.soldUnits,
  effect: 'presente no fechamento; removido apenas pelo filtro de data de lançamento',
}));

const typologyRows = excluded.flatMap((project) => project.typologies
  .filter((typology) => numeric(typology.launchedUnits) !== 0 || numeric(typology.finalUnits) !== 0 || numeric(typology.soldUnits) !== 0)
  .map((typology) => ({
    period: input.scope.endQuarter,
    source: 'building-with-history-internal / typologies_history',
    city: project.city,
    project_key: project.key,
    building_id: project.buildingId,
    project: project.name,
    segment: project.segment,
    standard: project.standard,
    typology: typology.typology,
    area: typology.area,
    release_quarter: project.releaseQuarter,
    in_selected_launch_window: project.inLaunchWindow,
    launched_units: typology.launchedUnits,
    final_units: typology.finalUnits,
    sold_units: typology.soldUnits,
  })));

const cityRows = input.scope.cities.flatMap((city) => ['Vertical', 'Horizontal'].map((segment) => {
  const rows = projects.filter((project) => project.city === city && project.segment === segment);
  const inside = rows.filter((project) => project.inLaunchWindow);
  const total = (source, field) => source.reduce((sum, project) => sum + numeric(project[field]), 0);
  return {
    period: input.scope.endQuarter,
    source: 'building-with-history-internal / cubo granular',
    city,
    segment,
    full_projects: rows.length,
    window_projects: inside.length,
    excluded_projects: rows.length - inside.length,
    full_launched_units: total(rows, 'launchedUnits'),
    window_launched_units: total(inside, 'launchedUnits'),
    delta_launched_units: total(rows, 'launchedUnits') - total(inside, 'launchedUnits'),
    full_final_units: total(rows, 'finalUnits'),
    window_final_units: total(inside, 'finalUnits'),
    delta_final_units: total(rows, 'finalUnits') - total(inside, 'finalUnits'),
    full_sold_units: total(rows, 'soldUnits'),
    window_sold_units: total(inside, 'soldUnits'),
    delta_sold_units: total(rows, 'soldUnits') - total(inside, 'soldUnits'),
  };
}));

await Promise.all([
  writeFile(`${outputPrefix}-projects.csv`, csv(Object.keys(projectRows[0] ?? {}), projectRows), 'utf8'),
  writeFile(`${outputPrefix}-typologies.csv`, csv(Object.keys(typologyRows[0] ?? {}), typologyRows), 'utf8'),
  writeFile(`${outputPrefix}-cities.csv`, csv(Object.keys(cityRows[0] ?? {}), cityRows), 'utf8'),
]);

console.log(JSON.stringify({
  period: input.scope.endQuarter,
  projectRows: projectRows.length,
  typologyRows: typologyRows.length,
  cityRows: cityRows.length,
  outputs: [`${outputPrefix}-projects.csv`, `${outputPrefix}-typologies.csv`, `${outputPrefix}-cities.csv`],
}, null, 2));
