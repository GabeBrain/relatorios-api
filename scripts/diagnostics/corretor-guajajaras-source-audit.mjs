// Diagnóstico local de cobertura. Não chama modelo, backend ou browser.
// node scripts/diagnostics/corretor-guajajaras-source-audit.mjs "caminho/do/estudo.pptx"
import {buildSync} from 'esbuild';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const input=process.argv[2];
if(!input)throw new Error('Informe o caminho do PowerPoint. Nenhuma geração é executada.');
const original=resolve(input),sha256=createHash('sha256').update(readFileSync(original)).digest('hex');
const out=join(repo,'.local-inputs','guajajaras-20261021','source-audit-'+sha256.slice(0,12));
mkdirSync(out,{recursive:true});
const code=`import {readFileSync,writeFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {pptxToIr} from './src/features/corretor/lib/audit/pptx-to-ir';
import {recommendationSource} from './src/features/corretor/lib/v3/consulting-suggestion';
export async function audit(input,out,sha256){
 const ir=await pptxToIr(new Uint8Array(readFileSync(input)),input,new (new JSDOM('').window.DOMParser)());
 const source=recommendationSource(ir);
 const sent=new Map(source.slides.map(s=>[s.n,s.conteudo]));
 const summary={source_sha256:sha256,source_sha1:ir.sha1,slides:ir.n_slides,
  readable:source.slides.length,withoutText:source.withoutText,limited:source.limitedSlides,
  sourceChars:source.slides.reduce((n,s)=>n+s.conteudo.length,0),
  nativeTables:ir.slides.reduce((n,s)=>n+s.tabelas.length,0),
  excludedSlides:ir.slides.filter(s=>!sent.has(s.n)).map(s=>s.n),
  separatedReviewShapes:ir.slides.reduce((n,s)=>n+(s.notas_revisao?.length??0),0),
  svgCoverage:ir.slides.filter(s=>s.textos_svg?.length).map(s=>({slide:s.n,
   svgChars:s.textos_svg.join('\\n').length,sentPayload:sent.get(s.n)??null})),
  paidCalls:0,remoteWrites:0};
 writeFileSync(out+'/ir.json',JSON.stringify(ir,null,2));
 writeFileSync(out+'/source.json',JSON.stringify(source,null,2));
 writeFileSync(out+'/summary.json',JSON.stringify(summary,null,2));
 console.log(JSON.stringify({out,...summary}));
}`;
const bundle=join(out,'extractor.mjs');
buildSync({stdin:{contents:code,loader:'ts',resolveDir:repo},bundle:true,platform:'node',format:'esm',packages:'external',outfile:bundle});
await (await import(pathToFileURL(bundle).href)).audit(original,out,sha256);
