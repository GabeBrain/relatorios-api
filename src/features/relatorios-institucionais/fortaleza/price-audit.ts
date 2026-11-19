import { FORTALEZA_CITIES, fortalezaPeriod, type FortalezaSelection } from './model';
import { normalizeMarketText } from './market';
import { framePrice, type PriceCollection, type PriceProduct } from './monthly-prices';

const products:PriceProduct[]=['vertical','houses','closed-lots','open-lots'];
const reasons={
  'scope-missing':'Município fora do recorte da geração.',
  'source-missing':'Fonte não coletada.',
  'source-ambiguous':'Mais de uma fonte para o mesmo município/segmento.',
  'source-incomplete':'Consulta não concluída; ausência de linhas não representa oferta zero.',
  'month-missing':'Fotografia da competência não disponível.',
  'frame-invalid':'Há problemas de identidade, classificação ou histórico na fotografia.',
  'product-invalid':'Há problemas históricos específicos deste produto.',
  'stock-invalid':'Há estoque inválido no conjunto normalizado.',
  'no-offer':'Consulta concluída, sem unidades elegíveis com estoque positivo neste produto.',
  'price-invalid':'Há unidades em oferta sem preço/m² histórico positivo e válido.',
  'category-missing':'Há unidades sem categoria necessária para a exclusão de tipologias especiais.',
  'calculation-invalid':'O cálculo não passou nas guardas numéricas.',
  ready:'Estoque positivo com preço/m² histórico válido.',
} as const;
type CheckStatus=keyof typeof reasons;

/** Aggregates only. Uses the slide's evaluator and normalized frames, without
 * API calls, raw identities, or error strings that can contain project IDs. */
export function auditFortalezaClosingPrices(collection:PriceCollection|null,selection:FortalezaSelection,cities:string[]) {
  const month=fortalezaPeriod(selection).end.slice(0,7);
  const checks=FORTALEZA_CITIES.flatMap(city=>(['Vertical','Horizontal'] as const).map(segment=>{
    const matches=collection?.sources.filter(source=>normalizeMarketText(source.city)===normalizeMarketText(city)&&source.segment===segment)??[];
    const source=matches.length===1?matches[0]:null,frame=source?.frames[month];
    const inStudyScope=cities.some(value=>normalizeMarketText(value)===normalizeMarketText(city));
    const inspect=(product:PriceProduct,excludeSpecial=false)=>{
      const rows=frame?.rows.filter(row=>row.product===product)??[];
      const excluded=excludeSpecial?rows.filter(row=>row.units>0&&row.category&&/\b(coberturas?|lajes?|duplex|gardens?)\b/.test(normalizeMarketText(row.category))):[];
      const eligible=rows.filter(row=>row.units>0&&!excluded.includes(row));
      const badStock=rows.filter(row=>!Number.isSafeInteger(row.units)||row.units<0).length;
      const missingPrice=eligible.filter(row=>row.meter===null||!Number.isFinite(row.meter)||row.meter<=0);
      const units=eligible.reduce((sum,row)=>sum+row.units,0),missingPriceUnits=missingPrice.reduce((sum,row)=>sum+row.units,0);
      const validStock=badStock===0&&Number.isSafeInteger(units),complete=Boolean(source?.complete&&frame);
      const volumeConfirmed=inStudyScope&&complete&&validStock&&!frame!.issues.length&&!frame!.productIssues[product]?.length&&(!excludeSpecial||!eligible.some(row=>!row.category));
      let status:CheckStatus=!inStudyScope?'scope-missing':!matches.length?'source-missing':matches.length!==1?'source-ambiguous':!source?.complete?'source-incomplete':!frame?'month-missing':frame.issues.length?'frame-invalid':frame.productIssues[product]?.length?'product-invalid':!validStock?'stock-invalid':excludeSpecial&&eligible.some(row=>!row.category)?'category-missing':missingPrice.length?'price-invalid':!units?'no-offer':'ready';
      let pricePerM2:number|null=null;
      if(status==='ready'&&source){try{pricePerM2=framePrice(source,month,product,excludeSpecial).value;}catch{status='calculation-invalid';}}
      const meters=eligible.flatMap(row=>typeof row.meter==='number'&&Number.isFinite(row.meter)&&row.meter>0?[row.meter]:[]);
      return {product,excludeSpecial,status,reason:reasons[status],observations:rows.length,
        zeroStockObservations:rows.filter(row=>row.units===0).length,positiveStockObservations:eligible.length,
        eligibleUnits:volumeConfirmed?units:null,observedPositiveUnits:validStock?units:null,excludedSpecialUnits:volumeConfirmed?excluded.reduce((sum,row)=>sum+row.units,0):null,
        productIssueCount:frame?(frame.productIssues[product]?.length??0):null,invalidStockObservations:badStock,
        missingPriceObservations:missingPrice.length,missingPriceUnits:complete&&validStock?missingPriceUnits:null,
        pricePerM2,minValidPricePerM2:meters.length?meters.reduce((a,b)=>Math.min(a,b)):null,maxValidPricePerM2:meters.length?meters.reduce((a,b)=>Math.max(a,b)):null};
    };
    return {city,segment,month,inStudyScope,sourceCount:matches.length,transportComplete:Boolean(source?.complete),frameAvailable:Boolean(frame),
      projectsReceived:source?.records.length??null,frameIssueCount:frame?.issues.length??null,
      products:products.filter(product=>segment==='Vertical'?product==='vertical':product!=='vertical').map(product=>inspect(product)),
      ...(segment==='Vertical'?{slide40:inspect('vertical',true)}:{})};
  }));
  const rmSlides=([40,41,42,43] as const).map(slide=>{
    const product=({40:'vertical',41:'houses',42:'closed-lots',43:'open-lots'} as const)[slide];
    const cities=checks.filter(check=>check.city!=='Fortaleza'&&check.segment===(slide===40?'Vertical':'Horizontal')).map(check=>({city:check.city,...(slide===40?check.slide40!:check.products.find(item=>item.product===product)!)}));
    return {slide:selection.periodicity==='monthly'?slide:({40:45,41:46,42:47,43:48} as const)[slide],product,
      blockingCities:cities.filter(city=>city.status!=='ready'&&city.status!=='no-offer').map(city=>({city:city.city,status:city.status,reason:city.reason})),
      noOfferCities:cities.filter(city=>city.status==='no-offer').map(city=>city.city),cities};
  });
  return {version:'fortaleza-price-audit-v2',month,rmSlides,checks,
    limits:['Auditoria agregada da fotografia normalizada usada nos cálculos, sem nova consulta.',
      'no-offer é diferente de consulta incompleta, classificação inválida ou preço ausente.',
      'Preços mínimo/máximo usam observações com estoque positivo e preço válido; não são médias municipais.',
      'Cidade sem oferta concluída é informativa e não bloqueia o gráfico regional; falhas e dados inválidos continuam bloqueando.']};
}
