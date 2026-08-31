import { describe, expect, it } from 'vitest';
import { createPanoramaGenerationProgress, formatRemainingTime, observedRemainingMs } from '../domain/generation-progress';

describe('progresso de geração do Panorama', () => {
  it('mede unidades concluídas e só estima o tempo após observações reais', () => {
    const snapshots = [] as Parameters<NonNullable<Parameters<typeof createPanoramaGenerationProgress>[1]>>[0][];
    const progress = createPanoramaGenerationProgress(2, (snapshot) => snapshots.push(snapshot));
    progress.start();
    progress.unit('Santos', 'vendas por padrão');
    expect(observedRemainingMs(snapshots.at(-1)!, snapshots.at(-1)!.startedAt + 1_000)).toBeNull();
    progress.unit('Santos', 'oferta por padrão');
    progress.cityComplete('Santos');
    const current = snapshots.at(-1)!;
    expect(current.total).toBe(24);
    expect(current.percent).toBeGreaterThan(0);
    expect(current.completedCities).toEqual(['Santos']);
    expect(observedRemainingMs(current, current.startedAt + 1_000)).toBeGreaterThan(0);
    expect(formatRemainingTime(61_000)).toBe('1 min 1 s');
  });
});
