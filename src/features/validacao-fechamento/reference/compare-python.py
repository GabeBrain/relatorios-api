"""Compara motor Python corrigido com resultado headless do TypeScript, sem API."""
import argparse
import json
import runpy
from collections import Counter
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('typescript_result', type=Path)
parser.add_argument('--xlsx', type=Path)
args = parser.parse_args()
module = runpy.run_path(str(Path(__file__).with_name('farol_rebrain_20261021_corrigido.py')))
raw = [json.loads(line) for line in args.source.read_text(encoding='utf-8-sig').splitlines() if line.strip()]
df = module['converter_tipos'](module['expandir_tipologias'](raw))
df = module['obter_ultimo_periodo'](df)
findings = module['validar_empreendimentos_grupos'](df.copy()) + module['validar_tipologias_grupos'](df.copy())
expected = Counter()
for group in findings:
    for _, row in group.iterrows():
        expected[(str(row['building_id']), str(row['typology_id']), str(row['period']), row['campo'], row['erro'], row['grupo'])] += 1
actual_rows = json.loads(args.typescript_result.read_text(encoding='utf-8'))
actual = Counter((r['building_id'], r['typology_id'], r['period'][:10], r['field'], r['error'], r['rule']) for r in actual_rows)
print(json.dumps({'buildings': len(raw), 'latest_typologies': len(df), 'python_findings': sum(expected.values()), 'typescript_findings': sum(actual.values()), 'only_python': list((expected - actual).items()), 'only_typescript': list((actual - expected).items())}, ensure_ascii=False, default=str, indent=2))
if expected != actual:
    raise SystemExit(1)
if args.xlsx:
    args.xlsx.parent.mkdir(parents=True, exist_ok=True)
    final = module['finalizar_tratamentos'](module['converter_dataframes'](findings).copy())
    final.to_excel(args.xlsx, index=False)
    import openpyxl
    workbook = openpyxl.load_workbook(args.xlsx, read_only=True)
    assert workbook.active.max_row == sum(expected.values()) + 1
    workbook.close()
    print(f'Excel verificado: {args.xlsx}')
