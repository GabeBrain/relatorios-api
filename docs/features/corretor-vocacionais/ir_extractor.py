#!/usr/bin/env python3
"""
IR — Representação Intermediária de Estudos Vocacionais (PPTX → JSON)  [v1]

Entregável 1 do plano do Corretor v2 (ver DESIGN_corretor_v2.md). Extrai cada
estudo para um JSON normalizado sobre o qual o catálogo de regras determinísticas
opera (regras cruzadas entre slides só existem sobre um IR).

Evoluções sobre o poc_extractor.py:
- Parser XML de verdade (xml.etree, stdlib) em vez de regex sobre o XML cru.
- Texto agrupado POR SHAPE e POR PARÁGRAFO → corrige a fragmentação de runs
  que quebrava a detecção de "FONTE: … | ELABORAÇÃO: …".
- Título via placeholder oficial (<p:ph type="title">), com fallback heurístico.
- Gráficos com nome de série, categorias E valores (cache numérico completo).
- Números de tabela já parseados em convenção pt-BR ("1.234,56" → 1234.56).
- Seção canônica v0 por dicionário de títulos (calibrar com a analista).

Uso:
    python ir_extractor.py "caminho/para/estudo.pptx" [-o saida.json]

Saída padrão: ./ir/<nome do estudo>.ir.json (pasta gitignored — derivado de
amostras locais não versionadas).

Só stdlib. A versão de produção viverá em src/features/corretor/ (TypeScript);
este script é a referência executável do schema.
"""
import argparse
import hashlib
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# console Windows costuma ser cp1252 — força UTF-8 na saída
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

IR_VERSION = 1

NS = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'c': 'http://schemas.openxmlformats.org/drawingml/2006/chart',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'rel': 'http://schemas.openxmlformats.org/package/2006/relationships',
}
R_ID = '{%s}id' % NS['r']


# ---------- helpers de texto ----------

def paragraph_text(p_el):
    """Junta todos os runs (a:r/a:fld) de um parágrafo em uma string."""
    parts = []
    for t in p_el.iter('{%s}t' % NS['a']):
        if t.text:
            parts.append(t.text)
    return ''.join(parts).strip()


def txbody_paragraphs(txbody):
    """Parágrafos não vazios de um txBody, já com runs unidos."""
    out = []
    for p_el in txbody.findall('a:p', NS):
        txt = paragraph_text(p_el)
        if txt:
            out.append(txt)
    return out


def parse_num_ptbr(s):
    """'1.234,56' → 1234.56 · '82%' → 82.0 · 'R$ 5.000' → 5000.0 · texto → None."""
    s = s.strip()
    if not s:
        return None
    s = re.sub(r'^r\$\s*', '', s, flags=re.I).replace('%', '').replace(' ', ' ').strip()
    neg = s.startswith('(') and s.endswith(')')
    if neg:
        s = s[1:-1]
    s = s.replace(' ', '')
    if not re.fullmatch(r'-?[\d.,]+', s):
        return None
    if ',' in s and '.' in s:
        s = s.replace('.', '').replace(',', '.')
    elif ',' in s:
        s = s.replace(',', '.')
    elif '.' in s:
        # só ponto: "1.234" (milhar) vs "1.5" (decimal)
        if re.fullmatch(r'-?\d{1,3}(\.\d{3})+', s):
            s = s.replace('.', '')
    try:
        v = float(s)
        return -v if neg else v
    except ValueError:
        return None


# ---------- padrões da rubrica ----------

FONTE_RX = re.compile(r'\b(fonte|elabora[çc][ãa]o)\b\s*[:\-]?', re.I)
NOTA_RX = re.compile(r'^(\*|nota[:\s]|obs[.:\s])', re.I)
MULTI_RESP_RX = re.compile(
    r'resposta\s+m[úu]ltipla|total\s+superior\s+a\s+100|m[úu]ltipla\s+escolha', re.I)
LEFTOVER_RX = re.compile(
    r'\b(agrupar|ajustar|revisar|conferir|confirmar|checar|verificar|inserir|'
    r'colocar|preencher|refazer|corrigir|pendente|TODO|xxx)\b', re.I)

