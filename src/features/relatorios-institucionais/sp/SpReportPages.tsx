import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SpPreview } from './model';

const quantity = (value: number | null) => value === null ? 'Indisponível' : value.toLocaleString('pt-BR');
const month = (value: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
const titles = ['Capa', 'Indicadores', 'Evolução mensal'];

/** Local reading layout only. It does not collect data or release an export. */
export function SpReportPages({ report }: { report: SpPreview }) {
  const [page, setPage] = useState(0);
  if (!['partial', 'ready'].includes(report.status)) return null;
  const real = report.source === 'api' || report.source === 'recorded-api';
  const period = report.throughMonth ? `Parcial até ${month(report.throughMonth)}` : 'Exemplo com dados fictícios';
  return <section aria-label="Páginas do relatório" className="space-y-4">
    <div><h2 className="text-lg font-semibold">Montagem do relatório</h2><p className="text-sm text-muted-foreground">Prévia para revisão. Exportação e homologação pendentes.</p></div>
    <nav aria-label="Navegação das páginas" className="flex flex-wrap gap-2">{titles.map((title, index) => <Button key={title} variant={page === index ? 'default' : 'outline'} aria-pressed={page === index} onClick={() => setPage(index)}>{index + 1}. {title}</Button>)}</nav>
    <article aria-label={`Página ${page + 1}: ${titles[page]}`} className="space-y-6 rounded-xl border border-border bg-card p-5 text-card-foreground sm:p-10">
      <header className="space-y-2 border-b border-border pb-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brain · Panorama imobiliário</p><h3 className="text-2xl font-semibold">{titles[page]} · São Paulo</h3><p>{report.quarter} · Residencial vertical</p><p className="text-sm font-medium">{real ? period : 'Dados fictícios · exemplo de desenvolvimento'}</p></header>
      {page === 0 && <div className="space-y-4"><p className="text-xl">Mercado residencial vertical de São Paulo capital</p><p>Estudo em montagem com os meses disponíveis e conferidos.</p><p className="text-sm text-muted-foreground">O fechamento foi observado em uma amostra. A cobertura por empreendimento e a revisão do analista permanecem pendentes.</p></div>}
      {page === 1 && <dl className="grid gap-6 sm:grid-cols-2">{([['Empreendimentos lançados', report.metrics.projects], ['Unidades lançadas', report.metrics.launches], ['Vendas líquidas', report.metrics.sales], ['Oferta final', report.metrics.stock]] as const).map(([label, value]) => <div key={label} className="space-y-2 border-b border-border pb-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-2xl font-semibold tabular-nums">{quantity(value)}</dd></div>)}</dl>}
      {page === 2 && <div className="space-y-5">{report.monthly?.length ? report.monthly.map(row => <div key={row.month} className="space-y-2 border-b border-border pb-4"><h4 className="font-semibold capitalize">{month(row.month)}</h4><dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{([['Lançamentos', row.launches], ['Vendas líquidas', row.sales], ['Oferta final', row.closingStock], ['Diferença do balanço', row.delta]] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium tabular-nums">{quantity(value)}</dd></div>)}</dl></div>) : <p>A evolução mensal não está disponível neste exemplo.</p>}<p className="text-sm text-muted-foreground">Oferta final é a fotografia do último mês; não é somada entre meses. O balanço municipal não substitui a conferência por empreendimento.</p></div>}
      <footer className="border-t border-border pt-4 text-xs text-muted-foreground">{real ? 'Fonte: API GeoBrain · séries municipais.' : 'Fonte: exemplo fictício.'} Prévia parcial para revisão · {page + 1} / {titles.length}</footer>
    </article>
  </section>;
}
