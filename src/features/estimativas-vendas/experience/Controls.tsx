import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GeoApiScopeSelector, useGeoApiScope, type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { monthIndex, shiftMonth } from '../expanded/contract';
import type { AnalysisSpec, Area } from './domain';

export function Choice({ label, value, onChange, items, disabled = false }: { label: string; value: string; onChange: (s: string) => void; items: { value: string; label: string }[]; disabled?: boolean }) {
  return <label className="evx-field"><span>{label}</span><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{items.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent></Select></label>;
}
export function UniverseSelector({ onLoad }: { onLoad: (areas: Area[], ids: string[]) => void }) {
  const [geo, setGeo] = useState<GeoScope>({ uf: '', city: '' });
  const scope = useGeoApiScope({ value: geo, onChange: setGeo });
  const [mode, setMode] = useState('cities'), [cities, setCities] = useState<Area[]>([]), [uf, setUf] = useState(''), [region, setRegion] = useState(''), [idsText, setIdsText] = useState('');
  const ids = useMemo(() => [...new Set(idsText.split(/[\s,;]+/).filter(Boolean))], [idsText]);
  const areas = useMemo(() => {
    if (mode === 'cities') return cities.filter(a => scope.citiesByUf?.[a.uf]?.includes(a.city));
    const ufs = mode === 'uf' ? [uf] : mode === 'region' ? scope.ufsByRegion?.[region] ?? [] : scope.availableUfs;
    return ufs.flatMap(uf => (scope.citiesByUf?.[uf] ?? []).map(city => ({ uf, city })));
  }, [mode, cities, scope.citiesByUf, scope.ufsByRegion, scope.availableUfs, uf, region]);
  const valid = scope.hasToken && !scope.error && !scope.isLoading && areas.length > 0 && (mode !== 'ids' || ids.length > 0 && ids.every(id => /^\d+$/.test(id)));
  function changeMode(next: string) { setMode(next); }
  return <section className="evx-panel evx-universe" aria-label="Escolher universo"><p className="evx-eyebrow">01 · Universo</p><h2>Onde vamos analisar as vendas?</h2><p>Escolha o recorte. Depois da consulta, datas, gráficos e filtros usam os dados já carregados.</p>
    <div className="evx-actions" role="group" aria-label="Entrada territorial">{[['cities', 'Cidades'], ['uf', 'Estado'], ['region', 'Região'], ['ids', 'Lista de empreendimentos']].map(([id, label]) => <Button key={id} variant={mode === id ? 'secondary' : 'ghost'} aria-pressed={mode === id} onClick={() => changeMode(id)}>{label}</Button>)}</div>
    {mode === 'cities' && <><GeoApiScopeSelector value={geo} onChange={setGeo} /><Button variant="outline" disabled={!scope.strictReady || cities.some(a => a.uf === geo.uf && a.city === geo.city)} onClick={() => setCities(v => [...v, geo])}>Adicionar cidade</Button><div className="evx-actions">{cities.map(a => <Button variant="secondary" key={`${a.uf}/${a.city}`} onClick={() => setCities(v => v.filter(x => x !== a))} aria-label={`Remover ${a.city}`}>{a.city}/{a.uf} ×</Button>)}</div></>}
    {mode === 'uf' && <Choice label="Estado autorizado" value={uf} onChange={setUf} items={scope.availableUfs.map(value => ({ value, label: value }))} />}
    {mode === 'region' && <Choice label="Região autorizada" value={region} onChange={setRegion} items={scope.availableRegions.map(value => ({ value, label: value }))} />}
    {mode === 'ids' && <label className="evx-field">IDs dos empreendimentos<Input value={idsText} onChange={e => setIdsText(e.target.value)} placeholder="IDs separados por vírgula ou espaço" /><small>A busca percorre as cidades autorizadas; pode exigir muitas consultas.</small></label>}
    {scope.isLoading && <BrainLoadingState variant="field" title="Carregando cidades autorizadas" />}
    {!scope.hasToken && <p role="status">Entre com sua conta Geobrain pelo cabeçalho para consultar.</p>}
    {scope.error && <div role="alert"><p>Não foi possível carregar cidades autorizadas.</p><Button onClick={scope.reload}>Tentar novamente</Button></div>}
    <div className="evx-actions"><Button disabled={!valid} onClick={() => onLoad(areas, mode === 'ids' ? ids : [])}>Carregar empreendimentos</Button><small>{areas.length} cidades autorizadas no recorte · horizontais e verticais</small></div>
  </section>;
}

export function TimeControls({ spec, first, latest, onChange }: { spec: AnalysisSpec; first: string; latest: string; onChange: (s: AnalysisSpec) => void }) {
  const min = monthIndex(first), max = monthIndex(latest), current = monthIndex(spec.cutoff), end = current + spec.duration;
  function start(value: string) { if (value >= first && value <= latest) onChange({ ...spec, cutoff: value }); }
  function finish(value: string) { const months = monthIndex(value) - current; if (months >= 1 && months <= 36) onChange({ ...spec, duration: months }); }
  return <section className="evx-time" aria-label="Período da previsão">
    <div className="evx-time-fields"><label className="evx-field">Prever a partir de<Input type="month" min={first} max={latest} value={spec.cutoff} onChange={e => start(e.target.value)} /></label><label className="evx-field">Final da previsão<Input type="month" min={shiftMonth(spec.cutoff, 1)} max={shiftMonth(spec.cutoff, 36)} value={shiftMonth(spec.cutoff, spec.duration)} onChange={e => finish(e.target.value)} /></label><span>{spec.duration} meses · dados usados até {spec.cutoff}</span></div>
    <label className="evx-field">Início da previsão · {spec.cutoff}<input aria-label="Início da previsão" type="range" min={min} max={max} value={current} onChange={e => start(shiftMonth(first, Number(e.target.value) - min))} aria-valuetext={spec.cutoff} /></label>
    <label className="evx-field">Duração da previsão · {spec.duration} meses<input aria-label="Duração da previsão" type="range" min={current + 1} max={current + 36} value={end} onChange={e => finish(shiftMonth(spec.cutoff, Number(e.target.value) - current))} aria-valuetext={`${spec.duration} meses; final ${shiftMonth(spec.cutoff, spec.duration)}`} /></label>
    <small>Mover o início mantém a duração. O final altera a duração, de 1 a 36 meses. O zoom do gráfico só muda a visualização.</small>
  </section>;
}
