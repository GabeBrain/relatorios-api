// Regressão do localizador da ata (Fase A1) e do extrator de DOCX (A5).
// Fixture gerado por gera_estudo_teste.py --fixture ata (ata-imagem no slide 2).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

import { pptxToIr } from '../../audit/pptx-to-ir';
import { findAtaImage } from '../ata-image';
import { findTableImages } from '../table-images';
import { docxToText } from '../ata-docx';

const HERE = dirname(fileURLToPath(import.meta.url));
const bytes = new Uint8Array(readFileSync(join(HERE, 'teste_ata.pptx')));

describe('findAtaImage', () => {
  it('acha a ata-imagem no slide 2', async () => {
    const ir = await pptxToIr(bytes, 'teste_ata.pptx');
    const cand = await findAtaImage(bytes, ir);
    expect(cand).not.toBeNull();
    expect(cand!.slide).toBe(2);
    expect(cand!.kb).toBeGreaterThanOrEqual(60);
    expect(cand!.w).toBeGreaterThanOrEqual(900);
    expect(cand!.h).toBeGreaterThanOrEqual(600);
  });

  it('não confunde a ata com tabela numérica (localizador de tabelas a ignora)', async () => {
    const ir = await pptxToIr(bytes, 'teste_ata.pptx');
    const tables = await findTableImages(bytes, ir);
    // a ata está numa seção não-numérica e não tem aspecto de tabela → 0 candidatas
    expect(tables.length).toBe(0);
  });

  it('devolve null quando não há slide inicial com imagem grande', async () => {
    // o próprio deck de teste principal (DET) não tem ata nos slides 1-4
    const main = new Uint8Array(readFileSync(join(HERE, 'teste_corretor.pptx')));
    const ir = await pptxToIr(main, 'teste_corretor.pptx');
    expect(await findAtaImage(main, ir)).toBeNull();
  });
});

describe('docxToText', () => {
  it('extrai o texto de um .docx real e gera sha1 estável', async () => {
    // ata DOCX real da pasta docs (Grupo Impper)
    const docxPath = join(HERE, '..', '..', '..', '..', '..', '..',
      'docs', 'features', 'corretor-vocacionais', 'Ata_Reuniao_Briefing_Grupo_Impper_Sao_Jose_do_Rio_Preto.docx');
    let docxBytes: Uint8Array;
    try {
      docxBytes = new Uint8Array(readFileSync(docxPath));
    } catch {
      // arquivo pode não estar presente em todos os ambientes — pula sem falhar
      return;
    }
    const doc = await docxToText(docxBytes);
    expect(doc).not.toBeNull();
    expect(doc!.texto.length).toBeGreaterThan(50);
    expect(doc!.sha1).toMatch(/^[0-9a-f]{40}$/);
  });
});
