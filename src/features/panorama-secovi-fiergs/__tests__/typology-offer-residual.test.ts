import { describe, expect, it } from 'vitest';
import { offerByStandard, offerByTypology, maturityByTypology } from '../domain/aggregations';
import { buildCityCube } from '../domain/cube';

describe('FIERGS · cobertura tipológica da oferta lançada', () => {
  it('preserva como Não classificado o total sem linha tipológica e mantém ausências como null', () => {
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
    const residual = offerByTypology(cube).find((row) => row.label === 'Não classificado');
    const typologyTotal = offerByTypology(cube).find((row) => row.kind === 'total');
    const maturityResidual = maturityByTypology(cube).find((row) => row.label === 'Não classificado');
    const maturityTotal = maturityByTypology(cube).find((row) => row.kind === 'total');

    expect(standardTotal?.launchedUnits).toBe(63);
    expect(maturityTotal?.launched.total).toBe(63);
    expect(residual).toMatchObject({ projects: 1, launchedUnits: 63, finalUnits: null, soldUnits: null });
    expect(maturityResidual?.launched.total).toBe(63);
    expect(maturityResidual?.final.total).toBeNull();
    expect(typologyTotal?.launchedUnits).toBe(63);
    expect(typologyTotal?.finalUnits).toBeNull();
    expect(standardTotal?.launchedUnits).toBe(typologyTotal?.launchedUnits);
  });

  it('funde o residual com uma tipologia já não classificada sem duplicar a linha', () => {
    const cube = buildCityCube([{
      building_id: 'partial', name: 'Cobertura parcial', building_type: 'Vertical', release_date: '2024-01-01', total_units: 63,
      typologies_history: [{ period: '2024-01-01', number_bedroom: 'desconhecido', qty: 20 }],
    }], { city: 'Cachoeirinha', uf: 'RS', endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4' });

    const rows = offerByTypology(cube);
    expect(rows.filter((row) => row.label === 'Não classificado')).toHaveLength(1);
    expect(rows.find((row) => row.label === 'Não classificado')).toMatchObject({ projects: 1, launchedUnits: 63 });
    expect(rows.find((row) => row.kind === 'total')?.launchedUnits).toBe(63);
  });

  it('mantém residual negativo visível quando linhas tipológicas excedem o total do projeto', () => {
    const cube = buildCityCube([{
      building_id: 'overcovered', name: 'Cobertura excedente', building_type: 'Vertical', release_date: '2024-01-01', total_units: 63,
      typologies_history: [{ period: '2024-01-01', number_bedroom: '2', qty: 70 }],
    }], { city: 'Cachoeirinha', uf: 'RS', endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4' });

    const rows = offerByTypology(cube);
    expect(rows.find((row) => row.label === '2 Dormitórios')?.launchedUnits).toBe(70);
    expect(rows.find((row) => row.label === 'Não classificado')?.launchedUnits).toBe(-7);
    expect(rows.find((row) => row.kind === 'total')?.launchedUnits).toBe(63);
  });
});
