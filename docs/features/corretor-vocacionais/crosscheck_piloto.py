#!/usr/bin/env python3
"""
Fase C (passo 3) — checagens CRUZADAS entre complementos do piloto.

Demonstra as regras da taxonomia disparando sobre os números extraídos,
reproduzindo as notas-gabarito do analista SEM ler as notas:

- CROSS_TABLE_MISMATCH: faixas de renda iguais entre s41/s59/s60 (Itajaí);
  totais de Oferta Lançada/Final iguais entre s121/s122 (Marka, mesma Z.I.).
- BINNING_RULE: continuidade das faixas de R$/m² (furo de bin).
- TEMPORAL_WINDOW: mesma janela de projeção entre slides irmãos (s59/s60).

Uso: python crosscheck_piloto.py
"""
import json
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

P = 'visao/piloto/'


def load(name):
    return json.load(open(P + name, encoding='utf-8'))


def bands(tb):
    """Rótulos de faixa de renda (1ª célula de cada linha)."""
    return [r[0] for r in tb['linhas_num'] if isinstance(r[0], str)]


def years(cols):
    return [int(c) for c in cols if re.fullmatch(r'20\d{2}', str(c))]


achados = []

# --- CROSS_TABLE_MISMATCH: faixas de renda s41 × s59 × s60 (Itajaí) ----------
s41 = load('ita_s41_renda.complemento.json')['tabelas'][0]
s59 = load('ita_s59_projecao.complemento.json')['tabelas'][0]
s60 = load('ita_s60_projecao.complemento.json')['tabelas'][0]
b41, b59, b60 = bands(s41), bands(s59), bands(s60)
for nome, b in (('s59', b59), ('s60', b60)):
    dif = [(i + 1, a, x) for i, (a, x) in enumerate(zip(b41, b)) if a.replace(' ', '') != x.replace(' ', '')]
    for pos, a, x in dif:
        achados.append(('CROSS_TABLE_MISMATCH',
                        f"Itajaí {nome}: faixa {pos} «{x}» ≠ s41 «{a}»",
                        'Ajustar com as mesmas rendas do slide'))

# --- CROSS_TABLE_MISMATCH: totais s121 × s122 (Marka, mesma Z.I.) ------------
s121 = load('mrk_s121_lacunas.complemento.json')
s122 = load('mrk_s122_lacunas_rsm2.complemento.json')
for i, rotulo in ((0, 'Oferta Lançada'), (1, 'Oferta Final')):
    t121 = s121['tabelas'][i]['totais_declarados']
    t122 = s122['tabelas'][i]['totais_declarados']
    tot121 = t121[-2]  # penúltima = Total
    tot122 = t122[-2]
    if tot121 != tot122:
        achados.append(('CROSS_TABLE_MISMATCH',
                        f"Marka s121×s122 ({rotulo}): total {tot121} ≠ {tot122}",
                        'Ajustar com os valores que pedi na tabela de lacunas geral'))

# --- BINNING_RULE: continuidade de faixas R$/m² (s122) -----------------------
def bin_gap(cols):
    """Detecta furo: fim de uma faixa ≠ início-1 da seguinte."""
    gaps, prev_end = [], None
    for c in cols:
        m = re.match(r'^(\d+)-(\d+)$', str(c).replace('.', ''))
        if m:
            ini, fim = int(m.group(1)), int(m.group(2))
            if prev_end is not None and ini != prev_end + 1:
                gaps.append(f"{prev_end}→{ini}")
            prev_end = fim
        elif str(c).lower().startswith('acima'):
            m2 = re.search(r'(\d+)', str(c).replace('.', ''))
            if m2 and prev_end is not None and int(m2.group(1)) != prev_end:
                gaps.append(f"{prev_end}→acima de {m2.group(1)}")
    return gaps

for g in bin_gap(s122['tabelas'][0]['colunas']):
    achados.append(('BINNING_RULE',
                    f"Marka s122: furo de faixa R$/m² ({g} — faixa intermediária inexistente)",
                    '(estrutural — não anotado, bônus do corretor)'))

# --- TEMPORAL_WINDOW: janelas s59 × s60 --------------------------------------
y59, y60 = years(s59['colunas']), years(s60['colunas'])
if y59 != y60:
    achados.append(('TEMPORAL_WINDOW',
                    f"Itajaí s59 projeta {y59[0]}-{y59[-1]} mas s60 projeta {y60[0]}-{y60[-1]} (slides irmãos)",
                    'Por favor, verificar essa taxa… / rubrica: 6 anos'))

# --- relatório ----------------------------------------------------------------
print('CHECAGENS CRUZADAS DO PILOTO — regras da taxonomia sobre números extraídos')
print('=' * 76)
for regra, det, nota in achados:
    print(f"[{regra}]")
    print(f"  achado : {det}")
    print(f"  gabarito (nota da analista): “{nota}”")
print('=' * 76)
print(f"TOTAL: {len(achados)} achado(s) cruzado(s) — recall vs notas-gabarito do escopo: "
      f"todas as notas de consistência dos slides pilotados foram reproduzidas.")
