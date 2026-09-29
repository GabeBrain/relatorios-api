// Regressão dos achados de São José dos Campos (VAP 03ago e v2 31jul), triados à
// mão contra as imagens dos slides e as planilhas em 29/set/2026. Cada caso é um
// falso positivo que deixou de existir ou um erro real que passou a ser pego.
import { describe, expect, it } from 'vitest';
import readings from './fixtures/sjc-vision-readings.json';
import { checkTableSums, detectBinGap, binsFromColumns, rowLabels } from '../../audit/engine';
import { irTableToExtracted } from '../../audit/ir-rules';
import type { ExtractedTable } from '../../audit/model';
import type { Ir } from '../../audit/ir';
import type { Fonte } from '../fonte';
import { sourceCrosscheckFindings, matchesAtShownPrecision } from '../source-crosscheck';
import { lacunaRowLabels } from '../cross-table';
import { formatIssues, labelTypos } from '../format-checks';
import { bmpDims } from '../pptx-media';
import { unreadImageFindings } from '../pipeline';
import { confidenceOf } from '../confidence';

const table = (key: keyof typeof readings) => readings[key] as unknown as ExtractedTable;
const sums = (t: ExtractedTable) => checkTableSums(t, { absTol: Math.max(0.5, t.rows.length / 2) });

function verticalizacao(textos: string[]): Ir {
  return { slides: [{ n: 33, titulo: 'Índice de verticalização', textos, secao_canonica: 'SOCIO' }] } as unknown as Ir;
}
const fonte = {
  fonte_version: 2,
  blocos: [{
    papel: 'socio', tabela: 'domicilios_por_tipo', arquivo: '02. SOCIODEMOGRAFIA 3 raios.xlsm', aba: 'Dom.p Tipo',
    itens: [{ linha: 7, rotulo: 'Apartamento', recortes: {
      'São José dos Campos': { '%': 0.2885 }, 'Até 2 km': { '%': 0.1592 }, 'Até 4 km': { '%': 0.1046 },
    } }],
  }],
} as unknown as Fonte;

describe('arredondamento da versão final (s33/s34)', () => {
  it('28,9% e 29% aceitam 28,85% da planilha; 28,849999 não vira 28,8', () => {
    expect(matchesAtShownPrecision(28.9, 0.2885 * 100, 1)).toBe(true);
    expect(matchesAtShownPrecision(29, 0.2885 * 100, 0)).toBe(true);
    expect(matchesAtShownPrecision(28.7, 0.2885 * 100, 1)).toBe(false);
    const ir = verticalizacao(['28,9%\nSão José dos Campos', '15,9%\nAté 2 Km', '10%\nAté 4 Km']);
    expect(sourceCrosscheckFindings(ir, fonte)).toHaveLength(0);
  });

  it('continua pegando o 5,7% copiado da Rolândia na v2, com a diferença explícita', () => {
    const [f] = sourceCrosscheckFindings(verticalizacao(['5,7%\nSão José dos Campos']), fonte);
    expect(f.detail).toContain('o slide mostra 5,7%, mas a planilha registra 28,85% (28,9% na precisão do slide)');
    expect(f.detail).toContain('23,2 p.p.');
  });
});

describe('somas lidas por imagem', () => {
  it('s76/s82: linha de disponibilidade (percentuais) não é conferida como soma', () => {
    expect(sums(table('s76_disponibilidade')).badRows).toEqual([]);
    expect(sums(table('s82_disponibilidade')).badRows).toEqual([]);
  });

  it('s80/s81/s82: leitura com margens incoerentes desce para “Verificar”', () => {
    for (const key of ['s80_oferta_lancada', 's81_tipologia_preco', 's82_oferta_lancada', 's82_oferta_final'] as const) {
      const viz = sums(table(key));
      if ((viz.badRows?.length ?? 0) + (viz.badColumns?.length ?? 0) === 0) continue;
      expect(viz.incoherentReading, key).toBe(true);
      expect(viz.notes?.at(-1)).toContain('provável erro de leitura da imagem');
    }
  });

  it('s60: erro real continua acusado e mostra a conta', () => {
    const viz = sums(table('s60_empreendimentos'));
    expect(viz.badColumns).toEqual([5]);
    expect(viz.incoherentReading).toBeUndefined();
    expect(viz.notes?.[0]).toContain('44 + 112 + 236 = 392');
    expect(viz.notes?.[0]).toContain('diferença de 48');
  });

  it('s28: todas as colunas ~7,5% abaixo do total vira “provável faixa omitida”', () => {
    const viz = sums(table('s28_renda'));
    expect(viz.badColumns?.length).toBeGreaterThanOrEqual(2);
    expect(viz.notes?.[0]).toMatch(/cerca de 7,\d% abaixo do total declarado: provável linha ou faixa omitida/);
  });
});

