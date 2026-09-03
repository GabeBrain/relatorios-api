import { useMemo, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MUNICIPIOS_BR from '@/assets/municipios-br.json';

const municipalitiesByUf = MUNICIPIOS_BR as Record<string, string[]>;
const UFS = Object.keys(municipalitiesByUf).sort();

interface Props {
  uf: string;
  city: string;
  disabled?: boolean;
  onChange: (next: { uf: string; city: string }) => void;
}

/** Catálogo nacional usado pela RAIS; a seleção é local e pesquisável. */
export default function RaisMunicipalitySelector({ uf, city, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const cities = useMemo(() => municipalitiesByUf[uf] ?? [], [uf]);

  return <div className="flex flex-1 flex-wrap items-end gap-3"><div className="w-24 shrink-0 space-y-1.5"><Label htmlFor="employee-uf" className="text-[10px] uppercase tracking-wide text-muted-foreground">UF</Label><Select value={uf} onValueChange={(nextUf) => onChange({ uf: nextUf, city: '' })} disabled={disabled}><SelectTrigger id="employee-uf" className="h-9 text-sm"><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{UFS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="min-w-[260px] flex-1 space-y-1.5"><Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Município</Label><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" disabled={disabled || !uf} className="h-9 w-full justify-between px-3 text-sm font-normal"><span className="truncate">{city || (uf ? 'Digite para buscar o município' : 'Selecione a UF primeiro')}</span><ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[min(420px,var(--radix-popover-trigger-width))] p-0"><Command><CommandInput placeholder="Digite uma letra ou o nome do município…" className="h-9 text-sm" /><CommandList><CommandEmpty className="py-4 text-center text-xs text-muted-foreground">Nenhum município encontrado nesta UF.</CommandEmpty><CommandGroup>{cities.map((item) => <CommandItem key={item} value={item} onSelect={() => { onChange({ uf, city: item }); setOpen(false); }} className="text-sm">{item}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div></div>;
}
