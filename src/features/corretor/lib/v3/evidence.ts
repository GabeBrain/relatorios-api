// Corretor v3.3 — persistência das imagens-evidência de tabela (bucket
// corretor-evidencias). O analista vê o MATERIAL ORIGINAL grande na correção, ao
// lado da prova (soma calculada × declarada). Dedup por sha1; upload best-effort:
// se o bucket não existir, a análise segue e a evidência só não aparece.

import { supabase } from '@/integrations/supabase/client';
import type { Finding } from '../audit/model';
import type { TableImageCandidate } from './table-images';

const BUCKET = 'corretor-evidencias';

function ext(mime: string): string {
  return mime === 'image/jpeg' ? 'jpg' : 'png';
}

/** Sobe UMA imagem (idempotente por sha1) e devolve o path público, ou null. */
async function uploadOne(c: TableImageCandidate): Promise<string | null> {
  const path = `${c.sha1}.${ext(c.mime)}`;
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      // upsert=false: se já existe (mesma sha1), reaproveita sem reenviar
      .upload(path, c.bytes as unknown as Blob, { contentType: c.mime, upsert: false });
    // "already exists" não é erro real — a imagem já está lá
    if (error && !/exists/i.test(error.message)) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null; // best-effort: nunca derruba a análise por causa da evidência
  }
}

/**
 * Para cada achado de visão com `evidenceSha1`, sobe a imagem correspondente e
 * preenche `evidenceImage` (URL pública). Muta e devolve os próprios findings.
 * Uma imagem é subida no máximo uma vez por chamada, mesmo com N achados.
 */
export async function attachEvidenceImages(
  findings: Finding[],
  candidates: TableImageCandidate[],
): Promise<Finding[]> {
  const bySha = new Map(candidates.map((c) => [c.sha1, c]));
  const urlCache = new Map<string, string | null>();

  for (const f of findings) {
    const sha = f.evidenceSha1;
    if (!sha) continue;
    const cand = bySha.get(sha);
    if (!cand) continue;
    if (!urlCache.has(sha)) urlCache.set(sha, await uploadOne(cand));
    const url = urlCache.get(sha);
    if (url) f.evidenceImage = url;
  }
  return findings;
}
