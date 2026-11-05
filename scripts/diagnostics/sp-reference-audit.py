"""Read-only comparison of the supplied SP deck and a generated PPTX/checklist.

Numeric reconciliation is explicit for the 25 trend slides. Other slides retain
reference text/chart inventories and availability; they are never auto-approved.
No API access or dependencies outside Python's standard library.
"""
import argparse
import datetime as dt
import json
import posixpath
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'c': 'http://schemas.openxmlformats.org/drawingml/2006/chart'}

def text(root):
    return [node.text or '' for node in root.findall('.//a:t', NS)]

def normal(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.lower()) if not unicodedata.combining(c))

def period(value):
    match = re.fullmatch(r'([1-4])T(\d{2}|\d{4})', value.strip(), re.I)
    if match:
        return f'{match[1]}T{match[2] if len(match[2]) == 4 else "20" + match[2]}'
    if re.fullmatch(r'\d{5}(?:\.0)?', value):
        return (dt.datetime(1899, 12, 30) + dt.timedelta(days=float(value))).strftime('%Y-%m')
    return value.rstrip('*').strip()

def reference(path):
    result = {}
    with ZipFile(path) as archive:
        for number in range(1, 86):
            name = f'ppt/slides/slide{number}.xml'
            root = ET.fromstring(archive.read(name))
            charts = []
            for rel in ET.fromstring(archive.read(f'ppt/slides/_rels/slide{number}.xml.rels')):
                if not rel.attrib.get('Type', '').endswith('/chart'):
                    continue
                target = posixpath.normpath(posixpath.join('ppt/slides', rel.attrib['Target']))
                for series in ET.fromstring(archive.read(target)).findall('.//c:ser', NS):
                    title = series.find('c:tx', NS)
                    labels = series.find('c:cat', NS)
                    values = series.find('c:val', NS)
                    pts = lambda node: [] if node is None else [p.findtext('c:v', '', NS) for p in node.findall('.//c:pt', NS)]
                    charts.append({'name': next(iter(pts(title)), title.findtext('c:v', '', NS) if title is not None else ''),
                                   'points': [{'period': period(label), 'value': float(value)} for label, value in zip(pts(labels), pts(values))]})
            result[number] = {'text': text(root), 'series': charts}
    return result

def generated(path):
    if path.suffix.lower() == '.json':
        return json.loads(path.read_text(encoding='utf-8-sig'))
    with ZipFile(path) as archive:
        # Office renames custom XML parts on save; identify by namespace, not path.
        for name in archive.namelist():
            if name.startswith('customXml/') and name.endswith('.xml'):
                root = ET.fromstring(archive.read(name))
                if root.tag == '{urn:brain:sp-institutional:audit:v1}audit':
                    return json.loads(root.text or '')
        for name in archive.namelist():
            if re.fullmatch(r'ppt/notesSlides/notesSlide\d+\.xml', name):
                notes = '\n'.join(text(ET.fromstring(archive.read(name))))
                if 'SP_AUDIT_JSON\n' in notes:
                    return json.JSONDecoder().raw_decode(notes.split('SP_AUDIT_JSON\n', 1)[1].lstrip())[0]
    raise ValueError('PPTX sem auditoria SP; use o novo exportador ou o JSON numérico.')

def compare(original, actual):
    trends = {row['slide']: row for row in actual.get('numericAudit', {}).get('trendSlides', [])}
    statuses = {row['number']: row for row in actual.get('slides', [])}
    results = []
    for number, source in original.items():
        row = {'slide': number, 'availability': statuses.get(number), 'reference': source, 'comparisons': [], 'coverage': 'reference-inventory-only'}
        if number in trends:
            data = trends[number]
            row['coverage'] = 'period-and-series-comparison'
            for series in data['series']:
                matched = next((s for s in source['series'] if normal(s['name']) == normal(series['name'])), source['series'][0] if len(source['series']) == 1 else None)
                if matched is None:
                    row['comparisons'].append({'series': series['name'], 'state': 'reference-series-not-matched'})
                    continue
                expected = {p['period']: p['value'] for p in matched['points']}
                for point in series['points']:
                    key = period(point['period'])
                    before = expected.get(key)
                    if before is not None and data['unit'] == 'percentage':
                        before *= 100
                    after = point['value']
                    state = 'unavailable' if before is None or after is None else 'unit-review-required' if data['unit'] == 'BRL' else 'equal' if abs(after-before) < 1e-7 else 'different'
                    row['comparisons'].append({'series': series['name'], 'period': key, 'unit': data['unit'], 'reference': before, 'generated': after, 'delta': None if before is None or after is None else after-before, 'state': state})
        results.append(row)
    return {'schema': 'sp-reference-comparison-v1', 'quarter': actual.get('quarter'), 'referenceEdition': '2T2026',
            'sameEdition': actual.get('quarter') == '2T2026',
            'limitations': ['No source-cause inferred from a delta.', 'Monetary scale/base requires review.', 'Inventory-only slides are not numerically approved.', 'Original text and chart caches can disagree.'],
            'highlightAudit': actual.get('highlightAudit'), 'slides': results}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--generated', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = compare(reference(args.reference), generated(args.generated))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    counts = {}
    for slide in result['slides']:
        for point in slide['comparisons']:
            counts[point['state']] = counts.get(point['state'], 0) + 1
    print(json.dumps({'slides': len(result['slides']), 'comparableTrendSlides': sum(s['coverage'] != 'reference-inventory-only' for s in result['slides']), 'points': counts, 'sameEdition': result['sameEdition']}))

if __name__ == '__main__':
    main()
