# CAGED MTE — importação e ponte de agregados

Implementação local da fonte MTE para Maceió 9–14. **Não implantada.** Sem chaves de serviço no Lovable, sem SQL do navegador e sem cópia de microdados no Supabase. A conta conectada ao plugin BigQuery não comprova a identidade de workload do Cloud Run.

## Fluxo e contratos

1. `pipeline.py` lê o FTP oficial `ftp.mtps.gov.br`, com nomes e diretórios fixos.
2. 2017–2019: CAGED estatístico + CAGED Ajustes, por competência da movimentação. Setores pelo subsetor IBGE oficial. Desde 2020: Novo Caged `MOV + FOR − EXC`, por competência da movimentação, setores por seção CNAE 2.0.
3. Apenas somas por mês, UF e setor sobrevivem. Brasil inclui UF não identificada (`NI`); setores não pertencentes aos cinco exibidos permanecem em `other`, sem serem descartados do total. Zero só é emitido após arquivo completo, CRC válido, layout validado e confirmação das 27 UFs no MOV/estatístico.
4. Os componentes agregados são substituídos por arquivo/versão, nunca adicionados novamente a uma versão anterior. Compara tamanho/MDTM e SHA256 após download; uma republicação no mesmo tamanho e MDTM não é detectável por esse controle. A manutenção pode invalidar o componente correspondente para forçar nova leitura.
5. Snapshot imutável soma componentes e reconcilia UF ↔ Brasil e setores ↔ total. Um load job publica o snapshot inteiro atomicamente no BigQuery. Uma versão já existente não é reinserida. Não há publicação parcial: falta de arquivo/layout inesperado interrompe a nova versão.
6. `/v1/caged-mte` no proxy existente executa SQL fixo numa única tabela. Retorna anos, ano corrente parcial e mês de fechamento contra o mesmo mês do ano anterior. O trimestral não soma novamente três meses nesse bloco. Períodos incompletos são omitidos como um todo.
7. Edge `caged-report` valida Bearer Geobrain, pagina o catálogo e exige os 7/6 municípios AL da edição. Assina o contrato `{end,version}` com os secrets já usados por Empresas/Empregados. A resposta não inclui token, assinatura ou dados individuais.
8. Frontend reconcilia os agregados novamente e renderiza os seis slides, mantendo a arte original. Falha CAGED não elimina os indicadores imobiliários. Cancelamento/troca de seleção não publicam respostas antigas. Métodos, competência e `snapshotVersion` ficam na origem da geração.

A distinção metodológica em 2020 fica na documentação/origem, **sem acrescentar uma nota de quebra ao gráfico original**, conforme esclarecimento de Lucas. Ter a mesma disposição dos anos não representa homologação metodológica.

## Ensaio local, sem nuvem

Python 3.13+, dependências de `requirements.txt`. Diretório de estado deve ficar fora do Git.

```powershell
python pipeline.py --start 202609 --end 202609 --state ../../.local-inputs/caged-mte-state
python -m unittest discover -s gcp/caged-mte -p test_pipeline.py
node --test gcp/caged-mte/bridge/caged.test.mjs
npx.cmd vitest run --config gcp/caged-mte/vitest.config.ts
```

O primeiro comando acima assume o diretório `gcp/caged-mte`; os testes assumem a raiz do repo. Uma amostra parcial **não pode ser publicada em produção**: `--publish` exige início `201701`.

Pilotos executados em 17/11/2026: setembro/2026 MOV/FOR/EXC, sem escrita remota, snapshot de 14.454 bytes/203 linhas; dezembro/2019 estatístico e ajustes, layouts/códigos/competências lidos e agregados. Brutos transitórios fora do Git. Totais setembro conciliados com XLSX MTE: Brasil 121.305, construção Brasil 9.468, AL 11.110, construção AL 166. Isso não comprova carga 2017–2026 completa nem deploy.

## Preparação remota para revisão humana

Não executar estes passos como efeito de push. O backend do Rebrain é Lovable Cloud; implantação da Edge deve ocorrer por seu fluxo administrativo, sem exportar a service role.

### 1. Recursos GCP

