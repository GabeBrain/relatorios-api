// Corretor v3 — utilidades compartilhadas de mídia do .pptx (dims, sha1, rels).
// Extraídas de table-images.ts para o localizador da ata reusar sem duplicar.

export const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
export const NS_DRAW = 'http://schemas.openxmlformats.org/drawingml/2006/main';
export const NS_DOC_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const NS_PRESENTATION = 'http://schemas.openxmlformats.org/presentationml/2006/main';

/** [largura, altura] de um PNG pelo header IHDR, ou null se não for PNG. */
export function pngDims(d: Uint8Array): [number, number] | null {
  if (d.length < 24 || d[0] !== 0x89 || d[1] !== 0x50) return null;
  const dv = new DataView(d.buffer, d.byteOffset);
  return [dv.getUint32(16), dv.getUint32(20)];
}

/** [largura, altura] de um JPEG pelo primeiro marcador SOF, ou null. */
export function jpegDims(d: Uint8Array): [number, number] | null {
  if (d.length < 4 || d[0] !== 0xff || d[1] !== 0xd8) return null;
  const dv = new DataView(d.buffer, d.byteOffset);
  let i = 2;
  while (i < d.length - 9) {
    if (d[i] !== 0xff) { i++; continue; }
    const marker = d[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return [dv.getUint16(i + 7), dv.getUint16(i + 5)]; // [w, h]
    }
    i += 2 + dv.getUint16(i + 2);
  }
  return null;
}

/** [largura, altura] de um BMP pelo BITMAPINFOHEADER, ou null se não for BMP. */
export function bmpDims(d: Uint8Array): [number, number] | null {
  if (d.length < 26 || d[0] !== 0x42 || d[1] !== 0x4d) return null;
  const dv = new DataView(d.buffer, d.byteOffset);
  // altura negativa = bitmap top-down; o tamanho é o mesmo.
  return [Math.abs(dv.getInt32(18, true)), Math.abs(dv.getInt32(22, true))];
}

/** Dimensões de PNG, JPEG ou BMP. */
export function imageDims(d: Uint8Array): [number, number] | null {
  return pngDims(d) ?? jpegDims(d) ?? bmpDims(d);
}

/**
 * BMP → PNG no navegador. Os modelos de visão não aceitam BMP, e o PowerPoint
 * guarda "colar como imagem" do Excel em BMP: na v2 do SJC (jul/2026) eram 48
 * das tabelas, todas descartadas em silêncio. Sem canvas (node/testes) devolve
 * null e o chamador registra a imagem como não lida — nunca some calada.
 */
export async function bmpToPng(d: Uint8Array): Promise<Uint8Array | null> {
  try {
    if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
    const bitmap = await createImageBitmap(new Blob([d as BlobPart], { type: 'image/bmp' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    return null;
  }
}

export async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function mimeOf(target: string): string {
  return /\.jpe?g$/i.test(target) ? 'image/jpeg' : 'image/png';
}

/** Alvos de imagem (ppt/media/...) referenciados por um slide, via seu .rels. */
export function imageTargetsOfRels(relsXml: string, parser: DOMParser): string[] {
  return imageRelationsOfRels(relsXml, parser).map((rel) => rel.target);
}

/** Relações de imagem de um slide, preservando o rId para cruzar com o layout. */
export function imageRelationsOfRels(
  relsXml: string,
  parser: DOMParser,
): { id: string; target: string }[] {
  const root = parser.parseFromString(relsXml, 'application/xml');
  const out: { id: string; target: string }[] = [];
  for (const rel of Array.from(root.getElementsByTagNameNS(NS_REL, 'Relationship'))) {
    if ((rel.getAttribute('Type') ?? '').endsWith('/image')) {
      const target = (rel.getAttribute('Target') ?? '').replace(/^\.\.\//, 'ppt/');
      const id = rel.getAttribute('Id');
      if (id && /^ppt\/media\//.test(target)) out.push({ id, target });
    }
  }
  return out;
}
