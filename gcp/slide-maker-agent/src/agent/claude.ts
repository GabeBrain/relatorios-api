import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createSdkMcpServer, query, tool, type HookCallback, type Options, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { Fase } from '../shared/state-machine.js';
import type { ExecutorComandos } from '../isolamento.js';
import { promptDaFase, promptFixo, REVISOR, systemPrompt, VERSAO_PROMPT, type Base } from '../prompt.js';
import type { Agente, ParametrosAgente, ResultadoAgente } from './agente.js';
import { ESQUEMAS, type NomeFerramenta } from './ferramentas.js';
import { avaliar } from './guarda.js';

/**
 * Agente real (§5): uma execução do Claude Agent SDK por fase.
 *
 * - `model: claude-opus-5-5`, `effort: medium`, `maxBudgetUsd` por fase (§11, §15.1 item 4);
 * - `settingSources: []` (não lê CLAUDE.md nem settings do repositório), `persistSession: false`;
 * - ferramentas embutidas restritas por fase; o `Bash` embutido fica de fora e é desviado
 *   (`toolAliases`) para `mcp__brain__executar`, que roda o comando no sandbox (isolamento.ts);
 * - `permissionMode: 'dontAsk'` + `allowedTools`: nada pede aprovação, o que não está liberado é negado;
 * - hook PreToolUse com a guarda de caminhos (guarda.ts) para as ferramentas de arquivo;
 * - `env` explícito (`ambienteDoAgente`): o processo do CLI recebe só a chave da Anthropic.
 */

export const MODELO = 'claude-opus-5-5';
export const ESFORCO = 'medium' as const;
/** §11: trava de segurança por fase, em US$. */
export const ORCAMENTO_USD: Record<Fase, number> = { F1: 2, F2: 6, F3: 10, F4: 5 };

const DESCRICOES: Record<NomeFerramenta, string> = {
  perguntar_usuario: 'Faz UMA rodada de perguntas ao colaborador (1 a 4 perguntas, cabeçalho de até 12 caracteres, 2 a 4 opções, uma recomendada). Encerra a fase.',
  concluir_intake: 'Encerra a fase 1 sem perguntas, quando o briefing já está completo. Resumo de 1 a 3 linhas.',
  submeter_narrativa: 'Envia a narrativa para aprovação do colaborador (tese, resumo do diagnóstico em até 5 linhas, atualizações, slides e responsável). Encerra a fase.',
  entregar_deck: 'Entrega o .pptx de saida/ como nova versão. Recusa se houver falha 🔒 no lint, se o relatório não foi registrado ou se o último slide não for o do responsável. Encerra a fase quando aceito.',
  registrar_relatorio: 'Grava saida/relatorio.md (relatório interno ao analista: antes→depois, decisões, atualizações com fonte, números derivados, pendências [PENDENTE], resultado do QA).',
  registrar_fonte: 'Registra um número usado no deck em trabalho/fontes.json (indicador, valor, fonte, período, URL, origem).',
  informar_etapa: 'Informa ao colaborador a etapa em andamento (aparece no cartão de progresso).',
};

const FERRAMENTAS_ARQUIVO: Record<Fase, string[]> = {
  F1: ['Read', 'Write', 'Glob', 'Grep'],
  F2: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
  F3: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent'],
  F4: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent'],
};
const FASES_COM_WEB: Fase[] = ['F2', 'F4'];

export interface DependenciasAgenteClaude {
  base: Base;
  /** Pastas somente leitura para as ferramentas de arquivo (kb, marca, lib na imagem). */
  leitura: string[];
  /** Executor dos comandos no sandbox; null quando o isolamento não foi aprovado. */
  executor: () => ExecutorComandos | null;
  consultar?: typeof query;
  hoje?: () => Date;
  timeoutComandoMs?: number;
  log?: (msg: string) => void;
}

