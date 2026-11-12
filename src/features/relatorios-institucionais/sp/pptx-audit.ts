import { embedReportPptxAudit } from '../shared/pptx-audit';

export const SP_PPTX_AUDIT_PART = 'customXml/sp-audit.xml';
export const SP_PPTX_AUDIT_NS = 'urn:brain:sp-institutional:audit:v1';
export function embedSpPptxAudit(bytes: Uint8Array, audit: unknown): Uint8Array {
  return embedReportPptxAudit(bytes, audit, {part:SP_PPTX_AUDIT_PART,namespace:SP_PPTX_AUDIT_NS,relationshipId:'rIdSpAudit'});
}
