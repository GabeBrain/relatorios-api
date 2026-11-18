# Maceió — integração CAGED pela fonte MTE

17/11/2026 · Codex, a pedido de Lucas · base `95e6fbee`, main · implementação local, sem push/deploy.

**Commit de implementação:** `50d88663`. Tipos, lint e build final aprovados; build confirmado com código de saída 0 após redirecionamento explícito dos avisos do Vite. Documentação/fechamento em commit próprio.

## Comportamento implementado

Fonte MTE escolhida explicitamente por Lucas. O importador lê arquivos oficiais e mantém somente agregados; o relatório consulta os resumos pela infraestrutura de Empresas/Empregados. Arquivos brutos não são armazenados no Lovable.

- **2017–2019:** CAGED estatístico + ajustes por competência original, classificação por subsetor IBGE; suporte aos cabeçalhos/códigos do legado.
- **2020 em diante:** Novo Caged `MOV + FOR − EXC`, por competência da movimentação, classificação por seção CNAE 2.0. Exclusão de admissão diminui o saldo; exclusão de desligamento aumenta. Não somar a exclusão com o sinal original.
- Importação sequencial, temporários descartados, checkpoint por arquivo agregado, SHA256, CRC/layout/UFs validados. Publicação inteira e imutável por load job; falta de arquivo impede uma nova versão. Nova versão substitui o componente do arquivo republicado, sem duplicá-lo na soma. Bucket privado e lock impedem execução concorrente; controle de idempotência não depende só da retenção do ID do job.
- A rota HMAC `/v1/caged-mte` reutiliza assinatura/identidade/transporte da ponte atual e aceita somente competência/versão, nunca SQL. Cache com limite de competências e TTL; cada resposta identifica a versão da fonte.
- Edge `caged-report` valida o Bearer Geobrain, pagina os municípios autorizados e exige o conjunto AL da edição. Não usa service role nem chave GCP no navegador. Reutiliza `BIGQUERY_PROXY_URL` e `BIGQUERY_PROXY_HMAC_SECRET` existentes no servidor.
- Slides **9–14** dinâmicos nas duas edições: Brasil/AL total e construção, tabelas por UF, setores AL e Nordeste. Anos anteriores completos, ano corrente até o fechamento e mês homólogo. O trimestral usa o mês de fechamento nesse bloco, conforme a referência; não triplica o saldo mensal.
- Preserva negativos e zero explícito. Ausência não vira zero; períodos incompletos não entram na tabela. Brasil inclui `NI`, evitando perder movimentações sem UF. Setores residuais permanecem nos totais. Variação de saldo sobre módulo da base anterior; denominador zero fica sem percentual. Participação construção/total e sua variação são calculadas na mesma fotografia.
- Falha CAGED preserva os indicadores imobiliários e oferece retry de fontes. Cancelar/trocar período/token descarta respostas tardias. Aguardar CAGED usa a etapa existente de carregamento Brain, com tempo real.

**Preferência do usuário:** o original não traz uma marca de “quebra” em 2020. A diferença CAGED antigo/Novo permanece na origem/documentação, sem acrescentar essa nota ao gráfico. Arte/ordem dos originais, mensal/trimestral, rota oculta, GeoApiScopeEngine, Select/Dialog e BrainLoadingState foram reutilizados. Nenhum novo primitive, token ou desvio de lazy-loading.

## Fonte real e conciliação

FTP oficial acessado em 17/11. Listagens 2017–2019 e início do Novo Caged conferidas, inclusive ausência de FOR em jan/2020 e início de EXC em abr/2020. Pasta `CAGED_AJUSTES/2020` existe, mas estava vazia. Nenhuma fonte Base dos Dados foi usada para preencher o MTE.

| Piloto | Registros processados | Resultado observado |
|---|---:|---|
| MOV setembro/2026 | 4.307.569 | BR total 121.305; construção BR 9.468; AL total 11.110; construção AL 166 |
| FOR setembro/2026 | 91.861 | ajustes na competência original |
| EXC setembro/2026 | 4.161 | exclusões com sinal invertido uma vez |
| CAGED estatístico dezembro/2019 | 2.289.007 | BR mensal −307.311; leitura integral sem descartar registros |
| CAGED Ajustes dezembro/2019 | 80.023 | competências retroativas, não rotuladas como dezembro |

