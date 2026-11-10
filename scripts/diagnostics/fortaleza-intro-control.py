"""Create ignored reference-only inputs for visual comparison; not runtime fixtures."""
import datetime
import copy
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

root = Path(__file__).resolve().parents[2]
local = root / '.local-inputs/relatorios-lucas/fortaleza'
layouts = json.loads((local / 'intro-layout-original.json').read_text(encoding='utf-8-sig'))
runtime = copy.deepcopy(layouts)
for pages in runtime.values():
    for page in pages:
        for shape in page['shapes']:
            for index, line in enumerate(shape.get('lines', [])):
                text = line.pop('text').strip(); slot = shape['slot']; binding = None
                if slot == 'period': binding = 'period'
                elif slot == 'heading':
                    binding = 'heading' if index == 0 else 'scope'
                    if index == 0: line['format'] = text.replace('2026', '{year}').replace('Junho', '{month}').replace('Julho', '{month}')
                elif slot == 'scope': binding = 'scope'
                elif slot == 'sample' and any(c.isdigit() for c in text): binding = 'projects'
                elif slot == 'companies' and any(c.isdigit() for c in text): binding = 'companies'
                elif slot == 'breakdown': binding = 'capital' if text.startswith('Fortaleza:') else 'rm' if text.startswith('Região') else 'rm-cities'
                elif slot.startswith('change-'): binding = slot if '%' in text else 'comparison' if any(c.isdigit() for c in text) else None
                line['binding' if binding else 'text'] = binding or text
            for cell in shape.get('cells', []):
                if cell['row'] > 0: cell.pop('text', None)
(root / 'src/features/relatorios-institucionais/fortaleza/intro-layout.json').write_text(json.dumps(runtime,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
out = {}
months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
ns = {'c': 'http://schemas.openxmlformats.org/drawingml/2006/chart'}
for model, pages in layouts.items():
    sample = {shape['slot']: shape for shape in pages[1]['shapes']}
    view = {'year': 2026, 'month': 6 if model == 'junho' else 7, 'monthly': model == 'julho', 'position': 2 if model == 'junho' else 7,
            'scope': 'Fortaleza e Região Metropolitana', 'cities': ['Fortaleza','Aquiraz','Caucaia','Eusébio','Maracanaú'],
            'sample': {}, 'capital': [], 'rm': [], 'changes': {}}
    view['sample']['projects'] = int(re.search(r'\d+', ''.join(line['text'] for line in sample['sample']['lines'])).group())
    view['sample']['companies'] = int(re.search(r'\d+', ''.join(line['text'] for line in sample['companies']['lines'])).group())
    view['sample']['capital'] = int(re.search(r'\d+', sample['breakdown']['lines'][0]['text']).group())
    view['sample']['rm'] = int(re.search(r'\d+', sample['breakdown']['lines'][1]['text']).group())
    for page in pages[2:7]:
        table = next(shape for shape in page['shapes'] if shape['slot'] == 'table')
        for row in range(1, table['rows']):
            cells = [c['text'].strip().replace('\r', '\n') for c in table['cells'] if c['row'] == row]
            if not cells[1]: continue
            month = next((i+1 for i,m in enumerate(months) if cells[2].lower().startswith(m)), 7)
            city = 'Fortaleza' if table['columns'] == 7 else cells[4]
            view['capital' if table['columns'] == 7 else 'rm'].append({'id':cells[0], 'name':cells[1], 'date':f'2026-{month:02}-01', 'developer':cells[3], 'city':city, 'neighborhood':cells[-3], 'type':cells[-2], 'standard':cells[-1], 'chartEligible':True})
    for shape in pages[9]['shapes']:
        if shape['slot'].startswith('change-'):
            view['changes'][shape['slot'].replace('change-','')] = int(re.search(r'[+-]?\s*\d+', shape['lines'][0]['text']).group().replace(' ',''))
    with zipfile.ZipFile(local / f'fortaleza-{model}-2026.pptx') as z:
        for index, key in [(1,'history'), (2,'accumulated')]:
            chart = ET.fromstring(z.read(f'ppt/charts/chart{index}.xml'))
            series = chart.findall('.//c:ser', ns)
            categories = [p.find('c:v',ns).text for p in series[0].findall('c:cat//c:pt',ns)]
            values = [{int(p.get('idx')): float(p.find('c:v',ns).text) for p in s.findall('c:val//c:pt',ns)} for s in series]
            bins = []
            for i, category in enumerate(categories):
                if category.isdigit():
                    date = datetime.date(1899,12,30) + datetime.timedelta(days=int(category))
                    category = f'{months[date.month-1]}/{date.year%100:02}'
                bins.append({'label':category, 'capital':values[0].get(i,0), 'rm':values[1].get(i,0), 'total':values[2].get(i,0)})
            view[key] = bins
    out[model] = view
(local / 'intro-control-views.json').write_text(json.dumps(out,ensure_ascii=False),encoding='utf-8')
(local / 'intro-preview.html').write_text('<html><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixtures/fortaleza-intro-preview.tsx"></script></body></html>',encoding='utf-8')
print('Reference controls created locally; no market values added to runtime.')
