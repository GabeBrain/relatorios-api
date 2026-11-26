/// <reference lib="webworker" />
import {calculateReport} from './calculate';
import {diagnostic,conferenceCsv} from './diagnostic';
import type {Report,Source} from './types';
import type {Selection,City} from './model';
self.onmessage=(event:MessageEvent<{mode:'calculate';selection:Selection;cities:City[];missingUfs:string[];sources:Source[];startedAt:string}|{mode:'json'|'csv';report:Report}>)=>{
 try{const data=event.data;if(data.mode==='calculate'){const report=calculateReport(data.selection,data.cities,data.missingUfs,data.sources,data.startedAt,(completed,total,message)=>self.postMessage({type:'progress',progress:{stage:'calculations',completed,total,message,waiting:false}}));self.postMessage({type:'ready',report});}else self.postMessage({type:'export',text:data.mode==='json'?JSON.stringify(diagnostic(data.report),null,2):conferenceCsv(data.report)});}catch{self.postMessage({type:'error',message:'Não foi possível processar as fontes regionais. Tente novamente.'});}
};