Os quatro totais de setembro coincidem com as células correspondentes da Tabela 4 do XLSX MTE baixado da publicação oficial (`BR` col. AE; `AL` col. P; total linha 7/construção linha 14). Snapshot local do piloto de setembro: **203 linhas / 14.454 bytes**, sem publicação. Isso é medição desse piloto, não do histórico inteiro nem dos bytes faturáveis BigQuery.

SHA256 dos arquivos oficiais processados:

| Arquivo | SHA256 |
|---|---|
| CAGEDMOV202609.7z | `967a29800166b32ba4f9d786e95b53122eed6dbd78ca94da783290d67cd5d50d` |
| CAGEDFOR202609.7z | `2646a98e115577be8606fb0f3ba772a2e5dde7e749211a35065f2cce8f13c056` |
| CAGEDEXC202609.7z | `96cd1af3eac03ec65e0dd12693f9fa4669ca3c049bbc21b6fc1d45f862124ba8` |
| CAGEDEST_122019.7z | `030ed7d9495b9599c09e5095f98cd245a57c66dddde54f8b8be097a7b593916c` |
| CAGEDEST_AJUSTES_122019.7z | `3062d46cc5264c89d1a88c60614ee6a7e3070570ed36450ba1713b4ab279b0fa` |

Brutos/derivados de ensaio em `.local-inputs/relatorios-lucas/maceio/caged-2026-11-17/`, não versionados.

## Verificação

- **123 testes Maceió** aprovados, incluindo contrato CAGED, reconciliação, NI, negativo/zero/ausência, mês de fechamento, falha isolada, retry, cancelamento e descarte de resposta atrasada.
- **6 testes Python** aprovados: MOV/FOR/EXC, legado/ajustes, recorte de competência, grid, substituição de componente e ausência de arquivos.
- **4 testes Edge** aprovados: Bearer, escopo AL paginado, assinatura, recusa de SQL e paginação externa, falhas sanitizadas.
- **3 testes da nova rota** aprovados; **9 testes existentes do proxy** aprovados depois de aplicar o instalador numa cópia temporária do source real. O checkout do Sistema Quanti não foi alterado. Ponto de montagem real confirmado em ensaio.
- SQL da ponte validado em dry run no plugin BigQuery contra CTE sintética com o mesmo schema, 0 bytes. Não comprova existência/permissões da tabela de produção.
- **144 cenários visuais** dos seis slides, mensal/trimestral, 1440/390px, claro/escuro, sucesso/vazio/erro; **24 verificações adicionais** do setorial após ajuste de rótulos negativos. Fixtures incluem milhões e valores negativos. Sem erros JS/NaN/overflow horizontal. Capturas inspecionadas.
- **12 cenários da página real** com API/CAGED interceptados, sucesso/vazio/erro, mensal/trimestral, desktop claro/mobile escuro; resposta CAGED deliberadamente atrasada em **1,6s somente no script de teste**. Carregamento Brain visível, consulta única CAGED e ação de retry conferidos. Nenhum atraso artificial acrescentado à produção.
- Tipos e lint aprovados; build de produção registrado no fechamento. Regressão ampla Secovi/FIERGS + testes CAGED/hook: 505 aprovados, 2 ignorados e 2 falhas em `free-scopes-selection.test.tsx`; isolado reproduz 1 aprovado/2 falhas, já registradas na entrega anterior. Pastas FIERGS e shared sem diff nesta entrega. Não foram corrigidas fora do escopo.

## Ativação ainda pendente

O código foi implementado localmente; **não declarar CAGED disponível no site** por causa deste commit. Ainda não foram criados: tabela/bucket GCP, Cloud Run Job, Scheduler ou Edge remota. A fonte administrativa do Rebrain é Lovable Cloud, sem acesso direto comprovado nesta sessão.

Procedimento concreto, comandos e permissões no [README operacional](../../../../gcp/caged-mte/README.md). Pendências:

1. Definir projeto/dataset/bucket e aplicar `table.sql` em US.
2. Executar a carga completa **desde 201701**, incluindo os comparativos antigos. Não foi executada nesta sessão; os dois pilotos não equivalem a esse bootstrap.
3. Montar/publicar a rota da ponte, publicar a Edge no Lovable Cloud e criar o agendamento autenticado. Reutilizar secrets existentes, sem exportar service role.
4. Fazer geração autenticada dos dois modelos e homologar os totais/métodos com o analista. Estatístico/ajustes antigos, Novo Caged e vintage da publicação precisam permanecer rastreáveis.

Sem escrita Monday, push, deploy ou custo medido de produção. PPTX/PDF Maceió permanecem na frente própria de exportação.
