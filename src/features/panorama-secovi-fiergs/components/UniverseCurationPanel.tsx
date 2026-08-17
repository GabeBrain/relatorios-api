import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Filter, Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchLaunchAuditBuildings } from '../api';
import type { PanoramaExclusion, PanoramaScope } from '../types';

const storeKey = (scope: PanoramaScope) => `panorama-exclusions:${scope.uf}:${scope.city}:${scope.endQuarter}`;

export function UniverseCurationPanel({ scope }: { scope: PanoramaScope }) {
  const [requested, setRequested] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState('Fora do universo Secovi/FIERGS');
  const [exclusions, setExclusions] = useState<PanoramaExclusion[]>(() => {
    try { return JSON.parse(localStorage.getItem(storeKey(scope)) ?? '[]') as PanoramaExclusion[]; } catch { return []; }
  });
  const audit = useQuery({ queryKey: ['panorama-universe-audit', scope], queryFn: ({ signal }) => fetchLaunchAuditBuildings(scope, signal), enabled: requested, staleTime: 5 * 60 * 1000, retry: 0 });
  const activeIds = useMemo(() => new Set(exclusions.filter((item) => item.status === 'approved').flatMap((item) => item.buildingIds)), [exclusions]);
  const horizontal = useMemo(() => (audit.data ?? []).filter((row) => row.segment === 'Horizontal'), [audit.data]);
  const selectedRows = horizontal.filter((row) => selected.includes(row.buildingId));
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const save = () => {
    if (!selected.length || !reason.trim()) return;
    const next = [...exclusions, { id: crypto.randomUUID(), scope: 'release_only' as const, buildingIds: selected, reason: reason.trim(), author: 'Analista', createdAt: new Date().toISOString(), status: 'approved' as const }];
    setExclusions(next); localStorage.setItem(storeKey(scope), JSON.stringify(next)); setSelected([]);
  };

  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Revisar universo horizontal</h2><p className="text-sm text-muted-foreground">Exclusões afetam somente lançamentos no trimestre de release e ficam salvas localmente com motivo.</p></div><Button variant="outline" onClick={() => setRequested(true)} disabled={audit.isFetching}>{audit.isFetching ? <Loader2 className="animate-spin" /> : <Filter />}{audit.isFetching ? 'Carregando universo…' : 'Carregar empreendimentos'}</Button></div>
    {audit.isError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Não foi possível carregar o universo</AlertTitle><AlertDescription>{audit.error instanceof Error ? audit.error.message : 'Erro desconhecido.'}</AlertDescription></Alert>}
    {audit.data && <><div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4"><div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Horizontais</span><p className="text-lg font-semibold">{horizontal.length}</p></div><div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Selecionados</span><p className="text-lg font-semibold">{selectedRows.length}</p></div><div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Unidades selecionadas</span><p className="text-lg font-semibold">{selectedRows.reduce((sum, row) => sum + row.totalUnits, 0).toLocaleString('pt-BR')}</p></div><div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Exclusões aprovadas</span><p className="text-lg font-semibold">{activeIds.size}</p></div></div>
      <div className="flex flex-wrap items-end gap-2"><div className="min-w-[260px] flex-1 space-y-1"><label className="text-xs text-muted-foreground">Motivo obrigatório</label><Input value={reason} onChange={(event) => setReason(event.target.value)} /></div><Button onClick={save} disabled={!selected.length || !reason.trim()}><Save /> Excluir lançamentos selecionados</Button></div>
      <div className="max-h-[420px] overflow-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Excluir</TableHead><TableHead>Trimestre</TableHead><TableHead>Empreendimento</TableHead><TableHead>ID</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Qtd. mês</TableHead></TableRow></TableHeader><TableBody>{horizontal.map((row) => <TableRow key={row.buildingId} className={activeIds.has(row.buildingId) ? 'opacity-55' : undefined}><TableCell><Checkbox checked={selected.includes(row.buildingId) || activeIds.has(row.buildingId)} disabled={activeIds.has(row.buildingId)} onCheckedChange={() => toggle(row.buildingId)} aria-label={`Excluir ${row.name}`} /></TableCell><TableCell className="text-xs">{row.releaseQuarter}</TableCell><TableCell className="text-xs font-medium">{row.name}</TableCell><TableCell className="font-mono text-[11px]">{row.buildingId}</TableCell><TableCell className="text-right tabular-nums">{row.totalUnits}</TableCell><TableCell className="text-right tabular-nums">{row.releaseMonthQty}</TableCell></TableRow>)}</TableBody></Table></div>
    </>}
  </section>;
}
