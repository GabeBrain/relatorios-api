import { join } from 'node:path';
import { BridgeClient } from './bridge/client.js';
import { repoBridge, StorageBridge, EventsBridge } from './bridge/adapters.js';
import { LIMITES, lerConfig } from './config.js';
import { criarApp } from './app.js';
import { VerificadorOidcGoogle } from './auth/oidc.js';
import type { Agente } from './agent/agente.js';
import { AgenteClaude } from './agent/claude.js';
import { AgenteSimulado } from './agent/simulado.js';
import { validadorBasico } from './agent/ferramentas.js';
import { validadorLint } from './agent/validador.js';
import { DespachanteCloudTasks } from './dispatch/despachante.js';
import { diagnosticarIsolamento, executorBwrap, type Diagnostico } from './isolamento.js';
import { Orquestrador } from './orquestrador.js';

const config = lerConfig();
const log = (msg: string) => console.log(msg);

const bridge = new BridgeClient(config.SLIDE_MAKER_BRIDGE_URL, config.SLIDE_MAKER_BRIDGE_SECRET);
const repo = repoBridge(bridge);
const arm = new StorageBridge(bridge);

let isolamento: Diagnostico | null = null;
const app_ = (p: string) => join(config.APP_DIR, p);

const real = config.AGENTE === 'claude';
const agente: Agente = real
  ? new AgenteClaude({
    base: { kbDir: app_('kb'), libDir: app_('lib') },
    leitura: [app_('kb'), app_('marca'), app_('lib')],
    // Sem isolamento aprovado, nenhum comando do agente roda: a fase termina em erro.
    executor: () => (isolamento?.aprovado ? executorBwrap() : null),
    log,
  })
  : new AgenteSimulado();

const orquestrador = new Orquestrador({
  repo, arm,
  eventos: new EventsBridge(bridge, log),
  despachante: new DespachanteCloudTasks({
    projeto: config.GCP_PROJECT, regiao: config.GCP_REGION, fila: config.TASKS_QUEUE,
    urlServico: config.SERVICE_URL, contaServico: config.TASKS_SERVICE_ACCOUNT,
    dispatchDeadlineSegundos: LIMITES.dispatchDeadlineSegundos,
  }),
  agente,
  validadorDeck: real
    ? validadorLint({ python: config.PYTHON, lint: app_('lib/lint_pptx.py'), marca: app_('marca'), dirFontes: config.DIR_FONTES })
    : validadorBasico,
  workRoot: config.WORK_ROOT,
  faseTimeoutMs: config.FASE_TIMEOUT_MS,
  chaveAnthropic: config.ANTHROPIC_API_KEY,
  log,
});

const app = await criarApp({
  repo, arm, orquestrador,
  oidc: new VerificadorOidcGoogle(config.SERVICE_URL, config.TASKS_SERVICE_ACCOUNT),
  saude: async () => ({ ok: !real || isolamento?.aprovado === true, agente: config.AGENTE, isolamento }),
  logger: true,
});

isolamento = await diagnosticarIsolamento();
log(`isolamento ${JSON.stringify(isolamento)}`);

await app.listen({ host: '0.0.0.0', port: config.PORT });
