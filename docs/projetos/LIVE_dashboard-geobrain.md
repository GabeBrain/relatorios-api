# Dashboard GeoBrain — Documento Vivo

**Responsável:** Edgar · **Rota:** `/dash-geobrain` · **Código:** [`src/features/dashboard-geobrain/`](../../src/features/dashboard-geobrain/) · Página: [`src/pages/DashboardGeobrain.tsx`](../../src/pages/DashboardGeobrain.tsx)

Doc vivo do projeto. Ver a convenção e a regra de atualização em [`README.md`](./README.md).
Atualize **Desenvolvimentos / Etapas / Pendências** sempre que sincronizar uma alteração relevante.

---

## Motor / arquitetura atual (base zero — 2026-07-08)

Dashboard de KPIs e gráficos sobre a base de empreendimentos da **API pública GeoBrain**.

- **Conexão de API — `RUNTIME`.** [`api.ts`](../../src/features/dashboard-geobrain/api.ts) consome
  `https://app.geobrain.com.br/public-api/v2/building-with-history-internal` por `POST`, autenticado
  com o token global. Para cada cidade, percorre Comercial, Horizontal e Vertical sequencialmente;
  consulta a página 1, lê `meta.last_page` e busca as restantes em lotes de até 5, com 100 itens por
  página e timeout de 60 segundos por requisição. Os registros são agregados sem deduplicação por
  `building_id`.
- **Normalização — `RUNTIME`.** `normalizeBuilding()` + helpers (`toNum`, `toNumOrNull`,
  `parseDate`, `parseGarage`) saneiam o payload cru da API. Domínios conhecidos:
  tipos `Vertical | Horizontal | Comercial | Hotel`; status `Ativo | Esgotado`.
- **Tipos — `RUNTIME`.** [`types.ts`](../../src/features/dashboard-geobrain/types.ts): `Building`, `Typology`, `HistoryEntry`.
- **Agregação — `RUNTIME`.** [`aggregate.ts`](../../src/features/dashboard-geobrain/aggregate.ts) computa os KPIs/séries a partir dos buildings normalizados.
- **Data hook — `RUNTIME`.** [`use-dashboard-data.ts`](../../src/features/dashboard-geobrain/use-dashboard-data.ts) orquestra fetch + agregação (React Query).
- **UI — `RUNTIME`.** [`Charts.tsx`](../../src/features/dashboard-geobrain/Charts.tsx) (visualizações),
  [`FiltersPanel.tsx`](../../src/features/dashboard-geobrain/FiltersPanel.tsx) + [`MultiSelect.tsx`](../../src/features/dashboard-geobrain/MultiSelect.tsx) (filtros por tipo/status/etc.).

**O que já está pronto:** conexão à API GeoBrain, normalização do payload, agregação de KPIs,
gráficos e painel de filtros funcionais em runtime.

---

## 1. Desenvolvimentos

### 2026-09-25 — Filtro geográfico das bolhas e classificação de dormitórios — Codex
- **Ambiente/funcionalidade:** `/dash-geobrain` — Preço/m² × Área privativa, filtros de dormitórios e mapas de oportunidades.
- **O quê:** o gráfico de bolhas passou a permitir selecionar Bairro, UF ou Município, mantendo o segmentador de Padrão. A categorização de `number_bedroom` foi unificada em todos os gráficos e filtros: `0` ou nulo = 0 dorms; `1` = 1 dorm; `2` = 2 dorms; `3` = 3 dorms; `4` = 4+ dorms; `5` = Studio.
- **Por quê:** ampliar o recorte geográfico do gráfico de bolhas e aplicar a regra de classificação de dormitórios de forma consistente.
- **Arquivos:** `src/features/dashboard-geobrain/{aggregate.ts,aggregate.test.ts,Charts.tsx,Sidebar.tsx,FiltersPanel.tsx}`, `src/pages/DashboardGeobrain.tsx`.
- **Commits:** `660ee45`.
- **Monday:** —
- **Impacto em Etapas/Pendências:** etapa 4 permanece concluída; a regra fica coberta por teste unitário de agregação.

