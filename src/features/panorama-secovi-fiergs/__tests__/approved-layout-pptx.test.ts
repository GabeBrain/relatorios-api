import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { approvedLayoutText, buildPanoramaApprovedPptx } from '../lib/pptx/approved-layout';
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxZkAAAAASUVORK5CYII=';
vi.mock('html-to-image', () => ({ toPng: vi.fn(async () => pixel), getFontEmbedCSS: vi.fn(async () => '') }));
vi.mock('../lib/pdf-export', async importOriginal => ({ ...await importOriginal<object>(), waitForSlide: vi.fn(async () => {}) }));
const metadata = { title: 'QA', author: 'Brain', subject: 'Offline' };
const rect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON() {} }) as DOMRect;
function page() {
  const root = document.createElement('section');
  root.innerHTML = '<h1>Título editável</h1><div data-panorama-chart><b>Rótulo do gráfico</b></div><table><tbody><tr><td>0<span class="panorama-sr-only">na referência</span></td><td>-7<span class="sr-only"><b>abaixo da referência</b></span></td><td style="display:none">Oculto</td><td><span style="clip-path:inset(50%)">Texto recortado</span></td></tr></tbody></table>';
  document.body.append(root); return root;
}
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return rect(0, 0, this.tagName === 'SECTION' ? 1920 : 400, this.tagName === 'SECTION' ? 1080 : 200);
  });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value() { return rect(20, 20, 10, 20); } });
});
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); delete (Range.prototype as unknown as Record<string, unknown>).getBoundingClientRect; });
describe('PPT com layout aprovado', () => {
  it('retains zero and negative cells, excludes chart labels and invisible text from editable overlays', () => {
    const { texts } = approvedLayoutText(page());
    expect(texts.map(t => t.text)).toEqual(['Título editável', '0', '-7']);
    expect(texts.filter(t => t.cell)).toHaveLength(2);
    expect(texts.find(t => t.text === '-7')).toMatchObject({ cell: true, y: 0, h: 200 * 7.5 / 1080 });
  });
  it('serializes graphics as pictures and other text as native shapes without changing the source DOM', async () => {
    const root = page(), original = root.outerHTML;
    const result = await buildPanoramaApprovedPptx([root], metadata, () => {});
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as ArrayBuffer); r.onerror = reject; r.readAsArrayBuffer(result.blob); });
    const zip = await JSZip.loadAsync(bytes), xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain('Título editável'); expect(xml).toContain('<a:t>-7</a:t>'); expect(xml).toContain('<a:t>0</a:t>');
    expect(xml).not.toContain('Rótulo do gráfico'); expect(xml).not.toContain('<c:chart');
    expect(xml).not.toContain('na referência'); expect(xml).not.toContain('abaixo da referência'); expect(xml).not.toContain('Texto recortado');
    expect(xml.match(/<p:pic>/g)).toHaveLength(3);
    expect(root.outerHTML).toBe(original); expect(document.querySelectorAll('section')).toHaveLength(1);
  });
  it('honors cancellation before capture', async () => {
    const c = new AbortController(); c.abort();
    await expect(buildPanoramaApprovedPptx([page()], metadata, () => {}, c.signal)).rejects.toThrow('cancelada');
  });
});
