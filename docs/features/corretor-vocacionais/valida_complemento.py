#!/usr/bin/env python3
"""
Fase C (passo 2) — valida os IR-complementos de visão com regras DET.

Fecha o loop: imagem → números estruturados → checagens determinísticas
(ABSOLUTE_SUM linha/coluna vs total declarado, PERCENTAGE_SUM). É a prova de
que, com o dado extraído, o corretor reproduz o trabalho do analista.

Uso: python valida_complemento.py   (roda em visao/piloto/*.complemento.json)
"""
import glob
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

TOL_ABS = 0.5   # unidades
TOL_PCT = 1.5   # pontos percentuais


def nums(row):
    return [v for v in row if isinstance(v, (int, float))]


def check_table(tb):
    achados, ok = [], 0
    linhas = tb['linhas_num']
    tot = tb.get('totais_declarados')
    if tot:
        # colunas numéricas: soma das linhas deve bater com o total declarado
        ncols = max(len(r) for r in linhas)
        for c in range(1, ncols):
            vals = [r[c] for r in linhas if c < len(r) and isinstance(r[c], (int, float))]
            if not vals or c >= len(tot) or not isinstance(tot[c], (int, float)):
                continue
            soma, decl = sum(vals), tot[c]
            # coluna de % usa tolerância própria
            is_pct = all(0 <= v <= 100 for v in vals) and 85 <= decl <= 115
            tol = TOL_PCT if is_pct and decl == 100 else TOL_ABS
            if abs(soma - decl) > tol:
                achados.append(f"coluna '{tb['colunas'][c] if c < len(tb['colunas']) else c}': "
                               f"soma={round(soma, 1)} ≠ total declarado={decl}")
            else:
                ok += 1
        # linhas com coluna Total: células devem somar o total da linha
        if 'Total' in tb['colunas']:
            ti = tb['colunas'].index('Total')
            for r in linhas:
                vals = nums(r[1:ti])
                if vals and isinstance(r[ti], (int, float)):
                    if abs(sum(vals) - r[ti]) > TOL_ABS:
                        achados.append(f"linha '{r[0]}': células somam {sum(vals)} ≠ Total={r[ti]}")
                    else:
                        ok += 1
    return achados, ok


def main():
    total_ach = total_ok = 0
    for path in sorted(glob.glob('visao/piloto/*.complemento.json')):
        comp = json.load(open(path, encoding='utf-8'))
        print('=' * 74)
        print(f"{comp['estudo'][:48]} · slide {comp['slide']} [{comp['secao']}]")
        print(f"  imagem: {comp['imagem']} · nota-gabarito: “{comp.get('nota_gabarito', '')}”")
        for tb in comp['tabelas']:
            achados, ok = check_table(tb)
            total_ach += len(achados)
            total_ok += ok
            print(f"  «{tb['titulo']}» → {ok} checagens OK, {len(achados)} inconsistência(s)")
            for a in achados:
                print(f"    ✗ {a}")
    print('=' * 74)
    print(f"TOTAL: {total_ok} checagens consistentes · {total_ach} inconsistências")


if __name__ == '__main__':
    main()
