// Hierarquia de confiança v4. A UI nunca chama toda pendência de “erro”.

import { ERROR_CATALOG, type ErrorType } from '../error-catalog';
import type { Finding } from '../audit/model';

export type Confidence = 1 | 2 | 3;

export const CONFIDENCE_META: Record<Confidence, { label: string; icon: string; className: string }> = {
  1: { label: 'Erro', icon: '⛔', className: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300' },
  2: { label: 'Provável', icon: '⚠', className: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  3: { label: 'Verificar', icon: '👁', className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
};

const VERIFY = new Set<ErrorType>(['VALUE_PLAUSIBILITY', 'PROJECTION_FORMULA', 'SOURCE_MISSING', 'ATA_COVERAGE', 'STRUCTURE_MISSING', 'REQUIRED_NOTE', 'EXCLUSION_RULE']);

/** Determina o tom pelo tipo, origem e confirmação de leitura da visão. */
export function confidenceOf(finding: Pick<Finding, 'type' | 'detail' | 'escalated'>, origem = 'DET'): Confidence {
  const type = finding.type as ErrorType;
  if (VERIFY.has(type)) return 3;
  if (type === 'WRONG_CONTEXT') return 1; // evidência literal de cidade/UF
  if (finding.escalated || /confirmado no gpt-4o/i.test(finding.detail)) return 1;
  const meta = ERROR_CATALOG[type];
  if (origem === 'DET' && meta?.mode === 'PLENO') return 1;
  return 2;
}
