import { describe, expect, it } from 'vitest';
import municipalitiesByUf from '@/assets/municipios-br.json';

describe('catálogo municipal da RAIS', () => {
  it('não limita o Acre às cidades monitoradas do GeoBrain', () => {
    const acre = (municipalitiesByUf as Record<string, string[]>).AC;
    expect(acre).toContain('Rio Branco');
    expect(acre).toContain('Cruzeiro do Sul');
    expect(acre).toContain('Tarauacá');
    expect(acre.length).toBeGreaterThan(1);
  });
});
