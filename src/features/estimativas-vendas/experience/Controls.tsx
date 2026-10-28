import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { useGeoApiScope, type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { shiftMonth } from '../expanded/contract';
import { resolveAreas, type AnalysisSpec, type Area } from './domain';

export function Choice({ label, value, onChange, items, disabled = false }: { label: string; value: string; onChange: (s: string) => void; items: { value: string; label: string }[]; disabled?: boolean }) {
  return <label className="evx-field"><span>{label}</span><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{items.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent></Select></label>;
}
export function MultiChoice({ label, values, items, onChange, disabled = false }: { label: string; values: string[]; items: { value: string; label: string }[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  return <div className="evx-field"><span>{label}</span><Popover><PopoverTrigger asChild><Button role="combobox" aria-label={label} variant="outline" disabled={disabled} className="evx-multi-trigger">{values.length ? values.map(v => items.find(i => i.value === v)?.label).join(', ') : `Selecionar ${label.toLocaleLowerCase('pt-BR')}`}</Button></PopoverTrigger><PopoverContent className="w-[min(90vw,420px)] p-0"><Command><CommandInput placeholder={`Buscar ${label.toLocaleLowerCase('pt-BR')}`} /><CommandList><CommandEmpty>Nenhuma opção autorizada.</CommandEmpty>{items.map(i => <CommandItem key={i.value} value={i.label} onSelect={() => onChange(values.includes(i.value) ? values.filter(v => v !== i.value) : [...values, i.value])}><span aria-hidden="true">{values.includes(i.value) ? '✓' : '+'}</span> {i.label}<span className="sr-only">{values.includes(i.value) ? ' selecionado' : ''}</span></CommandItem>)}</CommandList></Command><Button variant="ghost" disabled={!values.length} onClick={() => onChange([])}>Limpar {label.toLocaleLowerCase('pt-BR')}</Button></PopoverContent></Popover></div>;
}
export function UniverseSelector({ onLoad }: { onLoad: (areas: Area[], ids: string[]) => void }) {
  const [geo, setGeo] = useState<GeoScope>({ uf: '', city: '' });
  const scope = useGeoApiScope({ value: geo, onChange: setGeo });
  const [region, setRegion] = useState('all'), [states, setStates] = useState<string[]>([]), [cities, setCities] = useState<Area[]>([]);
  const catalog = scope.citiesByUf;
  const availableUfs = useMemo(() => region === 'all' ? scope.availableUfs : scope.ufsByRegion?.[region] ?? [], [region, scope.availableUfs, scope.ufsByRegion]);
  const cityOptions = useMemo(() => (states.length ? states : availableUfs).flatMap(uf => (catalog?.[uf] ?? []).map(city => ({ uf, city }))), [states, availableUfs, catalog]);
  const areas = resolveAreas(catalog ?? {}, region === 'all' ? [] : availableUfs, states, cities);
  function changeRegion(value: string) { setRegion(value); setStates([]); setCities([]); }
  function changeStates(values: string[]) { setStates(values); setCities(v => v.filter(a => !values.length || values.includes(a.uf))); }
  return <section className="evx-panel evx-universe" aria-label="Escolher universo"><div className="evx-geography">
    <Choice label="Região" value={region} onChange={changeRegion} disabled={scope.isLoading || !scope.hasToken} items={[{ value: 'all', label: 'Todas as regiões' }, ...scope.availableRegions.map(value => ({ value, label: value }))]} />
    <MultiChoice label="Estados" values={states} onChange={changeStates} disabled={scope.isLoading || !scope.hasToken} items={availableUfs.map(value => ({ value, label: value }))} />
    <MultiChoice label="Cidades" values={cities.map(a => `${a.uf}|${a.city}`)} onChange={v => setCities(cityOptions.filter(a => v.includes(`${a.uf}|${a.city}`)))} disabled={scope.isLoading || !scope.hasToken || !availableUfs.length} items={cityOptions.map(a => ({ value: `${a.uf}|${a.city}`, label: `${a.city}/${a.uf}` }))} />
  </div>{scope.isLoading && <BrainLoadingState variant="field" title="Carregando cidades autorizadas" />}{!scope.hasToken && <p role="status">Entre com sua conta Geobrain pelo cabeçalho para consultar.</p>}{scope.error && <div role="alert"><p>Não foi possível carregar os territórios autorizados.</p><Button onClick={scope.reload}>Tentar novamente</Button></div>}
    <div className="evx-actions"><Button disabled={!scope.hasToken || !!scope.error || scope.isLoading || !areas.length} onClick={() => onLoad(areas, [])}>Carregar empreendimentos</Button><small>{areas.length ? `${areas.length} cidades · ${cities.length ? 'cidades escolhidas' : states.length ? 'estados completos' : 'região completa'}` : 'Escolha uma região, estados ou cidades'}</small></div>
  </section>;
}
export function TimeControls({ spec, periods, onChange }: { spec: AnalysisSpec; periods: string[]; onChange: (s: AnalysisSpec) => void }) {
  const index = periods.indexOf(spec.cutoff);
  return <section className="evx-time" aria-label="Período da previsão"><div className="evx-period-nav"><Button variant="outline" aria-label="Período anterior" disabled={index <= 0} onClick={() => onChange({ ...spec, cutoff: periods[index - 1] })}>←</Button><Choice label="Começar a previsão" value={spec.cutoff} onChange={cutoff => onChange({ ...spec, cutoff })} items={[...periods].reverse().map((value, i) => ({ value, label: `${value.slice(5)}/${value.slice(0, 4)}${i === 0 ? ' · último dado' : ''}` }))} /><Button variant="outline" aria-label="Próximo período" disabled={index < 0 || index >= periods.length - 1} onClick={() => onChange({ ...spec, cutoff: periods[index + 1] })}>→</Button></div><div className="evx-actions" role="group" aria-label="Duração da previsão">{[3, 6, 12, 24, 36].map(duration => <Button key={duration} variant={spec.duration === duration ? 'secondary' : 'ghost'} aria-pressed={spec.duration === duration} onClick={() => onChange({ ...spec, duration })}>{duration} meses</Button>)}</div><small>Somente períodos disponíveis · previsão até {shiftMonth(spec.cutoff, spec.duration)}. Escolher um período passado ativa a comparação histórica.</small></section>;
}
