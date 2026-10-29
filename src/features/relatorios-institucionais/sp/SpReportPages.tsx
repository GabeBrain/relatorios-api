import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { spPeriodLabel, type SpPreview, type SpTypologies } from './model';
import { buildSpSegments } from './segments';
import { SP_ORIGINAL_SLIDES } from './original-slides';
import { SpTrendSlide } from './SpTrendSlide';
import { SpSegmentHistorySlide } from './SpSegmentHistorySlide';
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
const templates: Record<number, string> = { 1: cover, 13: projectsTemplate, 14: projectsTemplate, 15: projectsTemplate, 16: projectsTemplate, 17: projectsTemplate, 18: launchesTemplate, 19: launchesTemplate, 20: launchesTemplate, 21: launchesTemplate, 22: launchesTemplate, 23: launchesTypologyTemplate, 24: launchesSegmentTemplate, 32: salesTemplate, 37: salesTypologyTemplate, 38: salesSegmentTemplate, 46: stockTemplate, 47: stockTypologyTemplate, 48: stockSegmentTemplate };

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

/** Original 85-slide order; pending content occupies its original position. */
export function SpReportPages({ report }: { report: SpPreview }) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  if (!['partial', 'quarter-closed', 'ready'].includes(report.status)) return null;
  const real = report.source === 'api' || report.source === 'recorded-api';
  const period = spPeriodLabel(report);
  const segments = buildSpSegments(report);
  const definition = SP_ORIGINAL_SLIDES[page - 1];
  const metric = [23, 24].includes(page) ? 'launches' : [32, 37, 38].includes(page) ? 'sales' : 'stock';
  const distribution = [24, 38, 48].includes(page) ? segments : report.typologies;
  const observations = (report.monthly ?? []).map(row => ({ month: row.month, value: metric === 'stock' ? row.closingStock : row.sales }));
  const slide = <article aria-label={`Slide ${page}: ${definition.title}`} className="relative h-full w-full text-[#262626]" style={{ fontFamily: 'Tahoma, sans-serif', background: '#f8f8f8' }}>
    <img src={templates[page] ?? projectsTemplate} alt={page === 1 ? 'Capa original Brain Inteligência Estratégica' : `Layout: ${definition.title}`} className="absolute inset-0 h-full w-full" />
    {page >= 13 && page <= 22 ? <SpTrendSlide report={report} number={page} /> : [23, 24, 32, 37, 38, 46, 47, 48].includes(page) ? <>
      <p className="absolute left-[62px] top-[155px] text-[18px]">{report.quarter} · {real ? period : 'Dados fictícios'}</p>
      <div className="absolute right-[100px] top-[145px] text-right"><p className="text-[16px]">{metric === 'stock' ? 'Oferta no último mês conferido' : 'Acumulado nos meses conferidos'}</p><p className="text-[32px] font-bold text-[#5b7638]">{quantity([23, 24, 37, 38, 47, 48].includes(page) && distribution?.status !== 'ready' ? null : report.metrics[metric])}</p></div>
      {[24, 38, 48].includes(page) && report.historyBatch?.status === 'ready' && report.historyBatch.segments ? <SpSegmentHistorySlide batch={report.historyBatch} metric={metric} /> : [23, 24, 37, 38, 47, 48].includes(page) ? <DistributionChart result={distribution} metric={metric} kind={[24, 38, 48].includes(page) ? 'segmento' : 'tipologia'} /> : <MonthlyChart observations={observations} />}
      <p className="absolute left-[62px] top-[610px] text-[15px]">{[32, 46].includes(page) ? 'Dados mensais conferidos. Curva trimestral completa e escoamento ainda pendentes.' : [24, 38, 48].includes(page) && report.historyBatch?.status === 'ready' ? 'Comparativo dos mesmos meses nos dois anos.' : 'Distribuição atual; comparação anual completa ainda pendente.'}</p>
    </> : page > 1 ? <OriginalTextSlide number={page} title={definition.title} report={report} /> : null}
  </article>;
  const navigation = <nav aria-label="Navegação dos slides originais" className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{SP_ORIGINAL_SLIDES.map(item => <Button className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left" key={item.number} variant={page === item.number ? 'default' : 'outline'} aria-pressed={page === item.number} onClick={() => setPage(item.number)}>{item.number}. {item.title}</Button>)}</nav>;
  return <section aria-label="Páginas do relatório" className="space-y-4">
    <div><h2 className="text-lg font-semibold">Montagem do relatório</h2><p className="text-sm text-muted-foreground">Ordem e numeração dos 85 slides do modelo original · {report.quarter} · {real ? period : 'Dados fictícios'}. Conteúdos ainda não implementados ficam indicados na posição original. Exportação e homologação pendentes.</p><p className="text-sm text-muted-foreground">Slides 13–22: séries de empreendimentos e unidades lançadas. Tipologias e comparativos por segmento usam as conferências da página.</p></div>
    {!expanded && navigation}
    <Button variant="outline" onClick={() => setExpanded(true)}>Ampliar slides</Button>
    {!expanded && <SlideFrame>{slide}</SlideFrame>}
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[95dvh] w-[96vw] max-w-6xl overflow-auto p-4 sm:p-6"><DialogTitle>Prévia dos slides · São Paulo</DialogTitle><DialogDescription>{real ? period : 'Dados fictícios'} · Estrutura original, 85 posições. Em telas pequenas, gire o aparelho para ampliar.</DialogDescription>{navigation}<SlideFrame>{slide}</SlideFrame></DialogContent></Dialog>
  </section>;
}

function OriginalTextSlide({ number, title, report }: { number: number; title: string; report: SpPreview }) {
  const divider = title.startsWith('Divisória:');
  const text = number === 2 ? [`São Paulo capital · Empreendimentos residenciais verticais`, report.quarter, spPeriodLabel(report)] : number === 6 ? SP_ORIGINAL_SLIDES.filter(item => item.title.startsWith('Divisória:')).map(item => `${item.number}. ${item.title.replace('Divisória: ', '')}`) : divider ? [] : ['Conteúdo pendente', 'Esta posição segue o modelo original.', 'Os dados ou a revisão editorial ainda não foram concluídos.'];
  const words = title.replace('Divisória: ', '').split(' '), lines = [''];
  for (const word of words) { if (`${lines.at(-1)} ${word}`.length > 58) lines.push(''); lines[lines.length - 1] += `${lines.at(-1) ? ' ' : ''}${word}`; }
  return <svg role="img" aria-label={divider ? title : number === 2 ? 'Sobre este relatório' : number === 6 ? 'Sumário original' : `Conteúdo pendente: slide ${number}`} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <rect x="40" y="10" width="1000" height="130" fill="#f8f8f8" />
    {lines.map((line, i) => <text key={i} x="62" y={62 + i * 36} fontSize="28" fontWeight="bold">{line.toLocaleUpperCase('pt-BR')}</text>)}
    <rect x="62" y="120" width="85" height="9" rx="4" fill="#ffcf00" />
    <text x="62" y="165" fontSize="18">{report.quarter} · {spPeriodLabel(report)}</text>
    {text.map((line, i) => <text key={i} x={number === 6 ? 100 : 640} y={(number === 6 ? 220 : 320) + i * (number === 6 ? 33 : 45)} textAnchor={number === 6 ? 'start' : 'middle'} fontSize={number === 6 ? 22 : 26} fontWeight={i === 0 ? 'bold' : undefined}>{line}</text>)}
    {divider && <text x="640" y="365" textAnchor="middle" fontSize="40" fill="#5b7638" fontWeight="bold">{title.replace('Divisória: ', '').toLocaleUpperCase('pt-BR')}</text>}
    <text x="62" y="615" fontSize="15">Slide {number} de 85 · Estrutura do relatório original</text>
  </svg>;
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