### 2026-09-25 — Filtros e visualizações geográficas do Dashboard — Codex
- **Ambiente/funcionalidade:** `/dash-geobrain` — filtros locais e agrupamento geográfico dos gráficos.
- **O quê:** adicionados os filtros locais de UF e Município abaixo de Períodos; eles refinam os dados já carregados sem disparar nova consulta. Os gráficos antes restritos a Bairro e os dois mapas de oportunidades agora permitem alternar entre Bairro, UF e Município. A barra de filtros ativos passou a mostrar UF, toda a terminologia visível foi padronizada para Município e o cabeçalho recebeu Limpar, que remove somente Região, UF e Município do escopo da próxima consulta.
- **Por quê:** permitir leitura comparativa por diferentes níveis geográficos, separar filtros locais do escopo de coleta e uniformizar a nomenclatura da interface.
- **Arquivos:** `src/features/dashboard-geobrain/{ActiveFiltersBar.tsx,FiltersPanel.tsx,Header.tsx,OpportunityMap.tsx,Rankings.tsx,Sidebar.tsx,aggregate.ts,aggregate.test.ts,api.ts,types.ts}`, `src/pages/DashboardGeobrain.tsx`, `src/features/shared/geo-api-scope-engine/GeoApiScopeSelector.tsx`.
- **Commits:** `685bf48`.
- **Monday:** —
- **Impacto em Etapas/Pendências:** etapa 4 permanece concluída; filtros locais e escopo de API continuam separados. A validação manual autenticada do Dashboard permanece pendente.

### 2026-09-25 — Escopo por Região, UF ou Cidade com carregamento manual — Codex
- **Ambiente/funcionalidade:** `/dash-geobrain` — filtros geográficos e coleta da API.
- **O quê:** adicionado o filtro Região antes de UF, com dados de `region` do mesmo `/monitored-cities`; ele restringe as opções de UF sem selecionar uma automaticamente. O botão Carregar consulta apenas `city` quando há cidade, apenas `uf` quando há UF e percorre sequencialmente as UFs da Região quando somente ela foi escolhida. A seleção de Períodos recebe os últimos 12 meses apenas na primeira carga e permanece nas consultas seguintes.
- **Por quê:** permitir análises regionais/estaduais sem disparos automáticos e preservar o recorte temporal escolhido pelo usuário.
- **Arquivos:** `src/features/dashboard-geobrain/{Header.tsx,api.ts,api.test.ts,use-dashboard-data.ts}`, `src/pages/DashboardGeobrain.tsx`, `src/features/shared/geo-api-scope-engine/{GeoApiScopeSelector.tsx,fetch-monitored-cities.ts,fetch-monitored-cities.test.ts,types.ts,use-geo-api-scope.ts}`.
- **Commits:** `a4a2515`.
- **Monday:** —
- **Impacto em Etapas/Pendências:** o seletor compartilhado recebeu somente suporte aditivo e opt-in para Região; os demais ambientes preservam seus fluxos geográficos atuais. Validação manual autenticada do Dashboard permanece pendente.

### 2026-09-15 — Coluna de zero dormitórios no mapa de oportunidades — Codex
- **Ambiente/funcionalidade:** `/dash-geobrain` — Mapa de oportunidades por Bairro.
- **O quê:** a matriz por dormitórios agora mantém as colunas fixas `0`, `1`, `2`, `3` e `4+`, inclusive `0 dorms` quando não há tipologia correspondente no recorte; células sem dados apresentam IVV de 0%.
- **Por quê:** a lista anterior começava em um dormitório e removia colunas sem registros, ocultando a faixa de zero dormitórios.
- **Arquivos:** `src/features/dashboard-geobrain/aggregate.ts`, `src/features/dashboard-geobrain/aggregate.test.ts`.
- **Commits:** `cd7cc32`.
- **Monday:** —
- **Impacto em Etapas/Pendências:** somente a matriz por dormitórios foi padronizada; o Mapa de oportunidades por Padrão permanece inalterado.

