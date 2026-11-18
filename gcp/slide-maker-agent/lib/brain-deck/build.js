// CLI da brain-deck, usada pelo agente dentro do workspace do trabalho:
//   node /app/lib/brain-deck/build.js trabalho/deck_spec.json saida/Brain_<slug>_v<N>.pptx [--marca /app/marca]
// A pasta de marca vem de --marca, da variável BRAIN_MARCA ou do padrão /app/marca.
// Imagens do spec são relativas ao diretório atual (o workspace do trabalho).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { construirDeck } from './index.js';

const args = process.argv.slice(2);
const iMarca = args.indexOf('--marca');
const marca = iMarca >= 0 ? args.splice(iMarca, 2)[1] : (process.env.BRAIN_MARCA ?? '/app/marca');
const [specArq, saida] = args;
if (!specArq || !saida || !saida.endsWith('.pptx')) {
  console.error('uso: node lib/brain-deck/build.js <deck_spec.json> <saida.pptx> [--marca <pasta>]');
  process.exit(2);
}
try {
  const spec = JSON.parse(readFileSync(specArq, 'utf8'));
  const r = await construirDeck(spec, { marca: resolve(marca), base: process.cwd(), saida });
  console.log(`ok: ${r.slides} slides em ${r.arquivo}`);
} catch (e) {
  console.error(e instanceof SyntaxError ? `deck_spec.json não é JSON válido: ${e.message}` : e.message);
  process.exit(1);
}
