import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AMBIENTE_SANDBOX, argsSandbox, diagnosticarIsolamento, executorBwrap, type Executar, type PastasServico,
} from '../src/isolamento.js';

/**
 * §12: comandos do agente sem rede e sem acesso às chaves.
 * 1) a configuração do sandbox (argumentos do bwrap) é a esperada;
 * 2) o diagnóstico de subida só aprova se nenhuma tentativa de fuga funcionar;
 * 3) com bwrap disponível (Linux), os mesmos comandos rodam de verdade e são bloqueados.
 */

const valoresDe = (args: string[], flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));

describe('configuração do sandbox', () => {
  const args = argsSandbox('/work/job-1');

  it('sem rede, sem ambiente herdado, PID/usuário próprios', () => {
    for (const f of ['--unshare-net', '--unshare-pid', '--unshare-user', '--clearenv', '--die-with-parent', '--as-pid-1']) expect(args).toContain(f);
    expect(args).not.toContain('--share-net');
    expect(args.indexOf('--clearenv')).toBeLessThan(args.indexOf('--setenv'));
    expect(valoresDe(args, '--setenv').sort()).toEqual(Object.keys(AMBIENTE_SANDBOX).sort());
    expect(JSON.stringify(AMBIENTE_SANDBOX)).not.toMatch(/KEY|SECRET|TOKEN|SUPABASE|ANTHROPIC|GOOGLE/i);
  });

  it('só o workspace é gravável; de /app, só lib, kb, marca e node_modules, somente leitura', () => {
    const rw = args.flatMap((a, i) => (a === '--bind' ? [args[i + 1]] : []));
    expect(rw).toEqual(['/work/job-1']);
    const ro = [...valoresDe(args, '--ro-bind'), ...valoresDe(args, '--ro-bind-try')];
    expect(ro.filter((p) => p!.startsWith('/app')).sort()).toEqual(['/app/kb', '/app/lib', '/app/marca', '/app/node_modules']);
    expect(ro).not.toContain('/app');
    expect(ro).not.toContain('/app/dist');
    expect(valoresDe(args, '--chdir')).toEqual(['/work/job-1']);
  });
});

describe('diagnóstico de isolamento', () => {
  type Resposta = { codigo: number; saida: string };
  const tipo = (a: string[]) => {
    const cmd = a.slice(a.lastIndexOf('--setenv') + 3);
    const s = cmd.join(' ');
    if (cmd[0] === 'true') return 'base';
    if (cmd[0] === 'curl') return 'rede';
    if (cmd[0] === 'ls') return 'app';
    if (s.includes('touch')) return 'fora';
    if (s.includes('teste.txt')) return 'dentro';
    if (s.includes('env')) return 'ambiente';
    return '?';
  };
  const isolado: Record<string, Resposta> = {
    base: { codigo: 0, saida: '' },
    rede: { codigo: 6, saida: 'Could not resolve host' },
    app: { codigo: 2, saida: 'No such file or directory' },
    fora: { codigo: 1, saida: 'Read-only file system' },
    dentro: { codigo: 0, saida: 'ok\n' },
    ambiente: { codigo: 0, saida: 'PATH=/usr/local/bin:/usr/bin:/bin\nHOME=/tmp\n' },
  };
  const com = (troca: Partial<Record<string, Resposta>>): Executar => async (_c, a) => ({ ...isolado, ...troca }[tipo(a)] ?? { codigo: 99, saida: '' });

  it('bwrap ausente → indisponível; bwrap sem permissão → falhou; nenhum aprova', async () => {
    expect(await diagnosticarIsolamento(async () => ({ codigo: -1, saida: 'spawn bwrap ENOENT' }))).toMatchObject({ bwrap: 'indisponivel', aprovado: false });
    const d = await diagnosticarIsolamento(com({ base: { codigo: 1, saida: "bwrap: Can't mount proc on /newroot/proc: Operation not permitted" } }));
    expect(d).toMatchObject({ bwrap: 'falhou', aprovado: false });
    expect(d.detalhe).toContain('Operation not permitted');
  });

  it('isolamento completo → aprovado', async () => {
    expect(await diagnosticarIsolamento(com({}))).toEqual({
      bwrap: 'ok', semRede: true, semSegredosNoAmbiente: true, semLeituraDoApp: true, semEscritaFora: true, workspaceGravavel: true, aprovado: true,
    });
  });

  it('qualquer fuga reprova: rede, chave no ambiente, leitura do servidor, escrita fora, workspace sem escrita', async () => {
    const fugas: Partial<Record<string, Resposta>>[] = [
      { rede: { codigo: 0, saida: '' } },
      { ambiente: { codigo: 0, saida: 'ANTHROPIC_API_KEY=sk-ant-x' } },
      { ambiente: { codigo: 0, saida: 'SUPABASE_SERVICE_ROLE_KEY=x' } },
      { app: { codigo: 0, saida: 'server.js' } },
      { fora: { codigo: 0, saida: '' } },
      { dentro: { codigo: 1, saida: 'Read-only file system' } },
    ];
    for (const f of fugas) expect((await diagnosticarIsolamento(com(f))).aprovado, JSON.stringify(f)).toBe(false);
  });

  it('o diagnóstico usa exatamente a configuração do executor', async () => {
    const vistos: string[][] = [];
    await diagnosticarIsolamento(async (_c, a) => { vistos.push(a); return isolado[tipo(a)]!; });
    for (const a of vistos) expect(a.slice(0, argsSandbox('/x').indexOf('--bind'))).toEqual(argsSandbox('/x').slice(0, argsSandbox('/x').indexOf('--bind')));
  });
});

const temBwrap = (() => {
  if (process.platform !== 'linux') return false;
  try {
    execFileSync('bwrap', ['--unshare-user', '--ro-bind', '/', '/', 'true'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!temBwrap)('sandbox real (bwrap disponível)', () => {
  const app = mkdtempSync(join(tmpdir(), 'app-'));
  for (const d of ['lib', 'dist']) mkdirSync(join(app, d));
  writeFileSync(join(app, 'dist', 'server.js'), 'segredo');
  const pastas: PastasServico = { app, leitura: ['lib'] };
  const ws = mkdtempSync(join(tmpdir(), 'ws-'));
  const rodar = (cmd: string) => executorBwrap(pastas)(cmd, { workspace: ws, timeoutMs: 20000 });

  it('sem rede, sem a chave do processo, sem /app/dist, sem escrita fora; workspace gravável', async () => {
    process.env.ANTHROPIC_API_KEY_TESTE = 'sk-ant-nao-pode-vazar';
    expect((await rodar('curl -sS -m 5 https://1.1.1.1 || python3 -c "import socket; socket.create_connection((\'1.1.1.1\', 443), 5)"')).codigo).not.toBe(0);
    expect((await rodar('env; cat /proc/1/environ')).saida).not.toContain('sk-ant-nao-pode-vazar');
    expect((await rodar(`cat ${app}/dist/server.js`)).codigo).not.toBe(0);
    expect((await rodar(`touch ${app}/lib/x`)).codigo).not.toBe(0);
    expect((await rodar('touch /etc/x')).codigo).not.toBe(0);
    expect((await rodar('echo ok > a.txt && cat a.txt')).saida.trim()).toBe('ok');
  });

  it('diagnóstico real aprova', async () => {
    expect((await diagnosticarIsolamento(undefined, process.env, pastas)).aprovado).toBe(true);
  });
});
