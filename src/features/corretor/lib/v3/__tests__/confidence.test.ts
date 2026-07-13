import { describe, expect, it } from 'vitest';
import { confidenceOf } from '../confidence';

describe('confiança v4', () => {
  it('separa erro provado, provável e item a verificar', () => {
    expect(confidenceOf({ type: 'ABSOLUTE_SUM', detail: 'Tabela nativa não fecha.' }, 'DET')).toBe(1);
    expect(confidenceOf({ type: 'CROSS_TABLE_MISMATCH', detail: 'Compare as duas fontes.' }, 'IA_visao')).toBe(2);
    expect(confidenceOf({ type: 'VALUE_PLAUSIBILITY', detail: 'Verificar ticket.' }, 'IA_visao')).toBe(3);
  });
});
