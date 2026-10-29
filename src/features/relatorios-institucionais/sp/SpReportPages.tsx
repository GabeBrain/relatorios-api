import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { spPeriodLabel, type SpPreview, type SpTypologies } from './model';
import { buildSpSegments, SP_DETAIL_PAGES, SP_PATTERN_PAGES, SP_TABLE_PAGES } from './segments';
import { SpTableSlide } from './SpTableSlide';
import { SpSegmentHistorySlide } from './SpSegmentHistorySlide';
import { SpLaunchHistorySlide } from './SpLaunchHistorySlide';
import cover from './assets/cover.png';
import projectsTemplate from './assets/template-13.png';
import launchesTemplate from './assets/template-18.png';
import salesTemplate from './assets/template-32.png';
import stockTemplate from './assets/template-46.png';
import launchesTypologyTemplate from './assets/template-23.png';
import salesTypologyTemplate from './assets/template-37.png';
import stockTypologyTemplate from './assets/template-47.png';
import launchesSegmentTemplate from './assets/template-24.png';
import salesSegmentTemplate from './assets/template-38.png';
import stockSegmentTemplate from './assets/template-48.png';

const quantity = (value: number | null) => value === null ? 'Indisponível' : value.toLocaleString('pt-BR');
const month = (value: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
const titles = ['Capa', 'Empreendimentos', 'Unidades lançadas', 'Vendas líquidas', 'Oferta final', 'Lançamentos por tipologia', 'Vendas por tipologia', 'Oferta por tipologia', 'Lançamentos por segmento', 'Vendas por segmento', 'Oferta por segmento', 'Comparativo de lançamentos', 'Comparativo de vendas', 'Comparativo de oferta', ...SP_DETAIL_PAGES.map(page => page.title), ...SP_PATTERN_PAGES.map(page => page.title), ...SP_TABLE_PAGES.map(page => page.title)];
const metricTemplates = { launches: launchesTemplate, sales: salesTemplate, stock: stockTemplate };
const templates = [cover, projectsTemplate, launchesTemplate, salesTemplate, stockTemplate, launchesTypologyTemplate, salesTypologyTemplate, stockTypologyTemplate, launchesSegmentTemplate, salesSegmentTemplate, stockSegmentTemplate, launchesTemplate, salesTemplate, stockTemplate, ...[...SP_DETAIL_PAGES, ...SP_PATTERN_PAGES, ...SP_TABLE_PAGES].map(page => metricTemplates[page.metric])];

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
  if (!['partial', 'quarter-closed', 'ready'].includes(report.status)) return null;
  const real = report.source === 'api' || report.source === 'recorded-api';
  const period = spPeriodLabel(report);
  const segments = buildSpSegments(report);
  const detail = page >= 14 && page < 26 ? SP_DETAIL_PAGES[page - 14] : undefined;
  const pattern = page >= 26 && page < 40 ? SP_PATTERN_PAGES[page - 26] : undefined;
  const table = page >= 40 ? SP_TABLE_PAGES[page - 40] : undefined;
  const distribution = page >= 8 ? segments : report.typologies;
  const metric = page === 1 ? 'projects' : [2, 5, 8].includes(page) ? 'launches' : [3, 6, 9].includes(page) ? 'sales' : 'stock';
  const observations = metric === 'projects' ? report.projects?.monthly ?? [] : (report.monthly ?? []).map(row => ({ month: row.month, value: metric === 'stock' ? row.closingStock : metric === 'launches' ? row.launches : row.sales }));
  const slide = <article aria-label={`Página ${page + 1}: ${titles[page]}`} className="relative h-full w-full text-[#262626]" style={{ fontFamily: 'Tahoma, sans-serif', background: '#f8f8f8' }}>
    <img src={templates[page]} alt={page === 0 ? 'Capa original Brain Inteligência Estratégica' : `Layout original: ${titles[page]}`} className="absolute inset-0 h-full w-full" />
    {table ? <SpTableSlide report={report} {...table} /> : page >= 11 ? <SpLaunchHistorySlide report={report} segment={detail?.segment} pattern={pattern?.pattern} metric={pattern?.metric ?? detail?.metric ?? (page === 11 ? 'launches' : page === 12 ? 'sales' : 'stock')} /> : page > 0 && <>
      <p className="absolute left-[62px] top-[155px] text-[18px]">{report.quarter} · {real ? period : 'Dados fictícios · exemplo de desenvolvimento'}</p>
      <div className="absolute right-[100px] top-[145px] text-right"><p className="text-[16px]">{metric === 'stock' ? 'Oferta no último mês conferido' : 'Acumulado nos meses conferidos'}</p><p className="text-[32px] font-bold text-[#5b7638]">{quantity(page >= 5 && distribution?.status !== 'ready' ? null : report.metrics[metric])}</p></div>
      {page >= 8 && report.historyBatch?.status === 'ready' && report.historyBatch.segments ? <SpSegmentHistorySlide batch={report.historyBatch} metric={metric as 'launches' | 'sales' | 'stock'} /> : page >= 5 ? <DistributionChart result={distribution} metric={metric as 'launches' | 'sales' | 'stock'} kind={page >= 8 ? 'segmento' : 'tipologia'} /> : page === 1 && report.projects?.status !== 'ready' ? <div className="absolute left-[90px] top-[310px] w-[1100px] text-center"><p className="text-[30px] font-bold">Contagem de empreendimentos pendente</p><p className="mt-4 text-[20px]">A cobertura granular ainda não foi confirmada.</p></div> : <MonthlyChart observations={observations} />}
      <p className={`absolute left-[62px] text-[16px] ${page >= 5 ? 'top-[605px]' : 'top-[590px]'}`}>{page === 1 ? report.projects?.status === 'ready' ? 'Empreendimentos distintos por data de lançamento · cobertura paginada conferida.' : 'Sem estimativa ou preenchimento com zero.' : page >= 8 && report.historyBatch?.status === 'ready' && report.historyBatch.segments ? 'Mesmos meses nos dois anos · regra de segmentos confirmada por Lucas.' : page >= 5 ? 'Distribuição nos meses conferidos. Comparação com o ano anterior pendente.' : report.status === 'quarter-closed' ? 'Série dos três meses conferida. Comparações históricas dependem de Conferir históricos.' : 'Série mensal parcial. Comparações trimestrais e variações históricas pendentes.'}</p>
    </>}
  </article>;
  const navigation = <nav aria-label="Navegação das páginas" className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{titles.map((title, index) => <Button key={title} variant={page === index ? 'default' : 'outline'} aria-pressed={page === index} onClick={() => setPage(index)}>{index + 1}. {title}</Button>)}</nav>;
  return <section aria-label="Páginas do relatório" className="space-y-4">
    <div><h2 className="text-lg font-semibold">Montagem do relatório</h2><p className="text-sm text-muted-foreground">Modelo original do PowerPoint · {report.quarter} · {real ? period : 'Dados fictícios'}. Exportação e homologação pendentes.</p><p className="text-sm text-muted-foreground">Páginas 15–40: detalhes complementares por segmento e padrão. Use Conferir históricos. Páginas 41–46: quadros dos dados atuais; tipologias dependem de Conferir tipologias.</p></div>
    {!expanded && navigation}
    <Button variant="outline" onClick={() => setExpanded(true)}>Ampliar slides</Button>
    {!expanded && <SlideFrame>{slide}</SlideFrame>}
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[95dvh] w-[96vw] max-w-6xl overflow-auto p-4 sm:p-6"><DialogTitle>Prévia dos slides · São Paulo</DialogTitle><DialogDescription>{real ? period : 'Dados fictícios'} · Prévia para revisão. Em telas pequenas, gire o aparelho para ampliar.</DialogDescription>{navigation}<SlideFrame>{slide}</SlideFrame></DialogContent></Dialog>
  </section>;
}

