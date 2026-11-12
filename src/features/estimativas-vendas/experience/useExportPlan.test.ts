import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { analyzeCase, buildingSpec } from './domain';
import { deliveryFixture } from './delivery.fixture';
import { deliverySpec } from './deliveryScope';
import { useExportPlan } from './useExportPlan';
import type { AnalysisRuntime } from './runtime';

describe('preparação atômica da entrega', () => {
  it('descarta B atrasado e conserva o quadro anterior até publicar C', async () => {
    const u = deliveryFixture();
    const packets = await Promise.all([1, 3, 12].map(n => analyzeCase(u, '001', buildingSpec(u, '001', deliverySpec(n)))));
    let finish!: () => void;
    const delayed = new Promise<typeof packets[0]>(resolve => { finish = () => resolve(packets[1]); });
    const runtime = { analyze: vi.fn((_id, spec) => spec.duration === 3 ? delayed : Promise.resolve(packets[spec.duration === 1 ? 0 : 2])) } as unknown as AnalysisRuntime;
    const hook = renderHook(({ duration }) => useExportPlan(u, runtime, ['001'], deliverySpec(duration), true, true), { initialProps: { duration: 1 } });
    await waitFor(() => expect(hook.result.current.plan?.forecasts).toHaveLength(1));
    hook.rerender({ duration: 3 }); expect(hook.result.current.plan).toBeNull(); expect(hook.result.current.previous?.forecasts).toHaveLength(1);
    hook.rerender({ duration: 12 }); await waitFor(() => expect(hook.result.current.plan?.forecasts).toHaveLength(12));
    await act(async () => finish()); expect(hook.result.current.plan?.forecasts).toHaveLength(12);
  });
  it('cancelamento e falha não liberam arquivo parcial; tentativa novamente usa a mesma base', async () => {
    const u = deliveryFixture(), packet = await analyzeCase(u, '001', buildingSpec(u, '001', deliverySpec(12)));
    let finish!: () => void;
    const pending = new Promise<typeof packet>(resolve => { finish = () => resolve(packet); });
    const analyze = vi.fn().mockReturnValueOnce(pending).mockRejectedValueOnce(new Error('Falha controlada')).mockResolvedValue(packet);
    const runtime = { analyze } as unknown as AnalysisRuntime;
    const hook = renderHook(() => useExportPlan(u, runtime, ['001'], deliverySpec(12), true, true));
    act(() => hook.result.current.cancel()); await act(async () => finish()); expect(hook.result.current.plan).toBeNull(); expect(hook.result.current.cancelled).toBe(true);
    act(() => hook.result.current.retry()); await waitFor(() => expect(hook.result.current.error).toContain('Falha controlada')); expect(hook.result.current.plan).toBeNull();
    act(() => hook.result.current.retry()); await waitFor(() => expect(hook.result.current.plan?.forecasts).toHaveLength(12));
  });
});
