"""Build original / SVG preview / native PowerPoint evidence pairs."""
import json
import re
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw

root = Path('.local-inputs/relatorios-lucas/modelo-02/visual-2026-11-26-correction')
reference = Path('.local-inputs/relatorios-lucas/modelo-02/reference-audit')
keys = ['brain-studies', 'scope', 'highlights-Residencial vertical', 'releases-units-quarters', 'releases-units-standards', 'releases-states', 'annual-state-comparison', 'meter-states', 'section-releases', 'summary']
summary = []
for region in ['sul', 'sudeste', 'nordeste', 'norte', 'centro-oeste']:
    audit = json.loads((root / f'modelo02-{region}.json').read_text(encoding='utf8'))
    with zipfile.ZipFile(root / f'modelo02-{region}.pptx') as package:
        charts = [n for n in package.namelist() if re.fullmatch(r'ppt/charts/chart\d+\.xml', n)]
        tables = sum(package.read(n).count(b'<a:tbl>') for n in package.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n))
    for key in keys + (['meter-capitals'] if region=='nordeste' else []) + ['map']:
        page = next(p for p in audit['pages'] if p['id'].startswith('map-')) if key == 'map' else next(p for p in audit['pages'] if p['id'] == key)
        paths = [reference / region / f'Slide{page["referenceNumber"]}.JPG', root / f'preview-{region}-{key}.png', root / f'pptx-{region}/Slide{page["page"]}.JPG']
        if not all(p.exists() for p in paths):
            continue
        sheet = Image.new('RGB', (1920, 390), '#ddd')
        draw = ImageDraw.Draw(sheet)
        for i, path in enumerate(paths):
            image = Image.open(path)
            image.thumbnail((640, 360))
            sheet.paste(image, (i*640, 30))
            draw.text((i*640+10, 8), ['Original 4T2025', 'Previa sintetica 3T2026', 'PowerPoint sintetico 3T2026'][i], fill='black')
        sheet.save(root / f'pair-{region}-{key}.jpg')
    summary.append({'region':region, 'original':audit['reference']['slides'], 'pages':audit['summary']['pages'], 'nativeCharts':len(charts), 'nativeTables':tables, 'excluded':[r['referenceNumber'] for r in audit['editorial'] if r['action']=='excluded-explicitly'], 'unmapped':[r for r in audit['editorial'] if r['action']=='pending']})
(root/'final-package-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(summary,ensure_ascii=False))
