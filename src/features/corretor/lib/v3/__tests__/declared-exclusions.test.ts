// Aceite do CH-6 (feedback da Beatriz) com a decisão do Gabriel de 31/jul:
// exclusão declarada no slide NÃO apaga o achado — rebaixa para “Verificar” e
// cita a nota, porque o total pode não fechar por exclusão OU por erro real.

import { describe, expect, it } from 'vitest';

import { applyDeclaredExclusions, declaredExclusion } from '../declared-exclusions';
import { confidenceOf } from '../confidence';
import type { Ir, IrSlide } from '../../audit/ir';
import type { Finding } from '../../audit/model';

const RODAPE_TOLEDO =
  'Unidades garden, duplex e coberturas não são apresentadas na análise para evitar distorções de preço e metragem';

function slide(n: number, textos: string[]): IrSlide {
  return {
    n, titulo: 'Oferta por empreendimento', secao_canonica: 'MERCADO', textos,
    fontes: [], notas: [], notas_edicao: [], notas_revisao: [], tabelas: [], graficos: [], n_imagens: 0,
  };
}

function ir(...slides: IrSlide[]): Ir {
  return { ir_version: 1, arquivo: 'estudo.pptx', n_slides: slides.length, slides };
}

function sumFinding(slideRef: string): Finding {
  return {
    id: `iavis-sum-${slideRef}`, type: 'ABSOLUTE_SUM', section: 'MERCADO', slideRef,
    title: 'Tabela não fecha no total', detail: 'Coluna «Unidades»: soma 980 ≠ total 1099.', ok: false,
  };
}

describe('declaredExclusion — a frase que declara a exclusão', () => {
  it('reconhece o rodapé real do estudo do Toledo', () => {
    expect(declaredExclusion(slide(43, [RODAPE_TOLEDO]))).toContain('não são apresentadas');
  });

  it('reconhece as variações do feedback (ocultamos, desconsidera, exceto)', () => {
    expect(declaredExclusion(slide(1, ['Ocultamos os empreendimentos esgotados nesta análise']))).toBeTruthy();
    expect(declaredExclusion(slide(1, ['A análise desconsidera unidades permutadas e o estande decorado']))).toBeTruthy();
    expect(declaredExclusion(slide(1, ['Todas as tipologias, exceto gardens e coberturas, entram no cálculo']))).toBeTruthy();
  });

  it('citar cobertura como tipologia NÃO é declarar exclusão', () => {
    // Sem verbo de exclusão a regra se abstém — senão silenciaria toda
    // consolidada que lista “Cobertura” entre as tipologias.
    expect(declaredExclusion(slide(1, ['Distribuição por tipologia: 2 dormitórios, garden e cobertura']))).toBeNull();
    expect(declaredExclusion(slide(1, ['Estoque de coberturas em comercialização no trimestre']))).toBeNull();
  });
});

describe('applyDeclaredExclusions — rebaixa, não apaga', () => {
  it('mantém o achado e o joga para “Verificar”, citando a nota', () => {
    const [out] = applyDeclaredExclusions(ir(slide(43, [RODAPE_TOLEDO])), [sumFinding('s43')]);
    expect(out.confidence).toBe(3);
    expect(confidenceOf(out)).toBe(3);
    expect(out.detail).toContain('o slide declara exclusão');
    expect(out.detail).toContain('não são apresentadas');
  });

  it('achado cross-slide basta uma ponta declarar a exclusão', () => {
    const cross: Finding = { ...sumFinding('s42 × s43'), type: 'CROSS_TABLE_MISMATCH', id: 'cross-42-43' };
    const [out] = applyDeclaredExclusions(ir(slide(42, ['Consolidada do mercado']), slide(43, [RODAPE_TOLEDO])), [cross]);
    expect(out.confidence).toBe(3);
  });

  it('slide sem exclusão declarada segue como “Erro”', () => {
    const [out] = applyDeclaredExclusions(ir(slide(43, ['Oferta final do trimestre por empreendimento'])), [sumFinding('s43')]);
    expect(out.confidence).toBeUndefined();
    expect(confidenceOf(out, 'DET')).toBe(1);
  });

  it('não mexe em achado que não depende da tabela estar completa', () => {
    const ortografia: Finding = {
      id: 'txt-43', type: 'SPELLING', section: 'MERCADO', slideRef: 's43',
      title: 'Erro de ortografia', detail: '“emprendimento”.', ok: false,
    };
    const [out] = applyDeclaredExclusions(ir(slide(43, [RODAPE_TOLEDO])), [ortografia]);
    expect(out).toEqual(ortografia);
  });
});
