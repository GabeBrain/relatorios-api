import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SessaoFase, type ValidadorDeck } from '../src/agent/ferramentas.js';
import { pptxFicticio } from '../src/agent/simulado.js';
import type { Fase } from '../src/shared/state-machine.js';
import { EventosMemoria } from '../src/eventos.js';
import { RepoMemoria } from '../src/repo/memoria.js';
import { ArmazenamentoMemoria } from '../src/storage/armazenamento.js';
import { Workspace } from '../src/workspace.js';

async function sessao(fase: Fase, validadorDeck: ValidadorDeck = async () => null) {
  const repo = new RepoMemoria();
  const arm = new ArmazenamentoMemoria();
  const job = await repo.criarJob({ colaborador_email: 'd@brain.srv.br', titulo: 'Deck', contexto: null, token_acesso_hash: 'a'.repeat(64) });
  const ws = new Workspace(mkdtempSync(join(tmpdir(), 'sm-ferr-')), job.id, arm);
  await ws.restaurar();
  let terminou = 0;
  const s = new SessaoFase({ repo, arm, eventos: new EventosMemoria(), workspace: ws, validadorDeck }, job.id, fase, () => { terminou++; });
  return { s, repo, arm, ws, job, terminou: () => terminou };
}

const pergunta = (cabecalho = 'Responsável', opcoes = 2) => ({
  perguntas: [{ pergunta: 'Quem apresenta?', cabecalho, multipla: false, opcoes: Array.from({ length: opcoes }, (_, i) => ({ rotulo: `Opção ${i}`, descricao: '' })) }],
});

const entrega = (arquivo = 'saida/deck_v1.pptx', extra: Record<string, unknown> = {}) => ({
  arquivo, versao: 1, mudancas: [], qa: { falhas_bloqueantes: 0, alertas: [], notas_rubrica: {} }, ...extra,
});

