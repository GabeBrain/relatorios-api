import type {Selection} from './model';
import type {Definition} from './blueprint';
export type Row=Record<string,unknown>;
export type Segment='Vertical'|'Horizontal'|'Comercial';
export interface Source {city:string;uf:string;segment:Segment;metric:'releases'|'sales'|'stock'|'details'|'rentals';group:'Padrão'|'Tipologia'|'Empreendimento';rows:Row[];complete:boolean;requests:number;httpStatus:number|null;failure:string|null;endpoint:string;finishedAt:string}
export interface Progress {stage:'scope'|'sources'|'calculations'|'slides';completed:number;total:number;message:string;waiting:boolean}
export type Cell=number|string|null;
export interface Table {columns:string[];rows:{label:string;values:Cell[]}[];unit:string;formats:('count'|'money'|'decimal'|'percent'|'text')[]}
export interface Slide {definition:Definition;status:'available'|'waiting-source'|'editorial'|'not-applicable';issue:string|null;warnings:string[];tables:Table[];sourceKeys:string[];note:string}
export interface Report {schema:'modelo-03-report-v1';selection:Selection;key:string;startedAt:string;finishedAt:string;sources:Source[];slides:Slide[];errors:string[];origin:'Geobrain API';homologated:false}
export const sourceKey=(s:Pick<Source,'city'|'uf'|'segment'|'metric'|'group'>)=>`${s.uf}/${s.city}/${s.segment}/${s.metric}/${s.group}`;
