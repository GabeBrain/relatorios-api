import type { SpPreview } from './model';
import { SP_ORIGINAL_SLIDES } from './original-slides';
import { SP_INSTITUTIONAL_ASSETS } from './institutional-assets';
import { resolveSpTypologyComparison } from './typology-history';
import { spQuarterlyIvv } from './stock-series';
import { spMarketSlideIssue } from './market-details';
import { SP_DETAIL_SLIDES } from './granular-details';
import { spFlowWindow, type SpLaunchSeries } from './launch-series';
import { shiftSpMonth } from './project-trends';
import { quarterMonths } from './temporal';
import { SP_SEGMENT_RULE } from './segments';
import { spNumericAudit } from './numeric-audit';

export type SpSlideState = 'available' | 'partial' | 'pending' | 'blocked' | 'reference';
export interface SpSlideReview { number: number; title: string; state: SpSlideState; reason: string }
export const SP_SLIDE_STATE_LABELS: Record<SpSlideState,string> = {
  available:'Disponível', partial:'Com lacunas', pending:'Aguardando fonte', blocked:'Fonte indisponível', reference:'Referência editorial',
};
type Finding = Pick<SpSlideReview,'state'|'reason'>;
const available: Finding = { state:'available', reason:'Conteúdo disponível para conferência visual e numérica.' };
const blocked = (reason:string):Finding => ({state:'blocked',reason});
const partial = (reason:string):Finding => ({state:'partial',reason});
const pending = (reason:string):Finding => ({state:'pending',reason});
function source(value:{status:string;issues:string[]}|undefined, label:string):Finding {
  return !value ? pending(`Confira ${label} para preencher este slide.`) : value.status==='ready' ? available : blocked(value.issues[0]??`A fonte de ${label} não foi conferida.`);
}
function trend(report:SpPreview, number:number):Finding {
  const base=number<18?13:number<=22?18:number<=30?26:number<=36?32:40;
  const data=base===13?report.projects:base===18?report.launchSeries:base===26?report.vglSeries:base===32?report.salesSeries:report.vgvSeries;
  const state=source(data,base===13?'os empreendimentos':base===26||base===40?'os valores monetários e o INCC-DI':'as séries municipais históricas');
  if(state.state!=='available')return state;
  const index=number-base;
  if([2,3,4].includes(index)) {
    const group=source(data!.breakdown,'os recortes por segmento');
    if(group.state!=='available')return group;
    if(index===4)return data!.breakdown?.annual?.length?available:pending('Participações anuais não disponíveis.');
    return data!.breakdown?.mcmv?available:pending('Recorte MCMV não disponível.');
  }
  return data!.trends?available:pending('Série histórica ainda não disponível.');
}