### 2026-09-15 — Preço médio e preço/m² por tipologia disponível — Codex
- **Ambiente/funcionalidade:** `/dash-geobrain` — indicadores de preço no período mais recente.
- **O quê:** preço médio passou a considerar apenas `type_of_typology = Padrão` com `typology_stock > 0`, pela fórmula `Σ(qty × price) ÷ Σ(qty)`. Preço/m² aplica o mesmo recorte e exige `private_area > 0`, pela fórmula `Σ(qty × price) ÷ Σ(qty × private_area)`.
- **Por quê:** corrigir o ticket médio e o preço médio por área, antes influenciados por outras tipologias e pelo campo pré-calculado `price_private_area`.
- **Arquivos:** `src/features/dashboard-geobrain/aggregate.ts`, `src/features/dashboard-geobrain/aggregate.test.ts`, `src/pages/DashboardGeobrain.tsx`.
- **Commits:** `37f8313`.
- **Monday:** —
- **Impacto em Etapas/Pendências:** regras aplicadas em runtime e cobertas por teste unitário; validação manual autenticada contra a API de produção permanece pendente.

### 2026-09-15 — Consulta paginada do histórico interno — Codex
- **Ambiente/funcionalidade:** `/dash-geobrain` — carregamento de empreendimentos da API GeoBrain.
- **O quê:** substituído o endpoint pelo histórico interno v2 e implementada a coleta sequencial por cidade e tipo, com primeira página de controle, lotes de até cinco páginas, timeout de 60 segundos e preservação de registros repetidos.
- **Por quê:** corrigir a inconsistência de dados causada pela consulta anterior e impedir que falhas de uma tipologia retornem um recorte parcial silencioso.
- **Arquivos:** `src/features/dashboard-geobrain/api.ts`, `src/features/dashboard-geobrain/api.test.ts`, `src/features/dashboard-geobrain/use-dashboard-data.ts`, `src/pages/DashboardGeobrain.tsx`.
- **Commits:** `dbf932c`.
- **Monday:** —
- **Impacto em Etapas/Pendências:** motor de coleta atualizado em runtime; permanece pendente uma validação manual autenticada contra a API de produção.

### 2026-08-27 — Correção de tipagem no exportador SVG — Codex (integração Panorama)
- **Ambiente/funcionalidade:** `/dash-geobrain` — exportação SVG dos gráficos.
- **O quê:** o nó raiz do SVG de Recharts passou a ser tipado explicitamente como `SVGSVGElement`, eliminando erro do typecheck real (`tsconfig.app.json`) sem alterar o comportamento visual ou os dados exportados.
- **Arquivos:** `src/features/dashboard-geobrain/Charts.tsx`.
- **Commits:** `06d9ec2` (commit integrado da V1 do Panorama).
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.
- **Impacto em Etapas/Pendências:** etapa 4 permanece concluída; correção necessária para liberar a validação de tipos completa do repositório.

### 2026-08-24 — Ajustes de composição dos gráficos — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — layout do Dashboard GeoBrain.
- **O quê:** gráfico de bolhas movido para abaixo da linha dos Mapas de oportunidades; `Preço médio por bairro` passou a ocupar a largura completa quando fica sozinho na grade de rankings.
- **Arquivos:** `src/pages/DashboardGeobrain.tsx`.
- **Commits:** `6c2d9e5`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.
- **Impacto em Etapas/Pendências:** melhora a hierarquia visual e o aproveitamento horizontal dos cards.

