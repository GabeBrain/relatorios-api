import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

export const SP_PPTX_AUDIT_PART = 'customXml/sp-audit.xml';
export const SP_PPTX_AUDIT_NS = 'urn:brain:sp-institutional:audit:v1';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CUSTOM_XML_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml';
const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Keep machine data out of the notes text engine, irrespective of report size. */
export function embedSpPptxAudit(bytes: Uint8Array, audit: unknown): Uint8Array {
  const files = unzipSync(bytes);
  const relPath = 'ppt/_rels/presentation.xml.rels';
  const rels = new DOMParser().parseFromString(strFromU8(files[relPath]), 'application/xml');
  const ids = new Set([...rels.documentElement.children].map(node => node.getAttribute('Id')));
  let id = 'rIdSpAudit';
  while (ids.has(id)) id += '_';
  const rel = rels.createElementNS(REL_NS, 'Relationship');
  rel.setAttribute('Id', id);
  rel.setAttribute('Type', CUSTOM_XML_REL);
  rel.setAttribute('Target', '../' + SP_PPTX_AUDIT_PART);
  rels.documentElement.append(rel);
  const types = new DOMParser().parseFromString(strFromU8(files['[Content_Types].xml']), 'application/xml');
  const type = types.createElementNS(types.documentElement.namespaceURI, 'Override');
  type.setAttribute('PartName', '/' + SP_PPTX_AUDIT_PART);
  type.setAttribute('ContentType', 'application/xml');
  types.documentElement.append(type);
  const xml = new XMLSerializer();
  files[relPath] = strToU8(xml.serializeToString(rels));
  files['[Content_Types].xml'] = strToU8(xml.serializeToString(types));
  files[SP_PPTX_AUDIT_PART] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><audit xmlns="${SP_PPTX_AUDIT_NS}">${escapeXml(JSON.stringify(audit))}</audit>`);
  const output: Zippable = {};
  for (const [path, data] of Object.entries(files)) output[path] = [data, { level: /\.(png|jpe?g)$/i.test(path) ? 0 : 6 }];
  return zipSync(output);
}
