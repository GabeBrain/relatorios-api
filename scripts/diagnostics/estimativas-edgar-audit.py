"""Read-only audit of IVV sources. Never consumes price or recalibrates deployed models."""
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime, date
import hashlib
import json
import numpy as np
from openpyxl import load_workbook

ROOT = Path('.local-inputs/estimativas-vendas/edgar-drive-20261022')
def month(v):
    if isinstance(v, (date, datetime)): return v.year * 12 + v.month - 1
    for fmt in ('%d/%m/%Y', '%m/%Y', '%Y-%m-%d'):
        try:
            d = datetime.strptime(str(v), fmt)
            return d.year * 12 + d.month - 1
        except ValueError: pass
    return None

def label(m): return f'{m // 12}-{m % 12 + 1:02}' if m is not None else None
def numeric(v):
    try: return float(v) if v is not None else None
    except (TypeError, ValueError): return None

def audit(filename):
    source = ROOT / filename
    if filename.endswith('.xlsb'):
        rows = iter(json.loads((ROOT / 'horizontal-MyWorkSheet1.json').read_text(encoding='utf-8')))
        schema = list(next(iter(json.loads((ROOT / 'horizontal-MyWorkSheet1.json').read_text(encoding='utf-8')))))
        sheets = ['MyWorkSheet-1']
        workbook = None
    else:
        workbook = load_workbook(source, read_only=True, data_only=True)
        sheets = workbook.sheetnames
        values = workbook[sheets[0]].iter_rows(values_only=True)
        schema = list(next(values))
        rows = (dict(zip(schema, row)) for row in values)
    projects = defaultdict(list)
    duplicates = 0
    keys = set()
    counts = Counter()
    cities, types, patterns, flags, statuses = Counter(), Counter(), Counter(), Counter(), Counter()
    launch_formats = Counter()
    minimum = maximum = None
    for row in rows:
        eid, tid = row.get('ID Empreendimento'), row.get('ID Tipologia')
        if eid is None or tid is None: continue
        ref, release = month(row.get('Mês de referência')), month(row.get('Data de lançamento'))
        if ref is None or release is None: counts['invalidDates'] += 1; continue
        qty, stock, net = (numeric(row.get(k)) for k in ['Qtd Lançada','Estoque Final','Venda Líquida'])
        gross, cancel = (numeric(row.get(k)) for k in ['Venda Bruta','Distrato'])
        age = ref - release + 1
        minimum = ref if minimum is None else min(minimum, ref)
        maximum = ref if maximum is None else max(maximum, ref)
        counts['rows'] += 1
        key = (eid,tid,ref)
        if key in keys: duplicates += 1
        keys.add(key)
        cities[row.get('Cidade')] += 1;types[row.get('Tipo')] += 1
        patterns[row.get('Padrão')] += 1;flags[row.get('Foi estimado?')] += 1;statuses[row.get('Status')] += 1
        launch_formats['DD/MM/YYYY' if len(str(row.get('Data de lançamento'))) == 10 else 'other'] += 1
        if numeric(row.get('Tempo em venda')) != age: counts['ageMismatchRows'] += 1
        if qty is None or qty <= 0: counts['invalidQtyRows'] += 1
        if stock is None or qty is None or stock < 0 or stock > qty: counts['invalidStockRows'] += 1
        if net is not None and net < 0: counts['negativeNetRows'] += 1
        if gross is not None and cancel is not None and net != gross - cancel: counts['grossNetMismatchRows'] += 1
        projects[int(eid)].append(dict(tid=int(tid),ref=ref,release=release,qty=qty,stock=stock,net=net,
            pattern=row.get('Padrão'),status=row.get('Status'),estimated=row.get('Foi estimado?')))
    if workbook: workbook.close()
    cadence, comparisons = Counter(), Counter()
    revisions, changed_flags = 0, 0
    for records in projects.values():
        if len({r['estimated'] for r in records}) > 1: changed_flags += 1
        by_typ = defaultdict(list)
        for r in records: by_typ[r['tid']].append(r)
        for group in by_typ.values():
            group.sort(key=lambda r:r['ref'])
            if len({r['qty'] for r in group}) > 1: revisions += 1
            for previous,current in zip(group,group[1:]):
                distance = current['ref']-previous['ref'];cadence[str(distance)] += 1
                if previous['qty'] == current['qty'] and previous['stock'] is not None and current['stock'] is not None and current['net'] is not None:
                    comparisons['comparableIntervals'] += 1
                    if previous['stock']-current['stock'] != current['net']: comparisons['stockChangeNotEqualReportedNet'] += 1
    report = {'file':filename,'bytes':source.stat().st_size,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'sheets':sheets,'columns':len(schema) + (1 if filename.endswith('.xlsb') else 0),'headersExcludingPrice':[h for h in schema if h != 'Preço'],
        'projects':len(projects),'typologyPeriodDuplicates':duplicates,'firstPeriod':label(minimum),'lastPeriod':label(maximum),
        'counts':dict(counts),'cities':dict(cities),'types':dict(types),'patterns':dict(patterns),'estimatedFlags':dict(flags),
        'statuses':dict(statuses),'launchDateFormats':dict(launch_formats),'cadenceByMonthGap':dict(cadence),
        'typologiesWithQuantityRevision':revisions,'projectsWithChangingEstimatedFlag':changed_flags,'flowConsistency':dict(comparisons)}
    return report, projects

