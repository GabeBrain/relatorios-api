#!/usr/bin/env python3
"""
POC — Extrator determinístico de Estudos Vocacionais (PPTX)  [v2]

Prova de conceito da Fase 4 do Corretor. Demonstra que, ingerindo o PPTX
(em vez do PDF rasterizado), os dados de tabelas e gráficos são ESTRUTURADOS e
extraíveis SEM IA — habilitando checagens determinísticas.

Só usa a stdlib (zipfile + re): um .pptx é um zip com XML dentro.
- Tabelas nativas: <a:tbl> nos slides (ppt/slides/slideN.xml)
- Gráficos: cache numérico em ppt/charts/chartN.xml (<c:ser>/<c:cat>/<c:val>)
- Gráfico -> slide: via ppt/slides/_rels/slideN.xml.rels (rId -> chart target)

Uso:
    python poc_extractor.py "caminho/para/estudo.pptx"

NÃO versionar os PPTX de estudo (pesados); ver .gitignore. Este script é o ponto
de partida; a versão de produção viverá em src/features/corretor/ (TypeScript).
"""
import zipfile, re, sys, os

def _tags(xml, tag):
    return re.findall(r'<%s>(.*?)</%s>' % (tag, tag), xml, re.S)

def _slide_num(n):
    return int(re.search(r'slide(\d+)\.xml', n).group(1))

# ---------- Índice: gráfico -> slide -> título ----------

def build_chart_index(z, names):
    """chart_target -> (slide_num, slide_title)."""
    idx = {}
    slides = [n for n in names if re.match(r'ppt/slides/slide\d+\.xml$', n)]
    for s in slides:
        xml = z.read(s).decode('utf-8', 'ignore')
        title_runs = [t.strip() for t in _tags(xml, 'a:t') if t.strip()]
        # heurística: preferir o 1º run "textual" (>10 chars, com letras) a um número solto
        title = next((t for t in title_runs[:6] if len(t) > 10 and re.search(r'[A-Za-zÀ-ú]{4}', t)),
                     title_runs[0] if title_runs else '(sem título)')[:70]
        num = _slide_num(s)
        relname = 'ppt/slides/_rels/%s.rels' % os.path.basename(s)
        if relname not in names:
            continue
        rels = z.read(relname).decode('utf-8', 'ignore')
        rid2tgt = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels))
        for rid in re.findall(r'<c:chart[^>]*r:id="(rId\d+)"', xml):
            tgt = rid2tgt.get(rid, '')
            tgt = re.sub(r'^\.\./', 'ppt/', tgt)  # ../charts/chartN.xml -> ppt/charts/...
            idx[tgt] = (num, title)
    return idx

def slide_fulltext(z, names, num):
    n = 'ppt/slides/slide%d.xml' % num
    if n not in names:
        return ''
    return ' '.join(_tags(z.read(n).decode('utf-8', 'ignore'), 'a:t'))

# ---------- Extração de gráficos ----------

def load_charts(z, names):
    out = []
    charts = sorted([n for n in names if re.match(r'ppt/charts/chart\d+\.xml$', n)],
                    key=lambda n: int(re.search(r'(\d+)', n).group()))
    for c in charts:
        xml = z.read(c).decode('utf-8', 'ignore')
        series = []
        for s in re.findall(r'<c:ser>.*?</c:ser>', xml, re.S):
            val_block = re.search(r'<c:val>.*?</c:val>', s, re.S)
            vals = []
            if val_block:
                for v in _tags(val_block.group(), 'c:v'):
                    try: vals.append(float(v))
                    except ValueError: pass
            series.append(vals)
        out.append((c, series))
    return out

def load_tables(z, names):
    out = []
    slides = sorted([n for n in names if re.match(r'ppt/slides/slide\d+\.xml$', n)],
                    key=_slide_num)
    for s in slides:
        xml = z.read(s).decode('utf-8', 'ignore')
        for tbl in re.findall(r'<a:tbl>.*?</a:tbl>', tbl_join := xml, re.S):
            rows = []
            for tr in re.findall(r'<a:tr[ >].*?</a:tr>', tbl, re.S):
                cells = [''.join(_tags(tc, 'a:t')).strip()
                         for tc in re.findall(r'<a:tc>.*?</a:tc>', tr, re.S)]
                rows.append(cells)
            if rows:
                out.append((_slide_num(s), rows))
    return out

