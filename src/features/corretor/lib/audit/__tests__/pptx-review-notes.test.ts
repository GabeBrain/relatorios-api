import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';

import { pptxToIr } from '../pptx-to-ir';
import { irToFindings } from '../ir-rules';

const SLIDE = `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
 <p:cSld><p:spTree>
  <p:sp><p:txBody><a:p><a:r><a:t>Dados de Guarulhos</a:t></a:r></a:p></p:txBody></p:sp>
  <p:sp><p:spPr><a:solidFill><a:srgbClr val="FFFF00"/></a:solidFill></p:spPr>
    <p:txBody><a:p><a:r><a:rPr><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:rPr>
    <a:t>Ajustar os dados desta tabela</a:t></a:r></a:p></p:txBody></p:sp>
 </p:spTree></p:cSld>
</p:sld>`;

describe('PPTX → IR — notas de revisão', () => {
  it('separa balão amarelo/vermelho de textos e o mantém como rede de segurança', async () => {
    const pptx = zipSync({ 'ppt/slides/slide1.xml': strToU8(SLIDE) });
    const ir = await pptxToIr(pptx, 'revisao.pptx');

    expect(ir.slides[0].textos).toEqual(['Dados de Guarulhos']);
    expect(ir.slides[0].notas_revisao).toEqual(['Ajustar os dados desta tabela']);

    const findings = irToFindings(ir).filter((f) => !f.ok);
    expect(findings.some((f) => f.type === 'LEFTOVER_NOTE' && f.slideRef === 's1')).toBe(true);
  });
});
