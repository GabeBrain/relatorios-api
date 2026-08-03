import { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronsUpDown, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useGeoApiScope } from '@/features/shared/geo-api-scope-engine/use-geo-api-scope';
import { MAX_CITIES } from './use-vf-data';

interface Props {
  uf: string;
  cities: string[];
  onUfChange: (uf: string) => void;
  onCitiesChange: (cities: string[]) => void;
  onLoad: () => void;
  loading?: boolean;
}

/**
 * Seleção de UF + até MAX_CITIES municípios monitorados (GeoApiScopeEngine).
 * Sem fallback IBGE: em erro exibe a falha e não permite consulta.
 */
export function VFCityMultiSelect({ uf, cities, onUfChange, onCitiesChange, onLoad, loading }: Props) {
  const noop = useMemo(() => () => {}, []);
  const { availableUfs, citiesByUf, isLoading, error, hasToken, reload } = useGeoApiScope({
    value: { uf, city: '' },
    onChange: noop,
  });
  const [open, setOpen] = useState(false);

  const availableCities = useMemo(
    () => (citiesByUf && uf ? citiesByUf[uf] ?? [] : []),
    [citiesByUf, uf],
  );

  if (!hasToken) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Faça login no cabeçalho para carregar as cidades monitoradas.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">Falha ao carregar /monitored-cities: {error.message}</span>
        <Button type="button" size="sm" variant="outline" onClick={reload} className="h-7 gap-1 text-[11px]">
          <RefreshCw className="h-3 w-3" /> Tentar novamente
        </Button>
      </div>
    );
  }

  const atLimit = cities.length >= MAX_CITIES;

  function toggle(city: string) {
    if (cities.includes(city)) onCitiesChange(cities.filter((c) => c !== city));
    else if (!atLimit) onCitiesChange([...cities, city]);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-24 shrink-0 space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">UF</label>
        <Select
          value={uf}
          onValueChange={(next) => { if (next !== uf) { onUfChange(next); onCitiesChange([]); } }}
          disabled={isLoading || !citiesByUf}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={isLoading ? '…' : 'UF'} />
          </SelectTrigger>
          <SelectContent>
            {availableUfs.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[240px] flex-1 space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Municípios (até {MAX_CITIES})
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={isLoading || !citiesByUf || !uf}
              className="h-9 w-full justify-between px-3 text-sm font-normal"
            >
              <span className="truncate">
                {isLoading
                  ? 'Carregando cidades monitoradas…'
                  : !uf
                    ? 'Selecione a UF primeiro'
                    : cities.length === 0
                      ? 'Selecione os municípios'
                      : cities.length <= 2
                        ? cities.join(', ')
                        : `${cities.length} municípios selecionados`}
              </span>
              {isLoading
                ? <Loader2 className="ml-1 h-3.5 w-3.5 shrink-0 animate-spin opacity-60" />
                : <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Buscar município…" className="h-9 text-sm" />
              <CommandList>
                <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                  Nenhum município monitorado nesta UF.
                </CommandEmpty>
                <CommandGroup>
                  {availableCities.map((c) => {
                    const checked = cities.includes(c);
                    const blocked = !checked && atLimit;
                    return (
                      <CommandItem
                        key={c}
                        value={c}
                        disabled={blocked}
                        onSelect={() => toggle(c)}
                        className={blocked ? 'text-sm opacity-40' : 'text-sm'}
                      >
                        <span className="mr-2 flex h-4 w-4 items-center justify-center rounded border">
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                        {c}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
              {atLimit && (
                <div className="border-t px-3 py-2 text-[11px] text-amber-700">
                  Limite de {MAX_CITIES} cidades atingido.
                </div>
              )}
            </Command>
          </PopoverContent>
        </Popover>
        {cities.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9pt]"
                style={{
                  color: 'var(--vf-primary-strong)',
                  background: 'var(--vf-primary-soft)',
                  border: '1px solid var(--vf-primary)',
                }}
              >
                {c} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-[10px] font-medium uppercase tracking-wide text-transparent">Consultar</label>
        <button
          type="button"
          className="vf-btn"
          data-variant="primary"
          style={{ height: 36 }}
          disabled={!uf || cities.length === 0 || loading}
          onClick={onLoad}
        >
          {loading ? 'Carregando…' : 'Carregar'}
        </button>
      </div>
    </div>
  );
}
