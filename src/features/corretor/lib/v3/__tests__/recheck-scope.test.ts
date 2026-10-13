import {describe,it,expect} from 'vitest';
import {directRecheckRuleWasEvaluated as evaluated} from '../recheck-scope';

describe('reconferência só resolve regras efetivamente executadas',()=>{
  it.each(['nested-radii-fonte-Dom.p Cond. Ocup.-1','nested-radii-fonte-Dom.p Tipo-0','ata-coverage','review-notes-blind','narrative-total-23-2032-goiania','entity-bairro','iavis-context-123','source-vision-23-any'])('preserva %s fora do escopo direto',id=>{
    expect(evaluated(id,false)).toBe(false);expect(evaluated(id,true)).toBe(false);
  });
  it.each(['structure','review-notes','sum-23-0','paged-sum-23-24','radii-3','travel-speed-9','native-format-12','wrong-city-15-curitiba','wrong-uf-15-pr','zi-label-10-0-3'])('permite diff da regra nativa %s',id=>expect(evaluated(id,false)).toBe(true));
  it('fonte direta só é avaliada quando foi cruzada; regra desconhecida não resolve',()=>{
    expect(evaluated('source-23-table-city-value',false)).toBe(false);
    expect(evaluated('source-23-table-city-value',true)).toBe(true);
    expect(evaluated('regra-futura',true)).toBe(false);
  });
});
