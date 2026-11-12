// Copia a máquina de estados do frontend (fonte única) para dentro do serviço.
// O teste test/shared.test.ts falha se as duas cópias divergirem.
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const raiz = new URL('../../../', import.meta.url);
copyFileSync(fileURLToPath(new URL('src/features/slide-maker/lib/state-machine.ts', raiz)), fileURLToPath(new URL('../src/shared/state-machine.ts', import.meta.url)));
console.log('state-machine.ts sincronizado');
