import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { compareQuarters, quarterYear } from '../domain/quarters';
import type { Quarter } from '../types';

interface Props { start?: Quarter; end?: Quarter; options: Quarter[]; disabled?: boolean; onChange: (start: Quarter, end: Quarter) => void; }

export function PanoramaQuarterRangePicker({ start, end, options, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Quarter | null>(null);
  const years = useMemo(() => [...new Set(options.map(quarterYear))], [options]);
  const choose = (quarter: Quarter) => {
    if (!anchor) { setAnchor(quarter); return; }
    const first = compareQuarters(anchor, quarter) <= 0 ? anchor : quarter;
    const last = compareQuarters(anchor, quarter) <= 0 ? quarter : anchor;
    onChange(first, last); setAnchor(null); setOpen(false);
  };
  const activeStart = anchor ?? start;
  const label = start && end ? `${start.slice(0, 2)} ${start.slice(2)} – ${end.slice(0, 2)} ${end.slice(2)}` : 'Selecione o período';
  return <div className="space-y-1.5">
    <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Período da análise</label>
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setAnchor(null); }}>
      <PopoverTrigger asChild><Button type="button" variant="outline" disabled={disabled} className="h-9 w-[190px] justify-between px-3 text-sm font-normal"><span>{label}</span><ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50" /></Button></PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="end">
        <p className="mb-2 text-xs text-muted-foreground">{anchor ? 'Agora selecione o trimestre final.' : 'Selecione o início e depois o final.'}</p>
        <div className="space-y-3">
          {years.map((year) => <div key={year}><p className="mb-1 text-xs font-semibold text-foreground">{year}</p><div className="grid grid-cols-4 gap-1">
            {options.filter((quarter) => quarterYear(quarter) === year).map((quarter) => { const inRange = start && end && compareQuarters(quarter, start) >= 0 && compareQuarters(quarter, end) <= 0; const selected = quarter === activeStart || quarter === end; return <button key={quarter} type="button" onClick={() => choose(quarter)} className={cn('flex h-8 items-center justify-center rounded-md border text-xs transition-colors hover:bg-accent', inRange && 'bg-primary/10 text-primary', selected && 'border-primary bg-primary text-primary-foreground')} aria-label={`Selecionar ${quarter}`} aria-pressed={selected}>{quarter.slice(0, 2)} {quarter.slice(2)}{selected && <Check className="ml-1 h-3 w-3" />}</button>; })}
          </div></div>)}
        </div>
      </PopoverContent>
    </Popover>
  </div>;
}
