import manifest from './reference-manifest.json';
import {norm,type Selection} from './model';
import type {Slide,Table} from './types';

export type PresentationKind='table'|'cities'|'columns'|'stacked-area'|'bars'|'narrative'|'institutional'|'state-comparison';
export interface ChartPanel {kind:'columns'|'stacked-area'|'bars'|'pie';table:Table;colors:string[];box:{x:number;y:number;w:number;h:number};percent?:boolean;title?:string;lineSeries?:number[];stacked?:boolean;firstPageOnly?:boolean}
export interface Presentation {kind:PresentationKind;rowsPerPage?:number;displayTable?:Table;annotation?:string;charts?:ChartPanel[];paragraphs?:string[];asset?:string}
export const regionalReference=(s:Selection)=>manifest[s.region as keyof typeof manifest];
export const INSTITUTIONAL_APPROVAL={approvedOn:'2026-11-26',edition:'3T2026',sourceEdition:'4T2025',scope:'Números institucionais, contatos e composição da equipe aprovados pelo usuário nesta sessão.'};
export const institutionalApproved=(s:Selection)=>(s.year===2026&&s.quarter===3)||(s.year===2025&&s.quarter===4);
export const FAMILY_COLORS=['#dce6c5','#ffcf00','#206082','#577832'];
export const SERIES_COLORS=['#577832','#eb6751','#ffcf00','#206082','#dce6c5','#8b7464','#71898c'];
export const quarterLabel=(end:string)=>`${Math.ceil(Number(end.slice(5))/3)}T${end.slice(0,4)}`;
export const panel=(kind:ChartPanel['kind'],table:Table,colors=SERIES_COLORS,box={x:110,y:245,w:1060,h:310}):ChartPanel=>({kind,table,colors,box});
export function cityColumns(table:Table){
 const blocks=[...new Set(table.rows.map(r=>String(r.values[0])))].flatMap(uf=>{const rows=table.rows.filter(r=>r.values[0]===uf);return Array.from({length:Math.ceil(rows.length/30)},(_,i)=>({uf,rows:rows.slice(i*30,(i+1)*30)}));});
 const columns:(typeof blocks)[]=[];let used=0;
 for(const block of blocks){const cost=block.rows.length+3;if(!columns.length||used+cost>33){columns.push([]);used=0;}columns.at(-1)!.push(block);used+=cost;}
 return columns;
}

/** The inspected reference manifest owns editorial order, including image-only pages. */
export function editorialSequence(selection:Selection,input:Slide[]):Slide[]{
 const reference=regionalReference(selection),output:Slide[]=[],emitted=new Set<string>();
 if(!reference)return input;
 for(const row of reference.slides){
  if(row.key.startsWith('excluded-')||emitted.has(row.key))continue;
  emitted.add(row.key);
  const refs=reference.slides.filter(r=>r.key===row.key).map(r=>r.number);
  const found=input.filter(slide=>row.key.startsWith('map:')?slide.kind==='map'&&norm(slide.map?.city.city??slide.title.split('·')[1]??'')===norm(row.key.slice(4)):slide.id===row.key);
  for(const slide of found){if(slide.kind==='closing'&&institutionalApproved(selection))slide.presentation={kind:'institutional',asset:`${selection.region}-closing`};slide.referenceNumbers=refs;slide.referenceNumber=refs[Math.min((slide.map?.part??1)-1,refs.length-1)];output.push(slide);}
  if(!found.length){
   const institutional=['about-brain','brain-studies','brain-group','geobrain-studies','geobrain-platform','geobrain-app','team','consulting','institutional-app'].includes(row.key);
   const safeArt=['brain-studies','geobrain-studies'].includes(row.key)||institutionalApproved(selection);
   output.push({id:row.key,title:row.title,kind:institutional?'institutional':'section',status:'available',tables:[],sourceKeys:[],warnings:safeArt?[]:['Conteúdo institucional datado sem fonte atual confirmada: números, contatos e composição de equipe não foram republicados.'],note:row.source,referenceNumber:row.number,referenceNumbers:refs,presentation:{kind:'institutional',asset:safeArt?`${selection.region}-${row.key}`:undefined,paragraphs:safeArt?[]:institutionalText[row.key]??['Conteúdo institucional aguardando conferência para esta edição.']}});
  }
 }
 return output;
}
const institutionalText:Record<string,string[]>={
 'about-brain':['Inteligência estratégica para o mercado imobiliário.','Pesquisa, análise e estudos para apoiar decisões.'],
 'brain-group':['Brain','Geobrain','Inteligência estratégica, estudos e dados do mercado imobiliário.'],
 'geobrain-platform':['Plataforma Geobrain','Monitoramento e análise do mercado imobiliário.'],
 'geobrain-app':['Geobrain','Informação do mercado imobiliário para apoiar a análise.'],
};
