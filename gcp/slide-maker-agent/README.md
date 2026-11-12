# slide-maker-agent

Serviço do **Slide Maker** (Cloud Run, Node 22). Especificação: `docs/features/apresentacoes/INSTRUCOES_DESENVOLVIMENTO.md`.
Preparação do GCP e publicação: `docs/features/apresentacoes/DEPLOY_GCP.md`.

**Estado: Fase 4.** API completa; agente real via Claude Agent SDK (`AGENTE=claude`) ou **simulado**
(padrão, sem modelo e sem custo); ferramentas do agente em `lib/` (extração, brain-deck, render e lint; ver
`lib/README.md`). Ativação do agente real: `DEPLOY_GCP.md` Parte C5.

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
| `src/agent/claude.ts` | Agente real: uma execução do SDK por fase (modelo, esforço, orçamento, ferramentas, MCP `brain`) |
| `src/agent/guarda.ts` | Guarda de caminhos das ferramentas de arquivo (hook PreToolUse) |
| `src/agent/validador.ts` | `entregar_deck` roda o `lint_pptx.py` e recusa falhas 🔒 |
| `src/prompt.ts` | System prompt (base de conhecimento + `lib/README.md`) e prompt de cada fase |
| `src/agent/simulado.ts` | Agente simulado usado nos testes e nos ensaios |
| `src/agent/agente.ts` | Interface do agente e ambiente do processo do CLI (só a chave da Anthropic) |
| `src/isolamento.ts` | Sandbox `bwrap` dos comandos do agente e diagnóstico de subida (`/healthz`) |
| `src/shared/state-machine.ts` | Cópia da máquina de estados do frontend (`npm run sync-shared`) |

## Desenvolvimento

```bash
cd gcp/slide-maker-agent
npm ci
npm test          # 71 testes, com banco, Storage, fila e SDK simulados
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
| `ANTHROPIC_API_KEY` | Secret Manager `slide-maker-anthropic-api-key` (com `AGENTE=claude`) |
| `GCP_PROJECT`, `GCP_REGION` | projeto e `southamerica-east1` |
| `TASKS_QUEUE` | `slide-maker-fases` |
| `TASKS_SERVICE_ACCOUNT` | `slide-maker-tasks@<projeto>.iam.gserviceaccount.com` |
| `SERVICE_URL` | URL pública do próprio serviço (destino e audiência do OIDC) |
| `FASE_TIMEOUT_MS` | opcional; padrão 25 min |
| `AGENTE` | `simulado` (padrão) ou `claude`; `claude` exige `ANTHROPIC_API_KEY` e isolamento aprovado |
| `APP_DIR`, `DIR_FONTES`, `PYTHON` | opcionais; padrões da imagem (`/app`, `/usr/local/share/fonts/brain`, `python3`) |

## Build e deploy

Ver `DEPLOY_GCP.md`, Parte C. O build roda **da raiz do repositório** e baixa os ativos de marca do
bucket privado; o Dockerfile falha se faltar Neo Sans, Montserrat ou um slide final, e roda os testes da
`lib/` sem nada pulado: o deck de referência sai com zero falhas 🔒 e o LibreOffice gera 18 PNGs com as
duas fontes embutidas.
