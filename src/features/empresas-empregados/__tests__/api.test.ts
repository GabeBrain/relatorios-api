import { describe, expect, it } from 'vitest';
import { resolveMonitoredMunicipality } from '../api';

describe('resolução de município monitorado para RAIS', () => {
  const ibgeMunicipalities = [
    { ibgeCode: '4202404', name: 'Blumenau', uf: 'SC' },
    { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
  ];

  it('resolve o código IBGE somente após a cidade autorizada ser selecionada', () => {
    expect(resolveMonitoredMunicipality(ibgeMunicipalities, { uf: 'GO', city: 'Rio Verde' }))
      .toEqual({ ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' });
  });

  it('não transforma o catálogo IBGE em fallback para cidade não monitorada', () => {
    expect(resolveMonitoredMunicipality(ibgeMunicipalities, { uf: 'SC', city: 'Gaspar' })).toBeNull();
  });
});
