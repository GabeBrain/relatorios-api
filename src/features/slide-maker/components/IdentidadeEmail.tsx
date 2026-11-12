import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { emailValido } from '../lib/armazenamento';

/**
 * Identificação do colaborador (§9): só o e-mail @brain.srv.br, guardado neste navegador.
 * Não usa o login GeoBrain: o Slide Maker não depende da API GeoBrain.
 */
export function IdentidadeEmail({ onSalvar }: { onSalvar: (email: string) => void }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [tocado, setTocado] = useState(false);
  const valido = emailValido(email);
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setTocado(true);
    if (valido) onSalvar(email);
  };
  return (
    <form onSubmit={enviar} className="max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Quem está criando?</h2>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail da Brain. Ele identifica você como autor das apresentações e fica salvo neste navegador.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id}>E-mail</Label>
        <Input
          id={id} type="email" autoComplete="email" placeholder="nome@brain.srv.br" value={email}
          onChange={(e) => setEmail(e.target.value)} onBlur={() => setTocado(true)}
          aria-invalid={tocado && !valido} aria-describedby={`${id}-ajuda`}
        />
        <p id={`${id}-ajuda`} className={tocado && !valido ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'}>
          {tocado && !valido ? 'Use seu e-mail @brain.srv.br.' : 'Só e-mails @brain.srv.br.'}
        </p>
      </div>
      <Button type="submit">Continuar</Button>
    </form>
  );
}
