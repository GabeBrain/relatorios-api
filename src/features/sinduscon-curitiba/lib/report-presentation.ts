import * as XLSX from 'xlsx';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { ooxml, worksheetPaths } from './ooxml-patcher';

const CHART_NS = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

/** Excel widths are measured in default-font digits; allow padding for bold totals and rounding. */
export function numericColumnWidth(text: string, fontSize: number, bold = false, indent = 0) {
  const em = fontSize * 4 / 3;
  const pixels = [...text].reduce((sum, char) => sum + (/\d/.test(char) ? 0.56 : /[.,\s]/.test(char) ? 0.28 : 0.65) * em, 0);
  return Math.ceil(((pixels * (bold ? 1.07 : 1) + 14) / 7 + indent * 3) * 100) / 100;
}

function fitNumericColumns(files: Record<string, Uint8Array>, workbook: XLSX.WorkBook, paths: Map<string, string>) {
  const styles = ooxml.parseXml(strFromU8(files['xl/styles.xml']), 'os estilos');
  const fonts = Array.from(ooxml.elements(styles, 'fonts')[0].children);
  const formats = Array.from(ooxml.elements(styles, 'cellXfs')[0].children);
  const customFormats = new Map(ooxml.elements(styles, 'numFmt').map((node) => [Number(node.getAttribute('numFmtId')), node.getAttribute('formatCode') ?? 'General']));
  for (const [sheetIndex, name] of workbook.SheetNames.entries()) {
    if (!/^Folha/i.test(name)) continue;
    const path = paths.get(name)!;
    const document = ooxml.parseXml(strFromU8(files[path]), name);
    const sheet = workbook.Sheets[name];
    const printArea = workbook.Workbook?.Names?.find((item) => item.Name === '_xlnm.Print_Area' && item.Sheet === sheetIndex)?.Ref;
    const printRanges = printArea ? [...printArea.matchAll(/!\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)/g)].map((match) => XLSX.utils.decode_range(`${match[1]}${match[2]}:${match[3]}${match[4]}`)) : [];
    const merged = sheet['!merges'] ?? [];
    const columns = ooxml.elements(document, 'col');
    const widths = new Map<number, number>();
    for (const cell of ooxml.elements(document, 'c')) {
      const reference = cell.getAttribute('r')!;
      const address = XLSX.utils.decode_cell(reference);
      const value = sheet[reference]?.v;
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (printRanges.length && !printRanges.some((range) => address.r >= range.s.r && address.r <= range.e.r && address.c >= range.s.c && address.c <= range.e.c)) continue;
      if (merged.some((range) => address.r >= range.s.r && address.r <= range.e.r && address.c >= range.s.c && address.c <= range.e.c)) continue;
      const column = columns.find((node) => Number(node.getAttribute('min')) <= address.c + 1 && Number(node.getAttribute('max')) >= address.c + 1);
      if (column?.getAttribute('hidden') === '1') continue;
      const style = formats[Number(cell.getAttribute('s') ?? column?.getAttribute('style') ?? 0)];
      const formatId = Number(style?.getAttribute('numFmtId') ?? 0);
      const format = customFormats.get(formatId) ?? XLSX.SSF.get_table()[formatId] ?? 'General';
      if (XLSX.SSF.is_date(format) || format.includes('%')) continue;
      const font = fonts[Number(style?.getAttribute('fontId') ?? 0)];
      const size = Number(font && ooxml.elements(font, 'sz')[0]?.getAttribute('val')) || 11;
      const bold = !!font && ooxml.elements(font, 'b').some((node) => node.getAttribute('val') !== '0');
      const indent = Number(style && ooxml.elements(style, 'alignment')[0]?.getAttribute('indent')) || 0;
      const text = XLSX.SSF.format(format, value);
      widths.set(address.c + 1, Math.max(widths.get(address.c + 1) ?? 0, numericColumnWidth(text, size, bold, indent)));
    }
    let cols = ooxml.elements(document, 'cols')[0];
    if (!cols) {
      cols = document.createElementNS(SHEET_NS, 'cols');
      document.documentElement.insertBefore(cols, ooxml.elements(document, 'sheetData')[0]);
    }
    // Split ranges only when a particular numeric column needs to grow; preserve every other attribute.
    for (const [index, width] of [...widths].sort(([a], [b]) => a - b)) {
      const column = ooxml.elements(cols, 'col').find((node) => Number(node.getAttribute('min')) <= index && Number(node.getAttribute('max')) >= index);
      if (width <= Number(column?.getAttribute('width') ?? 8.43)) continue;
      const replacement = column?.cloneNode(true) as Element | undefined ?? document.createElementNS(SHEET_NS, 'col');
      if (column) {
        const min = Number(column.getAttribute('min')); const max = Number(column.getAttribute('max'));
        if (min < index) { const left = column.cloneNode(true) as Element; left.setAttribute('max', String(index - 1)); cols.insertBefore(left, column); }
        cols.insertBefore(replacement, column);
        if (max > index) { const right = column.cloneNode(true) as Element; right.setAttribute('min', String(index + 1)); cols.insertBefore(right, column); }
        column.remove();
      } else {
        const next = ooxml.elements(cols, 'col').find((node) => Number(node.getAttribute('min')) > index);
        cols.insertBefore(replacement, next ?? null);
      }
      replacement.setAttribute('min', String(index)); replacement.setAttribute('max', String(index));
      replacement.setAttribute('width', String(width)); replacement.setAttribute('customWidth', '1');
      replacement.removeAttribute('bestFit');
    }
    // Wider numeric columns must not spill into a second printed page. The report
    // contract is eight sheets, one page each; keep the template's print areas.
    let sheetProperties = ooxml.elements(document, 'sheetPr')[0];
    if (!sheetProperties) {
      sheetProperties = document.createElementNS(SHEET_NS, 'sheetPr');
      document.documentElement.insertBefore(sheetProperties, document.documentElement.firstChild);
    }
    let setupProperties = ooxml.elements(sheetProperties, 'pageSetUpPr')[0];
    if (!setupProperties) {
      setupProperties = document.createElementNS(SHEET_NS, 'pageSetUpPr');
      sheetProperties.appendChild(setupProperties);
    }
    setupProperties.setAttribute('fitToPage', '1');
    setupProperties.setAttribute('autoPageBreaks', '0');
    let pageSetup = ooxml.elements(document, 'pageSetup')[0];
    if (!pageSetup) {
      pageSetup = document.createElementNS(SHEET_NS, 'pageSetup');
      const following = new Set(['headerFooter', 'rowBreaks', 'colBreaks', 'customProperties', 'cellWatches', 'ignoredErrors', 'smartTags', 'drawing', 'legacyDrawing', 'legacyDrawingHF', 'picture', 'oleObjects', 'controls', 'webPublishItems', 'tableParts', 'extLst']);
      const next = Array.from(document.documentElement.children).find((node) => following.has(node.localName));
      document.documentElement.insertBefore(pageSetup, next ?? null);
    }
    pageSetup.removeAttribute('scale');
    pageSetup.setAttribute('fitToWidth', '1');
    pageSetup.setAttribute('fitToHeight', '1');
    for (const tag of ['rowBreaks', 'colBreaks']) for (const breaks of ooxml.elements(document, tag)) breaks.remove();
    files[path] = strToU8(new XMLSerializer().serializeToString(document));
  }
}

