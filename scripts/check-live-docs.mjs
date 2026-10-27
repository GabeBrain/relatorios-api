import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
// Higiene dos docs vivos: só avisa, nunca bloqueia (convenção em docs/projetos/README.md, seção Rotação).
const LIVE_LIMIT = 120 * 1024;
const warn = (message) => console.warn(`${process.env.GITHUB_ACTIONS ? '::warning::' : 'Aviso: '}${message}`);
const listLiveDocs = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  if (entry.isDirectory()) return entry.name === 'historico' ? [] : listLiveDocs(path);
  return /^LIVE_.*\.md$/.test(entry.name) ? [path] : [];
});
for (const file of listLiveDocs('docs')) {
  const size = statSync(file).size;
  if (size > LIVE_LIMIT) {
    warn(/regras/.test(file)
      ? `${file} tem ${Math.round(size / 1024)} KB: consolide as regras vigentes antes de mover versões antigas para historico/.`
      : `${file} tem ${Math.round(size / 1024)} KB: mova entradas com mais de 7 dias, sem edição, para historico/.`);
  }
  if (!/^\s*# /.test(readFileSync(file, 'utf8'))) warn(`${file} tem conteúdo acima do título: entrada nova vai no topo de Desenvolvimentos.`);
}

if (failures.length) {
  console.error('Documentação viva pendente:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('Documentação viva compatível com as mudanças analisadas.');
