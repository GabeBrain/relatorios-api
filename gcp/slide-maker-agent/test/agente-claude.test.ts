import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HookCallback, Options, query } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it, vi } from 'vitest';
import { ambienteDoAgente, type ParametrosAgente } from '../src/agent/agente.js';
import { AgenteClaude, MODELO, ORCAMENTO_USD, podePesquisar } from '../src/agent/claude.js';
import { FERRAMENTAS_POR_FASE } from '../src/agent/ferramentas.js';
import type { ExecutorComandos } from '../src/isolamento.js';
import type { JobRow } from '../src/repo/tipos.js';
import type { Fase } from '../src/shared/state-machine.js';

/** Agente real com o query() do SDK substituído: confere as opções enviadas e o tratamento do resultado. */

const base = {
  kbDir: fileURLToPath(new URL('../../../docs/features/apresentacoes/base-conhecimento/', import.meta.url)),
  libDir: fileURLToPath(new URL('../lib/', import.meta.url)),
};
const job: JobRow = {
  id: 'job-1', created_at: '', updated_at: '', titulo: 'Deck', contexto: null, colaborador_email: 'd@brain.srv.br', responsavel: 'fabio',
  estado: 'produzindo', fase_em_curso: 'F3', erro_fase: null, versao_atual: 0, token_acesso_hash: 'a'.repeat(64), erro: null, arquivos_expurgados_em: null,
};

type Msg = Record<string, unknown>;
function consultaFalsa(mensagens: Msg[] | ((o: Options) => AsyncGenerator<Msg>)) {
  const chamadas: { prompt: string; options: Options }[] = [];
  const fn = ((params: { prompt: string; options: Options }) => {
    chamadas.push(params);
    if (typeof mensagens === 'function') return mensagens(params.options);
    return (async function* () { for (const m of mensagens) yield m; })();
  }) as unknown as typeof query;
  return { fn, chamadas };
}

const resultado = (subtype: string, extra: Msg = {}) => ({ type: 'result', subtype, num_turns: 3, is_error: false, ...extra });

function montar(o: { fase?: Fase; mensagens?: Parameters<typeof consultaFalsa>[0]; executor?: ExecutorComandos | null; briefing?: string } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'agente-'));
  if (o.briefing) writeFileSync(join(cwd, 'briefing.yaml'), o.briefing);
  const chamar = vi.fn(async (nome: string) => (nome === 'entregar_deck' ? { ok: false, texto: 'Lint com 2 falhas' } : { ok: true, texto: 'Registrado.' }));
  const fase = o.fase ?? 'F3';
  const ctrl = new AbortController();
  const p: ParametrosAgente = {
    job, fase, cwd, sinal: ctrl.signal, env: ambienteDoAgente('sk-ant-teste'),
    ferramentas: { permitidas: FERRAMENTAS_POR_FASE[fase], chamar },
  };
  const executor: ExecutorComandos = vi.fn(async () => ({ codigo: 0, saida: 'ok', tempoEsgotado: false }));
  const consulta = consultaFalsa(o.mensagens ?? [resultado('success')]);
  const log: string[] = [];
  const agente = new AgenteClaude({
    base, leitura: ['/app/kb', '/app/marca', '/app/lib'],
    executor: () => (o.executor === undefined ? executor : o.executor),
    consultar: consulta.fn, hoje: () => new Date('2026-11-12T12:00:00Z'), log: (m) => log.push(m),
  });
  return { agente, p, ctrl, chamar, executor, consulta, log };
}

