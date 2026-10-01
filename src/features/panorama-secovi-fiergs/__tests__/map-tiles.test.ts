import { describe, expect, it } from 'vitest';
import { buildMapTilePlan, positionMapPoints } from '../lib/map-tiles';

describe('map tiles do slide 56', () => {
  it('cobre Jundiaí e Paulínia com um mosaico limitado e posiciona os pontos dentro do quadro', () => {
    const points = [{ latitude: -23.1857, longitude: -46.8978 }, { latitude: -22.7612, longitude: -47.1542 }];
    const plan = buildMapTilePlan(points, 'test-token');
    expect(plan).not.toBeNull();
    expect(plan!.columns).toBeLessThanOrEqual(5);
    expect(plan!.rows).toBeLessThanOrEqual(4);
    expect(plan!.tiles).toHaveLength(plan!.columns * plan!.rows);
    expect(plan!.zoom).toBeLessThanOrEqual(12);
    expect(plan!.bounds).toEqual({ minLatitude: -23.1857, maxLatitude: -22.7612, minLongitude: -47.1542, maxLongitude: -46.8978 });
    expect(plan!.tiles.every((tile) => tile.url.startsWith('https://api.mapbox.com/'))).toBe(true);
    for (const point of points) {
      const position = plan!.positionOf(point);
      expect(position.left).toBeGreaterThanOrEqual(3);
      expect(position.left).toBeLessThanOrEqual(97);
      expect(position.top).toBeGreaterThanOrEqual(3);
      expect(position.top).toBeLessThanOrEqual(97);
    }
  });

  it('enquadra a Região Metropolitana de Porto Alegre com padding e sem zoom excessivo', () => {
    const points = [
      { latitude: -29.9914, longitude: -51.0809 }, // Alvorada
      { latitude: -29.7545, longitude: -51.1498 }, // Novo Hamburgo
      { latitude: -30.1139, longitude: -51.325 }, // Guaíba
      { latitude: -30.0819, longitude: -51.0194 }, // Viamão
    ];
    const plan = buildMapTilePlan(points, 'test-token');
    expect(plan).not.toBeNull();
    expect(plan!.zoom).toBeGreaterThanOrEqual(4);
    expect(plan!.zoom).toBeLessThanOrEqual(12);
    expect(plan!.columns).toBeLessThanOrEqual(5);
    expect(plan!.rows).toBeLessThanOrEqual(4);
    points.forEach((point) => expect(plan!.positionOf(point)).toEqual(expect.objectContaining({ left: expect.any(Number), top: expect.any(Number) })));
  });

  it('separa coordenadas exatamente coincidentes sem alterar nem remover os pontos de origem', () => {
    const points = [
      { projectKey: 'A', latitude: -30.03, longitude: -51.23 },
      { projectKey: 'B', latitude: -30.03, longitude: -51.23 },
      { projectKey: 'C', latitude: -29.75, longitude: -51.15 },
    ];
    const plan = buildMapTilePlan(points, 'test-token')!;
    const positioned = positionMapPoints(points, plan);
    expect(positioned).toHaveLength(points.length);
    expect(positioned.map((item) => item.point)).toEqual(points);
    expect(positioned[0].coincident).toBe(2);
    expect(positioned[1].coincident).toBe(2);
    expect({ left: positioned[0].left, top: positioned[0].top }).not.toEqual({ left: positioned[1].left, top: positioned[1].top });
    positioned.forEach((item) => {
      expect(item.left).toBeGreaterThanOrEqual(2.5);
      expect(item.left).toBeLessThanOrEqual(97.5);
      expect(item.top).toBeGreaterThanOrEqual(2.5);
      expect(item.top).toBeLessThanOrEqual(97.5);
    });
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
