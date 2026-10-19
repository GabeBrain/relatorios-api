import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import { loginRequest } from '@/lib/http-client';
import { loginCorretor, CorretorAccessUnavailable } from '@/features/corretor/lib/project-access';
import { requireProjectIdentity } from '@/features/corretor/lib/projects';
import { GeobrainAccessContext } from '@/features/corretor/lib/geobrain-access-context';
import { GeobrainSessionContext, type SessionState } from './context';

async function confirmedIdentity(email = useAuthStore.getState().email) {
  const id = await requireProjectIdentity();
  const { data } = await supabase.auth.getSession();
  if (!email || data.session?.user.id !== id || data.session.user.email?.toLowerCase() !== email.toLowerCase()) throw new Error('Reemita o acesso no menu Geobrain para confirmar esta conta.');
  return id;
}
/** Uma sessão para o menu e os estudos. Intenções existem apenas em memória. */
export default function GeobrainSessionProvider({ children }: { children: ReactNode }) {
  const location = useLocation(), queries = useQueryClient();
  const [state, setState] = useState<SessionState>('restoring');
  const [action, setAction] = useState(''), [request, setRequest] = useState(0);
  const pending = useRef<((allowed: boolean) => void) | null>(null);
  const invoker = useRef<HTMLElement | null>(null);
  const revision = useRef(0), authenticating = useRef(false), identity = useRef<string | null>(null);
  const finish = useCallback((allowed: boolean) => {
    const resolve = pending.current; pending.current = null; setAction(''); resolve?.(allowed);
    if (!allowed && invoker.current?.isConnected) invoker.current.focus();
  }, []);
  const cancel = useCallback(() => { revision.current++; finish(false); }, [finish]);
  const refresh = useCallback(async () => {
    if (authenticating.current) return;
    const current = revision.current, auth = useAuthStore.getState();
    let uid: string | null = null;
    try { uid = await confirmedIdentity(); } catch { /* visitante ou sessão expirada */ }
    if (current !== revision.current) return;
    if (identity.current !== uid) { identity.current = uid; queries.removeQueries({ predicate: q => q.queryKey.some(k => typeof k === 'string' && /corretor|project|material|personal/i.test(k)) }); }
    setState(!auth.hasValidToken() ? auth.token ? 'expired' : 'anonymous' : uid ? 'ready' : 'api_only');
  }, [queries]);
  useEffect(() => {
    const sessionRevision = revision;
    const { data } = supabase.auth.onAuthStateChange(() => { if (!authenticating.current) { cancel(); setTimeout(() => void refresh(), 0); } });
    const unsubscribe = useAuthStore.subscribe(() => { if (!authenticating.current) { cancel(); void refresh(); } });
    const timer = setInterval(() => void refresh(), 30000);
    return () => { sessionRevision.current++; data.subscription.unsubscribe(); unsubscribe(); clearInterval(timer); pending.current?.(false); pending.current = null; };
  }, [cancel, refresh]);
  useEffect(() => { cancel(); void refresh(); }, [location.pathname, location.search, cancel, refresh]);
  const ensure = useCallback(async (label: string) => {
    const current = revision.current;
    try { await confirmedIdentity(); if (current === revision.current && useAuthStore.getState().hasValidToken()) return true; } catch { /* pede acesso no menu */ }
    if (current !== revision.current || pending.current) return false;
    invoker.current = document.activeElement as HTMLElement | null;
    setAction(label); setRequest(n => n + 1);
    return new Promise<boolean>(resolve => { pending.current = resolve; });
  }, []);
  async function logout() {
    cancel();
    useAuthStore.getState().clearToken();
    await supabase.auth.signOut({ scope: 'local' });
    setState('anonymous');
  }
  async function login(email: string, password: string, fallback?: string | null) {
    if (authenticating.current) throw new Error('Aguarde a autenticação em andamento.');
    authenticating.current = true;
    const current = ++revision.current, intent = pending.current;
    try {
      let token: string, ready = true;
      try { token = await loginCorretor(email, password); await confirmedIdentity(email); }
      catch (e) {
        if (!(e instanceof CorretorAccessUnavailable) || !fallback) throw e;
        const legacy = await loginRequest(fallback, email, password);
        const body = legacy.data as { token?: string } | null;
        if (!legacy.ok || !body?.token) throw new Error('Não foi possível autenticar no Geobrain.');
        token = body.token; ready = false;
        await supabase.auth.signOut({ scope: 'local' });
      }
      if (current !== revision.current) { await supabase.auth.signOut({ scope: 'local' }); return; }
      useAuthStore.getState().setToken(token, email);
      setState(ready ? 'ready' : 'api_only');
      if (pending.current === intent) finish(ready);
    } catch (e) {
      if (current === revision.current) {
        useAuthStore.getState().clearToken();
        await supabase.auth.signOut({ scope: 'local' });
        setState('error');
      }
      throw e;
    }
    finally { authenticating.current = false; }
  }
  return <GeobrainSessionContext.Provider value={{ state, action, request, login, logout, cancel }}><GeobrainAccessContext.Provider value={ensure}>{children}</GeobrainAccessContext.Provider></GeobrainSessionContext.Provider>;
}
