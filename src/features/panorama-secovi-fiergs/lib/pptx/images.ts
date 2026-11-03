/** Intrinsic raster dimensions without DOM or undocumented PptxGenJS sizing props. */
export function containRaster(data: string, x: number, y: number, w: number, h: number) {
  const encoded = data.slice(data.indexOf(',') + 1);
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const u16 = (i: number) => bytes[i] * 256 + bytes[i + 1];
  let width = 0, height = 0;
  if (bytes[0] === 137 && bytes[1] === 80 && bytes.length > 24) {
    const view = new DataView(bytes.buffer); width = view.getUint32(16); height = view.getUint32(20);
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    for (let i = 2; i + 8 < bytes.length;) {
      if (bytes[i] !== 255) break;
      const marker = bytes[i + 1], length = u16(i + 2);
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        height = u16(i + 5); width = u16(i + 7); break;
      }
      if (length < 2) break;
      i += length + 2;
    }
  }
  if (!width || !height) throw new Error('Imagem sem dimensões raster válidas para o PowerPoint.');
  const scale = Math.min(w / width, h / height), iw = width * scale, ih = height * scale;
  return { x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih };
}
