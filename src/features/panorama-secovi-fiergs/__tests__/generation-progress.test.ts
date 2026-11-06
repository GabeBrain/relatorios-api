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
    expect(current.total).toBe(22);
    expect(current.percent).toBeGreaterThan(0);
    expect(current.completedCities).toEqual(['Santos']);
    expect(observedRemainingMs(current, current.startedAt + 1_000)).toBeGreaterThan(0);
    expect(formatRemainingTime(61_000)).toBe('1 min 1 s');
  });
});

it('não soma tentativas repetidas nem anuncia 100% antes da preparação', () => {
  const snapshots: import('../domain/generation-progress').PanoramaGenerationProgress[] = [];
  const progress = createPanoramaGenerationProgress(5, (value) => snapshots.push(value));
  progress.start();
  for (let attempt = 0; attempt < 3; attempt++) for (let city = 0; city < 5; city++) {
    for (let operation = 0; operation < 10; operation++) progress.unit(String(city), String(operation));
    if (attempt) progress.retry(String(city), attempt + 1);
  }
  expect(snapshots.at(-1)).toMatchObject({completed: 50, total: 52});
  expect(snapshots.every((value) => value.percent < 100)).toBe(true);
  progress.consolidate();
  expect(snapshots.at(-1)!.percent).toBeLessThan(100);
  progress.prepare();
  expect(snapshots.at(-1)!.percent).toBe(100);
});
it('contabiliza cidades preservadas na recuperação sem duplicá-las', () => {
  const snapshots: import('../domain/generation-progress').PanoramaGenerationProgress[] = [];
  const progress = createPanoramaGenerationProgress(2, (value) => snapshots.push(value));
  progress.cityReused('Lajeado'); progress.cityReused('Lajeado');
  for (let i = 0; i < 10; i++) progress.unit('Estrela', String(i));
  expect(snapshots.at(-1)).toMatchObject({completed: 20, total: 22});
  progress.consolidate(); progress.prepare();
  expect(snapshots.at(-1)!.percent).toBe(100);
});

it('não arredonda a consolidação para 100% em recortes grandes',()=>{
  let current: import('../domain/generation-progress').PanoramaGenerationProgress | undefined;
  const progress=createPanoramaGenerationProgress(100,value=>{current=value;});
  for(let i=0;i<100;i++)progress.cityReused(String(i));
  progress.consolidate();expect(current!.percent).toBe(99);
  progress.prepare();expect(current!.percent).toBe(100);
});