/** Availability of the current generation, never a claim of market validation or analyst approval. */
export function reviewSpSlides(report:SpPreview, mapToken=import.meta.env.VITE_MAPBOX_ACCESS_TOKEN??''):SpSlideReview[] {
  function check(number:number):Finding {
    if(number===82||number===83)return {state:'reference',reason:'Equipe inicial da edição de referência 2T2026. Personalize nomes, cargos e fotos na prévia e revise os responsáveis antes de exportar.'};
    if(SP_INSTITUTIONAL_ASSETS[number])return {state:'reference',reason:number===7?'Data acompanha o período conferido; percentuais preservados de junho/2026 e editáveis no PowerPoint. Confirmar a atualização com o responsável editorial.':number===5?'Seis indicadores e legendas editáveis no PowerPoint; valores institucionais preservados da edição 2T2026, sem atualização pela API municipal.':'Arte da edição 2T2026. Confirmar pessoas, contatos e números institucionais.'};
    if([1,2,6,8,12,31,45,49,52,60,65,81].includes(number))return available;
    if(number>=13&&number<=22||number>=26&&number<=30||number>=32&&number<=36||number>=40&&number<=44)return trend(report,number);
    if([9,10,11].includes(number)) {
      const data=number===10?report.salesSeries:report.launchSeries;
      const state=source(data,'as séries de lançamentos/vendas');
      if(state.state!=='available')return state;
      if(number!==11){const group=source(data!.breakdown,'o recorte MCMV');if(group.state!=='available')return group;if(!data!.breakdown?.mcmv)return pending('Recorte MCMV ainda não disponível.');}
      if(number===9&&!spFlowWindow(data,`${report.throughMonth?.slice(0,4)}-01`,report.throughMonth!))return pending('Confira os meses de janeiro até o fechamento para a participação acumulada do ano.');
      return number===11&&report.projects?.status!=='ready'?partial('Destaque de unidades disponível; contagem de empreendimentos ainda não conferida.'):available;
    }
    if([23,37,47].includes(number)){if(report.typologies?.status==='blocked')return source(report.typologies,'as tipologias');return source(resolveSpTypologyComparison(report,number===23?'launches':number===37?'sales':'stock'),'as tipologias dos dois anos');}
    if([24,38,48].includes(number)){const data=number===24?report.launchSeries:number===38?report.salesSeries:report.stockSeries;return source(data?.status==='blocked'?data:data?.comparison,'os segmentos dos dois anos');}
    if(number===25||number===39){
      const data=number===25?(report.projects?.status==='blocked'?report.projects:report.projects?.neighborhoods):report.salesNeighborhoods;
      const result=source(data,'os bairros e sua reconciliação municipal');
      return number===39&&result.state==='available'&&report.salesNeighborhoods?.warnings?.length ? {...result,reason:report.salesNeighborhoods.warnings.join(' ')} : result;
    }
    if(number===46)return source(report.stockSeries,'a oferta histórica');
    if(number===50){const inputs=[report.stockSeries,report.launchSeries,report.salesSeries],failed=inputs.find(input=>input?.status==='blocked');if(failed)return source(failed,'as séries do IVV');if(inputs.some(input=>!input))return pending('O IVV aguarda as séries de oferta, lançamentos e vendas.');const result=spQuarterlyIvv(report),state=source(result,'as séries de oferta, lançamentos e vendas');return state.state==='available'&&result.rows.some(row=>row.value===null)?partial('Há trimestre sem base disponível para o IVV; não representa índice zero.'):state;}
    const details=report.granularDetails;
    const detailState=source(details,'os históricos detalhados');
    if(detailState.state!=='available')return detailState;
    if(number===51)return source(details!.area,'os fluxos e estoques por área');
    if(number>=53&&number<=59){
      const points=details!.prices.series[number]??[],valid=points.filter(row=>row.value!==null).length;
      const gap=points.find(row=>row.value===null||row.partial),incomplete=points.filter(row=>row.value===null||row.partial).length;
      return !valid?blocked(gap?.issue??'Nenhuma fotografia com preços completos.'):incomplete?partial(`${incomplete} fotografia(s) com cobertura parcial ou medição indisponível. Primeira ocorrência ${gap!.month}: ${gap!.issue??'medição indisponível'} Os valores observados foram preservados; variações envolvendo parciais não são calculadas.`):available;
    }
    if(number===61||number===62){const field=number===61?'ticket':'meter',values=details!.prices.standards.map(row=>row[field]),gap=details!.prices.standards.find(row=>row[field]===null),reason=gap?.issues[0]??details!.prices.overall.issues[0]??'Há padrão ou média geral sem cobertura, classificação ou preço completos.';return !values.some(v=>v!==null)&&details!.prices.overall[field]===null?blocked(reason):values.some(v=>v===null)||details!.prices.overall[field]===null?partial(reason):available;}
    const market=details!.market;
    const state=source(market,'a fotografia atual dos históricos');
    if(state.state!=='available')return state;
    const classificationIssue=spMarketSlideIssue(market,number);if(classificationIssue)return blocked(classificationIssue);
    if(number===63||number===64){const field=number===63?'ticket':'meter',rows=market!.prices;return !rows.some(row=>row[field]!==null)?blocked('Sem oferta e preços completos nas tipologias.'):rows.some(row=>row[field]===null||row.bedroom<=2&&(row.mcmv[field]===null||row.map[field]===null))?partial(market!.classificationIssues?.mcmv??'Há tipologia ou recorte MCMV/MAP sem oferta ou preço completo.'):available;}
    if(number===73)return source(market!.matrix,'a área privativa de toda a oferta');
    if(number===76||number===77){const stages=market!.stages;return stages.launched.ready&&stages.final.ready?available:stages.launched.ready||stages.final.ready?partial('Uma das composições por estágio não foi comprovada.') :blocked(stages.final.issues[0]??'Estágio não informado.');}
    if(number===78)return market!.vgv.ready?market!.vgv.partial?partial(`${market!.vgv.priceMissingCount} tipologia(s) sem preço válido. Contagens e valores completos preservados; valores monetários dependentes e seus totais aparecem como —. Vendido calculado por capacidade menos oferta; sold original auditado.`):{...available,reason:'Vendido e VGV vendido calculados por capacidade menos oferta da fotografia; campo sold original preservado na auditoria.'}:blocked(market!.vgv.issues[0]??'Capacidade ou estoque não compatíveis.');
    if([67,68,70,71,74,75,79,80].includes(number)){
      if(market!.total===0)return available;
      const located=market!.projects.filter(p=>p.latitude!==null&&p.longitude!==null);
      if(!located.length)return blocked('Sem coordenadas válidas para a oferta atual.');
      const gaps:string[]=[];
      if(located.length<market!.projects.length)gaps.push(`${market!.projects.length-located.length} empreendimento(s) sem coordenadas`);
      if(!mapToken.trim())gaps.push('base cartográfica sem chave configurada');
      if(located.some(p=>number===74||number===75?p.meter===null:number===79||number===80?p.vgv===null:false))gaps.push('pontos sem medição, indicados em cinza');
      return gaps.length?partial(`${gaps.join('; ')}. Confira a cobertura no mapa.`):available;
    }
    if(number===69&&market!.priceBandShare===null)return partial('Estoque por padrão disponível; cenário de ticket sem preço completo.');
    return available;
  }
  return SP_ORIGINAL_SLIDES.map(slide=>{
    const finding={...check(slide.number)};
    if((SP_DETAIL_SLIDES as readonly number[]).includes(slide.number)&&finding.state==='available'&&report.granularDetails?.warnings?.length)finding.reason+=' Há ressalvas da fonte nos históricos; consulte os detalhes da conferência.';
    return {...slide,...finding};
  });
}