### 2026-08-21 — Critério de disponibilidade explicitado por tipologia — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — tooltip e subtítulo do gráfico de bolhas.
- **O quê:** tooltip passou a distinguir unidades lançadas da tipologia e do empreendimento; o subtítulo explicita que tamanho, estoque final, unidades lançadas e cor são calculados por tipologia.
- **Arquivos:** `src/features/dashboard-geobrain/Charts.tsx`.
- **Commits:** `e1320cd`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.
- **Impacto em Etapas/Pendências:** elimina ambiguidade entre o denominador da cor e o total do empreendimento.

### 2026-08-21 — Nova escala de cores das bolhas — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — gráfico Preço/m² × Área privativa.
- **O quê:** disponibilidade por tipologia agora interpola continuamente de `#71984a` em 0% para `#f4d83f` em 50% e `#f93f16` em 100%.
- **Arquivos:** `src/features/dashboard-geobrain/Charts.tsx`.
- **Commits:** `dbdff61`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.
- **Impacto em Etapas/Pendências:** mantém a etapa 4 concluída e atualiza a leitura visual da disponibilidade.

### 2026-08-20 — Correção de sintaxe no exportador SVG — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — build e exportação SVG.
- **O quê:** substituído `continue` inválido dentro de `forEach` por retorno do callback, restaurando o parsing do `Charts.tsx` pelo Vite/SWC.
- **Arquivos:** `src/features/dashboard-geobrain/Charts.tsx`.
- **Commits:** `49f2f56`.
- **Impacto em Etapas/Pendências:** build de produção voltou a concluir normalmente.

### 2026-08-20 — Cores das legendas nos SVGs exportados — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — legendas das exportações SVG.
- **O quê:** cada ícone da legenda passa a receber a cor real da série correspondente (barras, áreas, linhas ou bolhas), evitando `currentColor` e `none` no arquivo final.
- **Arquivos:** `src/features/dashboard-geobrain/Charts.tsx`.
- **Commits:** `1f93424`.
- **Impacto em Etapas/Pendências:** exportações VGV, IPC e demais gráficos preservam a correspondência visual entre série e legenda.

### 2026-08-20 — Exportação dos rankings e Mapas de oportunidades — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — rankings Top 10 e mapas de oportunidades.
- **O quê:** corrigida a identificação das barras para exportação SVG dos rankings e adicionados botões SVG aos dois Mapas de oportunidades, com tabelas editáveis.
- **Arquivos:** `src/features/dashboard-geobrain/{Rankings.tsx,OpportunityMap.tsx}`.
- **Commits:** `55fb8e6`.
- **Impacto em Etapas/Pendências:** exportação editável ampliada e corrigida nos blocos analíticos do dashboard.

### 2026-08-20 — Exportação SVG dos rankings Top 10 — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — rankings por bairro e padrão.
- **O quê:** rankings Top 10 ganharam botão SVG, exportando rótulos, valores e barras editáveis com o mesmo mecanismo reutilizado dos gráficos.
- **Arquivos:** `src/features/dashboard-geobrain/{Charts.tsx,Rankings.tsx}`.
- **Commits:** `effc8dc`.
- **Impacto em Etapas/Pendências:** exportação editável ampliada aos rankings do dashboard.

### 2026-08-20 — Correção das cores das legendas SVG — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — exportação SVG dos gráficos.
- **O quê:** cores dos ícones de legenda são promovidas temporariamente dos elementos filhos para o próprio ícone antes do exportador gerar a legenda, preservando as cores originais.
- **Arquivos:** `src/features/dashboard-geobrain/Charts.tsx`.
- **Commits:** `7058483`.
- **Impacto em Etapas/Pendências:** exportação SVG passa a manter também a identidade visual das legendas.

### 2026-08-20 — Correção do info IPC e das cores na exportação SVG — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — IPC e exportação dos gráficos.
- **O quê:** regras do IPC passam a aparecer corretamente no popover `(i)` do card; tokens visuais `--dg-*` são resolvidos antes do exportador SVG reutilizado do Banco Quanti, preservando as cores originais.
- **Arquivos:** `src/features/dashboard-geobrain/Charts.tsx`.
- **Commits:** `e8e1414`.
- **Impacto em Etapas/Pendências:** mantém a etapa 4 concluída e corrige a interpretação das regras e a fidelidade visual das exportações.

