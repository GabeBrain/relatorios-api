import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ActivityEntry {
  id: string;
  createdAt: string;
  action: string;
  detail: string;
  ip: string;
}

/**
 * Registra uma ação no log de atividade (fire-and-forget).
 * O IP é capturado no servidor pela edge function `log-activity`;
 * se a função ainda não estiver deployada, falha em silêncio.
 */
export function logActivity(action: string, detail = ''): void {
  supabase.functions
    .invoke('log-activity', { body: { action, detail } })
    .catch(() => {
      /* log é best-effort — nunca quebra o fluxo do usuário */
    });
}

/** Lê as entradas mais recentes do log. Retorna [] se a tabela não existir. */
export async function fetchActivity(limit = 8): Promise<ActivityEntry[]> {
  const { data, error } = await db
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    id: r.id,
    createdAt: r.created_at,
    action: r.action,
    detail: r.detail ?? '',
    ip: r.ip ?? '',
  }));
}
