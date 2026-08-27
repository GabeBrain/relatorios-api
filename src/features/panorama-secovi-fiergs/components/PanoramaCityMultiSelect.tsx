import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Props {
  cities: string[];
  options: string[];
  disabled?: boolean;
  loading?: boolean;
  onChange: (cities: string[]) => void;
}

export function PanoramaCityMultiSelect({ cities, options, disabled, loading, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => new Set(cities), [cities]);
  const ordered = useMemo(() => [...cities].sort((a, b) => a.localeCompare(b, 'pt-BR')), [cities]);

  const toggle = (city: string) => {
    const next = selected.has(city) ? cities.filter((item) => item !== city) : [...cities, city];
    onChange([...next].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  };
  const label = loading ? 'Carregando cidades monitoradas…' : ordered.length === 0 ? 'Selecione municípios' : ordered.length === 1 ? ordered[0] : `${ordered.length} municípios selecionados`;

  return <div className="space-y-1.5">
    <label htmlFor="panorama-cities-trigger" className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Municípios (selecione um ou mais)</label>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id="panorama-cities-trigger" type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled || loading || !options.length} className="h-9 w-full justify-between px-3 text-sm font-normal">
          <span className="truncate">{label}</span><ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar município…" className="h-9 text-sm" />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">Nenhum município monitorado nesta UF.</CommandEmpty>
            <CommandGroup>
              {options.map((city) => <CommandItem key={city} value={city} onSelect={() => toggle(city)} className="text-sm">
                <Check className={cn('mr-2 h-4 w-4', selected.has(city) ? 'opacity-100' : 'opacity-0')} />{city}
              </CommandItem>)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <div className="flex min-h-6 flex-wrap items-center gap-1" aria-live="polite">
      {ordered.length ? ordered.map((city) => <Badge key={city} variant="secondary" className="gap-1 pr-1 text-[11px]">
        {city}<button type="button" aria-label={`Remover ${city}`} className="rounded-full p-0.5 hover:bg-background/70" onClick={() => toggle(city)}><X className="h-3 w-3" /></button>
      </Badge>) : <span className="text-[11px] text-muted-foreground">Nenhuma cidade selecionada</span>}
      {ordered.length > 1 && <button type="button" className="ml-1 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => onChange([])}>Limpar seleção</button>}
    </div>
  </div>;
}
