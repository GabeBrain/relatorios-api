import { useState } from 'react';
import { Plus, Presentation } from 'lucide-react';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IdentidadeEmail } from '../components/IdentidadeEmail';
import { ListaTrabalhos } from '../components/ListaTrabalhos';
import { NovaApresentacao } from '../components/NovaApresentacao';
import { useIdentidade, useMeusTrabalhos, useTrabalhosEquipe } from '../hooks/useSlideMaker';
import { urlBase } from '../lib/api';
import { trabalhosLocais } from '../lib/armazenamento';
import type { ResumoTrabalho } from '../types';

function Cabecalho({ email, onTrocar }: { email: string | null; onTrocar: () => void }) {
  return (
    <header className="border-b border-border bg-card px-5 py-4 shadow-sm sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rebrain · Apresentações</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Slide Maker</h1>
          <p className="text-sm text-muted-foreground">Envie o material, responda às perguntas, aprove a narrativa e receba o deck no padrão Brain.</p>
        </div>
        {email && (
          <p className="text-xs text-muted-foreground">
            {email} · <Button variant="link" className="h-auto p-0 text-xs" onClick={onTrocar}>Trocar</Button>
          </p>
        )}
      </div>
    </header>
  );
}

function Lista({ consulta, meus, vazio }: {
  consulta: { data?: ResumoTrabalho[]; isLoading: boolean; isError: boolean; error: Error | null; refetch: () => unknown };
  meus: Set<string>;
  vazio: string;
}) {
  if (consulta.isLoading) return <BrainLoadingState variant="page" title="Carregando apresentações" />;
  if (consulta.isError) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-5 text-sm">
        <p>{consulta.error?.message ?? 'Não foi possível carregar a lista.'}</p>
        <Button variant="outline" size="sm" onClick={() => consulta.refetch()}>Tentar novamente</Button>
      </div>
    );
  }
  if (!consulta.data?.length) {
    return (
      <section className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <Presentation className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-medium">Nenhuma apresentação ainda</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{vazio}</p>
      </section>
    );
  }
  return <ListaTrabalhos itens={consulta.data} meus={meus} />;
}

/** Rota /slide-maker (§9): identificação, nova apresentação, "Meus trabalhos" e "Todos os trabalhos". */
export default function SlideMakerPage() {
  const { email, salvar, trocar } = useIdentidade();
  const [criando, setCriando] = useState(false);
  const [aba, setAba] = useState<'meus' | 'todos'>('meus');
  const meus = useMeusTrabalhos();
  const equipe = useTrabalhosEquipe(aba === 'todos');
  const ids = new Set(trabalhosLocais.listar().map((t) => t.jobId));

  if (!urlBase()) {
    return (
      <div className="min-h-full bg-background">
        <Cabecalho email={null} onTrocar={trocar} />
        <div className="p-6">
          <div role="alert" className="max-w-xl rounded-xl border border-warning/30 bg-warning/[0.06] p-5 text-sm">
            O Slide Maker ainda não está disponível neste ambiente: o endereço do serviço não foi configurado.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <Cabecalho email={email} onTrocar={trocar} />
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {!email ? (
          <IdentidadeEmail onSalvar={salvar} />
        ) : criando ? (
          <NovaApresentacao email={email} onCancelar={() => setCriando(false)} />
        ) : (
          <Button onClick={() => setCriando(true)}><Plus className="h-4 w-4" aria-hidden="true" />Nova apresentação</Button>
        )}

        <Tabs value={aba} onValueChange={(v) => setAba(v as 'meus' | 'todos')}>
          <TabsList>
            <TabsTrigger value="meus">Meus trabalhos</TabsTrigger>
            <TabsTrigger value="todos">Todos os trabalhos</TabsTrigger>
          </TabsList>
          <TabsContent value="meus" className="mt-4">
            <Lista consulta={meus} meus={ids} vazio="As apresentações criadas neste navegador aparecem aqui. Use Nova apresentação para começar." />
          </TabsContent>
          <TabsContent value="todos" className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Apresentações da equipe, só com nome, autor e situação, para evitar trabalho duplicado. O conteúdo fica com quem criou.</p>
            <Lista consulta={equipe} meus={ids} vazio="Quando alguém da equipe criar uma apresentação, ela aparece aqui." />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
