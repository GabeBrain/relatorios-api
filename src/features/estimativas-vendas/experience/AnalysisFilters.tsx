import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Choice } from './Controls';

type Props = {
  search: string; onSearch: (v: string) => void;
  duration: number; onDuration: (v: number) => void;
  availability: string; onAvailability: (v: string) => void;
  type: string; onType: (v: string) => void;
  city: string; onCity: (v: string) => void; cities: string[];
  showSold: boolean; onShowSold: () => void; ready: boolean;
  others: number; sold: number; onOthers: () => void; onSold: () => void;
};
export function AnalysisFilters(p: Props) {
  return <section className="evx-analysis-controls" aria-label="Controles da análise">
    <div className="evx-search-duration">
      <label className="evx-field evx-search">Pesquisar empreendimento<Input placeholder="Nome ou ID" value={p.search} onChange={e => p.onSearch(e.target.value)} /></label>
      <div role="group" aria-label="Duração da previsão"><p className="evx-control-label">Prever por</p><div className="evx-actions evx-text-options">{[1, 3, 6, 12, 24, 36].map(n => <Button key={n} variant="ghost" aria-pressed={p.duration === n} onClick={() => p.onDuration(n)}>{n} {n === 1 ? 'mês' : 'meses'}</Button>)}</div></div>
    </div>
    <div className="evx-filter-line">
      <div role="group" aria-label="Disponibilidade de previsão"><p className="evx-control-label">Previsão disponível</p><div className="evx-actions evx-text-options">{[{ value: 'finotti', label: 'Finotti' }, { value: 'all', label: 'Mostrar todos' }, { value: 'any', label: 'Algum método' }, { value: 'none', label: 'Sem método' }].map(o => <Button key={o.value} variant="ghost" disabled={!p.ready} aria-pressed={p.availability === o.value} onClick={() => p.onAvailability(o.value)}>{o.label}</Button>)}</div></div>
      <div role="group" aria-label="Tipo de empreendimento"><p className="evx-control-label">Tipo</p><div className="evx-actions evx-text-options">{['all', 'Horizontal', 'Vertical'].map(v => <Button key={v} variant="ghost" aria-pressed={p.type === v} onClick={() => p.onType(v)}>{v === 'all' ? 'Todos os tipos' : v}</Button>)}</div></div>
      {p.cities.length > 1 && <Choice label="Cidade" value={p.city} onChange={p.onCity} items={['all', ...p.cities].map(value => ({ value, label: value === 'all' ? 'Todas as cidades' : value }))} />}
    </div>
    <div className="evx-scope-notes"><Button variant="ghost" disabled={!p.ready} onClick={p.onOthers}>Outros empreendimentos ({p.others}) ↗</Button><Button variant="ghost" onClick={p.onSold}>Esgotados ({p.sold}) ↗</Button><Button variant="ghost" aria-pressed={p.showSold} onClick={p.onShowSold}>{p.showSold ? 'Ocultar esgotados' : 'Incluir esgotados'}</Button><small>Filtros não alteram sua seleção para baixar.</small></div>
  </section>;
}
