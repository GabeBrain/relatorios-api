// @vitest-environment jsdom
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { compileSindusconPdf } from './pdf-compiler';

const fontBytes = Uint8Array.from(fs.readFileSync('public/sinduscon-templates/righteous-regular.ttf')).buffer;

async function pdfWithPages(count: number, width: number, height: number) {
  const document = await PDFDocument.create();
  for (let index = 0; index < count; index += 1) document.addPage([width, height]);
  return (await document.save()).buffer as ArrayBuffer;
}

describe('compileSindusconPdf', () => {
  it('mantém capa, mapa e as oito páginas do relatório na ordem', async () => {
    const result = await compileSindusconPdf(
      await pdfWithPages(8, 595.2, 841.68),
      await pdfWithPages(1, 540, 785.28),
      await pdfWithPages(1, 595.22, 842),
      fontBytes,
      'alvaras', 'Agosto', 2026,
    );
    const document = await PDFDocument.load(result.bytes);
    expect(document.getPageCount()).toBe(10);
    expect(document.getPage(0).getSize()).toEqual({ width: 540, height: 785.28 });
    expect(document.getPage(1).getSize()).toEqual({ width: 595.22, height: 842 });
    expect(document.getPage(2).getSize()).toEqual({ width: 595.2, height: 841.68 });
    expect(result.fileName).toBe('Relatorio_Liberados_CWB_AGOSTO2026.pdf');
  });

  it('recusa uma exportação incompleta do Excel', async () => {
    await expect(compileSindusconPdf(
      await pdfWithPages(7, 595.2, 841.68),
      await pdfWithPages(1, 540, 785.28),
      await pdfWithPages(1, 595.22, 842),
      fontBytes,
      'cvco', 'Agosto', 2026,
    )).rejects.toThrow('exatamente 8 páginas');
  });
});
