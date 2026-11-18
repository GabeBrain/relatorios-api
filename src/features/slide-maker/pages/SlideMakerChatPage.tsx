import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { Button } from '@/components/ui/button';
import { CardProgresso } from '../components/CardProgresso';
import { ChatThread } from '../components/ChatThread';
import { ComposerAjuste } from '../components/ComposerAjuste';
import { HistoricoVersoes } from '../components/HistoricoVersoes';
import { EstadoBadge } from '../components/ListaTrabalhos';
import { ProgressoEnvio } from '../components/ProgressoEnvio';
import { UploadDropzone } from '../components/UploadDropzone';
import { useAcoesTrabalho, useBaixarVersao, useJob, useJobEvents } from '../hooks/useSlideMaker';
import type { ProgressoEnvio as Progresso } from '../lib/api';
import { trabalhosLocais } from '../lib/armazenamento';
import { mensagensVisiveis, situacao, validarArquivos } from '../lib/chat';
import { RESPONSAVEL_ROTULO } from '../types';

function Moldura({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl p-4 sm:p-6">{children}</div>;
}

function Voltar() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link to="/slide-maker"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Apresentações</Link>
    </Button>
  );
}

/** Rota /slide-maker/:jobId (§9): o chat do trabalho, com cards, progresso e pedidos de ajuste. */
export default function SlideMakerChatPage() {
  const { jobId = '' } = useParams();
  const token = useMemo(() => trabalhosLocais.token(jobId), [jobId]);
  const job = useJob(jobId, token);
  const titulo = job.data?.trabalho.titulo ?? 'Apresentação';
  const acoes = useAcoesTrabalho(jobId, token, titulo);
  const baixar = useBaixarVersao(jobId, token, titulo);
  const [historico, setHistorico] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [progressoEnvio, setProgressoEnvio] = useState<Progresso | null>(null);
  const [inicioEnvio, setInicioEnvio] = useState<number | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  useJobEvents(jobId, !!token);

  const qtdMensagens = job.data?.mensagens.length ?? 0;
  useEffect(() => { fim.current?.scrollIntoView?.({ block: 'end' }); }, [qtdMensagens]);

  if (!token) {
    return (
      <Moldura>
        <Voltar />
        <div role="alert" className="mt-4 space-y-2 rounded-xl border border-border bg-card p-5 text-sm">
          <p className="font-medium">Esta apresentação não está disponível neste navegador.</p>
          <p className="text-muted-foreground">O acesso fica no navegador em que ela foi criada. Peça a quem criou, ou crie uma nova apresentação.</p>
        </div>
      </Moldura>
    );
  }
  if (job.isLoading) return <Moldura><BrainLoadingState variant="page" title="Carregando a conversa" /></Moldura>;
  if (job.isError || !job.data) {
    return (
      <Moldura>
        <Voltar />
        <div role="alert" className="mt-4 space-y-3 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-5 text-sm">
          <p>{job.error?.message ?? 'Não foi possível carregar a apresentação.'}</p>
          <Button variant="outline" size="sm" onClick={() => job.refetch()}>Tentar novamente</Button>
        </div>
      </Moldura>
    );
  }

  const { trabalho, versoes } = job.data;
  const s = situacao(job.data);
  const ultimaMsg = job.data.mensagens.at(-1);
  const idErroAtivo = trabalho.estado === 'erro' && ultimaMsg?.tipo === 'erro' ? ultimaMsg.id : null;
  const pendente = [acoes.responder, acoes.aprovarNarrativa, acoes.ajustarNarrativa, acoes.retomar, acoes.enviarArquivos].find((m) => m.isPending);
  const erroAcao = [acoes.responder, acoes.aprovarNarrativa, acoes.ajustarNarrativa, acoes.retomar].find((m) => m.isError)?.error?.message ?? null;
  const motivoComposer = s.emExecucao ? 'Aguarde o fim da etapa em andamento para pedir ajustes.'
    : trabalho.estado === 'cancelado' ? 'Esta apresentação foi encerrada.'
    : trabalho.estado === 'erro' ? 'Use "Tentar novamente" na mensagem de erro acima.'
    : 'Os ajustes por mensagem ficam disponíveis depois da entrega do deck.';

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto max-w-3xl space-y-1">
          <Voltar />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
            <EstadoBadge estado={trabalho.estado} />
            {trabalho.versao_atual > 0 && <span className="text-xs text-muted-foreground">v{trabalho.versao_atual}</span>}
          </div>
          {trabalho.responsavel && <p className="text-xs text-muted-foreground">Apresentação de {RESPONSAVEL_ROTULO[trabalho.responsavel]}</p>}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Moldura>
          <div className="space-y-4">
            <ChatThread
              mensagens={mensagensVisiveis(job.data.mensagens)}
              acoes={{
                idCardAtivo: s.idCardAtivo, versaoAtual: trabalho.versao_atual, idErroAtivo,
                enviando: !!pendente, erroAcao, baixando: baixar.isPending ? (baixar.variables ?? null) : null,
                onResponder: (r) => acoes.responder.mutate(r),
                onAprovar: () => acoes.aprovarNarrativa.mutate(),
                onAjustarNarrativa: (t) => acoes.ajustarNarrativa.mutate(t),
                onBaixar: (v) => baixar.mutate(v),
                onVersoesAnteriores: () => setHistorico(true),
                onRetomar: () => acoes.retomar.mutate(),
              }}
            />

            {trabalho.estado === 'rascunho' && (
              <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm" aria-label="Enviar arquivos">
                <p className="text-sm">Envie o material da apresentação para começar.</p>
                <UploadDropzone arquivos={arquivos} onChange={setArquivos} desabilitado={acoes.enviarArquivos.isPending} />
                {acoes.enviarArquivos.isPending && <ProgressoEnvio progresso={progressoEnvio} inicio={inicioEnvio} />}
                {acoes.enviarArquivos.isError && <p role="alert" className="text-sm text-destructive">{acoes.enviarArquivos.error.message}</p>}
                <Button
                  disabled={!arquivos.length || validarArquivos(arquivos).length > 0 || acoes.enviarArquivos.isPending}
                  onClick={() => {
                    setInicioEnvio(Date.now());
                    setProgressoEnvio(null);
                    acoes.enviarArquivos.mutate({ arquivos, aoProgredir: setProgressoEnvio }, { onSuccess: () => setArquivos([]) });
                  }}
                >
                  {acoes.enviarArquivos.isPending ? 'Enviando…' : 'Enviar arquivos'}
                </Button>
              </section>
            )}

            {s.emExecucao && (
              <CardProgresso
                etapa={s.etapa} inicio={s.inicioFase} temVersao={trabalho.versao_atual > 0}
                cancelando={acoes.cancelar.isPending} onCancelar={() => acoes.cancelar.mutate()}
              />
            )}
            {acoes.cancelar.isError && <p role="alert" className="text-sm text-destructive">{acoes.cancelar.error.message}</p>}
            {trabalho.estado === 'cancelado' && (
              <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">Esta apresentação foi cancelada.</p>
            )}
            {baixar.isError && <p role="alert" className="text-sm text-destructive">{baixar.error.message}</p>}
            <div ref={fim} />
          </div>
        </Moldura>
      </main>

      <div className="mx-auto w-full max-w-3xl">
        <ComposerAjuste
          habilitado={s.podeAjustar} motivo={motivoComposer} enviando={acoes.enviarMensagem.isPending}
          erro={acoes.enviarMensagem.isError ? acoes.enviarMensagem.error.message : null}
          onEnviar={(t) => acoes.enviarMensagem.mutate(t)}
        />
      </div>

      <HistoricoVersoes
        aberto={historico} onFechar={() => setHistorico(false)} versoes={versoes}
        baixando={baixar.isPending ? (baixar.variables ?? null) : null} onBaixar={(v) => baixar.mutate(v)}
      />
    </div>
  );
}
