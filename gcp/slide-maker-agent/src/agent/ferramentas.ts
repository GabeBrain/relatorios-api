import { readFile, stat } from 'node:fs/promises';
import { basename, sep } from 'node:path';
import { z } from 'zod';
import { transicionar, type Fase } from '../shared/state-machine.js';
import type { Eventos } from '../eventos.js';
import type { JobRow, Repo, Responsavel } from '../repo/tipos.js';
import { BUCKETS, type Armazenamento } from '../storage/armazenamento.js';
import type { Workspace } from '../workspace.js';

/**
 * Ferramentas do MCP em processo `brain` (§5.1). Cada uma valida a entrada, grava no banco e, se for
 * terminal, encerra a fase. A Fase 4 embrulha `chamar()` com `tool()`/`createSdkMcpServer()` do SDK;
 * a lógica fica aqui para ser testada sem o modelo.
 *
 * Adições ao contrato da §5.1 (registradas na especificação):
 *  · `concluir_intake`  — F1 termina sem perguntas ("segue direto se nada faltar");
 *  · `informar_etapa`   — alimenta o CardProgresso e marca a entrada no QA (estado `revisando`);
 *  · `submeter_narrativa.responsavel` — o orquestrador precisa do responsável para conferir o slide final.
 */

export const ETAPAS = ['Lendo arquivos', 'Pesquisando dados', 'Montando a narrativa', 'Produzindo slides', 'Revisando o visual'] as const;
const RESPONSAVEIS = ['fabio', 'guilherme', 'finoti', 'outro'] as const;

const texto = (max: number) => z.string().trim().min(1).max(max);

export const ESQUEMAS = {
  perguntar_usuario: z.strictObject({
    perguntas: z.array(z.strictObject({
      pergunta: texto(500),
      cabecalho: texto(12),
      multipla: z.boolean(),
      opcoes: z.array(z.strictObject({
        rotulo: texto(100),
        descricao: z.string().trim().max(300),
        recomendada: z.boolean().optional(),
      })).min(2).max(4),
    })).min(1).max(4),
  }),
  concluir_intake: z.strictObject({ resumo: texto(1000) }),
  submeter_narrativa: z.strictObject({
    tese: texto(500),
    resumo_diagnostico: texto(1500).refine((s) => s.split('\n').length <= 5, 'resumo_diagnostico: no máximo 5 linhas'),
    atualizacoes: z.array(texto(400)).max(30),
    slides: z.array(z.strictObject({
      n: z.number().int().positive(),
      bloco: texto(120),
      titulo: texto(200),
      apoio: z.string().trim().max(300).optional(),
      visual: texto(200),
      fonte: z.string().trim().max(300).optional(),
      minutos: z.number().nonnegative().max(60),
    })).min(1).max(120),
    tempo_total_min: z.number().positive().max(600),
    responsavel: z.enum(RESPONSAVEIS),
  }),
  entregar_deck: z.strictObject({
    arquivo: texto(300),
    versao: z.number().int().positive(),
    mudancas: z.array(texto(200)).max(3),
    qa: z.strictObject({
      falhas_bloqueantes: z.number().int().nonnegative(),
      alertas: z.array(z.string().max(500)).max(100),
      notas_rubrica: z.record(z.string(), z.number().min(1).max(5)),
    }),
  }),
  registrar_relatorio: z.strictObject({ markdown: z.string().trim().min(1).max(200_000) }),
  registrar_fonte: z.strictObject({
    indicador: texto(300), valor: texto(200), fonte: texto(500), periodo: texto(100),
    url: z.string().trim().max(1000).optional(),
    origem: z.enum(['entrada', 'pesquisa']),
  }),
  informar_etapa: z.strictObject({ etapa: z.enum(ETAPAS) }),
} as const;

export type NomeFerramenta = keyof typeof ESQUEMAS;

/** Ferramentas liberadas por fase (§5). */
export const FERRAMENTAS_POR_FASE: Record<Fase, NomeFerramenta[]> = {
  F1: ['informar_etapa', 'perguntar_usuario', 'concluir_intake', 'registrar_fonte'],
  F2: ['informar_etapa', 'submeter_narrativa', 'registrar_fonte'],
  F3: ['informar_etapa', 'entregar_deck', 'registrar_relatorio', 'registrar_fonte'],
  F4: ['informar_etapa', 'entregar_deck', 'registrar_relatorio', 'registrar_fonte', 'perguntar_usuario', 'submeter_narrativa'],
};

