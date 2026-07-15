// Corretor v3.3 (Fase A5 da ata) — extrai o TEXTO de um .docx (formato futuro da ata).
// DOCX é um zip com word/document.xml; o texto vive nos <w:t>. Mesmo padrão do
// pptx-to-ir (fflate + DOMParser). Custo zero (não usa visão) — só o texto vai à LLM.

import { unzipSync } from 'fflate';
import { sha1Hex } from './pptx-media';

const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export interface DocxText {
  texto: string;
  sha1: string;
}

/** Lê um .docx e devolve o texto corrido (parágrafos separados por \n) + sha1. */
export async function docxToText(
  input: Uint8Array | ArrayBuffer | File,
  parser: DOMParser = new DOMParser(),
): Promise<DocxText | null> {
  let bytes: Uint8Array;
  if (typeof File !== 'undefined' && input instanceof File) bytes = new Uint8Array(await input.arrayBuffer());
  else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else bytes = input as Uint8Array;

  const files = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' });
  const xml = files['word/document.xml'];
  if (!xml) return null;

  const root = parser.parseFromString(new TextDecoder('utf-8').decode(xml), 'application/xml');
  const paras: string[] = [];
  for (const p of Array.from(root.getElementsByTagNameNS(NS_W, 'p'))) {
    const runs = Array.from(p.getElementsByTagNameNS(NS_W, 't')).map((t) => t.textContent ?? '');
    const line = runs.join('').trim();
    if (line) paras.push(line);
  }
  const texto = paras.join('\n');
  if (!texto) return null;

  return { texto, sha1: await sha1Hex(new TextEncoder().encode(texto)) };
}