export function spReviewSnapshot(report:SpPreview, slides:SpSlideReview[]) {
  const warnings=report.granularDetails?.warnings??[],vgv=report.granularDetails?.market?.vgv;
  const end=report.throughMonth,start=quarterMonths(report.quarter)[0];
  const windows=(series:SpLaunchSeries|undefined)=>!end?null:({yearToDate:spFlowWindow(series,`${end.slice(0,4)}-01`,end),quarter:spFlowWindow(series,start,end),previousYearQuarter:spFlowWindow(series,shiftSpMonth(start,-12),shiftSpMonth(end,-12)),last12Months:spFlowWindow(series,shiftSpMonth(end,-11),end)});
  const highlightAudit={classification:SP_SEGMENT_RULE.id,launches:{metric:'releases_in_period',...windows(report.launchSeries)},sales:{metric:'liquid_sales',...windows(report.salesSeries)},projectsLast12Months:report.projects?.status==='ready'?report.projects.trends?.rolling.at(-1)??null:null};
  return {schema:'sp-practical-review-v1',generatedAt:new Date().toISOString(),quarter:report.quarter,throughMonth:report.throughMonth??null,source:report.source??'fixture',municipalStatus:report.status,exportAvailable:true,exportFormat:'pptx-review-editable-text',analystApproval:false,highlightAudit,numericAudit:spNumericAudit(report),slides,sourceDiagnostics:report.granularDetails?.diagnostics??[],sourceWarnings:{count:warnings.length,examples:warnings.slice(0,50)},calculatedSalesAudit:vgv?.ready?{method:'capacity-minus-offer-v1',differenceCount:vgv.calculatedDifferenceCount??vgv.warnings?.length??0,priceMissingCount:vgv.priceMissingCount??0,examples:vgv.warnings?.slice(0,20)??[]}:null};
}
