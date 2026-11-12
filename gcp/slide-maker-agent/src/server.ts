import { createClient } from '@supabase/supabase-js';
import { LIMITES, lerConfig } from './config.js';
import { criarApp } from './app.js';
import { VerificadorOidcGoogle } from './auth/oidc.js';
import { AgenteSimulado } from './agent/simulado.js';
import { validadorBasico } from './agent/ferramentas.js';
import { DespachanteCloudTasks } from './dispatch/despachante.js';
import { EventosBroadcast } from './eventos.js';
import { diagnosticarIsolamento, type Diagnostico } from './isolamento.js';
import { Orquestrador } from './orquestrador.js';
import { RepoSupabase } from './repo/supabase.js';
import { ArmazenamentoSupabase } from './storage/armazenamento.js';

const config = lerConfig();
const log = (msg: string) => console.log(msg);

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const repo = new RepoSupabase(supabase);
const arm = new ArmazenamentoSupabase(supabase);

const orquestrador = new Orquestrador({
  repo, arm,
  eventos: new EventosBroadcast(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, log),
  despachante: new DespachanteCloudTasks({
    projeto: config.GCP_PROJECT, regiao: config.GCP_REGION, fila: config.TASKS_QUEUE,
    urlServico: config.SERVICE_URL, contaServico: config.TASKS_SERVICE_ACCOUNT,
    dispatchDeadlineSegundos: LIMITES.dispatchDeadlineSegundos,
  }),
  agente: new AgenteSimulado(),
  validadorDeck: validadorBasico,
  workRoot: config.WORK_ROOT,
  faseTimeoutMs: config.FASE_TIMEOUT_MS,
  chaveAnthropic: config.ANTHROPIC_API_KEY,
  log,
});

let isolamento: Diagnostico | null = null;
const app = await criarApp({
  repo, arm, orquestrador,
  oidc: new VerificadorOidcGoogle(config.SERVICE_URL, config.TASKS_SERVICE_ACCOUNT),
  saude: async () => ({ agente: config.AGENTE, isolamento }),
  logger: true,
});

isolamento = await diagnosticarIsolamento();
log(`isolamento ${JSON.stringify(isolamento)}`);

await app.listen({ host: '0.0.0.0', port: config.PORT });
