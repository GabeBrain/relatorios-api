import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ReportFieldLabel } from './ReportFieldLabel';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Calendário de competências: seleciona só mês/ano e sempre emite o dia 01. */
export function MonthField({ id, label, value, onChange, help }: {
  id: string; label: string; value: string; onChange: (value: string) => void; help?: string;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const numericYear = Number(year);
  const validYear = /^\d{4}$/.test(year) && numericYear >= 1000 && numericYear <= 9999;
  const changeOpen = (next: boolean) => {
    if (next) setYear(value ? value.slice(0, 4) : String(new Date().getFullYear()));
    setOpen(next);
  };
  return <div className="space-y-1.5">
    <ReportFieldLabel htmlFor={id} help={help}>{label}</ReportFieldLabel>
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button id={id} aria-label={label} variant="outline" className="w-full justify-between font-normal">
          <span>{value ? `01/${value.slice(5, 7)}/${value.slice(0, 4)}` : 'Selecionar mês e ano'}</span>
          <CalendarDays className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent role="dialog" aria-label={`Escolher mês — ${label}`} className="w-[min(300px,calc(100vw-32px))] space-y-3" align="start">
        <div className="flex items-end gap-2">
          <Button aria-label="Ano anterior" variant="outline" size="icon" disabled={!validYear || numericYear <= 1000} onClick={() => setYear(String(numericYear - 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-0 flex-1 space-y-1"><Label htmlFor={`${id}-year`}>Ano</Label><Input id={`${id}-year`} type="number" min={1000} max={9999} value={year} onChange={(event) => setYear(event.target.value)} /></div>
          <Button aria-label="Ano seguinte" variant="outline" size="icon" disabled={!validYear || numericYear >= 9999} onClick={() => setYear(String(numericYear + 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((month, index) => {
            const date = `${year}-${String(index + 1).padStart(2, '0')}-01`;
            return <Button key={month} variant={value === date ? 'default' : 'ghost'} aria-label={`${month} de ${year}`} aria-pressed={value === date} disabled={!validYear} className="text-xs capitalize" onClick={() => { onChange(date); setOpen(false); }}>{month.slice(0, 3)}</Button>;
          })}
        </div>
        {!validYear && <p role="alert" className="text-xs text-destructive">Informe um ano entre 1000 e 9999.</p>}
        <p className="text-xs text-muted-foreground">Dia fixo 01. O filtro considera o mês completo do histórico.</p>
        <Button variant="outline" size="sm" onClick={() => { onChange(''); setOpen(false); }}>Limpar data</Button>
      </PopoverContent>
    </Popover>
  </div>;
}
