import { describe, expect, it } from 'vitest';
import { spVgvHeat } from './map-heat';
import { spMapCore } from './map-model';
import { spSlidePeriod } from './model';
import { buildSpTemporalPreview } from './temporal';
import { syntheticWindow } from './__tests__/synthetic-window';

describe('Correções do relatório SP de 10/11/2026', () => {
  it('trimestre consolidado mostra só 2T 2026 e parcial continua identificado', () => {
    const closed = buildSpTemporalPreview(syntheticWindow('09'), '3T2026');
    expect(spSlidePeriod(closed)).toBe('3T 2026');
    expect(spSlidePeriod(buildSpTemporalPreview(syntheticWindow('08'), '3T2026'))).toContain('Parcial');
  });
  it('mapa de calor alcança vermelho mesmo com um núcleo dominante', () => {
    const points = [{ left: 50, top: 50, value: 1000000 }, ...Array.from({ length: 30 }, (_, i) => ({ left: 5 + i * 3, top: 20, value: 1000 }))];
    const levels = spVgvHeat(points).cells.map(cell => (cell as { level: number }).level);
    expect(Math.max(...levels)).toBe(1);
    expect(levels.filter(level => level >= .5).length).toBeGreaterThan(levels.length * .3);
  });
  it('visão ampla exclui pontos metropolitanos isolados sem descartá-los da contagem', () => {
    const points = Array.from({ length: 50 }, (_, i) => ({ latitude: -23.55 + (i % 10) * .005, longitude: -46.63 + Math.floor(i / 10) * .005 }));
    const core = spMapCore([...points, { latitude: -24.2, longitude: -47.3 }]);
    expect(core.points).toHaveLength(50);
    expect(core.excluded).toBe(1);
  });
});