export type Terminal =
  | { evento: 'perguntas_feitas' }
  | { evento: 'intake_concluido' }
  | { evento: 'narrativa_submetida'; responsavel: Responsavel }
  | { evento: 'deck_entregue'; versao: number };

export interface ResultadoFerramenta {
  ok: boolean;
  texto: string;
}

/**
 * Validação extra do deck antes de aceitar a entrega. A Fase 3/4 acrescenta aqui `python-pptx`,
 * `lint_pptx.py` (zero 🔒) e o hash do slide final do responsável. Devolve a mensagem de recusa ou null.
 */
export type ValidadorDeck = (arquivoAbsoluto: string, job: JobRow) => Promise<string | null>;

export const validadorBasico: ValidadorDeck = async () => null;

interface Dependencias {
  repo: Repo;
  arm: Armazenamento;
  eventos: Eventos;
  workspace: Workspace;
  validadorDeck: ValidadorDeck;
}

const ZIP = [0x50, 0x4b, 0x03, 0x04];

export class SessaoFase {
  terminal: Terminal | null = null;
  private perguntou = false;
  private relatorio: string | null = null;
  private readonly fontes: z.infer<typeof ESQUEMAS.registrar_fonte>[] = [];

  constructor(
    private readonly d: Dependencias,
    readonly jobId: string,
    readonly fase: Fase,
    /** Chamado quando uma ferramenta terminal conclui: o orquestrador aborta o `query()` (§5.1). */
    private readonly aoTerminar: () => void,
  ) {}

  get permitidas(): NomeFerramenta[] {
    return FERRAMENTAS_POR_FASE[this.fase];
  }

  async chamar(nome: string, entrada: unknown): Promise<ResultadoFerramenta> {
    if (!(nome in ESQUEMAS) || !this.permitidas.includes(nome as NomeFerramenta)) {
      return recusa(`A ferramenta ${nome} não está disponível na fase ${this.fase}.`);
    }
    if (this.terminal) return recusa('Esta etapa já foi concluída.');
    const nomeValido = nome as NomeFerramenta;
    const r = ESQUEMAS[nomeValido].safeParse(entrada);
    if (!r.success) return recusa(`Entrada inválida para ${nome}:\n${z.prettifyError(r.error)}`);
    switch (nomeValido) {
      case 'perguntar_usuario': return this.perguntar(r.data as z.infer<typeof ESQUEMAS.perguntar_usuario>);
      case 'concluir_intake': return this.concluir({ evento: 'intake_concluido' });
      case 'submeter_narrativa': return this.submeterNarrativa(r.data as z.infer<typeof ESQUEMAS.submeter_narrativa>);
      case 'entregar_deck': return this.entregarDeck(r.data as z.infer<typeof ESQUEMAS.entregar_deck>);
      case 'registrar_relatorio': return this.registrarRelatorio(r.data as z.infer<typeof ESQUEMAS.registrar_relatorio>);
      case 'registrar_fonte':
        this.fontes.push(r.data as z.infer<typeof ESQUEMAS.registrar_fonte>);
        return aceite('Fonte registrada.');
      case 'informar_etapa': return this.informarEtapa((r.data as z.infer<typeof ESQUEMAS.informar_etapa>).etapa);
    }
  }

  private concluir(t: Terminal, texto = 'Registrado.'): ResultadoFerramenta {
    this.terminal = t;
    this.aoTerminar();
    return aceite(texto);
  }

  private async perguntar(e: z.infer<typeof ESQUEMAS.perguntar_usuario>) {
    if (this.perguntou) return recusa('Só é permitida uma rodada de perguntas por etapa.');
    this.perguntou = true;
    await this.d.repo.inserirMensagem({ job_id: this.jobId, autor: 'agente', tipo: 'perguntas', conteudo: { perguntas: e.perguntas } });
    return this.concluir({ evento: 'perguntas_feitas' });
  }

  private async submeterNarrativa(e: z.infer<typeof ESQUEMAS.submeter_narrativa>) {
    const { responsavel, ...narrativa } = e;
    await this.d.repo.inserirMensagem({ job_id: this.jobId, autor: 'agente', tipo: 'narrativa', conteudo: { narrativa } });
    return this.concluir({ evento: 'narrativa_submetida', responsavel });
  }

