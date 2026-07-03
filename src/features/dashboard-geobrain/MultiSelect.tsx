import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({ label, options, value, onChange, placeholder, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const summary = value.length === 0
    ? (placeholder ?? 'Todos')
    : value.length === 1
      ? options.find((o) => o.value === value[0])?.label ?? value[0]
      : `${value.length} selecionados`;

  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="h-9 w-full justify-between text-xs font-normal"
          >
            <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>{summary}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 flex-shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="flex items-center justify-between gap-1 border-b border-border p-2">
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
              className="rounded px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
            >
              <X className="h-3 w-3" /> Limpar
            </button>
          </div>
          <div className="border-b border-border p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">Sem resultados.</div>
            )}
            {filtered.map((o) => {
              const active = value.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent',
                    active && 'bg-accent/60',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
