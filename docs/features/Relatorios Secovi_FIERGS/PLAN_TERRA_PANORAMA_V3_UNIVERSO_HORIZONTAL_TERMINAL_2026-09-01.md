# Tarefa terminal — Panorama V3: universo horizontal oficial e resiliência da GeoBrain

**Data:** 01/set/2026
**Executor:** Terra
**Rota:** `/rebrain/panorama-secovi-fiergs`
**Objetivo:** construir a V3 em paralelo à V2, aplicar definitivamente a política Secovi de
condomínios de casas, tornar a coleta v2 resiliente e disponibilizar a V3 para homologação interna
com preview, PDF e PPT espelho coerentes.

## Fontes obrigatórias

- [`MAPEAMENTO_UNIVERSO_HORIZONTAL_SECOVI_2026-09-01.md`](./MAPEAMENTO_UNIVERSO_HORIZONTAL_SECOVI_2026-09-01.md)
- [`DECISOES_E_PREMISSAS_PANORAMA.md`](./DECISOES_E_PREMISSAS_PANORAMA.md), PRE-002, PRE-025,
  PRE-026 e PRE-027
- retorno de Juliana em `panorama-jundiai-2T2026 - corrigido.pdf` (insumo local, não versionado)
- orientação de Edgar: `typologies_history[].pattern` é o padrão histórico do período;
  `data[].standard` é o padrão atual
- `scripts/panorama-horizontal-taxonomy.mjs` e `.tmp/horizontal-taxonomia.json`
- `scripts/panorama-evidence.mjs` e `.tmp/panorama-evidencia-2T2026.json`
- `docs/architecture/FRONTEND_GUIDELINES.md` e `docs/architecture/DESIGN_SYSTEM.md`

## Decisões imutáveis desta execução

1. Horizontal no Panorama Secovi significa **somente** `Condomínio de Casas/Sobrados`.
2. Pertinência é estável por empreendimento: aceitar quando `standard` ou qualquer
   `typologies_history[].pattern` trouxer exatamente esse produto.
3. Excluir loteamento aberto/fechado/comercial, condomínio de chácaras, terreno, produto ausente e
   rótulo desconhecido. Toda exclusão precisa de motivo, contagem e amostra auditável.
4. Não usar nome comercial, regex ou semelhança textual para decidir produto.
5. Padrão socioeconômico é temporal. Se o `pattern` do período trouxer produto, herdar o último
   padrão socioeconômico **anterior**. Sem anterior, usar `Não classificado`; é proibido olhar para
   período futuro.
6. Município sem empreendimento horizontal aceito não exibe bloco nem lâmina horizontal. Não gerar
   páginas zeradas.
7. O legado não pode ser fallback do universo V3: ele não traz `pattern` e não consegue provar nem
   pertencimento nem ausência. Falha definitiva do v2 bloqueia a geração com mensagem humana.
8. A V2 permanece disponível como rollback durante a homologação. A V3 fica selecionável na mesma
   rota e só vira padrão após aceite explícito.

## Evidência já fechada

- 24 municípios, 924 horizontais e 42.917 linhas históricas na medição-base.
- 11 empreendimentos aceitos em 6 municípios; 18 municípios sem bloco horizontal.
- Jundiaí: zero aceitos; o horizontal anterior vinha de loteamentos/chácaras.
- Medição repetida: 349 registros apenas socioeconômicos. Em 349/349, os campos candidatos de
  subtipo estão vazios; `building_type=Horizontal` informa somente o segmento.
- `standard`, `pattern` e `product_type` enviados como filtros ao v2 foram ignorados: mesmos IDs e
  mesmo total da consulta-base.
- Cinco matrizes completas do v2: 79 respostas 500 transitórias, todas recuperadas na segunda
  tentativa; nenhuma precisou da terceira.
- `ivv?group_by=Tipologia`: HTTP 500 em Guarujá, Praia Grande, Santos e São Vicente; cada cidade
  terminou com 9/10 séries. É falha sistemática separada do 500 transitório de empreendimentos.

