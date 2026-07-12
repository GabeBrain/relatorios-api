// Corretor v3 — utilidades compartilhadas de mídia do .pptx (dims, sha1, rels).
// Extraídas de table-images.ts para o localizador da ata reusar sem duplicar.

export const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

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

/** Dimensões de PNG ou JPEG. */
export function imageDims(d: Uint8Array): [number, number] | null {
  return pngDims(d) ?? jpegDims(d);
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
  const root = parser.parseFromString(relsXml, 'application/xml');
  const out: string[] = [];
  for (const rel of Array.from(root.getElementsByTagNameNS(NS_REL, 'Relationship'))) {
    if ((rel.getAttribute('Type') ?? '').endsWith('/image')) {
      const target = (rel.getAttribute('Target') ?? '').replace(/^\.\.\//, 'ppt/');
      if (/^ppt\/media\//.test(target)) out.push(target);
    }
  }
  return out;
}