describe('ferramentas brain (§5.1)', () => {
  it('só as ferramentas da fase ficam disponíveis', async () => {
    const { s } = await sessao('F1');
    expect((await s.chamar('entregar_deck', entrega())).ok).toBe(false);
    expect((await s.chamar('submeter_narrativa', {})).texto).toContain('não está disponível na fase F1');
    expect((await s.chamar('Bash', {})).ok).toBe(false);
  });

  it('perguntar_usuario: 1–4 perguntas, cabeçalho ≤ 12, 2–4 opções, uma rodada por fase', async () => {
    const { s, repo, job, terminou } = await sessao('F4');
    expect((await s.chamar('perguntar_usuario', pergunta('Cabeçalho longo'))).ok).toBe(false);
    expect((await s.chamar('perguntar_usuario', pergunta('Ok', 1))).ok).toBe(false);
    expect((await s.chamar('perguntar_usuario', pergunta('Ok', 5))).ok).toBe(false);
    expect((await s.chamar('perguntar_usuario', { perguntas: [] })).ok).toBe(false);
    expect((await s.chamar('perguntar_usuario', { ...pergunta(), extra: true })).ok).toBe(false);
    expect(terminou()).toBe(0);

    const r = await s.chamar('perguntar_usuario', pergunta());
    expect(r.ok).toBe(true);
    expect(s.terminal).toEqual({ evento: 'perguntas_feitas' });
    expect(terminou()).toBe(1);
    expect((await repo.listarMensagens(job.id)).map((m) => m.tipo)).toEqual(['perguntas']);
    // Depois da ferramenta terminal, nada mais é aceito
    expect((await s.chamar('perguntar_usuario', pergunta())).texto).toContain('já foi concluída');
  });

  it('submeter_narrativa exige o responsável e guarda a narrativa sem ele', async () => {
    const { s, repo, job } = await sessao('F2');
    const narrativa = { tese: 'Tese', resumo_diagnostico: 'a\nb', atualizacoes: [], slides: [{ n: 1, bloco: 'A', titulo: 'T', visual: 'v', minutos: 1 }], tempo_total_min: 15 };
    expect((await s.chamar('submeter_narrativa', narrativa)).ok).toBe(false);
    expect((await s.chamar('submeter_narrativa', { ...narrativa, resumo_diagnostico: '1\n2\n3\n4\n5\n6', responsavel: 'fabio' })).ok).toBe(false);
    expect((await s.chamar('submeter_narrativa', { ...narrativa, responsavel: 'fabio' })).ok).toBe(true);
    expect(s.terminal).toEqual({ evento: 'narrativa_submetida', responsavel: 'fabio' });
    const [m] = await repo.listarMensagens(job.id);
    expect(m!.conteudo.narrativa).not.toHaveProperty('responsavel');
  });

  it('entregar_deck recusa (e a fase continua) até o deck estar correto', async () => {
    let recusaDoValidador: string | null = 'Último slide não é o do responsável.';
    const { s, ws, arm, repo, job, terminou } = await sessao('F3', async () => recusaDoValidador);
    await ws.gravarLocal('saida/deck_v1.pptx', pptxFicticio());
    await ws.gravarLocal('saida/texto.pptx', 'não é zip');
    await ws.gravarLocal('trabalho/fora.pptx', pptxFicticio());

    expect((await s.chamar('entregar_deck', entrega())).texto).toContain('registrar_relatorio');
    expect((await s.chamar('registrar_relatorio', { markdown: '# Relatório' })).ok).toBe(true);

    const casos: [unknown, string][] = [
      [entrega('saida/deck_v1.pptx', { versao: 2 }), 'versão deve ser 1'],
      [entrega('saida/deck_v1.pptx', { qa: { falhas_bloqueantes: 1, alertas: [], notas_rubrica: {} } }), 'falhas 🔒'],
      [entrega('saida/deck_v1.pdf'), '.pptx'],
      [entrega('../../etc/passwd.pptx'), 'dentro do diretório'],
      [entrega('/etc/passwd.pptx'), 'dentro do diretório'],
      [entrega('trabalho/fora.pptx'), 'saida/'],
      [entrega('saida/nao-existe.pptx'), 'não encontrado'],
      [entrega('saida/texto.pptx'), 'PPTX válido'],
      [entrega('saida/deck_v1.pptx', { mudancas: ['a', 'b', 'c', 'd'] }), 'Entrada inválida'],
      [entrega(), 'Último slide'],
    ];
    for (const [entrada, trecho] of casos) {
      const r = await s.chamar('entregar_deck', entrada);
      expect(r.ok, trecho).toBe(false);
      expect(r.texto, trecho).toContain(trecho);
    }
    expect(terminou()).toBe(0);
    expect(arm.objetos.size).toBe(0);

    recusaDoValidador = null;
    const ok = await s.chamar('entregar_deck', entrega());
    expect(ok).toEqual({ ok: true, texto: 'Deck v1 registrado.' });
    expect(s.terminal).toEqual({ evento: 'deck_entregue', versao: 1 });
    expect(arm.objetos.has(`slide-maker-saida/${job.id}/v1/deck_v1.pptx`)).toBe(true);
    expect((await repo.listarVersoes(job.id))[0]).toMatchObject({ versao: 1, storage_path: `${job.id}/v1/deck_v1.pptx` });
    expect(repo.relatorios[0]).toMatchObject({ versao: 1, markdown: '# Relatório' });
  });

  it('informar_etapa "Revisando o visual" move produzindo → revisando', async () => {
    const { s, repo, job } = await sessao('F3');
    await repo.atualizarJob(job.id, 'rascunho', { estado: 'produzindo', fase_em_curso: 'F3' });
    expect((await s.chamar('informar_etapa', { etapa: 'Produzindo slides' })).ok).toBe(true);
    expect((await repo.obterJob(job.id))!.estado).toBe('produzindo');
    await s.chamar('informar_etapa', { etapa: 'Revisando o visual' });
    expect((await repo.obterJob(job.id))!.estado).toBe('revisando');
    expect((await s.chamar('informar_etapa', { etapa: 'Etapa inventada' })).ok).toBe(false);
    expect(s.terminal).toBeNull();
  });
});
