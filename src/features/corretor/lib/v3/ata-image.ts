// Corretor v3.3 (Fase A do PLAN_ata_estrela_guia) — localiza a IMAGEM DA ATA no .pptx.
// A ata é um print de página inteira colado nos slides iniciais (1–4); o localizador
// de TABELAS (table-images.ts) a descarta de propósito, então aqui vai lógica própria:
// imagem GRANDE (área de página cheia) no menor nº de slide, preferindo a de maior área.

import { unzipSync } from 'fflate';
import type { Ir } from '../audit/ir';
import {
  imageDims, sha1Hex, mimeOf, imageRelationsOfRels,
  NS_DOC_REL, NS_DRAW, NS_PRESENTATION,
} from './pptx-media';

// A ata é um print de página inteira: grande em bytes E em pixels. Tabela típica
// vai até ~500 KB; a ata costuma passar disso ou ter dimensões de página cheia.
const MAX_ATA_SLIDE = 4;
const MIN_KB = 20;
const MIN_W = 400, MIN_H = 300;
const SLIDE_CX = 12_192_000, SLIDE_CY = 6_858_000;

export interface AtaImageCandidate {
  slide: number;
  name: string;
  mime: string;
  sha1: string;
  bytes: Uint8Array;
  w: number;
  h: number;
  kb: number;
  /** Fundo de página; só é usado como fallback quando não há cartão inserido. */
  fullSlide?: boolean;
}

interface PictureLayout { x: number; y: number; cx: number; cy: number; }

function pictureLayouts(slideXml: string, parser: DOMParser): Map<string, PictureLayout> {
  const root = parser.parseFromString(slideXml, 'application/xml');
  const out = new Map<string, PictureLayout>();
  for (const pic of Array.from(root.getElementsByTagNameNS(NS_PRESENTATION, 'pic'))) {
    const blip = pic.getElementsByTagNameNS(NS_DRAW, 'blip')[0];
    const id = blip?.getAttributeNS(NS_DOC_REL, 'embed');
    const xfrm = pic.getElementsByTagNameNS(NS_DRAW, 'xfrm')[0];
    const off = xfrm?.getElementsByTagNameNS(NS_DRAW, 'off')[0];
    const ext = xfrm?.getElementsByTagNameNS(NS_DRAW, 'ext')[0];
    if (!id || !off || !ext) continue;
    out.set(id, {
      x: Number(off.getAttribute('x') ?? 0), y: Number(off.getAttribute('y') ?? 0),
      cx: Number(ext.getAttribute('cx') ?? 0), cy: Number(ext.getAttribute('cy') ?? 0),
    });
  }
  return out;
}

function isFullSlide(layout: PictureLayout | undefined): boolean {
  if (!layout) return false;
  return layout.x <= SLIDE_CX * 0.02 && layout.y <= SLIDE_CY * 0.02
    && layout.cx >= SLIDE_CX * 0.96 && layout.cy >= SLIDE_CY * 0.96;
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
    filter: (f) => /^ppt\/slides\/(?:_rels\/|slide\d+\.xml$)/.test(f.name) || /^ppt\/media\//.test(f.name),
  });
  const dec = new TextDecoder('utf-8');

  // slide → alvos de imagem (só slides iniciais)
  const bySlide: { slide: number; target: string; layout?: PictureLayout }[] = [];
  for (const name of Object.keys(files)) {
    const m = name.match(/^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/);
    if (!m) continue;
    const slide = parseInt(m[1], 10);
    if (slide > maxSlide) continue;
    const slideXml = files[`ppt/slides/slide${slide}.xml`];
    const layouts = slideXml ? pictureLayouts(dec.decode(slideXml), parser) : new Map<string, PictureLayout>();
    for (const rel of imageRelationsOfRels(dec.decode(files[name]), parser)) {
      bySlide.push({ slide, target: rel.target, layout: layouts.get(rel.id) });
    }
  }

  const seen = new Set<string>();
  const cands: AtaImageCandidate[] = [];
  for (const { slide, target, layout } of bySlide) {
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
    cands.push({
      slide, name: target, mime: mimeOf(target), sha1, bytes: data, w, h, kb,
      fullSlide: isFullSlide(layout),
    });
  }

  if (cands.length === 0) return null;
  // Prefere o cartão/imagem inserida. Mantém a ata que ocupa o slide inteiro como fallback.
  const viable = cands.some((c) => !c.fullSlide) ? cands.filter((c) => !c.fullSlide) : cands;
  // melhor = menor slide; empate → maior área
  viable.sort((a, b) => a.slide - b.slide || b.w * b.h - a.w * a.h);
  return viable[0];
}
