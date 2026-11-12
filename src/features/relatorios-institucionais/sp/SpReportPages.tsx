import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { spPeriodLabel, spSlidePeriod, type SpPreview } from './model';
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
import { SpInstitutionalText } from './SpInstitutionalText';
import { SpPeopleSlide } from './SpPeopleSlide';
import { SpPeopleEditor } from './SpPeopleEditor';
import { createSpPeople,type SpPeople } from './people';
import { SP_DIVIDER_ASSETS } from './divider-assets';
import { reviewSpSlides, SP_SLIDE_STATE_LABELS } from './review';
import { SpReviewPanel } from './SpReviewPanel';
import { SpPptxExport } from './SpPptxExport';
import cover from './assets/cover.png';
import aboutTemplate from './assets/about-template.png';
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

const templates: Record<number, string> = { 1: cover, 2: aboutTemplate, 13: projectsTemplate, 14: projectsTemplate, 15: projectsTemplate, 16: projectsTemplate, 17: projectsTemplate, 18: launchesTemplate, 19: launchesTemplate, 20: launchesTemplate, 21: launchesTemplate, 22: launchesTemplate, 23: launchesTypologyTemplate, 24: launchesSegmentTemplate, 32: salesTemplate, 37: salesTypologyTemplate, 38: salesSegmentTemplate, 46: stockTemplate, 47: stockTypologyTemplate, 48: stockSegmentTemplate };
const dividerTitles:Record<number,string[]>={8:['DESTAQUES DO','ESTUDO'],12:['LANÇAMENTOS','VERTICAIS'],31:['VENDAS','VERTICAIS'],45:['OFERTA'],49:['VSO / IVV'],52:['EVOLUÇÃO DOS','PREÇOS'],60:['PREÇOS POR TIPOLOGIA','E PADRÃO'],65:['ESTADO ATUAL','DO MERCADO'],81:['CONSULTORES']};

