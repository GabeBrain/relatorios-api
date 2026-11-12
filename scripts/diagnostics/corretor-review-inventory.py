"""Revisão offline: nunca conecta a banco/IA. Brutos permanecem em .local-inputs."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter

p = argparse.ArgumentParser()
p.add_argument('--se-root', required=True)
p.add_argument('--out', default='.local-inputs/revisao-ampliada-20261014')
args = p.parse_args()
root = pathlib.Path(args.se_root).resolve()
out = pathlib.Path(args.out); out.mkdir(parents=True, exist_ok=True)
load = lambda path: json.loads(pathlib.Path(path).read_text(encoding='utf-8-sig'))
bank = load('.local-inputs/audit-20261013/bank.json')
targets = {v['sha1']: s['study']['nome'] for s in bank for v in s['study'].get('study_versions', [])}
scan = subprocess.run(['rg', '--files', '--hidden', '--no-ignore', '-g', '*.pptx', '-g', '!**/node_modules/**', '-g', '!**/.git/**'], cwd=root, capture_output=True, text=True, encoding='utf-8')
materials, issues = [], []
for name in scan.stdout.splitlines():
    path = root / name
    try:
        raw = path.read_bytes(); sha1 = hashlib.sha1(raw).hexdigest()
        texts = []
        with zipfile.ZipFile(path) as z:
            for part in z.namelist():
                if (part.startswith('ppt/slides/slide') and part.endswith('.xml')) or part.endswith('.svg'):
                    node = ET.fromstring(z.read(part))
                    text = ' '.join((n.text or '') for n in node.iter() if n.tag.rsplit('}', 1)[-1] in ('t', 'text', 'tspan'))
                    texts.append((part, text))
        matches = [part for part, text in texts if ('Goiânia' in text or 'Goiania' in text) and '17.566' in text and '56.808' in text]
        materials.append(dict(path=name.replace('\\', '/'), sha1=sha1, sha256=hashlib.sha256(raw).hexdigest(), studyMatch=targets.get(sha1), danieleCandidateParts=matches))
    except Exception as e:
        issues.append(dict(path=name, error=str(e)))
audit = load('.local-inputs/final-paid-audit.json')
text_corpus = load('src/features/corretor/lib/v3/__tests__/fixtures/review-v069-text.json')
reviewed = load('.local-inputs/review-v069-text-result.json')
original_text = {(c['id'], i['ruleId']): i for c in text_corpus for i in c['items']}
views = {(c['id'], rule): i for c in reviewed for i in c['items'] for rule in i.get('duplicateRuleIds', [i['ruleId']])}
known_fp = {'iatxt-70-spelling-1p3nh6a', 'iatxt-87-spelling-9grnbp', 'iavis-format-34bf9eac86', 'iavis-format-5039684ae6', 'iavis-pct-9767fb66f7-0'}
positive_text = ('OBSERTÓRIO', 'Avalição', 'são esperado', 'Churrasqueria', 'uma uma', 'Shor Stay', 'um custos', 'São José dos Campo', 'espera-se maiores taxas')
visual = load('docs/features/corretor-vocacionais/calibracao/automacao/review-images-2026-10-13.json')
visual_map = {(i['caseId'], i['ruleId']): i for i in visual['cases']}
vision_views = {i['ruleId']: next((f for f in i['findings'] if f['id'] == i['ruleId']), {}) for i in load('.local-inputs/review-v069-vision-result.json')}
rows = []
for c in audit:
    for f in c['findings']:
        key = (c['id'], f['rule_id']); item = original_text.get(key); view = views.get(key)
        v = visual_map.get(key); finding = f['payload']
        verdict = 'não adjudicado'
        if f.get('verdict') or f.get('verdict_revisado'): verdict = 'decisão humana preservada'
        elif f['rule_id'] in known_fp: verdict = 'falso positivo da acusação original'
        elif item:
            ev = item['finding'].get('viz', {}).get('evidence', '')
            if view and view['finding']['title'] == 'Texto antigo não conferido nesta versão': verdict = 'evidência antiga sem âncora disponível'
            elif any(t in ev for t in positive_text): verdict = 'erro textual confirmado no IR'
            elif c['id'] == 'v2' and f['slide_ref'] == 's9': verdict = 'inconsistência interna de nome, oficial não determinado'
            else: verdict = 'editorial/contexto não comprovado'
        elif v: verdict = v['classification']
        elif f['rule_id'] in ('source-23-domicilios-brasil-unidade-domicilios', 'source-24-domicilios-brasil-unidade-domicilios', 'source-22-domicilios-brasil-unidade-domicilios'):
            verdict = 'unidade errada confirmada no IR e fonte D9/G9'
        after = view['finding'] if view else vision_views.get(f['rule_id'])
        rows.append(dict(case=c['id'], ruleId=f['rule_id'], slide=f['slide_ref'], type=f['tipo'], status=f['status'], humanVerdict=f.get('verdict'), humanReviewed=f.get('verdict_revisado'), beforeConfidence=finding.get('confidence'), afterConfidence=after.get('confidence') if after else None, groupedIds=view.get('duplicateRuleIds', []) if view else [], evidenceSha1=finding.get('evidenceSha1'), review=verdict, limitation='Snapshot de 13/10; estado atual do banco não consultado. Encerramento automático não comprova correção.'))
result = dict(baseline='6073ba3', method='offline; sem IA/banco', materialCount=len(materials), scanExitCode=scan.returncode, scanStderr=scan.stderr, materialReadErrors=issues, danieleCandidates=[m for m in materials if m['danieleCandidateParts']], matchedStudies=sorted(set(m['studyMatch'] for m in materials if m['studyMatch'])), records=len(rows), summary=dict(Counter(r['review'] for r in rows)), perCase={c['id']:dict(records=len(c['findings']), states=dict(Counter(f['status'] for f in c['findings']))) for c in audit})
for name, data in [('materials.json', materials), ('findings.json', rows), ('summary.json', result)]:
    (out / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2))
