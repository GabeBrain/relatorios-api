"""Paridade dos achados Python/TypeScript atuais por identidade e regra."""
import argparse
import copy
import json
import runpy
from collections import Counter
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('typescript_result', type=Path)
args = parser.parse_args()
module = runpy.run_path(str(Path(__file__).with_name('farol_rebrain_20261026_corrigido.py')))
raw = [json.loads(line) for line in args.source.read_text(encoding='utf-8-sig').splitlines() if line.strip()]
df = module['converter_tipos'](module['obter_ultimo_periodo'](module['expandir_tipologias'](copy.deepcopy(raw))))
findings = module['validar_empreendimentos_grupos'](df.copy()) + module['validar_tipologias_grupos'](df.copy())

def label(value):
    return str(value).replace('>=', '≥').replace('<=', '≤').replace('m2', 'm²').replace('M2', 'M²').replace(' - Empreendimento', '').replace(' - Tipologia', '')

expected = Counter((str(row['building_id']), str(row['typology_id']), str(row['period']), row['campo'], label(row['erro']), label(row['grupo']))
                   for group in findings for _, row in group.iterrows())
rows = json.loads(args.typescript_result.read_text(encoding='utf-8'))
actual = Counter((row['building_id'], row['typology_id'], row['period'][:10], row['field'], label(row['error']), label(row['rule'])) for row in rows)
print(json.dumps({'python': sum(expected.values()), 'typescript': sum(actual.values()),
                  'only_python': list((expected - actual).items()), 'only_typescript': list((actual - expected).items())}, ensure_ascii=False, indent=2))
assert expected == actual
