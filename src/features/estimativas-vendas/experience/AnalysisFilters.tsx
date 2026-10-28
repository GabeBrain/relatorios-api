import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Choice } from './Controls';

type Props = {
  open: boolean; onOpenChange: (open: boolean) => void;
  duration: number; onDuration: (v: number) => void;
  availability: string; onAvailability: (v: string) => void;
  type: string; onType: (v: string) => void;
  city: string; onCity: (v: string) => void; cities: string[];
  view: string; onView: (v: 'map' | 'list') => void; ready: boolean;
  others: number; sold: number; onOthers: () => void; onSold: () => void;
};
export function AnalysisFilters(p: Props) {
  return <Sheet open={p.open} onOpenChange={p.onOpenChange}><SheetContent side="right" className="evs-settings"><SheetTitle>Configurações da análise</SheetTitle><SheetDescription>Ajuste a visualização com os dados já carregados. Estimativas aprovadas identifica a referência matemática disponível; não indica homologação para importação.</SheetDescription>
    <section><h3>Projeção</h3><div role="group" aria-label="Duração da previsão"><p className="evx-control-label">Prever por</p><div className="evx-actions evx-text-options">{[1, 3, 6, 12, 24, 36].map(n => <Button key={n} variant="ghost" aria-pressed={p.duration === n} onClick={() => p.onDuration(n)}>{n} {n === 1 ? 'mês' : 'meses'}</Button>)}</div></div></section>
    <section><h3>Empreendimentos exibidos</h3><div role="group" aria-label="Disponibilidade de previsão"><p className="evx-control-label">Previsão disponível</p><div className="evx-actions evx-text-options">{[{ value: 'finotti', label: 'Estimativas aprovadas' }, { value: 'all', label: 'Mostrar todos' }, { value: 'any', label: 'Algum método' }, { value: 'none', label: 'Sem método' }].map(o => <Button key={o.value} variant="ghost" disabled={!p.ready} aria-pressed={p.availability === o.value} onClick={() => p.onAvailability(o.value)}>{o.label}</Button>)}</div></div>
      <div role="group" aria-label="Tipo de empreendimento"><p className="evx-control-label">Tipo</p><div className="evx-actions evx-text-options">{['all', 'Horizontal', 'Vertical'].map(v => <Button key={v} variant="ghost" aria-pressed={p.type === v} onClick={() => p.onType(v)}>{v === 'all' ? 'Todos os tipos' : v}</Button>)}</div></div>
      {p.cities.length > 1 && <Choice label="Cidade" value={p.city} onChange={p.onCity} items={['all', ...p.cities].map(value => ({ value, label: value === 'all' ? 'Todas as cidades' : value }))} />}
    </section>
    <section><h3>Apresentação</h3><div className="evx-actions evx-text-options"><Button variant="ghost" aria-pressed={p.view === 'map'} onClick={() => p.onView('map')}>Mapa de curvas</Button><Button variant="ghost" aria-pressed={p.view === 'list'} onClick={() => p.onView('list')}>Lista de curvas</Button></div></section>
    <section><h3>Sobre o universo</h3><Button variant="ghost" disabled={!p.ready} onClick={p.onOthers}>Outros empreendimentos ({p.others}) ↗</Button><Button variant="ghost" onClick={p.onSold}>Esgotados ({p.sold}) ↗</Button><p className="evs-note">Esgotados ficam disponíveis para consulta, fora das projeções atuais.</p></section>
    <Button variant="outline" onClick={() => p.onOpenChange(false)}>Voltar às curvas</Button>
  </SheetContent></Sheet>;
}
