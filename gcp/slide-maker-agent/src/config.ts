import { z } from 'zod';

/** Configuração lida do ambiente. Segredos chegam via Secret Manager (`--set-secrets`), nunca do repositório. */
const Esquema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  SLIDE_MAKER_BRIDGE_URL: z.url(),
  SLIDE_MAKER_BRIDGE_SECRET: z.string().min(43),
  /** Só repassada ao agente (Fase 4); o agente simulado não a usa. */
  ANTHROPIC_API_KEY: z.string().optional(),
  GCP_PROJECT: z.string().min(1),
  GCP_REGION: z.string().default('southamerica-east1'),
  TASKS_QUEUE: z.string().default('slide-maker-fases'),
  /** E-mail da conta que assina o token OIDC das tarefas (`slide-maker-tasks@...`). */
  TASKS_SERVICE_ACCOUNT: z.email(),
  /** URL pública do serviço: destino das tarefas e audiência do token OIDC. */
  SERVICE_URL: z.url(),
  WORK_ROOT: z.string().default('/work'),
  /** §15.1 item 8: o Cloud Tasks espera até 30 min; o serviço corta a fase antes. */
  FASE_TIMEOUT_MS: z.coerce.number().int().positive().default(25 * 60 * 1000),
  /** `simulado`: sem modelo (testes e ensaios). `claude`: Agent SDK (Fase 4); exige a chave e o isolamento aprovado. */
  AGENTE: z.enum(['simulado', 'claude']).default('simulado'),
  /** Pastas da imagem (Dockerfile). */
  APP_DIR: z.string().default('/app'),
  DIR_FONTES: z.string().default('/usr/local/share/fonts/brain'),
  PYTHON: z.string().default('python3'),
}).superRefine((c, ctx) => {
  if (c.AGENTE === 'claude' && !c.ANTHROPIC_API_KEY) {
    ctx.addIssue({ code: 'custom', path: ['ANTHROPIC_API_KEY'], message: 'obrigatória com AGENTE=claude' });
  }
});

export type Config = z.infer<typeof Esquema>;

export function lerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const r = Esquema.safeParse(env);
  if (!r.success) {
    // Lista só os nomes das variáveis com problema, nunca os valores.
    const campos = [...new Set(r.error.issues.map((i) => String(i.path[0])))].join(', ');
    throw new Error(`Configuração inválida: ${campos}`);
  }
  return r.data;
}

/** Limites da §8 e da §12. */
export const LIMITES = {
  maxArquivos: 10,
  maxBytesArquivo: 50 * 1024 * 1024,
  fasesPorHoraPorEmail: 10,
  fasesPorHoraPorIp: 40,
  trabalhosSimultaneosPorEmail: 3,
  urlAssinadaSegundos: 10 * 60,
  dispatchDeadlineSegundos: 30 * 60,
  verificacaoCancelamentoMs: 5000,
  itensListar: 100,
  itensEquipe: 200,
} as const;

/** CORS no mesmo padrão do Sinduscon (§8). */
export const ORIGENS_PERMITIDAS = /^(https:\/\/[a-z0-9-]+\.lovable\.app|http:\/\/localhost:(5173|8080))$/;
