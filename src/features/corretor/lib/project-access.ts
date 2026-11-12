import { supabase } from '@/integrations/supabase/client';
export class CorretorAccessUnavailable extends Error {
  constructor() { super('O acesso aos materiais ainda depende da publicação no Lovable.'); }
}
/** Mesmo e-mail/senha GeoBrain; função server-side troca a prova válida por sessão do app. */
export async function loginCorretor(email: string, password: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/corretor-access`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ email, password }), signal: controller.signal,
  });
  const data = await response.json().catch(() => null);
  if (response.status === 404) throw new CorretorAccessUnavailable();
  if (!response.ok || !data?.session?.access_token || !data?.session?.refresh_token || typeof data.token !== 'string' || !data.token.trim()) throw new Error(data?.error ?? 'O acesso aos projetos ainda não está disponível.');
  const { error } = await supabase.auth.setSession(data.session);
  if (error) throw new Error('Não foi possível guardar o acesso ao projeto.');
  return data.token;
  } finally { clearTimeout(timeout); }
}
