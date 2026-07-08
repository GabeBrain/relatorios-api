#!/usr/bin/env python3
"""
Motor de regras determinísticas do Corretor v2 — puro sobre o IR JSON  [Fase A]

Cada regra é uma função pura que recebe o IR (dict) e devolve uma lista de achados
`{regra, slide, secao, titulo, detalhe, ...}`. NÃO toca no PPTX — opera só sobre o
`.ir.json` gerado por `ir_extractor.py`. Custo de IA: zero.

Também emite:
- um relatório por estudo (stdout);
- a tabela de calibração de seção (Fase B): `calibracao/<estudo>.secao.csv`
  (colunas: slide, titulo, secao_detectada, secao_correta[vazia p/ analista]).

Uso:
    python rules_ir.py "ir/<estudo>.ir.json" [outro.ir.json ...]
    python rules_ir.py            # roda em todos os ir/*estudo exemplo.ir.json

Só stdlib.
"""
import csv
import glob
import json
import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# --- diagnóstico de cobertura -------------------------------------------------

def diagnostics(ir):
    """Quanto do estudo é auditável deterministicamente vs preso em imagem."""
    n_tab = n_tab_num = n_graf = n_img = 0
    for s in ir['slides']:
        for tb in s.get('tabelas', []):
            n_tab += 1
            if any(c is not None for row in tb.get('linhas_num', []) for c in row):
                n_tab_num += 1
        n_graf += len(s.get('graficos', []))
        n_img += s.get('n_imagens', 0)
    return {'tabelas': n_tab, 'tabelas_com_numero': n_tab_num,
            'graficos': n_graf, 'imagens': n_img}

# --- regras determinísticas ---------------------------------------------------

LEFTOVER = re.compile(
    r'\b(agrupar|ajustar|revisar|conferir|confirmar|checar|verificar|inserir|'
    r'colocar|preencher|refazer|corrigir|pendente|trazer|falar com|fale comigo|'
    r'TODO|xxx)\b', re.I)
MULTI_RESP = re.compile(
    r'resposta\s+m[úu]ltipla|total\s+superior\s+a\s+100|m[úu]ltipla\s+escolha', re.I)


def rule_leftover_note(ir):
    """LEFTOVER_NOTE — notas internas de edição esquecidas no deck."""
    out = []
    for s in ir['slides']:
        # já classificadas pelo extrator
        for t in s.get('notas_edicao', []):
            out.append({'regra': 'LEFTOVER_NOTE', 'slide': s['n'],
                        'secao': s.get('secao_canonica'), 'titulo': s.get('titulo'),
                        'detalhe': t.strip()[:120], 'origem': 'notas_edicao'})
    return out


def rule_source_missing(ir):
    """SOURCE_MISSING — slide com tabela/gráfico mas sem 'fonte/elaboração' EM TEXTO.
    Limitação: a legenda de fonte pode estar dentro de imagem — aqui só texto conta."""
    out = []
    for s in ir['slides']:
        tem_dado = bool(s.get('tabelas') or s.get('graficos'))
        if not tem_dado:
            continue
        if not s.get('fontes'):
            out.append({'regra': 'SOURCE_MISSING', 'slide': s['n'],
                        'secao': s.get('secao_canonica'), 'titulo': s.get('titulo'),
                        'detalhe': f"{len(s.get('tabelas',[]))} tabela(s), "
                                   f"{len(s.get('graficos',[]))} gráfico(s), sem fonte em texto"})
    return out


def _slide_text(s):
    return ' '.join(s.get('textos', []))


def rule_percentage_sum(ir, tol=1.5):
    """PERCENTAGE_SUM — séries/colunas proporcionais que não fecham 100%,
    ignorando slides marcados como resposta múltipla."""
    out = []
    for s in ir['slides']:
        multi = bool(MULTI_RESP.search(_slide_text(s))) or \
            (s.get('flags', {}) or {}).get('resposta_multipla', False)
        # séries de gráfico
        for g in s.get('graficos', []):
            for serie in g.get('series', []):
                vals = [v for v in serie.get('valores', []) if isinstance(v, (int, float))]
                if len(vals) < 2:
                    continue
                scale = 100.0 if all(0 <= v <= 1.05 for v in vals) else 1.0
                pct = [v * scale for v in vals]
                if all(0 <= v <= 105 for v in pct):
                    total = sum(pct)
                    if 85 <= total <= 115 and abs(total - 100) > tol:
                        out.append({'regra': 'PERCENTAGE_SUM', 'slide': s['n'],
                                    'secao': s.get('secao_canonica'), 'titulo': s.get('titulo'),
                                    'detalhe': f"série '{serie.get('nome')}' soma {round(total,1)}%",
                                    'multi_resp': multi})
        # colunas numéricas de tabela
        for tb in s.get('tabelas', []):
            cols = tb.get('n_colunas', 0)
            for c in range(cols):
                vals = [row[c] for row in tb.get('linhas_num', [])
                        if c < len(row) and isinstance(row[c], (int, float))]
                if len(vals) < 2:
                    continue
                if all(0 <= v <= 105 for v in vals):
                    total = sum(vals)
                    if 85 <= total <= 115 and abs(total - 100) > tol:
                        out.append({'regra': 'PERCENTAGE_SUM', 'slide': s['n'],
                                    'secao': s.get('secao_canonica'), 'titulo': s.get('titulo'),
                                    'detalhe': f"coluna {c} soma {round(total,1)}%",
                                    'multi_resp': multi})
    return out


