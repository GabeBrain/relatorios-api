import {buildMaceioDiagnostic,type DiagnosticGeneration} from './diagnostic';
import type {MaceioSelection} from './model';
self.onmessage=(event:MessageEvent<{selection:MaceioSelection;generation:DiagnosticGeneration}>)=>{
 try{self.postMessage({type:'ready',audit:buildMaceioDiagnostic(event.data.selection,event.data.generation)});}
 catch{self.postMessage({type:'error'});}
};
