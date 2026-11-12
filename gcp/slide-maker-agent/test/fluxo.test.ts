import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { roteiroPadrao } from '../src/agent/simulado.js';
import { BUCKETS } from '../src/storage/armazenamento.js';
import { PDF, RESPOSTAS, XLSX, montar } from './ajuda.js';

describe('fluxo completo com agente simulado (§13): F1 → F2 → ajuste → F3 → F4', () => {
  it('percorre upload, perguntas, narrativa, ajuste de narrativa, aprovação, entrega, download e ajuste com v2', async () => {
    const t = await montar();
    const vistos: Record<string, { narrativa: boolean; historico: string }> = {};
    t.trocarRoteiro(async (p) => {
      vistos[p.fase] = {
        narrativa: existsSync(join(p.cwd, 'trabalho/narrativa.md')),
        historico: readFileSync(join(p.cwd, 'trabalho/historico_chat.json'), 'utf8'),
      };
      expect(existsSync(join(p.cwd, 'entrada/estudo.pdf'))).toBe(true);
      return roteiroPadrao(p);
    });
    const { jobId, token } = await t.criar();

    // Upload → F1
    const up = await t.enviarArquivos(jobId, token, [{ nome: 'estudo.pdf', dados: PDF }, { nome: 'dados.xlsx', dados: XLSX }], 'Palestra no ADIT');
    expect(up.statusCode).toBe(202);
    expect(up.json().trabalho.estado).toBe('analisando');
    expect(t.arm.objetos.has(`${BUCKETS.entrada}/${jobId}/estudo.pdf`)).toBe(true);
    expect(await t.rodarFase()).toEqual({ resultado: 'concluida' });
    expect((await t.estado(jobId)).estado).toBe('aguardando_respostas');

    // Respostas incompletas são recusadas; completas → F2
    expect((await t.post(`/jobs/${jobId}/respostas`, token, { respostas: {} })).statusCode).toBe(400);
    expect((await t.post(`/jobs/${jobId}/respostas`, token, RESPOSTAS)).statusCode).toBe(202);
    await t.rodarFase();
    let job = await t.estado(jobId);
    expect(job.estado).toBe('aguardando_aprovacao');
    expect(job.responsavel).toBe('fabio');
    expect(vistos.F2!.historico).toContain('Fábio Tadeu Araújo');

    // Pedir ajuste na narrativa → F2 de novo, já com a narrativa anterior no workspace
    expect((await t.post(`/jobs/${jobId}/narrativa`, token, { acao: 'ajustar', texto: 'Tire o Japão' })).statusCode).toBe(202);
    await t.rodarFase();
    expect(vistos.F2!.narrativa).toBe(true);
    expect(vistos.F2!.historico).toContain('Tire o Japão');

    // Aprovar → F3 → entregue v1
    expect((await t.post(`/jobs/${jobId}/narrativa`, token, { acao: 'aprovar' })).statusCode).toBe(202);
    expect((await t.estado(jobId)).estado).toBe('produzindo');
    await t.rodarFase();
    job = await t.estado(jobId);
    expect(job).toMatchObject({ estado: 'entregue', versao_atual: 1, fase_em_curso: null });
    expect(t.repo.relatorios.map((r) => r.versao)).toEqual([1]);
    expect(t.eventos.emitidos.some((e) => e.evento.estado === 'revisando')).toBe(true);

    const dl = await t.get(`/jobs/${jobId}/versoes/1/download`, token);
    expect(dl.statusCode).toBe(200);
    expect(dl.json().url).toContain(`${BUCKETS.saida}/${jobId}/v1/Brain_simulado_v1.pptx`);
    expect(dl.json().url).toContain('expira=600');

    // Ajuste pelo chat → F4 → v2
    expect((await t.post(`/jobs/${jobId}/mensagens`, token, { texto: 'Troque o título do slide 4' })).statusCode).toBe(202);
    await t.rodarFase();
    job = await t.estado(jobId);
    expect(job).toMatchObject({ estado: 'entregue', versao_atual: 2 });

    const detalhe = (await t.get(`/jobs/${jobId}`, token)).json();
    expect(detalhe.versoes.map((v: { versao: number }) => v.versao)).toEqual([1, 2]);
    expect(detalhe.versoes[1].mudancas).toEqual(['Ajuste simulado']);
    const tipos = detalhe.mensagens.map((m: { tipo: string }) => m.tipo);
    for (const tipo of ['arquivos', 'perguntas', 'respostas', 'narrativa', 'aprovacao', 'progresso', 'entrega', 'texto']) expect(tipos).toContain(tipo);
    expect(detalhe).not.toHaveProperty('relatorio');
    expect(JSON.stringify(detalhe)).not.toContain('Relatório simulado');

    // Relatório ao analista por versão (§9, sem tela): tabela + Storage; fora do detalhe, dos arquivos e do download
    expect(t.repo.relatorios.map((r) => [r.versao, r.markdown])).toEqual([[1, '# Relatório simulado v1'], [2, '# Relatório simulado v2']]);
    for (const v of [1, 2]) expect(t.arm.objetos.has(`${BUCKETS.saida}/${jobId}/v${v}/relatorio.md`)).toBe(true);
    expect(JSON.stringify(detalhe)).not.toContain('relatorio.md');
    for (const v of [1, 2]) expect((await t.get(`/jobs/${jobId}/versoes/${v}/download`, token)).json().url).not.toContain('relatorio');

    // Nenhum workspace fica no disco depois das fases
    expect(existsSync(join(t.workRoot, jobId))).toBe(false);
    // E o workspace salvo no Storage não guarda a entrada (ela vem do bucket de entrada)
    expect([...t.arm.objetos.keys()].some((k) => k.startsWith(`${BUCKETS.trabalho}/${jobId}/entrada/`))).toBe(false);
  });

  it('F1 sem perguntas encadeia a F2 sem esperar o usuário', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar({ contexto: 'Tudo no briefing #sem-perguntas' });
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    await t.rodarFase();
    expect((await t.estado(jobId)).estado).toBe('pesquisando_e_narrando');
    expect(t.despachante.enfileiradas).toHaveLength(2);
    await t.rodarFase();
    expect((await t.estado(jobId)).estado).toBe('aguardando_aprovacao');
  });
});
