# Slide Maker — preparação e publicação no Google Cloud

Roteiro para quem publica (Gabriel). Decisões de origem: `INSTRUCOES_DESENVOLVIMENTO.md` §15.1.

> **Nenhum comando deste roteiro foi executado por quem o escreveu** (sessão sem `gcloud` nem acesso
> ao projeto). A sintaxe segue a documentação oficial do `gcloud`; se algum comando divergir na sua
> versão, a documentação do Google prevalece. Ao terminar cada parte, registre o resultado no
> `docs/projetos/LIVE_rebrain.md`.

| | |
|---|---|
| Região | `southamerica-east1` (São Paulo) |
| Projeto | a definir por quem publica; abaixo, `$PROJETO` |
| Supabase | projeto `mxinpvcqzbfbzjodhgtz` (o mesmo do Rebrain) |

O roteiro tem três partes. **A** e **B** podem ser feitas já; **C** depende do código da Fase 2 e será
completada quando ele estiver pronto.

---

## Parte A — Banco (Supabase)

1. Aplicar a migration `supabase/migrations/20261112160000_slide_maker.sql` (`supabase db push` ou SQL
   Editor). Ela cria 6 tabelas `slide_maker_*` e 3 buckets privados (`slide-maker-entrada`,
   `slide-maker-saida`, `slide-maker-trabalho`).
2. Conferir depois de aplicar:
   - nenhuma policy nas tabelas `slide_maker_*` nem em `storage.objects` para esses buckets;
   - os 3 buckets aparecem como **privados** no painel de Storage.

A migration foi executada localmente num Postgres 18.6 (PGlite 0.5.16) com os grants padrão do Supabase
simulados: 46 verificações de restrição e de acesso (`anon`/`authenticated` sem leitura nem escrita,
`service_role` com acesso). Não foi aplicada no projeto real.

## Parte B — Preparação do Google Cloud

```bash
PROJETO=<id-do-projeto>
REGIAO=southamerica-east1
gcloud config set project "$PROJETO"
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

Nunca no `.env` versionado (SECURITY_NOTES §3). Cole o valor quando o comando pedir entrada e termine
com Ctrl+D, para não deixar a chave no histórico do shell.

```bash
gcloud secrets create slide-maker-anthropic-api-key --replication-policy=automatic
gcloud secrets versions add slide-maker-anthropic-api-key --data-file=-
gcloud secrets create slide-maker-supabase-service-role-key --replication-policy=automatic
gcloud secrets versions add slide-maker-supabase-service-role-key --data-file=-

for S in slide-maker-anthropic-api-key slide-maker-supabase-service-role-key; do
  gcloud secrets add-iam-policy-binding "$S" --member="serviceAccount:$RUNTIME" --role=roles/secretmanager.secretAccessor
done
```

Use uma chave da Anthropic **própria do Slide Maker**, para poder revogá-la e acompanhar o consumo
separadamente.

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
`gcloud storage ls -r gs://$PROJETO-slide-maker-marca/` e a confirmação de que os dois segredos têm
uma versão ativa. **Não envie o valor dos segredos.**

---

## Parte C — Publicação do serviço *(completar no fim da Fase 2)*

O código de `gcp/slide-maker-agent/` ainda não existe. Esta parte será detalhada com os comandos
finais junto com ele. O que já está decidido:

- **Build pela raiz do repositório**, não por `--source gcp/slide-maker-agent` como no Sinduscon: a
  imagem copia a base de conhecimento de `docs/features/apresentacoes/base-conhecimento/` e a máquina
  de estados de `src/features/slide-maker/lib/`. O build roda com `--service-account=$BUILD` e baixa
  `gs://$PROJETO-slide-maker-marca/marca/`. Se faltar a Neo Sans ou a Montserrat, o build falha.
- **Cloud Run:** ambiente de execução **gen2**, conta `$RUNTIME`, mínimo de 0 instâncias,
  concorrência 1–2, memória ≥ 4 GiB, segredos montados como variáveis
  (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) via `--set-secrets`.
- **Acesso:** `--allow-unauthenticated`, porque as rotas `/jobs/*` são chamadas pelo navegador e
  protegidas pelo token de cada trabalho. A rota `/internal/fase` valida no próprio serviço o token
  OIDC do Cloud Tasks (audiência = URL do serviço; e-mail = `$TASKS`).
- **Isolamento (§12, §15.1 item 7):** na subida, o serviço executa um autoteste (comando do agente sem
  rede, sem leitura de `/app` nem das chaves). Se falhar, o health check falha e a revisão não recebe
  tráfego. **Este é o primeiro ponto a observar no primeiro deploy.**
- **Frontend:** depois do deploy, `VITE_SLIDE_MAKER_AGENT_URL` com a URL do serviço entra no `.env`
  versionado (o Lovable lê de lá) e o frontend é publicado.
- **Alternativa registrada:** se o corte de 25 min não bastar para a produção (F3), a fase passa a
  rodar como **Cloud Run Job** (§8 item 5, §15.1 item 8).
- **Limpeza de 180 dias** de `entrada/` e `trabalho/` (§15.1 item 2): job agendado, entra numa fase
  posterior.
