import type { SupabaseClient } from '@supabase/supabase-js';
import type { Estado } from '../shared/state-machine.js';
import {
  FaseAtivaExistente,
  type ArquivoRow, type FaseRow, type JobRow, type MensagemRow, type RelatorioRow, type Repo, type StatusFase, type VersaoRow,
} from './tipos.js';

const ATIVAS: StatusFase[] = ['enfileirada', 'executando'];

/** Erro de banco sem o conteúdo da linha (a §12 proíbe dados de cliente em log). */
function falha(operacao: string, erro: { code?: string; message?: string }): Error {
  return new Error(`Supabase: ${operacao} falhou (${erro.code ?? 'sem código'})`);
}

/** Repositório real, com a service role. Todo acesso às tabelas slide_maker_* passa por aqui. */
export class RepoSupabase implements Repo {
  constructor(private readonly db: SupabaseClient) {}

  async criarJob(d: { colaborador_email: string; titulo: string; contexto: string | null; token_acesso_hash: string }) {
    const { data, error } = await this.db.from('slide_maker_jobs').insert(d).select('*').single();
    if (error) throw falha('criar trabalho', error);
    return data as JobRow;
  }

  async obterJob(id: string) {
    const { data, error } = await this.db.from('slide_maker_jobs').select('*').eq('id', id).maybeSingle();
    if (error) throw falha('ler trabalho', error);
    return (data as JobRow | null) ?? null;
  }

  async obterJobs(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await this.db.from('slide_maker_jobs').select('*').in('id', ids);
    if (error) throw falha('ler trabalhos', error);
    return (data ?? []) as JobRow[];
  }

  async atualizarJob(id: string, esperado: Estado, patch: Partial<JobRow>) {
    const { data, error } = await this.db.from('slide_maker_jobs').update(patch).eq('id', id).eq('estado', esperado).select('*');
    if (error) throw falha('atualizar trabalho', error);
    return ((data ?? [])[0] as JobRow | undefined) ?? null;
  }

  async listarJobsEquipe(limite: number) {
    const { data, error } = await this.db.from('slide_maker_jobs').select('*')
      .neq('estado', 'cancelado').order('created_at', { ascending: false }).limit(limite);
    if (error) throw falha('listar trabalhos', error);
    return (data ?? []) as JobRow[];
  }

  async inserirMensagem(m: Omit<MensagemRow, 'id' | 'created_at'>) {
    const { data, error } = await this.db.from('slide_maker_mensagens').insert(m).select('*').single();
    if (error) throw falha('gravar mensagem', error);
    return data as MensagemRow;
  }

  async listarMensagens(jobId: string) {
    const { data, error } = await this.db.from('slide_maker_mensagens').select('*').eq('job_id', jobId)
      .order('created_at', { ascending: true });
    if (error) throw falha('ler mensagens', error);
    return (data ?? []) as MensagemRow[];
  }

  async inserirArquivo(a: Omit<ArquivoRow, 'id' | 'created_at'>) {
    const { data, error } = await this.db.from('slide_maker_arquivos').insert(a).select('*').single();
    if (error) throw falha('gravar arquivo', error);
    return data as ArquivoRow;
  }

  async listarArquivos(jobId: string) {
    const { data, error } = await this.db.from('slide_maker_arquivos').select('*').eq('job_id', jobId)
      .order('created_at', { ascending: true });
    if (error) throw falha('ler arquivos', error);
    return (data ?? []) as ArquivoRow[];
  }

  async inserirVersao(v: Omit<VersaoRow, 'id' | 'created_at'>) {
    const { data, error } = await this.db.from('slide_maker_versoes').insert(v).select('*').single();
    if (error) throw falha('gravar versão', error);
    return data as VersaoRow;
  }

  async listarVersoes(jobId: string) {
    const { data, error } = await this.db.from('slide_maker_versoes').select('*').eq('job_id', jobId)
      .order('versao', { ascending: true });
    if (error) throw falha('ler versões', error);
    return (data ?? []) as VersaoRow[];
  }

  async salvarRelatorio(r: Omit<RelatorioRow, 'created_at'>) {
    const { error } = await this.db.from('slide_maker_relatorios').upsert(r, { onConflict: 'job_id,versao' });
    if (error) throw falha('gravar relatório', error);
  }

  async criarFase(f: { job_id: string; fase: FaseRow['fase']; colaborador_email: string; ip: string | null }) {
    const { data, error } = await this.db.from('slide_maker_fases').insert(f).select('*').single();
    if (error?.code === '23505') throw new FaseAtivaExistente();
    if (error) throw falha('criar fase', error);
    return data as FaseRow;
  }

  async obterFase(id: string) {
    const { data, error } = await this.db.from('slide_maker_fases').select('*').eq('id', id).maybeSingle();
    if (error) throw falha('ler fase', error);
    return (data as FaseRow | null) ?? null;
  }

  async atualizarFase(id: string, esperados: StatusFase[], patch: Partial<FaseRow>) {
    const { data, error } = await this.db.from('slide_maker_fases').update(patch).eq('id', id).in('status', esperados).select('*');
    if (error) throw falha('atualizar fase', error);
    return ((data ?? [])[0] as FaseRow | undefined) ?? null;
  }

  async faseAtiva(jobId: string) {
    const { data, error } = await this.db.from('slide_maker_fases').select('*').eq('job_id', jobId).in('status', ATIVAS).maybeSingle();
    if (error) throw falha('ler fase ativa', error);
    return (data as FaseRow | null) ?? null;
  }

  async contarFasesDesde(filtro: { colaborador_email?: string; ip?: string }, desde: Date) {
    let q = this.db.from('slide_maker_fases').select('id', { count: 'exact', head: true }).gte('criada_em', desde.toISOString());
    if (filtro.colaborador_email !== undefined) q = q.eq('colaborador_email', filtro.colaborador_email);
    if (filtro.ip !== undefined) q = q.eq('ip', filtro.ip);
    const { count, error } = await q;
    if (error) throw falha('contar fases', error);
    return count ?? 0;
  }

  async contarFasesAtivasPorEmail(email: string) {
    const { count, error } = await this.db.from('slide_maker_fases').select('id', { count: 'exact', head: true })
      .eq('colaborador_email', email).in('status', ATIVAS);
    if (error) throw falha('contar fases ativas', error);
    return count ?? 0;
  }
}