- Escolher projeto e dataset **US** acessíveis à identidade do proxy e do job. Aplicar `table.sql` substituindo `PROJECT.DATASET`.
- Bucket privado para componentes agregados e manifestos, separado de microdados. O job usa identidade vinculada (ADC), nunca chave JSON. Permissões: listar/ler/criar/excluir objetos do seu bucket; criar jobs BigQuery e ler/gravar a tabela de agregados. O proxy precisa apenas criar query jobs e ler essa tabela.
- Definir `CAGED_TABLE=<project>.<dataset>.caged_mte_snapshots`, `CAGED_STATE_BUCKET=<bucket>` no job e `CAGED_TABLE` no proxy.
- Construir a imagem desta pasta e criar Cloud Run Job com 1 tarefa, paralelismo 1, 2 GiB de memória inicialmente e timeout até 6h para backfill. Medir/rever recursos no primeiro ensaio. Cada arquivo é processado sequencialmente, os temporários são descartados e os componentes concluídos são checkpointados individualmente no bucket.
- `update.lock` no bucket impede execuções sobrepostas. Se um processo morrer, confirmar que não há execução ativa antes de remover o lock abandonado. Não configurar exclusão automática do lock.

### 2. Carga histórica e atualização

Primeira execução completa, no Cloud Run Job, com `--start 201701 --publish`; omitir `--end` descobre a competência mais recente no FTP. A carga inicial lê os arquivos nacionais para formar os resumos e pode ser demorada. Ela é diferente do custo pequeno por geração de relatório. Não foi executada nesta sessão.

Depois da primeira carga, agendar o **mesmo job** no Cloud Scheduler (por exemplo, diário às 08:00, `America/Sao_Paulo`) com autenticação Google/OAuth para `run.jobs.run`. Não expor endpoint público de escrita. O job volta a consultar metadados dos arquivos, baixa só o que mudou e incorpora ajustes retroativos. Diário significa verificação diária, não promessa de uma nova publicação diária. A configuração do Scheduler ainda precisa ser criada no projeto escolhido.

Cada snapshot é imutável e conserva a data de publicação. Um relatório preserva sua versão consultada; uma nova geração usa a versão mais recente. Cache online de 15 minutos e até 24 competências por instância do proxy; a versão nova fica visível após esse TTL. Não descartar snapshots referenciados por relatórios já entregues. As políticas de retenção de snapshots e dos componentes devem ser definidas antes da operação contínua.

### 3. Montar a rota no proxy existente

O source do proxy está em outro checkout, `Sistema Quanti/gcp/bigquery-proxy`. Este repo entrega o módulo e instalador compatível, sem alterar o checkout externo por conta própria.

```powershell
# Ensaio: só confere o ponto de montagem.
node gcp/caged-mte/bridge/install.mjs "../Sistema Quanti/gcp/bigquery-proxy"
# Após revisar a árvore/AGENTS do outro repo: alteração local do source, sem deploy.
node gcp/caged-mte/bridge/install.mjs "../Sistema Quanti/gcp/bigquery-proxy" --apply
```

O instalador monta o handler reutilizando `verifySignature`, `PROXY_HMAC_SECRET`, identidade do Cloud Run e o transporte `raisQuery`, com teto de 100 MB por query CAGED. Preserva as rotas RAIS e snapshots. Testar as rotas já existentes no outro repo e só então publicar sua revisão com autorização.

### 4. Edge e prova da cadeia

Publicar `supabase/functions/caged-report` no Lovable Cloud, com `verify_jwt=false` conforme config; autenticação Bearer é validada pelo handler. Reutilizar os valores existentes de `BIGQUERY_PROXY_URL` / `BIGQUERY_PROXY_HMAC_SECRET`; não copiar secrets para o frontend ou documentação. Limite por token em memória da instância (20/10min), não cota global distribuída.

Confirmar uma geração autenticada em Maceió e conferir: publicação/competência, snapshot, total Brasil, AL, construção, setores e comparação mensal/anual nas duas edições. Confirmar falha visível quando a fonte estiver ausente; não usar fixtures como evidência de produção. Homologar o resultado com o analista antes de considerar a fonte pronta para entrega.

## Consumo

Geração online: uma consulta consolidada sobre agregados; o mínimo de 10 MB por consulta/tabela do BigQuery é a referência inicial, não uma medição de produção. Metadados/cargas, checagem de idempotência, armazenamento de snapshots, Cloud Run, GCS e Scheduler são consumos adicionais. A carga batch padrão usa o pool compartilhado do BigQuery. Não prometer custo total zero nem multiplicar automaticamente a estimativa por três para o trimestral.
