const VERSION='mte-caged-v1';
const CITIES=['maceio','pilar','marechal deodoro','paripueira','rio largo','barra de sao miguel','coqueiro seco'];
const normalize=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
class SafeError extends Error {constructor(public status:number,public code:string){super(code);}}
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
export function createCagedReportHandler({env,request=fetch,now=Date.now}:{env:(key:string)=>string|undefined;request?:typeof fetch;now?:()=>number}){
  const limits=new Map<string,{start:number;count:number}>();
  return async(req:Request):Promise<Response>=>{
    const origin=req.headers.get('Origin')??'';
    const allowed=origin==='https://geobrain-relatorios.lovable.app'||/^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(origin)||['http://localhost:8080','http://localhost:5173'].includes(origin)||(env('ALLOWED_ORIGINS')??'').split(',').map(x=>x.trim()).includes(origin);
    const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowed?origin:'https://geobrain-relatorios.lovable.app','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS',Vary:'Origin'};
    const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    try{
      if(origin&&!allowed)throw new SafeError(403,'ORIGIN');
      if(req.method!=='POST')throw new SafeError(405,'METHOD');
      const auth=req.headers.get('Authorization')??'';
      if(!/^Bearer\s+\S+$/i.test(auth))throw new SafeError(401,'UNAUTHORIZED');
      if(Number(req.headers.get('Content-Length')??0)>2048)throw new SafeError(413,'PAYLOAD');
      const raw=await req.text();if(new TextEncoder().encode(raw).length>2048)throw new SafeError(413,'PAYLOAD');
      let body:Record<string,unknown>;try{body=JSON.parse(raw);}catch{throw new SafeError(400,'PAYLOAD');}
      if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(key=>!['periodicity','year','position'].includes(key))||!['monthly','quarterly'].includes(String(body.periodicity))||!Number.isInteger(body.year)||Number(body.year)<2020||Number(body.year)>2100||!Number.isInteger(body.position)||Number(body.position)<1||Number(body.position)>(body.periodicity==='monthly'?12:4))throw new SafeError(400,'PERIOD');
      const key=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(auth)));
      const limit=limits.get(key),time=now();
      if(limit&&time-limit.start<600000){if(++limit.count>20)throw new SafeError(429,'RATE_LIMIT');}
      else{if(limits.size>=1000)limits.delete(limits.keys().next().value!);limits.set(key,{start:time,count:1});}
      const found=new Set<string>();let url='https://geobrain.com.br/public-api/monitored-cities';const visited=new Set<string>();
      for(let page=0;page<100;page++){
        if(visited.has(url))throw new SafeError(502,'AUTH_PAGINATION');visited.add(url);
        const result=await request(url,{headers:{Authorization:auth,Accept:'application/json'},signal:AbortSignal.timeout(20000)});
        if(result.status===401||result.status===403)throw new SafeError(result.status,'UNAUTHORIZED');
        if(!result.ok)throw new SafeError(502,'AUTH_UPSTREAM');
        const data=await result.json();if(!Array.isArray(data?.data))throw new SafeError(502,'AUTH_CONTRACT');
        for(const row of data.data)if(row.state==='AL'&&typeof row.city==='string')found.add(normalize(row.city));
        if(!data.links||!Object.prototype.hasOwnProperty.call(data.links,'next'))throw new SafeError(502,'AUTH_PAGINATION');
        if(data.links.next===null)break;
        if(page===99||typeof data.links.next!=='string'||!data.links.next)throw new SafeError(502,'AUTH_PAGINATION');
        const next=new URL(data.links.next,url);if(next.origin!=='https://geobrain.com.br'||next.pathname!=='/public-api/monitored-cities')throw new SafeError(502,'AUTH_PAGINATION');url=next.href;
      }
      const required=body.periodicity==='monthly'?CITIES:CITIES.slice(0,6);
      if(required.some(city=>!found.has(city)))throw new SafeError(403,'SCOPE');
      const proxy=env('BIGQUERY_PROXY_URL')?.replace(/\/$/,''),secret=env('BIGQUERY_PROXY_HMAC_SECRET')?.trim();
      if(!proxy||!secret)throw new SafeError(503,'PROXY_CONFIGURATION');
      const end=`${body.year}-${String(Number(body.position)*(body.periodicity==='quarterly'?3:1)).padStart(2,'0')}`;
      const payload=JSON.stringify({end,version:VERSION}),timestamp=String(now());
      const signingKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
      const signature=hex(await crypto.subtle.sign('HMAC',signingKey,new TextEncoder().encode(`${timestamp}.${payload}`)));
      const response=await request(`${proxy}/v1/caged-mte`,{method:'POST',headers:{'Content-Type':'application/json','X-Quanti-Timestamp':timestamp,'X-Quanti-Signature':signature},body:payload,signal:AbortSignal.timeout(45000)});
      if(!response.ok)throw new SafeError(response.status===429?429:502,'PROXY_UPSTREAM');
      const text=await response.text();if(text.length>1_000_000)throw new SafeError(502,'PROXY_CONTRACT');
      const data=JSON.parse(text);if(data?.report?.version!==VERSION||data.report.end!==end||!Array.isArray(data.report.rows)||data.report.rows.length>2500)throw new SafeError(502,'PROXY_CONTRACT');
      return reply({report:data.report});
    }catch(error){const failure=error instanceof SafeError?error:new SafeError(502,'UPSTREAM');return reply({error:'Não foi possível concluir a consulta CAGED. Tente novamente.',code:failure.code},failure.status);}
  };
}
