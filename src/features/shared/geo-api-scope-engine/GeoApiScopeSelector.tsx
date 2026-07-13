import { useState } from 'react';
import { AlertTriangle, ChevronsUpDown, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useGeoApiScope } from './use-geo-api-scope';
import type { GeoScope } from './types';

interface Props {
  value: GeoScope;
  onChange: (next: GeoScope) => void;
  disabled?: boolean;
  className?: string;
  ufLabel?: string;
  cityLabel?: string;
  cityContainerClassName?: string;
}

export function GeoApiScopeSelector({
  value,
  onChange,
  disabled,
  className,
  ufLabel = 'UF',
  cityLabel = 'Município',
  cityContainerClassName,
}: Props) {
  const {
    availableUfs, availableCities, setUf, setCity,
    isLoading, error, hasToken, reload, citiesByUf,
  } = useGeoApiScope({ value, onChange });
  const [cityOpen, setCityOpen] = useState(false);

  if (!hasToken) {
    return (
      <div className={cn('flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800', className)}>
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Faça login no cabeçalho para carregar as cidades monitoradas.
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive', className)}>
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          Falha ao carregar /monitored-cities: {error.message}
        </span>
        <Button type="button" size="sm" variant="outline" onClick={reload} className="h-7 gap-1 text-[11px]">
          <RefreshCw className="h-3 w-3" /> Tentar novamente
        </Button>
      </div>
    );
  }

  const ufDisabled = disabled || isLoading || !citiesByUf;
  const cityDisabled = disabled || isLoading || !citiesByUf || !value.uf;

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <div className="w-24 shrink-0 space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{ufLabel}</label>
        <Select value={value.uf} onValueChange={setUf} disabled={ufDisabled}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={isLoading ? '…' : 'UF'} />
          </SelectTrigger>
          <SelectContent>
            {availableUfs.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[200px] flex-1 space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{cityLabel}</label>
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={cityDisabled}
              className="h-9 w-full justify-between px-3 text-sm font-normal"
            >
              <span className="truncate">
                {isLoading
                  ? 'Carregando cidades monitoradas…'
                  : value.city
                    ? value.city
                    : value.uf
                      ? 'Selecione o município'
                      : 'Selecione a UF primeiro'}
              </span>
              {isLoading
                ? <Loader2 className="ml-1 h-3.5 w-3.5 shrink-0 animate-spin opacity-60" />
                : <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0">
            <Command>
              <CommandInput placeholder="Buscar município…" className="h-9 text-sm" />
              <CommandList>
                <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                  Nenhum município monitorado nesta UF.
                </CommandEmpty>
                <CommandGroup>
                  {availableCities.map((c) => (
                    <CommandItem
                      key={c}
                      value={c}
                      onSelect={() => { setCity(c); setCityOpen(false); }}
                      className="text-sm"
                    >
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
