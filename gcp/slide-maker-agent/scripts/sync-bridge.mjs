import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = new URL('../../../supabase/functions/slide-maker-bridge/', import.meta.url);
const target = new URL('../src/bridge/shared/', import.meta.url);
mkdirSync(target, { recursive: true });
for (const name of ['protocol', 'handler']) {
  const text = '// Gerado por scripts/sync-bridge.mjs; fonte em supabase/functions/slide-maker-bridge/.\n' + readFileSync(new URL(`${name}.ts`, source), 'utf8').replaceAll('\r\n', '\n').replaceAll("'./protocol.ts'", "'./protocol.js'");
  const path = new URL(`${name}.ts`, target);
  if (process.argv.includes('--check')) {
    if (readFileSync(path, 'utf8') !== text) throw new Error(`Contrato divergente: ${fileURLToPath(path)}`);
  } else writeFileSync(path, text);
}
