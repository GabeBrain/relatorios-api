import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import type { InventoryRow } from '../scientific/study';
import type { AnalysisSpec, Universe } from './domain';
import type { AnalysisRuntime } from './runtime';
import { orderTiles, tilePath, type CurveTile } from './mosaic';
import './mosaic.css';

const number = (v: number | null | undefined) => v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export function CurveMap({ runtime, universe, rows, allIds, spec, selection, onToggle, onExplore }: { runtime: AnalysisRuntime; universe: Universe; rows: InventoryRow[]; allIds: string[]; spec: AnalysisSpec; selection: Set<string>; onToggle: (id: string) => void; onExplore: (id: string) => void }) {
  const [density, setDensity] = useState<'mini' | 'detailed'>('mini'), [sort, setSort] = useState<'name' | 'sales'>('name'), [page, setPage] = useState(0), [inspected, setInspected] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ key: string; tiles: Record<string, CurveTile>; complete: boolean }>({ key: '', tiles: {}, complete: false }), [error, setError] = useState('');
  const idsKey = allIds.join('|'), key = JSON.stringify([universe.hash, spec.cutoff, spec.duration, idsKey]);
  useEffect(() => {
    let live = true;
    setError('');
    void (async () => {
      const tiles: Record<string, CurveTile> = {};
      try {
        const ids = idsKey ? idsKey.split('|') : [];
        for (let i = 0; i < ids.length; i += 16) {
          if (!live) return;
          for (const tile of await runtime.tiles(ids.slice(i, i + 16), spec)) tiles[tile.id] = tile;
          if (live) setBatch({ key, tiles: { ...tiles }, complete: i + 16 >= ids.length });
        }
        if (!ids.length && live) setBatch({ key, tiles, complete: true });
      } catch (e) { if (live && (e as Error).name !== 'AbortError') setError((e as Error).message); }
    })();
    return () => { live = false; };
    // Only data identity, origin and duration affect these fixed-reference previews.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, key]);
  const tiles = useMemo(() => batch.key === key ? batch.tiles : {}, [batch, key]), complete = batch.key === key && batch.complete;
  const filterKey = rows.map(r => r.id).join('|');
  useEffect(() => setPage(0), [filterKey, density, sort, key]);
  const ordered = useMemo(() => orderTiles(rows, tiles, sort === 'sales' && complete ? 'sales' : 'name'), [rows, tiles, sort, complete]);
  const size = density === 'mini' ? 500 : 60, pages = Math.max(1, Math.ceil(ordered.length / size));
  const visible = ordered.slice(Math.min(page, pages - 1) * size, (Math.min(page, pages - 1) + 1) * size);
  const ceiling = Math.max(0, ...rows.map(r => tiles[r.id]?.sales ?? 0));
  const active = rows.find(r => r.id === inspected) ?? visible[0], tile = active && tiles[active.id];
  return <section className={`evm-map evm-${density}`} aria-label="Mapa de curvas" aria-busy={!complete}>
    <div className="evx-title-row"><div><p className="evx-eyebrow">Mapa de curvas · vendas acumuladas em %</p><p>{rows.length} empreendimentos · previsão de {spec.duration} meses</p></div><div className="evx-actions"><Button variant={density === 'mini' ? 'secondary' : 'outline'} aria-pressed={density === 'mini'} onClick={() => setDensity('mini')}>Cards mini</Button><Button variant={density === 'detailed' ? 'secondary' : 'outline'} aria-pressed={density === 'detailed'} onClick={() => setDensity('detailed')}>Cards detalhados</Button><Button variant="ghost" aria-pressed={sort === 'name'} onClick={() => setSort('name')}>Por nome</Button><Button variant="ghost" disabled={!complete} aria-pressed={sort === 'sales'} onClick={() => setSort('sales')}>Por vendas previstas</Button></div></div>
    {!complete && !error && <BrainLoadingState variant="field" title={`Preparando mapa: ${Object.keys(tiles).length}/${allIds.length}`} description="Cálculo local; nenhum novo acesso à API." />}
    {error && <p role="alert">Não foi possível preparar o mapa: {error}</p>}
    <div className="evm-legend"><span>Cor: vendas previstas em {spec.duration} meses · {complete ? `0 a ${number(ceiling)} unidades` : 'escala em preparação'}</span><span className="evm-gradient" aria-hidden="true" /><span className="evm-hatch-sample">Sem Finotti</span><span>Histórico até 36 meses · previsão tracejada · início marcado · escalas iguais</span></div>
    {active && <div className="evm-inspector" aria-live="polite"><div><strong>{active.name}</strong><span>ID {active.id} · {universe.locations[active.id]?.city} · dados até {active.cutoff}</span><span>{tile ? tile.finotti ? `${number(tile.sales)} un. previstas · estoque ${number(tile.stock)} → ${number(tile.finalStock)} un.` : `Sem Finotti · ${tile.reason}` : 'Preparando curva'}</span></div><Button variant="outline" onClick={() => onExplore(active.id)} aria-label={`Explorar curva de ${active.name}`}>Explorar curva</Button></div>}
    <div className="evm-grid" aria-label="Empreendimentos e minicurvas">
      {visible.map(r => {
        const t = tiles[r.id], colored = complete && t?.finotti && t.sales !== null, intensity = colored && ceiling > 0 ? Math.max(0, Math.min(1, t.sales! / ceiling)) : 0;
        const start = -36, originX = 4 + 192 * -start / (spec.duration - start);
        return <button key={r.id} className={`evm-tile ${t && !t.finotti ? 'evm-unavailable' : ''} ${selection.has(r.id) ? 'evx-selected' : ''}`} style={{ '--evm-intensity': `${Math.round(12 + intensity * 77)}%` } as CSSProperties} aria-label={`Selecionar ${r.name}`} aria-pressed={selection.has(r.id)} onFocus={() => setInspected(r.id)} onPointerEnter={() => setInspected(r.id)} onClick={() => { setInspected(r.id); onToggle(r.id); }}>
          <span className="evm-name">{r.name} · {r.id}</span><strong>{t ? t.finotti ? `${number(t.sales)} un.` : 'Sem Finotti' : 'Preparando'}</strong>
          <svg viewBox="0 0 200 64" role="img" aria-label={`Curva de vendas de ${r.name}`}><line x1={originX} x2={originX} y1="4" y2="60" className="evm-origin" /><path d={t ? tilePath(t.history, start, spec.duration) : ''} />{t?.history.filter((p, i, ps) => p.percent !== null && ps[i - 1]?.offset !== p.offset - 1 && ps[i + 1]?.offset !== p.offset + 1).map(p => <circle key={p.offset} cx={4 + 192 * (p.offset - start) / (spec.duration - start)} cy={58 - 52 * p.percent! / 100} r="1.5" fill="currentColor" />)}<path d={t ? tilePath(t.forecast, start, spec.duration) : ''} strokeDasharray="4 3" /></svg>
          <span className="evm-detail">{t?.finotti ? `Estoque ${number(t.stock)} → ${number(t.finalStock)} un. · ${t.cutoff}` : t?.reason ?? 'Calculando referência'}</span>
        </button>;
      })}
    </div>
    {!rows.length && <p role="status">Nenhum empreendimento corresponde aos filtros.</p>}
    <div className="evx-actions"><Button variant="outline" disabled={page === 0} onClick={() => setPage(v => v - 1)}>Página anterior do mapa</Button><span>{Math.min(page + 1, pages)}/{pages} · {visible.length} cards nesta página</span><Button variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(v => v + 1)}>Próxima página do mapa</Button></div><small>Disponibilidade de cálculo não comprova precisão. Sem faixa calibrada nesta análise.</small>
  </section>;
}
