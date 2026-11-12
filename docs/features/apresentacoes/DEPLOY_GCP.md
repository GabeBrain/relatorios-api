# Slide Maker — preparação e publicação no Google Cloud

Roteiro para quem publica (Gabriel). Decisões de origem: `INSTRUCOES_DESENVOLVIMENTO.md` §15.1.

> Atualizado para Lovable Cloud em 12/11/2026. Projeto e recursos Google de B1/B2/B4 foram preparados;
> Anthropic versão1 enabled conforme captura de Gabriel. Ponte e migrations complementares têm validação
> local; NÃO foram publicadas/aplicadas remotamente nesta entrega. Conferir o estado antes de executar.
> Ao terminar cada parte, registrar evidência em `docs/projetos/LIVE_rebrain.md`.

| | |
|---|---|
| Região | `southamerica-east1` (São Paulo) |
| Projeto | `brain-rebrain-slide-maker` (número `475189392075`) |
| Supabase | projeto `mxinpvcqzbfbzjodhgtz` (o mesmo do Rebrain) |

O roteiro tem três partes, em ordem: **A** (banco), **B** (preparação do GCP) e **C** (build, deploy e
verificações do serviço com o agente simulado da Fase 2).

---

## Parte A — Banco (Supabase)

1. Pelo Lovable Cloud, conferir o preflight e aplicar manualmente a migration `supabase/migrations/20261112160000_slide_maker.sql` (não executar db push contra o backend gerenciado). Ela cria 6 tabelas `slide_maker_*` e 3 buckets privados (`slide-maker-entrada`,
   `slide-maker-saida`, `slide-maker-trabalho`).
2. Conferir depois de aplicar:
   - nenhuma policy nas tabelas `slide_maker_*` nem em `storage.objects` para esses buckets;
   - os 3 buckets aparecem como **privados** no painel de Storage.

A migration foi executada localmente num Postgres 18.6 (PGlite 0.5.16) com os grants padrão do Supabase
simulados: 46 verificações de restrição e de acesso (`anon`/`authenticated` sem leitura nem escrita,
`service_role` com acesso). Não foi aplicada no projeto real.

### A2. Ponte Lovable Cloud (obrigatória antes do Cloud Run)

O Rebrain usa **Lovable Cloud**. A service role existe somente no backend gerenciado e NÃO é exportada.
Execute o roteiro manual ao final deste documento. Após a migration original, aplicar somente
`supabase/migrations/20261112200554_slide_maker_bridge.sql`, cadastrar a credencial de integração e publicar
`slide-maker-bridge` com seus três arquivos TypeScript e `verify_jwt=false` somente nessa função.
A autenticação HMAC é obrigatória no handler. Sem ela a função recusa a chamada antes do banco.

A ponte fornece operações fechadas de dados e autorização de Storage; arquivos grandes são enviados
diretamente por URL assinada. Cloud Run usa `SLIDE_MAKER_BRIDGE_URL` e `SLIDE_MAKER_BRIDGE_SECRET`.
Resultados SQL são idempotentes por chamada, com nonce contra replay, controle CAS e limites atômicos.
Broadcast é sinalização de melhor esforço; o frontend também consulta o estado periodicamente.

## Parte B — Preparação do Google Cloud

```bash
PROJETO=brain-rebrain-slide-maker
REGIAO=southamerica-east1
# Prefira --project="$PROJETO" em cada comando; não altere a configuração do BigQuery.
export CLOUDSDK_CORE_PROJECT="$PROJETO" # somente neste shell; remova ao terminar
NUMERO=$(gcloud projects describe "$PROJETO" --format='value(projectNumber)')

gcloud services enable run.googleapis.com cloudtasks.googleapis.com secretmanager.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com iamcredentials.googleapis.com
```

### B1. Bucket privado com os ativos de marca

O repositório é público: fontes, slides finais (têm telefone e e-mail dos consultores), logos e manual
**não** entram no git. A imagem do serviço baixa esses arquivos daqui durante o build.

```bash
gcloud storage buckets create "gs://$PROJETO-slide-maker-marca" --location="$REGIAO" \
  --uniform-bucket-level-access --public-access-prevention
```

