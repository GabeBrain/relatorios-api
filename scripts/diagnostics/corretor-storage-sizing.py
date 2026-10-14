"""Medição de arquivos locais e projeção explícita, sem rede nem acesso ao banco."""
import pathlib,json,statistics,hashlib,zipfile,argparse
parser=argparse.ArgumentParser()
parser.add_argument('--input-root', required=True)
args=parser.parse_args()
root=pathlib.Path(args.input_root)
manifest=json.loads(pathlib.Path('docs/features/corretor-vocacionais/calibracao/automacao/cases.json').read_text(encoding='utf-8'))
rows=[]; unique={}
for c in manifest['cases']:
 p=root/c['pptx']; files=[root/c['excel']/x['name'] for x in c['excelFiles']]
 with zipfile.ZipFile(p) as z: slides=sum(n.startswith('ppt/slides/slide') and n.endswith('.xml') for n in z.namelist())
 for f in [p]+files: unique[hashlib.sha256(f.read_bytes()).hexdigest()]=f.stat().st_size
 rows.append(dict(id=c['id'],pptxBytes=p.stat().st_size,excelBytes=sum(f.stat().st_size for f in files),excelFiles=len(files),slides=slides))
bank=json.loads(pathlib.Path('.local-inputs/audit-20261013/bank.json').read_text(encoding='utf-8'))
result=dict(unit='GB/MB decimais',sample=rows,meanPptxMB=statistics.mean(r['pptxBytes'] for r in rows)/1e6,meanExcelMB=statistics.mean(r['excelBytes'] for r in rows)/1e6,meanSlides=statistics.mean(r['slides'] for r in rows),uniqueOriginalGB=sum(unique.values())/1e9,snapshotStudies=len(bank),snapshotJsonMB=len(json.dumps(bank,ensure_ascii=False).encode())/1e6,scenarios=[])
for name,mb in [('uma_versao',150),('tres_versoes',450),('seis_versoes',900)]:
 months=[]
 for m in [1,6,12,24,36]:
  studies=14+520*m/12; gb=studies*mb/1000
  months.append(dict(month=m,studies=round(studies,2),GB=round(gb,3),storageMarginalUSD=round(max(0,gb-100)*.0213,3),storageWithoutQuotaUSD=round(gb*.0213,3)))
 result['scenarios'].append(dict(name=name,MBPerStudy=mb,perStudyMonthUSD=mb/1000*.0213,months=months))
out=pathlib.Path('docs/features/corretor-vocacionais/design');out.mkdir(exist_ok=True)
(out/'ARMAZENAMENTO_MEDICAO_2026-10-14.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='scenarios'},ensure_ascii=False,indent=2))
