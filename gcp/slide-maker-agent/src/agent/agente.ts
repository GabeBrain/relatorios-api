import type { Fase } from '../shared/state-machine.js';
import type { JobRow } from '../repo/tipos.js';
import type { NomeFerramenta, ResultadoFerramenta } from './ferramentas.js';

export interface FerramentasBrain {
  readonly permitidas: NomeFerramenta[];
  chamar(nome: string, entrada: unknown): Promise<ResultadoFerramenta>;
}

export interface ParametrosAgente {
  job: JobRow;
  fase: Fase;
  /** `/work/<jobId>`: o agente só lê e escreve aqui (§12). */
  cwd: string;
  /** Abortado pelo orquestrador ao concluir uma ferramenta terminal, no timeout ou no cancelamento. */
  sinal: AbortSignal;
  ferramentas: FerramentasBrain;
  /** Ambiente explícito dos comandos do agente; ver `ambienteDoAgente`. */
  env: Record<string, string>;
}

/** Como o agente terminou, independentemente de ter chamado uma ferramenta terminal. */
export type ResultadoAgente =
  | { tipo: 'fim' }
  | { tipo: 'orcamento_excedido' }
  | { tipo: 'erro'; detalhe: string };

/** Implementado pelo agente simulado (Fase 2) e pelo Agent SDK (Fase 4). */
export interface Agente {
  executar(p: ParametrosAgente): Promise<ResultadoAgente>;
}

/**
 * Ambiente dos comandos do agente (§12): lista fechada. Nada do ambiente do processo passa adiante,
 * em especial `SUPABASE_SERVICE_ROLE_KEY` e as credenciais do Google. A chave da Anthropic é a única
 * exceção, porque o CLI do SDK precisa dela; o isolamento dos comandos (Fase 4) impede que os
 * comandos a leiam.
 */
export function ambienteDoAgente(chaveAnthropic: string | undefined): Record<string, string> {
  const env: Record<string, string> = {
    PATH: '/usr/local/bin:/usr/bin:/bin',
    HOME: '/tmp',
    TMPDIR: '/tmp',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    PYTHONDONTWRITEBYTECODE: '1',
  };
  if (chaveAnthropic) env.ANTHROPIC_API_KEY = chaveAnthropic;
  return env;
}
