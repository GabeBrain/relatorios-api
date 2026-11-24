/// <reference lib="webworker" />
import {createCalculator} from './calculate';
import {DEFINITIONS_FOR} from './blueprint';
import {selectionKey,type Selection} from './model';
import {diagnostic,conferenceCsv} from './diagnostic';
import type {Report,Source,Slide} from './types';
self.onmessage=(event:MessageEvent<{mode:'calculate';selection:Selection;sources:Source[];startedAt:string}|{mode:'json'|'csv';report:Report}>)=>{
 try{
  const data=event.data;
  if(data.mode==='calculate'){
   const definitions=DEFINITIONS_FOR(data.selection.includeRm),calculator=createCalculator(data.selection,data.sources),slides:Slide[]=[];
   for(const d of definitions){slides.push(calculator.evaluate(d));self.postMessage({type:'progress',progress:{stage:'calculations',completed:slides.length,total:definitions.length,message:d.title,waiting:false}});}
   self.postMessage({type:'ready',report:{schema:'modelo-03-report-v1',selection:data.selection,key:selectionKey(data.selection),startedAt:data.startedAt,finishedAt:new Date().toISOString(),sources:data.sources,slides,errors:[],origin:'Geobrain API',homologated:false} satisfies Report});
  }else self.postMessage({type:'export',text:data.mode==='json'?JSON.stringify(diagnostic(data.report),null,2):conferenceCsv(data.report)});
 }catch{self.postMessage({type:'error',message:'Não foi possível processar as fontes do relatório. Tente novamente.'});}
};
