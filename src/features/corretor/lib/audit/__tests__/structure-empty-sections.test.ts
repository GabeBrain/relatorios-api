import { describe, expect, it } from 'vitest';
import { structureChecklistFinding } from '../structure-checklist';
import type { Ir } from '../ir';

const ir = (slides: Ir['slides']) => ({ slides } as Ir);
const summary = (n: number) => ({
  n, titulo: 'Conteúdo', secao_canonica: 'SUMARIO', textos: ['01 - Apresentação', '02 - Dados da cidade', '03 - Mercado', '04 - Avaliação da Consultoria', '05 - Recomendação', '06 - Fichas técnicas'], tabelas: [], n_imagens: 0,
});

describe('seções vazias indicadas por sumários consecutivos', () => {
  it('reconhece sociodemografia pelos slides de métricas sem depender do nome do capítulo', () => {
    const indexes = [73, 74, 75].map((n) => ({ ...summary(n), textos: summary(n).textos.map((text) => text.replace('Dados da cidade', 'Sociodemografia')) }));
    const content = { n: 23, titulo: 'População e domicílios', secao_canonica: 'SOCIO', textos: ['População por renda'], tabelas: [], n_imagens: 0 };
    const finding = structureChecklistFinding(ir([content, ...indexes]));
    expect(finding.detail).not.toContain('Seção 02 (Sociodemografia)');
    expect(finding.detail).toContain('Seção 04 (Avaliação da Consultoria)');
    expect(finding.detail).toContain('Seção 05 (Recomendação)');
    expect(structureChecklistFinding(ir(indexes)).detail).toContain('Seção 02 (Sociodemografia)');
    expect(structureChecklistFinding(ir([{ ...content, secao_canonica: 'MERCADO' }, ...indexes])).detail).toContain('Seção 02 (Sociodemografia)');
  });
  it('nomeia as seções sem conteúdo e deixa slide final vazio como conferir', () => {
    const finding = structureChecklistFinding(ir([
      summary(73), summary(74), summary(75),
      { n: 76, titulo: 'Mercado imobiliário', secao_canonica: 'MERCADO', textos: ['Mercado apresenta empreendimentos'], tabelas: [], n_imagens: 0 },
      { n: 77, titulo: 'Fichas técnicas', secao_canonica: 'MERCADO', textos: ['Fichas técnicas dos concorrentes'], tabelas: [], n_imagens: 0 },
      { n: 78, titulo: '', secao_canonica: null, textos: [], tabelas: [], n_imagens: 0 },
    ]));
    expect(finding.detail).toContain('Seção 04 (Avaliação da Consultoria)');
    expect(finding.detail).toContain('Seção 05 (Recomendação)');
    expect(finding.ok).toBe(false);
    expect(finding.viz?.kind === 'text' && finding.viz.checklist?.some((item) => item.label.includes('s78') && item.status === 'na')).toBe(true);
  });

  it('não nomeia seção como vazia quando há conteúdo correspondente', () => {
    const finding = structureChecklistFinding(ir([
      summary(73), summary(74), summary(75),
      { n: 76, titulo: 'Avaliação da Consultoria', secao_canonica: 'MERCADO', textos: ['Avaliação da Consultoria e recomendação'], tabelas: [], n_imagens: 0 },
    ]));
    expect(finding.detail).not.toContain('Seção 04 (Avaliação da Consultoria)');
  });
});
