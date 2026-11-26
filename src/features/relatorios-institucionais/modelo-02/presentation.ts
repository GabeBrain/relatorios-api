import manifest from './reference-manifest.json';
import {norm,type Selection} from './model';
import type {Slide,Table} from './types';

export type PresentationKind='table'|'cities'|'columns'|'stacked-area'|'bars'|'narrative'|'institutional'|'state-comparison'|'highlights';
export interface ChartPanel {kind:'columns'|'stacked-area'|'bars'|'pie';table:Table;colors:string[];box:{x:number;y:number;w:number;h:number};percent?:boolean;title?:string;lineSeries?:number[];stacked?:boolean;firstPageOnly?:boolean;
 /** Fixed value scale + gap: the PPTX plot area and the SVG preview/annotations share one geometry. */
 scaleMax?:number;gapPct?:number;labelDigits?:number}
/** Comparisons drawn over the quarterly family; computed from the same cells as CSV/JSON. */
export interface Trend {annual:number|null;quarter:number|null;accumulated:number|null;annualLabel:string;quarterLabel:string;accumulatedLabel:string}
export interface HighlightRow {label:string;values:(number|null)[]}
export interface Presentation {kind:PresentationKind;rowsPerPage?:number;displayTable?:Table;annotation?:string;charts?:ChartPanel[];paragraphs?:string[];asset?:string;trend?:Trend;headline?:string;bullets?:string[];note?:string}
export const regionalReference=(s:Selection)=>manifest[s.region as keyof typeof manifest];
export const INSTITUTIONAL_APPROVAL={approvedOn:'2026-11-26',edition:'3T2026',sourceEdition:'4T2025',scope:'Números institucionais, contatos e composição da equipe aprovados pelo usuário nesta sessão.'};
export const institutionalApproved=(s:Selection)=>(s.year===2026&&s.quarter===3)||(s.year===2025&&s.quarter===4);
export const FAMILY_ORDER=['Compactos','MCMV','Médio Padrão','Luxo'];
export const FAMILY_COLORS=['#dce6c5','#ffcf00','#206082','#577832'];
export const SERIES_COLORS=['#577832','#eb6751','#ffcf00','#206082','#dce6c5','#8b7464','#71898c'];
/** Quarterly family palette from the originals: older, previous year, current year. */
export const QUARTER_COLORS={older:'#335224',previous:'#66a043',current:'#ffc000'};
export const HIGHLIGHT_COLORS:Record<string,string>={'highlights-Residencial vertical':'#5b7536','highlights-MCMV':'#ffc000','highlights-Luxo':'#ef6144'};
export const quarterLabel=(end:string)=>`${Math.ceil(Number(end.slice(5))/3)}T${end.slice(0,4)}`;
export const panel=(kind:ChartPanel['kind'],table:Table,colors=SERIES_COLORS,box={x:110,y:245,w:1060,h:310}):ChartPanel=>({kind,table,colors,box});

/** Space under the plot for category labels, shared by preview and native chart frame. */
export const CATEGORY_SPACE=40;
export function columnGeometry(chart:ChartPanel){
 const {x,y,w,h}=chart.box,n=Math.max(1,chart.table.rows.length),category=w/n,bar=category/(1+(chart.gapPct??70)/100);
 const values=chart.table.rows.map(r=>r.values[0]).filter((v):v is number=>typeof v==='number');
 const max=chart.scaleMax??Math.max(1,...values);
 return {n,category,bar,max,bottom:y+h,top:y,center:(i:number)=>x+(i+.5)*category,valueY:(v:number)=>y+h-Math.max(0,Math.min(v,max))/max*h};
}

/** Divider titles follow the original wording (identical in the five regional decks). */
export function sectionLines(id:string,region:string){
 const r=`REGIÃO ${region.toLocaleUpperCase('pt-BR')}`;
 const lines:Record<string,string[]>={
  'regional-opening':['MERCADO IMOBILIÁRIO','COMPARATIVO',r],
  'section-highlights':['DESTAQUES',r],
  'section-releases':['LANÇAMENTOS',r],
  'section-sales':['VENDAS',r],
  'section-comparison':['COMPARATIVO','LANÇAMENTOS, VENDAS E','ESTOQUE',r],
  'section-analysis':['ANÁLISE GERAL'],
  'section-maps':['MAPAS DE LOCALIZAÇÃO'],
 };
 return lines[id];
}

/** Cities: one block per UF (Cidade · População · % Part.), split into ≤28-row columns, three columns per page. */
export const CITY_ROWS_PER_COLUMN=28;
export interface CityChunk {uf:string;rows:Table['rows'];continued:boolean;last:boolean}
/** Pill reserve fits three lines (partial-coverage sentence) + gap: 28 rows + header + pill = 550px. */
const CITY_COLUMN_HEIGHT=550,CITY_HEADER=34,CITY_ROW=16,CITY_PILL=68,CITY_GAP=16;
export const cityChunkHeight=(chunk:CityChunk)=>CITY_HEADER+chunk.rows.length*CITY_ROW+(chunk.last?CITY_PILL:0)+CITY_GAP;
export function cityColumns(table:Table):CityChunk[][]{
 const ufs=[...new Set(table.rows.map(r=>String(r.values[0])))];
 const chunks=ufs.flatMap(uf=>{const rows=table.rows.filter(r=>r.values[0]===uf),count=Math.max(1,Math.ceil(rows.length/CITY_ROWS_PER_COLUMN));return Array.from({length:count},(_,i)=>({uf,rows:rows.slice(i*CITY_ROWS_PER_COLUMN,(i+1)*CITY_ROWS_PER_COLUMN),continued:i>0,last:i===count-1}));});
 // Up to three blocks: one UF per column, as in the originals. More blocks are packed top-down.
 if(chunks.length<=3)return chunks.map(chunk=>[chunk]);
 const columns:CityChunk[][]=[];let used=0;
 for(const chunk of chunks){const cost=cityChunkHeight(chunk);if(!columns.length||used+cost>CITY_COLUMN_HEIGHT+CITY_GAP){columns.push([]);used=0;}columns.at(-1)!.push(chunk);used+=cost;}
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
