import { cagedEnd, parseCagedReport, type CagedSource } from './caged';
import { maceioScope, type MaceioSelection } from './model';

export async function collectMaceioCaged(selection:MaceioSelection,authorized:string[],options:{token:string;signal?:AbortSignal;request?:typeof fetch}):Promise<CagedSource>{
  if(!options.token||!maceioScope(selection,authorized).valid)throw new Error('Confirme a autenticação e o recorte completo.');
  const check=()=>{if(options.signal?.aborted)throw new DOMException('Consulta cancelada.','AbortError');};check();
  const url=String(import.meta.env.VITE_SUPABASE_URL??'').replace(/\/$/,''),key=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY??'');
  if(!url||!key)return {report:null,issue:'O serviço CAGED ainda não está configurado neste ambiente.'};
  try{
    const response=await (options.request??fetch)(`${url}/functions/v1/caged-report`,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${options.token}`},body:JSON.stringify({periodicity:selection.periodicity,year:selection.year,position:selection.position}),signal:options.signal});check();
    if(!response.ok)return {report:null,issue:response.status===401||response.status===403?'Seu acesso não autorizou a consulta CAGED. Entre novamente.':response.status===429?'Limite de consultas CAGED atingido. Aguarde e tente novamente.':'Não foi possível consultar o CAGED. Confira a disponibilidade do serviço e tente novamente.'};
    const payload=await response.json();check();return {report:parseCagedReport(payload.report,cagedEnd(selection)),issue:null};
  }catch{check();return {report:null,issue:'A fonte CAGED não confirmou uma resposta completa. Tente novamente.'};}
}
