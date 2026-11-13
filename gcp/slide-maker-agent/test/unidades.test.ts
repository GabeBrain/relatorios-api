import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ambienteDoAgente } from '../src/agent/agente.js';
import { gerarToken, hashToken, tokenConfere } from '../src/auth/token.js';
import { lerConfig } from '../src/config.js';
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
      lerConfig({ SLIDE_MAKER_BRIDGE_URL: 'nao-e-url', SLIDE_MAKER_BRIDGE_SECRET: 'segredo-curto' });
      expect.unreachable();
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('SLIDE_MAKER_BRIDGE_URL');
      expect(msg).not.toContain('segredo-curto');
    }
  });

  it('com AGENTE=claude, chave com caractere de controle impede a subida sem expor o valor', () => {
    const base = {
      SLIDE_MAKER_BRIDGE_URL: 'https://x.supabase.co/functions/v1/slide-maker-bridge', SLIDE_MAKER_BRIDGE_SECRET: 'a'.repeat(43),
      GCP_PROJECT: 'p', TASKS_SERVICE_ACCOUNT: 'tasks@p.iam.gserviceaccount.com', SERVICE_URL: 'https://s.run.app', AGENTE: 'claude',
    };
    expect(() => lerConfig({ ...base, ANTHROPIC_API_KEY: 'sk-ant-api03-abc\u007fdef' })).toThrow(/ANTHROPIC_API_KEY/);
    expect(() => lerConfig({ ...base, ANTHROPIC_API_KEY: 'sk-ant-api03-abc\n' })).toThrow(/ANTHROPIC_API_KEY/);
    try { lerConfig({ ...base, ANTHROPIC_API_KEY: 'sk-ant-api03-SEGREDO\u007f' }); } catch (e) { expect((e as Error).message).not.toContain('SEGREDO'); }
    expect(lerConfig({ ...base, ANTHROPIC_API_KEY: 'sk-ant-api03-Abc_def-123' }).AGENTE).toBe('claude');
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
