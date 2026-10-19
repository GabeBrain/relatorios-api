import { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, RefreshCw, ShieldCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { useGeobrainSession } from '@/features/shared/geobrain-session/context';
import { useOpenAPIDocs } from '@/hooks/use-openapi-docs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthBlock() {
  const session = useGeobrainSession();
  const { data: docs } = useOpenAPIDocs();
  const { email, hasValidToken, minutesRemaining, expiryLabel } = useAuthStore();
  const emailInput = useRef<HTMLInputElement>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [, forceUpdate] = useState(0);

  // Tick every 30s to refresh countdown display
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const loginOperation = docs?.flatMap((d) => d.operations).find(
    (op) => op.path === '/auth/login' && op.method === 'POST'
  );

  const loginUrl = loginOperation ? `${loginOperation.baseUrl}/auth/login` : null;
  const isValid = hasValidToken();

  useEffect(() => {
    if (session.request) emailInput.current?.focus();
  }, [session.request]);
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) return;
    setLoading(true);
    try {
      await session.login(loginEmail.trim(), loginPassword, loginUrl);
      setLoginEmail('');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha no acesso.'); }
    finally { setLoading(false); setLoginPassword(''); }
  }
  function handleReissue() { void session.logout(); }
  if (!isValid || Boolean(session.action)) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <LogIn className="h-3.5 w-3.5" />
          Geobrain
        </div>
        {session.action && <p role="status" className="text-xs">Entre para {session.action}.</p>}
        {session.state === 'expired' && <p className="text-xs">Acesso expirado. Entre novamente.</p>}
        <form onSubmit={handleLogin} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="auth-email" className="text-xs">Email</Label>
            <Input
              ref={emailInput}
              id="auth-email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-8 text-xs"
              autoComplete="username"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="auth-password" className="text-xs">Senha</Label>
            <Input
              id="auth-password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              className="h-8 text-xs"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" size="sm" className="w-full h-8 text-xs" disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar'}
          </Button>
          {session.action && <Button type="button" variant="outline" size="sm" onClick={session.cancel}>Cancelar</Button>}
        </form>
      </div>
    );
  }

  const mins = minutesRemaining();
  const expiry = expiryLabel();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
        {session.state === 'ready' ? 'Autenticado' : session.state === 'restoring' ? 'Conferindo acesso' : 'APIs conectadas'}
      </div>
      <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-2.5 space-y-1">
        <p className="text-xs font-medium text-foreground truncate">{email}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{mins} min restantes · expira às {expiry}</span>
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs gap-1"
          onClick={handleReissue}
        >
          <RefreshCw className="h-3 w-3" />
          Reemitir
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs gap-1"
          onClick={() => void session.logout()}
        >
          <LogOut className="h-3 w-3" />
          Remover
        </Button>
      </div>
      {session.state === 'api_only' && <p className="text-[11px] text-muted-foreground">Reemita o acesso para associar seus estudos a esta conta.</p>}
    </div>
  );
}
