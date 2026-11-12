"""Confere as seis regras não conflitantes de 26/10 contra o Python fornecido."""
import argparse
import copy
import json
import runpy
from collections import Counter
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('python_source', type=Path)
parser.add_argument('jsonl', type=Path)
parser.add_argument('typescript_result', type=Path)
args = parser.parse_args()
module = runpy.run_path(str(args.python_source))
raw = [json.loads(line) for line in args.jsonl.read_text(encoding='utf-8-sig').splitlines() if line.strip()]
df = module['converter_tipos'](module['obter_ultimo_periodo'](module['expandir_tipologias'](copy.deepcopy(raw))))
names = {
    'Área privativa zerada', 'Preço M2 diferente de (Preço / Área Privativa)',
    'Preço de lançamento zerado', 'Preço do período zerado',
    'Quantidade lançada zerada', 'Preço de lançamento diferente do preço do período',
}
findings = module['validar_tipologias_grupos'](df.copy())
expected = Counter((str(row['building_id']), str(row['typology_id']), row['erro'])
                   for group in findings for _, row in group.iterrows() if row['erro'] in names)
actual_rows = json.loads(args.typescript_result.read_text(encoding='utf-8'))
actual = Counter((row['building_id'], row['typology_id'], row['error'])
                 for row in actual_rows if row['error'] in names)
print(json.dumps({'python': sum(expected.values()), 'typescript': sum(actual.values()),
                  'only_python': list((expected - actual).items()),
                  'only_typescript': list((actual - expected).items())}, ensure_ascii=False, indent=2))
assert expected == actual

# A referência histórica deve produzir exatamente os demais achados, sem regressões.
baseline = runpy.run_path(str(Path(__file__).with_name('farol_rebrain_20261021_corrigido.py')))
base_df = baseline['converter_tipos'](baseline['obter_ultimo_periodo'](baseline['expandir_tipologias'](copy.deepcopy(raw))))
old_findings = baseline['validar_empreendimentos_grupos'](base_df.copy()) + baseline['validar_tipologias_grupos'](base_df.copy())
old_expected = Counter((str(row['building_id']), str(row['typology_id']), str(row['period']), row['campo'], row['erro'], row['grupo'])
                       for group in old_findings for _, row in group.iterrows())
old_actual = Counter((row['building_id'], row['typology_id'], row['period'][:10], row['field'], row['error'], row['rule'])
                     for row in actual_rows if row['error'] not in names)
assert old_expected == old_actual, (old_expected - old_actual, old_actual - old_expected)
print(f'Achados anteriores preservados: {sum(old_actual.values())}')
