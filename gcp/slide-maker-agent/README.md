# slide-maker-agent

Serviço do **Slide Maker** (Cloud Run, Node 22). Especificação: `docs/features/slide-maker/INSTRUCOES_DESENVOLVIMENTO.md`.
Preparação do GCP e publicação: `docs/features/slide-maker/DEPLOY_GCP.md`.

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

## Relatório ao analista (sem tela na v1)

A cada versão entregue, o agente registra um relatório interno: o que mudou em relação ao material
original, as decisões tomadas, os dados atualizados com fonte, os números que ele mesmo calculou,
as pendências marcadas `[PENDENTE]` e o resultado do QA. O relatório **não chega ao colaborador**:
fica fora do detalhe do trabalho, da lista de arquivos e do download. Ele é gravado em dois lugares:

- **Tabela** `slide_maker_relatorios`: uma linha por (`job_id`, `versao`), com o `markdown` e as `fontes` registradas.
- **Storage**: `slide-maker-saida/<jobId>/v<N>/relatorio.md`, ao lado do `.pptx` da mesma versão. Não
  sai na limpeza de 180 dias, que só alcança `slide-maker-entrada/` e `slide-maker-trabalho/`.

Para consultar, use o SQL Editor do Supabase. O acesso é só por `service_role`: as tabelas e os
buckets não têm policy para `anon` nem para `authenticated`.

```sql
select j.titulo, j.colaborador_email, j.responsavel, r.versao, r.created_at, r.markdown, r.fontes
from slide_maker_relatorios r
join slide_maker_jobs j on j.id = r.job_id
order by r.created_at desc
limit 20;
```

A tela interna entra junto com a frente de custos (INSTRUCOES §11).

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

Roteiro completo, com os comandos: `docs/features/slide-maker/DEPLOY_GCP.md`. Em resumo, nesta ordem:

| Passo | O quê | Resultado esperado |
|---|---|---|
| A | Aplicar `supabase/migrations/20261112160000_slide_maker.sql` | 6 tabelas `slide_maker_*` e 3 buckets privados, sem nenhuma policy |
| B | Bucket privado com os ativos de marca, contas de serviço, segredos (service_role do Supabase e chave da Anthropic no Secret Manager) e fila do Cloud Tasks | — |
| C1–C2 | Build **da raiz do repositório** e deploy em `southamerica-east1`, com `AGENTE=simulado` | URL do serviço |
| C3 | Verificações: `/healthz`, CORS, ensaio completo com o agente simulado | `200`; o bloco `isolamento` precisa vir aprovado para seguir ao C5 |
| C4 | `VITE_SLIDE_MAKER_AGENT_URL=<URL>` no `.env` versionado (commit do Diego) | A página `/slide-maker` deixa de mostrar "ainda não está disponível" |
| C5 | `AGENTE=claude` e trabalho dourado 1 | Deck sem falhas 🔒 |

O build baixa os ativos de marca do bucket privado. O Dockerfile falha se faltar Neo Sans, Montserrat ou
um slide final, e roda os testes da `lib/` sem nada pulado: o deck de referência sai com zero falhas 🔒 e
o LibreOffice gera 18 PNGs com as duas fontes embutidas.

Mudou o prompt, a base, as ferramentas ou o lint? Suba `VERSAO_PROMPT` em `src/prompt.ts` e registre em
`docs/features/slide-maker/LIVE_regras_slide_maker.md`.
