import { requireProjectIdentity } from './projects';
import { analysisPending, listStudies, prepareStudyAtomic } from './v3/db';
import { savePptx } from './v3/pptx-store';
import type { Finding } from './audit/model';

export interface AccountPreparation { studyId: string; ownerId: string }
interface DraftInput { name: string; sha1: string; nSlides: number; bytes: Uint8Array; findings: Finding[] }

/** Registra intenção autenticada, sem ata, provedor de IA ou cadastro comercial. */
export async function registerAccountPreparation(input: DraftInput): Promise<AccountPreparation | null> {
  let ownerId: string;
  try { ownerId = await requireProjectIdentity(); } catch { return null; }
  await savePptx(input.sha1, input.name, input.bytes);
  const { id } = await prepareStudyAtomic(input.name.replace(/\.pptx$/i, ''), {
    sha1: input.sha1, nSlides: input.nSlides, arquivo: input.name,
  }, input.findings);
  const current = (await listStudies(true)).find(s => s.id === id);
  if (!current || current.createdBy !== ownerId || current.lastSha1 !== input.sha1 || current.lastVersion !== 1 || !analysisPending(current)) return null;
  return { studyId: id, ownerId };
}

/** Reconfere identidade/estado antes do início explícito; nunca reabre análise concluída. */
export async function canStartAccountPreparation(preparation: AccountPreparation | null | undefined, sha1: string): Promise<boolean> {
  if (!preparation) return false;
  const uid = await requireProjectIdentity();
  if (uid !== preparation.ownerId) throw new Error('A conta mudou durante a preparação. Volte aos estudos e retome com a conta que iniciou o envio.');
  const current = (await listStudies(true)).find(s => s.id === preparation.studyId);
  return Boolean(current && current.createdBy === uid && current.lastSha1 === sha1 && current.lastVersion === 1 && analysisPending(current));
}
