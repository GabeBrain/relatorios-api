"""Extract native artwork and dynamic-shape slots; never version source market values."""
from pathlib import Path
import json
import re
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / '.local-inputs/relatorios-lucas/fortaleza'
NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main', 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main', 'c': 'http://schemas.openxmlformats.org/drawingml/2006/chart'}
manifest = {}
for model in ['junho', 'julho']:
    source = LOCAL / f'fortaleza-{model}-2026.pptx'
    manifest[model] = []
    with zipfile.ZipFile(source) as original:
        for number in range(1, 11):
            part = f'ppt/slides/slide{number}.xml'
            root = ET.fromstring(original.read(part))
            slots = []
            tree = root.find('p:cSld/p:spTree', NS)
            comparisons = 0
            for shape in list(tree):
                text = ''.join(t.text or '' for t in shape.findall('.//a:t', NS))
                slot = None
                if number == 1 and re.search(r'2026', text): slot = 'period'
                if number == 2:
                    if text.startswith('Mercado Imobiliário'): slot = 'heading'
                    elif text.startswith('Amostra:'): slot = 'sample'
                    elif text.startswith('Fortaleza:'): slot = 'breakdown'
                    elif 'empresas' in text: slot = 'companies'
                if 3 <= number <= 7:
                    if 'LANÇAMENTOS' in text: slot = 'heading'
                    if shape.find('.//a:tbl', NS) is not None: slot = 'table'
                if number == 9 and 'Fortaleza,' in text: slot = 'scope'
                if number == 10:
                    if text.startswith('EMPREENDIMENTOS'): slot = 'heading'
                    elif '%' in text:
                        slot = ['change-total', 'change-capital', 'change-rm'][comparisons]
                        comparisons += 1
                    if shape.find('.//c:chart', NS) is not None: slot = 'chart'
                if not slot: continue
                ident = shape.find('.//p:cNvPr', NS).get('id')
                slots.append({'id': int(ident), 'slot': slot})
            manifest[model].append({'number': number, 'slots': slots})
(LOCAL / 'intro-slots.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print('Dynamic-shape slots indexed. Run fortaleza-intro-office.ps1 to render native artwork.')
