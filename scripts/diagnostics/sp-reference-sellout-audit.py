"""Reconcile SP sellout from supplied PPTX artifacts, entirely offline."""
import argparse
import hashlib
import io
import json
import math
import posixpath
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'c': 'http://schemas.openxmlformats.org/drawingml/2006/chart',
      's': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--manual', required=True, type=Path)
p.add_argument('--generated', required=True, type=Path)
p.add_argument('--out', required=True, type=Path)
args = p.parse_args()

def series(archive, path):
    root = ET.fromstring(archive.read(path))
    result = []
    for item in root.findall('.//c:ser', NS):
        cats = {int(pt.get('idx')): pt.findtext('c:v', '', NS)
                for pt in item.findall('c:cat//c:pt', NS)}
        vals = {int(pt.get('idx')): float(pt.findtext('c:v', '', NS))
                for pt in item.findall('c:val//c:pt', NS)}
        result.append({cats[i]: val for i, val in vals.items()})
    return result

def slide_charts(archive, number):
    rels = ET.fromstring(archive.read(f'ppt/slides/_rels/slide{number}.xml.rels'))
    return [posixpath.normpath(posixpath.join('ppt/slides', rel.get('Target')))
            for rel in rels if rel.get('Type', '').endswith('/chart')]

def workbook_cells(archive, number):
    with ZipFile(io.BytesIO(archive.read(f'ppt/embeddings/Planilha_do_Microsoft_Excel{number}.xlsx'))) as book:
        strings = [''.join(n.itertext()) for n in ET.fromstring(book.read('xl/sharedStrings.xml'))]
        cells = {}
        for cell in ET.fromstring(book.read('xl/worksheets/sheet1.xml')).findall('.//s:c', NS):
            value = cell.findtext('s:v', '', NS)
            cells[cell.get('r')] = strings[int(value)] if cell.get('t') == 's' else value
        return cells

with ZipFile(args.manual) as z:
    table = ET.fromstring(z.read('ppt/slides/slide69.xml')).find('.//a:tbl', NS)
    rows = [[''.join(t.text or '' for t in cell.findall('.//a:t', NS)).strip()
             for cell in row.findall('a:tc', NS)] for row in table.findall('a:tr', NS)]
    stock = {r[0]: int(r[2].replace('.', '')) for r in rows[1:] if r[0] != 'Total'}
    total = sum(stock.values())
    assert total == int(rows[-1][2].replace('.', ''))
    sellout_chart = next(path for path in slide_charts(z, 46) if len(series(z, path)[0]) == 8)
    manual = series(z, sellout_chart)[0]
    manual_total_key = next(key for key in manual if key.startswith('M'))
    # The chart lists market first; use category position, not spelling/accents.
    assert list(manual)[0] == manual_total_key and len(manual) == 8
    rel_path = posixpath.join(posixpath.dirname(sellout_chart), '_rels', posixpath.basename(sellout_chart) + '.rels')
    rel = next(r for r in ET.fromstring(z.read(rel_path)) if r.get('Type', '').endswith('/package'))
    workbook_path = posixpath.normpath(posixpath.join(posixpath.dirname(sellout_chart), rel.get('Target')))
    with ZipFile(io.BytesIO(z.read(workbook_path))) as book:
        sheet = ET.fromstring(book.read('xl/worksheets/sheet1.xml'))
        formula_count = len(sheet.findall('.//s:f', NS))
        workbook_vals = [float(cell.findtext('s:v', '', NS)) for cell in sheet.findall('.//s:c', NS)
                         if cell.get('r', '').startswith('B') and cell.get('r') != 'B1']
        assert workbook_vals == list(manual.values()), 'Workbook/cache mismatch'
        assert formula_count == 0, 'Source now contains formulas: inspect before inferring'
    quarterly = {slide: list(series(z, slide_charts(z, slide)[0])[0].values()) for slide in [32, 34]}
    rolling = {slide: list(series(z, slide_charts(z, slide)[0])[0].values())[-1] for slide in [33, 35]}
    assert sum(quarterly[32][-4:]) == rolling[33]
    assert sum(quarterly[34][-4:]) == rolling[35]
    support = {n: workbook_cells(z, n) for n in [22, 24, 34]}
    old_stock_total = sum(int(support[34][f'M{r}']) for r in [11, 12, 13, 14, 15, 16, 17])
    old_quarter_sales = int(support[24]['C21'])
    old_rolling_sales = sum(quarterly[32][-4:-1]) + old_quarter_sales
    old_market_months = old_stock_total / (old_rolling_sales / 12)
    assert abs(old_market_months - manual[manual_total_key]) < 1e-6
    support_reproductions = []
    for label, row, half_year_row in [('Compacto', 11, 10), ('Standard', 13, 13)]:
        old_stock = int(support[34][f'M{row}'])
        old_annual = sum(int(support[24][f'{c}{row}']) for c in ['J', 'K']) + int(support[22][f'H{half_year_row}'])
        reproduced = old_stock / (old_annual / 12)
        assert abs(reproduced - manual[label]) < 1e-6
        support_reproductions.append({'pattern': label, 'supportStock': old_stock, 'supportRolling12Sales': old_annual, 'months': reproduced})