describe('opções do query() (§5, §11, §12)', () => {
  it('modelo, esforço, orçamento por fase, sem settings do repositório nem sessão persistida', async () => {
    for (const fase of ['F1', 'F2', 'F3', 'F4'] as Fase[]) {
      const t = montar({ fase });
      await t.agente.executar(t.p);
      const o = t.consulta.chamadas[0]!.options;
      expect(o).toMatchObject({ model: MODELO, effort: 'medium', maxBudgetUsd: ORCAMENTO_USD[fase], cwd: t.p.cwd, settingSources: [], persistSession: false, permissionMode: 'dontAsk' });
      expect(MODELO).toBe('claude-opus-5-5');
    }
    expect(ORCAMENTO_USD).toEqual({ F1: 2, F2: 6, F3: 10, F4: 5 });
  });

  it('sem Bash embutido: desviado para o executar no sandbox; ambiente só com a chave da Anthropic', async () => {
    const t = montar();
    await t.agente.executar(t.p);
    const o = t.consulta.chamadas[0]!.options;
    expect(o.tools).not.toContain('Bash');
    expect(o.disallowedTools).toEqual(['Bash']);
    expect(o.toolAliases).toEqual({ Bash: 'mcp__brain__executar' });
    expect(o.allowedTools).toContain('mcp__brain__executar');
    expect(o.allowedTools).not.toContain('Bash');
    expect(Object.keys(o.env!).sort()).toEqual([...Object.keys(ambienteDoAgente('x')), 'CLAUDE_AGENT_SDK_CLIENT_APP'].sort());
    expect(JSON.stringify(o.env)).not.toMatch(/SUPABASE|GOOGLE|GCP/);
  });

  it('ferramentas brain da fase liberadas; web só em F2/F4 e com pode_pesquisar; revisor só em F3/F4', async () => {
    const f1 = montar({ fase: 'F1' });
    await f1.agente.executar(f1.p);
    const o1 = f1.consulta.chamadas[0]!.options;
    expect(o1.allowedTools).toEqual(expect.arrayContaining(FERRAMENTAS_POR_FASE.F1.map((n) => `mcp__brain__${n}`)));
    expect(o1.allowedTools).not.toContain('mcp__brain__entregar_deck');
    expect(o1.tools).not.toContain('WebSearch');
    expect(o1.agents).toBeUndefined();

    const f2sem = montar({ fase: 'F2' });
    await f2sem.agente.executar(f2sem.p);
    expect(f2sem.consulta.chamadas[0]!.options.tools).not.toContain('WebSearch');
    expect(f2sem.consulta.chamadas[0]!.prompt).toContain('NÃO está liberada');

    const f2 = montar({ fase: 'F2', briefing: 'nome: x\npode_pesquisar: true   # atualizar\n' });
    await f2.agente.executar(f2.p);
    expect(f2.consulta.chamadas[0]!.options.tools).toEqual(expect.arrayContaining(['WebSearch', 'WebFetch']));

    const f3 = montar({ fase: 'F3', briefing: 'pode_pesquisar: true\n' });
    await f3.agente.executar(f3.p);
    expect(f3.consulta.chamadas[0]!.options.tools).not.toContain('WebSearch');
    expect(Object.keys(f3.consulta.chamadas[0]!.options.agents ?? {})).toEqual(['revisor']);
  });

  it('system prompt com marcador de cache; prompt da fase', async () => {
    const t = montar();
    await t.agente.executar(t.p);
    const { options, prompt } = t.consulta.chamadas[0]!;
    expect(Array.isArray(options.systemPrompt)).toBe(true);
    expect((options.systemPrompt as string[])[1]).toBe('__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__');
    expect(prompt).toContain('FASE 3');
  });

  it('hook PreToolUse nega leitura fora das pastas permitidas e escrita em entrada/', async () => {
    const t = montar();
    await t.agente.executar(t.p);
    const hook = t.consulta.chamadas[0]!.options.hooks!.PreToolUse![0]!.hooks[0] as HookCallback;
    const chamar = (tool_name: string, tool_input: unknown) =>
      hook({ hook_event_name: 'PreToolUse', tool_name, tool_input, tool_use_id: '1', session_id: 's', transcript_path: '', cwd: t.p.cwd }, '1', { signal: new AbortController().signal });
    expect(await chamar('Read', { file_path: '/proc/self/environ' })).toMatchObject({ hookSpecificOutput: { permissionDecision: 'deny' } });
    expect(await chamar('Write', { file_path: 'entrada/a.pdf', content: '' })).toMatchObject({ hookSpecificOutput: { permissionDecision: 'deny' } });
    expect(await chamar('Read', { file_path: 'trabalho/narrativa.md' })).toEqual({});
  });
});

