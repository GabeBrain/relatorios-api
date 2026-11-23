import { cagedEnd, parseCagedReport, type CagedSource } from './caged';
import { maceioScope, type MaceioSelection } from './model';
import { loadVerifiedCagedReport } from './caged-snapshot';

export async function collectMaceioCaged(selection:MaceioSelection,authorized:string[],options:{token:string;signal?:AbortSignal;request?:typeof fetch}):Promise<CagedSource>{
  if(!options.token||!maceioScope(selection,authorized).valid)throw new Error('Confirme a autenticação e o recorte completo.');
  const check=()=>{if(options.signal?.aborted)throw new DOMException('Consulta cancelada.','AbortError');};check();
  const url=String(import.meta.env.VITE_SUPABASE_URL??'').replace(/\/$/,''),key=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY??'');
  const contingency=async(code:string,httpStatus:number|null,issue:string):Promise<CagedSource>=>{
    check();
    try{const verified=await loadVerifiedCagedReport(cagedEnd(selection),true);check();if(verified)return {report:verified.report,issue:null,requestedEnd:verified.requestedEnd,delivery:{kind:'verified-snapshot',verifiedAt:verified.verifiedAt},failure:{code,httpStatus}};}catch{check();}
    return {report:null,issue,failure:{code,httpStatus}};
  };
  if(!url||!key)return contingency('CLIENT_CONFIGURATION',null,'O serviço CAGED ainda não está configurado neste ambiente e não há cópia verificada para a competência.');
  const controller=new AbortController(),cancel=()=>controller.abort(),timer=setTimeout(()=>controller.abort(),45000);
  options.signal?.addEventListener('abort',cancel,{once:true});
  try{
    let response:Response;
    try{response=await (options.request??fetch)(`${url}/functions/v1/caged-report`,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${options.token}`},body:JSON.stringify({periodicity:selection.periodicity,year:selection.year,position:selection.position}),signal:controller.signal});}
    catch{check();return contingency(controller.signal.aborted?'TIMEOUT':'NETWORK',null,'Não foi possível consultar o CAGED e não há cópia verificada para a competência.');}
    check();
    if(!response.ok){
      const allowedCodes=['PROXY_CONFIGURATION','PROXY_UPSTREAM','PROXY_CONTRACT','AUTH_UPSTREAM','AUTH_CONTRACT','AUTH_PAGINATION','UPSTREAM'];let code=`HTTP_${response.status}`;
      try{const text=await response.text();if(text.length<=4096){const body=JSON.parse(text);if(allowedCodes.includes(body?.code))code=body.code;}}catch{/* Provider bodies never leave this boundary. */}check();
      if(response.status===404||response.status>=500)return contingency(code,response.status,'Não foi possível consultar o CAGED e não há cópia verificada para a competência.');
      return {report:null,issue:response.status===401||response.status===403?'Seu acesso não autorizou a consulta CAGED. Entre novamente.':response.status===429?'Limite de consultas CAGED atingido. Aguarde e tente novamente.':'Não foi possível consultar o CAGED. Confira a disponibilidade do serviço e tente novamente.',failure:{code,httpStatus:response.status}};
    }
    const payload=await response.json();check();return {report:parseCagedReport(payload.report,cagedEnd(selection)),issue:null,delivery:{kind:'online'}};
  }catch{check();return {report:null,issue:'A fonte CAGED não confirmou uma resposta completa. Tente novamente.',failure:{code:'CONTRACT',httpStatus:null}};}
  finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);}
}
