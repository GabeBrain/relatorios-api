import { useEffect, useRef, useState } from 'react';
import type { AnalysisRuntime } from './runtime';
import type { AnalysisSpec, Universe } from './domain';
import { buildExportPlan, type ExportPlan } from './export';
import { buildDeliveryPlan, exportRequestKey } from './deliveryScope';

export function useExportPlan(universe: Universe, runtime: AnalysisRuntime, ids: string[], spec: AnalysisSpec, enabled = true, referenceOnly = false) {
  const key = exportRequestKey(universe, ids, spec);
  const [published, setPublished] = useState<{ key: string; plan: ExportPlan } | null>(null);
  const [done, setDone] = useState(0), [error, setError] = useState(''), [cancelled, setCancelled] = useState(false), [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const request = useRef({ universe, runtime, ids, spec }); request.current = { universe, runtime, ids, spec };
  const valid = published?.key === key;
  useEffect(() => {
    if (!enabled || !ids.length || valid) return;
    let live = true;
    const seq = ++generation.current, input = request.current;
    setDone(0); setError(''); setCancelled(false);
    void (async () => {
      try {
        const analyses = [];
        for (const id of input.ids) {
          if (!live || seq !== generation.current) return;
          analyses.push(await input.runtime.analyze(id, input.spec, 1));
          if (live && seq === generation.current) setDone(analyses.length);
        }
        if (!live || seq !== generation.current) return;
        const build = referenceOnly ? buildDeliveryPlan : buildExportPlan;
        setPublished({ key, plan: build(input.universe, input.ids, analyses, input.spec) });
      } catch (e) { if (live && seq === generation.current) setError(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { live = false; };
  }, [key, runtime, enabled, referenceOnly, attempt, valid, ids.length]);
  return { plan: valid ? published.plan : null, previous: published?.plan ?? null, done, error, cancelled,
    pending: enabled && ids.length > 0 && !valid && !error && !cancelled,
    cancel: () => { generation.current++; setCancelled(true); }, retry: () => { setError(''); setCancelled(false); setAttempt(v => v + 1); } };
}