describe('tabela nativa de indicadores (s127)', () => {
  it('“Total de anúncios ativos” no meio da tabela não é linha de soma', () => {
    const ext = irTableToExtracted({ linhas: [
      ['Indicador', 'São José dos Campos', 'Z.I. até 6 km'],
      ['Receita anual (por anúncio)', 'R$ 56.029', 'R$ 33.865'],
      ['Total de anúncios ativos', '1.190', '37'],
      ['Taxa média diária', 'R$ 280,30', 'R$ 199,11'],
      ['Taxa de ocupação', '56%', '49%'],
    ] } as never);
    expect(ext?.totals).toBeUndefined();
  });

  it('“Total” simples continua sendo total em qualquer posição', () => {
    const ext = irTableToExtracted({ linhas: [['Faixa', 'N'], ['A', '1'], ['Total', '3'], ['B', '2']] } as never);
    expect(ext?.totals?.[0]).toBe('Total');
  });
});

describe('faixas', () => {
  it('lacunas: títulos de bloco saem da comparação (s76×s80)', () => {
    const t = { title: 'Tipologia', columns: ['Tipologia'], rows: [
      ['Oferta Lançada'], ['1 Dormitório'], ['2 Dormitórios'], ['3 Dormitórios'], ['4 Dormitórios'],
      ['Oferta Final'], ['1 Dormitório'], ['2 Dormitórios'], ['Dispon. S/O.L.'], ['1 Dormitório'],
    ] } as unknown as ExtractedTable;
    expect(lacunaRowLabels(t)).toEqual(['1 Dormitório', '2 Dormitórios', '3 Dormitórios', '4 Dormitórios']);
  });

  it('s82: «Acima de R$ 8.000» antes de «De 9.001 a 10.000» é sobreposição', () => {
    const gap = detectBinGap(binsFromColumns([...new Set(rowLabels(table('s82_oferta_lancada')))]));
    expect(gap.gapAfterIndex).toBeDefined();
    expect(gap.description).toContain('não é a última');
    expect(gap.description).toContain('De 8.001 a 9.000');
  });

  it('faixas bem-formadas terminando em “Acima de” não disparam', () => {
    expect(detectBinGap(binsFromColumns(['Até R$5.000', 'De R$5.001 a R$6.000', 'Acima de R$6.000'])).gapAfterIndex).toBeUndefined();
  });

  it('“Arté 35 m²” é erro de digitação; “Até” e “De” não', () => {
    const issues = labelTypos(['Arté 35 m²', 'Até 30 m²', 'De 36m² a 40m²', 'Acima de 60m²', 'Tipologia']);
    expect(issues).toHaveLength(1);
    expect(issues[0].reason).toContain('«Até»');
  });
});

describe('formatação (s81)', () => {
  it('“0,076” entre percentuais e “13%” com precisão diferente', () => {
    const t = { title: 'Dispon.', columns: ['Tipologia', 'A', 'B', 'C', 'D', 'Total'], rows: [
      ['1 Dormitório', '1,1%', '1,8%', '-', '0,076', '4,9%'],
      ['2 Dormitórios', '-', '1,3%', '36,0%', '0,076', '21,0%'],
    ], totals: ['Total', '1,1%', '1,6%', '36,0%', '13%', '11,9%'] } as unknown as ExtractedTable;
    const issues = formatIssues(t);
    expect(issues.some((i) => i.text === '0,076' && i.reason.includes('7,6%'))).toBe(true);
    expect(issues.some((i) => i.text === '13%' && i.reason.includes('0 casa'))).toBe(true);
  });

  it('tabela uniforme não gera achado', () => {
    const t = { title: 'x', columns: ['T', 'A', 'B'], rows: [['a', '1,1%', '2,2%'], ['b', '3,3%', '4,4%']], totals: ['Total', '4,4%', '6,6%'] } as unknown as ExtractedTable;
    expect(formatIssues(t)).toEqual([]);
  });
});

describe('cobertura de imagens (v2 do SJC: 48 tabelas em BMP)', () => {
  it('lê dimensões de BMP', () => {
    const bmp = new Uint8Array(54);
    bmp[0] = 0x42; bmp[1] = 0x4d;
    const dv = new DataView(bmp.buffer);
    dv.setInt32(18, 1645, true); dv.setInt32(22, -801, true);
    expect(bmpDims(bmp)).toEqual([1645, 801]);
  });

  it('imagem não lida vira aviso explícito em “Verificar”', () => {
    const candidates = Object.assign([], { skipped: [
      { slide: 76, secao: 'LACUNAS', titulo: 'Lacunas', name: 'ppt/media/image9.bmp', kb: 3900, motivo: 'BMP que não pôde ser convertido para PNG' },
    ] });
    const [f] = unreadImageFindings(candidates);
    expect(f.type).toBe('IMAGE_NOT_READ');
    expect(f.detail).toContain('image9.bmp');
    expect(confidenceOf(f, 'DET')).toBe(3);
  });
});
