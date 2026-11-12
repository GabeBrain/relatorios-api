import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
// Caminhos do sandbox são do contêiner Linux: posix.join, também quando os testes rodam no Windows.
import { join, posix } from 'node:path';

/**
 * Isolamento dos comandos do agente (§12, §15.1 item 7).
 *
 * O `Bash` embutido do CLI fica desligado; os comandos do agente passam pela ferramenta
 * `mcp__brain__executar`, que roda cada um sob bubblewrap com esta mesma configuração:
 *  · sem rede (`--unshare-net`): nem DNS nem IP direto;
 *  · ambiente limpo (`--clearenv`): nenhuma variável do serviço, em especial as chaves;
 *  · só o workspace do trabalho gravável; `lib/`, `kb/`, `marca/` e `node_modules/` do serviço
 *    somente leitura; o resto de `/app` (código compilado do servidor) fica invisível;
 *  · PID e usuário próprios, processo morre junto com o pai.
 *
 * O diagnóstico de subida roda comandos com exatamente essa configuração e só aprova se rede,
 * segredos, leitura de `/app/dist` e escrita fora do workspace estiverem bloqueados. Sem aprovação,
 * o agente real não executa nenhuma fase e o /healthz responde 503.
 */

export interface PastasServico {
  /** Raiz da aplicação na imagem (`/app`). */
  app: string;
  /** Somente leitura dentro do sandbox, relativos a `app`. */
  leitura: readonly string[];
}

export const PASTAS_PADRAO: PastasServico = { app: '/app', leitura: ['lib', 'kb', 'marca', 'node_modules'] };

/** Ambiente visível aos comandos: lista fechada, sem nada do processo do serviço. */
export const AMBIENTE_SANDBOX: Readonly<Record<string, string>> = {
  PATH: '/usr/local/bin:/usr/bin:/bin',
  HOME: '/tmp',
  TMPDIR: '/tmp',
  LANG: 'C.UTF-8',
  LC_ALL: 'C.UTF-8',
  PYTHONDONTWRITEBYTECODE: '1',
  BRAIN_MARCA: '/app/marca',
};

/** Argumentos do bwrap para executar um comando com `workspace` como único diretório gravável. */
export function argsSandbox(workspace: string, pastas: PastasServico = PASTAS_PADRAO): string[] {
  const args = [
    '--unshare-net', '--unshare-pid', '--unshare-user', '--unshare-ipc', '--unshare-uts',
    '--die-with-parent', '--new-session',
    '--ro-bind', '/usr', '/usr', '--ro-bind', '/etc', '/etc',
    '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/sbin', '/sbin',
    '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64',
    '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp',
  ];
  for (const p of pastas.leitura) args.push('--ro-bind-try', posix.join(pastas.app, p), posix.join(pastas.app, p));
  args.push('--bind', workspace, workspace, '--chdir', workspace, '--clearenv');
  for (const [k, v] of Object.entries(AMBIENTE_SANDBOX)) args.push('--setenv', k, v);
  return args;
}

export interface ResultadoComando {
  codigo: number;
  saida: string;
  /** true se o processo foi encerrado por tempo. */
  tempoEsgotado: boolean;
}

export type ExecutorComandos = (comando: string, o: { workspace: string; timeoutMs: number; sinal?: AbortSignal }) => Promise<ResultadoComando>;

const LIMITE_SAIDA = 30_000;

