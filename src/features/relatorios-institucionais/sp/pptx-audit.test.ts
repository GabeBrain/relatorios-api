import { describe, expect, it } from 'vitest';
import PptxGenJS from 'pptxgenjs';
import { strFromU8, unzipSync } from 'fflate';
import { embedSpPptxAudit, SP_PPTX_AUDIT_NS, SP_PPTX_AUDIT_PART } from './pptx-audit';

describe('SP PPTX — auditoria sem notas extensas', () => {
  it('empacota auditoria maior que a real sem alterar slides/textos ou inflar notas', async () => {
    const pptx = new PptxGenJS();
    for (let index = 1; index <= 85; index++) {
      const slide = pptx.addSlide();
      slide.addText(`Slide ${index}: São Paulo`, { x: 1, y: 1, w: 5, h: 1 });
      slide.addNotes('Versão de conferência.');
    }
    const source = await pptx.write({ outputType: 'uint8array' }) as Uint8Array;
    const audit = { schema: 'sp-practical-review-v1', text: '<São Paulo> & "teste" 😀'.repeat(30_000) };
    expect(JSON.stringify(audit).length).toBeGreaterThan(326_127);
    const result = unzipSync(embedSpPptxAudit(source, audit)), before = unzipSync(source);
    for (const [path, data] of Object.entries(before)) {
      if (!['ppt/_rels/presentation.xml.rels', '[Content_Types].xml'].includes(path)) expect(result[path]).toEqual(data);
      if (/notesSlide\d+\.xml$/.test(path)) expect(strFromU8(result[path]).length).toBeLessThan(10_000);
    }
    const document = new DOMParser().parseFromString(strFromU8(result[SP_PPTX_AUDIT_PART]), 'application/xml');
    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.documentElement.namespaceURI).toBe(SP_PPTX_AUDIT_NS);
    expect(JSON.parse(document.documentElement.textContent!)).toEqual(audit);
    const rels = new DOMParser().parseFromString(strFromU8(result['ppt/_rels/presentation.xml.rels']), 'application/xml');
    expect([...rels.documentElement.children].filter(rel => rel.getAttribute('Target') === '../' + SP_PPTX_AUDIT_PART)).toHaveLength(1);
    const types = new DOMParser().parseFromString(strFromU8(result['[Content_Types].xml']), 'application/xml');
    expect([...types.documentElement.children].some(type => type.getAttribute('PartName') === '/' + SP_PPTX_AUDIT_PART && type.getAttribute('ContentType') === 'application/xml')).toBe(true);
  });
});
