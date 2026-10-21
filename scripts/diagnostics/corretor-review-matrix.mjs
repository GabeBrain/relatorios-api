// Confronto local do arquivo revisado com regras reais. Sem modelo, banco ou limpeza do original.
import {buildSync} from 'esbuild';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const input=resolve(process.argv[2]??'../../_UPLOADS_TESTE/Corretor_Guajajaras_BH_01745-2026/Brain_Vocacional_Vertical_Guajajaras_Belo_Horizonte_MG_v3_14Out_10h53.pptx');
const expected='b2e01406c6be565ce450b8a67d078084feba0405661e8ff188a50b5a42253191';
const sha=createHash('sha256').update(readFileSync(input)).digest('hex');
if(sha!==expected)throw Error('Fonte diferente do caso congelado.');
const out=resolve('.local-inputs/review-luna-20261021');mkdirSync(out,{recursive:true});
const code=`import {readFileSync,writeFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {pptxToIr} from './src/features/corretor/lib/audit/pptx-to-ir';
import {semanticReviewFindings,categoryCoverageFindings} from './src/features/corretor/lib/v3/semantic-review';
import {binsFromColumns,detectBinGap} from './src/features/corretor/lib/audit/engine';
export async function run(input,out,sha){
 const ir=await pptxToIr(new Uint8Array(readFileSync(input)),input,new(new JSDOM('').window.DOMParser)());
 // Transcrições pequenas verificadas visualmente no diagnóstico: não são extração Luna.
 const property={slide:32,source:'vision',sha1:'derived-s32',secao:'SOCIO',titulo:'Condição de ocupação',table:{title:'Condição de ocupação',columns:['Situação','Até 1 km','Até 2 km'],rows:[['Próprio',68.5,72.6],['Alugado',27.8,23.4],['Cedido',3.7,4]],colKinds:['label','share','share']}};
 const vertical={slide:30,source:'vision',sha1:'derived-s30',secao:'SOCIO',titulo:'Tipologia',table:{title:'Tipologia',columns:['Tipo','Até 1 km','Até 2 km'],rows:[['Apartamentos',95.7,84.9]],colKinds:['label','share','share']}};
 const count={slide:66,source:'vision',sha1:'derived-s66',secao:'LACUNAS',titulo:'Garagem',sumFindingId:'derived-sum-66',table:{title:'Oferta Lançada',columns:['Garagem','Unidades'],rows:[['Sem vaga',15],['1 vaga',818],['2 vagas',257],['3 vagas',0]],totals:['Total',1204],colKinds:['label','count']}};
 const rate={...count,sumFindingId:undefined,table:{title:'Disponibilidade',columns:['Garagem','Taxa'],rows:[['Rotativa',4.4]],colKinds:['label','rate']}};
 const result={sourceSha256:sha,paidCalls:0,remoteWrites:0,evidenceOrigin:'PPTX real + transcrições manuais derivadas; não é extração Luna',slides:ir.n_slides,reviewShapes:ir.slides.reduce((n,s)=>n+s.notas_revisao.length,0),slide105Facts:ir.slides.find(s=>s.n===105).textos,semanticFindings:semanticReviewFindings(ir,[property,vertical]),categories:categoryCoverageFindings([count,rate]).findings,interval63:detectBinGap(binsFromColumns(['Até 60 m²','31 a 40 m²','41 a 50 m²','51 a 60 m²']))};
 writeFileSync(out+'/guajajaras-after-ir.json',JSON.stringify(ir,null,2));writeFileSync(out+'/matrix-observed.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({out,slides:result.slides,reviewShapes:result.reviewShapes,semantic:result.semanticFindings.map(f=>f.id),categories:result.categories.length,interval:!!result.interval63.description,paidCalls:0}));
}`;
buildSync({stdin:{contents:code,loader:'ts',resolveDir:process.cwd()},platform:'node',format:'esm',packages:'external',bundle:true,outfile:out+'/matrix.mjs'});
await(await import(pathToFileURL(out+'/matrix.mjs').href)).run(input,out,sha);