/** Executa `sh -c comando` no sandbox. A saída é truncada para não lotar o contexto do agente. */
export function executorBwrap(pastas: PastasServico = PASTAS_PADRAO, bwrap = 'bwrap'): ExecutorComandos {
  return (comando, o) => new Promise((resolve) => {
    const filho = spawn(bwrap, [...argsSandbox(o.workspace, pastas), 'sh', '-c', comando], {
      env: {}, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let saida = '';
    let truncada = false;
    const coletar = (b: Buffer) => {
      if (saida.length < LIMITE_SAIDA) saida += b.toString('utf8');
      else truncada = true;
    };
    filho.stdout.on('data', coletar);
    filho.stderr.on('data', coletar);
    let tempoEsgotado = false;
    const matar = () => filho.kill('SIGKILL');
    const relogio = setTimeout(() => { tempoEsgotado = true; matar(); }, o.timeoutMs);
    o.sinal?.addEventListener('abort', matar, { once: true });
    const fim = (codigo: number) => {
      clearTimeout(relogio);
      o.sinal?.removeEventListener('abort', matar);
      const texto = saida.length > LIMITE_SAIDA ? saida.slice(0, LIMITE_SAIDA) : saida;
      resolve({ codigo, saida: truncada || saida.length > LIMITE_SAIDA ? `${texto}\n[saída truncada]` : texto, tempoEsgotado });
    };
    filho.on('error', (e) => { saida += String(e.message); fim(-1); });
    filho.on('close', (codigo) => fim(codigo ?? -1));
  });
}

// ------------------------------------------------------------------ diagnóstico de subida

export type Executar = (cmd: string, args: string[], env: NodeJS.ProcessEnv) => Promise<{ codigo: number; saida: string }>;

const executarReal: Executar = (cmd, args, env) =>
  new Promise((resolve) => {
    execFile(cmd, args, { env, timeout: 30000 }, (erro, stdout, stderr) => {
      const codigo = erro ? (typeof erro.code === 'number' ? erro.code : -1) : 0;
      resolve({ codigo, saida: `${stdout}${stderr}`.slice(0, 2000) });
    });
  });

export interface Diagnostico {
  bwrap: 'ok' | 'indisponivel' | 'falhou';
  semRede: boolean | null;
  semSegredosNoAmbiente: boolean | null;
  semLeituraDoApp: boolean | null;
  semEscritaFora: boolean | null;
  workspaceGravavel: boolean | null;
  aprovado: boolean;
  detalhe?: string;
}

/**
 * Roda, sob a configuração de `argsSandbox`, comandos que tentam sair do isolamento. Passa o
 * ambiente do processo ao bwrap de propósito: o teste prova que o `--clearenv` o remove.
 */
export async function diagnosticarIsolamento(
  executar: Executar = executarReal,
  env: NodeJS.ProcessEnv = process.env,
  pastas: PastasServico = PASTAS_PADRAO,
): Promise<Diagnostico> {
  const ws = await mkdtemp(join(tmpdir(), 'diag-isolamento-'));
  const sandbox = (...cmd: string[]) => executar('bwrap', [...argsSandbox(ws, pastas), ...cmd], env);
  try {
    const base = await sandbox('true');
    if (base.codigo !== 0) {
      const indisponivel = /ENOENT|not found/i.test(base.saida) || (base.codigo === -1 && !base.saida);
      return {
        bwrap: indisponivel ? 'indisponivel' : 'falhou', semRede: null, semSegredosNoAmbiente: null,
        semLeituraDoApp: null, semEscritaFora: null, workspaceGravavel: null, aprovado: false, detalhe: base.saida.slice(0, 300),
      };
    }
    const rede = await sandbox('curl', '-sS', '-m', '5', '-o', '/dev/null', 'https://1.1.1.1');
    const ambiente = await sandbox('sh', '-c', 'env; cat /proc/1/environ 2>/dev/null | tr "\\0" "\\n"');
    const app = await sandbox('ls', posix.join(pastas.app, 'dist'));
    const fora = await sandbox('sh', '-c', `touch ${posix.join(pastas.app, pastas.leitura[0] ?? 'lib', 'x')} || touch /etc/x || touch /usr/x`);
    const dentro = await sandbox('sh', '-c', 'echo ok > teste.txt && cat teste.txt');
    const sensiveis = /ANTHROPIC|SUPABASE|GOOGLE|GCP|TOKEN|SECRET|KEY|PASSWORD/i;
    const r = {
      bwrap: 'ok' as const,
      semRede: rede.codigo !== 0,
      semSegredosNoAmbiente: ambiente.codigo === 0 && !sensiveis.test(ambiente.saida),
      semLeituraDoApp: app.codigo !== 0,
      semEscritaFora: fora.codigo !== 0,
      workspaceGravavel: dentro.codigo === 0 && dentro.saida.trim() === 'ok',
    };
    return { ...r, aprovado: Object.values(r).every((v) => v === true || v === 'ok') };
  } finally {
    await rm(ws, { recursive: true, force: true });
  }
}
