// Corretor v3.2 — localiza no navegador as imagens candidatas a TABELA NUMÉRICA
// dentro do .pptx (porte da heurística do scan_imagens.py): slides de seções
// numéricas + dimensões/peso típicos de tabela (mapas/fotos ficam de fora).

import { unzipSync } from 'fflate';
import type { Ir } from '../audit/ir';
import { NS_REL, pngDims, jpegDims, bmpDims, bmpToPng, sha1Hex } from './pptx-media';

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

/** Imagem com cara de tabela que a leitura automática não conseguiu processar. */
export interface SkippedTableImage {
  slide: number;
  secao: string | null;
  titulo: string | null;
  name: string;
  kb: number;
  motivo: string;
}

/** Resultado da varredura: candidatas + imagens que ficaram sem leitura. */
export type TableImageScan = TableImageCandidate[] & {
  skipped?: SkippedTableImage[];
  /** Imagens distintas no deck (mapas, fotos, prints e tabelas) — base da pré-análise. */
  totalImages?: number;
};

// Seções onde uma imagem grande quase sempre é tabela/gráfico com número.
const NUMERIC_SECTIONS = new Set(['SOCIO', 'MERCADO', 'LACUNAS', 'ABSORCAO']);
// BMP não é comprimido: 500 KB de PNG viram vários MB. O limite dele é de pixels.
const BMP_MAX_KB = 40_000;
// Abaixo disso é ícone/logo, nunca tabela.
const SKIP_REPORT_MIN_KB = 60;

/**
 * Varre o .pptx e devolve as imagens únicas (por sha1) candidatas a tabela
 * numérica, com o slide/seção de origem. `parser` injetável para testes.
 */
export async function findTableImages(
  input: Uint8Array | ArrayBuffer | File,
  ir: Ir,
  parser: DOMParser = new DOMParser()
): Promise<TableImageScan> {
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
  const skipped: SkippedTableImage[] = [];
  const skip = (slide: number, target: string, kb: number, motivo: string) => {
    const secao = meta.get(slide)?.secao ?? null;
    if (kb < SKIP_REPORT_MIN_KB || !NUMERIC_SECTIONS.has((secao ?? '').toUpperCase())) return;
    if (skipped.some((s) => s.name === target)) return;
    skipped.push({ slide, secao, titulo: meta.get(slide)?.titulo ?? null, name: target, kb, motivo });
  };
  for (const { slide, target, ficha } of bySlide) {
    const data = files[target];
    if (!data) continue;
    const kb = Math.round(data.length / 1024);
    const bmp = bmpDims(data);
    const dims = pngDims(data) ?? jpegDims(data) ?? bmp;
    if (!dims) {
      skip(slide, target, kb, `formato não suportado (${target.split('.').pop()?.toUpperCase() ?? '?'})`);
      continue;
    }
    if (kb < MIN_KB || kb > (bmp ? BMP_MAX_KB : ficha ? 1_500 : MAX_KB)) continue;
    const [w, h] = dims;
    if (w < MIN_W || h < MIN_H || h > (ficha ? 2_000 : MAX_H) || w / h < (ficha ? 0.7 : MIN_ASPECT)) continue;
    // sha1 do ORIGINAL: o cache da visão continua estável entre conversões.
    const sha1 = await sha1Hex(data);
    if (seen.has(sha1)) continue;
    seen.add(sha1);
    let bytes = data;
    let mime = target.endsWith('.jpg') || target.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
    if (bmp) {
      const png = await bmpToPng(data);
      if (!png) {
        skip(slide, target, kb, 'BMP que não pôde ser convertido para PNG');
        continue;
      }
      bytes = new Uint8Array(png);
      mime = 'image/png';
    }
    out.push({
      slide,
      secao: meta.get(slide)?.secao ?? null,
      titulo: meta.get(slide)?.titulo ?? null,
      name: target,
      mime,
      sha1, bytes, w, h, kb: bmp ? Math.round(bytes.length / 1024) : kb, tipo: ficha ? 'ficha' : 'tabela',
    });
  }
  const result: TableImageScan = out.sort((a, b) => a.slide - b.slide);
  result.skipped = skipped.sort((a, b) => a.slide - b.slide);
  result.totalImages = new Set(bySlide.map((b) => b.target)).size;
  return result;
}
