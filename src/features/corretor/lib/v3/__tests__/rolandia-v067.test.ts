// Regras v0.67 (rodada de Rolândia) com dados SINTÉTICOS.
import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { bmpToPngJs, pngDims } from '../pptx-media';
import { findTableImages } from '../table-images';
import { isConversationalNote, pptxToIr } from '../../audit/pptx-to-ir';
import type { Ir } from '../../audit/ir';
import type { ExtractedTable, Finding } from '../../audit/model';
import { groupSameDivergence } from '../source-crosscheck';
import { literalFormatIssues } from '../format-checks';
import { travelSpeedFindings } from '../../audit/ir-rules';
import { nestedRadiiFindings } from '../nested-radii';
import { entityConsistencyFindings } from '../entity-consistency';
import { matchingFormatAnomalies } from '../ia-vision';
import type { CrossTableRef } from '../cross-table';
import type { Fonte } from '../fonte';

function bmp(w: number, h: number, pixel: (x: number, y: number) => [number, number, number]): Uint8Array {
  const stride = Math.ceil((w * 3) / 4) * 4;
  const out = new Uint8Array(54 + stride * h);
  const dv = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d;
  dv.setUint32(2, out.length, true); dv.setUint32(10, 54, true); dv.setUint32(14, 40, true);
  dv.setInt32(18, w, true); dv.setInt32(22, h, true); dv.setUint16(26, 1, true); dv.setUint16(28, 24, true);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = pixel(x, h - 1 - y);
    const o = 54 + y * stride + x * 3;
    out[o] = b; out[o + 1] = g; out[o + 2] = r;
  }
  return out;
}

describe('BMP → PNG sem canvas', () => {
  it('gera PNG válido com as dimensões do BMP', () => {
    const png = bmpToPngJs(bmp(3, 2, () => [255, 0, 0]))!;
    expect(pngDims(png)).toEqual([3, 2]);
  });

  it('mapa/foto em BMP fica fora das candidatas; tabela em BMP entra', async () => {
    let seed = 7;
    // Bits altos do LCG: os baixos repetem a cada 256 e comprimem como tabela.
    const noise = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) >>> 16) & 0xff;
    const table = bmp(900, 320, (x, y) => (y % 40 === 0 || x % 150 === 0 ? [180, 180, 180] : [255, 255, 255]));
    const map = bmp(900, 320, () => [noise(), noise(), noise()]);
    const rels = (img: string) => strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${img}"/></Relationships>`);
    const pptx = zipSync({
      'ppt/slides/_rels/slide1.xml.rels': rels('image1.bmp'),
      'ppt/slides/_rels/slide2.xml.rels': rels('image2.bmp'),
      'ppt/media/image1.bmp': table,
      'ppt/media/image2.bmp': map,
    });
    const ir = { slides: [
      { n: 1, titulo: 'Domicílios por tipo', secao_canonica: 'SOCIO', textos: [] },
      { n: 2, titulo: 'Densidade demográfica', secao_canonica: 'SOCIO', textos: [] },
    ] } as unknown as Ir;
    const found = await findTableImages(pptx, ir);
    expect(found.map((c) => c.slide)).toEqual([1]);
    expect(found.skipped).toEqual([]);
  });
});

describe('recado do analista em caixa comum', () => {
  it('reconhece os recados de Rolândia', () => {
    expect(isConversationalNote('Lucas, conforme falei com você no presencial, a parte da análise de airbnb eu não fiz porque não tinha na região..')).toBe(true);
    expect(isConversationalNote('Lucas, aqui eu fiquei na dúvida.. No novo modelo colocamos somente o raio primário')).toBe(true);
    expect(isConversationalNote('Lucas, na concorrência, como eram somente dois empreendimentos, eu fiquei na dúvida em como fazer')).toBe(true);
  });

  it('texto de relatório não é recado', () => {
    expect(isConversationalNote('Rolândia, por sua vez, apresenta baixa verticalização.')).toBe(false);
    expect(isConversationalNote('Destaca-se a população em fase de maturidade financeira (entre 25 a 49 anos).')).toBe(false);
    expect(isConversationalNote('Centro, Jardim Caviúna e Vila Formosa concentram a oferta de revenda.')).toBe(false);
  });
});

