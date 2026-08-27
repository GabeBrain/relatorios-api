import { describe, expect, it } from 'vitest';
import { buildMapTilePlan } from '../lib/map-tiles';

describe('map tiles do slide 56', () => {
  it('cobre Jundiaí e Paulínia com um mosaico limitado e posiciona os pontos dentro do quadro', () => {
    const points = [{ latitude: -23.1857, longitude: -46.8978 }, { latitude: -22.7612, longitude: -47.1542 }];
    const plan = buildMapTilePlan(points);
    expect(plan).not.toBeNull();
    expect(plan!.columns).toBeLessThanOrEqual(5);
    expect(plan!.rows).toBeLessThanOrEqual(4);
    expect(plan!.tiles).toHaveLength(plan!.columns * plan!.rows);
    for (const point of points) {
      const position = plan!.positionOf(point);
      expect(position.left).toBeGreaterThanOrEqual(3);
      expect(position.left).toBeLessThanOrEqual(97);
      expect(position.top).toBeGreaterThanOrEqual(3);
      expect(position.top).toBeLessThanOrEqual(97);
    }
  });

  it('não solicita tiles quando não há coordenadas', () => {
    expect(buildMapTilePlan([])).toBeNull();
  });

  it('ignora coordenadas inválidas sem tentar criar um mosaico de tamanho impossível', () => {
    expect(buildMapTilePlan([{ latitude: -23.18, longitude: -46.88 }, { latitude: 999_999_999, longitude: 999_999_999 }])).not.toBeNull();
    expect(buildMapTilePlan([{ latitude: Number.NaN, longitude: -46.88 }])).toBeNull();
  });
});