## P0 — proteção de versão e contrato de saída

- Introduzir tipo explícito `PanoramaEngineVersion = 'v2' | 'v3'` e incluir a versão na query key,
  no modelo, no dossiê, nos nomes de exportação e nos metadados do PDF/PPT.
- Adicionar seletor interno “V2 atual / V3 — universo oficial” junto dos controles da rota,
  reutilizando primitives e tokens existentes. A escolha inicial continua V2 durante homologação.
- Impedir cache cruzado: V2 e V3 nunca compartilham resultado do React Query.
- Preservar filtros geográficos via `GeoApiScopeSelector` + `useGeoApiScope`; nenhuma lista IBGE.
- Estados obrigatórios da V3: carregando com progresso, escopo inválido, erro recuperável, universo
  horizontal vazio, sucesso completo e sucesso com métrica externa indisponível.

## P1 — retry correto e observável no contrato v2

- Criar helper testável e cancelável, preferencialmente em
  `src/features/panorama-secovi-fiergs/lib/request-with-retry.ts`, sem alterar globalmente
  `httpRequest` nesta tarefa.
- Política para `v2/building-with-history`:
  - máximo de **3 tentativas totais**;
  - retry somente para erro de rede, timeout, HTTP 429 e HTTP 5xx;
  - nunca repetir 400, 401, 403, 404 ou 422;
  - delays-base 400 ms e 1.200 ms, com jitter de até 30%;
  - respeitar `Retry-After` quando presente, limitado ao orçamento da geração;
  - cancelar imediatamente em `AbortSignal` e nunca iniciar tentativa posterior;
  - registrar cidade, tipo, status, página, tentativa, status HTTP, latência e resultado, sem token.
- Manter cidade por cidade (`CITY_CONCURRENCY=1`) e até quatro requisições internas, mas evitar que
  retries da mesma lane criem rajada adicional.
- Remover o fallback legado do caminho V3. Após três falhas, mostrar cidade/etapa e “Tentar
  novamente”; não montar relatório parcial ou zerado.
- Testes com relógio falso: sucesso inicial, 500→200, rede→500→200, 429 com `Retry-After`, 401 sem
  retry, terceira falha terminal e cancelamento durante backoff.

## P2 — política de universo como regra pura

- Substituir a heurística de `classifyHorizontalSubtype` no caminho V3 por vocabulário fechado:
  `condominio_casas`, `produto_excluido`, `produto_nao_informado`, `rotulo_desconhecido`.
- Separar funções puras:
  - `classifyHorizontalProductLabel(label)`;
  - `decideHorizontalUniverse(building)`;
  - `resolveHistoricalSocioeconomicPattern(history)`.
- A decisão por empreendimento lê `standard` e **todo** o histórico antes de aceitar/rejeitar.
- Deduplicar `building_id` entre status e páginas antes de contabilizar universo.
- Gerar `UniverseAudit` com aceitos, rejeitados por motivo, rótulos desconhecidos e IDs/amostras.
- Rótulo novo falha fechado: rejeita o registro, emite warning rastreável e aparece no dossiê.
- Testes obrigatórios com os 11 aceitos conhecidos, falsos positivos por nome comercial, produtos
  excluídos, campos ausentes e alternância produto↔socioeconômico no mesmo empreendimento.

## P3 — herança temporal do padrão

- Ordenar o histórico por período crescente e manter `lastKnownSocioeconomicPattern` por
  empreendimento/tipologia.
- Rótulo socioeconômico observado atualiza o acumulador e recebe origem `observed`.
- Rótulo de produto usa o acumulador anterior e recebe origem `inherited`.
- Antes do primeiro socioeconômico, usar `Não classificado` com origem `unclassified`.
- `Futuro` é marcador temporal, não padrão socioeconômico; não atualiza nem apaga o acumulador.
- Não usar `building.standard` como look-ahead para períodos históricos. Ele participa apenas da
  pertinência global e, quando temporalmente aplicável, do estado atual documentado.
