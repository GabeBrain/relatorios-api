import { decodePDFRawStream, PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { normalizeEnglishThousands, normalizePdfNumberFormat } from './pdf-number-normalizer';

describe('normalização de separadores no PDF', () => {
  it.each([
    ['137,441.50', '137.441,50'], ['1,014,752', '1.014.752'],
    ['Total: 270,000 m²', 'Total: 270.000 m²'], ['137.441,50', '137.441,50'],
    ['12,345%', '12,345%'], ['0,24%', '0,24%'], ['123,45', '123,45'],
  ])('normaliza apenas o agrupamento reconhecido: %s', (input, output) => {
    expect(normalizeEnglishThousands(input)).toBe(output);
  });

  async function fixture(unicode: boolean) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText('137,441.50', { font, x: 30, y: 700, size: 12 });
    if (unicode) {
      const cmap = pdf.context.flateStream('1 beginbfrange\n<0020> <007E> <0020>\nendbfrange');
      const customFont = pdf.context.obj({ Type: 'Font', Subtype: 'Type0', ToUnicode: pdf.context.register(cmap) });
      const resources = page.node.Resources()!;
      const fonts = resources.lookup(PDFName.of('Font')) as PDFDict;
      fonts.set(PDFName.of('Custom'), pdf.context.register(customFont));
      const stream = pdf.context.flateStream('BT /Custom 12 Tf 30 650 Td [<003100330037002C> -5 <003400340031002E00350030>] TJ ET');
      page.node.addContentStream(pdf.context.register(stream));
    }
    return (await pdf.save()).buffer as ArrayBuffer;
  }

  async function streams(buffer: ArrayBuffer) {
    const pdf = await PDFDocument.load(buffer);
    const contents = pdf.getPage(0).node.Contents() as PDFArray;
    return { pdf, text: Array.from({ length: contents.size() }, (_, i) => {
      const stream = pdf.context.lookup(contents.get(i)) as PDFRawStream;
      return new TextDecoder().decode(decodePDFRawStream(stream).decode());
    }).join('\n') };
  }

  it('altera o texto vetorial sem cobrir ou rasterizar números e conserva página e posição', async () => {
    const output = await normalizePdfNumberFormat(await fixture(false));
    const { pdf, text } = await streams(output);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 595, height: 842 });
    expect(text).toContain('<3133372E3434312C3530>');
    expect(text).not.toContain('3133372C3434312E3530');
    expect(text).toContain('30 700 Tm');
    expect(text).not.toContain(' Do');
  });

  it('reconhece fonte Unicode e número dividido em partes do mesmo TJ sem alterar os ajustes', async () => {
    const { text } = await streams(await normalizePdfNumberFormat(await fixture(true)));
    expect(text).toContain('[<003100330037002E> -5 <003400340031002C00350030>] TJ');
  });

  it('é idempotente', async () => {
    const once = await normalizePdfNumberFormat(await fixture(true));
    const twice = await normalizePdfNumberFormat(once);
    expect((await streams(twice)).text).toBe((await streams(once)).text);
  });

  it('corrige textos dentro de formulários vetoriais do PDF', async () => {
    const pdf = await PDFDocument.load(await fixture(false));
    const page = pdf.getPage(0);
    const resources = page.node.Resources()!;
    const fonts = resources.lookup(PDFName.of('Font')) as PDFDict;
    const fontName = fonts.keys()[0].asString();
    const form = pdf.context.flateStream(`BT ${fontName} 12 Tf (1,234,567.89) Tj ET`, {
      Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 500, 500], Resources: pdf.context.obj({ Font: fonts }),
    });
    resources.set(PDFName.of('XObject'), pdf.context.obj({ Numbers: pdf.context.register(form) }));
    const result = await PDFDocument.load(await normalizePdfNumberFormat((await pdf.save()).buffer as ArrayBuffer));
    const objects = result.getPage(0).node.Resources()!.lookup(PDFName.of('XObject')) as PDFDict;
    const rewritten = objects.lookup(PDFName.of('Numbers')) as PDFRawStream;
    expect(new TextDecoder().decode(decodePDFRawStream(rewritten).decode())).toContain('<312E3233342E3536372C3839> Tj');
  });

  async function punctuationSubset(operator: 'Tj' | 'TJ', bold = false) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const cmap = pdf.context.flateStream('2 beginbfrange\n<0030> <0039> <0030>\n<002C> <002C> <002C>\nendbfrange');
    const font = pdf.context.obj({ Type: 'Font', Subtype: 'Type0', BaseFont: bold ? 'Subset+Arial-BoldMT' : 'Subset+ArialMT', Encoding: 'Identity-H',
      ToUnicode: pdf.context.register(cmap), DescendantFonts: [pdf.context.register(pdf.context.obj({ Type: 'Font', Subtype: 'CIDFontType2', DW: 556, W: [44, [250]] }))] });
    page.node.set(PDFName.of('Resources'), pdf.context.obj({ Font: { Original: pdf.context.register(font) } }));
    const text = operator === 'TJ' ? '[<003100330037002C> -42 <003400340031>] TJ' : '<003100330037002C003400340031> Tj';
    page.node.addContentStream(pdf.context.register(pdf.context.flateStream(`BT /Original 12 Tf 30 700 Td ${text} <0039> Tj ET`)));
    return (await pdf.save()).buffer as ArrayBuffer;
  }

  it.each(['Tj', 'TJ'] as const)('usa pontuação auxiliar quando o subset não contém ponto (%s)', async operator => {
    const { text } = await streams(await normalizePdfNumberFormat(await punctuationSubset(operator)));
    expect(text).toMatch(/\/BrainNumberRegular[^ ]* 12 Tf <2e> Tj \[28\] TJ \/Original 12 Tf/);
    expect(text).toContain('<003100330037> Tj');
    expect(text).not.toContain('002C');
    expect(text).toContain('<0039> Tj'); // Original font is restored for the next value.
    if (operator === 'TJ') expect(text).toContain('[-42] TJ');
  });

  it('preserva a distinção negrito e é idempotente com fonte auxiliar', async () => {
    const once = await normalizePdfNumberFormat(await punctuationSubset('TJ', true));
    const first = (await streams(once)).text;
    expect(first).toMatch(/\/BrainNumberBold[^ ]* 12 Tf/);
    expect((await streams(await normalizePdfNumberFormat(once))).text).toBe(first);
  });
});
