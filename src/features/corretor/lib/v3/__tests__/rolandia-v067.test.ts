// Regras v0.67 (rodada de Rolândia) com dados SINTÉTICOS.
import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { bmpToPngJs, pngDims } from '../pptx-media';
import { findTableImages } from '../table-images';
import { isConversationalNote } from '../../audit/pptx-to-ir';
import type { Ir } from '../../audit/ir';

function bmp(w: number, h: number, pixel: (x: number, y: number) => [number, number, number]): Uint8Array {
  const stride = Math.ceil((w * 3) / 4) * 4;
  const out = new Uint8Array(54 + stride * h);
  const dv = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d;
  dv.setUint32(2, out.length, true); dv.setUint32(10, 54, true); dv.setUint32(14, 40, true);
  dv.setInt32(18, w, true); dv.setInt32(22, h, true); dv.setUint16(26, 1, true); dv.setUint16(28, 24, true);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = pixel(x, h - 1 - y);
    const o = 54 + y * stride + x * 3;
    out[o] = b; out[o + 1] = g; out[o + 2] = r;
  }
  return out;
}

describe('BMP → PNG sem canvas', () => {
  it('gera PNG válido com as dimensões do BMP', () => {
    const png = bmpToPngJs(bmp(3, 2, () => [255, 0, 0]))!;
    expect(pngDims(png)).toEqual([3, 2]);
  });

  it('mapa/foto em BMP fica fora das candidatas; tabela em BMP entra', async () => {
    let seed = 7;
    // Bits altos do LCG: os baixos repetem a cada 256 e comprimem como tabela.
    const noise = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) >>> 16) & 0xff;
    const table = bmp(900, 320, (x, y) => (y % 40 === 0 || x % 150 === 0 ? [180, 180, 180] : [255, 255, 255]));
    const map = bmp(900, 320, () => [noise(), noise(), noise()]);
    const rels = (img: string) => strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${img}"/></Relationships>`);
    const pptx = zipSync({
      'ppt/slides/_rels/slide1.xml.rels': rels('image1.bmp'),
      'ppt/slides/_rels/slide2.xml.rels': rels('image2.bmp'),
      'ppt/media/image1.bmp': table,
      'ppt/media/image2.bmp': map,
    });
    const ir = { slides: [
      { n: 1, titulo: 'Domicílios por tipo', secao_canonica: 'SOCIO', textos: [] },
      { n: 2, titulo: 'Densidade demográfica', secao_canonica: 'SOCIO', textos: [] },
    ] } as unknown as Ir;
    const found = await findTableImages(pptx, ir);
    expect(found.map((c) => c.slide)).toEqual([1]);
    expect(found.skipped).toEqual([]);
  });
});

describe('recado do analista em caixa comum', () => {
  it('reconhece os recados de Rolândia', () => {
    expect(isConversationalNote('Lucas, conforme falei com você no presencial, a parte da análise de airbnb eu não fiz porque não tinha na região..')).toBe(true);
    expect(isConversationalNote('Lucas, aqui eu fiquei na dúvida.. No novo modelo colocamos somente o raio primário')).toBe(true);
    expect(isConversationalNote('Lucas, na concorrência, como eram somente dois empreendimentos, eu fiquei na dúvida em como fazer')).toBe(true);
  });

  it('texto de relatório não é recado', () => {
    expect(isConversationalNote('Rolândia, por sua vez, apresenta baixa verticalização.')).toBe(false);
    expect(isConversationalNote('Destaca-se a população em fase de maturidade financeira (entre 25 a 49 anos).')).toBe(false);
    expect(isConversationalNote('Centro, Jardim Caviúna e Vila Formosa concentram a oferta de revenda.')).toBe(false);
  });
});
