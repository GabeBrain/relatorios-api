# Plano terminal Luna — Empregados V1

**Data:** 2026-09-03

**Executor:** Luna

**Ambiente:** Rebrain / Lovable / Supabase

**Rota:** `/rebrain/empresas-empregados`

**Monday:** [reBrain — Empresas e Empregados](https://brain381753.monday.com/boards/18398428946/pulses/12880655319) — `12880655319`

## 0. Missão e autoridade desta execução

Entregar uma primeira versão utilizável do relatório **Empregados**, municipal e anual, baseada na
RAIS publicada pela Base dos Dados no BigQuery. A entrega inclui página web, backend protegido,
cache compartilhado, auditoria técnica e exportação XLSX local.

O domínio **Empresas** deve existir somente como contrato fantasma, compilável e testado, para
reduzir retrabalho quando for ativado. Nesta execução é proibido consultar a Receita Federal,
baixar ZIPs de CNPJ, criar tabelas de empresas, executar batch de empresas ou apresentar dados
simulados como reais.

Luna está autorizada a:

- alterar frontend, rotas e navegação da feature;
- criar migrations e Edge Functions locais do Supabase;
- criar testes, fixtures derivadas e documentação;
- fazer commits locais isolados diretamente em `main`.

Luna não está autorizada a:

- fazer `push`, deploy, aplicar migrations remotas ou cadastrar secrets sem autorização humana;
- escrever, comentar ou mudar o card no Monday;
- modificar APIs externas, enviar arquivos ou persistir qualquer XLSX gerado;
- ampliar o escopo para o pipeline real de Empresas.

## 1. Resultado terminal esperado

Ao final, um usuário autenticado pelo Bearer do GeoBrain deve conseguir:

1. abrir a nova página pelo menu, home, busca e URL direta;
2. escolher uma UF, um município brasileiro e um ano RAIS disponível;
3. gerar um relatório de um único município por vez;
4. consultar resumo, setores, ocupações e metodologia na tela;
5. pesquisar, ordenar e percorrer a lista completa de ocupações sem travar a página;
6. exportar o mesmo conteúdo para XLSX no próprio navegador;
7. repetir uma consulta idêntica, em outra sessão ou outro computador, reutilizando o snapshot
   compartilhado no Supabase sem repetir a consulta ao BigQuery.

A mesma página mostra **Empresas — em preparação**, desabilitado e sem ação de geração. Nenhum
dado de Empresas deve ser retornado nesta versão.

## 2. Contrato funcional fechado

### 2.1 Universo de Empregados

- Fonte: `basedosdados.br_me_rais.microdados_vinculos` no BigQuery.
- Unidade: **vínculo empregatício formal ativo**, e não pessoa única.
- Recorte: `vinculo_ativo_3112 = '1'`, portanto posição em 31 de dezembro do ano selecionado.
- Geografia: código IBGE de sete dígitos; exatamente um município por relatório.
- Setores: seção CNAE 2.0, traduzida pelo dicionário oficial usado pela Base dos Dados.
- Ocupações: CBO 2002, com código, grande grupo, família e ocupação.
- Remuneração: média e mediana da remuneração nominal de dezembro. Valores ausentes, nulos ou
  não positivos não entram no denominador salarial, mas o vínculo continua entrando na contagem.
- Percentuais: calculados sobre o total de vínculos do município/ano, com precisão mantida no
  modelo e arredondamento somente na apresentação/exportação.
- Categorias não mapeadas devem aparecer como `Não informado`; nunca devem ser descartadas.

### 2.2 Saída web

Usar quatro abas após uma geração bem-sucedida:

- **Visão geral:** município, UF, ano, total de vínculos, quantidade de setores e ocupações,
  remuneração média e mediana, data da geração/fonte e indicação de cache atualizado.
- **Setores:** tabela completa com setor, vínculos, participação, salário médio e mediano.
- **Ocupações:** busca textual por nome/código/família, ordenação, tabela virtualizada e contagem
  de resultados; não paginar nem truncar o conteúdo exportável.
- **Metodologia:** universo, data de referência, fonte, filtros, conceitos, limitações e aviso de
  que vínculos não equivalem a pessoas.

Antes da geração, a página apresenta os dois produtos como escolhas: Empregados ativo e Empresas
desabilitado. Não criar uma aba vazia de Empresas dentro do resultado.

### 2.3 XLSX

Gerar no navegador, por importação dinâmica da biblioteca XLSX, sem upload e sem Supabase Storage.
O arquivo deve conter, nesta ordem:

1. `Setores` — Setor, Empregados, Percentual, Salário médio, Salário mediano;
2. `Ocupações (CBO)` — Grande grupo, Família ocupacional, Ocupação, Código CBO, Empregados,
   Percentual, Salário médio, Salário mediano;
3. `Metodologia` — texto equivalente ao exibido na interface, incluindo fonte e timestamp.

Preservar números como números, moeda em BRL e percentuais como valores numéricos formatados.
Aplicar autofiltro, cabeçalho congelado e larguras legíveis. O objetivo de equivalência com as
amostras é estrutural e semântico; não copiar células de dados nem depender do XLSX de Rio Verde
como template em produção.

Nome do arquivo:

`empregados_<municipio>_<uf>_<dd>_<mes_pt>_<aaaa>_<hh>h<mm>.xlsx`

Exemplo: `empregados_rio_verde_go_01_jan_2026_14h32.xlsx`. O arquivo só passa a existir quando o
usuário aciona **Exportar XLSX**, na máquina dele.

## 3. Arquitetura obrigatória

```text
Página React
  -> Bearer GeoBrain já presente na sessão
  -> Supabase Edge Function rais-employees-report
       -> valida Bearer em endpoint leve do GeoBrain
       -> registra tentativa técnica
       -> procura snapshot compartilhado no Postgres
       -> hit: devolve snapshot
       -> miss: consulta parametrizada no BigQuery e grava agregado
  -> React Query mantém apenas cache de experiência no cliente
  -> exportador monta XLSX em memória e dispara download local
```

O cache do navegador não é a fonte compartilhada. O cache cross-user/cross-session é o snapshot
agregado no Postgres do Supabase. Ele não deve conter token, XLSX ou microdados individuais.

### 3.1 Credenciais e secrets

Nunca colocar credenciais GCP em `VITE_*`, no bundle, migration, log ou Git. Documentar e consumir
na Edge Function, no mínimo:

- `GCP_PROJECT_ID` — projeto pagador das consultas;
- `GCP_SERVICE_ACCOUNT_EMAIL`;
- `GCP_PRIVATE_KEY` — aceitar `\\n` escapado e normalizar somente em memória;
- `BIGQUERY_LOCATION` — valor explícito compatível com os datasets;
- `BIGQUERY_MAX_BYTES_BILLED` — teto por execução;
- `GEOBRAIN_API_URL` — URL usada para validar o Bearer.

Usar OAuth de service account somente no backend e chamadas REST oficiais do BigQuery. Fixar a
versão de qualquer dependência Deno utilizada. Não invocar `bq.cmd`, não depender da máquina de
desenvolvimento e não usar chave do usuário final para a fonte de dados.

### 3.2 Proteção pelo Bearer GeoBrain

- exigir `Authorization: Bearer <token>` na Edge Function;
- validar o token no servidor por uma chamada leve e autenticada ao GeoBrain; não confiar apenas
  em decode local do JWT;
- extrair da resposta validada um identificador estável e, se disponível, e-mail do usuário;
- nunca armazenar ou imprimir o token;
- responder 401/403 de modo distinguível na UI, encerrando a sessão conforme o padrão existente;
- aplicar rate limit por identidade e IP hash, com parâmetros configuráveis.

O seletor geográfico desta feature cobre os municípios brasileiros da RAIS e não deve limitar o
universo às cidades monitoradas do GeoBrain. Portanto, não usar `GeoApiScopeEngine` para escolher
município; ele continua sendo apenas o padrão para chamadas geográficas à API GeoBrain.

### 3.3 Consultas BigQuery

Portar a regra já validada em `Sistema-Quanti/Sistema Novo/scripts/build-rais-municipio-workbook.mjs`,
mas separar SQL de transporte e apresentação. Usar parâmetros nomeados para município, UF e ano;
nunca interpolar entrada humana em SQL.

Consultar e agregar no BigQuery:

- resumo total e remuneração;
- seção CNAE;
- CBO 2002 com joins nos diretórios/dicionários necessários.

Requisitos operacionais:

- `useLegacySql: false`;
- `maximumBytesBilled` obrigatório e falha amigável ao exceder;
- labels de job: produto, ambiente e versão da consulta, sem PII;
- registrar `jobId`, bytes processados/faturados e duração quando retornados;
- tratar paginação do `jobs.getQueryResults` até conclusão;
- conferir tipos numéricos e `null` explicitamente;
- uma consulta agregada nunca retorna microdados de vínculo ao Supabase ou ao cliente.

Disponibilizar os anos suportados por metadata backend derivada da fonte e cacheada. O maior ano é
destacado como **mais recente**, mas o usuário pode escolher qualquer ano retornado.

## 4. Banco e cache compartilhado

Criar migration reversível para três tabelas públicas com RLS habilitado e **sem policies para
anon/authenticated**. Somente a Edge Function com service role acessa os dados.

### `rais_employee_snapshots`

- identidade: UUID;
- chave lógica única: `municipality_ibge`, `year`, `query_version`, `methodology_version`;
- município, UF, ano, versões e timestamps;
- status `processing | ready | failed`, lease e contador de tentativas;
- totais, remuneração agregada, bytes da geração e erro sanitizado;
- índices para chave lógica, status e atualização.

### `rais_employee_sectors`

- FK com cascade para snapshot;
- código/ordem da seção, rótulo, vínculos, percentual, média e mediana;
- unique por snapshot + código de setor.

### `rais_employee_occupations`

- FK com cascade para snapshot;
- CBO, grande grupo, família, ocupação, vínculos, percentual, média e mediana;
- índices por snapshot, CBO e pesquisa textual normalizada;
- unique por snapshot + CBO.

### `rais_employee_query_runs`

Além das três estruturas de cache, criar o log técnico de todas as solicitações:

- identidade validada do usuário, sem token;
- município/UF/ano e snapshot associado;
- `cache_hit`, status, código de erro sanitizado e duração;
- `bigquery_job_id`, bytes processados e faturados quando houver;
- timestamp e versão da aplicação/consulta.

Não expor histórico na interface nesta V1. Não armazenar SQL com PII, IP puro, payload bruto ou
arquivo exportado. Definir retenção documentada para logs; inicialmente 12 meses, ajustável por
configuração/migration posterior.

### 4.1 Antiduplicação e recuperação

Implementar aquisição atômica pela chave lógica única:

- `ready`: devolver cache imediatamente e registrar hit;
- `processing` com lease válida: devolver `202` e permitir polling curto pelo cliente;
- `processing` com lease expirada ou `failed`: assumir nova tentativa de forma atômica;
- primeiro gerador: executa, grava linhas em transação e muda para `ready` somente ao final;
- erro: marca `failed`, mantém mensagem sanitizada e não deixa snapshot parcial visível.

Duas pessoas pedindo Rio Verde/2025 simultaneamente devem provocar no máximo uma geração BigQuery.
Snapshot RAIS anual pronto não expira automaticamente; uma nova `query_version` ou
`methodology_version` cria nova chave e invalida semanticamente a versão anterior.

## 5. Contrato fantasma de Empresas

Criar dentro da feature, sem backend ativo:

- `ReportKind = 'employees' | 'companies'`;
- mapa de capacidades com `employees: enabled` e `companies: disabled`;
- tipos mínimos de pedido/resposta futura de estabelecimentos, sem afirmar schema ainda incerto;
- interface `CompanyReportProvider` e implementação `DisabledCompanyReportProvider` que retorna
  erro tipado `FEATURE_DISABLED` sem rede ou I/O;
- flag única `COMPANIES_REPORT_ENABLED = false`, não configurável pelo usuário;
- componente visual desabilitado **Empresas — em preparação**.

Testes devem provar que selecionar/renderizar Empresas não chama `fetch`, Supabase ou Receita.
Não criar Edge Function, migration, cron, job, tabela, secret ou fixture real de Empresas. O
`DEVELOPMENT.md` permanece referência para a futura fase: estabelecimento ativo, matriz/filial,
porte inferido e pipeline mensal em batch serão decididos com Diego antes da ativação.

## 6. Plano de execução por gates

### T0 — Baseline, inventário e contrato de fixtures

1. Cumprir o protocolo do `AGENTS.md`: remotes, fetch, comparação, `main`, status e identidade.
2. Ler integralmente `FRONTEND_GUIDELINES.md`, `DESIGN_SYSTEM.md`, este plano, o README e
   `DEVELOPMENT.md`.
3. Inspecionar as duas amostras sem regravá-las e criar fixtures mínimas anonimizadas/derivadas.
4. Registrar baseline de testes, typecheck e build antes de alterar produto.

Gate T0:

- Rio Verde/GO 2025: 81.601 vínculos ativos e 1.115 ocupações;
- Blumenau/SC 2025: 154.664 vínculos ativos e 1.390 ocupações no CSV disponível;
- qualquer divergência é investigada antes da implementação, sem ajustar números por conveniência.

### T1 — Domínio puro e SQL parametrizado

Criar `src/features/empresas-empregados/` com contratos, normalizadores, metodologia, formatação,
capabilities e exportação desacoplados de React. Criar o SQL e testes unitários de seus filtros,
agregações e joins. Incluir `QUERY_VERSION` e `METHODOLOGY_VERSION` explícitos.

Gate T1: regras de contagem, remuneração, não mapeados e percentuais cobertas por testes; nenhum
SQL interpola município, UF ou ano.

### T2 — Migration de cache e auditoria

Criar tabelas, constraints, índices, RLS sem policies públicas e funções SQL transacionais mínimas
para adquirir/finalizar/falhar snapshot. Adicionar testes de migration ou assertions SQL.

Gate T2: anon/authenticated não leem nem escrevem; service role executa o fluxo; chave lógica
impede snapshots duplicados; falha não publica linhas parciais.

### T3 — Edge Function e provedor BigQuery

Implementar ações tipadas `metadata`, `generate` e `status`. Separar:

- autenticação GeoBrain;
- cache/repositório Supabase;
- cliente BigQuery;
- mapeamento de resposta;
- logging/auditoria.

Usar CORS restrito aos hosts configurados e mensagens públicas sem stack/SQL. Adicionar mocks de
rede e testes para 401, 403, 429, teto de bytes, timeout, erro BigQuery, hit, miss, polling e lease.

Gate T3: uma mesma chave solicitada por usuários diferentes reaproveita o snapshot; cada pedido
gera seu próprio registro técnico; nenhum segredo ou token aparece nos logs/respostas.

### T4 — Página e estados humanos

Adicionar rota lazy `/rebrain/empresas-empregados`, menu lateral, home e command palette conforme
os padrões existentes. Construir seletor de produto, UF, município e ano com busca acessível.

Cobrir explicitamente:

- inicial/sem seleção;
- loading de metadata;
- seleção inválida;
- geração e polling;
- sucesso de cache e de geração nova;
- vazio legítimo;
- sessão expirada/sem autorização;
- limite de custo/rate limit;
- falha recuperável com retry;
- mobile, desktop, claro e escuro.

Não disparar consulta pesada ao trocar filtros. A geração só começa pelo CTA explícito
**Gerar relatório de empregados**.

Gate T4: navegação por teclado, labels, foco, contraste e tabela virtualizada verificados; Empresas
permanece visível e inerte.

### T5 — XLSX exclusivamente local

Implementar exportador puro e importá-lo dinamicamente somente após o clique. Testar nomes/ordem
das abas, colunas, tipos, totais, metodologia e nome do arquivo. Espionar rede e Storage no teste
para provar que exportar não faz upload nem segunda consulta ao BigQuery.

Gate T5: abrir o workbook gerado com a própria biblioteca e validar o objeto serializado; se não
houver Excel disponível no ambiente, declarar a limitação e usar essa verificação headless.

### T6 — Homologação Rio Verde e Blumenau

Com credenciais de ambiente disponíveis, gerar ambos os municípios em 2025 e comparar:

- total de vínculos;
- quantidade e soma das ocupações;
- top setores e ocupações;
- média/mediana e tratamento de nulos;
- estrutura do XLSX e metodologia.

Não aceitar apenas os totais: selecionar amostras de começo, meio e fim das tabelas. Se a fonte
atual tiver sido retificada, registrar data, job e diferença; não mascarar o desvio para coincidir
com os arquivos históricos.

Gate T6: comparação registrada em evidência versionável, sem credenciais. Sem acesso remoto, Luna
marca este gate como `PENDENTE_AMBIENTE`, conclui tudo que for headless e não afirma validação real.

### T7 — Regressão, documentação e handoff

Executar, no mínimo:

- testes direcionados da feature e Edge Function;
- suíte completa aplicável;
- typecheck;
- lint dos arquivos alterados e relato separado do lint global preexistente;
- build de produção;
- `npm run check:live-docs -- <base> <head>`.

Atualizar este plano com resultado por gate, o README da feature e `LIVE_rebrain.md`. Fazer commit
isolado com `git add <caminhos>` explícito. Não incluir arquivos alheios encontrados na árvore.
Não fazer push.

## 7. Critérios de aceite não negociáveis

- [ ] Só usuários com Bearer GeoBrain validado geram/consultam relatórios.
- [ ] Um relatório contém exatamente um município e um ano.
- [ ] O maior ano disponível está destacado, sem bloquear anos anteriores.
- [ ] Resultado distingue vínculo de pessoa e explicita 31/12.
- [ ] Setores e ocupações reconciliam com o total ou explicam formalmente qualquer diferença.
- [ ] Cache é compartilhado entre usuários/sessões e não depende do navegador.
- [ ] Corrida concorrente não duplica consulta BigQuery.
- [ ] Toda solicitação deixa auditoria técnica sem armazenar token.
- [ ] Nenhum XLSX ou microdado é persistido pelo Rebrain.
- [ ] Exportação completa funciona mesmo com tabela virtualizada/filtrada na tela.
- [ ] Empresas não faz rede, não cria dados e aparece apenas como futura capacidade.
- [ ] Rio Verde e Blumenau têm comparação documentada ou bloqueio remoto explicitamente relatado.
- [ ] Nova página é lazy e cobre estados de loading, vazio, erro, autorização e sucesso.
- [ ] Não houve push, deploy, migration remota nem escrita no Monday.

## 8. Saída exigida da Luna

Ao concluir, Luna deve responder com:

1. `LUNA_READY_FOR_GABRIEL — EMPREGADOS_V1`;
2. resumo do que foi implementado;
3. gates T0–T7 com `OK`, `PENDENTE_AMBIENTE` ou `BLOQUEADO`, incluindo evidências;
4. arquivos e migrations criados;
5. testes/comandos e resultados exatos;
6. secrets ainda necessários, sem seus valores;
7. limites que não puderam ser observados em runtime;
8. hash do commit local e distância de cada remote;
9. pergunta explícita: **“Quer que eu faça o push?”**

Não usar `LUNA_READY_FOR_GABRIEL` se houver teste obrigatório quebrado por alteração desta entrega,
falha de segurança conhecida, persistência de XLSX ou qualquer caminho ativo de Empresas.
