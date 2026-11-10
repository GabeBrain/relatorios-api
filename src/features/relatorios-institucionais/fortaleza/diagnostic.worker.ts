import { buildFortalezaDiagnostic,type DiagnosticGeneration } from './diagnostic';
import type { FortalezaSelection } from './model';
self.onmessage=(event:MessageEvent<{selection:FortalezaSelection;generation:DiagnosticGeneration}>)=>{
  try { self.postMessage({type:'ready',snapshot:buildFortalezaDiagnostic(event.data.selection,event.data.generation)}); }
  catch { self.postMessage({type:'error'}); }
};
