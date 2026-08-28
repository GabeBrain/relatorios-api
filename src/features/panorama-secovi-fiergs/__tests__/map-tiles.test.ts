import { describe, expect, it } from 'vitest';
import { buildMapTilePlan } from '../lib/map-tiles';

describe('map tiles do slide 56', () => {
  it('cobre Jundiaí e Paulínia com um mosaico limitado e posiciona os pontos dentro do quadro', () => {
    const points = [{ latitude: -23.1857, longitude: -46.8978 }, { latitude: -22.7612, longitude: -47.1542 }];
    const plan = buildMapTilePlan(points, 'test-token');
    expect(plan).not.toBeNull();
    expect(plan!.columns).toBeLessThanOrEqual(5);
    expect(plan!.rows).toBeLessThanOrEqual(4);
    expect(plan!.tiles).toHaveLength(plan!.columns * plan!.rows);
    expect(plan!.tiles.every((tile) => tile.url.startsWith('https://api.mapbox.com/'))).toBe(true);
    for (const point of points) {
      const position = plan!.positionOf(point);
      expect(position.left).toBeGreaterThanOrEqual(3);
      expect(position.left).toBeLessThanOrEqual(97);
      expect(position.top).toBeGreaterThanOrEqual(3);
      expect(position.top).toBeLessThanOrEqual(97);
    }
  });

  it('não solicita tiles quando não há coordenadas', () => {
    expect(buildMapTilePlan([], 'test-token')).toBeNull();
  });

  it('ignora coordenadas inválidas sem tentar criar um mosaico de tamanho impossível', () => {
    expect(buildMapTilePlan([{ latitude: -23.18, longitude: -46.88 }, { latitude: 999_999_999, longitude: 999_999_999 }], 'test-token')).not.toBeNull();
    expect(buildMapTilePlan([{ latitude: Number.NaN, longitude: -46.88 }], 'test-token')).toBeNull();
  });

  it('falha de modo seguro quando pontos válidos exigem um mosaico maior do que o permitido', () => {
    const distantPoints = [{ latitude: -80, longitude: -179 }, { latitude: 80, longitude: 179 }];
    expect(() => buildMapTilePlan(distantPoints, 'test-token')).not.toThrow();
    expect(buildMapTilePlan(distantPoints, 'test-token')).toBeNull();
  });
});
