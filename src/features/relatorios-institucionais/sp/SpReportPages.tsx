import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { SpPreview } from './model';
import cover from './assets/cover.png';
import projectsTemplate from './assets/template-13.png';
import launchesTemplate from './assets/template-18.png';
import salesTemplate from './assets/template-32.png';
import stockTemplate from './assets/template-46.png';

const quantity = (value: number | null) => value === null ? 'Indisponível' : value.toLocaleString('pt-BR');
const month = (value: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
const titles = ['Capa', 'Empreendimentos', 'Unidades lançadas', 'Vendas líquidas', 'Oferta final'];
const templates = [cover, projectsTemplate, launchesTemplate, salesTemplate, stockTemplate];

function SlideFrame({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1280);
  useEffect(() => {
    if (!frame.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={frame} className="relative aspect-video w-full overflow-hidden border border-border bg-card shadow-sm"><div style={{ width: 1280, height: 720, transform: `scale(${width / 1280})`, transformOrigin: 'top left' }}>{children}</div></div>;
}

/** Local reading layout only. It does not collect data or release an export. */
export function SpReportPages({ report }: { report: SpPreview }) {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  if (!['partial', 'ready'].includes(report.status)) return null;
  const real = report.source === 'api' || report.source === 'recorded-api';
  const period = report.throughMonth ? `Parcial até ${month(report.throughMonth)}` : 'Exemplo com dados fictícios';
  const metric = page === 1 ? 'projects' : page === 2 ? 'launches' : page === 3 ? 'sales' : 'stock';
  const observations = (report.monthly ?? []).map(row => ({ month: row.month, value: metric === 'stock' ? row.closingStock : metric === 'launches' ? row.launches : row.sales }));
  const slide = <article aria-label={`Página ${page + 1}: ${titles[page]}`} className="relative h-full w-full text-[#262626]" style={{ fontFamily: 'Tahoma, sans-serif', background: '#f8f8f8' }}>
    <img src={templates[page]} alt={page === 0 ? 'Capa original Brain Inteligência Estratégica' : `Layout original: ${titles[page]}`} className="absolute inset-0 h-full w-full" />
    {page > 0 && <>
      <p className="absolute left-[62px] top-[155px] text-[18px]">{report.quarter} · {real ? period : 'Dados fictícios · exemplo de desenvolvimento'}</p>
      <div className="absolute right-[100px] top-[145px] text-right"><p className="text-[16px]">{metric === 'stock' ? 'Oferta no último mês conferido' : 'Acumulado nos meses conferidos'}</p><p className="text-[32px] font-bold text-[#5b7638]">{quantity(report.metrics[metric])}</p></div>
      {page === 1 ? <div className="absolute left-[90px] top-[310px] w-[1100px] text-center"><p className="text-[30px] font-bold">Contagem de empreendimentos pendente</p><p className="mt-4 text-[20px]">A cobertura granular ainda não foi confirmada.</p></div> : <MonthlyChart observations={observations} />}
      <p className="absolute left-[62px] top-[590px] text-[16px]">{page === 1 ? 'Sem estimativa ou preenchimento com zero.' : 'Série mensal parcial. Comparações trimestrais e variações históricas pendentes.'}</p>
    </>}
  </article>;
  const navigation = <nav aria-label="Navegação das páginas" className="flex flex-wrap gap-2">{titles.map((title, index) => <Button key={title} variant={page === index ? 'default' : 'outline'} aria-pressed={page === index} onClick={() => setPage(index)}>{index + 1}. {title}</Button>)}</nav>;
  return <section aria-label="Páginas do relatório" className="space-y-4">
    <div><h2 className="text-lg font-semibold">Montagem do relatório</h2><p className="text-sm text-muted-foreground">Modelo original do PowerPoint · {report.quarter} · {real ? period : 'Dados fictícios'}. Exportação e homologação pendentes.</p></div>
    {!expanded && navigation}
    <Button variant="outline" onClick={() => setExpanded(true)}>Ampliar slides</Button>
    {!expanded && <SlideFrame>{slide}</SlideFrame>}
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[95dvh] w-[96vw] max-w-6xl overflow-auto p-4 sm:p-6"><DialogTitle>Prévia dos slides · São Paulo</DialogTitle><DialogDescription>Parcial para revisão. Em telas pequenas, gire o aparelho para ampliar.</DialogDescription>{navigation}<SlideFrame>{slide}</SlideFrame></DialogContent></Dialog>
  </section>;
}

function MonthlyChart({ observations }: { observations: { month: string; value: number }[] }) {
  if (!observations.length) return <p className="absolute left-[90px] top-[330px] text-[24px]">Série mensal indisponível neste exemplo.</p>;
  const maximum = Math.max(1, ...observations.map(row => Math.abs(row.value)));
  const points = observations.map((row, index) => ({ ...row, x: observations.length === 1 ? 640 : 240 + index * 800 / (observations.length - 1), y: 440 - row.value / maximum * 160 }));
  return <svg role="img" aria-label="Evolução mensal nos meses conferidos" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <line x1="90" x2="1190" y1="530" y2="530" stroke="#d9d9d9" />
    <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#5b7638" strokeWidth="4" />
    {points.map(point => <g key={point.month}><circle cx={point.x} cy={point.y} r="5" fill="#5b7638" /><rect x={point.x - 66} y={point.y - 47} width="132" height="35" fill="#5b7638" /><text x={point.x} y={point.y - 21} textAnchor="middle" fill="#fff" fontSize="25" fontWeight="bold">{quantity(point.value)}</text><text x={point.x} y="562" textAnchor="middle" fontSize="20">{month(point.month)}</text></g>)}
  </svg>;
}
