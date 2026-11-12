import { useId, useRef, useState, type DragEvent } from 'react';
import { FileUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tamanhoLegivel, validarArquivos } from '../lib/chat';
import { EXTENSOES_ENTRADA, MAX_ARQUIVOS } from '../types';

interface Props {
  arquivos: File[];
  onChange: (arquivos: File[]) => void;
  desabilitado?: boolean;
}

/** Arrastar e soltar ou clicar; valida tipo, tamanho e quantidade antes de enviar (§9). */
export function UploadDropzone({ arquivos, onChange, desabilitado }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const problemas = validarArquivos(arquivos);

  const adicionar = (novos: FileList | null) => {
    if (!novos?.length) return;
    const nomes = new Set(arquivos.map((a) => a.name));
    onChange([...arquivos, ...Array.from(novos).filter((a) => !nomes.has(a.name))]);
  };
  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    if (!desabilitado) adicionar(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!desabilitado) setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/25 bg-primary/[0.03] px-4 py-8 text-center transition-colors',
          arrastando && 'border-primary bg-primary/[0.08]',
          desabilitado && 'opacity-60',
        )}
      >
        <FileUp className="h-7 w-7 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium">Arraste os arquivos para cá</p>
        <p className="text-xs text-muted-foreground">
          {EXTENSOES_ENTRADA.join(', ')} · até {MAX_ARQUIVOS} arquivos de 50 MB
        </p>
        <Button type="button" variant="outline" size="sm" disabled={desabilitado} onClick={() => input.current?.click()} aria-describedby={`${id}-tipos`}>
          Escolher arquivos
        </Button>
        <span id={`${id}-tipos`} className="sr-only">Tipos aceitos: {EXTENSOES_ENTRADA.join(', ')}</span>
        <input
          ref={input} type="file" multiple hidden accept={EXTENSOES_ENTRADA.join(',')}
          onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }}
          aria-label="Escolher arquivos"
        />
      </div>

      {arquivos.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border" aria-label="Arquivos selecionados">
          {arquivos.map((a) => {
            const problema = problemas.find((p) => p.nome === a.name);
            return (
              <li key={a.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <span className={cn('shrink-0 text-xs', problema ? 'text-destructive' : 'text-muted-foreground')}>
                  {problema ? problema.motivo : tamanhoLegivel(a.size)}
                </span>
                <Button
                  type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={desabilitado}
                  onClick={() => onChange(arquivos.filter((x) => x !== a))} aria-label={`Remover ${a.name}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {problemas.filter((p) => !p.nome).map((p) => <p key={p.motivo} className="text-sm text-destructive" role="alert">{p.motivo}</p>)}
    </div>
  );
}
