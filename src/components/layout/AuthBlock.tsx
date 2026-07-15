import { useState, useEffect } from 'react';
import { LogIn, LogOut, RefreshCw, ShieldCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { loginRequest } from '@/lib/http-client';
import { useOpenAPIDocs } from '@/hooks/use-openapi-docs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthBlock() {
  const { data: docs } = useOpenAPIDocs();
  const { token, email, hasValidToken, setToken, clearToken, minutesRemaining, expiryLabel } = useAuthStore();

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginUrl) { toast.error('Endpoint /auth/login não encontrado nas specs.'); return; }
    if (!loginEmail.trim() || !loginPassword.trim()) { toast.error('Preencha email e senha.'); return; }

    setLoading(true);
    try {
      const result = await loginRequest(loginUrl, loginEmail.trim(), loginPassword);
      if (result.ok && typeof result.data === 'object' && result.data !== null) {
        const d = result.data as Record<string, unknown>;
        const t = typeof d.token === 'string' ? d.token.trim() : '';
        if (t) {
          setToken(t, loginEmail.trim());
          toast.success('Token gerado com sucesso.');
          setLoginEmail('');
          setLoginPassword('');
        } else {
          toast.error('Resposta sem campo token.');
        }
      } else {
        toast.error(`Falha na autenticação. Status: ${result.status ?? 'sem status'}.`);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReissue() {
    clearToken();
    toast.info('Token removido. Gere um novo.');
  }

  if (!token && !isValid) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <LogIn className="h-3.5 w-3.5" />
          Autenticação
        </div>
        <form onSubmit={handleLogin} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="auth-email" className="text-xs">Email</Label>
            <Input
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
            {loading ? 'Autenticando...' : 'Gerar token'}
          </Button>
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
        Autenticado
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
          onClick={() => { clearToken(); toast.info('Token removido.'); }}
        >
          <LogOut className="h-3 w-3" />
          Remover
        </Button>
      </div>
    </div>
  );
}
