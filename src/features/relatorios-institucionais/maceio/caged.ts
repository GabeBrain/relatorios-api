import { maceioPeriod, type MaceioSelection } from './model';

export const CAGED_VERSION = 'mte-caged-v1';
export const CAGED_UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO NI BR'.split(' ');
export const CAGED_NORTHEAST = ['AL','BA','CE','MA','PB','PE','PI','RN','SE'];
export const CAGED_SECTORS = ['total','construction','agriculture','services','commerce','manufacturing','other'] as const;
export type CagedSector = typeof CAGED_SECTORS[number];
export interface CagedRow { period:string; uf:string; sector:CagedSector; balance:number }
export interface CagedReport {
  version:typeof CAGED_VERSION; end:string; snapshotVersion:string; publishedThrough:string;
  coverageStart:string; loadedAt:string; source:string; completePeriods:string[]; rows:CagedRow[];
}
export interface CagedSource {report:CagedReport|null;issue:string|null;requestedEnd?:string;delivery?:{kind:'online'|'verified-snapshot';verifiedAt?:string};failure?:{code:string;httpStatus:number|null}}
const monthPattern=/^20\d{2}-(0[1-9]|1[0-2])$/;
export const cagedEnd=(selection:MaceioSelection)=>maceioPeriod(selection).end.slice(0,7);
export function cagedPeriods(end:string){const year=Number(end.slice(0,4));return [...Array.from({length:10},(_,i)=>String(year-9+i)),`${year-1}${end.slice(4)}`,end];}
export function parseCagedReport(raw:unknown,end:string):CagedReport {
  if(!raw||typeof raw!=='object')throw new Error('Resposta CAGED inválida.');
  const data=raw as CagedReport,periods=cagedPeriods(end),seen=new Set<string>();
  if(data.version!==CAGED_VERSION||data.end!==end||!monthPattern.test(data.publishedThrough)||!monthPattern.test(data.coverageStart)||data.coverageStart>data.publishedThrough||!/^[a-f0-9]{64}$/.test(data.snapshotVersion)||!Number.isFinite(Date.parse(data.loadedAt))||data.source!=='MTE · CAGED antigo / Novo Caged · com ajustes'||!Array.isArray(data.completePeriods)||!Array.isArray(data.rows)||data.rows.length>2500||new Set(data.completePeriods).size!==data.completePeriods.length||data.completePeriods.some(p=>!periods.includes(p)))throw new Error('Contrato CAGED não confirmado.');
  const rows=data.rows.map(row=>{
    if(!row||!periods.includes(row.period)||!data.completePeriods.includes(row.period)||!CAGED_UFS.includes(row.uf)||!(CAGED_SECTORS as readonly string[]).includes(row.sector)||typeof row.balance!=='number'||!Number.isSafeInteger(row.balance)||seen.has(`${row.period}/${row.uf}/${row.sector}`))throw new Error('Agregado CAGED inválido ou duplicado.');
    seen.add(`${row.period}/${row.uf}/${row.sector}`);return {period:row.period,uf:row.uf,sector:row.sector,balance:row.balance};
  });
  for(const period of data.completePeriods)for(const uf of CAGED_UFS)for(const sector of CAGED_SECTORS){if(!seen.has(`${period}/${uf}/${sector}`))throw new Error('Fonte CAGED parcial.');}
  // Reconcile independent totals, retaining NI in the Brazilian total.
  const values=new Map(rows.map(row=>[`${row.period}/${row.uf}/${row.sector}`,row.balance]));
  for(const period of data.completePeriods){
    for(const uf of CAGED_UFS){const sum=CAGED_SECTORS.filter(s=>s!=='total').reduce((n,s)=>n+values.get(`${period}/${uf}/${s}`)!,0);if(!Number.isSafeInteger(sum)||sum!==values.get(`${period}/${uf}/total`))throw new Error('Setores CAGED não reconciliados.');}
    for(const sector of CAGED_SECTORS){const sum=CAGED_UFS.filter(uf=>uf!=='BR').reduce((n,uf)=>n+values.get(`${period}/${uf}/${sector}`)!,0);if(!Number.isSafeInteger(sum)||sum!==values.get(`${period}/BR/${sector}`))throw new Error('UFs CAGED não reconciliadas.');}
  }
  return {version:CAGED_VERSION,end,snapshotVersion:data.snapshotVersion,publishedThrough:data.publishedThrough,coverageStart:data.coverageStart,loadedAt:data.loadedAt,source:data.source,completePeriods:[...data.completePeriods],rows};
}
export function cagedBalance(report:CagedReport,period:string,uf:string,sector:CagedSector):number|null {
  return report.completePeriods.includes(period)?report.rows.find(row=>row.period===period&&row.uf===uf&&row.sector===sector)?.balance??null:null;
}
export const cagedChange=(now:number|null,before:number|null)=>now===null||before===null||before===0?null:(now-before)/Math.abs(before)*100;
export function cagedIssue(selection:MaceioSelection,source?:CagedSource):string|null {
  if(source?.issue)return source.issue;
  const requested=cagedEnd(selection),lagged=source?.requestedEnd===requested&&source.report&&source.report.end<requested&&source.report.end===source.report.publishedThrough&&source.report.end.slice(0,4)===requested.slice(0,4);
  if(!source?.report||source.report.end!==requested&&!lagged)return 'Gere o relatório para consultar o CAGED desta competência.';
  const report=source.report;
  if(!report.completePeriods.includes(report.end)||!report.completePeriods.includes(String(selection.year)))return `CAGED sem cobertura completa para ${report.end}. Publicação disponível até ${report.publishedThrough}.`;
  return null;
}
export interface CagedTableRow {label:string;values:(number|null)[];percent?:boolean}
export interface CagedSlideModel {kind:'summary'|'states'|'sectors'|'northeast';labels:string[];rows:CagedTableRow[];issue:string|null;note:string;warning:string|null;sourceNotice:string|null}
export function buildCagedSlide(page:number,selection:MaceioSelection,source?:CagedSource):CagedSlideModel {
  const issue=cagedIssue(selection,source),report=source?.report,end=report?.end??cagedEnd(selection),periods=cagedPeriods(end);
  const label=(p:string)=>p.length===4?p+(p===String(selection.year)?'*':''):`${new Intl.DateTimeFormat('pt-BR',{month:'short',timeZone:'UTC'}).format(new Date(`${p}-01T00:00:00Z`)).replace('.','')}/${p.slice(2,4)}`;
  const labels=[...periods.map(label),'Variação %'],rows:CagedTableRow[]=[];
  const value=(period:string,uf:string,sector:CagedSector)=>report?cagedBalance(report,period,uf,sector):null;
  const values=(uf:string,sector:CagedSector)=>{const values=periods.map(p=>value(p,uf,sector));return [...values,cagedChange(values.at(-1)!,values.at(-2)!)];};
  let kind:CagedSlideModel['kind']='states';
  if(page===9||page===12){
    kind='summary';const uf=page===9?'BR':'AL',total=values(uf,'total'),construction=values(uf,'construction');
    const shares=total.slice(0,-1).map((t,i)=>t===null||t===0||construction[i]===null?null:construction[i]!/t*100);
    rows.push({label:'Total',values:total},{label:'Construção Civil',values:construction},{label:'Participação (%)',percent:true,values:[...shares,cagedChange(shares.at(-1)!,shares.at(-2)!)]});
  }else if(page===13){
    kind='sectors';const years=Array.from({length:7},(_,i)=>String(selection.year-6+i));labels.splice(0,labels.length,...years.map(label));
    for(const [sector,name] of [['construction','Construção Civil'],['agriculture','Agropecuária'],['services','Serviços'],['commerce','Comércio'],['manufacturing','Indústria de transformação']] as [CagedSector,string][]){rows.push({label:name,values:years.map(y=>value(y,'AL',sector))});}
  }else if(page===14){kind='northeast';for(const sector of ['total','construction'] as const)for(const uf of CAGED_NORTHEAST)rows.push({label:`${uf} · ${sector==='total'?'Total':'Construção'}`,values:values(uf,sector)});
  }else for(const uf of CAGED_UFS.filter(uf=>!['BR','NI'].includes(uf)))rows.push({label:uf,values:values(uf,page===11?'construction':'total')});
  const lagNotice=source?.requestedEnd&&report&&source.requestedEnd!==report.end?` Emprego referente a ${new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${report.end}-01T00:00:00Z`))}, última competência disponível; relatório imobiliário de ${source.requestedEnd}.`:'';
  const sourceNotice=!issue&&source?.delivery?.kind==='verified-snapshot'?`Serviço online indisponível. Exibindo cópia verificada da fonte MTE em ${source.delivery.verifiedAt}, com revisão até ${report?.publishedThrough}.${lagNotice}`:!issue&&lagNotice?lagNotice.trim():null;
  const notices:string[]=[];
  if(!issue&&report&&periods.slice(0,10).some(p=>!report.completePeriods.includes(p)))notices.push(`Histórico com cobertura a partir de ${report.coverageStart}. Células ausentes permanecem sem valor.`);
  if(!issue&&lagNotice)notices.push(`Emprego: ${report!.end} (última competência disponível). *Ano acumulado até ${report!.end}.`);
  return {kind,labels,rows,issue,sourceNotice,note:report?`${report.source}. Revisão ${report.publishedThrough}. Quebra de série em 2020: CAGED antigo por subsetor IBGE; Novo Caged por CNAE 2.0. *Ano corrente até ${end}. Comparação mensal contra o mesmo mês do ano anterior. Variação de saldo sobre o módulo da base anterior; base zero fica sem percentual. Participação = saldo construção / saldo total.`:'Fonte oficial MTE ainda não consultada.',warning:notices.join(' ')||null};
}
