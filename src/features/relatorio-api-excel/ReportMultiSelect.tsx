import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportFieldLabel } from './ReportFieldLabel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

/** Mesmo padrão Popover/Command dos filtros Brain, com seleção múltipla local. */
export function ReportMultiSelect({ id, label, options, value, onChange, disabled, help }: {
  id: string;
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  help?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((option) => value.includes(option));
  const all = options.length > 0 && selected.length === options.length;
  const summary = all ? 'Todos selecionados' : selected.length === 1 ? selected[0] || 'Não informado'
    : selected.length ? `${selected.length} selecionados` : 'Nenhum selecionado';
  return <div className="min-w-0 space-y-1.5">
    <ReportFieldLabel htmlFor={id} help={help}>{label}</ReportFieldLabel>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button id={id} aria-label={label} variant="outline" role="combobox" aria-expanded={open} disabled={disabled}
        className="h-10 w-full min-w-0 justify-between text-sm font-normal"><span className="truncate">{summary}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-32px)] p-0" align="start">
        <div className="flex justify-between border-b border-border p-1"><Button variant="ghost" size="sm" disabled={disabled || !options.length} onClick={() => onChange([...options])}>Selecionar todos</Button><Button variant="ghost" size="sm" disabled={disabled || !selected.length} onClick={() => onChange([])}>Limpar</Button></div>
        <Command><CommandInput placeholder={`Buscar ${label.toLocaleLowerCase('pt-BR')}…`} aria-label={`Buscar ${label}`} /><CommandList><CommandEmpty>Nenhuma opção encontrada.</CommandEmpty><CommandGroup>
          {options.map((option) => {
            const active = selected.includes(option);
            return <CommandItem key={option} value={option || '__not_informed__'} disabled={disabled} data-checked={active}
              onSelect={() => onChange(active ? value.filter((item) => item !== option) : [...value, option])}>
              <span aria-hidden="true" className={`mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>{active && <Check className="h-3 w-3" />}</span>
              <span className="truncate">{option || 'Não informado'}</span><span className="sr-only">{active ? ' — selecionado' : ' — não selecionado'}</span>
            </CommandItem>;
          })}
        </CommandGroup></CommandList></Command>
      </PopoverContent>
    </Popover>
  </div>;
}