  private async registrarRelatorio(e: z.infer<typeof ESQUEMAS.registrar_relatorio>) {
    this.relatorio = e.markdown;
    await this.d.workspace.gravarLocal('saida/relatorio.md', e.markdown);
    return aceite('Relatório registrado.');
  }

  private async informarEtapa(etapa: (typeof ETAPAS)[number]) {
    await this.d.repo.inserirMensagem({ job_id: this.jobId, autor: 'sistema', tipo: 'progresso', conteudo: { etapa, fase: this.fase } });
    let job = await this.d.repo.obterJob(this.jobId);
    if (job && etapa === 'Revisando o visual' && (job.estado === 'produzindo' || job.estado === 'ajustando')) {
      const { estado } = transicionar(job.estado, 'revisao_iniciada', { versaoAtual: job.versao_atual, erroFase: job.erro_fase });
      job = (await this.d.repo.atualizarJob(this.jobId, job.estado, { estado })) ?? job;
    }
    if (job) await this.d.eventos.emitir(this.jobId, { estado: job.estado, fase: this.fase, etapa, versao_atual: job.versao_atual });
    return aceite('Etapa informada.');
  }

  private async entregarDeck(e: z.infer<typeof ESQUEMAS.entregar_deck>) {
    const job = await this.d.repo.obterJob(this.jobId);
    if (!job) return recusa('Trabalho não encontrado.');
    if (e.versao !== job.versao_atual + 1) return recusa(`A versão deve ser ${job.versao_atual + 1}.`);
    if (e.qa.falhas_bloqueantes > 0) return recusa('O deck ainda tem falhas 🔒 no lint. Corrija antes de entregar.');
    if (!this.relatorio) return recusa('Chame registrar_relatorio antes de entregar_deck.');
    if (!e.arquivo.toLowerCase().endsWith('.pptx')) return recusa('O arquivo entregue deve ser .pptx.');

    let absoluto: string;
    try {
      absoluto = this.d.workspace.caminho(e.arquivo);
    } catch {
      return recusa('O arquivo precisa estar dentro do diretório do trabalho.');
    }
    if (!absoluto.startsWith(this.d.workspace.caminho('saida') + sep)) return recusa('Salve o deck em saida/.');
    const info = await stat(absoluto).catch(() => null);
    if (!info?.isFile()) return recusa(`Arquivo não encontrado: ${e.arquivo}`);
    const dados = await readFile(absoluto);
    if (!ZIP.every((b, i) => dados[i] === b)) return recusa('O arquivo não é um PPTX válido.');
    const recusaValidador = await this.d.validadorDeck(absoluto, job);
    if (recusaValidador) return recusa(recusaValidador);

    const caminho = `${this.jobId}/v${e.versao}/${basename(absoluto)}`;
    await this.d.arm.gravar(BUCKETS.saida, caminho, dados, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    await this.d.repo.inserirArquivo({ job_id: this.jobId, nome: basename(absoluto), mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', bytes: dados.length, storage_path: `${BUCKETS.saida}/${caminho}`, origem: 'saida' });
    await this.d.repo.inserirVersao({ job_id: this.jobId, versao: e.versao, storage_path: caminho, deck_spec: await lerJson(this.d.workspace.caminho('trabalho/deck_spec.json')), mudancas: e.mudancas, qa: e.qa });
    await this.d.repo.salvarRelatorio({ job_id: this.jobId, versao: e.versao, markdown: this.relatorio, fontes: this.fontes });
    await this.d.repo.inserirMensagem({ job_id: this.jobId, autor: 'agente', tipo: 'entrega', conteudo: { entrega: { versao: e.versao, mudancas: e.mudancas, qa: e.qa } } });
    return this.concluir({ evento: 'deck_entregue', versao: e.versao }, `Deck v${e.versao} registrado.`);
  }
}

async function lerJson(caminho: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(caminho, 'utf8'));
  } catch {
    return null;
  }
}

const aceite = (texto: string): ResultadoFerramenta => ({ ok: true, texto });
const recusa = (texto: string): ResultadoFerramenta => ({ ok: false, texto });