describe('ferramentas MCP', () => {
  it('ferramentas brain repassam à sessão e marcam recusa como erro; executar roda no sandbox do trabalho', async () => {
    const t = montar();
    const defs = t.agente.ferramentasMcp(t.p, t.executor, t.ctrl.signal);
    expect(defs.map((d) => d.name).sort()).toEqual([...FERRAMENTAS_POR_FASE.F3, 'executar'].sort());
    const entregar = defs.find((d) => d.name === 'entregar_deck')!;
    const r = await entregar.handler({ arquivo: 'saida/x.pptx' }, {});
    expect(t.chamar).toHaveBeenCalledWith('entregar_deck', { arquivo: 'saida/x.pptx' });
    expect(r).toEqual({ content: [{ type: 'text', text: 'Lint com 2 falhas' }], isError: true });

    const executar = defs.find((d) => d.name === 'executar')!;
    const e = await executar.handler({ comando: 'python3 /app/lib/lint_pptx.py x.pptx' }, {});
    expect(t.executor).toHaveBeenCalledWith('python3 /app/lib/lint_pptx.py x.pptx', expect.objectContaining({ workspace: t.p.cwd, timeoutMs: 300_000 }));
    expect(e).toEqual({ content: [{ type: 'text', text: 'código de saída 0\nok' }] });
  });
});

describe('resultado do agente', () => {
  it('success → fim; orçamento → orcamento_excedido; erro de execução → erro', async () => {
    expect(await (montar().agente.executar(montar().p))).toEqual({ tipo: 'fim' });
    const b = montar({ mensagens: [resultado('error_max_budget_usd')] });
    expect(await b.agente.executar(b.p)).toEqual({ tipo: 'orcamento_excedido' });
    const e = montar({ mensagens: [resultado('error_during_execution')] });
    expect(await e.agente.executar(e.p)).toEqual({ tipo: 'erro', detalhe: 'error_during_execution' });
    const api = montar({ mensagens: [resultado('success', { is_error: true })] });
    expect(await api.agente.executar(api.p)).toEqual({ tipo: 'erro', detalhe: 'erro_api' });
  });

  it('abort do orquestrador no meio da execução é repassado ao SDK e não vira exceção', async () => {
    const t = montar({
      mensagens: (o) => (async function* () {
        yield { type: 'system', subtype: 'init' };
        await new Promise<void>((res) => o.abortController!.signal.addEventListener('abort', () => res()));
        throw new Error('AbortError');
      })(),
    });
    const exec = t.agente.executar(t.p);
    await vi.waitFor(() => expect(t.consulta.chamadas).toHaveLength(1));
    t.ctrl.abort('terminal');
    expect(await exec).toEqual({ tipo: 'erro', detalhe: 'abortado' });
  });

  it('exceção da CLI depois do resultado não apaga o resultado (visto com a CLI real)', async () => {
    const t = montar({
      mensagens: () => (async function* () {
        yield resultado('error_max_budget_usd');
        throw new Error('Claude Code process exited with code 1');
      })(),
    });
    expect(await t.agente.executar(t.p)).toEqual({ tipo: 'orcamento_excedido' });
  });

  it('subagente liberado pelos dois nomes (Agent e Task)', async () => {
    const t = montar({ fase: 'F4' });
    await t.agente.executar(t.p);
    expect(t.consulta.chamadas[0]!.options.allowedTools).toEqual(expect.arrayContaining(['Agent', 'Task']));
  });

  it('abortado enquanto prepara: o SDK nem é chamado', async () => {
    const t = montar();
    const exec = t.agente.executar(t.p);
    t.ctrl.abort('cancelada');
    expect(await exec).toEqual({ tipo: 'erro', detalhe: 'abortado' });
    expect(t.consulta.chamadas).toHaveLength(0);
  });

  it('sem isolamento aprovado, o modelo não é chamado', async () => {
    const t = montar({ executor: null });
    expect(await t.agente.executar(t.p)).toEqual({ tipo: 'erro', detalhe: 'isolamento_indisponivel' });
    expect(t.consulta.chamadas).toHaveLength(0);
    expect(t.log.join()).toContain('nao_iniciado=isolamento_indisponivel');
  });

  it('o log não traz conteúdo nem custo', async () => {
    const t = montar({ mensagens: [resultado('success', { total_cost_usd: 4.2, result: 'texto do deck' })] });
    await t.agente.executar(t.p);
    expect(t.log.join()).not.toMatch(/4\.2|texto do deck|cost/);
  });
});

describe('pode_pesquisar', () => {
  it('lê o briefing do trabalho; ausente ou false → não', async () => {
    const d = mkdtempSync(join(tmpdir(), 'pp-'));
    expect(await podePesquisar(d)).toBe(false);
    writeFileSync(join(d, 'briefing.yaml'), 'pode_pesquisar: false\n');
    expect(await podePesquisar(d)).toBe(false);
    writeFileSync(join(d, 'briefing.yaml'), 'modo: evento\npode_pesquisar: true          # * atualizar\n');
    expect(await podePesquisar(d)).toBe(true);
  });
});