export function SpSlideContent({report,page,onNavigate,people}:{report:SpPreview;page:number;onNavigate?:(page:number)=>void;people?:SpPeople}) {
  const definition=SP_ORIGINAL_SLIDES[page-1];
  if(page===82||page===83)return <article aria-label={`Slide ${page}: ${definition.title}`} className="relative h-full w-full" style={{fontFamily:'Tahoma, sans-serif',background:'#f8f8f8'}}><SpPeopleSlide page={page} people={people}/></article>;
  return <article aria-label={`Slide ${page}: ${definition.title}`} className="relative h-full w-full text-[#262626]" style={{ fontFamily: 'Tahoma, sans-serif', background: '#f8f8f8' }}>
    <img key={`template-${page}`} src={SP_DIVIDER_ASSETS[page] ?? SP_INSTITUTIONAL_ASSETS[page] ?? templates[page] ?? (page >= 32 && page <= 44 ? salesTemplate : projectsTemplate)} alt={page === 1 ? 'Capa original Brain Inteligência Estratégica' : SP_DIVIDER_ASSETS[page] ? definition.title : SP_INSTITUTIONAL_ASSETS[page] ? `Referência institucional: ${definition.title}` : `Layout: ${definition.title}`} className="absolute inset-0 h-full w-full" />
    {SP_DIVIDER_ASSETS[page] && <span className="sr-only">{definition.title.toLocaleUpperCase('pt-BR')}</span>}
    {SP_DIVIDER_ASSETS[page]&&<svg aria-label="Título da seção" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full"><rect x="275" y="245" width="725" height="220" fill="#f2f2f2"/>{dividerTitles[page].map((line,i)=><text key={i} x="635" y={dividerTitles[page].length===1?377:339+i*75} textAnchor="middle" fontSize={page===60?53:64} fontWeight="bold" fill="black">{line}</text>)}</svg>}
    {SP_INSTITUTIONAL_ASSETS[page] && <SpInstitutionalText page={page} report={report}/>}
    {SP_INSTITUTIONAL_ASSETS[page] || SP_DIVIDER_ASSETS[page] ? null : [9,10,11].includes(page) ? <SpHighlightsSlide key={page} report={report} slide={page}/> : [67,68,70,71,74,75,79,80].includes(page) ? <SpStockMapSlide key={page} report={report} slide={page}/> : (SP_MARKET_SLIDES as readonly number[]).includes(page) ? <SpMarketStateSlide key={page} report={report} slide={page}/> : (SP_DETAIL_SLIDES as readonly number[]).includes(page) ? <SpDetailSlide key={page} report={report} slide={page} /> : page >= 13 && page <= 22 || page >= 26 && page <= 30 || page >= 32 && page <= 36 || page >= 40 && page <= 44 ? <SpTrendSlide key={page} report={report} number={page} /> : [23, 24, 37, 38, 47, 48].includes(page) ? <SpComparisonSlide key={page} report={report} number={page} /> : [25,39].includes(page) ? <SpNeighborhoodSlide key={page} report={report} sales={page === 39} /> : [46,50].includes(page) ? <SpMarketSlide key={page} report={report} number={page} /> : page > 1 ? <OriginalTextSlide number={page} title={definition.title} report={report} onNavigate={onNavigate} /> : null}
    {page>=6&&!SP_INSTITUTIONAL_ASSETS[page]&&!SP_DIVIDER_ASSETS[page]&&![67,68,70,71,74,75,79,80].includes(page)&&<svg viewBox="0 0 1280 720" className="pointer-events-none absolute inset-0 h-full w-full" aria-label="Fonte do relatório"><rect x="890" y="662" width="365" height="40" fill="#5b7537"/><text x="1240" y="685" textAnchor="end" fontSize="14" fontWeight="bold" fill="white">FONTE: BRAIN INTELIGÊNCIA ESTRATÉGICA.</text></svg>}
  </article>;
}

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
  const [people,setPeople]=useState(createSpPeople);
  useEffect(() => { if (page === 39 || (SP_DETAIL_SLIDES as readonly number[]).includes(page)) onSelectSlide?.(page); }, [page, report, onSelectSlide]);
  if (!['partial', 'quarter-closed', 'ready'].includes(report.status)) return null;
  const real = report.source === 'api' || report.source === 'recorded-api';
  const period = spPeriodLabel(report);
  const reviews=reviewSpSlides(report);
  const currentReview=reviews[page-1];
  const referenceNote=SP_INSTITUTIONAL_ASSETS[page] ? (page===82||page===83?'Equipe inicial da edição de referência 2T2026. Nomes, cargos e fotos podem ser personalizados nesta prévia; confira os responsáveis antes de exportar.':page===7?'O mês e o ano acompanham o período conferido. Percentuais preservados da referência de junho/2026, editáveis no PowerPoint; não foram recalculados pela API.':page===5?'Indicadores institucionais da edição de referência 2T2026. Números e legendas dos seis cartões são editáveis no PowerPoint; não são atualizados pela API municipal.':'Conteúdo institucional reproduzido da edição de referência 2T2026; nomes, contatos e números conservam essa edição.') : null;
  const slide = <SpSlideContent report={report} page={page} onNavigate={setPage} people={people}/>;
  const navigation = <nav aria-label="Navegação dos slides originais" className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{SP_ORIGINAL_SLIDES.map(item => <Button className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left" key={item.number} variant={page === item.number ? 'default' : 'outline'} aria-pressed={page === item.number} onClick={() => setPage(item.number)}>{item.number}. {item.title}</Button>)}</nav>;
  return <section aria-label="Páginas do relatório" className="space-y-4">
    <div><h2 className="text-lg font-semibold">Montagem do relatório</h2><p className="text-sm text-muted-foreground">Ordem e numeração dos 85 slides do modelo original · {report.quarter} · {real ? period : 'Dados fictícios'}. Os indicadores dependem da conferência de cada fonte. PowerPoint disponível para conferência; homologação pendente.</p><p className="text-sm text-muted-foreground">Séries e comparativos são preenchidos após a conferência das fontes. As etapas automáticas compartilham os históricos de bairros, áreas, preços e mapas. Abrir um slide não inicia uma nova coleta. VGL lançado e VGV vendido por período usam INCC-DI e base única no último mês disponível. Preços e VGV da fotografia atual são nominais.</p></div>
    <SpPeopleEditor people={people} onChange={setPeople} onPreview={setPage}/>
    <SpPptxExport report={report} renderSlide={number=><SpSlideContent report={report} page={number} people={people}/>}/>
    <SpReviewPanel report={report} slides={reviews} onOpen={setPage}/>
    {!expanded && navigation}
    <p role="status" className="text-sm">Slide {page}: <strong>{SP_SLIDE_STATE_LABELS[currentReview.state]}</strong> · {currentReview.reason}</p>
    <Button variant="outline" onClick={() => setExpanded(true)}>Ampliar slides</Button>
    {!expanded && <SlideFrame>{slide}</SlideFrame>}
    {referenceNote && <p role="note" className="text-sm text-muted-foreground">{referenceNote}</p>}
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[95dvh] w-[96vw] max-w-6xl overflow-auto p-4 sm:p-6"><DialogTitle>Prévia dos slides · São Paulo</DialogTitle><DialogDescription>{real ? period : 'Dados fictícios'} · Estrutura original, 85 posições. Em telas pequenas, gire o aparelho para ampliar.</DialogDescription>{navigation}<p className="text-sm">{SP_SLIDE_STATE_LABELS[currentReview.state]} · {currentReview.reason}</p><SlideFrame>{slide}</SlideFrame>{referenceNote && <p role="note" className="text-sm text-muted-foreground">{referenceNote}</p>}</DialogContent></Dialog>
  </section>;
}

function OriginalTextSlide({ number, title, report, onNavigate }: { number: number; title: string; report: SpPreview;onNavigate?:(page:number)=>void }) {
  if(number===2)return <svg role="img" aria-label="Sobre este relatório" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full"><title>São Paulo capital · Empreendimentos residenciais verticais</title><text x="132" y="542" fontSize="20" fontWeight="bold" fill="#3d582e">{report.quarter[0]}º TRIMESTRE {report.quarter.slice(2)}</text></svg>;
  const divider = title.startsWith('Divisória:');
  const text = number === 2 ? [`São Paulo capital · Empreendimentos residenciais verticais`, report.quarter, spPeriodLabel(report)] : number === 6 ? SP_ORIGINAL_SLIDES.filter(item => item.title.startsWith('Divisória:')).map(item => `${item.number}. ${item.title.replace('Divisória: ', '')}`) : number >= 26 && number <= 30 ? ['Metodologia do INCC em definição', 'Aguardando série do índice, mês-base e critério de atualização.', 'Valores nominais não são exibidos como corrigidos.'] : divider ? [] : ['Conteúdo pendente', 'Esta posição segue o modelo original.', 'Os dados ou a revisão editorial ainda não foram concluídos.'];
  const words = (number === 6 ? 'SUMÁRIO' : title.replace('Divisória: ', '')).split(' '), lines = [''];
  for (const word of words) { if (`${lines.at(-1)} ${word}`.length > 58) lines.push(''); lines[lines.length - 1] += `${lines.at(-1) ? ' ' : ''}${word}`; }
  return <svg role="img" aria-label={divider ? title : number === 2 ? 'Sobre este relatório' : number === 6 ? 'Sumário original' : `Conteúdo pendente: slide ${number}`} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <rect x="40" y="10" width="1000" height="130" fill="#f8f8f8" />
    {lines.map((line, i) => <text key={i} x="62" y={62 + i * 36} fontSize={number === 6 ? 40 : 28} fontWeight="bold">{line.toLocaleUpperCase('pt-BR')}</text>)}
    <rect x="62" y="120" width="85" height="9" rx="4" fill="#ffcf00" />
    <text x="62" y="165" fontSize="18">{spSlidePeriod(report)}</text>
    {text.map((line, i) => number===6?<g key={i} role="button" tabIndex={0} aria-label={`Ir para ${line}`} data-sp-target-slide={Number(line.split('.')[0])} onClick={()=>onNavigate?.(Number(line.split('.')[0]))} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onNavigate?.(Number(line.split('.')[0]));}}} style={{cursor:'pointer'}}><rect x="90" y={198+i*38} width="1100" height="34" fill="transparent"/><text x="100" y={223+i*38} fontSize="22" textDecoration="underline">{sentenceCase(line.replace(/^\d+\. /,''))}</text></g>:<text key={i} x="640" y={320+i*45} textAnchor="middle" fontSize="26" fontWeight={i === 0 ? 'bold' : undefined}>{line}</text>)}
    {divider && <text x="640" y="365" textAnchor="middle" fontSize="40" fill="#5b7638" fontWeight="bold">{title.replace('Divisória: ', '').toLocaleUpperCase('pt-BR')}</text>}
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

function sentenceCase(value: string) { const text=value.toLocaleLowerCase('pt-BR').replace(/\b(vso|ivv|mcmv)\b/g,word=>word.toLocaleUpperCase('pt-BR'));return text.charAt(0).toLocaleUpperCase('pt-BR')+text.slice(1); }
