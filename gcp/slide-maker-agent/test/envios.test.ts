import { describe, expect, it } from 'vitest';
import { LIMITES } from '../src/config.js';
import { PDF, XLSX, montar } from './ajuda.js';

const MB = 1024 * 1024;
const ENTRADA = 'slide-maker-entrada';

/** Simula o PUT do navegador na URL assinada (`memoria-envio://bucket/caminho`). */
async function gravarNaUrl(t: Awaited<ReturnType<typeof montar>>, url: string, dados: Uint8Array) {
  const [bucket, ...resto] = url.replace('memoria-envio://', '').split('/');
  await t.arm.gravar(bucket as typeof ENTRADA, resto.join('/'), dados);
}

describe('envio direto ao Storage (até 200 MB por arquivo, 500 MB por trabalho)', () => {
  it('URLs assinadas → gravação → concluir: registra os arquivos e inicia a F1', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    const r = await t.post(`/jobs/${jobId}/envios`, token, { arquivos: [{ nome: 'Estudo.pdf', bytes: 180 * MB }, { nome: 'base.xlsx', bytes: 2 * MB }] });
    expect(r.statusCode).toBe(200);
    const { envios } = r.json() as { envios: { nome: string; url: string }[] };
    expect(envios.map((e) => e.nome)).toEqual(['Estudo.pdf', 'base.xlsx']);
    await gravarNaUrl(t, envios[0]!.url, PDF);
    await gravarNaUrl(t, envios[1]!.url, XLSX);

    const c = await t.post(`/jobs/${jobId}/envios/concluir`, token, { nomes: ['Estudo.pdf', 'base.xlsx'], contexto: 'Para o Fábio' });
    expect(c.statusCode).toBe(202);
    expect((await t.estado(jobId)).estado).toBe('analisando');
    const arquivos = await t.repo.listarArquivos(jobId);
    expect(arquivos.map((a) => a.nome).sort()).toEqual(['Estudo.pdf', 'base.xlsx']);
    // Tamanho registrado é o do objeto gravado, não o declarado.
    expect(arquivos.find((a) => a.nome === 'Estudo.pdf')!.bytes).toBe(PDF.length);
  });

  it('recusa arquivo acima de 200 MB e soma acima de 500 MB antes de gerar URLs', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    const grande = await t.post(`/jobs/${jobId}/envios`, token, { arquivos: [{ nome: 'a.pdf', bytes: LIMITES.maxBytesArquivo + 1 }] });
    expect(grande.statusCode).toBe(400);
    expect(grande.json().erro).toContain('200 MB');
    const soma = await t.post(`/jobs/${jobId}/envios`, token, { arquivos: [1, 2, 3].map((i) => ({ nome: `a${i}.pdf`, bytes: 190 * MB })) });
    expect(soma.statusCode).toBe(400);
    expect(soma.json().erro).toContain('500 MB');
    const tipo = await t.post(`/jobs/${jobId}/envios`, token, { arquivos: [{ nome: 'x.exe', bytes: 10 }] });
    expect(tipo.statusCode).toBe(400);
  });

  it('concluir confere a assinatura binária do que chegou e apaga o arquivo falso', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    const { envios } = (await t.post(`/jobs/${jobId}/envios`, token, { arquivos: [{ nome: 'falso.xlsx', bytes: 9 }] })).json() as { envios: { url: string }[] };
    await gravarNaUrl(t, envios[0]!.url, PDF);
    const c = await t.post(`/jobs/${jobId}/envios/concluir`, token, { nomes: ['falso.xlsx'] });
    expect(c.statusCode).toBe(400);
    expect(await t.arm.listar(ENTRADA, jobId)).toEqual([]);
    expect((await t.estado(jobId)).estado).toBe('rascunho');
  });

  it('concluir recusa arquivo que não chegou e nome fora do padrão', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    expect((await t.post(`/jobs/${jobId}/envios/concluir`, token, { nomes: ['nunca.pdf'] })).statusCode).toBe(400);
    expect((await t.post(`/jobs/${jobId}/envios/concluir`, token, { nomes: ['../outro/a.pdf'] })).statusCode).toBe(400);
  });

  it('envio abandonado não entra na F1: o que não foi confirmado é removido', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    const { envios } = (await t.post(`/jobs/${jobId}/envios`, token, { arquivos: [{ nome: 'a.pdf', bytes: 9 }, { nome: 'b.pdf', bytes: 9 }] })).json() as { envios: { url: string }[] };
    await gravarNaUrl(t, envios[0]!.url, PDF);
    await gravarNaUrl(t, envios[1]!.url, PDF);
    expect((await t.post(`/jobs/${jobId}/envios/concluir`, token, { nomes: ['a.pdf'] })).statusCode).toBe(202);
    expect(await t.arm.listar(ENTRADA, jobId)).toEqual([`${jobId}/a.pdf`]);
  });

  it('exige o token do trabalho e só vale em rascunho', async () => {
    const t = await montar();
    const { jobId, token } = await t.criar();
    expect((await t.post(`/jobs/${jobId}/envios`, undefined, { arquivos: [{ nome: 'a.pdf', bytes: 9 }] })).statusCode).toBe(404);
    await t.enviarArquivos(jobId, token, [{ nome: 'a.pdf', dados: PDF }]);
    expect((await t.post(`/jobs/${jobId}/envios`, token, { arquivos: [{ nome: 'b.pdf', bytes: 9 }] })).statusCode).toBe(409);
    expect((await t.post(`/jobs/${jobId}/envios/concluir`, token, { nomes: ['a.pdf'] })).statusCode).toBe(409);
  });
});

describe('inspecionarPorUrl', () => {
  it('pede só o início (Range) e lê o total do Content-Range', async () => {
    const { inspecionarPorUrl } = await import('../src/storage/armazenamento.js');
    let range = '';
    const baixar = async (_url: string, init: RequestInit) => {
      range = String((init.headers as Record<string, string>).range);
      return new Response(PDF.slice(0, 5), { status: 206, headers: { 'content-range': `bytes 0-4/${200 * MB}` } });
    };
    const r = await inspecionarPorUrl(baixar, 'https://x/storage/v1/object/sign/a', 16);
    expect(range).toBe('bytes=0-15');
    expect(r.bytes).toBe(200 * MB);
    expect([...r.inicio]).toEqual([...PDF.slice(0, 5)]);
  });
});