### 2026-08-20 — Layout e exportação SVG dos gráficos — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — gráficos e exportações.
- **O quê:** gráfico Preço/m² × Área privativa movido para depois de VGV, ocupando a largura total e mantendo 260px de altura; botão SVG adicionado aos gráficos GeoBrain, reutilizando `exportElementAsSvg` já existente no Banco Quanti sem alterar aquela feature.
- **Arquivos:** `src/features/dashboard-geobrain/{Charts.tsx}`, `src/pages/DashboardGeobrain.tsx`.
- **Commits:** `1adb550`.
- **Impacto em Etapas/Pendências:** etapa 4 permanece concluída; exportação editável adicionada ao dashboard.

### 2026-08-20 — Bairros do gráfico limitados ao estoque positivo — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — segmentador de Bairro do gráfico de bolhas.
- **O quê:** o filtro lista apenas bairros com pelo menos uma tipologia com Estoque final maior que zero no recorte ativo do gráfico.
- **Arquivos:** `src/features/dashboard-geobrain/{aggregate.ts}`, `src/pages/DashboardGeobrain.tsx`.
- **Commits:** `37326c4`.
- **Impacto em Etapas/Pendências:** mantém o filtro alinhado aos dados efetivamente exibidos.

### 2026-08-20 — Filtro de Bairro e disponibilidade por tipologia nas bolhas — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — gráfico Preço/m² × Área privativa.
- **O quê:** disponibilidade documentada e aplicada por tipologia (`estoque final da tipologia ÷ unidades lançadas da própria tipologia`); o gráfico ganhou segmentador de Bairro, com opções do tipo de empreendimento selecionado.
- **Arquivos:** `src/features/dashboard-geobrain/{aggregate.ts,Charts.tsx}`, `src/pages/DashboardGeobrain.tsx`.
- **Commits:** `bac9230`.
- **Impacto em Etapas/Pendências:** mantém a etapa 4 concluída e amplia o recorte analítico da visualização.

### 2026-08-20 — Limpeza de Padrão ao trocar tipo de empreendimento — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — filtros e segmentador do gráfico de bolhas.
- **O quê:** ao trocar o tipo de empreendimento, o filtro global de Padrão e o segmentador específico do gráfico são limpos para impedir recortes incompatíveis.
- **Arquivos:** `src/pages/DashboardGeobrain.tsx`.
- **Commits:** `1922341`.
- **Impacto em Etapas/Pendências:** mantém a consistência entre as opções de Padrão disponíveis e o tipo selecionado.

### 2026-08-20 — Regras de cor, tooltip e filtros do gráfico de bolhas — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — visualização Preço/m² × Área privativa.
- **O quê:** regra informativa movida para o ícone `(i)`; tooltip inclui Unidades lançadas totais do empreendimento; cores interpolam de `#f4d83f` (0%) a `#71984a` (100%); padrões, faixas de Área privativa e faixas de Preço/m² acompanham o tipo de empreendimento e os filtros ativos.
- **Arquivos:** `src/features/dashboard-geobrain/{aggregate.ts,Charts.tsx}`, `src/pages/DashboardGeobrain.tsx`.
- **Commits:** `8bf5518`.
- **Impacto em Etapas/Pendências:** etapa 4 permanece concluída; nova visualização alinhada às regras de filtros do dashboard.

