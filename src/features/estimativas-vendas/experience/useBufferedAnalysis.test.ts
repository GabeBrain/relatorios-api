import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ALL_METHODS, type AnalysisSpec, type CaseAnalysis } from './domain';
import type { AnalysisRuntime } from './runtime';
import { useBufferedAnalysis } from './useBufferedAnalysis';
const spec: AnalysisSpec = { cutoff: '2026-09', duration: 12, methods: ALL_METHODS };
const packet = (id: string, duration = 12) => ({ id, hash: 'snapshot', spec: { ...spec, duration } }) as CaseAnalysis;
function deferred() { let resolve!: (v: CaseAnalysis) => void; const promise = new Promise<CaseAnalysis>(r => { resolve = r; }); return { promise, resolve }; }
describe('quadros atômicos do carrossel', () => {
  it('mantém o quadro A e ignora B atrasado quando a pessoa já pediu C', async () => {
    const a = deferred(), b = deferred(), c = deferred();
    const runtime = { peek: vi.fn(), analyze: vi.fn((id: string) => ({ a, b, c })[id as 'a'].promise) } as unknown as AnalysisRuntime;
    const hook = renderHook(({ id }) => useBufferedAnalysis(runtime, 'snapshot', id, spec), { initialProps: { id: 'a' } });
    await act(async () => a.resolve(packet('a'))); expect(hook.result.current.analysis?.id).toBe('a');
    hook.rerender({ id: 'b' }); expect(hook.result.current.busy).toBe(true); expect(hook.result.current.analysis?.id).toBe('a');
    hook.rerender({ id: 'c' }); await act(async () => c.resolve(packet('c')));
    expect(hook.result.current.analysis?.id).toBe('c'); expect(hook.result.current.busy).toBe(false);
    await act(async () => b.resolve(packet('b'))); expect(hook.result.current.analysis?.id).toBe('c');
  });
  it('preserva os parâmetros anteriores junto dos valores até a duração nova terminar', async () => {
    const next = deferred(); const runtime = { peek: vi.fn().mockReturnValueOnce(packet('a')), analyze: vi.fn(() => next.promise) } as unknown as AnalysisRuntime;
    const hook = renderHook(({ duration }) => useBufferedAnalysis(runtime, 'snapshot', 'a', { ...spec, duration }), { initialProps: { duration: 12 } });
    await waitFor(() => expect(hook.result.current.busy).toBe(false)); hook.rerender({ duration: 6 });
    expect(hook.result.current.analysis?.spec.duration).toBe(12); expect(hook.result.current.busy).toBe(true);
    await act(async () => next.resolve(packet('a', 6))); expect(hook.result.current.analysis?.spec.duration).toBe(6);
  });
  it('não promove resultado com identidade divergente', async () => {
    const runtime = { peek: vi.fn(), analyze: vi.fn().mockResolvedValue(packet('outro')) } as unknown as AnalysisRuntime;
    const hook = renderHook(() => useBufferedAnalysis(runtime, 'snapshot', 'a', spec));
    await waitFor(() => expect(hook.result.current.error).toMatch(/não corresponde/)); expect(hook.result.current.analysis).toBeNull();
  });
});
