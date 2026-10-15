import type { Finding } from '../audit/model';
import { errorLabel, type ErrorType } from '../error-catalog';

/** Apresentação apenas: IDs, literal, confiança e decisões não são reescritos. */
export function presentFindingPt(finding: Finding): Finding {
  const translate = (text: string): string => text
    .replace(/Misspelling of\s+(.+?)(?:\.$|$)/gi, 'Possível erro de grafia em $1')
    .replace(/(?:Incorrect verb agreement|Verb agreement error)\.?/gi, 'Possível erro de concordância verbal.')
    .replace(/Spelling error/gi, 'Possível erro de grafia')
    .replace(/Missing source/gi, 'Fonte não identificada');
  const title = translate(finding.title);
  const detail = translate(finding.detail);
  const foreign = /\b(?:misspelling|incorrect|mismatch|missing|should|expected|inconsistent|spelling|agreement|wrong|the|there|does|not match)\b/i;
  const label = errorLabel(finding.type as ErrorType);
  return { ...finding, title: foreign.test(title) ? label : title,
    detail: foreign.test(detail) ? 'Confira o trecho original e sua relação com os dados do slide.' : detail };
}