reports=[];all_data={}
for name in ['horizontal.xlsb','cuiaba.xlsx','florianopolis.xlsx','belo-horizonte.xlsx','rio-de-janeiro.xlsx']:
    r, projects = audit(name);reports.append(r);all_data[name]=projects
    print(json.dumps({'file':name,'rows':r['counts']['rows'],'projects':r['projects'],'periods':[r['firstPeriod'],r['lastPeriod']],'cities':list(r['cities'])},ensure_ascii=True),flush=True)

# Independently reconstruct documented horizontal preparation counts and panel dimensions.
raw=all_data['horizontal.xlsb'];cut=month('09/2026');threshold=month('01/2020')
launched={eid:[r for r in rows if r['release'] >= threshold] for eid,rows in raw.items() if any(r['release'] >= threshold for r in rows)}
not_suspended={eid:rows for eid,rows in launched.items() if not any(r['status']=='Suspenso' for r in rows)}
accepted={};excluded_typologies=0;panel_months=0
for eid,rows in not_suspended.items():
    by_typ=defaultdict(list)
    for r in rows: by_typ[r['tid']].append(r)
    included=[]
    for group in by_typ.values():
        group.sort(key=lambda r:r['ref'])
        if group[0]['ref'] != group[0]['release']: excluded_typologies += 1;continue
        included.append(group)
    if not included: continue
    units=sum(group[-1]['qty'] for group in included)
    if units < 10: continue
    age=cut-included[0][0]['release']+1
    if age <= 0: continue
    stock=np.zeros(age)
    for group in included:
        times=[r['ref']-group[0]['release'] for r in group if r['ref'] <= cut]
        values=[r['stock'] for r in group if r['ref'] <= cut]
        stock+=np.interp(np.arange(age),times,values)
    accepted[eid]={'age':age,'units':units,'soldFraction':np.maximum(0,1-stock/units).tolist()}
    panel_months += age
horizontal={'launchedFrom2020':len(launched),'afterSuspendedExclusion':len(not_suspended),'excludedTypologiesWithoutLaunchMonth':excluded_typologies,'acceptedProjects':len(accepted),'panelMonths':panel_months,'expectedProjects':366,'expectedPanelMonths':15164}
horizontal['matchesPublishedCounts']=horizontal['acceptedProjects']==366 and panel_months==15164

# Compare all common raw rows with the existing API snapshot, without assuming equal dataset scope.
api_path=Path('.local-inputs/estimativas-vendas/expanded/PR-Curitiba-Horizontal-snapshot.json')
parity={'source':'existing authenticated Curitiba horizontal API snapshot','available':api_path.exists()}
if api_path.exists():
    excel={(eid,r['tid'],r['ref']):r for eid,rows in raw.items() for r in rows}
    matches=Counter();deltas=Counter();ids=set();common=0
    for b in json.loads(api_path.read_text(encoding='utf-8')):
        eid=int(b.get('building_id',b.get('id')))
        for r in b['typologies_history']:
            ref=month(str(r['period'])[:10]); key=(eid,int(r['typology_id']),ref)
            if key not in excel:continue
            common+=1;ids.add(eid);e=excel[key]
            for field,api_field in [('qty','qty'),('stock','typology_stock'),('net','sold_in_period')]:
                if e[field]==numeric(r.get(api_field)):matches[field]+=1
                else:deltas[field]+=1
    parity.update({'commonKeys':common,'commonProjects':len(ids),'equalByField':dict(matches),'differentByField':dict(deltas)})

original=json.loads(Path('.local-inputs/estimativas-vendas/finotti-drive-20261022/vertical/referencia/simdata.json').read_text(encoding='utf-8'))
model_ids=set(int(x[0]) for pool in original['pools'].values() for x in pool)
source_ids=set(eid for data in all_data.values() for eid in data)
overlap={'referenceProjects':len(model_ids),'uploadedProjects':len(source_ids),'commonIds':len(source_ids&model_ids),'referenceIdsNotInUploads':len(model_ids-source_ids)}
result={'reports':reports,'horizontalReproduction':horizontal,'existingApiParity':parity,'verticalReferenceIdOverlap':overlap,'notes':['Price excluded from calculations.','Offline prep may interpolate and use final/max units; live inference uses reported stock at cutoff.','Reference counts and input format do not prove predictive accuracy.']}
(ROOT/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'horizontal':horizontal,'apiParity':parity,'referenceOverlap':overlap},ensure_ascii=True),flush=True)
if not horizontal['matchesPublishedCounts']:
    raise SystemExit('Horizontal preparation no longer matches the published 366 projects / 15164 months.')
