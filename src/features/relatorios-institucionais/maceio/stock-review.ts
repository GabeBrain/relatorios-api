import { marketMonth, normalizeMarketText as norm, type MarketRow } from './market';
import { maceioCities, maceioPeriod, type MaceioSelection } from './model';
import { readNumber, type MaceioMarketSlidesData } from './market-slides-data';
import { auditMaceioStock } from './stock-audit';

const text=(value:unknown)=>typeof value==='string'||typeof value==='number'?String(value).trim():null;
/** Requested identifying evidence, separate from the anonymous diagnostic.
 * Whitelist only: no authorization headers, contact data, or raw payloads. */
export function buildMaceioStockReview(selection:MaceioSelection,data:MaceioMarketSlidesData|null) {
  const month=maceioPeriod(selection).end.slice(0,7),cities=maceioCities(selection.periodicity);
  const sources=data?.end===month?data.sources:[];
  const summaries=auditMaceioStock(sources,cities,month);
  const reports=summaries.map(summary=>{
    const selected=sources.filter(source=>norm(source.city)===norm(summary.city));
    const municipal=selected.filter(source=>source.metric==='stock').flatMap(source=>source.rows
      .filter(row=>marketMonth(row.period)===month)
      .map(row=>({groupBy:source.group,group:text(row.group),stock:readNumber(row.stock,false),complete:source.complete})));
    const records=selected.filter(source=>source.metric==='details').flatMap(source=>source.rows.flatMap(building=>{
      const release=marketMonth(building.release_date),eligible=release!==null&&release<=month;
      return (Array.isArray(building.typologies_history)?building.typologies_history as MarketRow[]:[])
        .filter(row=>row&&marketMonth(row.period)===month).map(row=>({
          city:summary.city,state:text(building.state),segment:text(building.building_type),
          projectId:text(building.building_id??building.id),projectName:text(building.name??building.building_name),
          typologyId:text(row.typology_id),month,releaseDate:text(building.release_date),eligible,
          exclusion:!release?'Data de lançamento inválida':!eligible?'Lançamento posterior ao fechamento':null,
          catalogStandard:text(building.standard),historicalPattern:text(row.pattern),bedrooms:text(row.number_bedroom),
          typologyKind:text(row.type_of_typology),historicalStatus:text(row.building_status),catalogStatus:text(building.status),
          historicalStage:text(row.estagio_empreendimento),stock:readNumber(row.typology_stock,false),
          initialOffer:readNumber(row.qty,false),privateArea:readNumber(row.private_area,false,true),complete:source.complete,
        }));
    }));
    const comparisons=(groupBy:'Padrão'|'Tipologia',key:(record:typeof records[number])=>string|null)=>{
      const normalized=(label:string)=>groupBy==='Tipologia'?(norm(label).match(/^([1-9]\d*)(?:\s+(?:dorm|dormitorio|dormitorios|quarto|quartos))?$/)?.[1]??norm(label)):norm(label);
      const eligible=records.filter(row=>row.eligible),left=municipal.filter(row=>row.groupBy===groupBy);
      const labels=new Set(left.map(row=>normalized(row.group??'(não informado)')).concat(eligible.map(row=>normalized(key(row)??'(não informado)'))));
      const municipalSources=selected.filter(source=>source.metric==='stock'&&source.group===groupBy);
      const municipalComplete=municipalSources.length===1&&municipalSources[0].complete;
      return [...labels].sort().map(label=>{
        const a=left.filter(row=>normalized(row.group??'(não informado)')===label),b=eligible.filter(row=>normalized(key(row)??'(não informado)')===label);
        const municipalStock=municipalComplete&&a.length<=1&&!a.some(row=>row.stock===null)?a.reduce((sum,row)=>sum+row.stock!,0):null;
        const granularStock=summary.comparison!=='unavailable'&&!b.some(row=>row.stock===null)?b.reduce((sum,row)=>sum+row.stock!,0):null;
        return {group:label,municipalStock,granularStock,delta:municipalStock!==null&&granularStock!==null?granularStock-municipalStock:null};
      });
    };
    return {summary,municipal,comparisons:{byCatalogStandard:comparisons('Padrão',row=>row.catalogStandard),byBedrooms:comparisons('Tipologia',row=>row.bedrooms)},records};
  });
  return {schema:'maceio-stock-review-v1',month,segment:'Vertical',complete:reports.every(report=>report.summary.complete),
    mismatchCities:reports.filter(report=>report.summary.comparison==='mismatch').map(report=>report.summary.city),
    limits:['O agregado municipal não fornece IDs. Este arquivo não comprova quais empreendimentos ele inclui ou exclui.',
      'Padrão e status cadastrais são os recebidos hoje; não substituem os valores históricos.',
      'Registros futuros são listados com exclusão explícita; comparar apenas os elegíveis. Não excluir unidades para forçar igualdade.',
      'Ausência de grupo em consulta municipal completa corresponde a zero no mercado pesquisado; falhas/campos inválidos ficam nulos.'],reports};
}
export type MaceioStockReview=ReturnType<typeof buildMaceioStockReview>;