function readReferences(formula: string, workbook: XLSX.WorkBook) {
  const values: unknown[] = [];
  for (const match of formula.matchAll(/'((?:[^']|'')+)'!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?/g)) {
    const sheet = workbook.Sheets[match[1].replace(/''/g, "'")];
    if (!sheet) return null;
    const range = XLSX.utils.decode_range(`${match[2]}${match[3]}:${match[4] ?? match[2]}${match[5] ?? match[3]}`);
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) values.push(sheet[XLSX.utils.encode_cell({ r: row, c: col })]?.v ?? '');
    }
  }
  return values.length ? values : null;
}

function refreshChartCaches(document: XMLDocument, workbook: XLSX.WorkBook) {
  for (const reference of [...ooxml.elements(document, 'numRef'), ...ooxml.elements(document, 'strRef')]) {
    const formula = ooxml.elements(reference, 'f')[0]?.textContent;
    const values = formula ? readReferences(formula, workbook) : null;
    if (!values) continue;
    const numeric = reference.localName === 'numRef';
    let cache = ooxml.elements(reference, numeric ? 'numCache' : 'strCache')[0];
    if (!cache) {
      cache = document.createElementNS(CHART_NS, numeric ? 'c:numCache' : 'c:strCache');
      reference.appendChild(cache);
    }
    for (const point of [...ooxml.elements(cache, 'pt'), ...ooxml.elements(cache, 'ptCount')]) point.remove();
    const count = document.createElementNS(CHART_NS, 'c:ptCount');
    count.setAttribute('val', String(values.length));
    cache.appendChild(count);
    values.forEach((value, index) => {
      if (value === '' || (numeric && typeof value !== 'number')) return;
      const point = document.createElementNS(CHART_NS, 'c:pt');
      point.setAttribute('idx', String(index));
      const node = document.createElementNS(CHART_NS, 'c:v');
      node.textContent = String(value);
      point.appendChild(node);
      cache.appendChild(point);
    });
  }
}

