// Corretor v3 — PRÉ-ANÁLISE (grátis, antes de gastar): o que o analista precisa
// confirmar e saber antes de rodar a análise completa.
//   • outras cidades citadas no estudo (para não virarem “contexto errado”);
//   • perfil das imagens: quantas tabelas estão coladas como imagem — a leitura
//     por imagem é a principal fonte de falso alerta, e o analista deve saber.

import type { Ir } from '../audit/ir';
import { citiesInText } from './city-suggestion';
import type { TableImageScan } from './table-images';

export interface CityMention { cidade: string; uf: string; vezes: number; slides: number[] }

export interface ImageProfile {
  /** Tabelas nativas do PowerPoint: lidas direto, sem IA de imagem. */
  tabelasNativas: number;
  /** Imagens com cara de tabela: vão para a leitura por imagem (pode errar). */
  tabelasImagem: number;
  /** Fichas técnicas coladas como imagem. */
  fichas: number;
  /** Imagens de tabela em formato que não dá para ler. */
  naoLidas: number;
  /** Mapas, fotos e demais imagens: não são conferidas numericamente. */
  outras: number;
}

const same = (a: string, b: string) => a.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === b.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Cidades citadas com UF explícita no texto do estudo, fora a principal. */
export function otherCities(ir: Pick<Ir, 'slides'>, main: { cidade: string; uf: string } | null, limit = 8): CityMention[] {
  const byKey = new Map<string, CityMention>();
  for (const slide of ir.slides) {
    const text = [slide.titulo ?? '', ...(slide.textos ?? [])].join(' \n ');
    for (const found of citiesInText(text)) {
      if (main && same(found.cidade, main.cidade) && found.uf === main.uf) continue;
      const key = `${found.cidade}|${found.uf}`;
      const m = byKey.get(key) ?? { ...found, vezes: 0, slides: [] };
      m.vezes++;
      if (!m.slides.includes(slide.n)) m.slides.push(slide.n);
      byKey.set(key, m);
    }
  }
  return [...byKey.values()].sort((a, b) => b.vezes - a.vezes).slice(0, limit);
}

export function imageProfile(ir: Pick<Ir, 'slides'>, scan: TableImageScan): ImageProfile {
  const tabelasNativas = ir.slides.reduce((n, s) => n + (s.tabelas?.length ?? 0), 0);
  const tabelasImagem = scan.filter((c) => c.tipo === 'tabela').length;
  const fichas = scan.filter((c) => c.tipo === 'ficha').length;
  const naoLidas = scan.skipped?.length ?? 0;
  const outras = Math.max(0, (scan.totalImages ?? scan.length) - scan.length - naoLidas);
  return { tabelasNativas, tabelasImagem, fichas, naoLidas, outras };
}