function DistributionChart({ result, metric, kind }: { result?: SpTypologies; metric: 'launches' | 'sales' | 'stock'; kind: 'tipologia' | 'segmento' }) {
  if (result?.status !== 'ready') return <div className="absolute left-[90px] top-[310px] w-[1100px] text-center"><p className="text-[28px] font-bold">Dados por {kind} indisponíveis</p><p className="mt-4 text-[20px]">{kind === 'segmento' ? result?.issues[0] ?? 'Confira os dados reais novamente.' : result?.status === 'blocked' ? 'Confira as divergências antes de preencher este slide.' : 'Use Conferir tipologias para consultar e reconciliar os dados.'}</p></div>;
  const values = result.rows.map(row => row[metric]);
  const total = values.reduce((sum, value) => sum + value, 0);
  const minimum = Math.min(0, ...values), maximum = Math.max(0, ...values);
  const y = (value: number) => 485 - (value - minimum) / Math.max(1, maximum - minimum) * 210;
  const step = 1100 / result.rows.length;
  const fontSize = result.rows.length > 6 ? 14 : 18;
  const colors = ['#5b7638', '#83a83d', '#1d6288', '#ffcf00'];
  return <svg role="img" aria-label={`Distribuição por ${kind} em unidades e participação percentual`} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <line x1="90" x2="1190" y1={y(0)} y2={y(0)} stroke="#d9d9d9" />
    {result.rows.map((row, index) => {
      const x = 90 + step * (index + 0.5), value = row[metric];
      const labelY = value < 0 ? y(value) + 20 : y(value) - 28;
      return <g key={row.group}><rect x={x - Math.min(90, step * 0.55) / 2} y={Math.min(y(0), y(value))} width={Math.min(90, step * 0.55)} height={Math.abs(y(value) - y(0))} fill={colors[index % colors.length]} />
        <text x={x} y={labelY} textAnchor="middle" fontSize={result.rows.length > 6 ? 16 : 22} fontWeight="bold">{quantity(value)}</text>
        {total > 0 && <text x={x} y={labelY + 19} textAnchor="middle" fontSize="16">{(value / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</text>}
        <text x={x} y="545" textAnchor="middle" fontSize={fontSize}>{wrapGroup(row.group, Math.max(8, Math.floor(step / (fontSize * .5)) - 1)).map((part, line) => <tspan key={line} x={x} dy={line ? 16 : 0}>{part}</tspan>)}</text>
      </g>;
    })}
  </svg>;
}

function wrapGroup(label: string, limit: number): string[] {
  const lines = [''];
  for (const word of label.split(/\s+/)) {
    if (lines.at(-1) && `${lines.at(-1)} ${word}`.length > limit) lines.push('');
    if (word.length > limit) {
      if (lines.at(-1)) lines.push('');
      for (let start = 0; start < word.length; start += limit) {
        if (lines.at(-1)) lines.push('');
        lines[lines.length - 1] = word.slice(start, start + limit);
      }
    } else lines[lines.length - 1] += `${lines.at(-1) ? ' ' : ''}${word}`;
  }
  return lines;
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
