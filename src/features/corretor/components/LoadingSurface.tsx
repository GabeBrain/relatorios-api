import type { ReactNode } from 'react';

/** Preserva geometria e bloqueia ações sobre dados ainda sendo atualizados. */
export default function LoadingSurface({ busy, initial = false, blockInteraction = busy, label = 'Atualizando…', children }: {
  busy: boolean; initial?: boolean; blockInteraction?: boolean; label?: string; children: ReactNode;
}) {
  return <div className="cp-loading-surface" aria-busy={busy} data-busy={busy} data-blocked={blockInteraction}>
    {busy && <p className="cp-loading-status" role="status">{initial ? 'Carregando…' : label}</p>}
    <div className="cp-loading-content" ref={node => { if (node) node.toggleAttribute('inert', blockInteraction); }}>
      {initial ? <div className="cp-loading-skeleton" aria-hidden="true">{[0,1,2,3].map(n=><div key={n}><span/><span/><span/></div>)}</div> : children}
    </div>
  </div>;
}