- Expor no dossiê contagens de `observed`, `inherited` e `unclassified`.
- Testar sequências: socio→produto, produto→socio, produto sem anterior, Futuro intercalado,
  períodos fora de ordem e múltiplas tipologias.

## P4 — firewall de fontes horizontais

- Todo número horizontal da V3 deve nascer exclusivamente do cubo filtrado de empreendimentos
  aceitos. É proibido reutilizar linhas temporais que agregam todos os horizontais.
- Auditar lançamentos, vendas, estoque, IVV, ticket, área, R$/m², VGV, coortes, maturidade,
  participação, comparativos municipais, narrativas e totais.
- Quando `building-with-history` não fornecer insumo suficiente para uma métrica horizontal,
  marcar `unavailable` com fonte e motivo; nunca usar o endpoint agregado de todos os horizontais e
  nunca substituir por zero.
- “Total” deve ser recalculado como Vertical + Condomínio de Casas aceito. Nenhum loteamento entra
  indiretamente por série temporal, matriz, narrativa ou comparativo.
- Acrescentar assertiva de proveniência no modelo: consumidor horizontal sem `sourceUniverseId`
  válido deve falhar em teste/desenvolvimento.

## P5 — IVV por tipologia e circuit breaker

- Tratar separadamente `temporal-analysis-city/ivv?group_by=Tipologia`.
- Fazer no máximo uma repetição curta para confirmar o 500. Se falhar novamente, abrir circuito
  para essa combinação endpoint+agrupamento durante toda a geração e não consultar nas cidades
  restantes.
- O circuito não bloqueia as outras nove séries. O bloco dependente fica `unavailable`, com a
  mensagem “IVV por tipologia indisponível na GeoBrain”; não mostrar zero.
- Registrar a primeira cidade/status que abriu o circuito e quantas chamadas foram evitadas.
- Não derivar IVV aditivo. Se houver fórmula granular aprovada no futuro, ela entra em tarefa
  separada vinculada à PRE-025.
- Testes: 500→500 abre circuito, cidades seguintes não chamam o endpoint, demais séries seguem,
  reexecução nova começa com circuito fechado e 200 preserva o fluxo normal.

## P6 — manifesto condicional e comentários de Juliana

- Tornar o manifesto função do modelo V3. Se `acceptedHorizontalCount === 0`, remover a abertura e
  todas as lâminas horizontais, atualizar sumário, navegação, numeração e total de páginas.
- Onde houver horizontal, posicioná-lo após o subtotal Vertical e usar somente “Condomínio de
  Casas”; remover “loteamentos” de títulos e narrativas.
- Aplicar os demais apontamentos do PDF revisado:
  - formatação condicional nas tabelas, especialmente R$/m²;
  - subtotal “lançados após 2024” depois da linha de 2026;
  - corrigir percentuais e manter horizontal/vertical separados nos preços;
  - exibir rótulo zero, incluir 2T26 e manter fundo branco apenas nos segundos trimestres;
  - revisar IVV e metragens conforme referência 1T26;
  - aumentar fontes institucionais;
  - gráfico solicitado em barras com variação entre períodos;
  - tabela anual horizontal com o mesmo formato da vertical;
  - retirar página vazia quando não houver ativos;
  - remover menção narrativa a “API GeoBrain”;
  - mapa somente quando `VITE_MAPBOX_ACCESS_TOKEN` estiver configurado e validado;
  - consultor sem foto deve usar estado vazio aprovado, nunca o texto “Foto do Consultor”.
- Preview, PDF e PPT espelho devem consumir o mesmo manifesto e o mesmo `Sheet`.

## P7 — disponibilização para testes

