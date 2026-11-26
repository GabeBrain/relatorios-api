"""Fetch the same IBGE census table/variable/vintage for municipalities and UFs."""
import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

root = Path('.local-inputs/relatorios-lucas/modelo-02/population-2022')
root.mkdir(parents=True, exist_ok=True)
urls = {level:f'https://apisidra.ibge.gov.br/values/t/4714/n{level}/all/v/93/p/2022' for level in [3,6]}
data = {}
hashes = {}
for level,url in urls.items():
    raw = urllib.request.urlopen(url, timeout=60).read()
    (root / f'ibge-4714-n{level}.json').write_bytes(raw)
    hashes[str(level)] = hashlib.sha256(raw).hexdigest()
    records = json.loads(raw)
    if not isinstance(records,list) or not records or 'Erro' in records[0]:
        raise ValueError(records)
    data[level] = records[1:]
    assert all(r['D2C']=='93' and r['D3C']=='2022' and r['V'].isdigit() for r in data[level])
ufs_by_code = {'11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO','21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR','42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'}
states = {ufs_by_code[r['D1C']]:{'name':r['D1N'],'population':int(r['V'])} for r in data[3]}
cities = {}
for r in data[6]:
    uf = ufs_by_code[r['D1C'][:2]]
    name = r['D1N'].removesuffix(f' ({uf})').removesuffix(f' - {uf}')
    cities.setdefault(uf,[]).append([r['D1C'],name,int(r['V'])])
assert len(states)==27
for uf,rows in cities.items():
    assert sum(r[2] for r in rows)==states[uf]['population'],uf
payload = {'source':{'organization':'IBGE','product':'Censo Demográfico 2022','table':'4714','variable':'93','period':'2022','referenceDate':'2022-08-01','retrievedAt':datetime.now(timezone.utc).isoformat(),'url':'https://sidra.ibge.gov.br/tabela/4714','requests':list(urls.values()),'sha256':hashes},'states':states,'cities':cities}
out = Path('src/features/relatorios-institucionais/modelo-02/population-2022.json')
out.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(json.dumps({'states':len(states),'cities':sum(len(v) for v in cities.values()),'Curitiba':next(r for r in cities['PR'] if r[1]=='Curitiba'),'PR':states['PR']},ensure_ascii=False))