Estrutura esperada (os nomes **importam**: o build e o QA procuram exatamente estes arquivos):

```
marca/
  manual-de-marca.pdf                     ← "Manual de Marca Brain Inteligência Estratégica-compactado.pdf"
  logos/Logo-Brain.png
  logos/Logo-Brain-Sem tagline.png
  logos/Logo-Brain-Branco.png
  logos/Logo-Brain-Branco-Sem tagline.png
  slides-finais/fabio.png                 ← "slide final_fábio.png"
  slides-finais/guilherme.png             ← "slide final_guilherme.png"
  slides-finais/finoti.png                ← "slide final_finoti.png"
  fontes/NeoSansPro*.OTF                  ← os 12 arquivos da pasta Neo-sans
```

Os originais estão na máquina do Diego, em `C:\BRAIN\INOVAÇÃO\APRESENTAÇÕES\` (`logo_brain\`,
`slide_final_consultores\`, `Neo-sans\` e o PDF do manual). Quem tiver a pasta e acesso ao bucket envia
com os nomes acima, pelo console (arrastar e soltar) ou, num terminal bash com a pasta como diretório
atual:

```bash
B="gs://$PROJETO-slide-maker-marca/marca"
gcloud storage cp "Manual de Marca Brain Inteligência Estratégica-compactado.pdf" "$B/manual-de-marca.pdf"
gcloud storage cp logo_brain/*.png "$B/logos/"
gcloud storage cp "slide_final_consultores/slide final_fábio.png"     "$B/slides-finais/fabio.png"
gcloud storage cp "slide_final_consultores/slide final_guilherme.png" "$B/slides-finais/guilherme.png"
gcloud storage cp "slide_final_consultores/slide final_finoti.png"    "$B/slides-finais/finoti.png"
gcloud storage cp Neo-sans/*.OTF "$B/fontes/"
gcloud storage ls -r "gs://$PROJETO-slide-maker-marca/"   # conferir: 1 + 4 + 3 + 12 = 20 arquivos
```

A Montserrat (licença OFL) não vai para o bucket: o build baixa do Google Fonts.

### B2. Contas de serviço

| Conta | Para quê |
|---|---|
| `slide-maker-runtime` | Identidade do serviço no Cloud Run: lê os segredos e enfileira fases |
| `slide-maker-tasks` | Identidade no token OIDC com que o Cloud Tasks chama `POST /internal/fase`; o serviço só aceita esse e-mail |
| `slide-maker-build` | Executa o build da imagem: lê o bucket de marca e grava no Artifact Registry |

```bash
for SA in slide-maker-runtime slide-maker-tasks slide-maker-build; do
  gcloud iam service-accounts create "$SA" --display-name="$SA"
done
RUNTIME="slide-maker-runtime@$PROJETO.iam.gserviceaccount.com"
TASKS="slide-maker-tasks@$PROJETO.iam.gserviceaccount.com"
BUILD="slide-maker-build@$PROJETO.iam.gserviceaccount.com"

# Build: ler ativos de marca, publicar imagem e escrever logs
gcloud storage buckets add-iam-policy-binding "gs://$PROJETO-slide-maker-marca" \
  --member="serviceAccount:$BUILD" --role=roles/storage.objectViewer
gcloud artifacts repositories create slide-maker --repository-format=docker --location="$REGIAO"
gcloud artifacts repositories add-iam-policy-binding slide-maker --location="$REGIAO" \
  --member="serviceAccount:$BUILD" --role=roles/artifactregistry.writer
gcloud projects add-iam-policy-binding "$PROJETO" --member="serviceAccount:$BUILD" --role=roles/logging.logWriter

# Runtime: enfileirar tarefas que se identificam como slide-maker-tasks
gcloud projects add-iam-policy-binding "$PROJETO" --member="serviceAccount:$RUNTIME" --role=roles/cloudtasks.enqueuer
gcloud iam service-accounts add-iam-policy-binding "$TASKS" \
  --member="serviceAccount:$RUNTIME" --role=roles/iam.serviceAccountUser
# Agente de serviço do Cloud Tasks gera o token OIDC em nome de slide-maker-tasks
gcloud iam service-accounts add-iam-policy-binding "$TASKS" \
  --member="serviceAccount:service-$NUMERO@gcp-sa-cloudtasks.iam.gserviceaccount.com" --role=roles/iam.serviceAccountUser
```

### B3. Segredos (Secret Manager)

O projeto e os recursos de B1/B2/B4 já foram preparados em 12/11. Conferir antes de recriar.
`slide-maker-anthropic-api-key` já recebeu versão 1 enabled por Gabriel. Não acessar seu valor para conferir.

Para a ponte, Gabriel executa pessoalmente no PowerShell, na raiz do repositório:

```powershell
python scripts/slide-maker/cadastrar-bridge.py
```

O script gera um valor aleatório, cadastra em `slide-maker-bridge-secret`, concede leitura à conta runtime
e copia o valor para a área de transferência sem imprimir/gravar em arquivo. Cole no formulário seguro
do Lovable (More → Settings → Secrets) com nome **`SLIDE_MAKER_BRIDGE_SECRET`**, salve e limpe o clipboard:

```powershell
Set-Clipboard -Value ""
```

Não cole no chat. O script recusa substituir uma versão ativa. Para rotação, coordenar os dois ambientes:
pausar novas chamadas, cadastrar a mesma nova versão nos dois lados, atualizar a revisão e validar;
manter o valor anterior recuperável no Secret Manager até confirmar o rollout. Não gerar outra chave
para tentar recuperar uma já salva. Se precisar copiar novamente o mesmo valor com segurança, execute
`python scripts/slide-maker/cadastrar-bridge.py --copiar-existente` em terminal pessoal interativo: ele lê
a versão ativa apenas no processo local e a coloca no clipboard sem exibi-la ou criar nova versão.

`slide-maker-supabase-service-role-key` foi criado vazio pelo roteiro antigo: não preencher nem referenciar
no deploy. Remover esse recurso obsoleto somente depois de confirmar que nenhuma revisão o usa.

### B4. Fila do Cloud Tasks

```bash
gcloud tasks queues create slide-maker-fases --location="$REGIAO" \
  --max-attempts=1 --max-concurrent-dispatches=4
```

- `--max-attempts=1`: **sem reentrega automática**. Repetir uma fase do agente custa dinheiro e é
  decisão do usuário ("Tentar novamente", §8).
- O prazo de cada tarefa (`dispatchDeadline` = 30 min, o máximo do Cloud Tasks para tarefas HTTP) é
  definido pelo serviço ao criar a tarefa. O serviço corta a fase em 25 min (§15.1 item 8).

### Retorno esperado da Parte B

Envie ao Diego (ou registre no doc vivo): o `$PROJETO`, a saída de
`gcloud storage ls -r gs://$PROJETO-slide-maker-marca/` e a confirmação de que os segredos Anthropic e ponte têm
uma versão ativa (nunca a service role gerenciada). **Não envie o valor dos segredos.**

---

## Parte C — Publicação do serviço (Fase 2: agente simulado)

Nesta fase o serviço roda com o **agente simulado**: percorre as etapas sem chamar o modelo; recursos Google podem gerar cobrança de infraestrutura. Serve para provar a infraestrutura (fila, OIDC, Storage, Realtime) e para medir o isolamento
no Cloud Run antes da Fase 4.

### C1. Build da imagem (da raiz do repositório)

```bash
gcloud builds submit --config gcp/slide-maker-agent/cloudbuild.yaml --region="$REGIAO" \
  --service-account="projects/$PROJETO/serviceAccounts/$BUILD" \
  --substitutions=_MARCA_BUCKET="$PROJETO-slide-maker-marca" .
```

- O primeiro passo baixa `gs://$PROJETO-slide-maker-marca/marca/` para dentro do build; os ativos não
  ficam no repositório.
- O build **falha** se faltar Neo Sans, Montserrat, um slide final ou o logo, e roda os testes das
  ferramentas do agente (`lib/`) sem nada pulado: o deck de referência é gerado, passa no lint com
  zero falhas 🔒 e o LibreOffice gera 18 PNGs com as duas fontes de fato embutidas no PDF. A saída
  aparece no log do build (`Ran NN tests … OK`). Se falhar, envie ao Diego o trecho do log.
- Se o build reclamar de permissão no bucket de origem do Cloud Build (`${PROJETO}_cloudbuild`),
  conceda `roles/storage.objectViewer` nele à conta `$BUILD`.

### C2. Deploy no Cloud Run

A URL do serviço é determinística (`https://<serviço>-<número do projeto>.<região>.run.app`), então
`SERVICE_URL` já entra no primeiro deploy. Confira depois de publicar.

```bash
# Defina a URL efetivamente publicada e verificada no Lovable:
PONTE_URL=<url-da-funcao-slide-maker-bridge>
IMAGEM="$REGIAO-docker.pkg.dev/$PROJETO/slide-maker/slide-maker-agent:latest"
URL="https://slide-maker-agent-$NUMERO.$REGIAO.run.app"

gcloud run deploy slide-maker-agent --image="$IMAGEM" --region="$REGIAO" \
  --execution-environment=gen2 --service-account="$RUNTIME" --allow-unauthenticated \
  --min-instances=0 --max-instances=5 --concurrency=2 --cpu=2 --memory=4Gi --timeout=1800 \
  --set-secrets=SLIDE_MAKER_BRIDGE_SECRET=slide-maker-bridge-secret:latest,ANTHROPIC_API_KEY=slide-maker-anthropic-api-key:latest \
  --set-env-vars=AGENTE=simulado,SLIDE_MAKER_BRIDGE_URL=$PONTE_URL,GCP_PROJECT=$PROJETO,GCP_REGION=$REGIAO,TASKS_QUEUE=slide-maker-fases,TASKS_SERVICE_ACCOUNT=$TASKS,SERVICE_URL=$URL

gcloud run services describe slide-maker-agent --region="$REGIAO" --format='value(status.url)'   # deve bater com $URL
```

- `--allow-unauthenticated`: as rotas `/jobs/*` são chamadas pelo navegador e protegidas pelo token
  de cada trabalho. `/internal/fase` valida no próprio serviço o token OIDC do Cloud Tasks
  (audiência = `$URL`, e-mail = `$TASKS`) e responde 403 a qualquer outro chamador.
- `--timeout=1800`: igual ao prazo máximo da tarefa no Cloud Tasks (30 min); o serviço corta a fase
  em 25 min.

### C3. Verificações depois do deploy

1. **Saúde e isolamento (spike da §15.1 item 7):**

   ```bash
   curl -s "$URL/healthz"
   ```

   Esperado: `"ok":true` e um bloco `isolamento`. **Envie esse JSON ao Diego.** Ele mostra se o
   `bubblewrap` funciona no Cloud Run gen2 (`"bwrap":"ok"` e `"aprovado":true`) ou não
   (`"bwrap":"falhou"`, com o motivo em `detalhe`). É a evidência que decide o isolamento da Fase 4.
   Com o agente simulado (padrão), o resultado é só informativo; com `AGENTE=claude` (Parte C5),
   isolamento reprovado deixa o `/healthz` em 503 e nenhuma fase roda.

2. **Ensaio do fluxo com o agente simulado** (troque o e-mail e use qualquer PDF):

   ```bash
   R=$(curl -s -X POST "$URL/jobs" -H 'content-type: application/json' \
         -d '{"colaborador_email":"seu.nome@brain.srv.br","titulo":"Ensaio Slide Maker"}')
   JOB=$(echo "$R" | jq -r .jobId); TOKEN=$(echo "$R" | jq -r .token)
   curl -s -X POST "$URL/jobs/$JOB/arquivos" -H "x-job-token: $TOKEN" -F "arquivos=@algum.pdf" | jq .trabalho.estado
   sleep 15
   curl -s "$URL/jobs/$JOB" -H "x-job-token: $TOKEN" | jq '.trabalho.estado, [.mensagens[].tipo]'
   ```

   Esperado: `"analisando"` logo após o upload e, em seguida, `"aguardando_respostas"` com as
   mensagens `arquivos`, `progresso` e `perguntas`. Se ficar em `analisando`, veja a fila
   (`gcloud tasks list --queue=slide-maker-fases --location=$REGIAO`) e os logs do serviço.

3. **"Todos os trabalhos"** (`curl -s "$URL/jobs/equipe" | jq`) lista o ensaio só com metadados.

### C4. O que ainda não está nesta publicação

- **Endereço do serviço no frontend:** o item "Slide Maker" e as páginas já estão no app (Fase 5), mas
  mostram "ainda não está disponível neste ambiente" até que `VITE_SLIDE_MAKER_AGENT_URL=$URL` entre
  no `.env` versionado (o Lovable lê de lá). Envie a `$URL` ao Diego depois de C2; o commit é dele.
- **Alternativa registrada:** se o corte de 25 min não bastar para a produção (F3), a fase passa a
  rodar como **Cloud Run Job** (§8 item 5, §15.1 item 8).
- **Limpeza de 180 dias** de `entrada/` e `trabalho/` (§15.1 item 2): job agendado, numa fase posterior.

### C5. Ativar o agente real (Fase 4)

Só depois de C3 com `"aprovado": true` no bloco `isolamento`. Cada trabalho completo usa o Claude e
**tem custo** (estimativa da base, doc 07: US$ 5–9 por deck; a trava por fase é F1 = 2, F2 = 6,
F3 = 10 e F4 = 5 US$).

1. **Chave da API no Secret Manager.** A chave que está nos Secrets do Lovable (`CLAUDE_API_KEY`) fica
   nas funções do Supabase e o Cloud Run não a enxerga. Grave a mesma chave (ou uma chave própria
   do Slide Maker, criada no Console da Anthropic) como nova versão do segredo:

   ```bash
   read -rs CHAVE   # cole a chave e tecle Enter; ela não aparece na tela nem fica no histórico
   printf '%s' "$CHAVE" | gcloud secrets versions add slide-maker-anthropic-api-key --data-file=-
   unset CHAVE
   ```

2. **Ligar o agente real:**

   ```bash
   gcloud run services update slide-maker-agent --region="$REGIAO" --update-env-vars=AGENTE=claude
   curl -s -o /dev/null -w '%{http_code}\n' "$URL/healthz"; curl -s "$URL/healthz" | jq
   ```

   Esperado: `200`, `"agente":"claude"` e `"isolamento": {…, "aprovado": true}`. Se vier `503`, o
   isolamento reprovou nesta revisão: nenhuma fase roda (as fases terminam em erro com "Tentar
   novamente"). Volte com `--update-env-vars=AGENTE=simulado` e envie o JSON ao Diego.

3. **Trabalho dourado 1** (§13): com o arquivo `domicilios_vagos_2010_2022.xlsx` da pasta do Diego,
   repita o ensaio de C3 com contexto real, responda às perguntas e aprove a narrativa:

   ```bash
   R=$(curl -s -X POST "$URL/jobs" -H 'content-type: application/json' \
         -d '{"colaborador_email":"seu.nome@brain.srv.br","titulo":"Dourado 1 — domicílios vagos","contexto":"Palestra de 15 min para incorporadores, apresentada pelo Fábio"}')
   JOB=$(echo "$R" | jq -r .jobId); TOKEN=$(echo "$R" | jq -r .token); echo "$JOB $TOKEN"
   curl -s -X POST "$URL/jobs/$JOB/arquivos" -H "x-job-token: $TOKEN" -F "arquivos=@domicilios_vagos_2010_2022.xlsx" | jq .trabalho.estado
   # acompanhe: estado e mensagens (as perguntas chegam em "aguardando_respostas")
   curl -s "$URL/jobs/$JOB" -H "x-job-token: $TOKEN" | jq '.trabalho.estado, .mensagens[-1]'
   ```

   Respostas (`POST /jobs/$JOB/respostas`, uma chave por pergunta) e aprovação
   (`POST /jobs/$JOB/narrativa` com `{"acao":"aprovar"}`) seguem a §8; até o frontend (Fase 5), o
   Diego pode conduzir essa parte junto. Ao chegar em `entregue`, baixe o deck com
   `GET /jobs/$JOB/versoes/1/download` e envie ao Diego o `.pptx`, o `jobId` e os logs da fase
   (`gcloud logging read 'resource.labels.service_name="slide-maker-agent" AND textPayload:"agente job="' --limit=20`).


## Passos manuais de Gabriel — entrega da ponte Lovable Cloud

1. **Preflight:** executar `docs/features/apresentacoes/VERIFICAR_LOVABLE_CLOUD_2026-11-12.sql`
   no ambiente do Rebrain, projeto `mxinpvcqzbfbzjodhgtz`. Se não houver tabelas Slide Maker, aplicar
   `supabase/migrations/20261112160000_slide_maker.sql`. Se as seis já existirem, conferir e pular essa
   migration. Estado parcial exige diagnóstico; não fazer DROP nem reaplicar cegamente.
2. **Complemento:** aplicar `supabase/migrations/20261112200554_slide_maker_bridge.sql` apenas se
   ainda ausente. Cria duas tabelas privadas e duas RPCs invoker acessíveis somente a service_role.
   Repetir o preflight: oito tabelas com RLS, três buckets privados, sem grants públicos nas tabelas
   nem execução pública das RPCs. Conferir policies genéricas do Storage; preservar as das outras ferramentas.
3. **Credencial:** seguir B3, usando o formulário seguro de Secrets. Anthropic vem do segredo Google já
   cadastrado; a credencial da ponte é nova e gerada pelo script. Service role não é solicitada.
4. **Função:** publicar os arquivos `index.ts`, `handler.ts` e `protocol.ts` de
   `supabase/functions/slide-maker-bridge/`, com a configuração de `supabase/config.toml`.
   O Lovable precisa receber os arquivos desta entrega; enquanto não houver push autorizado, anexar/fornecer
   os arquivos locais no fluxo de desenvolvimento. Não publicar uma função gerada a partir só do nome.
5. **Instrução para o Lovable:** “No backend existente do Rebrain, publique a função slide-maker-bridge
   dos três arquivos fornecidos. Use SLIDE_MAKER_BRIDGE_SECRET pelo formulário de Secrets; mantenha
   SUPABASE_SERVICE_ROLE_KEY somente no ambiente gerenciado. Configure verify_jwt=false exclusivamente
   nessa função; o handler valida HMAC, versão, prazo e nonce. Aplique somente as migrations indicadas
   após o preflight e devolva metadados de verificação e URL, sem conteúdo de credenciais ou trabalhos.”
6. **Retorno:** fornecer URL efetiva e resultados sanitizados do preflight. Uma chamada sem assinatura deve
   ser recusada. Depois, o teste autenticado do serviço deve conseguir criar/ler trabalho e transferir arquivo.
   Código publicado e migração aplicada são estados diferentes; conferir ambos.
7. **Google:** só após essa etapa e os 20 ativos de marca, executar C1–C3 com autorização de publicação.
   A URL do Cloud Run, verificada em `services describe`, vai a `VITE_SLIDE_MAKER_AGENT_URL` no frontend.

### Testes locais da entrega

Na pasta `gcp/slide-maker-agent`: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
O teste bridge-flow usa PostgreSQL local/PGlite e transporte HTTP em memória; Storage, fila e Broadcast
são simulados nesse teste. Isso não comprova permissões nem isolamento do Cloud Run real.
Na raiz: `node scripts/diagnostics/slide-maker-bridge-sql.mjs` (após npm ci do serviço).
Verificação da Edge: `deno check --no-config --no-lock --node-modules-dir=none supabase/functions/slide-maker-bridge/index.ts`.

### Recuperação

Se a ponte não responder, deixar o frontend indisponível e não ativar Claude. Não voltar ao deploy antigo
que exige exportação de service role. Reverter para a revisão compatível anterior da ponte/serviço, se houver,
preservando tabelas e arquivos. Nonces expiram após 10 minutos; resultados idempotentes privados são mantidos
por 24 horas e limpos em lotes nas chamadas. A chave de idempotência é estável somente na repetição de transporte;
repetições humanas de fases continuam ações explícitas, sem custo duplicado automático.
