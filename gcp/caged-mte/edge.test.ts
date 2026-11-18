import {describe,it,expect,vi} from 'vitest';
import {createCagedReportHandler} from '../../supabase/functions/caged-report/handler';
const cities=['Maceió','Pilar','Marechal Deodoro','Paripueira','Rio Largo','Barra de São Miguel','Coqueiro Seco'];
const env=(key:string)=>({BIGQUERY_PROXY_URL:'https://proxy.invalid',BIGQUERY_PROXY_HMAC_SECRET:'test-secret'}[key]);
const req=(body:unknown={periodicity:'monthly',year:2026,position:5},token=true)=>new Request('https://edge.invalid',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer synthetic-test'}:{})},body:JSON.stringify(body)});
describe('Edge CAGED · Bearer, escopo AL e ponte fechada',()=>{
 it('valida catálogo paginado e assina somente o contrato CAGED',async()=>{
  const request=vi.fn<typeof fetch>().mockImplementation(async(input)=>{
   const url=String(input);
   if(url.startsWith('https://proxy.invalid'))return new Response(JSON.stringify({report:{version:'mte-caged-v1',end:'2026-05',rows:[]}}));
   const second=url.includes('page=2');return new Response(JSON.stringify({data:(second?cities.slice(3):cities.slice(0,3)).map(city=>({city,state:'AL'})),links:{next:second?null:'https://geobrain.com.br/public-api/monitored-cities?page=2'}}));
  });
  const response=await createCagedReportHandler({env,request,now:()=>1794920000000})(req());expect(response.status).toBe(200);expect(request).toHaveBeenCalledTimes(3);
  const [,options]=request.mock.calls[2];expect(options?.body).toBe(JSON.stringify({end:'2026-05',version:'mte-caged-v1'}));expect(options?.headers).not.toHaveProperty('Authorization');expect(options?.headers).toHaveProperty('X-Quanti-Signature');
 });
 it('bloqueia sem token, período inválido e SQL do cliente antes da ponte',async()=>{
  const request=vi.fn<typeof fetch>();const handler=createCagedReportHandler({env,request});
  expect((await handler(req(undefined,false))).status).toBe(401);
  expect((await handler(req({periodicity:'monthly',year:2026,position:13}))).status).toBe(400);
  expect((await handler(req({periodicity:'monthly',year:2026,position:5,sql:'SELECT secret'}))).status).toBe(400);expect(request).not.toHaveBeenCalled();
 });
 it('rejeita UF/cidades faltantes e paginação que desviaria o Bearer',async()=>{
  for(const next of [null,'https://evil.invalid']){
   const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({data:[{city:'Maceió',state:'AL'}],links:{next}})));
   const response=await createCagedReportHandler({env,request})(req());expect(response.status).toBe(next?502:403);expect(request).toHaveBeenCalledTimes(1);
  }
 });
 it('sanitiza erros da ponte e exige segredo configurado',async()=>{
  const request=vi.fn<typeof fetch>().mockImplementation(async(input)=>String(input).includes('proxy.invalid')?new Response('private-details',{status:500}):new Response(JSON.stringify({data:cities.map(city=>({city,state:'AL'})),links:{next:null}})));
  const result=await createCagedReportHandler({env,request})(req());expect(result.status).toBe(502);expect(await result.text()).not.toMatch(/private/);
  expect((await createCagedReportHandler({env:()=>undefined,request})(req())).status).toBe(503);
 });
});
