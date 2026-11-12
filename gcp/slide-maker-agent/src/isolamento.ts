import { execFile } from 'node:child_process';

/**
 * Diagnóstico de isolamento (§12, §15.1 item 7) — o "spike" da Fase 2.
 *
 * O sandbox do Agent SDK usa bubblewrap no Linux, e a documentação avisa que ele pode não subir num
 * contêiner sem privilégios. Antes de depender dele (Fase 4), o serviço testa no próprio Cloud Run se
 * um comando executado sob `bwrap` fica sem rede, sem as variáveis de ambiente do processo e sem
 * leitura de `/app`. Na Fase 2 o resultado só é exposto no /healthz; a partir da Fase 4 uma falha
 * derruba o health check e a revisão não recebe tráfego.
 */

export type Executar = (cmd: string, args: string[], env: NodeJS.ProcessEnv) => Promise<{ codigo: number; saida: string }>;

const executarReal: Executar = (cmd, args, env) =>
  new Promise((resolve) => {
    execFile(cmd, args, { env, timeout: 15000 }, (erro, stdout, stderr) => {
      const codigo = erro ? (typeof erro.code === 'number' ? erro.code : -1) : 0;
      resolve({ codigo, saida: `${stdout}${stderr}`.slice(0, 2000) });
    });
  });

/** Mesmo recorte de namespaces que o sandbox do SDK aplica: rede, PID e usuário próprios. */
const BWRAP_BASE = [
  '--unshare-net', '--unshare-pid', '--unshare-user', '--die-with-parent', '--new-session',
  '--ro-bind', '/usr', '/usr', '--ro-bind', '/etc', '/etc',
  '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64',
  '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp', '--clearenv', '--setenv', 'PATH', '/usr/bin:/bin',
];

export interface Diagnostico {
  bwrap: 'ok' | 'indisponivel' | 'falhou';
  semRede: boolean | null;
  semSegredosNoAmbiente: boolean | null;
  semLeituraDoApp: boolean | null;
  aprovado: boolean;
  detalhe?: string;
}

export async function diagnosticarIsolamento(executar: Executar = executarReal, env: NodeJS.ProcessEnv = process.env): Promise<Diagnostico> {
  const base = await executar('bwrap', [...BWRAP_BASE, 'true'], env);
  if (base.codigo !== 0) {
    const indisponivel = /ENOENT|not found/i.test(base.saida) || base.codigo === -1 && !base.saida;
    return { bwrap: indisponivel ? 'indisponivel' : 'falhou', semRede: null, semSegredosNoAmbiente: null, semLeituraDoApp: null, aprovado: false, detalhe: base.saida.slice(0, 300) };
  }
  // Sem rede: nem DNS nem conexão direta por IP devem funcionar.
  const rede = await executar('bwrap', [...BWRAP_BASE, 'curl', '-sS', '-m', '5', '-o', '/dev/null', 'https://1.1.1.1'], env);
  // Sem segredos: o ambiente visível ao comando não pode conter nenhuma variável sensível.
  const ambiente = await executar('bwrap', [...BWRAP_BASE, 'sh', '-c', 'env; cat /proc/1/environ 2>/dev/null | tr "\\0" "\\n"'], env);
  // Sem /app: o código e qualquer arquivo do serviço ficam fora do alcance.
  const app = await executar('bwrap', [...BWRAP_BASE, 'ls', '/app'], env);

  const sensiveis = /ANTHROPIC|SUPABASE|GOOGLE|GCP|TOKEN|SECRET|KEY/i;
  const r = {
    bwrap: 'ok' as const,
    semRede: rede.codigo !== 0,
    semSegredosNoAmbiente: ambiente.codigo === 0 && !sensiveis.test(ambiente.saida),
    semLeituraDoApp: app.codigo !== 0,
  };
  return { ...r, aprovado: r.semRede && r.semSegredosNoAmbiente && r.semLeituraDoApp };
}
