import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { maceioPeriod, maceioReference, type MaceioSelection } from './model';
import MaceioReportSlide from './MaceioReportSlide';
import { buildMaceioLaunchSeries, maceioSlideIssue, type MaceioIntroData } from './intro-data';
import { buildMaceioMarketSlide, type MonetaryPolicy } from './market-slides-data';
import {buildOfferPriceSlide,type PricePolicy} from './offer-price-data';
import {buildRemainingSlide} from './remaining-data';
import {buildCagedSlide} from './caged';
import { maceioMonetaryPolicy } from './criteria';

const introTitles=['Abertura Brain','Sobre este relatório','Apresentação institucional','Presença e atuação','Soluções Brain','Sumário','Municípios do estudo','Emprego','Saldo do emprego formal no Brasil · construção civil','Desempenho por estado · saldo total','Desempenho por estado · construção civil','Emprego em Alagoas · construção civil','Saldo por setor · Alagoas','Desempenho dos estados do Nordeste','Lançamentos verticais','Empreendimentos verticais lançados','Empreendimentos lançados por padrão','Empreendimentos lançados · acumulado 12 meses','Unidades verticais lançadas','Unidades lançadas · acumulado 12 meses'];
export default function MaceioIntroSlides({selection,data,initialMonetaryPolicy=maceioMonetaryPolicy(selection),initialPricePolicy='stock-weighted'}:{selection:MaceioSelection;data:MaceioIntroData|null;initialMonetaryPolicy?:MonetaryPolicy;initialPricePolicy?:PricePolicy}){
 const [page,setPage]=useState(1),[expanded,setExpanded]=useState(false),[monetaryPolicy]=useState<MonetaryPolicy>(initialMonetaryPolicy),[pricePolicy]=useState<PricePolicy>(initialPricePolicy);
 const reference=maceioReference(selection.periodicity),market=page>=21&&page<=40&&![29,39].includes(page)?buildMaceioMarketSlide(page,selection,data?.slides??null,monetaryPolicy):null;
 const advanced=page>=41&&page<=60?buildOfferPriceSlide(page,selection,data?.slides??null,pricePolicy):null;
 const remaining=page>=61?buildRemainingSlide(page,selection,data?.slides??null,pricePolicy):null;
 const caged=page>=9&&page<=14?buildCagedSlide(page,selection,data?.caged):null;
 const issue=remaining?.issue??advanced?.issue??market?.issue??maceioSlideIssue(page,selection,data);
 const title=page<=20?introTitles[page-1]:[22,33].includes(page)?`Unidades ${page===22?'lançadas':'vendidas'} · MCMV`:reference.slides[page-1].title.replace(/VERTICAIS(?=LANÇ|VEND)/g,'VERTICAIS ').replace(/\s+/g,' ');
 const navigation=<nav className="flex flex-wrap gap-2" aria-label="Slides implementados Maceió"><Button variant="outline" disabled={page===1} onClick={()=>setPage(page-1)}>Anterior</Button>{Array.from({length:reference.slideCount},(_,i)=>i+1).map(number=><Button key={number} variant={page===number?'default':'outline'} aria-pressed={page===number} onClick={()=>setPage(number)}>{number}</Button>)}<Button variant="outline" disabled={page===reference.slideCount} onClick={()=>setPage(page+1)}>Próximo</Button></nav>;
 const slide=<div className="overflow-hidden rounded-lg border bg-white shadow-sm" data-maceio-preview={page}><MaceioReportSlide page={page} selection={selection} data={data} monetaryPolicy={monetaryPolicy} pricePolicy={pricePolicy}/></div>;
 return <section className="space-y-4 min-w-0" aria-label="Prévia dos slides Maceió">
  <header className="space-y-1"><h2 className="text-lg font-semibold">Slides do relatório · {selection.periodicity==='monthly'?'Mensal':'Trimestral'}</h2><p className="text-sm text-muted-foreground">Prévia: {reference.slideCount} slides, na sequência original · {maceioPeriod(selection).label}. Fontes e métodos pendentes permanecem identificados.</p></header>
  {navigation}
  <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">Slide {page} · {title}</p><Button variant="outline" onClick={()=>setExpanded(true)}>Ampliar slides</Button></div>
  {market?.money && monetaryPolicy === 'INCC-DI' && <p className="text-sm text-muted-foreground">Valores corrigidos pelo INCC-DI · base {maceioPeriod(selection).label}.</p>}
  {[...(advanced?.warnings??[]),...(remaining?.warnings??[])].map(warning=><p key={warning} role="status" className="text-sm text-muted-foreground">{warning}</p>)}
  {caged?.warning&&<p role="status" className="text-sm text-muted-foreground">{caged.warning}</p>}
  {caged?.sourceNotice&&<p role="status" className="text-sm text-muted-foreground">{caged.sourceNotice}</p>}

  {page===7&&<p className="text-xs text-muted-foreground">Mapa do recorte da referência. Percentuais de população e consumo foram retirados até atualização das fontes.</p>}
  {!expanded&&slide}
  <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Origem e conferência deste slide</summary><div className="mt-3 space-y-2 text-muted-foreground">
   {issue && <p>{issue}</p>}
   <p>Arte e posições do original {reference.label}. Os campos de competência usam o período selecionado; cifras do PPTX histórico não preenchem novos estudos.</p>
   {remaining?<p>{remaining.note}</p>:advanced?<p>{advanced.note||'Conteúdo editorial da referência.'}</p>:market?<><p>{market.note}</p><p>Por padrão/tipologia, os totais e categorias precisam corresponder aos recortes do original. Rankings de bairros exigem fluxos explícitos por tipologia e reconciliação integral com o total municipal. Categorias desconhecidas, ausência de mês e séries parciais não são convertidas em zero.</p>{[22,33].includes(page)&&<p>Recorte exclusivo MCMV, conforme o logotipo presente no slide original. Não equivale ao total vertical nem converte Econômico em MCMV automaticamente.</p>}</>:page<=8||page===15||[29,39].includes(page)?<p>Conteúdo editorial da referência; revise a identidade e o recorte da edição antes da entrega.</p>:page<=14?<p>Fonte oficial MTE. A competência e a versão da fonte ficam registradas nesta geração.</p>:page===17?<p>Contagem de IDs por ano e padrão declarado no cadastro. Categorias diferentes das quatro categorias do original bloqueiam o gráfico até confirmação de correspondência.</p>:<p>{buildMaceioLaunchSeries(page,selection,data).note}</p>}
   {caged&&<p>{caged.note}{data?.caged?.report&&<> Versão da fonte: {data.caged.report.snapshotVersion.slice(0,12)}.</>}</p>}
   {data&&<p>Fontes consultadas em {new Date(data.slides?.finishedAt??data.collectedAt).toLocaleString('pt-BR')}; essa coleta não representa homologação metodológica.</p>}
  </div></details>
  <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[95dvh] w-[96vw] max-w-7xl overflow-auto"><DialogTitle>Maceió · slides do relatório</DialogTitle><DialogDescription>Prévia na referência {reference.label}. Fontes pendentes permanecem identificadas.</DialogDescription>{navigation}{slide}</DialogContent></Dialog>
 </section>;
}