with ZipFile(args.generated) as z:
    audit = next(json.loads(root.text) for name in z.namelist()
                 if name.startswith('customXml/') and name.endswith('.xml')
                 and (root := ET.fromstring(z.read(name))).tag == '{urn:brain:sp-institutional:audit:v1}audit')
numeric = audit['numericAudit']
assert numeric['quarter'] == '2T2026' and numeric['throughMonth'] == '2026-06'
municipal = numeric['municipal']
generated = {r['group']: r for r in municipal['patterns']['rows']}
months = len(municipal['monthly'])
assert months == 3
out_rows = []
for label, manual_months in manual.items():
    is_total = label == manual_total_key
    # Original table spells Medio Alto with a space; source chart/API use hyphen.
    key = next((k for k in stock if k.replace(' ', '-') == label.replace(' ', '-')), None)
    manual_stock = total if is_total else stock[key]
    g = municipal['metrics'] if is_total else generated[label]
    system_months = g['stock'] / (g['sales'] / months)
    out_rows.append({'pattern': label, 'manualStock': manual_stock,
                     'generatedStock': g['stock'], 'generatedQuarterSales': g['sales'],
                     'generatedMonthlySales': g['sales'] / months,
                     'generatedMonthsExact': system_months, 'generatedDisplayedCeil': math.ceil(system_months),
                     'manualMonthsExact': manual_months, 'manualDisplayedNearest': math.floor(manual_months + .5),
                     'manualImpliedMonthlySales': manual_stock / manual_months,
                     'manualImplied12MonthSales': manual_stock / manual_months * 12})
economic = next(r for r in out_rows if r['pattern'].startswith('Econ'))
economic_12 = economic['manualStock'] / (rolling[35] / 12)
assert abs(economic_12 - economic['manualMonthsExact']) < 1e-6
high = next(r for r in out_rows if r['pattern'] == 'Alto')
high_prior_quarters = [int(support[24][f'{c}16']) for c in ['J', 'K', 'L']]
high_annual = sum(high_prior_quarters) + high['generatedQuarterSales']
assert abs(high['manualStock'] / (high_annual / 12) - high['manualMonthsExact']) < 1e-6
result = {'scope': 'SP capital; 2T2026; supplied artifacts, not a new API extraction',
          'manualSha256': hashlib.sha256(args.manual.read_bytes()).hexdigest(),
          'generatedSha256': hashlib.sha256(args.generated.read_bytes()).hexdigest(),
          'generatedAt': audit['generatedAt'], 'rows': out_rows,
          'originalWorkbook': {'path': workbook_path, 'formulaCount': formula_count, 'cacheMatchesWorkbook': True},
          'originalSales': {'marketLast4Quarters': quarterly[32][-4:], 'marketRolling12': rolling[33],
                            'mcmvLast4Quarters': quarterly[34][-4:], 'mcmvRolling12': rolling[35]},
          'economicRolling12ReproducedMonths': economic_12,
          'marketRolling12RecomputedMonths': total / (rolling[33] / 12),
          'supportWorkbookReproductions': support_reproductions,
          'supportMarketReproduction': {'stock': old_stock_total, 'rolling12Sales': old_rolling_sales,
                                        'currentQuarterSales': old_quarter_sales, 'months': old_market_months},
          'highMixedSourceReproduction': {'manualPrior3QuarterSales': high_prior_quarters,
                                          'generatedCurrentQuarterSales': high['generatedQuarterSales'],
                                          'rolling12Sales': high_annual,
                                          'warning': 'Current 158 is observed in generated audit, not the stale manual support cell, which contains 190.'},
          'limits': ['The source workbook contains pasted values, not formulas.',
                     'Economic reproduces rolling12 exactly within cache precision; this alone does not prove every row formula.',
                     'Other implied denominators are algebraic reconstructions, not observed sales.',
                     'Displayed market stock/sales do not reproduce exactly; embedded support stock/sales do reproduce it.',
                     'Manual support sheets contain legacy pattern names and multiple numeric versions; individual classification provenance remains incomplete.'],
          'analystApproval': False}
args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'rows': out_rows, 'marketRolling12RecomputedMonths': result['marketRolling12RecomputedMonths'],
                  'economicRolling12ReproducedMonths': economic_12}, ensure_ascii=True))
