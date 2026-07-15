// Corretor v3.3 — Legado v1 (SOMENTE LEITURA). Lê os estudos já analisados pela
// v1 (tabelas projects/slides/slide_errors + thumbnails) e os mostra como consulta
// histórica. Não re-analisa, não edita: os motores da v1 (pdfjs, analyze-slide)
// estão aposentados; aqui é só o arquivo do que já foi feito.

import { useCallback, useEffect, useState } from 'react';
import { Archive, ChevronDown, Loader2, AlertTriangle, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { loadProjectsFromDb, getThumbnailUrl } from '../lib/archive-db';
import type { ArchivedProject } from '../store/archive-store';

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}

function LegacyDetail({ project }: { project: ArchivedProject }) {
  const withErrors = (project.slides ?? []).filter((s) => (s.errors?.length ?? 0) > 0);
  return (
    <div className="mt-2 space-y-3 border-t border-border pt-3">
      {withErrors.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum slide com erro registrado neste estudo.</p>
      ) : (
        withErrors.map((s) => (
          <div key={s.slideNumber} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold rounded bg-muted px-2 py-0.5">Slide {s.slideNumber}</span>
              <span className="text-[10px] text-muted-foreground">{s.errors!.length} erro(s)</span>
            </div>
            <LegacyThumb imagePath={s.imagePath ?? null} slide={s.slideNumber} />
            {s.errors!.map((e) => (
              <div key={e.id} className="text-xs border-l-2 border-destructive/30 pl-2 py-0.5">
                <span className="font-mono text-[10px] text-muted-foreground">{e.type}</span>
                <p className="text-muted-foreground">{e.description}</p>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function LegacyThumb({ imagePath, slide }: { imagePath: string | null; slide: number }) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    if (!imagePath) { setUrl(null); return; }
    getThumbnailUrl(imagePath).then((u) => { if (active) setUrl(u); }).catch(() => { if (active) setUrl(null); });
    return () => { active = false; };
  }, [imagePath]);

  if (url === undefined && imagePath) {
    return <div className="h-24 flex items-center text-[10px] text-muted-foreground gap-1"><Loader2 className="w-3 h-3 animate-spin" /> carregando imagem…</div>;
  }
  if (!url) {
    return (
      <div className="h-16 flex items-center text-[10px] text-muted-foreground gap-1">
        <ImageOff className="w-3 h-3" /> thumbnail não disponível (podada ou expirada) — slide {slide}
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt={`Slide ${slide}`} loading="lazy" className="max-h-64 w-full object-contain rounded-md border border-border bg-white" />
    </a>
  );
}

export default function LegacyV1Panel() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ArchivedProject[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProjects(await loadProjectsFromDb()); }
    catch { setProjects([]); }
    finally { setLoading(false); }
  }, []);

  // carrega só quando o usuário abre a seção (não pesa a homepage à toa)
  useEffect(() => { if (open && projects === null && !loading) void load(); }, [open, projects, loading, load]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="space-y-3">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2">
            <Archive className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Legado v1</h2>
            <span className="text-[10px] text-muted-foreground">
              estudos da versão antiga · somente leitura
              {projects && ` · ${projects.length}`}
            </span>
            <div className="flex-1 border-t border-border" />
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando estudos da v1…
            </div>
          ) : !projects || projects.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhum estudo v1 arquivado.</p>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => {
                const isOpen = expandedId === p.id;
                return (
                  <div key={p.id} className="rounded-lg border border-border bg-card px-4 py-3">
                    <button
                      onClick={() => setExpandedId(isOpen ? null : p.id)}
                      className="w-full text-left flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {p.slidesWithErrors > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <span className="text-sm font-medium truncate">{p.projectName}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {p.cityName} · {fmtDate(p.savedAt)} · {p.totalSlides} slides · {p.totalErrors} erro(s)
                          {p.totalCost > 0 && ` · $${p.totalCost.toFixed(2)}`}
                        </p>
                      </div>
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', isOpen && 'rotate-180')} />
                    </button>
                    {isOpen && <LegacyDetail project={p} />}
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
