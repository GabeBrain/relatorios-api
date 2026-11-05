import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { defaultTerritorialPresentation, territorialPresentationErrors } from '../domain/territorial-presentation';
import type { TerritorialPresentation } from '../types';

export function TerritorialComparisonEditor({ cities, value = { mode: 'consolidated' }, onChange, disabled }: {
  cities: string[]; value?: TerritorialPresentation; onChange: (value: TerritorialPresentation) => void; disabled?: boolean;
}) {
  if (cities.length < 2) return null;
  const units = value.units ?? []; const errors = territorialPresentationErrors({ cities, presentation: value });
  return <div className="panorama-territorial-editor mt-4 space-y-3 border-t border-border pt-4">
    <div className="flex flex-wrap items-end gap-3"><div className="w-64 space-y-1"><label htmlFor="territorial-mode" className="text-xs text-muted-foreground">Apresentação dos territórios</label>
      <Select value={value.mode} disabled={disabled} onValueChange={(mode) => onChange(mode === 'consolidated' ? { mode: 'consolidated' } : cities.length <= 3 ? defaultTerritorialPresentation(cities)
        : { mode: 'comparison', units: [{ id: 'group-a', label: 'Território 1', cities: [] }, { id: 'group-b', label: 'Território 2', cities: [] }] })}>
        <SelectTrigger id="territorial-mode"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="consolidated">Consolidado</SelectItem><SelectItem value="comparison">Comparar cidades ou grupos</SelectItem></SelectContent>
      </Select></div><p className="text-xs text-muted-foreground">Uma visão conjunta ou até três territórios comparados.</p></div>
    {value.mode === 'comparison' && <>
      <div className="grid gap-3 md:grid-cols-3">{units.map((unit, index) => <div key={unit.id} className="space-y-2">
        <label htmlFor={`territory-${unit.id}`} className="text-xs">Nome do território {index + 1}</label>
        <Input id={`territory-${unit.id}`} maxLength={60} value={unit.label} disabled={disabled} onChange={(event) => onChange({ ...value, units: units.map((u) => u.id === unit.id ? { ...u, label: event.target.value } : u) })}/>
        <p className="text-xs text-muted-foreground">{unit.cities.length} {unit.cities.length === 1 ? 'cidade' : 'cidades'}</p>
        {units.length > 2 && <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onChange({ ...value, units: units.filter((u) => u.id !== unit.id) })}>Remover território {index + 1}</Button>}
      </div>)}</div>
      {units.length < 3 && <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange({ ...value, units: [...units, { id: `group-${crypto.randomUUID()}`, label: 'Território 3', cities: [] }] })}>Adicionar terceiro território</Button>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cities.map((city) => <div className="space-y-1" key={city}><label htmlFor={`assign-${city}`} className="text-xs">{city}</label>
        <Select value={units.find((u) => u.cities.includes(city))?.id ?? 'unassigned'} disabled={disabled} onValueChange={(id) => onChange({ ...value, units: units.map((u) => ({ ...u, cities: [...u.cities.filter((c) => c !== city), ...(u.id === id ? [city] : [])] })) })}>
          <SelectTrigger id={`assign-${city}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="unassigned">Escolha um território</SelectItem>{units.map((u, index) => <SelectItem key={u.id} value={u.id}>{u.label || `Território ${index + 1}`}</SelectItem>)}</SelectContent>
        </Select></div>)}</div>
      {!!errors.length && <p role="status" className="text-xs text-destructive">{errors.join(' ')}</p>}
    </>}
  </div>;
}
