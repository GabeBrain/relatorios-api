// PPTX → IR no navegador — porte TS de docs/features/corretor-vocacionais/ir_extractor.py
// (ir_version 1). Lê o .pptx (zip) com fflate e os XMLs com DOMParser. Sem servidor.
// Gráficos ficam para uma 2ª rodada (graficos: []); o essencial das regras atuais
// (texto, seções, tabelas, fontes, notas de edição, imagens) está coberto.

import { unzipSync } from 'fflate';
import type { Ir, IrSlide, IrTable } from './ir';

const NS = {
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  c: 'http://schemas.openxmlformats.org/drawingml/2006/chart',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
};

const els = (parent: Element | Document, ns: string, local: string): Element[] =>
  Array.from(parent.getElementsByTagNameNS(ns, local));

// ---------- helpers de texto ----------

function paragraphText(pEl: Element): string {
  return els(pEl, NS.a, 't').map((t) => t.textContent ?? '').join('').trim();
}

function txbodyParagraphs(txBody: Element): string[] {
  return els(txBody, NS.a, 'p').map(paragraphText).filter(Boolean);
}

export function parseNumPtbr(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  s = s.replace(/^r\$\s*/i, '').replace(/%/g, '').trim();
  const neg = s.startsWith('(') && s.endsWith(')');
  if (neg) s = s.slice(1, -1);
  s = s.replace(/\s/g, '');
  if (!/^-?[\d.,]+$/.test(s)) return null;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  else if (s.includes('.') && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const v = parseFloat(s);
  if (Number.isNaN(v)) return null;
  return neg ? -v : v;
}

// ---------- padrões da rubrica (espelho do ir_extractor.py) ----------

const FONTE_RX = /\b(fonte|elabora[çc][ãa]o)\b\s*[:-]?/i;
const NOTA_RX = /^(\*|nota[:\s]|obs[.:\s])/i;
const MULTI_RESP_RX = /resposta\s+m[úu]ltipla|total\s+superior\s+a\s+100|m[úu]ltipla\s+escolha/i;
const LEFTOVER_RX = /\b(agrupar|ajustar|revisar|conferir|confirmar|checar|verificar|inserir|colocar|preencher|refazer|corrigir|pendente|todo|xxx)\b/i;

const SECOES: [string, RegExp][] = [
  ['CAPA', /estudo\s+vocacional|masterplan|vocacional\s*(e|\+)\s*quanti/i],
  ['LACUNAS', /lacuna/i],
  ['ABSORCAO', /absor[çc][ãa]o/i],
  ['IDENTIFICACAO', /identifica[çc][ãa]o|terreno|zona\s+de\s+influ[êe]ncia|\bz\.?\s?i\.?\b|deslocamento|descolamento/i],
  ['SOCIO', /socio[dg]emogr|demanda\s+vegetativa|proje[çc][ãa]o\s+de\s+demanda|faixa[s]?\s+de\s+renda|domic[íi]lio|popula[çc][ãa]o|condi[çc][ãa]o\s+de\s+ocupa[çc][ãa]o|renda\s+(m[ée]dia|domiciliar)/i],
  ['MERCADO', /oferta\s+(lan[çc]ada|atual|consolidada|final)|lan[çc]a(mento|da)|tipologia|mercado|unidades\s+(lan[çc]adas|vendidas)|empreendimento|concorr[êe]nc|revenda|pre[çc]o\s+m[ée]dio|tabela[s]?\s+de\s+pre[çc]o|vgv/i],
  ['ENTORNO', /entorno|mapeamento\s+f[íi]sico|infraestrutura/i],
  ['CONCLUSAO', /voca[çc][ãa]o\s+do|conclus|recomenda[çc]|produto\s+(sugerido|proposto)/i],
];

function secaoCanonica(titulo: string): string | null {
  for (const [sec, rx] of SECOES) if (rx.test(titulo)) return sec;
  return null;
}

// ---------- extração de slide ----------

function parseTable(tblEl: Element): IrTable {
  const linhas: string[][] = els(tblEl, NS.a, 'tr').map((tr) =>
    els(tr, NS.a, 'tc').map((tc) => {
      const tx = els(tc, NS.a, 'txBody')[0];
      return tx ? txbodyParagraphs(tx).join('\n') : '';
    })
  );
  return {
    n_linhas: linhas.length,
    n_colunas: linhas.reduce((m, r) => Math.max(m, r.length), 0),
    linhas,
    linhas_num: linhas.map((r) => r.map(parseNumPtbr)),
  };
}

function slideTitle(root: Document, shapesParas: string[][]): string {
  for (const sp of els(root, NS.p, 'sp')) {
    const ph = els(sp, NS.p, 'ph')[0];
    const type = ph?.getAttribute('type');
    if (type === 'title' || type === 'ctrTitle') {
      const tx = els(sp, NS.p, 'txBody')[0];
      if (tx) {
        const paras = txbodyParagraphs(tx);
        if (paras.length) return paras.join(' ').slice(0, 120);
      }
    }
  }
  const flat = shapesParas.flat();
  for (const t of flat.slice(0, 8)) {
    if (t.length > 10 && /[A-Za-zÀ-ú]{4}/.test(t) && !FONTE_RX.test(t) && !NOTA_RX.test(t)) {
      return t.slice(0, 120);
    }
  }
  return flat.length ? flat[0].slice(0, 120) : '(sem título)';
}

function parseSlide(xml: string, num: number, parser: DOMParser): IrSlide {
  const root = parser.parseFromString(xml, 'application/xml');

  const shapesParas: string[][] = [];
  for (const sp of els(root, NS.p, 'sp')) {
    const tx = els(sp, NS.p, 'txBody')[0];
    if (tx) {
      const paras = txbodyParagraphs(tx);
      if (paras.length) shapesParas.push(paras);
    }
  }
  const allParas = shapesParas.flat();
  const fulltext = allParas.join(' ');

  return {
    n: num,
    titulo: slideTitle(root, shapesParas),
    secao_canonica: secaoCanonica(slideTitle(root, shapesParas)),
    textos: shapesParas.map((paras) => paras.join('\n')),
    fontes: allParas.filter((p) => FONTE_RX.test(p)),
    notas: allParas.filter((p) => NOTA_RX.test(p) && !FONTE_RX.test(p)),
    notas_edicao: allParas.filter((p) => p.length > 3 && p.length < 80 && LEFTOVER_RX.test(p)),
    tabelas: els(root, NS.a, 'tbl').map(parseTable),
    graficos: [], // 2ª rodada
    n_imagens: els(root, NS.p, 'pic').length,
    flags: { resposta_multipla: MULTI_RESP_RX.test(fulltext) },
  };
}

// ---------- pipeline ----------

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-1', bytes);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

/** Extrai o IR de um .pptx no navegador. `parser` injetável para testes (node). */
export async function pptxToIr(
  input: ArrayBuffer | Uint8Array | File,
  filename?: string,
  parser: DOMParser = new DOMParser()
): Promise<Ir> {
  let bytes: Uint8Array;
  let name = filename ?? 'estudo.pptx';
  if (typeof File !== 'undefined' && input instanceof File) {
    bytes = new Uint8Array(await input.arrayBuffer());
    name = input.name;
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else {
    bytes = input;
  }

  // decompacta só os XMLs de slide/rels (ignora as imagens pesadas)
  const files = unzipSync(bytes, { filter: (f) => /^ppt\/slides\//.test(f.name) });
  const dec = new TextDecoder('utf-8');

  const slideNames = Object.keys(files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => slideNum(a) - slideNum(b));

  const slides: IrSlide[] = slideNames.map((n) =>
    parseSlide(dec.decode(files[n]), slideNum(n), parser)
  );

  return {
    ir_version: 1,
    arquivo: name,
    sha1: await sha1Hex(bytes),
    n_slides: slides.length,
    slides,
  };
}

function slideNum(name: string): number {
  return parseInt(name.match(/slide(\d+)\.xml/)![1], 10);
}
