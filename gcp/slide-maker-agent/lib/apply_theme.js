// Grava a paleta e as fontes da marca no tema do PPTX gerado pelo PptxGenJS (INSTRUCOES §6.4).
// O PptxGenJS escreve sempre o "Office Theme" (Calibri, azul/laranja); sem isto, as cores de tema
// (accent1…) e as fontes +mj-lt/+mn-lt dos gráficos e placeholders sairiam com o padrão do Office.
//
// Uso: import { applyTheme } from './apply_theme.js'; await applyTheme('saida/deck.pptx', TEMA)
//  ou: node lib/apply_theme.js saida/deck.pptx
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';

const SLOTS = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];

/** @param {{ name: string, headFontFace: string, bodyFontFace: string, colors: Record<string, string> }} tema */
export function temaXml(xml, tema) {
  for (const slot of SLOTS) {
    const hex = tema.colors[slot];
    if (!/^[0-9A-F]{6}$/.test(hex ?? '')) throw new Error(`apply_theme: cor inválida para ${slot}: ${hex}`);
    const re = new RegExp(`<a:${slot}>[\\s\\S]*?</a:${slot}>`);
    if (!re.test(xml)) throw new Error(`apply_theme: slot ${slot} não encontrado no tema`);
    xml = xml.replace(re, `<a:${slot}><a:srgbClr val="${hex}"/></a:${slot}>`);
  }
  const fonte = (bloco, face) => {
    const re = new RegExp(`(<a:${bloco}>\\s*<a:latin typeface=")[^"]*("[^>]*/>)`);
    if (!re.test(xml)) throw new Error(`apply_theme: ${bloco} não encontrado no tema`);
    // O panose do Calibri não vale para a fonte nova: removê-lo evita substituição errada.
    xml = xml.replace(re, (_m, a, b) => `${a}${face}${b.replace(/\s*panose="[^"]*"/, '')}`);
  };
  fonte('majorFont', tema.headFontFace);
  fonte('minorFont', tema.bodyFontFace);
  xml = xml
    .replace(/(<a:theme\b[^>]*\bname=")[^"]*"/, `$1${tema.name}"`)
    .replace(/(<a:clrScheme\b[^>]*\bname=")[^"]*"/, `$1${tema.name}"`)
    .replace(/(<a:fontScheme\b[^>]*\bname=")[^"]*"/, `$1${tema.name}"`);
  return xml;
}

export async function applyTheme(arquivo, tema) {
  const zip = await JSZip.loadAsync(await readFile(arquivo));
  const caminhos = Object.keys(zip.files).filter((p) => /^ppt\/theme\/theme\d+\.xml$/.test(p));
  if (!caminhos.length) throw new Error('apply_theme: o arquivo não tem ppt/theme/theme*.xml');
  for (const p of caminhos) {
    // theme1 é o do slide master; os demais (notas) também recebem as fontes e cores da marca.
    zip.file(p, temaXml(await zip.file(p).async('string'), tema));
  }
  await writeFile(arquivo, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { TEMA } = await import('./brain-deck/tema.js');
  const arquivo = process.argv[2];
  if (!arquivo) {
    console.error('uso: node lib/apply_theme.js <deck.pptx>');
    process.exit(2);
  }
  await applyTheme(arquivo, TEMA);
  console.log(`tema Brain aplicado em ${arquivo}`);
}
