import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { GeobrainAccessContext } from '../lib/geobrain-access-context';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { loginCorretor } from '../lib/project-access';
import { requireProjectIdentity } from '../lib/projects';

/** Mantém a ação original aguardando; cancelar/trocar de rota não executa a intenção. */
export default function GeobrainAccessProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const pending = useRef<((allowed: boolean) => void) | null>(null);
  const [action, setAction] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const finish = useCallback((allowed: boolean) => { const resolve = pending.current; pending.current = null; setAction(''); setPassword(''); resolve?.(allowed); }, []);
  useEffect(() => { finish(false); return () => { pending.current?.(false); pending.current = null; }; }, [location.pathname, location.search, finish]);
  const ensure = useCallback(async (label: string) => {
    try { await requireProjectIdentity(); return true; }
    catch {
      if (pending.current) return false;
      setError(''); setAction(label);
      return new Promise<boolean>(resolve => { pending.current = resolve; });
    }
  }, []);
  async function login() {
    if (busy) return; setBusy(true); setError('');
    const intent = pending.current;
    try {
      const token = await loginCorretor(email.trim(), password);
      useAuthStore.getState().setToken(token, email.trim());
      if (pending.current === intent) finish(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível entrar.'); }
    finally { setBusy(false); setPassword(''); }
  }
  return <GeobrainAccessContext.Provider value={ensure}>{children}<Dialog open={Boolean(action)} onOpenChange={open => { if (!open) finish(false); }}><DialogContent><DialogHeader><DialogTitle>Entrar com Geobrain</DialogTitle></DialogHeader>
    <p>Use a mesma conta do Geobrain para {action}. Após entrar, você continua de onde parou.</p>
    <form onSubmit={e => { e.preventDefault(); void login(); }} className="space-y-4">
      <div><Label htmlFor="corretor-login-email">E-mail Geobrain</Label><Input id="corretor-login-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div><Label htmlFor="corretor-login-password">Senha Geobrain</Label><Input id="corretor-login-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <p role="alert">{error}</p>}<div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar e continuar'}</Button><Button type="button" variant="outline" onClick={() => finish(false)}>Cancelar</Button></div>
    </form>
  </DialogContent></Dialog></GeobrainAccessContext.Provider>;
}
