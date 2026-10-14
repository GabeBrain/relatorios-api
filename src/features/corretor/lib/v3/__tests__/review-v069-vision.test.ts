import {it,expect} from 'vitest';
import cases from './fixtures/review-v069-vision.json';
import {replayVisionPass} from '../ia-vision';
import type {TableImageCandidate} from '../table-images';
import {writeFileSync,existsSync} from 'node:fs';
import {reviewVisionFinding} from '../vision-column-review';
import type {Finding} from '../../audit/model';
it('retesta sete caches originais contra a revisão dos prints sem desligar erros reais',()=>{
 const results=cases.map(c=>{
  const candidate={slide:c.slide,secao:c.section,titulo:'',sha1:c.cache.sha1} as TableImageCandidate;
  const replay=replayVisionPass([candidate],new Map([[c.cache.sha1,{model:c.cache.model,payload:c.cache.payload}]]));
  return {ruleId:c.ruleId,findings:replay.findings};
 });
 if(existsSync('.local-inputs'))writeFileSync('.local-inputs/review-v069-vision-result.json',JSON.stringify(results,null,2));
 for(const c of results){
  const finding=c.findings.find(f=>f.id===c.ruleId);expect(finding,c.ruleId).toBeTruthy();
  if(['iavis-format-34bf9eac86','iavis-format-5039684ae6','iavis-pct-9767fb66f7-0'].includes(c.ruleId))expect(finding?.confidence,c.ruleId).toBe(3);
  if(['iavis-format-34bf9eac86','iavis-format-5039684ae6','iavis-pct-9767fb66f7-0'].includes(c.ruleId))expect(reviewVisionFinding({...finding,confidence:2} as Finding).confidence,c.ruleId+' legado').toBe(3);
  if(c.ruleId==='iavis-pct-9767fb66f7-0')expect(finding?.detail).toContain('Associação entre colunas não conferida');
  if(['iavis-bin-3c1bea45a9-0','iavis-format-5181287e1f','iavis-labeltypo-a74c5c4b86','iavis-sum-99ef53004b-0'].includes(c.ruleId))expect(finding?.confidence,c.ruleId+' controle verdadeiro').not.toBe(3);
 }
});
