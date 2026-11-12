import { describe, expect, it } from 'vitest';
import { roteiroPadrao, type Roteiro } from '../src/agent/simulado.js';
import { MENSAGENS_ERRO } from '../src/orquestrador.js';
import { BUCKETS } from '../src/storage/armazenamento.js';
import { OIDC_VALIDO, PDF, RESPOSTAS, montar } from './ajuda.js';

/** Espera o abort do orquestrador, como o `query()` real faria ao ser abortado. */
const esperarAbort: Roteiro = (p) => new Promise((resolve) => {
  p.sinal.addEventListener('abort', () => resolve({ tipo: 'erro', detalhe: 'AbortError' }));
});

async function ateAprovado(t: Awaited<ReturnType<typeof montar>>) {
  const { jobId, token } = await t.criar();
  await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
  await t.rodarFase();
  await t.post(`/jobs/${jobId}/respostas`, token, RESPOSTAS);
  await t.rodarFase();
  await t.post(`/jobs/${jobId}/narrativa`, token, { acao: 'aprovar' });
  return { jobId, token };
}

describe('falhas, retomada e cancelamento', () => {
  it('agente que encerra sem ferramenta terminal → erro; workspace da fase não é salvo; retomar repete a fase', async () => {
    const t = await montar({
      roteiro: async ({ cwd }) => {
        const { writeFile } = await import('node:fs/promises');
        await writeFile(`${cwd}/trabalho/rascunho.md`, 'parcial');
        return { tipo: 'fim' };
      },
    });
    const { jobId, token } = await t.criar();
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    expect(await t.rodarFase()).toEqual({ resultado: 'erro' });

    const job = await t.estado(jobId);
    expect(job).toMatchObject({ estado: 'erro', erro_fase: 'F1', erro: MENSAGENS_ERRO.semEntrega, fase_em_curso: null });
    expect([...t.arm.objetos.keys()].some((k) => k.startsWith(`${BUCKETS.trabalho}/${jobId}/`))).toBe(false);
    expect([...t.repo.fases.values()][0]).toMatchObject({ status: 'erro', erro: 'sem_entrega' });

    t.trocarRoteiro(roteiroPadrao);
    const r = await t.post(`/jobs/${jobId}/retomar`, token);
    expect(r.statusCode).toBe(202);
    expect(r.json().trabalho).toMatchObject({ estado: 'analisando', erro: null, erro_fase: null });
    await t.rodarFase();
    expect((await t.estado(jobId)).estado).toBe('aguardando_respostas');
  });

  it('trava de orçamento (maxBudgetUsd) → mensagem da §11', async () => {
    const t = await montar({ roteiro: async () => ({ tipo: 'orcamento_excedido' }) });
    const { jobId, token } = await t.criar();
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    await t.rodarFase();
    expect((await t.estado(jobId)).erro).toBe(MENSAGENS_ERRO.orcamento);
    const msgs = await t.repo.listarMensagens(jobId);
    expect(msgs.at(-1)).toMatchObject({ autor: 'sistema', tipo: 'erro', conteudo: { mensagem: MENSAGENS_ERRO.orcamento, fase: 'F1' } });
  });

  it('corte por tempo (25 min em produção) aborta o agente e vai para erro', async () => {
    const t = await montar({ roteiro: esperarAbort, faseTimeoutMs: 50 });
    const { jobId, token } = await t.criar();
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    expect(await t.rodarFase()).toEqual({ resultado: 'erro' });
    expect((await t.estado(jobId))).toMatchObject({ estado: 'erro', erro: MENSAGENS_ERRO.tempo });
  });

  it('exceção depois de uma ferramenta terminal não é falha (abort do orquestrador, §5.1)', async () => {
    const t = await montar({
      roteiro: async (p) => {
        await roteiroPadrao(p);
        throw new Error('AbortError');
      },
    });
    const { jobId, token } = await t.criar();
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    expect(await t.rodarFase()).toEqual({ resultado: 'concluida' });
    expect((await t.estado(jobId)).estado).toBe('aguardando_respostas');
  });

  it('cancelar durante a fase aborta o agente e encerra o trabalho', async () => {
    const t = await montar({ roteiro: esperarAbort });
    const { jobId, token } = await t.criar();
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    const execucao = t.rodarFase();
    await new Promise((r) => setTimeout(r, 30));
    const c = await t.post(`/jobs/${jobId}/cancelar`, token);
    expect(c.statusCode).toBe(200);
    expect(await execucao).toEqual({ resultado: 'cancelada' });
    expect((await t.estado(jobId)).estado).toBe('cancelado');
    expect([...t.repo.fases.values()][0]!.status).toBe('cancelada');
    // Cancelado some de "Todos os trabalhos"
    expect((await t.get('/jobs/equipe')).json().itens).toHaveLength(0);
  });

  it('cancelar um ajuste (F4) volta à versão entregue', async () => {
    const t = await montar();
    const { jobId, token } = await ateAprovado(t);
    await t.rodarFase();
    expect((await t.estado(jobId)).versao_atual).toBe(1);

    t.trocarRoteiro(esperarAbort);
    await t.post(`/jobs/${jobId}/mensagens`, token, { texto: 'Mude a cor' });
    const execucao = t.rodarFase();
    await new Promise((r) => setTimeout(r, 30));
    await t.post(`/jobs/${jobId}/cancelar`, token);
    expect(await execucao).toEqual({ resultado: 'cancelada' });
    expect(await t.estado(jobId)).toMatchObject({ estado: 'entregue', versao_atual: 1 });
  });

  it('fase cancelada antes de começar é ignorada pelo Cloud Tasks', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    await t.post(`/jobs/${jobId}/cancelar`, token);
    expect(await t.rodarFase()).toEqual({ resultado: 'ignorada' });
  });

  it('fila indisponível → erro com "Tentar novamente", sem fase pendurada', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    t.despachante.falharProxima = true;
    const r = await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    expect(r.json().trabalho).toMatchObject({ estado: 'erro', erro: MENSAGENS_ERRO.fila, erro_fase: 'F1' });
    expect(await t.repo.faseAtiva(jobId)).toBeNull();
    expect((await t.post(`/jobs/${jobId}/retomar`, token)).json().trabalho.estado).toBe('analisando');
  });

  it('a mesma tarefa entregue duas vezes executa uma vez só', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    const faseId = t.despachante.enfileiradas[0];
    expect(await t.rodarFase(faseId)).toEqual({ resultado: 'concluida' });
    expect(await t.rodarFase(faseId)).toEqual({ resultado: 'ignorada' });
    expect((await t.repo.listarMensagens(jobId)).filter((m) => m.tipo === 'perguntas')).toHaveLength(1);
  });

  it('/internal/fase recusa chamada sem o token OIDC do Cloud Tasks', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    const faseId = t.despachante.enfileiradas[0];
    for (const authorization of [undefined, 'Bearer outro', OIDC_VALIDO.replace('Bearer ', '')]) {
      const r = await t.app.inject({ method: 'POST', url: '/internal/fase', headers: authorization ? { authorization } : {}, payload: { faseId } });
      expect(r.statusCode).toBe(403);
    }
    expect((await t.repo.obterFase(faseId!))!.status).toBe('enfileirada');
  });

  it('ações fora de hora são recusadas com 409', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    expect((await t.post(`/jobs/${jobId}/narrativa`, token, { acao: 'aprovar' })).statusCode).toBe(409);
    expect((await t.post(`/jobs/${jobId}/retomar`, token)).statusCode).toBe(409);
    expect((await t.post(`/jobs/${jobId}/respostas`, token, RESPOSTAS)).statusCode).toBe(409);
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    expect((await t.enviarArquivos(jobId, token, [{ nome: 'b.pdf', dados: PDF }])).statusCode).toBe(409);
    // Durante a fase, texto livre fica na fila do histórico, sem iniciar outra fase
    const m = await t.post(`/jobs/${jobId}/mensagens`, token, { texto: 'lembre do Japão' });
    expect(m.statusCode).toBe(200);
    expect(t.despachante.enfileiradas).toHaveLength(1);
  });
});