/** `pode_pesquisar: true` no briefing.yaml do trabalho libera WebSearch/WebFetch nas fases 2 e 4. */
export async function podePesquisar(cwd: string): Promise<boolean> {
  try {
    const yaml = await readFile(join(cwd, 'briefing.yaml'), 'utf8');
    return /^\s*pode_pesquisar\s*:\s*(true|sim|yes)\s*(#.*)?$/im.test(yaml);
  } catch {
    return false;
  }
}

/** Tipo da lista de ferramentas aceita por createSdkMcpServer (definido pelo SDK). */
type FerramentasMcp = NonNullable<Parameters<typeof createSdkMcpServer>[0]['tools']>;

const texto = (t: string, erro = false) => ({ content: [{ type: 'text' as const, text: t }], ...(erro && { isError: true }) });

export class AgenteClaude implements Agente {
  private readonly consultar: typeof query;
  private readonly hoje: () => Date;
  private fixo: string | null = null;

  constructor(private readonly d: DependenciasAgenteClaude) {
    this.consultar = d.consultar ?? query;
    this.hoje = d.hoje ?? (() => new Date());
  }

  /** Ferramentas do MCP `brain` da fase: as da sessão (ferramentas.ts) e o `executar` no sandbox. */
  ferramentasMcp(p: ParametrosAgente, executor: ExecutorComandos, sinal: AbortSignal): FerramentasMcp {
    const brain = p.ferramentas.permitidas.map((nome) => tool(
      nome, DESCRICOES[nome], ESQUEMAS[nome].shape,
      async (args) => {
        const r = await p.ferramentas.chamar(nome, args);
        return texto(r.texto, !r.ok);
      },
    ));
    const executar = tool(
      'executar',
      'Executa um comando de shell (sh -c) no diretório do trabalho, num ambiente isolado sem internet, com python3, node, LibreOffice e /app/lib. Devolve o código de saída e a saída (truncada em 30 mil caracteres).',
      { comando: z.string().min(1).max(20_000), timeout_s: z.number().int().min(1).max(900).optional() },
      async ({ comando, timeout_s }) => {
        const r = await executor(comando, { workspace: p.cwd, timeoutMs: (timeout_s ?? 300) * 1000, sinal });
        const cab = r.tempoEsgotado ? `tempo esgotado (${timeout_s ?? 300} s)` : `código de saída ${r.codigo}`;
        return texto(`${cab}\n${r.saida}`, r.codigo !== 0);
      },
    );
    return [...brain, executar];
  }

  /** Opções do query() de uma fase; exposto para teste. */
  async opcoes(p: ParametrosAgente, abort: AbortController): Promise<{ prompt: string; options: Options }> {
    const executor = this.d.executor();
    if (!executor) throw new Error('isolamento_indisponivel');
    const web = FASES_COM_WEB.includes(p.fase) && (await podePesquisar(p.cwd));
    const servidor = createSdkMcpServer({ name: 'brain', version: '1.0.0', tools: this.ferramentasMcp(p, executor, abort.signal), alwaysLoad: true });

    const embutidas = [...FERRAMENTAS_ARQUIVO[p.fase], ...(web ? ['WebSearch', 'WebFetch'] : [])];
    const mcp = [...p.ferramentas.permitidas, 'executar'].map((n) => `mcp__brain__${n}`);
    const areas = { workspace: p.cwd, leitura: this.d.leitura };
    const guarda: HookCallback = async (entrada) => {
      if (entrada.hook_event_name !== 'PreToolUse') return {};
      const dec = await avaliar(entrada.tool_name, entrada.tool_input, areas);
      if (dec.permitir) return {};
      return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: dec.motivo } };
    };

    this.fixo ??= promptFixo(this.d.base);
    const options: Options = {
      model: MODELO,
      effort: ESFORCO,
      maxBudgetUsd: ORCAMENTO_USD[p.fase],
      cwd: p.cwd,
      additionalDirectories: this.d.leitura,
      settingSources: [],
      persistSession: false,
      systemPrompt: systemPrompt(this.d.base, p.job, p.fase, this.hoje(), this.fixo),
      tools: embutidas,
      // A CLI 0.3.322 lista a ferramenta de subagente como "Task" (verificado na mensagem init): liberar os dois nomes.
      allowedTools: [...embutidas, ...(embutidas.includes('Agent') ? ['Task'] : []), ...mcp],
      disallowedTools: ['Bash'],
      toolAliases: { Bash: 'mcp__brain__executar' },
      permissionMode: 'dontAsk',
      mcpServers: { brain: servidor },
      hooks: { PreToolUse: [{ hooks: [guarda], onFailure: 'block' }] },
      ...(FERRAMENTAS_ARQUIVO[p.fase].includes('Agent') && { agents: { revisor: REVISOR } }),
      env: { ...p.env, CLAUDE_AGENT_SDK_CLIENT_APP: 'brain-slide-maker/1.0' },
      abortController: abort,
    };
    return { prompt: promptDaFase(p.fase, p.job, web), options };
  }

  async executar(p: ParametrosAgente): Promise<ResultadoAgente> {
    const abort = new AbortController();
    const repassar = () => abort.abort(p.sinal.reason);
    if (p.sinal.aborted) return { tipo: 'erro', detalhe: 'abortado' };
    p.sinal.addEventListener('abort', repassar, { once: true });
    const inicio = Date.now();
    // Resultado já recebido prevalece: a CLI pode encerrar com exceção logo depois da mensagem de
    // resultado (visto com chave inválida na fumaça local).
    let fim: ResultadoAgente | null = null;
    try {
      let params: { prompt: string; options: Options };
      try {
        params = await this.opcoes(p, abort);
      } catch (e) {
        const detalhe = e instanceof Error ? e.message : 'configuracao';
        this.d.log?.(`agente job=${p.job.id} fase=${p.fase} nao_iniciado=${detalhe}`);
        return { tipo: 'erro', detalhe };
      }
      if (abort.signal.aborted) return { tipo: 'erro', detalhe: 'abortado' }; // cancelado enquanto preparava
      for await (const m of this.consultar(params) as AsyncIterable<SDKMessage>) {
        if (m.type !== 'result') continue;
        // Só identificadores e métricas no log; nunca conteúdo (§12). Custo fica fora da v1 (§11).
        this.d.log?.(`agente job=${p.job.id} fase=${p.fase} prompt=${VERSAO_PROMPT} resultado=${m.subtype} turnos=${m.num_turns} ms=${Date.now() - inicio}`);
        // Erro de API: o texto em `result` é a mensagem da API (chave, saldo, modelo, limite), não conteúdo do trabalho.
        if (m.subtype === 'success' && m.is_error) {
          const motivo = String(m.result ?? '').replace(/\s+/g, ' ').slice(0, 200);
          this.d.log?.(`agente job=${p.job.id} fase=${p.fase} erro_api status=${m.api_error_status ?? '?'} motivo=${JSON.stringify(motivo)}`);
        }
        if (m.subtype === 'success') fim = m.is_error ? { tipo: 'erro', detalhe: 'erro_api' } : { tipo: 'fim' };
        else if (m.subtype === 'error_max_budget_usd') fim = { tipo: 'orcamento_excedido' };
        else fim = { tipo: 'erro', detalhe: m.subtype };
      }
      return fim ?? { tipo: 'erro', detalhe: 'sem_resultado' };
    } catch (e) {
      if (fim) return fim;
      // Abort do orquestrador (ferramenta terminal, tempo ou cancelamento) chega como exceção: o
      // orquestrador decide pelo próprio estado, aqui só informamos.
      if (abort.signal.aborted) return { tipo: 'erro', detalhe: 'abortado' };
      this.d.log?.(`agente job=${p.job.id} fase=${p.fase} excecao=${e instanceof Error ? e.name : 'erro'}`);
      return { tipo: 'erro', detalhe: e instanceof Error ? e.name : 'erro' };
    } finally {
      p.sinal.removeEventListener('abort', repassar);
    }
  }
}
