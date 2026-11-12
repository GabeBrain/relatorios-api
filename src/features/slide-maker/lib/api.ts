/**
 * Fronteira com o serviço `slide-maker-agent` (INSTRUCOES §8). Sem relação com a API Geobrain:
 * o acesso a cada trabalho é o token devolvido uma única vez no `POST /jobs`, enviado em `x-job-token`.
 */
import type { DetalheTrabalho, ResumoTrabalho, Trabalho, TrabalhoCriado } from '../types';

export class ErroSlideMaker extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem);
    this.name = 'ErroSlideMaker';
  }
}

const MENSAGEM_REDE = 'Não foi possível falar com o Slide Maker. Verifique sua conexão e tente novamente.';
const MENSAGEM_NAO_CONFIGURADO = 'O Slide Maker ainda não está configurado neste ambiente.';

export function urlBase(): string | null {
  const url = (import.meta.env.VITE_SLIDE_MAKER_AGENT_URL as string | undefined)?.trim();
  return url ? url.replace(/\/+$/, '') : null;
}

interface Opcoes {
  metodo?: 'GET' | 'POST';
  token?: string;
  corpo?: unknown;
  /** Upload: o corpo vai como multipart e o navegador define o content-type. */
  formulario?: FormData;
  timeoutMs?: number;
}

async function chamar<T>(caminho: string, o: Opcoes = {}): Promise<T> {
  const base = urlBase();
  if (!base) throw new ErroSlideMaker(0, MENSAGEM_NAO_CONFIGURADO);
  const ctrl = new AbortController();
  const relogio = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 30_000);
  let r: Response;
  try {
    r = await fetch(`${base}${caminho}`, {
      method: o.metodo ?? (o.corpo !== undefined || o.formulario ? 'POST' : 'GET'),
      headers: {
        ...(o.token ? { 'x-job-token': o.token } : {}),
        ...(o.corpo !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: o.formulario ?? (o.corpo !== undefined ? JSON.stringify(o.corpo) : undefined),
      signal: ctrl.signal,
    });
  } catch {
    throw new ErroSlideMaker(0, MENSAGEM_REDE);
  } finally {
    clearTimeout(relogio);
  }
  const dados = await r.json().catch(() => null) as (T & { erro?: string }) | null;
  if (!r.ok) {
    // O serviço já devolve mensagens humanas em `erro`; sem ela, uma mensagem genérica por status.
    const padrao = r.status === 404 ? 'Trabalho não encontrado ou sem acesso neste navegador.'
      : r.status === 429 ? 'Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente de novo.'
      : 'Algo deu errado no Slide Maker. Tente novamente.';
    throw new ErroSlideMaker(r.status, dados?.erro || padrao);
  }
  return dados as T;
}

export const api = {
  criar: (dados: { colaborador_email: string; titulo: string; contexto?: string }) =>
    chamar<TrabalhoCriado>('/jobs', { corpo: dados }),

  enviarArquivos: (jobId: string, token: string, arquivos: File[]) => {
    const f = new FormData();
    for (const a of arquivos) f.append('arquivos', a, a.name);
    return chamar<{ trabalho: Trabalho }>(`/jobs/${jobId}/arquivos`, { token, formulario: f, timeoutMs: 5 * 60_000 });
  },

  detalhe: (jobId: string, token: string) => chamar<DetalheTrabalho>(`/jobs/${jobId}`, { token }),

  responder: (jobId: string, token: string, respostas: Record<string, string | string[]>) =>
    chamar<{ trabalho: Trabalho }>(`/jobs/${jobId}/respostas`, { token, corpo: { respostas } }),

  narrativa: (jobId: string, token: string, corpo: { acao: 'aprovar' } | { acao: 'ajustar'; texto: string }) =>
    chamar<{ trabalho: Trabalho }>(`/jobs/${jobId}/narrativa`, { token, corpo }),

  mensagem: (jobId: string, token: string, texto: string) =>
    chamar<{ trabalho: Trabalho }>(`/jobs/${jobId}/mensagens`, { token, corpo: { texto } }),

  retomar: (jobId: string, token: string) => chamar<{ trabalho: Trabalho }>(`/jobs/${jobId}/retomar`, { token, corpo: {} }),

  cancelar: (jobId: string, token: string) => chamar<{ trabalho: Trabalho }>(`/jobs/${jobId}/cancelar`, { token, corpo: {} }),

  download: (jobId: string, token: string, versao: number) =>
    chamar<{ url: string }>(`/jobs/${jobId}/versoes/${versao}/download`, { token }),

  meus: (itens: { jobId: string; token: string }[]) =>
    chamar<{ itens: ResumoTrabalho[] }>('/jobs/listar', { corpo: { itens } }),

  equipe: () => chamar<{ itens: ResumoTrabalho[] }>('/jobs/equipe'),
};
