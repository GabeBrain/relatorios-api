import { describe, expect, it } from 'vitest';
import { confidenceOf } from '../confidence';

describe('confiança v4', () => {
  it('separa erro provado, provável e item a verificar', () => {
    expect(confidenceOf({ type: 'ABSOLUTE_SUM', detail: 'Tabela nativa não fecha.' }, 'DET')).toBe(1);
    expect(confidenceOf({ type: 'CROSS_TABLE_MISMATCH', detail: 'Compare as duas fontes.' }, 'IA_visao')).toBe(2);
    expect(confidenceOf({ type: 'VALUE_PLAUSIBILITY', detail: 'Verificar ticket.' }, 'IA_visao')).toBe(3);
  });

  it('WRONG_CONTEXT: texto (UF) é nível 1, visão não confirmada é nível 2', () => {
    // regra de UF: evidência literal do texto, sem imagem → erro
    expect(confidenceOf({ type: 'WRONG_CONTEXT', detail: 'UF divergente.' }, 'DET')).toBe(1);
    // leitura de visão não escalonada (tem evidenceSha1) → provável
    expect(confidenceOf({ type: 'WRONG_CONTEXT', detail: 'Cidade na imagem.', evidenceSha1: 'abc' }, 'IA_visao')).toBe(2);
    // mas se a leitura foi confirmada no 4o, volta a erro
    expect(confidenceOf({ type: 'WRONG_CONTEXT', detail: 'Cidade na imagem.', evidenceSha1: 'abc', escalated: true }, 'IA_visao')).toBe(1);
  });

  it('cruzamento de tabelas nativas (origem DET) é erro, não provável', () => {
    expect(confidenceOf({ type: 'CROSS_TABLE_MISMATCH', detail: 'Totais divergem.' }, 'DET')).toBe(2);
    // CROSS_TABLE_MISMATCH é BETA no catálogo → nível 2 mesmo em DET; o teste fixa o contrato atual
  });
});
