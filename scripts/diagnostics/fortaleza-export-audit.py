"""Inspect only locally exported synthetic Fortaleza files; never contact providers."""
import argparse
import hashlib
import json
import re
import struct
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile
import pymupdf

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--folder',type=Path,default=Path('.local-inputs/relatorios-lucas/fortaleza/export-2026-11-11'))
args=p.parse_args()
reference=json.loads(Path('src/features/relatorios-institucionais/fortaleza/references.json').read_text(encoding='utf-8'))[1]
forbidden={'token','authorization','headers','key','typologies_history','records'}
def audit(value):
    if isinstance(value,dict):
        assert not (set(value)&forbidden),'Private field in audit'
        for child in value.values():audit(child)
    elif isinstance(value,list):
        for child in value:audit(child)
def report(value):
    audit(value)
    assert value['report']['reference']['sha256']==reference['sha256']
    assert value['report']['reference']['slideCount']==60 and not value['report']['homologated']
    assert len(value['report']['slides'])==60
results=[]
for mode in ['faithful','editable']:
    file=args.folder/f'mensal-{mode}.pptx'
    with ZipFile(file) as z:
        slides=sorted([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)],key=lambda n:int(re.search(r'(\d+)\.xml',n)[1]))
        assert len(slides)==60
        rels={node.get('Id'):node.get('Target') for node in ET.fromstring(z.read('ppt/_rels/presentation.xml.rels'))}
        order=[rels[node.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')] for node in ET.fromstring(z.read('ppt/presentation.xml')).iter() if node.tag=='{http://schemas.openxmlformats.org/presentationml/2006/main}sldId']
        assert len(order)==60 and all(target.endswith(f'/slide{i+1}.xml') for i,target in enumerate(order))
        value=json.loads(ET.fromstring(z.read('customXml/fortaleza-audit.xml')).text)
        report(value);assert value['mode']==mode
        counts=[sum(1 for node in ET.fromstring(z.read(name)).iter() if node.tag.endswith('}t')) for name in slides]
        if mode=='editable':assert counts[2]>0 and counts[56]>0
        else:assert not any(counts)
        sizes=[struct.unpack('>II',z.read(name)[16:24]) for name in z.namelist() if re.fullmatch(r'ppt/media/image[\d-]+\.png',name)]
        assert sizes and all(size==(2560,1440) for size in sizes)
    results.append({'file':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'pages':60,'bytes':file.stat().st_size,'nativeTextBoxes':sum(counts),'images':len(sizes)})
file=args.folder/'mensal.pdf'
with pymupdf.open(file) as pdf:
    assert len(pdf)==60 and pdf.embfile_names()==['fortaleza-diagnostico.json']
    report(json.loads(pdf.embfile_get('fortaleza-diagnostico.json')))
    assert all(abs(page.rect.width/page.rect.height-16/9)<.001 for page in pdf)
results.append({'file':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'pages':60,'bytes':file.stat().st_size,'auditAttachment':True})
out={'source':'synthetic local exports; not a market validation','referenceSha256':reference['sha256'],'artifacts':results,'privateFieldsAbsent':True}
(args.folder/'artifact-checks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out,ensure_ascii=True))