const slide = (n: number, textos: string[], secao = 'IDENTIFICACAO') => ({ n, titulo: textos[0] ?? '', secao_canonica: secao, textos, tabelas: [] });
const ref = (slide: number, table: Partial<ExtractedTable>, extra: Partial<CrossTableRef> = {}): CrossTableRef =>
  ({ slide, secao: 'SOCIO', titulo: '', sha1: `h${slide}`, table: { title: 'T', columns: [], rows: [], ...table } as ExtractedTable, source: 'vision', ...extra });

describe('deslocamento impossível', () => {
  it('“950 km | 3 min” acusa; trajetos urbanos não', () => {
    const ir = { slides: [
      slide(17, ['950 km | 3 min', 'Distância até o Max Atacadista']),
      slide(16, ['1,4 km | 3 min', '950 m | 3 min', '12 km | 15 min', '5 min 1.200 m']),
    ] } as unknown as Ir;
    const out = travelSpeedFindings(ir);
    expect(out.map((f) => f.slideRef)).toEqual(['s17']);
    expect(out[0].detail).toContain('19.000 km/h');
  });
});

describe('raios acumulados', () => {
  const cols = ['Condição', 'Até 1 km | Absoluto', 'Até 1 km | %', 'Até 2 km | Absoluto', 'Até 2 km | %', 'Até 3 Km | Absoluto', 'Até 3 Km | %'];
  it('3 km com menos alugados que 2 km acusa, citando a planilha quando ela repete', () => {
    const table = ref(34, { columns: cols, rows: [['Próprio', 4235, 65.1, 10866, 65.1, 15991, 66.5], ['Alugado', 1920, 29.5, 4924, 29.5, 4833, 20.1]] });
    const fonte = { blocos: [{ arquivo: 'SOCIO.xlsm', aba: 'Dom.p Cond. Ocup.', itens: [
      { linha: 6, rotulo: 'Alugado', recortes: { 'Até 1 km': { '%': 0.295, absoluto: 1919.9 }, 'Até 2 km': { '%': 0.295, absoluto: 4923.9 }, 'Até 3 Km': { '%': 0.201, absoluto: 4833.2 } } },
    ] }] } as unknown as Fonte;
    const out = nestedRadiiFindings([table], fonte);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('4.833');
    expect(out[0].detail).toContain('vem da fonte');
  });

  it('anel (“de 1 a 2 km”) e leitura desalinhada ficam fora', () => {
    const ring = ref(1, { columns: ['x', 'Até 1 km', 'De 1 km a 2 km'], rows: [['a', 500, 300]] });
    const unaligned = ref(2, { columns: ['x', 'Até 2 km', 'Até 4 Km'], rows: [['a', 100, 50, 30, 20]] });
    expect(nestedRadiiFindings([ring, unaligned])).toHaveLength(0);
  });
});

describe('mesmo empreendimento entre slides', () => {
  const ficha = 'Boulevard - Lebi\nEndereço: Avenida X\nOferta Lançada: 192\nOferta Final: 87\nPlanta: 52m² (R$ 5.120/m²)';
  const terrasse = 'Terrasse - Enge\nOferta Lançada: 100\nOferta Final: 26\nPlantas: 80m² (R$ 8.214/m²)e 103m² (R$ 7.835/m²).';
  const lacuna = (extra: Partial<CrossTableRef>) => ref(52, {
    title: 'Oferta Lançada',
    columns: ['Tipologia', 'Até R$5.000/m²', 'De R$5.001/m² a 7.000/m²', 'De R$7.501/m² a 8.000/m²', 'De R$8.001/m² a 8.500/m²', 'Total'],
    rows: [['2 Dormitórios', 192, 0, 0, 32, 224], ['3 Dormitórios', 0, 0, 64, 0, 64]], totals: ['Total', 192, 0, 64, 32, 288],
  }, { secao: 'LACUNAS', ...extra });
  const ir = { slides: [slide(55, [ficha, terrasse], 'MERCADO'), slide(42, ['Boulevard\n52m² | R$ 5.120/m² | 87 uni'], 'MERCADO')] } as unknown as Ir;

  it('planta única fora da faixa das lacunas acusa', () => {
    const out = entityConsistencyFindings(ir, [lacuna({ reliable: true })]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toContain('Boulevard');
    expect(out[0].detail).toContain('De R$5.001/m² a 7.000/m²');
  });

  it('leitura do modelo econômico não serve de âncora', () => {
    expect(entityConsistencyFindings(ir, [lacuna({})])).toHaveLength(0);
  });

  it('legenda de mapa diferente da ficha acusa', () => {
    const ir2 = { slides: [slide(55, [ficha], 'MERCADO'), slide(45, ['Boulevard\n54m² | R$ 4.960/m² | 87 uni'], 'MERCADO')] } as unknown as Ir;
    const out = entityConsistencyFindings(ir2, []);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('4.960');
  });

  it('tabela nativa de empreendimentos: tipologias que não somam a oferta', () => {
    const nativa = ref(45, {
      columns: ['Empreendimento', 'Oferta Lançada', 'Oferta Atual', 'Disp. (%)', 'Unidades por Tipologia'],
      rows: [['Terrasse', 100, 26, 26, 32], ['', null, null, null, 64], ['Boulevard', 192, 87, 45.3, 192]],
    }, { source: 'ir', secao: 'MERCADO' });
    const out = entityConsistencyFindings({ slides: [slide(45, ['Unidades garden, duplex e coberturas não são apresentadas'], 'MERCADO')] } as unknown as Ir, [nativa]);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('somam 96');
    expect(out[0].confidence).toBe(3);
  });
});

describe('texto de SVG', () => {
  it('entra em textos_svg do slide, fora de textos', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>5,2%</text><text><tspan>Rolândia</tspan></text></svg>';
    const slideXml = '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Domicílios por tipo</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>';
    const rels = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image43.svg"/></Relationships>';
    const pptx = zipSync({ 'ppt/slides/slide31.xml': strToU8(slideXml), 'ppt/slides/_rels/slide31.xml.rels': strToU8(rels), 'ppt/media/image43.svg': strToU8(svg) });
    const ir = await pptxToIr(pptx, 'deck.pptx');
    expect(ir.slides[0].textos_svg).toEqual(['5,2%\nRolândia']);
    expect(ir.slides[0].textos.join(' ')).not.toContain('5,2%');
  });
});

