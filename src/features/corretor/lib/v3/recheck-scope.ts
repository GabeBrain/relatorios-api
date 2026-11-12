/** Regras executadas pela reconferência direta: IR nativo e, quando presente, fonte. */
export function directRecheckRuleWasEvaluated(ruleId: string, sourceCrosscheckRan: boolean): boolean {
  if (ruleId === 'structure' || ruleId === 'review-notes') return true;
  if (/^(sum-\d+-\d+|paged-sum-\d+(?:-\d+)*|radii-\d+|travel-speed-\d+|native-format-\d+|wrong-uf-\d+-.+|wrong-city-\d+-.+|zi-label-\d+-.+)$/.test(ruleId)) return true;
  return sourceCrosscheckRan && /^source-\d+-/.test(ruleId);
}
