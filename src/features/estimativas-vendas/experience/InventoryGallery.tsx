import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { InventoryRow } from '../scientific/study';
import type { Universe } from './domain';

export function InventoryGallery({ kind, rows, universe, onClose }: { kind: 'others' | 'sold'; rows: InventoryRow[]; universe: Universe; onClose: () => void }) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(0), [width, setWidth] = useState(window.innerWidth);
  useEffect(() => { const resize = () => setWidth(window.innerWidth); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  const size = width < 700 ? 4 : width < 1000 ? 8 : 12;
  const filtered = useMemo(() => rows.filter(r => `${r.name} ${r.id} ${universe.locations[r.id]?.city ?? ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))), [rows, search, universe]);
  useEffect(() => setPage(0), [search, size, rows]);
  const pages = Math.max(1, Math.ceil(filtered.length / size)), current = Math.min(page, pages - 1), visible = filtered.slice(current * size, (current + 1) * size);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="evs-gallery"><DialogTitle>{kind === 'sold' ? 'Empreendimentos esgotados' : 'Outros empreendimentos'}</DialogTitle><DialogDescription>{rows.length} empreendimentos do universo carregado. Esta consulta preserva seus filtros e sua seleção.</DialogDescription>
    <label className="evx-field">Buscar nesta galeria<Input placeholder="Nome, ID ou cidade" value={search} onChange={e => setSearch(e.target.value)} /></label>
    <div className="evs-gallery-grid">{visible.map(r => <article key={r.id}><h3>{r.name}</h3><p>{universe.locations[r.id]?.city} · ID {r.id}</p><small>Último registro: {r.cutoff || 'ausente'}</small><p>{kind === 'sold' ? 'Esgotado no último registro' : r.tags.includes('old-stock') ? 'Fora do intervalo de idade Finotti' : 'Sem referência Finotti calculável'}</p></article>)}</div>
    {!visible.length && <p role="status">Nenhum empreendimento corresponde à busca.</p>}
    <nav className="evx-actions" aria-label="Páginas da galeria"><Button variant="ghost" disabled={current === 0} onClick={() => setPage(v => v - 1)}>Anterior</Button><span>Página {current + 1} de {pages} · {filtered.length} resultados</span><Button variant="ghost" disabled={current + 1 >= pages} onClick={() => setPage(v => v + 1)}>Próxima</Button></nav>
  </DialogContent></Dialog>;
}
