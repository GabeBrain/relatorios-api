import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { compareQuarters, quarterYear } from '../domain/quarters';
import type { Quarter } from '../types';

interface Props { start?: Quarter; end?: Quarter; options: Quarter[]; disabled?: boolean; onChange: (start: Quarter, end: Quarter) => void; }
const label = (quarter: Quarter) => `${quarter.slice(0, 2)} ${quarter.slice(2)}`;

export function PanoramaQuarterRangePicker({ start, end, options, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Quarter | null>(null);
  const [draft, setDraft] = useState<{ start?: Quarter; end?: Quarter }>({ start, end });
  const years = useMemo(() => [...new Set(options.map(quarterYear))], [options]);

  const openPicker = (next: boolean) => {
    setOpen(next);
    if (next) { setAnchor(null); setDraft({ start, end }); }
    else setAnchor(null);
  };
  const choose = (quarter: Quarter) => {
    if (!anchor) { setAnchor(quarter); setDraft({ start: quarter }); return; }
    const first = compareQuarters(anchor, quarter) <= 0 ? anchor : quarter;
    const last = compareQuarters(anchor, quarter) <= 0 ? quarter : anchor;
    setDraft({ start: first, end: last }); setAnchor(null);
  };
  const confirm = () => { if (!draft.start || !draft.end) return; onChange(draft.start, draft.end); setOpen(false); setAnchor(null); };
  const appliedLabel = start && end ? `${label(start)} – ${label(end)}` : 'Selecione o período';
  const draftLabel = draft.start && draft.end ? `${label(draft.start)} – ${label(draft.end)}` : draft.start ? `${label(draft.start)} – selecione o final` : 'Nenhum intervalo selecionado';

  return <div className="space-y-1.5">
    <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Período da análise</label>
    <Popover open={open} onOpenChange={openPicker}>
      <PopoverTrigger asChild><Button type="button" variant="outline" disabled={disabled} className="h-9 w-full min-w-[190px] justify-between px-3 text-sm font-normal"><span className="truncate">{appliedLabel}</span><ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" /></Button></PopoverTrigger>
      <PopoverContent className="w-[340px] p-3" align="end">
        <div className="mb-3 rounded-lg bg-muted/60 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Novo período</p><p className="mt-0.5 text-sm font-semibold text-foreground">{draftLabel}</p><p className="mt-1 text-[11px] text-muted-foreground">{anchor ? 'Agora escolha o trimestre final.' : 'Clique no início e depois no final.'}</p></div>
        <div className="space-y-3">
          {years.map((year) => <div key={year}><p className="mb-1 text-xs font-semibold text-foreground">{year}</p><div className="grid grid-cols-4 gap-1">
            {options.filter((quarter) => quarterYear(quarter) === year).map((quarter) => { const inRange = draft.start && draft.end && compareQuarters(quarter, draft.start) >= 0 && compareQuarters(quarter, draft.end) <= 0; const selected = quarter === draft.start || quarter === draft.end; return <button key={quarter} type="button" onClick={() => choose(quarter)} className={cn('flex h-8 items-center justify-center rounded-md border text-xs transition-colors hover:border-primary/50 hover:bg-accent', inRange && 'border-primary/20 bg-primary/10 text-primary', selected && 'border-primary bg-primary text-primary-foreground')} aria-label={`Selecionar ${quarter}`} aria-pressed={selected}>{label(quarter)}{selected && <Check className="ml-1 h-3 w-3" />}</button>; })}
          </div></div>)}
        </div>
        <div className="mt-3 flex justify-end gap-2 border-t pt-3"><Button type="button" variant="ghost" size="sm" onClick={() => openPicker(false)}>Cancelar</Button><Button type="button" size="sm" disabled={!draft.start || !draft.end} onClick={confirm}>Confirmar período</Button></div>
      </PopoverContent>
    </Popover>
  </div>;
}
