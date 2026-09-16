import type { Divergence } from './validation-rules';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '');
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/validacao-fechamento-approvals`;

export interface DivergenceApproval {
  approval_key: string;
  city: string;
  building_id: string;
  typology_id: string;
  period: string;
  field: string;
  divergence: string;
  rule: string;
  approved_by_email: string;
  approved_at: string;
}

export function approvalKey(row: Divergence): string {
  return JSON.stringify([row.city, row.building_id, row.typology_id, row.period, row.field, row.error, row.rule]);
}

async function invoke<T>(token: string, body: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Configuração de persistência das aprovações indisponível.');
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Não foi possível acessar as aprovações.');
  return payload;
}

export async function listApprovals(token: string, cities: string[]): Promise<DivergenceApproval[]> {
  const result = await invoke<{ approvals: DivergenceApproval[] }>(token, { action: 'list', cities });
  return result.approvals;
}

export async function approveDivergence(token: string, email: string, row: Divergence): Promise<DivergenceApproval> {
  const result = await invoke<{ approval: DivergenceApproval }>(token, {
    action: 'approve',
    approval_key: approvalKey(row),
    city: row.city,
    building_id: row.building_id,
    typology_id: row.typology_id,
    period: row.period,
    field: row.field,
    divergence: row.error,
    rule: row.rule,
    approved_by_email: email,
  });
  return result.approval;
}
