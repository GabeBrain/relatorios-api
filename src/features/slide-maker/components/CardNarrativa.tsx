import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { Narrativa } from '../types';

interface Props {
  narrativa: Narrativa;
  ativo: boolean;
  enviando?: boolean;
  erro?: string | null;
  onAprovar: () => void;
  onAjustar: (texto: string) => void;
}

/** Narrativa para aprovação (§9): tese em destaque, tabela compacta, atualizações, aprovar ou pedir ajuste. */
export function CardNarrativa({ narrativa, ativo, enviando, erro, onAprovar, onAjustar }: Props) {
  const id = useId();
  const [ajustando, setAjustando] = useState(false);
  const [texto, setTexto] = useState('');

  return (
    <section className="space-y-4 rounded-xl border border-primary/20 bg-card p-5 shadow-sm" aria-label="Narrativa proposta">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Narrativa proposta</p>
        <p className="text-lg font-semibold leading-snug">{narrativa.tese}</p>
      </div>
      {narrativa.resumo_diagnostico && <p className="whitespace-pre-line text-sm text-muted-foreground">{narrativa.resumo_diagnostico}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Nº</TableHead>
              <TableHead>Bloco</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Visual</TableHead>
              <TableHead className="w-14 text-right">Min</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {narrativa.slides.map((s) => (
              <TableRow key={s.n}>
                <TableCell className="tabular-nums">{s.n}</TableCell>
                <TableCell className="text-muted-foreground">{s.bloco}</TableCell>
                <TableCell className="font-medium">{s.titulo}</TableCell>
                <TableCell className="text-muted-foreground">{s.visual}</TableCell>
                <TableCell className="text-right tabular-nums">{s.minutos.toLocaleString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {narrativa.slides.length} slides · cerca de {narrativa.tempo_total_min.toLocaleString('pt-BR')} min de fala
      </p>

      {narrativa.atualizacoes.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium">O que foi atualizado</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            {narrativa.atualizacoes.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      )}

      {ativo && (
        <div className="space-y-3 border-t border-border pt-4">
          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
          {ajustando ? (
            <div className="space-y-2">
              <Label htmlFor={id}>O que precisa mudar na narrativa?</Label>
              <Textarea id={id} rows={3} maxLength={4000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: tire a comparação com o Japão e inclua um bloco sobre Florianópolis" disabled={enviando} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onAjustar(texto.trim())} disabled={!texto.trim() || enviando}>{enviando ? 'Enviando…' : 'Enviar ajuste'}</Button>
                <Button variant="ghost" onClick={() => setAjustando(false)} disabled={enviando}>Voltar</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={onAprovar} disabled={enviando}>{enviando ? 'Enviando…' : 'Aprovar e produzir'}</Button>
              <Button variant="outline" onClick={() => setAjustando(true)} disabled={enviando}>Pedir ajuste</Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
