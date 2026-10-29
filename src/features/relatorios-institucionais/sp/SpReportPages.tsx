import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { spPeriodLabel, type SpPreview } from './model';
import { SP_ORIGINAL_SLIDES } from './original-slides';
import { SpTrendSlide } from './SpTrendSlide';
import { SpComparisonSlide } from './SpComparisonSlide';
import { SpNeighborhoodSlide } from './SpNeighborhoodSlide';
import { SpMarketSlide } from './SpMarketSlide';
import { SpDetailSlide } from './SpDetailSlide';
import { SP_DETAIL_SLIDES } from './granular-details';
import { SpHighlightsSlide } from './SpHighlightsSlide';
import { SP_MARKET_SLIDES } from './market-details';
import { SpMarketStateSlide } from './SpMarketStateSlide';
import { SpStockMapSlide } from './SpStockMapSlide';
import { SP_INSTITUTIONAL_ASSETS } from './institutional-assets';
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
export function SpReportPages({ report, onSelectSlide }: { report: SpPreview; onSelectSlide?: (number: number) => void }) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (page === 39 || (SP_DETAIL_SLIDES as readonly number[]).includes(page)) onSelectSlide?.(page); }, [page, report, onSelectSlide]);
  if (!['partial', 'quarter-closed', 'ready'].includes(report.status)) return null;
  const real = report.source === 'api' || report.source === 'recorded-api';
  const period = spPeriodLabel(report);
  const definition = SP_ORIGINAL_SLIDES[page - 1];
  const slide = <article aria-label={`Slide ${page}: ${definition.title}`} className="relative h-full w-full text-[#262626]" style={{ fontFamily: 'Tahoma, sans-serif', background: '#f8f8f8' }}>
    <img key={`template-${page}`} src={SP_INSTITUTIONAL_ASSETS[page] ?? templates[page] ?? (page >= 32 && page <= 44 ? salesTemplate : projectsTemplate)} alt={page === 1 ? 'Capa original Brain Inteligência Estratégica' : SP_INSTITUTIONAL_ASSETS[page] ? `Referência institucional: ${definition.title}` : `Layout: ${definition.title}`} className="absolute inset-0 h-full w-full" />
    {SP_INSTITUTIONAL_ASSETS[page] ? null : [9,10,11].includes(page) ? <SpHighlightsSlide key={page} report={report} slide={page}/> : [67,68,70,71,74,75,79,80].includes(page) ? <SpStockMapSlide key={page} report={report} slide={page}/> : (SP_MARKET_SLIDES as readonly number[]).includes(page) ? <SpMarketStateSlide key={page} report={report} slide={page}/> : (SP_DETAIL_SLIDES as readonly number[]).includes(page) ? <SpDetailSlide key={page} report={report} slide={page} /> : page >= 13 && page <= 22 || page >= 26 && page <= 30 || page >= 32 && page <= 36 || page >= 40 && page <= 44 ? <SpTrendSlide key={page} report={report} number={page} /> : [23, 24, 37, 38, 47, 48].includes(page) ? <SpComparisonSlide key={page} report={report} number={page} /> : [25,39].includes(page) ? <SpNeighborhoodSlide key={page} report={report} sales={page === 39} /> : [46,50].includes(page) ? <SpMarketSlide key={page} report={report} number={page} /> : page > 1 ? <OriginalTextSlide number={page} title={definition.title} report={report} /> : null}
  </article>;
  const navigation = <nav aria-label="Navegação dos slides originais" className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{SP_ORIGINAL_SLIDES.map(item => <Button className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left" key={item.number} variant={page === item.number ? 'default' : 'outline'} aria-pressed={page === item.number} onClick={() => setPage(item.number)}>{item.number}. {item.title}</Button>)}</nav>;
  return <section aria-label="Páginas do relatório" className="space-y-4">
    <div><h2 className="text-lg font-semibold">Montagem do relatório</h2><p className="text-sm text-muted-foreground">Ordem e numeração dos 85 slides do modelo original · {report.quarter} · {real ? period : 'Dados fictícios'}. Os indicadores dependem da conferência de cada fonte. Exportação e homologação pendentes.</p><p className="text-sm text-muted-foreground">Séries e comparativos são preenchidos automaticamente após a conferência das fontes. Rankings de bairros dependem da reconciliação com os totais municipais; os históricos de bairros, áreas, preços e mapas são coletados ao abrir um desses slides e reaproveitados entre eles. VGL lançado e VGV vendido por período usam INCC-DI e base única no último mês disponível. Preços e VGV da fotografia atual são nominais.</p></div>
    {!expanded && navigation}
    <Button variant="outline" onClick={() => setExpanded(true)}>Ampliar slides</Button>
    {!expanded && <SlideFrame>{slide}</SlideFrame>}
    {SP_INSTITUTIONAL_ASSETS[page] && <p role="note" className="text-sm text-muted-foreground">{page===7?'Perfil territorial de junho de 2026, conforme o material de referência.':'Conteúdo institucional reproduzido da edição de referência 2T2026; nomes, contatos e números conservam essa edição.'}</p>}
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[95dvh] w-[96vw] max-w-6xl overflow-auto p-4 sm:p-6"><DialogTitle>Prévia dos slides · São Paulo</DialogTitle><DialogDescription>{real ? period : 'Dados fictícios'} · Estrutura original, 85 posições. Em telas pequenas, gire o aparelho para ampliar.</DialogDescription>{navigation}<SlideFrame>{slide}</SlideFrame></DialogContent></Dialog>
  </section>;
}

function OriginalTextSlide({ number, title, report }: { number: number; title: string; report: SpPreview }) {
  const divider = title.startsWith('Divisória:');
  const text = number === 2 ? [`São Paulo capital · Empreendimentos residenciais verticais`, report.quarter, spPeriodLabel(report)] : number === 6 ? SP_ORIGINAL_SLIDES.filter(item => item.title.startsWith('Divisória:')).map(item => `${item.number}. ${item.title.replace('Divisória: ', '')}`) : number >= 26 && number <= 30 ? ['Metodologia do INCC em definição', 'Aguardando série do índice, mês-base e critério de atualização.', 'Valores nominais não são exibidos como corrigidos.'] : divider ? [] : ['Conteúdo pendente', 'Esta posição segue o modelo original.', 'Os dados ou a revisão editorial ainda não foram concluídos.'];
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
