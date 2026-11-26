import {rentalSample} from './rentals';
import {buildModelo03Insights} from './insights';
import {salesFieldDiagnostics} from './field-diagnostics';
import incc from '../fortaleza/incc-di.json';
import {EXTERNAL_PAGES,OMITTED_REFERENCE_PAGES} from './blueprint';
import {num} from './calculate';
import {period,selectedCities,rmLabel,studyLabel,geographyMode,type Selection} from './model';
import {sourceKey,type Report,type Source} from './types';
import {presentationPages} from './presentation';
import {surveyCadence,scheduledObservations} from './coverage';
import {STANDARD_GROUPS} from './classification';
import {deferredSourceInventory} from './source-inventory';
const allowed=['releases_in_period','liquid_sales','stock','vgv_release','vgv_liquid_sales','vgv_stock'] as const;
/** Aggregate whitelist; selected-period anomalies below add only explicit identification fields. */
export function auditSource(s:Source,end?:string,start?:string){
 const observations=new Map<string,{month:string;group:string;records:number;values:Partial<Record<typeof allowed[number],number|null>>;missing:Record<string,number>}>();
 const fieldMissing:Record<string,number>={};
 const add=(r:Record<string,unknown>,detail:boolean)=>{
  const month=String(r.period??'').slice(0,7),group=detail?String(r.pattern??'Sem padrão histórico'):String(r.group??'Sem grupo');if(!/^\d{4}-\d{2}$/.test(month)||end&&month>end||start&&month<start)return;
  const key=`${month}/${group}`,old=observations.get(key)??{month,group,records:0,values:{},missing:{}};old.records++;
  const fields=detail?{stock:'typology_stock',liquid_sales:'sold_in_period',releases_in_period:'releases_in_period'}:Object.fromEntries((s.metric==='releases'?['releases_in_period','vgv_release']:s.metric==='sales'?['liquid_sales','vgv_liquid_sales']:['stock','vgv_stock']).map(f=>[f,f]));
  for(const [field,input] of Object.entries(fields)){const n=num(r[input],field==='liquid_sales'||field==='vgv_liquid_sales');if(n===null){old.missing[field]=(old.missing[field]??0)+1;fieldMissing[field]=(fieldMissing[field]??0)+1;old.values[field as typeof allowed[number]]=null;}else if(old.values[field as typeof allowed[number]]!==null)old.values[field as typeof allowed[number]]=(old.values[field as typeof allowed[number]]??0)+n;}
  observations.set(key,old);
 };
 if(s.metric==='details'){for(const b of s.rows)for(const row of Array.isArray(b.typologies_history)?b.typologies_history:[])if(row&&typeof row==='object')add(row,true);}
 else {for(const row of s.rows)add(row,false);}
 return {key:sourceKey(s),city:s.city,uf:s.uf,segment:s.segment,metric:s.metric,group:s.group,endpoint:s.endpoint,complete:s.complete,empty:s.complete&&s.rows.length===0,records:s.rows.length,requests:s.requests,httpStatus:s.httpStatus,failure:s.failure,finishedAt:s.finishedAt,observedMonths:[...new Set([...observations.values()].map(v=>v.month))].sort(),categories:[...new Set([...observations.values()].map(v=>v.group))].sort(),missingFields:fieldMissing,observations:[...observations.values()]};
}
export function diagnostic(report:Report){
 const summary={total:report.slides.length,available:0,waitingSource:0,editorial:0,notApplicable:0};
 for(const slide of report.slides)summary[slide.status==='available'?'available':slide.status==='waiting-source'?'waitingSource':slide.status==='editorial'?'editorial':'notApplicable']++;
 const p=period(report.selection),start=`${Math.max(2021,report.selection.year-5)}-01`;
 const sources=report.sources.map(source=>{const audit=auditSource(source,p.end,start),survey=surveyCadence(source,p.end),expected=source.metric==='rentals'?[]:scheduledObservations(source,start,p.end);return {...audit,...source.metric==='rentals'?{rentalAudit:auditRentals(source,p.start,p.end)}:{},salesFieldDiagnostics:salesFieldDiagnostics(source,p.start,p.end),survey:source.metric==='rentals'?null:survey,requestedMonths:source.metric==='rentals'?{start:p.start,end:p.end,basis:'collection-date'}:source.metric==='details'?'histórico disponível, fotografia exigida por indicador':{start,end:p.end},missingRequestedMonths:expected.filter(m=>!audit.observedMonths.includes(m)),scheduledMonths:expected};});
 const pages=presentationPages(report.slides).map((page,i)=>({page:i+1,referencePage:page.slide.definition.sourcePage,position:report.slides.indexOf(page.slide)+1,part:page.part,parts:page.parts,status:page.slide.status}));
 return {analystInsights:buildModelo03Insights(report),schema:'modelo-03-diagnostic-v1',generatedAt:report.finishedAt,generationStatus:'done',selection:{...report.selection},period:p,cities:selectedCities(report.selection).map(c=>rmLabel(c,report.selection.uf)),reference:{name:'ADEMI-PR · Curitiba · 2T2026',sourceId:'1cLd59MFqyICd7A7j9B-ZcUhot0W3O-xl',originalSlides:158,temporarilyOmittedReferencePages:OMITTED_REFERENCE_PAGES,excludedIntentionPages:[9,24],externalPagesDeferred:EXTERNAL_PAGES},criteria:{rentals:'Apartment ALUGUEL advertisements collected in selected period; simple valid-value means; not closed leases or historical active stock; no INCC-DI. IDs deduplicated, no cross-portal property deduplication.',geography:{mode:geographyMode(report.selection),label:studyLabel(report.selection)},standardGrouping:STANDARD_GROUPS,surveyCoverage:'Cadência da pesquisa por município; meses intermediários trimestrais não são lacunas nem valores mensais zero. Zero apenas confirmado pelo histórico completo.',incompleteSnapshots:'Empreendimentos inconsistentes excluídos do quadro detalhado com base parcial explicitada; sem inventar unidades ou preços.',ivv:'Vendas / (oferta inicial + lançamentos); divergências com estoque final preservadas em advertências, sem alterar os valores da API.',monetarySeries:'INCC-DI',baseMonth:p.end,indexAvailable:!!(incc.indices as Record<string,number>)[p.end],indexSource:incc.source,indexRetrievedAt:incc.retrievedAt,prices:'Média dos preços históricos individuais ponderada pelo estoque positivo; preço ausente não vira zero.',rm:geographyMode(report.selection)!=='city-and-rm'&&report.selection.includeRm?'Recorte nominal de cidades do estudo; modo combinado ou separado identificado em geography, sem rebatizar município como RM.':'Somente municípios selecionados; cidade principal excluída da faixa RM.',snapshot:'Fotografia histórica da competência; nunca estoque cadastral atual.',vgv:'Fluxo corrigido mês a mês pelo INCC-DI; quadros de VGV do universo ativo ao preço histórico do fechamento.'},summary,presentation:{pageCount:pages.length,pages},sources,slides:report.slides.map((s,i)=>({page:i+1,referencePage:s.definition.sourcePage,presentationPages:pages.filter(p=>p.position===i+1).map(p=>p.page),title:s.definition.title,status:s.status,issue:s.issue,warnings:s.warnings,sourceKeys:s.sourceKeys,note:s.note,tables:s.tables})),limits:{origin:report.origin,homologated:false,externalSourcesIntegrated:false,editorialReviewed:false,periodicities:'Janelas de 1, 3 e 6 meses; cobertura histórica conferida por indicador.'}};
}
const csvCell=(value:unknown)=>{let text=value===null||value===undefined?'':String(value);if(typeof value!=='number'&&/^[=+\-@\t\r]/.test(text))text="'"+text;return `"${text.replace(/"/g,'""')}"`;};
export function conferenceCsv(report:Report){
 const rows:unknown[][]=[['tipo','slide','slide_referencia','titulo','status','territorio_ou_fonte','linha_ou_competencia','campo','valor','unidade','observacao']];
 const audit=diagnostic(report);
 for(const item of deferredSourceInventory())rows.push(['fonte-não-integrada','',item.referencePage,item.title,item.status,item.expectedSource,'','','','',item.reason]);
 for(const slide of audit.slides.filter(s=>s.referencePage>=123&&s.referencePage<=126))rows.push(['criterio',slide.page,slide.referencePage,slide.title,slide.status,'','','metodo','','',slide.note]);
 for(const slide of audit.slides){if(!slide.tables.length)rows.push(['slide',slide.page,slide.referencePage,slide.title,slide.status,'','','','', '',slide.issue??slide.note]);for(const t of slide.tables)for(const r of t.rows)r.values.forEach((v,i)=>rows.push(['valor',slide.page,slide.referencePage,slide.title,slide.status,t.unit,r.label,t.columns[i],v,t.formats[i],[slide.issue,...slide.warnings].filter(Boolean).join(' | ')]));}
 for(const source of audit.sources){rows.push(['fonte','','','',source.complete?'concluída':'falha',source.key,'','registros',source.records,'',source.failure]);for(const r of source.observations)for(const [field,value] of Object.entries(r.values))rows.push(['fonte-agregada','','','',source.complete?'concluída':'falha',source.key,r.month,`${r.group} / ${field}`,value,'',r.missing[field]?`${r.missing[field]} campos ausentes`:null]);}
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
export const filename=(s:Selection)=>`modelo-03-${s.city.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase()}-${s.periodicity}-${s.year}-${s.position}`;

function auditRentals(source:Source,start:string,end:string){try{const sample=rentalSample(source,start,end);return {basis:'collected-in-period',start,end,uniqueListings:sample.offers.length,duplicates:sample.duplicates,excluded:sample.excluded,observedDates:{first:sample.offers.map(r=>r.collectedAt!).sort()[0]??null,last:sample.offers.map(r=>r.collectedAt!).sort().at(-1)??null},missing:{price:sample.offers.filter(r=>r.price===null).length,area:sample.offers.filter(r=>r.area===null).length,meter:sample.offers.filter(r=>r.meter===null).length}};}catch{return {basis:'collected-in-period',start,end,error:'Invalid rental source content'};}}
