# slide-maker-agent

Serviço do **Slide Maker** (Cloud Run, Node 22). Especificação: `docs/features/apresentacoes/INSTRUCOES_DESENVOLVIMENTO.md`.
Preparação do GCP e publicação: `docs/features/apresentacoes/DEPLOY_GCP.md`.

**Estado: Fase 3.** API completa, com o agente **simulado** (sem modelo e sem custo), e as ferramentas do
agente em `lib/` (extração, brain-deck, render e lint; ver `lib/README.md`). O agente real, via Claude Agent
SDK, entra na Fase 4.

## Como funciona

```
navegador ──REST──► /jobs/*  (token do trabalho em x-job-token)
                       │ valida, grava, registra a fase e enfileira no Cloud Tasks → 202
                       ▼
Cloud Tasks ──OIDC──► /internal/fase  (requisição aberta durante toda a fase; corte em 25 min)
                       │ restaura /work/<jobId> do Storage → agente → ferramentas brain → salva
                       ▼
             Supabase (tabelas slide_maker_*, buckets privados) + Broadcast slide-maker:<jobId>
```

| Arquivo | Papel |
|---|---|
| `src/app.ts` | Rotas da §8, CORS, upload e erros |
| `src/orquestrador.ts` | Ações do usuário (limites, enfileiramento) e execução de fase (timeout, cancelamento, retomada) |
| `src/agent/ferramentas.ts` | Ferramentas `brain` (§5.1) com validação; base do MCP da Fase 4 |
| `src/agent/simulado.ts` | Agente simulado usado nos testes e nos ensaios |
| `src/agent/agente.ts` | Interface do agente e ambiente dos comandos (só a chave da Anthropic) |
| `src/isolamento.ts` | Diagnóstico de isolamento com `bwrap`, exposto em `/healthz` |
| `src/shared/state-machine.ts` | Cópia da máquina de estados do frontend (`npm run sync-shared`) |

## Desenvolvimento

```bash
cd gcp/slide-maker-agent
npm ci
npm test          # 38 testes, com banco, Storage e fila em memória
npm run typecheck
npm run test:lib  # testes Python da lib/ (requer Python 3.12 + requirements.txt; ver lib/README.md)
```

Se `src/features/slide-maker/lib/state-machine.ts` mudar, rode `npm run sync-shared`. Um teste falha
enquanto as duas cópias forem diferentes.

## Variáveis de ambiente

| Variável | Origem |
|---|---|
| `SUPABASE_URL` | `https://mxinpvcqzbfbzjodhgtz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret Manager `slide-maker-supabase-service-role-key` |
| `ANTHROPIC_API_KEY` | Secret Manager `slide-maker-anthropic-api-key` (usada a partir da Fase 4) |
| `GCP_PROJECT`, `GCP_REGION` | projeto e `southamerica-east1` |
| `TASKS_QUEUE` | `slide-maker-fases` |
| `TASKS_SERVICE_ACCOUNT` | `slide-maker-tasks@<projeto>.iam.gserviceaccount.com` |
| `SERVICE_URL` | URL pública do próprio serviço (destino e audiência do OIDC) |
| `FASE_TIMEOUT_MS` | opcional; padrão 25 min |

## Build e deploy

Ver `DEPLOY_GCP.md`, Parte C. O build roda **da raiz do repositório** e baixa os ativos de marca do
bucket privado; o Dockerfile falha se faltar Neo Sans, Montserrat ou um slide final, e roda os testes da
`lib/` sem nada pulado: o deck de referência sai com zero falhas 🔒 e o LibreOffice gera 18 PNGs com as
duas fontes embutidas.