describe('mesma divergência em vários slides', () => {
  const f = (slideRef: string, title: string, detail: string) => ({ id: slideRef, type: 'SOURCE_CROSSCHECK', section: 'SOCIO', slideRef, title, detail, ok: false }) as Finding;
  it('junta por métrica + valor do slide + valor da planilha', () => {
    const out = groupSameDivergence([
      f('s32', 'Valor diverge da planilha-fonte — Rolândia', 'o slide mostra 5,7%, mas a planilha registra 5,16% (5,2%).'),
      f('s33', 'Valor diverge da planilha-fonte — Rolândia', 'o slide mostra 5,7%, mas a planilha registra 5,16% (5,2%).'),
      f('s23', 'Valor diverge da planilha-fonte — PR', 'o slide mostra 4.216.017 dom., mas a planilha registra 4.216.107 dom.'),
    ]);
    expect(out.map((x) => x.slideRef)).toEqual(['s32, s33', 's23']);
    expect(out[0].detail).toContain('desatualizada');
  });
});

describe('formato literal', () => {
  it('anos com ponto, decimal duplicado e limite “,01”', () => {
    const reasons = literalFormatIssues(['Até 2.022', '2.023', '2.024', 'Abaixo de R$ 7.716,00,00', 'R$ 6.200,01 a R$ 14.590,01', 'R$ 14.590,01 a R$ 17.147,00', 'R$ 17.147,01 a R$ 20.983,00', 'R$ 20.983,01 a R$ 27.320,00']).map((i) => i.reason);
    expect(reasons.some((r) => r.includes('separador de milhar'))).toBe(true);
    expect(reasons.some((r) => r.includes('decimal duplicado'))).toBe(true);
    expect(reasons.some((r) => r.includes(',01'))).toBe(true);
  });

  it('quantidade com milhar e faixas normais não acusam', () => {
    expect(literalFormatIssues(['1.270', 'R$ 7.716,01 a R$ 10.755,00', 'R$ 10.755,01 a R$ 14.590,00', 'Acima de R$ 36.511,01'])).toEqual([]);
  });
});

describe('confirmação de símbolo duplicado', () => {
  it('exige símbolo e posição iguais nas duas leituras', () => {
    const a = [{ texto: 'R$ 9.000//m²', bloco: 'Preço', linha: 'Alfa', coluna: 'R$/m²' }];
    expect(matchingFormatAnomalies(a, a)).toEqual(a);
    expect(matchingFormatAnomalies(a, [{ ...a[0], texto: 'R$ 9.000/m²' }])).toEqual([]);
    expect(matchingFormatAnomalies(a, [{ ...a[0], linha: 'Beta' }])).toEqual([]);
  });
});
