import { describe, expect, it } from 'vitest';
import { hashToken } from '../src/auth/token.js';
import { LIMITES } from '../src/config.js';
import { PDF, XLSX, montar } from './ajuda.js';

describe('acesso por token do trabalho (§8)', () => {
  it('cria o trabalho só com e-mail @brain.srv.br e título; guarda só o hash do token', async () => {
    const t = await montar();
    for (const corpo of [
      { colaborador_email: 'x@gmail.com', titulo: 'Deck' },
      { colaborador_email: 'x@brain.srv.br.evil.com', titulo: 'Deck' },
      { colaborador_email: 'diego@brain.srv.br' },
      { colaborador_email: 'diego@brain.srv.br', titulo: 'ab' },
      { colaborador_email: 'diego@brain.srv.br', titulo: 'Deck', extra: 1 },
    ]) {
      expect((await t.app.inject({ method: 'POST', url: '/jobs', payload: corpo })).statusCode).toBe(400);
    }
    const { jobId, token } = await t.criar({ colaborador_email: '  Diego@Brain.srv.br ' });
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const job = await t.estado(jobId);
    expect(job.colaborador_email).toBe('diego@brain.srv.br');
    expect(job.token_acesso_hash).toBe(hashToken(token));
    expect(JSON.stringify(job)).not.toContain(token);
  });

  it('rotas do trabalho: 404 sem token, com token errado ou de outro trabalho; nunca expõem o hash', async () => {
    const t = await montar();
    const a = await t.criar();
    const b = await t.criar({ titulo: 'Outro deck' });
    expect((await t.get(`/jobs/${a.jobId}`)).statusCode).toBe(404);
    expect((await t.get(`/jobs/${a.jobId}`, 'errado')).statusCode).toBe(404);
    expect((await t.get(`/jobs/${a.jobId}`, b.token)).statusCode).toBe(404);
    expect((await t.get('/jobs/nao-e-uuid', a.token)).statusCode).toBe(400);
    const ok = await t.get(`/jobs/${a.jobId}`, a.token);
    expect(ok.statusCode).toBe(200);
    expect(ok.body).not.toContain('token_acesso_hash');
    for (const rota of ['arquivos', 'respostas', 'narrativa', 'mensagens', 'retomar', 'cancelar']) {
      expect((await t.post(`/jobs/${a.jobId}/${rota}`, b.token, {})).statusCode, rota).toBe(404);
    }
    expect((await t.get(`/jobs/${a.jobId}/versoes/1/download`, b.token)).statusCode).toBe(404);
  });

  it('"Todos os trabalhos" mostra só metadados, sem token (§15.1 item 3)', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar({ contexto: 'cliente confidencial' });
    await t.enviarArquivos(jobId, token, [{ nome: 'segredo.pdf', dados: PDF }]);
    const r = await t.get('/jobs/equipe');
    expect(r.statusCode).toBe(200);
    const [item] = r.json().itens;
    expect(Object.keys(item).sort()).toEqual(['colaborador_email', 'created_at', 'estado', 'id', 'responsavel', 'titulo', 'updated_at', 'versao_atual']);
    expect(item).toMatchObject({ id: jobId, titulo: 'Retrofit ADIT', estado: 'analisando' });
    expect(r.body).not.toContain('confidencial');
    expect(r.body).not.toContain('segredo.pdf');
  });

  it('"Meus trabalhos" (POST /jobs/listar) devolve só os pares jobId+token válidos', async () => {
    const t = await montar();
    const a = await t.criar();
    const b = await t.criar({ titulo: 'Segundo' });
    const r = await t.post('/jobs/listar', undefined, { itens: [a, { jobId: b.jobId, token: 'errado' }, { jobId: crypto.randomUUID(), token: 'x' }] });
    expect(r.json().itens.map((i: { id: string }) => i.id)).toEqual([a.jobId]);
    const muitos = Array.from({ length: LIMITES.itensListar + 1 }, () => a);
    expect((await t.post('/jobs/listar', undefined, { itens: muitos })).statusCode).toBe(400);
  });

  it('CORS só para *.lovable.app e localhost de desenvolvimento', async () => {
    const t = await montar();
    const pre = (origin: string) => t.app.inject({ method: 'OPTIONS', url: '/jobs', headers: { origin, 'access-control-request-method': 'POST' } });
    expect((await pre('https://geobrain-relatorios.lovable.app')).headers['access-control-allow-origin']).toBe('https://geobrain-relatorios.lovable.app');
    expect((await pre('http://localhost:8080')).headers['access-control-allow-origin']).toBe('http://localhost:8080');
    expect((await pre('https://evil.com')).headers['access-control-allow-origin']).toBeUndefined();
    expect((await pre('https://lovable.app.evil.com')).headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('limites de uso (§12)', () => {
  async function comHistorico(fases: number, filtro: { email?: string; ip?: string }) {
    const t = await montar();
    const outro = await t.criar({ colaborador_email: filtro.email ?? 'alguem@brain.srv.br' });
    for (let i = 0; i < fases; i++) {
      const f = await t.repo.criarFase({ job_id: outro.jobId, fase: 'F1', colaborador_email: filtro.email ?? 'alguem@brain.srv.br', ip: filtro.ip ?? null });
      await t.repo.atualizarFase(f.id, ['enfileirada'], { status: 'concluida' });
    }
    return t;
  }

  it(`${LIMITES.fasesPorHoraPorEmail} etapas por hora por e-mail`, async () => {
    const t = await comHistorico(LIMITES.fasesPorHoraPorEmail, { email: 'diego@brain.srv.br' });
    const { jobId, token } = await t.criar();
    const r = await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    expect(r.statusCode).toBe(429);
    expect((await t.estado(jobId)).estado).toBe('rascunho');
  });

  it(`${LIMITES.fasesPorHoraPorIp} etapas por hora por IP, mesmo com e-mails diferentes`, async () => {
    const t = await comHistorico(LIMITES.fasesPorHoraPorIp, { ip: '127.0.0.1' });
    const { jobId, token } = await t.criar({ colaborador_email: 'novo@brain.srv.br' });
    expect((await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }])).statusCode).toBe(429);
  });

  it(`${LIMITES.trabalhosSimultaneosPorEmail} trabalhos em processamento ao mesmo tempo por e-mail`, async () => {
    const t = await montar();
    for (let i = 0; i < LIMITES.trabalhosSimultaneosPorEmail; i++) {
      const j = await t.criar();
      expect((await t.enviarArquivos(j.jobId, j.token, [{ nome: 'a.pdf', dados: PDF }])).statusCode).toBe(202);
    }
    const quarto = await t.criar();
    expect((await t.enviarArquivos(quarto.jobId, quarto.token, [{ nome: 'a.pdf', dados: PDF }])).statusCode).toBe(429);
  });
});

describe('upload (§8)', () => {
  it('recusa extensão não aceita, conteúdo que não bate com a extensão e arquivo vazio', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    for (const arquivo of [
      { nome: 'virus.exe', dados: new Uint8Array([0x4d, 0x5a]) },
      { nome: 'falso.pdf', dados: XLSX },
      { nome: 'falso.xlsx', dados: PDF },
      { nome: 'vazio.pdf', dados: new Uint8Array() },
    ]) {
      const r = await t.enviarArquivos(jobId, token, [arquivo]);
      expect(r.statusCode, arquivo.nome).toBe(400);
    }
    expect((await t.estado(jobId)).estado).toBe('rascunho');
    expect(t.arm.objetos.size).toBe(0);
  });

  it(`recusa mais de ${LIMITES.maxArquivos} arquivos`, async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    const arquivos = Array.from({ length: LIMITES.maxArquivos + 1 }, (_, i) => ({ nome: `a${i}.pdf`, dados: PDF }));
    expect((await t.enviarArquivos(jobId, token, arquivos)).statusCode).toBe(413);
    expect((await t.estado(jobId)).estado).toBe('rascunho');
  });

  it('nomes perigosos viram nomes seguros e duplicados não se sobrescrevem', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    const r = await t.enviarArquivos(jobId, token, [
      { nome: '../../etc/Relatório Final.pdf', dados: PDF },
      { nome: 'Relatorio Final.pdf', dados: PDF },
    ]);
    expect(r.statusCode).toBe(202);
    const nomes = (await t.repo.listarArquivos(jobId)).map((a) => a.nome);
    expect(nomes).toEqual(['Relatorio Final.pdf', 'Relatorio Final (2).pdf']);
    expect([...t.arm.objetos.keys()].every((k) => k.startsWith(`slide-maker-entrada/${jobId}/`))).toBe(true);
  });
});
