/**
 * Orquestração de dados do Slide Maker (§9): trabalhos, detalhe com atualização em tempo real e as
 * ações do chat. O conteúdo vem sempre do serviço com o token; o Realtime só avisa que algo mudou.
 */
import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activity-log';
import { api, type ProgressoEnvio } from '../lib/api';
import { identidade, trabalhosLocais } from '../lib/armazenamento';
import { emExecucao } from '../lib/state-machine';
import type { DetalheTrabalho, Trabalho } from '../types';

const chave = {
  meus: ['slide-maker', 'meus'] as const,
  equipe: ['slide-maker', 'equipe'] as const,
  trabalho: (jobId: string) => ['slide-maker', 'trabalho', jobId] as const,
};

/**
 * O App define staleTime de 5 min para todas as consultas; trabalhos mudam de estado a cada fase,
 * então as consultas do Slide Maker sempre buscam de novo ao montar a tela.
 */
const SEMPRE_ATUAL = { staleTime: 0 } as const;

/** Intervalo de consulta enquanto uma fase roda (o Realtime pode falhar sem aviso). */
export const INTERVALO_EXECUCAO_MS = 5000;

export function useIdentidade() {
  const [email, setEmail] = useState<string | null>(() => identidade.ler());
  const salvar = useCallback((e: string) => { identidade.salvar(e); setEmail(identidade.ler()); }, []);
  const trocar = useCallback(() => { identidade.limpar(); setEmail(null); }, []);
  return { email, salvar, trocar };
}

export function useMeusTrabalhos() {
  return useQuery({
    queryKey: chave.meus,
    ...SEMPRE_ATUAL,
    queryFn: async () => {
      const locais = trabalhosLocais.listar();
      if (!locais.length) return [];
      return (await api.meus(locais.map(({ jobId, token }) => ({ jobId, token })))).itens;
    },
  });
}

export function useTrabalhosEquipe(ativo: boolean) {
  return useQuery({ queryKey: chave.equipe, queryFn: async () => (await api.equipe()).itens, enabled: ativo, ...SEMPRE_ATUAL });
}

export function useJob(jobId: string, token: string | null) {
  return useQuery({
    queryKey: chave.trabalho(jobId),
    ...SEMPRE_ATUAL,
    queryFn: () => api.detalhe(jobId, token!),
    enabled: !!token,
    refetchInterval: (q) => (q.state.data && emExecucao(q.state.data.trabalho.estado) ? INTERVALO_EXECUCAO_MS : false),
    retry: (n, erro) => n < 2 && !(erro as { status?: number }).status?.toString().startsWith('4'),
  });
}

/** Broadcast `slide-maker:<jobId>` (evento `estado`): ao receber, busca o detalhe de novo. */
export function useJobEvents(jobId: string, ativo: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!ativo) return undefined;
    const canal = supabase
      .channel(`slide-maker:${jobId}`)
      .on('broadcast', { event: 'estado' }, () => { void qc.invalidateQueries({ queryKey: chave.trabalho(jobId) }); })
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [jobId, ativo, qc]);
}

/** Cria o trabalho, guarda o token neste navegador e envia os arquivos. */
export function useCriarTrabalho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: { email: string; titulo: string; contexto: string; arquivos: File[]; aoProgredir?: (p: ProgressoEnvio) => void }) => {
      const { jobId, token } = await api.criar({ colaborador_email: d.email, titulo: d.titulo, ...(d.contexto.trim() && { contexto: d.contexto.trim() }) });
      trabalhosLocais.adicionar({ jobId, token, titulo: d.titulo, criadoEm: new Date().toISOString() });
      logActivity('Slide Maker: nova apresentação', d.titulo);
      // Se o upload falhar, o trabalho já existe (rascunho) e o chat oferece reenviar os arquivos.
      await api.enviarArquivos(jobId, token, d.arquivos, d.aoProgredir).catch((e) => { throw Object.assign(e, { jobId }); });
      logActivity('Slide Maker: arquivos enviados', `${d.titulo} (${d.arquivos.length})`);
      return jobId;
    },
    onSettled: () => { void qc.invalidateQueries({ queryKey: chave.meus }); },
  });
}

interface Alvo { jobId: string; token: string | null; titulo: string }

/** Uma ação do chat: chama o serviço, aplica o trabalho devolvido e registra na activity_log. */
function useAcao<A>(alvo: Alvo, nome: string, fn: (token: string, a: A) => Promise<{ trabalho: Trabalho }>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: A) => fn(alvo.token!, a),
    onSuccess: (r) => {
      qc.setQueryData<DetalheTrabalho>(chave.trabalho(alvo.jobId), (d) => (d ? { ...d, trabalho: r.trabalho } : d));
      void qc.invalidateQueries({ queryKey: chave.trabalho(alvo.jobId) });
      logActivity(`Slide Maker: ${nome}`, alvo.titulo);
    },
  });
}

/** Ações do chat de um trabalho (§9: useEnviarArquivos, useResponder, useAprovarNarrativa, useAjustar…). */
export function useAcoesTrabalho(jobId: string, token: string | null, titulo: string) {
  const alvo = { jobId, token, titulo };
  return {
    enviarArquivos: useAcao<{ arquivos: File[]; aoProgredir?: (p: ProgressoEnvio) => void }>(alvo, 'arquivos enviados',
      (tk, e) => api.enviarArquivos(jobId, tk, e.arquivos, e.aoProgredir)),
    responder: useAcao<Record<string, string | string[]>>(alvo, 'respostas enviadas', (tk, r) => api.responder(jobId, tk, r)),
    aprovarNarrativa: useAcao<void>(alvo, 'narrativa aprovada', (tk) => api.narrativa(jobId, tk, { acao: 'aprovar' })),
    ajustarNarrativa: useAcao<string>(alvo, 'ajuste de narrativa', (tk, texto) => api.narrativa(jobId, tk, { acao: 'ajustar', texto })),
    enviarMensagem: useAcao<string>(alvo, 'mensagem', (tk, texto) => api.mensagem(jobId, tk, texto)),
    retomar: useAcao<void>(alvo, 'tentar novamente', (tk) => api.retomar(jobId, tk)),
    cancelar: useAcao<void>(alvo, 'cancelamento', (tk) => api.cancelar(jobId, tk)),
  };
}

/** Baixa o PPTX pela URL assinada (válida por 10 min), gerada na hora do clique. */
export function useBaixarVersao(jobId: string, token: string | null, titulo: string) {
  return useMutation({
    mutationFn: async (versao: number) => {
      const { url } = await api.download(jobId, token!, versao);
      logActivity('Slide Maker: download', `${titulo} v${versao}`);
      window.location.assign(url);
    },
  });
}
