import { describe, expect, it } from 'vitest';
import { offerByStandard, offerByTypology, maturityByTypology } from '../domain/aggregations';
import { buildCityCube } from '../domain/cube';

describe('FIERGS · cobertura tipológica da oferta lançada', () => {
  it('reproduz a perda quando o empreendimento declara lançadas sem linha tipológica', () => {
    const cube = buildCityCube([{
      building_id: '63001',
      name: 'Residencial Santa Bárbara',
      building_type: 'Vertical',
      release_date: '2022-08-01',
      total_units: 63,
    }], {
      city: 'Cachoeirinha',
      uf: 'RS',
      endQuarter: '2T2026',
      entity: 'fiergs-rs',
      engineVersion: 'v4',
    });

    const standardTotal = offerByStandard(cube).find((row) => row.kind === 'total');
    const typologyTotal = offerByTypology(cube).find((row) => row.kind === 'total');
    const maturityTotal = maturityByTypology(cube).find((row) => row.kind === 'total');

    expect(standardTotal?.launchedUnits).toBe(63);
    expect(maturityTotal?.launched.total).toBe(63);
    expect(typologyTotal?.launchedUnits).toBeNull();
    expect((standardTotal?.launchedUnits ?? 0) - (typologyTotal?.launchedUnits ?? 0)).toBe(63);
  });
});
