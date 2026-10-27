import XLSX from 'xlsx';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assessBuilding, candidateOutput, monthIndex} from '../../src/features/estimativas-vendas/operational/selection.mjs';
import {projetar} from '../../src/features/estimativas-vendas/expanded/reference/horizontal.js';
import {simulate} from '../../src/features/estimativas-vendas/expanded/reference/vertical.js';
const root='.local-inputs/estimativas-vendas';
const out=`${root}/operacional-20261027`;
const ref='src/features/estimativas-vendas/expanded/reference';
const parameters=JSON.parse(await readFile(`${ref}/horizontal-parameters.json`,'utf8'));
const cohorts=JSON.parse(await readFile(`${ref}/vertical-cohorts.json`,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
function period(v) {
  if(typeof v!=='string') return null;
  const m=v.match(/^(?:\d{2}\/)?(\d{2})\/(\d{4})$/);
  return m ? `${m[2]}-${m[1]}` : null;
}
const selection=[], sources=[], sample=[], inputs=[];
for(const name of ['horizontal.xlsb','cuiaba.xlsx','belo-horizonte.xlsx']) {
  const path=`${root}/edgar-drive-20261022/${name}`;
  const bytes=await readFile(path); const w=XLSX.read(bytes,{type:'buffer'});
  const sheet=w.SheetNames[0], raw=XLSX.utils.sheet_to_json(w.Sheets[sheet],{defval:null});
  sources.push({path,sha256:sha(bytes),sheet,rows:raw.length});
  const groups=new Map();
  raw.forEach((r,i)=>{
    const row={buildingId:String(r['ID Empreendimento']??''), typologyId:String(r['ID Tipologia']??''),
      name:r.Empreendimento,city:r.Cidade,type:r.Tipo,pattern:r['Padrão'],status:r.Status,
      period:period(r['Mês de referência']),release:period(r['Data de lançamento']),
      units:r['Qtd Lançada'],stock:r['Estoque Final'],net:r['Venda Líquida'],
      estimated:r['Foi estimado?']==='Sim'?true:r['Foi estimado?']==='Não'?false:null,
      sourceRow:`${name}|${sheet}|${i+2}`};
    if(!groups.has(row.buildingId)) groups.set(row.buildingId,[]);
    groups.get(row.buildingId).push(row);
  });
  for(const [id,rows] of [...groups].sort((a,b)=>a[0].localeCompare(b[0],'en',{numeric:true}))) {
    // Evaluate both hypotheses; neither establishes the city's authoritative cadence.
    for(const cadence of [1,3]) {
      const s=assessBuilding(rows,{cutoff:'2026-09',cadence});
      const item={source:name,buildingId:id,name:rows[0].name,city:rows[0].city,type:rows[0].type,...s};
      selection.push(item);
      if(!s.calculationAllowed) continue;
      const group=`${rows[0].type}|${cadence}`;
      if(sample.filter(x=>x.sampleGroup===group).length>=3) continue;
      const o=s.origin; let cumulative,method;
      if(o.type==='Horizontal') {
        const f=projetar(parameters,o.pattern,o.units,o.age,o.sold);
        cumulative=f.tabela[cadence-1]?.acumulado??f.tabela.at(-1)?.acumulado;
        method={id:'finotti-horizontal',version:'finotti-drive-2026-10-22',k:f.resumo?.k};
      } else {
        const f=simulate(cohorts,o.pattern,o.units,o.age,o.sold);
        if(!f.neighbors) continue;
        cumulative=f.central[cadence-1]?.cum??f.central.at(-1)?.cum;
        method={id:'finotti-vertical',version:'finotti-drive-2026-10-22',peers:f.neighbors};
      }
      const candidate=candidateOutput(s,cumulative,method);
      sample.push({...candidate,name:o.name,sampleGroup:group,source:name,warnings:s.warnings});
      inputs.push(...rows.filter(r=>s.sourceRows.includes(r.sourceRow)));
    }
  }
}
const counts={}; for(const r of selection) counts[r.decision]=(counts[r.decision]??0)+1;
const reasons={}; for(const r of selection) for(const reason of r.reasons) reasons[reason]=(reasons[reason]??0)+1;
const models=[];for(const f of ['horizontal.js','vertical.js','horizontal-parameters.json','vertical-cohorts.json']) models.push({file:f,sha256:sha(await readFile(`${ref}/${f}`))});
const report={label:'CANDIDATO INTERNO — NÃO IMPORTAR',asOf:'2026-10-27',cutoff:'2026-09',
  target:'2026-10 mensal / 2026-12 trimestral; hipóteses, não competência operacional aprovada',
  sources,models,selectionCounts:counts,reasonCounts:reasons,
  uniqueBuildings:new Set(selection.map(r=>`${r.source}|${r.buildingId}`)).size,
  sampleSize:sample.length,importable:0,sample,selection,inputs,
  limitations:['Snapshot de 22/10; ausência de coleta atual não verificada','Duas hipóteses de cadência por empreendimento, não somar como pessoas distintas','Quatro posições consecutivas não estimadas e oferta estável: política conservadora candidata','Multitipologias não rateadas','Sem divisão automática da metade','Preço/distratos sem preenchimento; null não é zero']};
await mkdir(out,{recursive:true});await writeFile(`${out}/amostra.json`,JSON.stringify(report,null,2));
const evidence={...report};delete evidence.selection;delete evidence.inputs;delete evidence.sample;
await writeFile('docs/features/estimativas-vendas/EVIDENCIAS_AMOSTRA_OPERACIONAL_2026-10-27.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify({counts,reasons,sampleSize:sample.length,groups:sample.map(r=>r.sampleGroup),importable:0},null,2));