YEARS = re.compile(r'\b(20\d{2})\b')


def rule_temporal_window(ir, esperado=(2027, 2032)):
    """TEMPORAL_WINDOW — janela de projeção deve cobrir 6 anos (2027–2032).
    Heurística: em slides SOCIO com sequência de anos, checa min/max."""
    out = []
    for s in ir['slides']:
        if s.get('secao_canonica') != 'SOCIO':
            continue
        anos = sorted({int(y) for y in YEARS.findall(_slide_text(s))
                       if 2015 <= int(y) <= 2040})
        proj = [a for a in anos if a >= 2026]
        if len(proj) >= 2:
            lo, hi = proj[0], proj[-1]
            if (lo, hi) != esperado:
                out.append({'regra': 'TEMPORAL_WINDOW', 'slide': s['n'],
                            'secao': 'SOCIO', 'titulo': s.get('titulo'),
                            'detalhe': f"janela de projeção {lo}-{hi} (esperado {esperado[0]}-{esperado[1]})"})
    return out


RULES = [rule_leftover_note, rule_source_missing, rule_percentage_sum, rule_temporal_window]

# --- calibração de seção (Fase B) --------------------------------------------

def dump_calibracao(ir, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['slide', 'titulo', 'secao_detectada', 'secao_correta (preencher)'])
        for s in ir['slides']:
            w.writerow([s['n'], s.get('titulo', ''), s.get('secao_canonica') or '(sem seção)', ''])


def secao_stats(ir):
    from collections import Counter
    c = Counter((s.get('secao_canonica') or '(sem seção)') for s in ir['slides'])
    return c

# --- runner ------------------------------------------------------------------

def run(ir_path):
    ir = json.load(open(ir_path, encoding='utf-8'))
    nome = os.path.splitext(os.path.basename(ir_path))[0]
    print('=' * 78)
    print('ESTUDO:', ir['arquivo'], f"| {ir['n_slides']} slides")
    diag = diagnostics(ir)
    auditavel = diag['tabelas_com_numero'] + diag['graficos']
    print(f"COBERTURA DET  · tabelas={diag['tabelas']} "
          f"(c/ número parseado={diag['tabelas_com_numero']}) · gráficos={diag['graficos']} "
          f"· imagens={diag['imagens']}")
    if auditavel == 0:
        print("  ⚠ Nenhum dado numérico estruturado — números presos em imagem. "
              "Regras de soma/consistência ficam sem material (ver estratégia, Fase C/D).")

    total = 0
    for rule in RULES:
        found = rule(ir)
        if rule is rule_percentage_sum:
            reais = [f for f in found if not f.get('multi_resp')]
            print(f"\n[{rule.__name__}] {len(reais)} candidato(s) a bug "
                  f"({len(found)-len(reais)} explicados por resposta múltipla)")
            found = reais
        else:
            print(f"\n[{rule.__name__}] {len(found)} achado(s)")
        total += len(found)
        for f in found[:12]:
            print(f"  slide {f['slide']:>3} [{f['secao'] or '-'}] {f['detalhe']}")
        if len(found) > 12:
            print(f"  … +{len(found)-12}")

    # seção
    print("\nSEÇÃO CANÔNICA (v0 — calibrar):")
    for sec, n in secao_stats(ir).most_common():
        print(f"  {sec:<16} {n}")
    cal = os.path.join('calibracao', nome + '.secao.csv')
    dump_calibracao(ir, cal)
    print(f"→ tabela de calibração (Fase B): {cal}")
    print(f"\nTOTAL de achados determinísticos: {total}")
    return total


if __name__ == '__main__':
    args = sys.argv[1:] or sorted(glob.glob('ir/*estudo exemplo.ir.json'))
    if not args:
        print("Nenhum IR encontrado. Gere com ir_extractor.py primeiro.")
        sys.exit(1)
    for p in args:
        run(p)
