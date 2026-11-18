// Prepare/apply the route in the separate Sistema Quanti checkout. No commit/deploy.
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const target=process.argv[2];if(!target)throw new Error('Usage: node install.mjs <Sistema Quanti/gcp/bigquery-proxy> [--apply]');
const path=resolve(target,'src/server.mjs'), source=await readFile(path,'utf8');
if(source.includes('createCagedHandler'))throw new Error('CAGED already installed; review manually.');
const marker='  return createServer(async (request, response) => {';
if(source.split(marker).length!==2)throw new Error('Proxy changed: review integration manually.');
const updated=`import { createCagedHandler } from './caged.mjs';\n`+source.replace(marker,`  const cagedHandler = createCagedHandler({ verifySignature, hmacSecret, nowMs,
    table: process.env.CAGED_TABLE,
    query: (sql, parameters) => {
      if (!billingProject?.trim()) throw new Error('bigquery_not_configured');
      return raisQuery(billingProject.trim(), sql, parameters, BigInt(100_000_000), 'caged_mte');
    },
  });
${marker}
    if (await cagedHandler(request, response)) return;`);
if(process.argv.includes('--apply')){
  await copyFile(resolve(dirname(fileURLToPath(import.meta.url)),'caged.mjs'),resolve(target,'src/caged.mjs'));
  await writeFile(path,updated);console.log('CAGED route installed locally; no deployment performed.');
}else{console.log('Compatible proxy entry point found. Pass --apply to write the module and mount the route.');}
