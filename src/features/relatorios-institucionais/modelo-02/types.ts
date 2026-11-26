import type {Selection,City} from './model';
import type {Source,Progress,Table} from '../modelo-03/types';
export type {Source,Progress,Table};
export interface MapPoint {id:string;name:string;latitude:number;longitude:number;stock:number;family:string;meter?:number|null}
export interface MapData {city:City;part:number;parts:number;points:MapPoint[];totalProjects:number;locatedProjects:number;missingCoordinates:number;excludedProjects:number}
export interface Slide {id:string;title:string;kind:'cover'|'section'|'data'|'map'|'closing'|'institutional';status:'available'|'waiting-source';tables:Table[];warnings:string[];sourceKeys:string[];note:string;map?:MapData;coverage?:'complete'|'partial';referenceNumber?:number;referenceNumbers?:number[];presentation?:import('./presentation').Presentation}
export interface Report {schema:'modelo-02-report-v1';selection:Selection;cities:City[];missingUfs:string[];startedAt:string;finishedAt:string;sources:Source[];slides:Slide[];homologated:false}