# ---------- Regras determinísticas ----------

MULTI_RESP = re.compile(r'resposta\s+m[úu]ltipla|total\s+superior\s+a\s+100|m[úu]ltipla\s+escolha', re.I)

def rule_percentage_sum(charts, chart_idx, z, names, tol=1.5):
    """Séries proporcionais que não fecham 100%, IGNORANDO slides de resposta múltipla."""
    findings = []
    for name, series in charts:
        slide_num, title = chart_idx.get(name, (None, '(gráfico solto)'))
        ctx = slide_fulltext(z, names, slide_num) if slide_num else ''
        multi = bool(MULTI_RESP.search(ctx))
        for vals in series:
            if len(vals) < 2:
                continue
            scale = 100.0 if all(0 <= v <= 1.05 for v in vals) else 1.0
            pct = [v * scale for v in vals]
            if all(0 <= v <= 105 for v in pct):
                total = sum(pct)
                if 85 <= total <= 115 and abs(total - 100) > tol:
                    findings.append({
                        'chart': name, 'slide': slide_num, 'title': title,
                        'sum': round(total, 1), 'multi_resp': multi,
                        'vals': [round(v, 1) for v in pct],
                    })
    return findings

LEFTOVER = re.compile(r'\b(agrupar|ajustar|revisar|conferir|confirmar|checar|verificar|inserir|colocar|preencher|refazer|corrigir|pendente|TODO|xxx)\b', re.I)

def rule_leftover_notes(z, names):
    """Notas internas de edição esquecidas no deck (candidato LEFTOVER_NOTE)."""
    out = []
    slides = sorted([n for n in names if re.match(r'ppt/slides/slide\d+\.xml$', n)], key=_slide_num)
    for s in slides:
        for t in _tags(z.read(s).decode('utf-8', 'ignore'), 'a:t'):
            t = t.strip()
            if 3 < len(t) < 60 and LEFTOVER.search(t):
                out.append((_slide_num(s), t))
    return out

def rule_source_missing(z, names):
    """Slides com gráfico/tabela sem legenda de fonte EM TEXTO.
    Limitação: a legenda pode estar embutida em imagem — aqui só o que é texto conta."""
    out = []
    slides = sorted([n for n in names if re.match(r'ppt/slides/slide\d+\.xml$', n)], key=_slide_num)
    for s in slides:
        xml = z.read(s).decode('utf-8', 'ignore')
        if 'graphicFrame' not in xml:
            continue
        alltext = ' '.join(_tags(xml, 'a:t'))
        if len(alltext) > 40 and not re.search(r'font|elabora', alltext, re.I):
            out.append(_slide_num(s))
    return out

def main(path):
    z = zipfile.ZipFile(path); names = z.namelist()
    print("ESTUDO:", os.path.basename(path)); print("=" * 74)
    chart_idx = build_chart_index(z, names)
    charts = load_charts(z, names)
    tables = load_tables(z, names)
    n_slides = len([n for n in names if re.match(r'ppt/slides/slide\d+\.xml$', n)])
    print(f"slides={n_slides} | tabelas nativas={len(tables)} | gráficos={len(charts)} "
          f"| gráficos mapeados a slide={len(chart_idx)}")

    pct = rule_percentage_sum(charts, chart_idx, z, names)
    real = [f for f in pct if not f['multi_resp']]
    multi = [f for f in pct if f['multi_resp']]
    print(f"\n[PERCENTAGE_SUM] {len(pct)} séries não fecham 100% → "
          f"{len(real)} candidatos a BUG | {len(multi)} explicados por resposta múltipla")
    for f in real[:15]:
        print(f"  slide {f['slide']} «{f['title']}» soma={f['sum']}% {f['vals']}")

    notes = rule_leftover_notes(z, names)
    print(f"\n[LEFTOVER_NOTE] notas de edição esquecidas: {len(notes)}")
    for num, t in notes[:12]:
        print(f"  slide {num}: “{t}”")

    src = rule_source_missing(z, names)
    print(f"\n[SOURCE_MISSING] slides com dado sem 'fonte/elaboração' em texto: {len(src)} "
          f"(pode estar em imagem — validar)")
    z.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit("uso: python poc_extractor.py <estudo.pptx>")
    main(sys.argv[1])
