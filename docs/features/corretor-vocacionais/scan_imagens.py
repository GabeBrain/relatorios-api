#!/usr/bin/env python3
"""
Fase C (passo 1) — Inventário de imagens candidatas a TABELA NUMÉRICA.

Mapeia slide → imagens do PPTX (via rels), com dimensões, tamanho e sha1.
O sha1 é a chave do cache de visão: imagem repetida (logo, template, mapa
reusado) é extraída UMA vez só. Cruza com o IR para filtrar por seção e
priorizar slides das notas-gabarito (taxonomia_notas.md).

Saída: visao/manifest.csv (+ resumo no stdout). Só stdlib.

Uso: python scan_imagens.py
"""
import csv
import glob
import hashlib
import json
import os
import re
import struct
import sys
import zipfile
import xml.etree.ElementTree as ET

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'

# Seções onde vivem os números que o analista corrige (ver taxonomia_notas.md)
SECOES_NUMERICAS = {'SOCIO', 'MERCADO', 'LACUNAS', 'ABSORCAO'}
# Slides com nota-gabarito ganham prioridade máxima no piloto
GABARITO = {
    'Vocacional_Horizontal(Av. Itaipava)_Elio_Winter_Itajai_SC_estudo exemplo.pptx':
        [27, 35, 36, 41, 59, 60, 85, 95, 96, 120, 122],
    'Vocacional_Marka Prime_Tancredo_Sao Paulo - SP_estudo exemplo.pptx':
        [27, 28, 41, 76, 121, 122, 123, 136, 137, 138, 149, 150, 151],
}


def png_dims(data):
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    w, h = struct.unpack('>II', data[16:24])
    return w, h


def jpeg_dims(data):
    i = 2
    while i < len(data) - 9:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            h, w = struct.unpack('>HH', data[i + 5:i + 9])
            return w, h
        i += 2 + struct.unpack('>H', data[i + 2:i + 4])[0]
    return None


def slide_images(z, num):
    """Imagens referenciadas pelo slide (via .rels)."""
    rels_path = f'ppt/slides/_rels/slide{num}.xml.rels'
    try:
        root = ET.fromstring(z.read(rels_path))
    except KeyError:
        return []
    out = []
    for rel in root.iter(f'{{{NS_REL}}}Relationship'):
        if rel.get('Type', '').endswith('/image'):
            target = rel.get('Target', '').replace('../', 'ppt/')
            out.append(target)
    return out


def scan(pptx_path, ir_path):
    z = zipfile.ZipFile(pptx_path)
    ir = json.load(open(ir_path, encoding='utf-8'))
    base = os.path.basename(pptx_path)
    secao = {s['n']: s.get('secao_canonica') for s in ir['slides']}
    titulo = {s['n']: s.get('titulo') for s in ir['slides']}
    gab = set(GABARITO.get(base, []))

    rows, cache = [], {}
    for s in ir['slides']:
        n = s['n']
        for img in slide_images(z, n):
            if img not in cache:
                try:
                    data = z.read(img)
                except KeyError:
                    continue
                dims = png_dims(data) or jpeg_dims(data) or (None, None)
                cache[img] = (hashlib.sha1(data).hexdigest()[:16],
                              len(data), dims[0], dims[1])
            sha, size, w, h = cache[img]
            rows.append({
                'estudo': base, 'slide': n,
                'secao': secao.get(n) or '', 'titulo': (titulo.get(n) or '')[:60],
                'imagem': img, 'sha1': sha, 'kb': round(size / 1024),
                'px': f'{w}x{h}' if w else '',
                'secao_numerica': secao.get(n) in SECOES_NUMERICAS,
                'slide_gabarito': n in gab,
            })
    return rows


def main():
    all_rows = []
    for pptx in sorted(glob.glob('*_estudo exemplo.pptx')):
        ir_path = os.path.join('ir', os.path.splitext(pptx)[0] + '.ir.json')
        if not os.path.exists(ir_path):
            print(f'! IR ausente para {pptx} — rode ir_extractor.py primeiro')
            continue
        all_rows += scan(pptx, ir_path)

    os.makedirs('visao', exist_ok=True)
    out = os.path.join('visao', 'manifest.csv')
    with open(out, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(all_rows[0].keys()))
        w.writeheader()
        w.writerows(all_rows)

    # resumo: o argumento econômico sai daqui
    total = len(all_rows)
    unicas = {r['sha1'] for r in all_rows}
    numericas = [r for r in all_rows if r['secao_numerica']]
    unicas_num = {r['sha1'] for r in numericas}
    gab_rows = [r for r in all_rows if r['slide_gabarito']]
    unicas_gab = {r['sha1'] for r in gab_rows}
    print(f'Referências de imagem em slides:            {total}')
    print(f'Imagens ÚNICAS (sha1) — teto de chamadas:    {len(unicas)}')
    print(f'Em seções numéricas (SOCIO/MERCADO/LACUNAS/ABSORCAO): {len(numericas)} refs → {len(unicas_num)} únicas')
    print(f'Em slides do GABARITO (piloto):              {len(gab_rows)} refs → {len(unicas_gab)} únicas')
    print(f'→ {out}')


if __name__ == '__main__':
    main()
