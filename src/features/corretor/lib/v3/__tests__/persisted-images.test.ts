import { it,expect } from 'vitest';
import { writeFileSync, existsSync } from 'node:fs';
import cases from './fixtures/persisted-image-cases.json';
import { replayVisionPass } from '../ia-vision';
import { isStaleVisionContext } from '../reconcile';
import type { TableImageCandidate } from '../table-images';
import type { Finding } from '../../audit/model';

it('retesta leituras originais sem IA e registra achados atuais por evidência',()=>{
 const results=cases.map(c=>{
  const candidate={slide:c.slide,secao:c.secao,titulo:'',sha1:c.cache.sha1} as TableImageCandidate;
  const result=replayVisionPass([candidate],new Map([[c.cache.sha1,{payload:c.cache.payload,model:c.cache.model}]]),{cidade:c.city,uf:'PR'});
  const text=JSON.stringify(c.cache.payload.tables);
  const stale=isStaleVisionContext(c.original as Finding,c.city,text);
  // Print s35 contém só a consolidada. Cache antigo inventou tabelas Cidade/UF
  // que dão falsa âncora ao nome São Paulo; transcrição conferida separada.
  const verified=c.name==='ushome-context' ? { ...c.cache.payload, tables:c.cache.payload.tables.slice(0,1) } : null;
  const verifiedResult=verified ? replayVisionPass([candidate],new Map([[c.cache.sha1,{payload:verified,model:c.cache.model}]]),{cidade:c.city,uf:'PR'}) : null;
  return {name:c.name,ruleId:c.ruleId,stale,findings:result.findings,verifiedFindings:verifiedResult?.findings,image:c.image};
 });
 const city=results.find(r=>r.name==='ushome-context')!;
 expect(city.stale).toBe(false); // OCR inventado também consta como tabela: limitação real.
 expect(city.verifiedFindings?.some(f=>f.type==='WRONG_CONTEXT')).toBe(false);
 const sum=results.find(r=>r.name==='curitiba-sum')!;
 expect(sum.findings.some(f=>f.type==='ABSOLUTE_SUM')).toBe(true);
 const out='.local-inputs/audit-20261013/image-retest.json';
 if(existsSync('.local-inputs/audit-20261013'))writeFileSync(out,JSON.stringify(results,null,2));
});