# Seção canônica v0 — dicionário título→seção da rubrica. CALIBRAR com a analista
# (item 2 do plano). Ordem importa: primeiro match vence.
SECOES = [
    ('CAPA', r'estudo\s+vocacional|masterplan|vocacional\s*(e|\+)\s*quanti'),
    # termos mais específicos primeiro — "TABELA DE LACUNAS … Z.I. TOTAL" é LACUNAS,
    # não IDENTIFICACAO; "lacunas de mercado" é LACUNAS, não MERCADO
    ('LACUNAS', r'lacuna'),
    ('ABSORCAO', r'absor[çc][ãa]o'),
    ('IDENTIFICACAO', r'identifica[çc][ãa]o|terreno|zona\s+de\s+influ[êe]ncia|'
                      r'\bz\.?\s?i\.?\b|deslocamento|descolamento'),
    ('SOCIO', r'socio[dg]emogr|demanda\s+vegetativa|proje[çc][ãa]o\s+de\s+demanda|'
              r'faixa[s]?\s+de\s+renda|domic[íi]lio|popula[çc][ãa]o|'
              r'condi[çc][ãa]o\s+de\s+ocupa[çc][ãa]o|renda\s+(m[ée]dia|domiciliar)'),
    ('MERCADO', r'oferta\s+(lan[çc]ada|atual|consolidada|final)|lan[çc]a(mento|da)|'
                r'tipologia|mercado|unidades\s+(lan[çc]adas|vendidas)|empreendimento|'
                r'concorr[êe]nc|revenda|pre[çc]o\s+m[ée]dio|tabela[s]?\s+de\s+pre[çc]o|vgv'),
    ('ENTORNO', r'entorno|mapeamento\s+f[íi]sico|infraestrutura'),
    ('CONCLUSAO', r'voca[çc][ãa]o\s+do|conclus|recomenda[çc]|produto\s+(sugerido|proposto)'),
]


def secao_canonica(titulo):
    for sec, rx in SECOES:
        if re.search(rx, titulo, re.I):
            return sec
    return None


# ---------- extração de gráfico (ppt/charts/chartN.xml) ----------

def cache_points(ref_el):
    """Pontos de um c:strRef/c:numRef (cache), ordenados por idx."""
    if ref_el is None:
        return []
    pts = []
    for pt in ref_el.iter('{%s}pt' % NS['c']):
        v = pt.find('c:v', NS)
        idx = int(pt.get('idx', len(pts)))
        pts.append((idx, v.text if v is not None else ''))
    return [v for _, v in sorted(pts)]


def parse_chart(xml_bytes):
    root = ET.fromstring(xml_bytes)
    titulo = None
    t_el = root.find('.//c:title', NS)
    if t_el is not None:
        parts = [t.text for t in t_el.iter('{%s}t' % NS['a']) if t.text]
        titulo = ''.join(parts).strip() or None
    series = []
    for ser in root.iter('{%s}ser' % NS['c']):
        nome = None
        tx = ser.find('c:tx', NS)
        if tx is not None:
            cached = cache_points(tx)
            nome = cached[0] if cached else None
        cats = cache_points(ser.find('c:cat', NS))
        raw_vals = cache_points(ser.find('c:val', NS))
        vals = []
        for v in raw_vals:
            try:
                vals.append(float(v))
            except (TypeError, ValueError):
                vals.append(None)
        series.append({'nome': nome, 'categorias': cats, 'valores': vals})
    return {'titulo_grafico': titulo, 'series': series}


# ---------- extração de slide ----------

def parse_table(tbl_el):
    linhas = []
    for tr in tbl_el.findall('a:tr', NS):
        row = []
        for tc in tr.findall('a:tc', NS):
            txt_el = tc.find('a:txBody', NS)
            row.append('\n'.join(txbody_paragraphs(txt_el)) if txt_el is not None else '')
        linhas.append(row)
    return {
        'n_linhas': len(linhas),
        'n_colunas': max((len(r) for r in linhas), default=0),
        'linhas': linhas,
        'linhas_num': [[parse_num_ptbr(c) for c in r] for r in linhas],
    }


def slide_title(root, shapes_paras):
    """Placeholder oficial de título; fallback: heurística do POC."""
    for sp in root.iter('{%s}sp' % NS['p']):
        ph = sp.find('.//p:nvSpPr/p:nvPr/p:ph', NS)
        if ph is not None and ph.get('type') in ('title', 'ctrTitle'):
            tx = sp.find('.//p:txBody', NS)
            if tx is not None:
                paras = txbody_paragraphs(tx)
                if paras:
                    return ' '.join(paras)[:120]
    flat = [p for paras in shapes_paras for p in paras]
    # fallback: 1º parágrafo "textual" que não seja legenda de fonte, nota ou resto de edição
    for t in flat[:8]:
        if (len(t) > 10 and re.search(r'[A-Za-zÀ-ú]{4}', t)
                and not FONTE_RX.search(t) and not NOTA_RX.match(t)):
            return t[:120]
    return flat[0][:120] if flat else '(sem título)'


