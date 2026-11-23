import { buildMaceioDiagnostic,type DiagnosticGeneration } from './diagnostic';
import type { MaceioSelection } from './model';
import { buildMaceioClosedReview } from './closed-review';
import { buildMaceioStockReview } from './stock-review';
import { buildMaceioDataIssuesReview } from './data-issues-review';
self.onmessage=(event:MessageEvent<{selection:MaceioSelection;generation:DiagnosticGeneration}>)=>{
  try { self.postMessage({type:'ready',snapshot:buildMaceioDiagnostic(event.data.selection,event.data.generation),closedReview:buildMaceioClosedReview(event.data.selection,event.data.generation.intro?.slides??null),stockReview:buildMaceioStockReview(event.data.selection,event.data.generation.intro?.slides??null),dataReview:buildMaceioDataIssuesReview(event.data.selection,event.data.generation.intro?.slides??null)}); }
  catch { self.postMessage({type:'error'}); }
};