### 2026-08-20 — Refinamento do tooltip do gráfico de bolhas — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — tooltip e regra de exibição da visualização Preço/m² × Área privativa.
- **O quê:** tooltip passa a exibir o nome do empreendimento, Área privativa, Preço/m² e Estoque final. Bolhas com estoque final zero deixam de ser exibidas; a regra e as faixas de cor foram detalhadas no ícone informativo.
- **Arquivos:** `src/features/dashboard-geobrain/{aggregate.ts,Charts.tsx}`.
- **Commits:** `06f6acd`.
- **Impacto em Etapas/Pendências:** mantém a etapa 4 concluída e melhora a leitura da nova visualização.

### 2026-08-20 — Gráfico de bolhas Preço/m² × Área privativa — Edgar
- **Ambiente/funcionalidade:** `/dash-geobrain` — nova visualização de disponibilidade por tipologia.
- **O quê:** adiciona gráfico de dispersão com eixo X de Área privativa, eixo Y de Preço/m², tamanho proporcional ao estoque final e segmentador por Padrão. A cor usa `estoque final ÷ quantidade lançada`: até 25% `#6e6e6e`, até 50% `#f4d83f`, até 75% `#71984a` e acima de 75% `#4d5a31`.
- **Arquivos:** `src/features/dashboard-geobrain/{aggregate.ts,Charts.tsx}`, `src/pages/DashboardGeobrain.tsx`.
- **Commits:** `1d687ca`.
- **Impacto em Etapas/Pendências:** etapa 4 permanece concluída; a pendência de novos indicadores/visualizações recebeu esta entrega.

### 2026-08-06 — Migração para a API v2, padrão por período e cor das legendas — Edgar
- **O quê:** (1) consulta migrada para `POST https://api.geobrain.com.br/public-api/v2/building-with-history`, mantendo os parâmetros na query string, o `Bearer` token e as 8 lanes paralelas com paginação por `meta.last_page`; (2) `normalizeBuilding` mapeia os campos novos — no empreendimento (`delivery_date`, endereço/CEP, `city_id`, lat/long, `towers`, `floors`, `elevators`, `period`, `time_on_sale`, `total_stock`, `total_units`, `builder_name`, `bathrooms`, `has_suites`, `last_update`, condições comerciais, `incorporators[]`, `areas[]`) e no histórico da tipologia (`pattern`, `building_status`, `time_on_sale`, `public_area`, `price_public_area`, `vgv_total`, `sold`, `number_suite`, `estagio_empreendimento`, `taxa_associativa`, além de `private_area`/`release_price`/`number_bedroom`/`garage`/`qty` agora por período); (3) o padrão passa a vir de `typologies_history[].pattern` **do período em análise** via helper `patternOf`, afetando filtro Padrão, estoque por padrão, preço m²/médio por padrão, mapa de oportunidades e IPC (fallback em `building.standard`); (4) legendas dos gráficos com cor `#212829` via token `--dg-legend` (variante clara no modo escuro).
- **Arquivos:** `api.ts`, `types.ts`, `aggregate.ts`, `Charts.tsx`, `dashboard.css`.



### 2026-08-11 — Modo escuro, bairros sem acento, estoque por bairro e filtros de faixa — Edgar
- **O quê:** (1) modo escuro no `/dash-geobrain` — tokens `.dark .dash-geobrain` em `dashboard.css`, tooltip via `var(--dg-tooltip-hl)` e botão de tema no header (alterna a classe `dark` global); (2) `normalizeBuilding` aplica `stripAccents` em `neighborhood` — o valor sem acento é canônico em filtros, rankings e mapas; (3) IPC passa a montar o eixo de períodos apenas a partir dos períodos filtrados (denominador de mercado segue global); (4) novo ranking **Estoque atual por bairro** (`rankBairrosPorEstoque`, soma de `typology_stock` no período mais recente) com o mesmo padrão do card de tempo de estoque; (5) novos filtros **Área privativa** e **Preço/m²** com até 6 faixas dinâmicas por quantis (`computeRangeBuckets` / `extractRangeOptions`), recalculadas por cidade carregada + tipo de empreendimento, aplicadas em `typologyMatchesFilters` e exibidas na `ActiveFiltersBar`.
- **Arquivos:** `src/features/dashboard-geobrain/{api.ts,aggregate.ts,types.ts,Header.tsx,Sidebar.tsx,ActiveFiltersBar.tsx,Charts.tsx,dashboard.css}`, `src/pages/DashboardGeobrain.tsx`, `src/lib/openapi-engine.ts` (correção de escopo de `wireBody`).

