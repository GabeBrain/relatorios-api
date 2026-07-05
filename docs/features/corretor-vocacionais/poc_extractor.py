#!/usr/bin/env python3
"""
POC — Extrator determinístico de Estudos Vocacionais (PPTX)

Prova de conceito da Fase 4 do Corretor. Demonstra que, ingerindo o PPTX
(em vez do PDF rasterizado), os dados numéricos das tabelas e gráficos são
ESTRUTURADOS e extraíveis SEM IA — habilitando checagens determinísticas.

Só usa a stdlib (zipfile + re): um .pptx é um zip com XML dentro.
- Tabelas nativas: <a:tbl> nos slides (ppt/slides/slideN.xml)
- Gráficos: cache numérico em ppt/charts/chartN.xml (<c:ser>/<c:cat>/<c:val>)

Uso:
    python poc_extractor.py "caminho/para/estudo.pptx"

NÃO versionar os PPTX de estudo (pesados); ver .gitignore.
Este script é ponto de partida — a versão de produção viverá em
src/features/corretor/ (TypeScript) reproduzindo esta lógica.
"""
import zipfile, re, sys, os

def _tags(xml, tag):
    return re.findall(r'<%s>(.*?)</%s>' % (tag, tag), xml, re.S)

def load_charts(z, names):
    """Retorna [(chart_name, [(serie_label, [categorias], [valores]) ...])]."""
    out = []
    charts = sorted([n for n in names if re.match(r'ppt/charts/chart\d+\.xml$', n)],
                    key=lambda n: int(re.search(r'(\d+)', n).group()))
    for c in charts:
        xml = z.read(c).decode('utf-8', 'ignore')
        series = []
        for s in re.findall(r'<c:ser>.*?</c:ser>', xml, re.S):
            cat_block = re.search(r'<c:cat>.*?</c:cat>', s, re.S)
            val_block = re.search(r'<c:val>.*?</c:val>', s, re.S)
            cats = _tags(cat_block.group(), 'c:v') if cat_block else []
            vals = []
            if val_block:
                for v in _tags(val_block.group(), 'c:v'):
                    try: vals.append(float(v))
                    except ValueError: pass
            series.append((cats, vals))
        out.append((c, series))
    return out

def load_tables(z, names):
    """Retorna [(slide_name, [ [celulas...] ...])] para tabelas nativas <a:tbl>."""
    out = []
    slides = sorted([n for n in names if re.match(r'ppt/slides/slide\d+\.xml$', n)],
                    key=lambda n: int(re.search(r'(\d+)', n).group()))
    for s in slides:
        xml = z.read(s).decode('utf-8', 'ignore')
        for tbl in re.findall(r'<a:tbl>.*?</a:tbl>', xml, re.S):
            rows = []
            for tr in re.findall(r'<a:tr[ >].*?</a:tr>', tbl, re.S):
                cells = [''.join(_tags(tc, 'a:t')).strip()
                         for tc in re.findall(r'<a:tc>.*?</a:tc>', tr, re.S)]
                rows.append(cells)
            if rows:
                out.append((s, rows))
    return out

def slide_titles(z, names):
    slides = sorted([n for n in names if re.match(r'ppt/slides/slide\d+\.xml$', n)],
                    key=lambda n: int(re.search(r'(\d+)', n).group()))
    titles = []
    for s in slides:
        xml = z.read(s).decode('utf-8', 'ignore')
        texts = [t for t in _tags(xml, 'a:t') if t.strip()]
        titles.append((s, texts[0][:70] if texts else '(sem texto)'))
    return titles

# ---------- Regras determinísticas (POC) ----------

def rule_percentage_sum(charts, tol_close=1.0):
    """Séries que parecem proporções (valores em [0,1] ou [0,100]) e não fecham 100%.
    Retorna candidatos — a camada seguinte decide se é bug real ou distribuição não-100%."""
    findings = []
    for name, series in charts:
        for cats, vals in series:
            if len(vals) < 2:
                continue
            scale = 100.0 if all(0 <= v <= 1.05 for v in vals) else 1.0
            pct = [v * scale for v in vals]
            if all(0 <= v <= 105 for v in pct):
                total = sum(pct)
                if 85 <= total <= 115 and abs(total - 100) > tol_close:
                    findings.append((name, round(total, 1), [round(v, 1) for v in pct]))
    return findings

def rule_source_missing(z, names):
    """Slides com dado (chart/tabela) sem legenda de fonte/elaboração.
    NOTA: heurístico cru — runs de texto podem fragmentar 'FONTE'. Refinar."""
    slides = sorted([n for n in names if re.match(r'ppt/slides/slide\d+\.xml$', n)],
                    key=lambda n: int(re.search(r'(\d+)', n).group()))
    flagged = []
    for s in slides:
        xml = z.read(s).decode('utf-8', 'ignore')
        if 'graphicFrame' not in xml:
            continue
        alltext = ' '.join(_tags(xml, 'a:t'))
        if len(alltext) > 40 and not re.search(r'font|elabora', alltext, re.I):
            flagged.append(s)
    return flagged

def main(path):
    z = zipfile.ZipFile(path)
    names = z.namelist()
    print("ESTUDO:", os.path.basename(path))
    print("=" * 72)
    charts = load_charts(z, names)
    tables = load_tables(z, names)
    titles = slide_titles(z, names)
    print(f"slides={len(titles)} | tabelas nativas={len(tables)} | gráficos={len(charts)}")

    pct = rule_percentage_sum(charts)
    print(f"\n[PERCENTAGE_SUM] candidatos que não fecham 100%: {len(pct)}")
    for name, total, vals in pct[:15]:
        print(f"  {name}: soma={total}%  valores={vals}")

    src = rule_source_missing(z, names)
    print(f"\n[SOURCE_MISSING] slides com dado sem 'fonte/elaboração': {len(src)} "
          f"(heurístico cru — validar)")
    z.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit("uso: python poc_extractor.py <estudo.pptx>")
    main(sys.argv[1])
