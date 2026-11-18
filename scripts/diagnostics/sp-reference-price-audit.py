"""Offline reconciliation of the supplied manual and generated SP PPTX artifacts."""
import argparse
import hashlib
import json
import posixpath
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile

NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'c': 'http://schemas.openxmlformats.org/drawingml/2006/chart'}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--manual', required=True, type=Path)
parser.add_argument('--generated', required=True, type=Path)
parser.add_argument('--out', required=True, type=Path)
args = parser.parse_args()
with ZipFile(args.manual) as archive:
    table = ET.fromstring(archive.read('ppt/slides/slide69.xml')).find('.//a:tbl', NS)
    rows = [[''.join(t.text or '' for t in cell.findall('.//a:t', NS)).strip()
             for cell in row.findall('a:tc', NS)] for row in table.findall('a:tr', NS)]
    stock = {r[0]: int(r[2].replace('.', '')) for r in rows[1:] if r[0] != 'Total'}
    assert sum(stock.values()) == int(rows[-1][2].replace('.', '')), 'Manual stock does not reconcile'
    relationship = next(r for r in ET.fromstring(archive.read('ppt/slides/_rels/slide62.xml.rels')) if r.get('Type', '').endswith('/chart'))
    chart = ET.fromstring(archive.read(posixpath.normpath(posixpath.join('ppt/slides', relationship.get('Target')))))
    series = chart.findall('.//c:ser', NS)
    categories = {int(p.get('idx')): p.findtext('c:v', '', NS).strip() for p in series[0].findall('c:cat//c:pt', NS)}
    values = {int(p.get('idx')): float(p.findtext('c:v', '', NS)) for p in series[0].findall('c:val//c:pt', NS)}
    overall = {float(p.findtext('c:v', '', NS)) for p in series[1].findall('c:val//c:pt', NS)}
    assert len(overall) == 1 and categories.keys() == values.keys(), 'Unexpected manual chart'
    assert set(categories.values()) == stock.keys(), 'Manual pattern scopes differ'
with ZipFile(args.generated) as archive:
    audit = next(json.loads(root.text) for name in archive.namelist()
                 if name.startswith('customXml/') and name.endswith('.xml')
                 and (root := ET.fromstring(archive.read(name))).tag == '{urn:brain:sp-institutional:audit:v1}audit')
numeric = audit['numericAudit']
assert numeric['quarter'] == '2T2026', 'Generated scope differs'
prices = numeric['details']['prices']
manual_weighted = sum(stock[label] * values[index] for index, label in categories.items()) / sum(stock.values())
generated_weighted = sum(row['units'] * row['meter'] for row in prices['standards']) / sum(row['units'] for row in prices['standards'])
result = {
    'scope': 'SP 2T2026; supplied artifacts, not a new API observation',
    'manualSourceSha256': hashlib.sha256(args.manual.read_bytes()).hexdigest(),
    'generatedSourceSha256': hashlib.sha256(args.generated.read_bytes()).hexdigest(),
    'generatedAt': audit['generatedAt'],
    'manualStock': sum(stock.values()), 'generatedStock': numeric['municipal']['metrics']['stock'],
    'manualOverallMeter': next(iter(overall)), 'generatedOverallMeter': prices['overall']['meter'],
    'manualPatternMeterWeightedByStock': manual_weighted,
    'generatedPatternMeterWeightedByStock': generated_weighted,
    'manualPatterns': [{'pattern': label, 'stock': stock[label], 'meter': values[index]} for index, label in categories.items()],
    'generatedPatterns': prices['standards'],
    'conclusion': 'The manual overall does not reproduce the unit-stock-weighted mean of its displayed pattern prices. Confirm methodology and data snapshot; do not impose a target or change the runtime formula from this comparison alone.',
    'analystApproval': False,
}
args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: result[key] for key in ['manualOverallMeter', 'manualPatternMeterWeightedByStock', 'generatedOverallMeter', 'generatedPatternMeterWeightedByStock']}))
