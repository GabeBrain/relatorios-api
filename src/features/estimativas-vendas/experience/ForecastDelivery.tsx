import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { sourcePeriods, type InventoryRow, type StudyMethod } from '../scientific/study';
import { Choice } from './Controls';
import { DEFAULT_DELIVERY_FILTERS, REFERENCE_FIRST_START, deliveryScope, deliveryStarts, deliverySpec, locationKey, type DeliveryFilters } from './deliveryScope';
import { ExportContent } from './ExportContent';
import { FORECAST_COLUMNS, type ForecastColumn } from './exportColumns';
import { InventoryGallery } from './InventoryGallery';
import type { AnalysisRuntime } from './runtime';
import type { Universe } from './domain';
import { useExportPlan } from './useExportPlan';
import { REFERENCE_TRAINED_THROUGH } from '../expanded/referenceModels';
import './export-preview.css';
import './delivery.css';

export function ForecastDelivery({ universe, runtime, active, blocked, onBusy, onContext }: {
  universe: Universe; runtime: AnalysisRuntime; active: boolean; blocked: boolean; onBusy: (busy: boolean) => void; onContext: (filters: DeliveryFilters) => void;
}) {
  const [filters, setFilters] = useState<DeliveryFilters>({ ...DEFAULT_DELIVERY_FILTERS });
  const [inventory, setInventory] = useState<InventoryRow[]>([]), [capabilities, setCapabilities] = useState<Record<string, StudyMethod[]>>({});
  // Classificação vale para um mês de início; trocar o início reclassifica sem apagar a prévia anterior.
  const [classifiedFor, setClassifiedFor] = useState<string | null>(null), ready = classifiedFor === filters.start;
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [classified, setClassified] = useState(0), [classificationCancelled, setClassificationCancelled] = useState(false);
  const [columns, setColumns] = useState<ForecastColumn[]>([...FORECAST_COLUMNS]), [busy, setBusy] = useState(false);
  const [gallery, setGallery] = useState<'others' | 'sold' | null>(null);
  useEffect(() => {
    if (!active || blocked || ready || classificationCancelled) return;
    let live = true; const start = filters.start; setError(''); setClassified(0);
    void (async () => {
      try {
        const rows = await runtime.inventory(start), available: Record<string, StudyMethod[]> = {};
        for (let i = 0; i < rows.length; i += 16) {
          if (!live) return;
          Object.assign(available, await runtime.capabilities(rows.slice(i, i + 16).map(row => row.id), start));
          if (live) setClassified(Math.min(i + 16, rows.length));
        }
        if (live) { setInventory(rows); setCapabilities(available); setClassifiedFor(start); }
      } catch (e) { if (live) setError(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { live = false; };
  }, [runtime, active, blocked, ready, attempt, classificationCancelled, filters.start]);
  const scope = useMemo(() => deliveryScope(universe, inventory, capabilities, filters), [universe, inventory, capabilities, filters]);
  const spec = useMemo(() => deliverySpec(filters.duration, filters.start), [filters.duration, filters.start]);
  const starts = useMemo(() => deliveryStarts(sourcePeriods(universe.buildings)), [universe]);
  const monthLabel = (period: string) => `${period.slice(5, 7)}/${period.slice(0, 4)}`;
  const preparation = useExportPlan(universe, runtime, scope.ids, spec, active && ready && !blocked, true);
  const cities = useMemo(() => [...new Map(universe.areas.map(area => [locationKey(area), { value: locationKey(area), label: `${area.city}/${area.uf}` }])).values()], [universe]);
  function change(next: DeliveryFilters) { if (next.start !== filters.start) setClassificationCancelled(false); setFilters(next); onContext(next); }
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
      <Choice label="Começar a previsão em" value={filters.start} onChange={start => change({ ...filters, start })} items={[{ value: 'latest', label: 'Último dado de cada empreendimento' }, ...starts.map(value => ({ value, label: monthLabel(value) }))]} disabled={busy || blocked} />
      <Choice label="Prever por" value={String(filters.duration)} onChange={duration => change({ ...filters, duration: Number(duration) })} items={[1, 3, 6, 12, 24, 36].map(n => ({ value: String(n), label: `${n} ${n === 1 ? 'mês' : 'meses'}` }))} disabled={busy || blocked} />
    </div><p className="evd-hint">Os filtros definem o arquivo abaixo. Inícios a partir de {monthLabel(REFERENCE_FIRST_START)}.{filters.start !== 'latest' && ' Empreendimentos sem registro nesse mês ficam em “Sem referência”; meses já informados aparecem no arquivo como comparação histórica.'}{filters.start !== 'latest' && filters.start < REFERENCE_TRAINED_THROUGH && ` A referência foi calibrada com dados até ${monthLabel(REFERENCE_TRAINED_THROUGH)}: a comparação com os meses informados até lá não mede precisão.`}</p>
    <header className="evd-heading"><div><h2>Prévia das previsões</h2>{plan && <p>{plan.manifest.included} empreendimentos · {plan.forecasts.length} linhas · {plan.manifest.spec.cutoff === 'latest' ? `${plan.manifest.spec.duration} meses após o último dado de cada empreendimento` : `${plan.manifest.spec.duration} meses a partir de ${monthLabel(plan.manifest.spec.cutoff)}`}</p>}</div>
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
