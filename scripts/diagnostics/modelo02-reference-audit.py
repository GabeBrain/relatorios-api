"""Extract reproducible regional editorial manifests from the five original PPTX.

PowerPoint renders belong in --renders/<region>/SlideN.JPG (read-only originals).
Run after rendering; thumbnails and small structural metadata are versioned.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from pptx import Presentation
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--sources', type=Path, required=True)
parser.add_argument('--renders', type=Path, required=True)
args = parser.parse_args()
feature = Path('src/features/relatorios-institucionais/modelo-02')
docs = Path('docs/features/relatorios-institucionais/modelo-02')
(docs / 'miniaturas').mkdir(exist_ok=True)
(feature / 'assets/editorial').mkdir(exist_ok=True)
common = ['section-releases','releases-units-quarters','releases-units-standards','releases-money-quarters','releases-money-standards','releases-states','section-sales','sales-units-quarters','sales-units-standards','sales-money-quarters','sales-money-standards','sales-states','section-comparison','comparison','section-analysis','stock-Padrão','stock-Padrão-states','stock-Tipologia','stock-Tipologia-states','meter-states','annual-state-comparison']
opening = ['cover','about-brain','brain-studies','brain-group','geobrain-studies','geobrain-platform','geobrain-app','excluded-yearbook','excluded-documentary','regional-opening']
titles = {'about-brain':'Sobre a Brain','brain-studies':'Nossa atuação','brain-group':'Grupo Brain','geobrain-studies':'Estudos Geobrain','geobrain-platform':'Plataforma Geobrain','geobrain-app':'Aplicativo Geobrain','excluded-yearbook':'Anuário de Cases de Sucesso','excluded-documentary':'Documentário Terreno de Mudanças','scope':'Cidades analisadas','methodology':'Objetivos e metodologia','section-highlights':'Destaques','summary':'Resumo geral','summary-prices':'Resumo geral · preços e segmentos','team':'Equipe técnica','consulting':'Consultoria','institutional-app':'Aplicativo Brain','closing':'Contracapa'}
result = {}
for path in args.sources.glob('BRAIN-*.pptx'):
    region = 'sul' if 'Panorama-Sul' in path.name else 'sudeste' if 'Sudeste' in path.name else 'nordeste' if 'Nordeste' in path.name else 'centro-oeste' if 'Centro_Oeste' in path.name else 'norte'
    presentation = Presentation(path)
    keys = opening + ['scope'] + (['scope'] if region in ['nordeste','sudeste'] else []) + ['methodology','section-highlights','summary'] + ([] if region == 'sudeste' else ['summary-prices']) + ['highlights-Residencial vertical','highlights-MCMV','highlights-Luxo'] + common
    if region == 'nordeste':
        keys.insert(keys.index('annual-state-comparison'), 'meter-capitals')
    keys += ([] if region == 'norte' else ['ranking-Luxo']) + ['ranking-MCMV','ranking-meter'] + (['ranking-variation'] if region in ['norte','centro-oeste'] else []) + ['section-maps']
    rows = []
    for number, slide in enumerate(presentation.slides, 1):
        texts = [s.text.strip() for s in slide.shapes if s.has_text_frame and s.text.strip()]
        if number <= len(keys):
            key = keys[number-1]
        elif number > len(presentation.slides)-4:
            key = ['team','consulting','institutional-app','closing'][number-(len(presentation.slides)-3)]
        else:
            text = ' '.join(texts).upper()
            capital = next((c for c in ['CURITIBA','FLORIANÓPOLIS','PORTO ALEGRE','VITÓRIA','BELO HORIZONTE','RIO DE JANEIRO','SÃO PAULO','SÃO LUÍS','TERESINA','FORTALEZA','NATAL','JOÃO PESSOA','RECIFE','MACEIÓ','ARACAJU','SALVADOR','RIO BRANCO','MANAUS','MACAPÁ','BELÉM','PORTO VELHO','BOA VISTA','PALMAS','BRASÍLIA','GOIÂNIA','CUIABÁ','CAMPO GRANDE'] if c in text), None)
            if not capital: raise ValueError((region,number,text))
            key = 'map:'+capital
        charts = [s.chart for s in slide.shapes if s.has_chart]
        style = []
        for shape in slide.shapes:
            if shape.has_chart:
                style.append({'type':str(shape.chart.chart_type),'box':[round(float(v)/float(presentation.slide_width if i%2==0 else presentation.slide_height)* (1280 if i%2==0 else 720),2) for i,v in enumerate([shape.left,shape.top,shape.width,shape.height])], 'series':[{'name':s.name,'colors':re.findall(r'<a:srgbClr val="([A-Fa-f0-9]+)"',s._element.xml)} for s in shape.chart.series]})
        thumbnail = docs / 'miniaturas' / f'{region}-{number:02}.jpg'
        image = Image.open(args.renders / region / f'Slide{number}.JPG');image.thumbnail((320,180));image.save(thumbnail,quality=72)
        title = titles.get(key) or next((t.replace('\n',' ') for t in texts if len(t)>8 and not t.startswith('FONTE')), key)
        excluded = key.startswith('excluded-')
        dated = key in ['about-brain','brain-group','geobrain-platform','geobrain-app','team','consulting','institutional-app','closing']
        source = 'API Geobrain / histórico da competência / INCC-DI nos fluxos monetários' if key in common or key.startswith(('meter-','highlights','ranking','map:','summary')) else 'Catálogo autorizado; população/data-base/denominador pendentes' if key=='scope' else 'Arte original 4T2025, conteúdo aprovado pelo usuário para 3T2026 em 26/11/2026' if dated else 'Original institucional / metodologia do motor'
        action = 'Excluir por pedido explícito' if excluded else 'Preservar arte e posição; conteúdo institucional aprovado pelo usuário em 26/11/2026 para 3T2026' if dated else 'Recompor com dados da competência; continuações adjacentes'
        fonts=sorted({(run.font.name or 'herdada do tema',round(run.font.size.pt,1) if run.font.size else None) for sh in slide.shapes if sh.has_text_frame for paragraph in sh.text_frame.paragraphs for run in paragraph.runs},key=str)
        rows.append({'typography':[{'font':font,'pt':pt} for font,pt in fonts],'number':number,'key':key,'title':title,'thumbnail':f'miniaturas/{thumbnail.name}','role':'exclusão' if excluded else 'localização' if key.startswith('map:') else 'indicador' if key in common or key.startswith(('meter-','highlights','ranking','summary')) else 'institucional/abertura','source':source,'charts':style,'action':action})
        if key in ['about-brain','brain-studies','brain-group','geobrain-studies','geobrain-platform','geobrain-app','team','consulting','institutional-app','closing','regional-opening'] or key.startswith('section-'):
            # Preserve original art; runtime overlays the region/title on divider's left panel.
            dest=feature / 'assets/editorial' / f'{region}-{key}.jpg'
            Image.open(args.renders / region / f'Slide{number}.JPG').save(dest,quality=85)
    result[region]={'source':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'width':1280,'height':720,'slides':rows}
    md = f'# Matriz editorial — {region}\n\nOriginal 4T2025: `{path.name}`. {len(rows)} posições. Miniaturas renderizadas pelo PowerPoint; classificação das páginas raster conferida visualmente em 26/11/2026. Número original permanece no diagnóstico; navegação usa páginas físicas.\n\n|Ref.|Miniatura|Título / função|Fonte|Gráfico / quadro no sistema|Ação|\n|---:|---|---|---|---|---|\n'
    for r in rows:
        md += f"|{r['number']}|![{r['number']}]({r['thumbnail']})|{r['title'].replace('|',' / ')} · {r['role']}|{r['source']}|{', '.join(c['type'] for c in r['charts']) or 'texto/tabela/imagem'} · `{r['key']}`|{r['action']}|\n"
    (docs/f'MATRIZ_{region}.md').write_text(md,encoding='utf8')
(feature/'reference-manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print({r:len(v['slides']) for r,v in result.items()})
