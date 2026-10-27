import { buildingId, buildingName, type Building } from '../source';
import { normalizeOrigin, shiftMonth, type OriginResult } from '../expanded/contract';
import { forecast, type ForecastResult, type ModelId } from '../expanded/models';
import { prepareReferenceModels } from '../expanded/referenceModels';

export type LocatedBuilding = { building: Building; uf: string; city: string };
export type ReviewStatus = 'COLETA' | 'PENDENTE' | 'SEM_MODELO' | 'CANDIDATO';
export type ReviewItem = LocatedBuilding & { id: string; name: string; normalized: OriginResult;
  status: ReviewStatus; reasons: string[]; methods: Map<ModelId, ForecastResult>; situation: string };
export const REVIEW_MODELS: {id: ModelId; label: string}[] = [
  {id:'finotti-reference',label:'Referência Finotti'}, {id:'stock-trend',label:'Ritmo recente de estoque'}, {id:'constant',label:'Estoque constante'},
];
export function classify(item: LocatedBuilding, cutoff: string, methods: Map<ModelId, ForecastResult>): ReviewItem {
  const b = item.building, normalized = normalizeOrigin(b,cutoff), o = normalized.origin;
  const reasons: string[] = [];
  if (!o) reasons.push(normalized.reason);
  if (o && (o.stock <= 5 || o.stock > 30)) reasons.push('Estoque total fora de 6–30: encaminhar para coleta, conforme regra registrada.');
  reasons.push('Origem de cada competência e cadência oficial ainda não fornecidas pelo contrato desta consulta.');
  if (o && o.history.length < 4) reasons.push('Menos de quatro posições históricas até o corte.');
  const typologies = new Set(b.typologies_history.filter(r=>r.period.slice(0,7)<=cutoff).map(r=>String(r.typology_id)));
  if (typologies.size > 1) reasons.push('Várias tipologias: projeção do empreendimento disponível; regra de saída por tipologia pendente.');
  const supports = !!methods.get('finotti-reference')?.forecast;
  if (!supports) reasons.push(methods.get('finotti-reference')?.reason ?? 'Referência sem suporte neste corte.');
  else reasons.push('Referência executável; equivalência da preparação e validação local ainda precisam ser conferidas.');
  const status: ReviewStatus = o && (o.stock<=5 || o.stock>30) ? 'COLETA' : !o || o.history.length<4 || typologies.size>1 ? 'PENDENTE' : !supports ? 'SEM_MODELO' : 'PENDENTE';
  // No candidate can be approved from a current-cadastro flag. API lineage is unknown.
  const ageBand = !o?.age ? 'idade ausente' : o.age<=3 ? '1–3 meses' : o.age<=12 ? '4–12 meses' : o.age<=36 ? '13–36 meses' : o.age<=48 ? '37–48 meses' : o.age<=60 ? '49–60 meses' : 'mais de 60 meses';
  const soldBand = !o ? 'posição ausente' : o.sold/o.units>=.95 ? '95% ou mais vendido' : o.sold===0 ? 'sem venda acumulada' : 'abaixo de 95% vendido';
  return {...item,id:buildingId(b),name:buildingName(b),normalized,status,reasons,methods,situation:`${b.sourceType ?? 'Tipo ausente'} · ${o?.pattern ?? 'padrão ausente'} · ${ageBand} · ${soldBand} · ${typologies.size===1?'uma tipologia':'várias tipologias'}`};
}
export async function prepareReview(items: LocatedBuilding[], cutoff: string, signal: AbortSignal, progress: (n:number)=>void): Promise<ReviewItem[]> {
  if (items.some(x=>x.building.sourceType==='Vertical')) await prepareReferenceModels();
  const rows: ReviewItem[]=[];
  for (const item of items) {
    if(signal.aborted) throw new DOMException('Cancelado','AbortError');
    const n=normalizeOrigin(item.building,cutoff), methods=new Map<ModelId,ForecastResult>();
    for(const m of REVIEW_MODELS) methods.set(m.id,n.origin?forecast(n.origin,m.id,36):{id:n.id,name:n.name,forecast:null,reason:n.reason});
    rows.push(classify(item,cutoff,methods));
    if(rows.length%8===0){progress(rows.length);await new Promise(resolve=>setTimeout(resolve,0));}
  }
  if(signal.aborted) throw new DOMException('Cancelado','AbortError');
  return rows;
}
export function reviewExport(rows: ReviewItem[], draft: Set<string>, cutoff: string) {
  return rows.filter(r=>draft.has(r.id)).map(r=>({id:r.id,name:r.name,uf:r.uf,city:r.city,type:r.building.sourceType,
    cutoff,status:r.status,referenceCalculable:!!r.methods.get('finotti-reference')?.forecast,
    operationallyApproved:false,importable:false,reasons:r.reasons.join(' | '),situation:r.situation}));
}
export function situationCounts(rows: ReviewItem[]) {
  const counts=new Map<string,number>();for(const r of rows)counts.set(r.situation,(counts.get(r.situation)??0)+1);
  return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'pt-BR'));
}
export function historyRows(row: ReviewItem) {
  const history=row.normalized.origin?.history??[];
  return history.flatMap((r,i)=>{
    const current={...r,x:r.period,history:r.units!==null&&r.stock!==null&&r.stock>=0&&r.stock<=r.units?r.units-r.stock:null};
    return i>0&&shiftMonth(history[i-1].period,1)!==r.period ? [{...current,x:shiftMonth(history[i-1].period,1),history:null},current] : [current];
  });
}
