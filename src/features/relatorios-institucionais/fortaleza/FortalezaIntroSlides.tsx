import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FORTALEZA_CITIES, FORTALEZA_REFERENCES, type FortalezaSelection } from './model';
import type { IntroData } from './intro-data';
import { buildIntroView } from './intro-view';
import FortalezaIntroSlide from './FortalezaIntroSlide';
import { INTRO_LAYOUTS } from './intro-layout';

export default function FortalezaIntroSlides({ selection, cities, data }: { selection: FortalezaSelection; cities: string[]; data: IntroData | null }) {
  const [page, setPage] = useState(1), [expanded, setExpanded] = useState(false);
  const model = selection.periodicity === 'monthly' ? 'julho' : 'junho';
  const view = buildIntroView(selection, cities.length ? cities : [...FORTALEZA_CITIES], data);
  const source = FORTALEZA_REFERENCES[model === 'junho' ? 0 : 1];
  const capacity = (start: number, end: number) => INTRO_LAYOUTS[model].slice(start - 1, end).reduce((sum, layout) => sum + (layout.shapes.find(shape => shape.slot === 'table')?.rows ?? 1) - 1, 0);
  const overflow = Math.max(0, (view.capital?.length ?? 0) - capacity(3, 4)) + Math.max(0, (view.rm?.length ?? 0) - capacity(5, 7));
  const pending = page === 2 ? 'Amostra histórica e empresas pesquisadas aguardam fonte própria; não são copiadas da edição antiga.' : page >= 3 && page <= 4 && cities.length && !cities.includes('Fortaleza') ? 'Fortaleza não integra o recorte escolhido; a lista da capital permanece indisponível.' : page >= 5 && page <= 7 && cities.length === 1 && cities[0] === 'Fortaleza' ? 'Municípios da região metropolitana não integram o recorte escolhido.' : page >= 3 && page <= 7 && data?.status !== 'ready' ? 'Lista de lançamentos ainda indisponível. Gere a prévia para conferir o cadastro.' : page === 10 && !view.history ? 'Gráfico de empreendimentos indisponível. Exige o conjunto completo de cinco cidades, cadastro conferido e classificação horizontal explícita.' : null;
  const navigation = <nav className="flex flex-wrap gap-2" aria-label="Primeiros dez slides"><Button variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</Button>{Array.from({ length: 10 }, (_, index) => index + 1).map(number => <Button key={number} variant={page === number ? 'default' : 'outline'} aria-pressed={page === number} onClick={() => setPage(number)}>{number}</Button>)}<Button variant="outline" disabled={page === 10} onClick={() => setPage(value => value + 1)}>Próximo</Button></nav>;
  const slide = <div className="overflow-hidden border bg-white shadow-sm"><FortalezaIntroSlide model={model} page={page} view={view} /></div>;
  return <section className="space-y-4" aria-label="Primeiros dez slides Fortaleza"><header><h2 className="text-lg font-semibold">Slides iniciais · {selection.periodicity === 'monthly' ? 'Mensal' : 'Trimestral'}</h2><p className="text-sm text-muted-foreground">Arte, tabelas e medidas extraídas do original {source.label}. Os campos variáveis usam o recorte escolhido; números do original não são usados como dados novos.</p></header>{navigation}<p className="text-sm">Slide {page} · {source.slides[page - 1].title}</p>{pending && <p role="status" className="text-sm text-muted-foreground">{pending}</p>}{overflow > 0 && <p className="text-sm text-muted-foreground">{overflow} lançamento(s) adicionais não cabem nas páginas iniciais deste lote; precisam de continuação antes da exportação.</p>}<Button variant="outline" onClick={() => setExpanded(true)}>Ampliar slides</Button>{!expanded && slide}<Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[95dvh] w-[96vw] max-w-7xl overflow-auto"><DialogTitle>Fortaleza · primeiros dez slides</DialogTitle><DialogDescription>Modelo {source.label}; fontes pendentes são identificadas fora da lâmina.</DialogDescription>{navigation}{slide}</DialogContent></Dialog>{data?.issues.map((issue, index) => <p className="text-xs text-muted-foreground" key={index}>{issue}</p>)}</section>;
}
