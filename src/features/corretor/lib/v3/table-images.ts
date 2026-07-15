// Corretor v3.2 — localiza no navegador as imagens candidatas a TABELA NUMÉRICA
// dentro do .pptx (porte da heurística do scan_imagens.py): slides de seções
// numéricas + dimensões/peso típicos de tabela (mapas/fotos ficam de fora).

import { unzipSync } from 'fflate';
import type { Ir } from '../audit/ir';
import { NS_REL, pngDims, jpegDims, sha1Hex } from './pptx-media';

const FICHA_TITLE = /ficha\s+t[ée]cnica/i;

// Heurística de tabela (calibrada no manifest real: tabelas 914–3203px de largura,
// 250–1300px de altura, 15–500 KB; mapas ≥ 1 MB; ícones < 15 KB)
const MIN_KB = 15, MAX_KB = 500;
const MIN_W = 700, MIN_H = 200, MAX_H = 1300;
const MIN_ASPECT = 1.2;

export interface TableImageCandidate {
  slide: number;
  secao: string | null;
  titulo: string | null;
  name: string;     // ppt/media/imageNN.png
  mime: string;
  sha1: string;
  bytes: Uint8Array;
  w: number;
  h: number;
  kb: number;
  /** Fichas técnicas têm layout de unidades, não uma tabela de soma. */
  tipo: 'tabela' | 'ficha';
}

/**
 * Varre o .pptx e devolve as imagens únicas (por sha1) candidatas a tabela
 * numérica, com o slide/seção de origem. `parser` injetável para testes.
 */
export async function findTableImages(
  input: Uint8Array | ArrayBuffer | File,
  ir: Ir,
  parser: DOMParser = new DOMParser()
): Promise<TableImageCandidate[]> {
  let bytes: Uint8Array;
  if (typeof File !== 'undefined' && input instanceof File) bytes = new Uint8Array(await input.arrayBuffer());
  else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else bytes = input as Uint8Array;

  const files = unzipSync(bytes, {
    filter: (f) => /^ppt\/slides\/_rels\//.test(f.name) || /^ppt\/media\//.test(f.name),
  });
  const dec = new TextDecoder('utf-8');

  const meta = new Map(ir.slides.map((s) => [s.n, {
    secao: s.secao_canonica, titulo: s.titulo,
    ficha: FICHA_TITLE.test(`${s.titulo ?? ''}\n${(s.textos ?? []).join('\n')}`),
  }]));

  // slide → imagens (via rels)
  const bySlide: { slide: number; target: string; ficha: boolean }[] = [];
  for (const name of Object.keys(files)) {
    const m = name.match(/^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/);
    if (!m) continue;
    const slide = parseInt(m[1], 10);
    const ficha = meta.get(slide)?.ficha ?? false;
    const root = parser.parseFromString(dec.decode(files[name]), 'application/xml');
    for (const rel of Array.from(root.getElementsByTagNameNS(NS_REL, 'Relationship'))) {
      if ((rel.getAttribute('Type') ?? '').endsWith('/image')) {
        const target = (rel.getAttribute('Target') ?? '').replace(/^\.\.\//, 'ppt/');
        if (/^ppt\/media\//.test(target)) bySlide.push({ slide, target, ficha });
      }
    }
  }

  // únicas por sha1, com heurística de tabela
  const seen = new Set<string>();
  const out: TableImageCandidate[] = [];
  for (const { slide, target, ficha } of bySlide) {
    const data = files[target];
    if (!data) continue;
    const kb = Math.round(data.length / 1024);
    if (kb < MIN_KB || kb > (ficha ? 1_500 : MAX_KB)) continue;
    const dims = pngDims(data) ?? jpegDims(data);
    if (!dims) continue;
    const [w, h] = dims;
    if (w < MIN_W || h < MIN_H || h > (ficha ? 2_000 : MAX_H) || w / h < (ficha ? 0.7 : MIN_ASPECT)) continue;
    const sha1 = await sha1Hex(data);
    if (seen.has(sha1)) continue;
    seen.add(sha1);
    out.push({
      slide,
      secao: meta.get(slide)?.secao ?? null,
      titulo: meta.get(slide)?.titulo ?? null,
      name: target,
      mime: target.endsWith('.jpg') || target.endsWith('.jpeg') ? 'image/jpeg' : 'image/png',
      sha1, bytes: data, w, h, kb, tipo: ficha ? 'ficha' : 'tabela',
    });
  }
  return out.sort((a, b) => a.slide - b.slide);
}
