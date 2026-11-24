import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {createCalculator} from '../../src/features/relatorios-institucionais/modelo-03/calculate.ts';
import {DATA_DEFINITIONS} from '../../src/features/relatorios-institucionais/modelo-03/blueprint.ts';

const input=process.argv[2];if(!input)throw new Error('Informe o diagnóstico JSON local.');
const raw=await readFile(input),audit=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
const sources=audit.sources.map(source=>{
 const rows=source.metric==='details'?[...new Set(source.observations.map(r=>r.group))].map((group,i)=>({building_id:`aggregate-only-${i}`,release_date:`${source.observedMonths[0]}-01`,typologies_history:source.observations.filter(r=>r.group===group).map(r=>({period:`${r.month}-01`,typology_id:i+1,pattern:group,typology_stock:r.values.stock,sold_in_period:r.values.liquid_sales}))})):source.observations.map(r=>({period:`${r.month}-01`,group:r.group,...r.values}));
 return {...source,rows};
});
const c=createCalculator(audit.selection,sources),pages=[49,51,52,53,57,59,61,63,64,65,69,70,72,76,77,78];
const slides=pages.map(page=>{const s=c.evaluate(DATA_DEFINITIONS.find(d=>d.sourcePage===page));return {referencePage:page,status:s.status,issue:s.issue,warnings:s.warnings,tables:s.tables};});
const output=resolve('.local-inputs/relatorios-lucas/modelo-03/replay-curitiba-3T2026.json');await mkdir(resolve(output,'..'),{recursive:true});
await writeFile(output,JSON.stringify({inputSha256:createHash('sha256').update(raw).digest('hex'),method:'Replay de agregados temporais do JSON real. Detalhes são ponte de agregados por grupo para verificar casos zero; não reproduzem nem validam os cadastros/preços individuais. Não reconstitui os sete slides detalhados.',slides},null,2));
console.log(JSON.stringify({output,available:slides.filter(s=>s.status==='available').length,pending:slides.filter(s=>s.status!=='available').map(s=>({page:s.referencePage,issue:s.issue})),lastRows:slides.map(s=>({page:s.referencePage,last:s.tables[0]?.rows.at(-1)}))}));