def parse_slide(z, names, slide_name, rid2target):
    root = ET.fromstring(z.read(slide_name))
    num = int(re.search(r'slide(\d+)\.xml', slide_name).group(1))

    # texto por shape (parágrafos unidos) — a unidade que preserva "FONTE: … | ELABORAÇÃO: …"
    shapes_paras = []
    for sp in root.iter('{%s}sp' % NS['p']):
        tx = sp.find('.//p:txBody', NS)
        if tx is not None:
            paras = txbody_paragraphs(tx)
            if paras:
                shapes_paras.append(paras)

    all_paras = [p for paras in shapes_paras for p in paras]
    fulltext = ' '.join(all_paras)

    fontes = [p for p in all_paras if FONTE_RX.search(p)]
    notas = [p for p in all_paras if NOTA_RX.match(p) and not FONTE_RX.search(p)]
    notas_edicao = [p for p in all_paras if 3 < len(p) < 80 and LEFTOVER_RX.search(p)]

    tabelas = [parse_table(t) for t in root.iter('{%s}tbl' % NS['a'])]

    graficos = []
    for chart_ref in root.iter('{%s}chart' % NS['c']):
        rid = chart_ref.get(R_ID)
        tgt = rid2target.get(rid, '')
        tgt = re.sub(r'^\.\./', 'ppt/', tgt)
        if tgt in names:
            g = parse_chart(z.read(tgt))
            g['arquivo'] = tgt
            graficos.append(g)

    titulo = slide_title(root, shapes_paras)
    return {
        'n': num,
        'titulo': titulo,
        'secao_canonica': secao_canonica(titulo),
        'textos': ['\n'.join(paras) for paras in shapes_paras],
        'fontes': fontes,
        'notas': notas,
        'notas_edicao': notas_edicao,
        'tabelas': tabelas,
        'graficos': graficos,
        'n_imagens': sum(1 for _ in root.iter('{%s}pic' % NS['p'])),
        'flags': {'resposta_multipla': bool(MULTI_RESP_RX.search(fulltext))},
    }


# ---------- pipeline ----------

def slide_rels(z, names, slide_name):
    relname = 'ppt/slides/_rels/%s.rels' % os.path.basename(slide_name)
    if relname not in names:
        return {}
    root = ET.fromstring(z.read(relname))
    return {rel.get('Id'): rel.get('Target') for rel in root.iter('{%s}Relationship' % NS['rel'])}


def sha1_of(path, chunk=1 << 20):
    h = hashlib.sha1()
    with open(path, 'rb') as f:
        while blk := f.read(chunk):
            h.update(blk)
    return h.hexdigest()


def extract(path):
    z = zipfile.ZipFile(path)
    names = set(z.namelist())
    slide_names = sorted(
        (n for n in names if re.match(r'ppt/slides/slide\d+\.xml$', n)),
        key=lambda n: int(re.search(r'slide(\d+)', n).group(1)))
    slides = []
    for sn in slide_names:
        slides.append(parse_slide(z, names, sn, slide_rels(z, names, sn)))
    z.close()
    return {
        'ir_version': IR_VERSION,
        'arquivo': os.path.basename(path),
        'sha1': sha1_of(path),
        'gerado_em': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'n_slides': len(slides),
        'slides': slides,
    }


def resumo(ir):
    slides = ir['slides']
    por_secao = {}
    for s in slides:
        por_secao[s['secao_canonica'] or '(sem seção)'] = \
            por_secao.get(s['secao_canonica'] or '(sem seção)', 0) + 1
    n_tab = sum(len(s['tabelas']) for s in slides)
    n_gra = sum(len(s['graficos']) for s in slides)
    n_fon = sum(1 for s in slides if s['fontes'])
    n_edi = sum(len(s['notas_edicao']) for s in slides)
    print('IR:', ir['arquivo'])
    print('=' * 74)
    print(f"slides={ir['n_slides']} | tabelas={n_tab} | gráficos={n_gra} | "
          f"slides com fonte-em-texto={n_fon} | notas de edição={n_edi}")
    print('\nSeções canônicas (v0 — calibrar):')
    for sec, n in sorted(por_secao.items(), key=lambda kv: -kv[1]):
        print(f'  {sec:16} {n}')


def main():
    ap = argparse.ArgumentParser(description='PPTX → IR JSON (Corretor v2)')
    ap.add_argument('pptx')
    ap.add_argument('-o', '--out', help='caminho do JSON de saída')
    args = ap.parse_args()

    ir = extract(args.pptx)
    out = args.out
    if not out:
        stem = os.path.splitext(os.path.basename(args.pptx))[0]
        outdir = os.path.join(os.path.dirname(os.path.abspath(args.pptx)), 'ir')
        os.makedirs(outdir, exist_ok=True)
        out = os.path.join(outdir, stem + '.ir.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(ir, f, ensure_ascii=False, indent=1)
    resumo(ir)
    print(f'\n→ {out} ({os.path.getsize(out) / 1e6:.1f} MB)')


if __name__ == '__main__':
    sys.exit(main())
