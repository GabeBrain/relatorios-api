import { supabase } from '@/integrations/supabase/client';
import type { ArchivedProject, ArchivedSlide } from '../store/archive-store';
import type { SlideResult } from '../store/analysis-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function saveProjectToDb(
  meta: Omit<ArchivedProject, 'id' | 'savedAt' | 'slides'>,
  slides: SlideResult[]
): Promise<string> {
  const { data: projectRow, error: projectErr } = await db
    .from('projects')
    .insert({
      project_name: meta.projectName,
      city_name: meta.cityName,
      radii: meta.radii,
      model: meta.model,
      total_slides: meta.totalSlides,
      slides_ok: meta.slidesOk,
      slides_with_errors: meta.slidesWithErrors,
      slides_skipped: meta.slidesSkipped,
      slides_error: meta.slidesError,
      total_errors: meta.totalErrors,
      total_cost: meta.totalCost,
      total_input_tokens: meta.totalInputTokens,
      total_output_tokens: meta.totalOutputTokens,
      report_text: meta.reportText,
    })
    .select('id')
    .single();

  if (projectErr || !projectRow) throw new Error(projectErr?.message ?? 'Falha ao salvar projeto');

  const projectId = projectRow.id as string;

  for (const slide of slides) {
    let imagePath: string | null = null;

    // Persiste a thumbnail de TODOS os slides que a têm (não só os com erro):
    // permite auditar falsos negativos. As imagens dos slides OK são podadas
    // depois, ao concluir a revisão (markProjectReviewedInDb).
    if (slide.imageDataUrl) {
      const path = `${projectId}/${slide.slideNumber}.jpg`;
      const blob = dataUrlToBlob(slide.imageDataUrl);
      const { error: uploadErr } = await db.storage
        .from('slide-thumbnails')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (!uploadErr) imagePath = path;
    }

    const { data: slideRow, error: slideErr } = await db
      .from('slides')
      .insert({
        project_id: projectId,
        slide_number: slide.slideNumber,
        status: slide.status,
        has_data: slide.hasData,
        summary: slide.summary,
        input_tokens: slide.inputTokens,
        output_tokens: slide.outputTokens,
        cost: slide.cost,
        image_path: imagePath,
      })
      .select('id')
      .single();

    if (slideErr || !slideRow) continue;

    if (slide.errors.length > 0) {
      await db.from('slide_errors').insert(
        slide.errors.map((err) => ({
          slide_id: slideRow.id,
          type: err.type,
          severity: err.severity,
          description: err.description,
          location: err.location ?? '',
        }))
      );
    }
  }

  return projectId;
}

export async function loadProjectsFromDb(): Promise<ArchivedProject[]> {
  const { data: projectRows, error } = await db
    .from('projects')
    .select('*')
    .order('saved_at', { ascending: false });

  if (error || !projectRows) return [];

  const projects: ArchivedProject[] = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projectRows.map(async (p: any) => {
      const { data: slideRows } = await db
        .from('slides')
        .select('*, slide_errors(*)')
        .eq('project_id', p.id)
        .order('slide_number', { ascending: true });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slides: ArchivedSlide[] = (slideRows ?? []).map((s: any) => ({
        slideNumber: s.slide_number,
        status: s.status,
        hasData: s.has_data,
        summary: s.summary,
        inputTokens: s.input_tokens,
        outputTokens: s.output_tokens,
        cost: s.cost,
        imagePath: s.image_path ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errors: (s.slide_errors ?? []).map((e: any) => ({
          id: e.id,
          type: e.type,
          severity: e.severity,
          description: e.description,
          location: e.location,
          verdict: e.verdict ?? null,
        })),
      }));

      return {
        id: p.id,
        savedAt: p.saved_at,
        reviewedAt: p.reviewed_at ?? null,
        projectName: p.project_name,
        cityName: p.city_name,
        radii: p.radii,
        model: p.model,
        totalSlides: p.total_slides,
        slidesOk: p.slides_ok,
        slidesWithErrors: p.slides_with_errors,
        slidesSkipped: p.slides_skipped,
        slidesError: p.slides_error,
        totalErrors: p.total_errors,
        totalCost: Number(p.total_cost),
        totalInputTokens: p.total_input_tokens,
        totalOutputTokens: p.total_output_tokens,
        reportText: p.report_text,
        slides,
      };
    })
  );

  return projects;
}

/**
 * Atualiza o veredito de um erro (bug real × falso positivo).
 * Requer a migration 20260705 (coluna verdict + policy de UPDATE).
 */
export async function updateErrorVerdictInDb(
  errorId: string,
  verdict: 'bug' | 'fp' | null
): Promise<void> {
  const { error } = await db.from('slide_errors').update({ verdict }).eq('id', errorId);
  if (error) throw new Error(error.message);
}

/** URL assinada (bucket privado) para exibir a thumbnail de um slide. */
export async function getThumbnailUrl(imagePath: string, expiresInSec = 3600): Promise<string | null> {
  const { data, error } = await db.storage
    .from('slide-thumbnails')
    .createSignedUrl(imagePath, expiresInSec);
  if (error || !data) return null;
  return data.signedUrl as string;
}

/**
 * Conclui a revisão de um projeto: carimba reviewed_at e **poda as thumbnails
 * dos slides sem erro** (mantém as dos slides com erro). Requer a migration
 * 20260709 (coluna reviewed_at + policy anon_update_projects).
 */
export async function markProjectReviewedInDb(projectId: string): Promise<void> {
  const { data: slideRows } = await db
    .from('slides')
    .select('slide_number, image_path, slide_errors(id)')
    .eq('project_id', projectId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const okSlides = (slideRows ?? []).filter((s: any) => (s.slide_errors?.length ?? 0) === 0 && s.image_path);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paths = okSlides.map((s: any) => s.image_path as string);
  if (paths.length > 0) {
    await db.storage.from('slide-thumbnails').remove(paths);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const okNumbers = okSlides.map((s: any) => s.slide_number);
    await db.from('slides').update({ image_path: null }).eq('project_id', projectId).in('slide_number', okNumbers);
  }

  const { error } = await db.from('projects').update({ reviewed_at: new Date().toISOString() }).eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function deleteProjectFromDb(projectId: string): Promise<void> {
  const { data: files } = await db.storage.from('slide-thumbnails').list(projectId);
  if (files && files.length > 0) {
    const paths = files.map((f: { name: string }) => `${projectId}/${f.name}`);
    await db.storage.from('slide-thumbnails').remove(paths);
  }
  await db.from('projects').delete().eq('id', projectId);
}

export async function clearAllProjectsFromDb(): Promise<void> {
  const { data: folders } = await db.storage.from('slide-thumbnails').list('');
  if (folders && folders.length > 0) {
    for (const folder of folders) {
      const { data: files } = await db.storage.from('slide-thumbnails').list(folder.name);
      if (files && files.length > 0) {
        const paths = files.map((f: { name: string }) => `${folder.name}/${f.name}`);
        await db.storage.from('slide-thumbnails').remove(paths);
      }
    }
  }
  await db.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}