- Cenários autenticados obrigatórios:
  1. Jundiaí 2T2026: zero horizontais; bloco ausente e nenhuma página vazia.
  2. Praia Grande 2T2026: seis aceitos; nenhum loteamento; herança temporal visível no dossiê.
  3. Baixada multicidades: apenas condomínios elegíveis entram; IVV por tipologia indisponível sem
     bloquear as outras séries.
  4. Campinas e Ribeirão Preto: aceitos encontrados apenas pelo histórico.
  5. Gravataí/Pelotas: validação equivalente no RS/FIERGS.
- Gerar para cada cenário: screenshot da seleção V3, sumário, subtotal vertical, bloco horizontal
  quando aplicável, dossiê metodológico e arquivo PDF. Para Jundiaí, provar a ausência do bloco.
- Executar QA do mesmo fluxo em desktop/mobile e claro/escuro; conferir foco e rótulo do seletor de
  versão.
- Disponibilizar a V3 para homologação interna mantendo V2 como padrão. Não promover V3 nem remover
  V2 sem aceite humano explícito.

## Arquivos principais esperados

- `src/features/panorama-secovi-fiergs/api.ts`
- `src/features/panorama-secovi-fiergs/types.ts`
- `src/features/panorama-secovi-fiergs/domain/entity-policy.ts`
- `src/features/panorama-secovi-fiergs/domain/cube.ts`
- `src/features/panorama-secovi-fiergs/report/model.ts`
- `src/features/panorama-secovi-fiergs/report/manifest.ts`
- `src/features/panorama-secovi-fiergs/pages/PanoramaSecoviFiergsPage.tsx`
- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`
- `src/features/panorama-secovi-fiergs/components/MarketSlides.tsx`
- `src/features/panorama-secovi-fiergs/lib/request-with-retry.ts` (novo)
- testes unitários/contrato/browser da própria feature

## Critérios terminais de aceite

1. Nenhum produto horizontal entra por nome comercial ou por `building_type=Horizontal` sozinho.
2. Os 11 empreendimentos conhecidos entram; loteamentos/chácaras/terrenos e ambíguos ficam fora.
3. Jundiaí não possui bloco horizontal; Praia Grande possui somente os seis aceitos.
4. Herança usa apenas o último padrão anterior e identifica sua origem.
5. O 500 transitório do v2 é recuperado sem mais de três tentativas e sem fallback legado.
6. O IVV por tipologia abre circuito após confirmação e não multiplica espera por cidade.
7. Toda métrica horizontal comprova origem no cubo filtrado ou aparece indisponível.
8. Sumário, páginas, preview, PDF e PPT espelho permanecem sincronizados após supressão condicional.
9. Todos os comentários de Juliana listados no P6 têm teste ou evidência visual correspondente.
10. V3 fica acessível para testes e V2 permanece como rollback/default até homologação.
11. Typecheck, testes da feature, browser QA, build e `check:live-docs` passam.

## Comandos finais

```powershell
git status --short
cmd /c npm test -- --run src/features/panorama-secovi-fiergs
cmd /c npm run typecheck
cmd /c npm run build
cmd /c npm run check:live-docs -- origin/main main
git diff --check
```

## Handoff obrigatório do Terra

- Relatar contagens de aceitos/rejeitados por cidade e por motivo.
- Relatar tentativas/retries por status e o circuito do IVV.
- Informar o padrão de frontend reutilizado e os estados verificados.
- Anexar caminhos das evidências em `.tmp/` e os nomes dos PDFs/PPTs gerados.
- Atualizar o documento vivo do Rebrain e este plano com o resultado real.
- Fazer commit isolado com `git add` explícito. Não fazer push; perguntar ao responsável.

## CTA para o Terra

> Execute integralmente este plano na `main`. Comece pelos testes de retry e política de universo;
> depois construa o cubo V3 com firewall de fontes, herança temporal e manifesto condicional. Só então
> aplique os comentários editoriais e exponha o seletor V2/V3. Não considere concluído sem os cinco
> cenários autenticados, preview/PDF/PPT coerentes e evidência de que Jundiaí perdeu corretamente o
> bloco horizontal enquanto Praia Grande manteve apenas os seis condomínios aceitos.