### 2026-07-13 (b) — KPIs, header e mapa de oportunidades por padrão — Edgar
- **O quê:** (1) Header reorganizado com labels acima de cada controle (**Tipo empreendimento**, **Visualização**) e chips/selectores alinhados pela base (`items-end`), altura padronizada em 36px; caixa de Município reduzida para 180px. (2) Tooltip dos gráficos com destaque em `#212529`. (3) KPI **Empreendimentos** removido e novo KPI **Preço médio m²** adicionado; `Unidades Lançadas` e `VGV Lançado` agora **somam sobre todo o período filtrado** (KEEPFILTERS status = Ativo) via `computeReleaseTotals`; `numCompact` já entrega 1 casa decimal para valores ≥ 1 mil (ex. `1,3 mil`). (4) Filtro **Períodos (mês)** aplicado por padrão nos **últimos 12 meses** ao carregar uma cidade. (5) Novo gráfico **Unidades Lançadas × Estoque** entre `IvvChart` e `VgvChart`. (6) `computeSeries` só contabiliza lançamento quando `status = "Ativo"`. (7) `computeOpportunityMap` ganhou `groupBy: 'standard'`; segundo mapa da página agora é **Mapa de oportunidades — Padrão**. (8) Rankings renomeados (`IVV por bairro`, `Tempo de estoque por bairro`, `Preço m² por bairro`, `Preço médio por bairro`) e passaram a exibir botão `(i)` com fórmula. (9) `GeoApiScopeSelector` aceita `cityContainerClassName` para ajuste externo do container do Município.
- **Arquivos:** `src/features/dashboard-geobrain/{aggregate.ts,Header.tsx,KpiRow.tsx,Charts.tsx,Rankings.tsx,dashboard.css}`, `src/features/shared/geo-api-scope-engine/GeoApiScopeSelector.tsx`, `src/pages/DashboardGeobrain.tsx`.


### 2026-07-13 — Ajustes de regra de negócio e UX (§1–§15) — Edgar
- **O quê:** (1) período agora derivado 100% de `h.period` (string, sem `Date`) em toda a agregação — fim de shifts de fuso; (2) `ActiveFiltersBar` abaixo do header exibe todos os filtros aplicados em linha única; (3) chips do header sem "Hotel" e reordenados **Vertical · Horizontal · Comercial**, alinhados na mesma altura do seletor de cidade; (4) renomeação global "Oferta Final" → **Estoque** em títulos/labels/tooltips; (5) KPIs agora usam apenas o **período mais recente do escopo filtrado** (fórmulas §13: `isRelease`, `vgvSold`, `initialStock`, `vgvRelease`, `qtyRelease`); (6) `VariationStrip` reduzida para **Desde início / 3a / 1a**, com modo `avg` no IVV e no IPC (evita agregação de percentuais); (7) tooltips padronizados (`DGTooltip`) com 1 casa decimal e destaque em amarelo escuro `#917C09`; (8) ordenação por valor/rótulo nos rankings e no combo horizontal `OfertaComboChart`; (9) gráfico de padrões sem limite de Top 10 (§10); (10) IPC com `ReferenceLine y=1` extendida (linha de corte) + Popover (i) com explicação; (11) `OpportunityMap` recebe `groupBy` e a página renderiza **dois mapas** lado a lado (Bairro e `building_type`); busca com padding para não sobrepor a lupa; (12) IVV/Tempo de Estoque exclusivamente sobre o período mais recente (Tempo = 1/IVV).
- **Arquivos:** `src/features/dashboard-geobrain/{aggregate.ts,Header.tsx,KpiRow.tsx,Charts.tsx,Rankings.tsx,VariationStrip.tsx,OpportunityMap.tsx,ActiveFiltersBar.tsx,dashboard.css}`, `src/pages/DashboardGeobrain.tsx`.



