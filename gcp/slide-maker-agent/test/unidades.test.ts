import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ambienteDoAgente } from '../src/agent/agente.js';
import { gerarToken, hashToken, tokenConfere } from '../src/auth/token.js';
import { lerConfig } from '../src/config.js';
import { diagnosticarIsolamento, type Executar } from '../src/isolamento.js';
import { desduplicar, nomeSeguro } from '../src/uploads.js';

describe('máquina de estados compartilhada', () => {
  it('a cópia do serviço é idêntica à do frontend (rode `npm run sync-shared` se divergir)', () => {
    const frontend = readFileSync(new URL('../../../src/features/slide-maker/lib/state-machine.ts', import.meta.url), 'utf8');
    const servico = readFileSync(new URL('../src/shared/state-machine.ts', import.meta.url), 'utf8');
    expect(servico.replace(/\r\n/g, '\n')).toBe(frontend.replace(/\r\n/g, '\n'));
  });
});

describe('token do trabalho', () => {
  it('32 bytes aleatórios; confere só com o próprio token', () => {
    const a = gerarToken();
    const b = gerarToken();
    expect(Buffer.from(a, 'base64url')).toHaveLength(32);
    expect(a).not.toBe(b);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenConfere(a, hashToken(a))).toBe(true);
    expect(tokenConfere(b, hashToken(a))).toBe(false);
    expect(tokenConfere(undefined, hashToken(a))).toBe(false);
    expect(tokenConfere('x'.repeat(200), hashToken(a))).toBe(false);
  });
});

describe('ambiente dos comandos do agente (§12)', () => {
  it('lista fechada: só a chave da Anthropic passa, nunca a do Supabase nem credenciais do Google', () => {
    const env = ambienteDoAgente('sk-ant-x');
    expect(Object.keys(env).sort()).toEqual(['ANTHROPIC_API_KEY', 'HOME', 'LANG', 'LC_ALL', 'PATH', 'PYTHONDONTWRITEBYTECODE', 'TMPDIR']);
    expect(JSON.stringify(env)).not.toMatch(/SUPABASE|GOOGLE|GCP/);
    expect(ambienteDoAgente(undefined)).not.toHaveProperty('ANTHROPIC_API_KEY');
  });
});

describe('configuração', () => {
  it('erro de configuração cita os nomes das variáveis, nunca os valores', () => {
    try {
      lerConfig({ SUPABASE_URL: 'nao-e-url', SUPABASE_SERVICE_ROLE_KEY: 'segredo-curto' });
      expect.unreachable();
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('SUPABASE_URL');
      expect(msg).not.toContain('segredo-curto');
    }
  });
});

describe('nomes de arquivo', () => {
  it('remove caminho, acentos e caracteres de controle', () => {
    expect(nomeSeguro('../../etc/passwd')).toBe('passwd');
    expect(nomeSeguro('C:\\Users\\x\\Relatório Final.pdf')).toBe('Relatorio Final.pdf');
    expect(nomeSeguro('.\u0000oculto.pdf')).toBe('_oculto.pdf');
    expect(nomeSeguro('')).toBe('arquivo');
    expect(desduplicar(['a.pdf', 'A.pdf', 'a.pdf'])).toEqual(['a.pdf', 'A (2).pdf', 'a (3).pdf']);
  });
});

describe('diagnóstico de isolamento (spike do Cloud Run, §15.1 item 7)', () => {
  const comandos = (resp: (args: string[]) => { codigo: number; saida: string }): Executar => async (_cmd, args) => resp(args);

  it('bwrap ausente → indisponível, não aprovado', async () => {
    const d = await diagnosticarIsolamento(async () => ({ codigo: -1, saida: 'spawn bwrap ENOENT' }));
    expect(d).toMatchObject({ bwrap: 'indisponivel', aprovado: false });
  });

  it('bwrap sem permissão no contêiner → falhou', async () => {
    const d = await diagnosticarIsolamento(comandos(() => ({ codigo: 1, saida: 'bwrap: Can\'t mount proc on /newroot/proc: Operation not permitted' })));
    expect(d).toMatchObject({ bwrap: 'falhou', aprovado: false });
    expect(d.detalhe).toContain('Operation not permitted');
  });

  it('isolamento completo → aprovado', async () => {
    const d = await diagnosticarIsolamento(comandos((a) => {
      if (a.includes('curl')) return { codigo: 6, saida: 'Could not resolve host' };
      if (a.includes('ls')) return { codigo: 2, saida: 'No such file or directory' };
      if (a.includes('sh')) return { codigo: 0, saida: 'PATH=/usr/bin:/bin\n' };
      return { codigo: 0, saida: '' };
    }));
    expect(d).toEqual({ bwrap: 'ok', semRede: true, semSegredosNoAmbiente: true, semLeituraDoApp: true, aprovado: true });
  });

  it('qualquer vazamento reprova: rede, chave no ambiente ou leitura de /app', async () => {
    const base = (a: string[]) => a.includes('curl') ? { codigo: 6, saida: '' } : a.includes('ls') ? { codigo: 2, saida: '' } : { codigo: 0, saida: 'PATH=/bin' };
    const vazamentos: ((a: string[]) => { codigo: number; saida: string } | null)[] = [
      (a) => a.includes('curl') ? { codigo: 0, saida: '' } : null,
      (a) => a.includes('sh') ? { codigo: 0, saida: 'ANTHROPIC_API_KEY=sk-ant' } : null,
      (a) => a.includes('sh') ? { codigo: 0, saida: 'SUPABASE_SERVICE_ROLE_KEY=x' } : null,
      (a) => a.includes('ls') ? { codigo: 0, saida: 'dist\nnode_modules' } : null,
    ];
    for (const vaza of vazamentos) {
      const d = await diagnosticarIsolamento(comandos((a) => vaza(a) ?? base(a)));
      expect(d.aprovado).toBe(false);
    }
  });
});
