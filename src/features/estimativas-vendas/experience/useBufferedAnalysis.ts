import { useEffect, useState } from 'react';
import { specKey, type AnalysisSpec, type CaseAnalysis } from './domain';
import type { AnalysisRuntime } from './runtime';

/** A published frame always owns its ID, parameters and results. Never relabel old data. */
export function useBufferedAnalysis(runtime: AnalysisRuntime, hash: string, id: string, spec: AnalysisSpec) {
  const key = specKey(hash, id, spec);
  const [frame, setFrame] = useState<{ key: string; analysis: CaseAnalysis } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    function accept(next: CaseAnalysis) {
      if (!live) return;
      if (next.hash !== hash || next.id !== id || specKey(next.hash, next.id, next.spec) !== key) { setFailure({ key, message: 'O resultado não corresponde ao empreendimento solicitado.' }); return; }
      setFrame({ key, analysis: next }); setFailure(null);
    }
    const cached = runtime.peek(id, spec);
    if (cached) accept(cached);
    else void runtime.analyze(id, spec, 0).then(accept, e => { if (live) setFailure({ key, message: String(e.message) }); });
    return () => { live = false; };
    // key includes snapshot, ID, origin, duration, methods and model versions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, key, attempt]);
  return { analysis: frame?.analysis ?? null, busy: frame?.key !== key, error: failure?.key === key ? failure.message : '', retry: () => setAttempt(v => v + 1) };
}
