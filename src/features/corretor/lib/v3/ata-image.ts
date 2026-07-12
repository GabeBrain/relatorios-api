// Corretor v3.3 (Fase A do PLAN_ata_estrela_guia) — localiza a IMAGEM DA ATA no .pptx.
// A ata é um print de página inteira colado nos slides iniciais (1–4); o localizador
// de TABELAS (table-images.ts) a descarta de propósito, então aqui vai lógica própria:
// imagem GRANDE (área de página cheia) no menor nº de slide, preferindo a de maior área.

import { unzipSync } from 'fflate';
import type { Ir } from '../audit/ir';
import { imageDims, sha1Hex, mimeOf, imageTargetsOfRels } from './pptx-media';

// A ata é um print de página inteira: grande em bytes E em pixels. Tabela típica
// vai até ~500 KB; a ata costuma passar disso ou ter dimensões de página cheia.
const MAX_ATA_SLIDE = 4;
const MIN_KB = 60;          // descarta ícones/logos pequenos
const MIN_W = 900, MIN_H = 600; // proporção de página, não de faixa de tabela

export interface AtaImageCandidate {
  slide: number;
  name: string;
  mime: string;
  sha1: string;
  bytes: Uint8Array;
  w: number;
  h: number;
  kb: number;
}

/**
 * Varre os primeiros slides e devolve a MELHOR candidata a imagem da ata
 * (maior área, menor slide), ou null. `parser` injetável para testes (node).
 * `_ir` fica na assinatura por simetria com findTableImages / uso futuro.
 */
export async function findAtaImage(
  input: Uint8Array | ArrayBuffer | File,
  _ir?: Ir,
  parser: DOMParser = new DOMParser(),
  maxSlide = MAX_ATA_SLIDE,
): Promise<AtaImageCandidate | null> {
  let bytes: Uint8Array;
  if (typeof File !== 'undefined' && input instanceof File) bytes = new Uint8Array(await input.arrayBuffer());
  else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else bytes = input as Uint8Array;

  const files = unzipSync(bytes, {
    filter: (f) => /^ppt\/slides\/_rels\//.test(f.name) || /^ppt\/media\//.test(f.name),
  });
  const dec = new TextDecoder('utf-8');

  // slide → alvos de imagem (só slides iniciais)
  const bySlide: { slide: number; target: string }[] = [];
  for (const name of Object.keys(files)) {
    const m = name.match(/^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/);
    if (!m) continue;
    const slide = parseInt(m[1], 10);
    if (slide > maxSlide) continue;
    for (const target of imageTargetsOfRels(dec.decode(files[name]), parser)) {
      bySlide.push({ slide, target });
    }
  }

  const seen = new Set<string>();
  const cands: AtaImageCandidate[] = [];
  for (const { slide, target } of bySlide) {
    const data = files[target];
    if (!data) continue;
    const kb = Math.round(data.length / 1024);
    if (kb < MIN_KB) continue;
    const dims = imageDims(data);
    if (!dims) continue;
    const [w, h] = dims;
    if (w < MIN_W || h < MIN_H) continue;
    const sha1 = await sha1Hex(data);
    if (seen.has(sha1)) continue;
    seen.add(sha1);
    cands.push({ slide, name: target, mime: mimeOf(target), sha1, bytes: data, w, h, kb });
  }

  if (cands.length === 0) return null;
  // melhor = menor slide; empate → maior área
  cands.sort((a, b) => a.slide - b.slide || b.w * b.h - a.w * a.h);
  return cands[0];
}
