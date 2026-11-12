import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function permissionSummary(raw) {
  try {
    const p = JSON.parse(raw);
    return Object.fromEntries(['pull', 'push', 'admin', 'maintain', 'triage'].map(key => [key, p[key] === true]));
  } catch { return null; }
}

export function collectPreflight({ root = repositoryRoot, github = false, run = spawnSync, exists = existsSync } = {}) {
  const command = (program, args) => {
    const result = run(program, args, { cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true });
    return { ok: result.status === 0 && !result.error, output: typeof result.stdout === 'string' ? result.stdout.trim() : '' };
  };
  const branch = command('git', ['branch', '--show-current']);
  const head = command('git', ['rev-parse', '--short', 'HEAD']);
  const dirty = command('git', ['status', '--porcelain']);
  const origin = command('git', ['remote', 'get-url', 'origin']);
  const divergence = command('git', ['rev-list', '--left-right', '--count', 'origin/main...HEAD']);
  const result = {
    scope: 'Diagnóstico desta máquina; offline por padrão. Não faz fetch, pull, push, instalação, API de dados ou PDF.',
    node: process.version,
    git: {
      readable: branch.ok && head.ok,
      branch: branch.ok && /^[\w./-]+$/.test(branch.output) ? branch.output : 'NÃO TESTADO',
      sha: head.ok && /^[a-f0-9]+$/.test(head.output) ? head.output : 'NÃO TESTADO',
      expectedOrigin: origin.ok && /(?:github\.com[:/])GabeBrain\/relatorios-api(?:\.git)?$/i.test(origin.output),
      localChanges: dirty.ok ? dirty.output.split(/\r?\n/).filter(Boolean).length : 'NÃO TESTADO',
      divergenceFromCachedRef: divergence.ok && /^\d+\s+\d+$/.test(divergence.output) ? divergence.output.replace(/\s+/, '/') : 'NÃO TESTADO',
      warning: 'Divergência usa ref local; fazer fetch de todos os remotes separadamente para evidência atual.'
    },
    files: Object.fromEntries(['node_modules', 'package-lock.json', 'AGENTS.md', 'docs/handoffs/lucas-relatorios-2026-10-14/README.md', '.env', '.env.local'].map(path => [path, exists(resolve(root, path))])),
    secrets: 'Nenhum conteúdo de env/token/credencial é lido ou impresso.',
    github: { status: 'NÃO TESTADO; opcional --github' },
    externalAccess: { drive: 'NÃO TESTADO', rebrain: 'NÃO TESTADO', geobrainCatalog: 'NÃO TESTADO', lovable: 'NÃO TESTADO', mapbox: 'NÃO TESTADO' }
  };
  if (github) {
    const user = command('gh', ['api', 'user', '--jq', '.login']);
    const permission = command('gh', ['api', 'repos/GabeBrain/relatorios-api', '--jq', '.permissions']);
    const permissions = permission.ok ? permissionSummary(permission.output) : null;
    result.github = {
      status: user.ok && permissions ? 'OK' : 'FALHA/NÃO VERIFICADO',
      login: user.ok && /^[a-z0-9-]{1,39}$/i.test(user.output) ? user.output : 'NÃO VERIFICADO',
      permissions,
      warning: 'Permissões da conta autenticada nesta máquina, não de outra pessoa. Sem teste de push.'
    };
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some(arg => arg !== '--github')) {
    console.error('Uso: node scripts/handoffs/relatorios-preflight.mjs [--github]');
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(collectPreflight({ github: process.argv.includes('--github') }), null, 2));
  }
}
