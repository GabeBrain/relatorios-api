import { expect, it } from 'vitest';
import { presentFindingPt } from '../present-finding-pt';
import type { Finding } from '../../audit/model';
it('apresenta inglês legado em português, preservando identidade, literal e confiança', () => {
  const original = {id:'iatxt-68',type:'SPELLING',title:"Misspelling of 'Observatório'.",detail:"Misspelling of 'Observatório'.",confidence:2,slideRef:'s68',ok:false,viz:{kind:'text',evidence:'OBSERTÓRIO DO TURISMO 2023'}} as Finding;
  const shown=presentFindingPt(original);
  expect(shown.title).toBe("Possível erro de grafia em 'Observatório'");
  expect(shown.id).toBe(original.id); expect(shown.confidence).toBe(original.confidence); expect(shown.viz).toBe(original.viz);
  expect(original.title).toBe("Misspelling of 'Observatório'.");
});
it('não inventa tradução de uma acusação desconhecida nem altera evidência literal em outro idioma', () => {
  const original={id:'1',type:'COHERENCE',title:'The numbers should match',detail:'There is an inconsistent figure',slideRef:'s1',ok:false,viz:{kind:'text',evidence:'The original label 1.030'}} as Finding;
  const shown=presentFindingPt(original); expect(shown.title).not.toContain('should'); expect(shown.detail).not.toContain('There'); expect(shown.viz).toEqual(original.viz);
});
