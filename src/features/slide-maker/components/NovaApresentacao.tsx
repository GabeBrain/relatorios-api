import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCriarTrabalho } from '../hooks/useSlideMaker';
import { validarArquivos } from '../lib/chat';
import { UploadDropzone } from './UploadDropzone';

/** "Nova apresentação": nome, contexto opcional e arquivos; ao concluir, abre o chat do trabalho. */
export function NovaApresentacao({ email, onCancelar }: { email: string; onCancelar: () => void }) {
  const id = useId();
  const navigate = useNavigate();
  const criar = useCriarTrabalho();
  const [titulo, setTitulo] = useState('');
  const [contexto, setContexto] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [inicio, setInicio] = useState<number | null>(null);
  const valido = titulo.trim().length >= 3 && arquivos.length > 0 && validarArquivos(arquivos).length === 0;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!valido || criar.isPending) return;
    setInicio(Date.now());
    criar.mutate({ email, titulo: titulo.trim(), contexto, arquivos }, {
      onSuccess: (jobId) => navigate(`/slide-maker/${jobId}`),
      onError: (erro) => {
        // Trabalho criado mas upload falhou: o chat oferece reenviar.
        const jobId = (erro as { jobId?: string }).jobId;
        if (jobId) navigate(`/slide-maker/${jobId}`);
      },
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="text-lg font-semibold">Nova apresentação</h2>
      <div className="space-y-2">
        <Label htmlFor={`${id}-nome`}>Nome da apresentação</Label>
        <Input id={`${id}-nome`} value={titulo} maxLength={200} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Retrofit — ADIT Cidades 2026" />
        <p className="text-xs text-muted-foreground">Aparece em "Todos os trabalhos", para a equipe evitar trabalho duplicado.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-contexto`}>Contexto em uma frase <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea id={`${id}-contexto`} value={contexto} maxLength={500} rows={2} onChange={(e) => setContexto(e.target.value)} placeholder="Ex.: Palestra de 40 min do Fábio para incorporadores em Florianópolis" />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Arquivos</span>
        <UploadDropzone arquivos={arquivos} onChange={setArquivos} desabilitado={criar.isPending} />
      </div>
      {criar.isPending && <BrainLoadingState title="Enviando os arquivos" description="Criando o trabalho e enviando o material ao Slide Maker." startedAt={inicio} />}
      {criar.isError && !(criar.error as { jobId?: string }).jobId && (
        <p role="alert" className="text-sm text-destructive">{criar.error.message}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!valido || criar.isPending}>Criar e enviar</Button>
        <Button type="button" variant="ghost" onClick={onCancelar} disabled={criar.isPending}>Cancelar</Button>
      </div>
    </form>
  );
}
