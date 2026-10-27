import { describe, expect, it } from 'vitest';
import { ruleLabel } from './rule-label';

describe('ruleLabel', () => {
  it('remove somente os sufixos de categoria solicitados', () => {
    expect(ruleLabel('Estoque - Empreendimento')).toBe('Estoque');
    expect(ruleLabel('Estoque - Tipologia')).toBe('Estoque');
    expect(ruleLabel('Metragem - Tipologia')).toBe('Metragem');
    expect(ruleLabel('Preço - Tipologia')).toBe('Preço');
    expect(ruleLabel('Vagas')).toBe('Vagas');
    expect(ruleLabel('Empreendimento - Outra')).toBe('Empreendimento - Outra');
  });
});