### 2026-07-09 — GeoApiScopeEngine: motor compartilhado de escopo geográfico — Edgar
- **O quê:** criado o padrão **GeoApiScopeEngine** (`src/features/shared/geo-api-scope-engine/`) — fetch paginado de `/public-api/monitored-cities`, cache por token, hook `useGeoApiScope` e componente `GeoApiScopeSelector` (UF + Combobox de cidades). Substitui a lista IBGE offline (`municipios-br.json`) pela lista real disponível no token. Dashboard GeoBrain, Relatórios Secovi e CID legado agora consomem o mesmo motor. Regra registrada em `AGENTS.md` e `CLAUDE.md` como padrão obrigatório para novas telas que dependam da API GeoBrain.
- **Arquivos:** `src/features/shared/geo-api-scope-engine/{types.ts,fetch-monitored-cities.ts,use-geo-api-scope.ts,GeoApiScopeSelector.tsx,index.ts}`, `src/features/dashboard-geobrain/{Header.tsx,use-dashboard-data.ts}`, `src/pages/{DashboardGeobrain.tsx,TestesArquitetura.tsx}`, `src/legacy/standby-qualidade/TQCidValidacaoBase.tsx`, `AGENTS.md`, `CLAUDE.md`.



### 2026-07-09 — Ajustes finos de UX e correção de filtros temporais — Edgar
- **O quê:** (1) gráficos temporais agora exibem os 12 períodos mais recentes com scroll horizontal alinhado à direita; (2) rótulos em todos os pontos da linha de tempo de estoque nos combos; (3) eixos Y ocultos em todos os gráficos; (4) linha de referência `y=1` no IPC; (5) KPIs centralizados; (6) `k` → `mil` em `numCompact`/`brlCompact`; (7) mapa de oportunidades invertido (verde=alto, amarelo=baixo); (8) novo segmentador **Períodos (mês)** na sidebar; (9) filtros Ano/Período/Dormitório/Garagem/Tipologia agora se aplicam **dentro** das entradas de histórico via helper `historyMatches`/`lastHistoryMatching`, corrigindo o bug em que categorias fora do filtro apareciam no eixo X.
- **Arquivos:** `Charts.tsx`, `Sidebar.tsx`, `KpiRow.tsx`, `OpportunityMap.tsx`, `dashboard.css`, `aggregate.ts`, `types.ts`, `src/lib/format.ts`, `src/pages/DashboardGeobrain.tsx`.

### 2026-07-08 — Base zero documentada — Gabriel
- **O quê:** criação deste doc vivo consolidando o estado atual do Dashboard GeoBrain.
- **Por quê:** estabelecer a linha de base de desenvolvimento para colaboração via git.
- **Arquivos:** todos em `src/features/dashboard-geobrain/`.

<!-- novas entradas acima desta linha, mais recente no topo -->

---

## 2. Etapas

| # | Etapa | Status |
|---|---|---|
| 1 | Conexão à API pública GeoBrain (auth + paginação) | ✅ |
| 2 | Normalização/saneamento do payload | ✅ |
| 3 | Agregação de KPIs e séries | ✅ |
| 4 | Gráficos + painel de filtros | ✅ |
| 5 | (a definir com Edgar — novos indicadores/filtros, export, etc.) | 🔲 |

---

## 3. Pendências

- [ ] Definir com o Edgar os próximos indicadores/visualizações desejados.
- [ ] Confirmar cobertura de testes (Vitest) para `aggregate.ts` e `normalizeBuilding`.
- [ ] Documentar os endpoints exatos da GeoBrain public-api consumidos (paths e params).
