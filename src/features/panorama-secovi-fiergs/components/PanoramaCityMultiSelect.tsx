import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { matchCityList } from '../domain/city-list';
import { normalizeText } from '../domain/taxonomy';

interface Props {
  cities: string[];
  options: string[];
  disabled?: boolean;
  loading?: boolean;
  onChange: (cities: string[]) => void;
}

export function PanoramaCityMultiSelect({ cities, options, disabled, loading, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState('');
  const catalogKey = options.join('\0');
  useEffect(() => { setQuery(''); setFeedback(''); }, [catalogKey]);
  const batch = useMemo(() => matchCityList(query, options), [query, options]);
  const filtered = options.filter((city) => normalizeText(city).includes(normalizeText(query.trim())));
  const applyList = () => {
    if (disabled || loading || !batch.matched.length) return;
    const next = [...new Set([...cities, ...batch.matched])].sort((a,b) => a.localeCompare(b,'pt-BR'));
    onChange(next);
    setFeedback(`${batch.matched.length} ${batch.matched.length===1?'cidade reconhecida':'cidades reconhecidas'}.${batch.missing.length ? ` Não encontradas nas cidades disponíveis desta UF: ${batch.missing.join(', ')}.` : ''}`);
    setQuery(''); setOpen(false);
  };
  const selected = useMemo(() => new Set(cities), [cities]);
  const ordered = useMemo(() => [...cities].sort((a, b) => a.localeCompare(b, 'pt-BR')), [cities]);

  const toggle = (city: string) => {
    const next = selected.has(city) ? cities.filter((item) => item !== city) : [...cities, city];
    if (disabled || loading) return;
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
      <PopoverContent className="w-[min(420px,calc(100vw-2rem))] p-0" align="start">
        <Command label="Buscar municípios" shouldFilter={false}>
          <CommandInput aria-label="Buscar municípios" value={query} onValueChange={setQuery} onPaste={event=>{const text=event.clipboardData.getData('text');if(matchCityList(text,options).isList){event.preventDefault();setQuery(text);}}} placeholder="Busque ou cole uma lista de cidades…" className="h-9 text-sm" />
          {batch.isList ? <>
            <CommandList><CommandGroup><CommandItem value="selecionar-lista" disabled={!batch.matched.length || disabled || loading} onSelect={applyList} className="text-sm"><Check className="mr-2 h-4 w-4"/>Selecionar {batch.matched.length} {batch.matched.length===1?'cidade':'cidades'} da lista</CommandItem></CommandGroup></CommandList>
            <div className="max-h-40 overflow-y-auto space-y-2 border-t px-3 py-3 text-xs" role="status">
              {batch.matched.length > 0 && <p className="text-muted-foreground">{batch.matched.join(' · ')}</p>}
              {batch.missing.length > 0 && <p className="text-destructive">Não encontradas nesta UF: {batch.missing.join(', ')}.</p>}
            </div>
          </> : <CommandList>
            {!filtered.length && <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">Nenhum município monitorado nesta UF.</CommandEmpty>}
            <CommandGroup>
              {filtered.map((city) => <CommandItem key={city} value={city} disabled={disabled || loading} onSelect={() => toggle(city)} className="text-sm">
                <Check className={cn('mr-2 h-4 w-4', selected.has(city) ? 'opacity-100' : 'opacity-0')} />{city}
              </CommandItem>)}
            </CommandGroup>
          </CommandList>}
          {!batch.isList && <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">Pode colar nomes separados por vírgula ou “e”.</p>}
        </Command>
      </PopoverContent>
    </Popover>
    <div className="flex max-h-12 min-h-6 flex-wrap items-center gap-1 overflow-y-auto" aria-live="polite">
      {ordered.length ? ordered.map((city) => <Badge key={city} variant="secondary" className="gap-1 pr-1 text-[11px]">
        {city}<button type="button" aria-label={`Remover ${city}`} disabled={disabled || loading} className="rounded-full p-0.5 hover:bg-background/70" onClick={() => toggle(city)}><X className="h-3 w-3" /></button>
      </Badge>) : <span className="text-[11px] text-muted-foreground">Nenhuma cidade selecionada</span>}
      {ordered.length > 1 && <button type="button" disabled={disabled || loading} className="ml-1 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => onChange([])}>Limpar seleção</button>}
    </div>
    {feedback && <p role="status" className="text-xs text-muted-foreground">{feedback}</p>}
  </div>;
}