function historyRange(sheetName: string, rows: number[], column: string) {
  const groups: Array<[number, number]> = [];
  for (const row of rows) {
    const previous = groups.at(-1);
    if (previous && previous[1] + 1 === row) previous[1] = row;
    else groups.push([row, row]);
  }
  const quotedName = sheetName.replace(/'/g, "''");
  const ranges = groups.map(([first, last]) => `'${quotedName}'!$${column}$${first}:$${column}$${last}`);
  return ranges.length === 1 ? ranges[0] : `(${ranges.join(',')})`;
}

const PT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function historyCategories(document: XMLDocument, history: XLSX.WorkSheet, rows: number[]) {
  // Literal Portuguese labels do not depend on the Excel/OS locale.
  for (const category of ooxml.elements(document, 'cat')) {
    while (category.firstChild) category.removeChild(category.firstChild);
    const literal = document.createElementNS(CHART_NS, 'c:strLit');
    const count = document.createElementNS(CHART_NS, 'c:ptCount');
    count.setAttribute('val', String(rows.length)); literal.appendChild(count);
    rows.forEach((row, index) => {
      const date = XLSX.SSF.parse_date_code(history[`B${row}`].v);
      const point = document.createElementNS(CHART_NS, 'c:pt'); point.setAttribute('idx', String(index));
      const value = document.createElementNS(CHART_NS, 'c:v');
      value.textContent = `${PT_MONTHS[date.m - 1]}/${String(date.y).slice(-2)}`;
      point.appendChild(value); literal.appendChild(point);
    });
    category.appendChild(literal);
  }
  for (const axis of ooxml.elements(document, 'dateAx')) {
    const replacement = document.createElementNS(CHART_NS, 'c:catAx');
    const removed = new Set(['numFmt', 'baseTimeUnit', 'majorUnit', 'majorTimeUnit', 'minorUnit', 'minorTimeUnit']);
    for (const child of Array.from(axis.childNodes)) {
      if (child.nodeType !== 1 || !removed.has((child as Element).localName)) replacement.appendChild(child.cloneNode(true));
    }
    for (const tag of ['min', 'max']) for (const bound of ooxml.elements(replacement, tag)) bound.remove();
    for (const tag of ['tickLblSkip', 'tickMarkSkip']) {
      const node = document.createElementNS(CHART_NS, `c:${tag}`); node.setAttribute('val', '1');
      replacement.insertBefore(node, ooxml.elements(replacement, 'extLst')[0] ?? null);
    }
    axis.replaceWith(replacement);
  }
}

/** Intentional, scoped layout changes after the cell patcher's preservation checks. */
export function updateReportPresentation(bytes: Uint8Array, year: number, month: number) {
  const files = unzipSync(bytes);
  const workbook = XLSX.read(bytes, { type: 'array', cellFormula: true });
  const paths = worksheetPaths(files);
  const historyName = workbook.SheetNames.find((name) => /10.*serie hist/i.test(name));
  const history = historyName ? workbook.Sheets[historyName] : undefined;
  const rows = history ? Object.keys(history).flatMap((reference) => {
    if (!/^B\d+$/.test(reference) || typeof history[reference]?.v !== 'number') return [];
    const date = XLSX.SSF.parse_date_code(history[reference].v);
    const ordinal = date ? date.y * 12 + date.m : 0;
    const end = year * 12 + month;
    return date && ordinal >= end - 12 && ordinal <= end
      ? [XLSX.utils.decode_cell(reference).r + 1] : [];
  }).sort((a, b) => a - b) : [];

  for (const [path, content] of Object.entries(files)) {
    if (!/^xl\/charts\/chart\d+\.xml$/.test(path)) continue;
    const document = ooxml.parseXml(strFromU8(content), path);
    const formulas = ooxml.elements(document, 'f');
    const isHistory = formulas.some((node) => /Folha 10 serie hist/.test(node.textContent ?? ''));
    const isSectorArea = formulas.some((node) => /area por bairro/.test(node.textContent ?? ''));
    if (!isHistory && !isSectorArea) continue;
    // Fixed value limits from the original month can clip later sector totals.
    for (const axis of ooxml.elements(document, 'valAx')) {
      for (const tag of ['max', 'majorUnit']) for (const node of ooxml.elements(axis, tag)) node.remove();
    }
    if (isHistory && historyName && rows.length) {
      // Only change series values; the title may also reference column G.
      for (const values of ooxml.elements(document, 'val')) {
        for (const formula of ooxml.elements(values, 'f')) formula.textContent = historyRange(historyName, rows, 'G');
      }
      historyCategories(document, history!, rows);
    }
    refreshChartCaches(document, workbook);
    files[path] = strToU8(new XMLSerializer().serializeToString(document));
  }

  fitNumericColumns(files, workbook, paths);
  return zipSync(files, { level: 6 });
}
