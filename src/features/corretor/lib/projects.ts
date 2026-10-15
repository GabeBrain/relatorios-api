import { supabase } from '@/integrations/supabase/client';
import type { StudyV3 } from './v3/db';

export interface ProjectProfile {
  id: string; study_id: string | null; display_name: string; client_name: string;
  study_type: string; city: string; uf: string; analyst: string; reviewer: string;
  due_date: string | null; reference_period: string; notes: string; updated_at?: string;
}
export interface VersionRecord { id: string; n: number; sha1: string | null; arquivo: string | null; n_slides: number; created_at: string }
export interface OriginalAsset { id: string; project_id: string; version_id: string; path: string; sha256: string; sha1: string; bytes: number; original_name: string; created_at: string }
// Fronteira das tabelas novas; tipos gerados serão atualizados após aplicação da migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
export function profileFor(study: StudyV3): ProjectProfile {
  return { id: '', study_id: study.id, display_name: study.nome.replace(/^Brain_Vocacional_Vertical_/i, '').replace(/_/g, ' '),
    client_name: '', study_type: 'vocacional_vertical', city: study.cidade ?? '', uf: study.uf ?? '', analyst: '', reviewer: '', due_date: null, reference_period: '', notes: '' };
}
export async function requireProjectIdentity(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw new Error('Seu acesso aos arquivos do projeto ainda não está habilitado. Os estudos existentes continuam disponíveis para consulta.');
  if (data.user.app_metadata?.corretor_enabled !== true || Date.parse(data.user.app_metadata?.corretor_geo_until ?? '') <= Date.now() || !Number.isFinite(Date.parse(data.user.app_metadata?.corretor_geo_until ?? ''))) throw new Error('Reemita o acesso no menu para guardar ou recuperar os materiais do projeto.');
  return data.user.id;
}
export async function loadProfiles(): Promise<ProjectProfile[]> {
  const { data, error } = await db.from('corretor_projects').select('*').order('updated_at', { ascending: false });
  if (error) throw new Error('O cadastro compartilhado ainda não está disponível. Os dados exibidos vêm dos estudos existentes.');
  return data ?? [];
}
export async function saveProfile(profile: ProjectProfile): Promise<ProjectProfile> {
  const actor = await requireProjectIdentity();
  const { id, updated_at, ...fields } = profile;
  const q = id ? db.from('corretor_projects').update(fields).eq('id', id).eq('updated_at', updated_at) : db.from('corretor_projects').insert({ ...fields, owner_id: actor });
  const { data, error } = await q.select('*').single();
  if (error || !data) throw new Error('Não foi possível salvar o cadastro. Confira seu acesso e tente novamente.');
  return data;
}
export async function loadVersions(studyId: string): Promise<VersionRecord[]> {
  const { data, error } = await db.from('study_versions').select('id,n,sha1,arquivo,n_slides,created_at').eq('study_id', studyId).order('n', { ascending: false });
  if (error) throw new Error('Não foi possível recuperar as versões.');
  return data ?? [];
}
export async function loadOriginals(projectId: string): Promise<OriginalAsset[]> {
  const { data, error } = await db.from('corretor_originals').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw new Error('Não foi possível conferir os originais guardados.');
  return data ?? [];
}
export async function digest(bytes: Uint8Array, algorithm: 'SHA-1' | 'SHA-256') {
  const copy = Uint8Array.from(bytes);
  return [...new Uint8Array(await crypto.subtle.digest(algorithm, copy))].map(v => v.toString(16).padStart(2, '0')).join('');
}
export async function matchOriginal(bytes: Uint8Array, expected: string | null): Promise<{ sha1: string; sha256: string }> {
  if (!expected) throw new Error('Esta versão não tem hash de referência; o vínculo do original precisa de conferência.');
  const [sha1, sha256] = await Promise.all([digest(bytes, 'SHA-1'), digest(bytes, 'SHA-256')]);
  if (sha1 !== expected) throw new Error('Este arquivo não corresponde à versão selecionada. Escolha o original dessa versão.');
  return { sha1, sha256 };
}
export async function uploadOriginal(projectId: string, version: VersionRecord, file: File, onProgress: (value: number) => void): Promise<void> {
  await requireProjectIdentity();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hashes = await matchOriginal(bytes, version.sha1);
  const path = `${projectId}/${version.id}/${hashes.sha256}.pptx`;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('O acesso expirou. Retome o acesso e tente novamente.');
  const { data: objectExists, error: lookupError } = await supabase.storage.from('corretor-originais').exists(path);
  const lookupStatus = lookupError && ('status' in lookupError ? Number(lookupError.status) : (lookupError as { originalError?: { status?: number } }).originalError?.status);
  if (lookupError && lookupStatus !== 404) throw new Error('Não foi possível conferir o armazenamento antes do envio.');
  const { Upload } = await import('tus-js-client');
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  if (!objectExists) await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${base}/storage/v1/upload/resumable`,
      headers: { authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      chunkSize: 6 * 1024 * 1024, retryDelays: [0, 1000, 3000, 5000],
      metadata: { bucketName: 'corretor-originais', objectName: path, contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', cacheControl: '3600' },
      removeFingerprintOnSuccess: true,
      onProgress: (sent, total) => onProgress(total ? Math.round(sent / total * 100) : 0),
      onError: () => reject(new Error('O envio não terminou. O arquivo permanece no seu computador; tente novamente para retomar.')),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then(previous => { if (previous[0]) upload.resumeFromPreviousUpload(previous[0]); upload.start(); }).catch(reject);
  });
  // Não gravar disponibilidade antes da confirmação do objeto e metadados pelo servidor.
  const { error } = await db.rpc('register_corretor_original', { p_project: projectId, p_version: version.id, p_path: path, p_sha256: hashes.sha256, p_sha1: hashes.sha1, p_bytes: file.size, p_name: file.name });
  if (error) throw new Error('O envio terminou, mas o vínculo não foi confirmado. Tente registrar novamente; não crie outra versão.');
}
export async function downloadOriginal(asset: OriginalAsset): Promise<{ name: string; bytes: Uint8Array }> {
  await requireProjectIdentity();
  const { data, error } = await supabase.storage.from('corretor-originais').download(asset.path);
  if (error || !data) throw new Error('Não foi possível recuperar o original guardado.');
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (bytes.length !== asset.bytes || await digest(bytes, 'SHA-256') !== asset.sha256 || await digest(bytes, 'SHA-1') !== asset.sha1) throw new Error('A integridade do arquivo recuperado não foi confirmada. A análise não foi retomada.');
  return { name: asset.original_name, bytes };
}
