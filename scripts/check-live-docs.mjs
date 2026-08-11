import { execFileSync } from 'node:child_process';

const [base, head = 'HEAD'] = process.argv.slice(2);
if (!base) {
  console.error('Uso: npm run check:live-docs -- <commit-base> [commit-final]');
  process.exit(2);
}

const changedFiles = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);
const liveDocs = new Set(changedFiles.filter((file) => file.startsWith('docs/projetos/LIVE_')));
const hasCorretorDoc = changedFiles.includes('docs/features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md');
const requirements = [
  ['Dashboard GeoBrain', /^src\/features\/dashboard-geobrain\//, 'docs/projetos/LIVE_dashboard-geobrain.md'],
  ['Área Quanti', /^src\/features\/area-quanti\//, 'docs/projetos/LIVE_area-quanti.md'],
  ['Atualizador VGV', /^src\/features\/atualizador-vgv\//, 'docs/projetos/LIVE_rebrain.md'],
  ['Corretor Vocacionais', /^(src\/features\/corretor\/|supabase\/functions\/(analyze-slide|analyze-table-image|analyze-ata-image)\/)/, 'docs/projetos/LIVE_rebrain.md'],
];
const failures = [];

for (const [environment, matcher, doc] of requirements) {
  if (changedFiles.some((file) => matcher.test(file)) && !liveDocs.has(doc)) {
    failures.push(`${environment}: atualize ${doc}.`);
  }
}
if (changedFiles.some((file) => /^(src\/|supabase\/)/.test(file)) && liveDocs.size === 0) {
  failures.push('Mudança de runtime sem documento vivo em docs/projetos/LIVE_*.md.');
}
if (changedFiles.some((file) => /^(src\/features\/corretor\/|supabase\/functions\/(analyze-slide|analyze-table-image|analyze-ata-image)\/)/.test(file)) && !hasCorretorDoc) {
  failures.push('Corretor Vocacionais: atualize docs/features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md.');
}
if (failures.length) {
  console.error('Documentação viva pendente:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('Documentação viva compatível com as mudanças analisadas.');
