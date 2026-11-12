import {it,expect} from 'vitest';
import corpus from './fixtures/review-v069-text.json';
import {presentTextFindings} from '../text-review';
import type {FindingV3} from '../db';
import type {Ir} from '../../audit/ir';
import {writeFileSync,existsSync} from 'node:fs';
it('retesta 31 achados reais com transcrição nativa do material pareado',()=>{
 const results=corpus.map(c=>({id:c.id,before:c.items.length,items:presentTextFindings(c.items as FindingV3[],c.ir as Ir)}));
 const cj=results.find(c=>c.id==='cj')!,vap=results.find(c=>c.id==='vap')!,v2=results.find(c=>c.id==='v2')!;
 expect(cj.items).toHaveLength(cj.before-2);expect(vap.items).toHaveLength(vap.before);expect(v2.items).toHaveLength(v2.before);
 for(const [c,id] of [[cj,'iatxt-12-spelling-13khwc0'],[vap,'iatxt-12-spelling-10w0xzm'],[vap,'iatxt-70-spelling-1p3nh6a'],[v2,'iatxt-87-spelling-9grnbp']] as const)expect(c.items.find(i=>i.ruleId===id)?.finding.confidence).toBe(3);
 for(const c of results)for(const i of c.items.filter(i=>/OBSERT|Avalição|Shor Stay|são esperado|Churrasqueria|uma uma|um custos/.test(i.finding.viz?.kind==='text'?i.finding.viz.evidence??'':'')))expect(i.finding.confidence,i.ruleId).not.toBe(3);
 if(existsSync('.local-inputs'))writeFileSync('.local-inputs/review-v069-text-result.json',JSON.stringify(results,null,2));
});
