import { buildMaceioDiagnostic,type DiagnosticGeneration } from './diagnostic';
import type { MaceioSelection } from './model';
import { buildMaceioClosedReview } from './closed-review';
self.onmessage=(event:MessageEvent<{selection:MaceioSelection;generation:DiagnosticGeneration}>)=>{
  try { self.postMessage({type:'ready',snapshot:buildMaceioDiagnostic(event.data.selection,event.data.generation),closedReview:buildMaceioClosedReview(event.data.selection,event.data.generation.intro?.slides??null)}); }
  catch { self.postMessage({type:'error'}); }
};
