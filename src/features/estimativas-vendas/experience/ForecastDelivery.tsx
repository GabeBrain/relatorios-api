import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import type { InventoryRow, StudyMethod } from '../scientific/study';
import { Choice } from './Controls';
import { DEFAULT_DELIVERY_FILTERS, deliveryScope, deliverySpec, locationKey, type DeliveryFilters } from './deliveryScope';
import { ExportContent } from './ExportContent';
import { FORECAST_COLUMNS, type ForecastColumn } from './exportColumns';
import { InventoryGallery } from './InventoryGallery';
import type { AnalysisRuntime } from './runtime';
import type { Universe } from './domain';
import { useExportPlan } from './useExportPlan';
import './export-preview.css';
import './delivery.css';

export function ForecastDelivery({ universe, runtime, active, blocked, onBusy, onContext }: {
  universe: Universe; runtime: AnalysisRuntime; active: boolean; blocked: boolean; onBusy: (busy: boolean) => void; onContext: (filters: DeliveryFilters) => void;
}) {
  const [filters, setFilters] = useState<DeliveryFilters>({ ...DEFAULT_DELIVERY_FILTERS });
  const [inventory, setInventory] = useState<InventoryRow[]>([]), [capabilities, setCapabilities] = useState<Record<string, StudyMethod[]>>({});
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [classified, setClassified] = useState(0), [classificationCancelled, setClassificationCancelled] = useState(false);
  const [columns, setColumns] = useState<ForecastColumn[]>([...FORECAST_COLUMNS]), [busy, setBusy] = useState(false);
  const [gallery, setGallery] = useState<'others' | 'sold' | null>(null);
  useEffect(() => {
    if (!active || blocked || ready || classificationCancelled) return;
    let live = true; setError('');
    void (async () => {
      try {
        const rows = await runtime.inventory('latest'), available: Record<string, StudyMethod[]> = {};
        for (let i = 0; i < rows.length; i += 16) {
          if (!live) return;
          Object.assign(available, await runtime.capabilities(rows.slice(i, i + 16).map(row => row.id), 'latest'));
          if (live) setClassified(Math.min(i + 16, rows.length));
        }
        if (live) { setInventory(rows); setCapabilities(available); setReady(true); }
      } catch (e) { if (live) setError(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { live = false; };
  }, [runtime, active, blocked, ready, attempt, classificationCancelled]);
  const scope = useMemo(() => deliveryScope(universe, inventory, capabilities, filters), [universe, inventory, capabilities, filters]);
  const spec = useMemo(() => deliverySpec(filters.duration), [filters.duration]);
  const preparation = useExportPlan(universe, runtime, scope.ids, spec, active && ready && !blocked, true);
  const cities = useMemo(() => [...new Map(universe.areas.map(area => [locationKey(area), { value: locationKey(area), label: `${area.city}/${area.uf}` }])).values()], [universe]);
  function change(next: DeliveryFilters) { setFilters(next); onContext(next); }
  function downloadBusy(value: boolean) { setBusy(value); onBusy(value); }
  const pending = (!ready && !classificationCancelled) || preparation.pending;
  const plan = ready && !blocked ? preparation.plan : null;
  const previous = plan ?? preparation.previous;
  const stale = !plan || blocked;
  const issue = error || preparation.error;
  return <section hidden={!active} className="evd-delivery" aria-label="Entrega das previsões" aria-busy={pending && !issue}>
    <div className="evd-filters"><label className="evx-field">Pesquisar empreendimento<Input placeholder="Nome ou ID" value={filters.search} disabled={busy || blocked} onChange={e => change({ ...filters, search: e.target.value })} /></label>
      {filters.search && <Button variant="ghost" disabled={busy || blocked} onClick={() => change({ ...filters, search: '' })}>Limpar busca</Button>}
      {cities.length > 1 && <Choice label="Cidade" value={filters.city} onChange={city => change({ ...filters, city })} items={[{ value: 'all', label: 'Todas as cidades' }, ...cities]} disabled={busy || blocked} />}
      <Choice label="Tipo" value={filters.type} onChange={type => change({ ...filters, type })} items={['all', 'Horizontal', 'Vertical'].map(value => ({ value, label: value === 'all' ? 'Todos os tipos' : value }))} disabled={busy || blocked} />
      <Choice label="Prever por" value={String(filters.duration)} onChange={duration => change({ ...filters, duration: Number(duration) })} items={[1, 3, 6, 12, 24, 36].map(n => ({ value: String(n), label: `${n} ${n === 1 ? 'mês' : 'meses'}` }))} disabled={busy || blocked} />
    </div><p className="evd-hint">Os filtros definem o arquivo abaixo.</p>
    <header className="evd-heading"><div><h2>Prévia das previsões</h2>{plan && <p>{plan.manifest.included} empreendimentos · {plan.forecasts.length} linhas · {plan.manifest.spec.duration} meses após o último dado de cada empreendimento</p>}</div>
      {ready && <div className="evx-actions"><Button variant="ghost" disabled={busy || blocked} onClick={() => setGallery('others')}>Sem referência ({scope.others.length})</Button><Button variant="ghost" disabled={busy || blocked} onClick={() => setGallery('sold')}>Esgotados ({scope.sold.length})</Button></div>}
    </header>
    {pending && !issue && !preparation.cancelled && <div className="evd-progress"><BrainLoadingState variant="field" title={!ready ? `Conferindo referências: ${classified} empreendimentos` : `Preparando previsões: ${preparation.done}/${scope.ids.length}`} description="Processamento local com os dados já carregados" /><Button variant="ghost" onClick={ready ? preparation.cancel : () => setClassificationCancelled(true)}>Cancelar cálculo</Button></div>}
    {issue && <div role="alert"><p>Não foi possível preparar o conjunto completo. {issue}</p><Button variant="outline" onClick={() => { setError(''); setAttempt(v => v + 1); preparation.retry(); }}>Tentar novamente</Button></div>}
    {(preparation.cancelled || classificationCancelled) && <div role="status"><p>Cálculo cancelado. Nenhum arquivo novo foi liberado.</p><Button variant="outline" onClick={() => { setClassificationCancelled(false); preparation.retry(); }}>Retomar cálculo</Button></div>}
    {ready && !scope.ids.length && !blocked && <p role="status">Nenhum empreendimento com referência calculável corresponde aos filtros. Revise os filtros ou consulte os motivos acima.</p>}
    {previous && <div className={stale ? 'evd-stale' : ''} aria-label={stale ? 'Prévia anterior; não disponível para baixar neste recorte' : 'Conjunto revisável'}>
      {stale && <p>Resultado anterior: {previous.manifest.included} empreendimentos · {previous.manifest.spec.duration} meses. Aguarde o conjunto atual.</p>}
      <ExportContent actionsFirst plan={previous} columns={columns} onColumns={setColumns} disabled={stale || busy} onBusy={downloadBusy} />
      <p className="evd-hint">Referência matemática disponível. {new Set(previous.exclusions.filter(row => row.arquivo === 'lote_operacional').map(row => row.id)).size} empreendimentos com verificações operacionais pendentes; consulte o relatório e as evidências.</p>
    </div>}
    {gallery && <InventoryGallery kind={gallery} rows={scope[gallery]} universe={universe} onClose={() => setGallery(null)} />}
  </section>;
}
