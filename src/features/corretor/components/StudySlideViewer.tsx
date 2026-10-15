import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { listMaterials, previewUrl } from '../lib/materials';
import { digest, loadVersions } from '../lib/projects';
import { loadLocalMaterial, saveLocalMaterial } from '../lib/v3/local-materials';
import type { StudyV3 } from '../lib/v3/db';
const PdfSlide = lazy(() => import('./PdfSlide'));

export default function StudySlideViewer({ study, slide, evidence }: {
  study: StudyV3; slide: number; evidence?: string;
}) {
  const [preview, setPreview] = useState<{ url: string; kind: 'pdf' | 'image' } | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [zoom, setZoom] = useState(1);
  const [revision, setRevision] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true, objectUrl = '';
    setPreview(null); setError('');
    (async () => {
      const local = study.lastSha1 ? await loadLocalMaterial(`preview:${study.lastSha1}`).catch(() => null) : null;
      if (!active) return;
      if (local?.manifest?.originalSha1 === study.lastSha1 && local.manifest.pages === study.nSlides) {
        objectUrl = URL.createObjectURL(new Blob([local.bytes.slice().buffer], { type: 'application/pdf' }));
        setPreview({ url: objectUrl, kind: 'pdf' }); return;
      }
      const [assets, versions] = await Promise.all([listMaterials(study.id), loadVersions(study.id)]);
      const version = versions.find(v => v.sha1 === study.lastSha1 && v.n === study.lastVersion);
      if (!version || !active) return;
      const asset = assets.find(a => a.version_id === version.id && a.kind === 'preview_slide' && a.slide_n === slide)
        ?? assets.find(a => a.version_id === version.id && a.kind === 'preview_pdf');
      if (!asset) return;
      const url = await previewUrl(asset);
      if (active) setPreview({ url, kind: asset.kind === 'preview_pdf' ? 'pdf' : 'image' });
    })().catch(() => { if (active) setError('Não foi possível consultar as prévias guardadas. Você pode abrir o PDF desta versão.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [study.id, study.lastSha1, study.lastVersion, study.nSlides, slide, revision]);
  async function attach(file?: File) {
    if (!file || !study.lastSha1 || busy) return;
    setBusy(true); setError('');
    try {
      if (!/\.pdf$/i.test(file.name) || file.size > 512 * 1024 * 1024) throw new Error('Selecione um PDF de até 512 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      const task = pdfjs.getDocument({ data: bytes.slice() });
      let pages: number;
      try { const doc = await task.promise; pages = doc.numPages; } finally { await task.destroy(); }
      if (pages !== study.nSlides) throw new Error(`O PDF tem ${pages} páginas; esta versão tem ${study.nSlides} slides. Exporte incluindo os slides ocultos.`);
      if (!window.confirm(`Este PDF foi exportado do mesmo PowerPoint da versão ${study.lastVersion}, na mesma ordem e incluindo slides ocultos? A quantidade de páginas, sozinha, não comprova a correspondência.`)) return;
      await saveLocalMaterial({ key: `preview:${study.lastSha1}`, name: file.name, bytes,
        manifest: { originalSha1: study.lastSha1, pdfSha256: await digest(bytes, 'SHA-256'), pages,
          source: 'pdf-confirmado-pelo-usuario', includesHidden: true, confirmedAt: new Date().toISOString() } });
      setRevision(n => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir a prévia.'); }
    finally { setBusy(false); }
  }
  return <section className="cs-viewer" aria-label={`Visualização do slide ${slide}`}>
    <div className="cs-viewer-tools"><Button variant="outline" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Conferindo PDF…' : preview ? 'Trocar prévia PDF' : 'Abrir PDF desta versão'}</Button>
      {preview && <Button variant="outline" onClick={() => setZoom(z => z === 1 ? 1.4 : 1)}>Zoom {Math.round(zoom * 100)}%</Button>}
      {preview?.kind === 'image' && <a href={preview.url} target="_blank" rel="noreferrer">Ampliar imagem</a>}
    </div>
    <input ref={input} type="file" accept=".pdf" hidden onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void attach(file); }} />
    {error && <p role="status" className="cp-muted">{error}</p>}
    {preview ? <div className="cb-document">{preview.kind === 'pdf'
      ? <Suspense fallback={<p role="status">Preparando slide…</p>}><PdfSlide url={preview.url} slide={slide} zoom={zoom} expectedPages={study.nSlides} /></Suspense>
      : <img src={preview.url} alt={`Slide ${slide} da versão ${study.lastVersion}`} />}</div>
      : evidence ? <div className="cb-document"><a href={evidence} target="_blank" rel="noreferrer"><img src={evidence} alt={`Recorte de evidência do slide ${slide}`} /></a><p className="cp-muted">Recorte salvo do slide {slide} · clique para ampliar.</p></div> : null}
  </section>;
}
