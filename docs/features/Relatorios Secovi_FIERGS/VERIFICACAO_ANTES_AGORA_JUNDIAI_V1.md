# Verificação antes × agora — Panorama Secovi/FIERGS — V1 Jundiaí

**Data:** 2026-08-27  
**Commit integrado:** `eabf970`  
**Card:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`  
**Base de comparação:** PDF corrigido de Jundiaí (62 páginas, 28 anotações) + código na `main`.  
**Matriz detalhada:** [`MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md`](./MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md)

## 1. Como ler esta verificação

`Implementado/testado` significa que existe código e teste automatizado. `Pronto para QA real`
significa que o contrato está implementado, mas exige token, cidades monitoradas e geração do PDF.
`V2` é decisão de escopo, não falha da V1. A Juliana informou que não revisou o resumo/narrativas;
esses slides não são declarados homologados.

## 2. Requisitos transversais — antes × agora

| Tópico | Antes | Agora | Evidência | Status |
|---|---|---|---|---|
| G-01 — múltiplas cidades | `PanoramaScope.city` escalar; uma única chamada e título municipal. | `cities[]` canônico, coleta por cidade com concorrência limitada, deduplicação, falha parcial nomeada, proveniência e rótulo/slug determinísticos. | `types.ts`, `domain/collection.ts`, `api.ts`; testes `opus-period-cities` e `report-model`. | Implementado/testado; pronto para caso real com duas cidades. |
| G-02 — períodos após 1T/26 | Lista fixa de 17 trimestres terminando sempre em `1T2026`. | `availableEndQuarters` oferece fechamentos até o trimestre corrente; `editorialWindow` deriva 17 períodos de qualquer fechamento. | `domain/quarters.ts`, `api.ts`, `report/model.ts`; testes de virada e fechamento posterior. | Implementado/testado; confirmar com dado real posterior. |
| G-03 — universo SECOVI-SP | Todo `Horizontal` podia entrar como condomínio; loteamentos/indefinidos não tinham política central. | Política tipada: todos os verticais; horizontal somente subtipo canônico Condomínio de Casas; loteamento e subtipo indefinido são rejeitados e contabilizados. | `domain/entity-policy.ts`, `domain/cube.ts`; `model.provenance.rejectedByPolicy`; 23 testes de domínio. | Implementado/testado; inspecionar rejeições no primeiro token real. |
| Regra por entidade | A API usava `Vertical`/`Horizontal` sem extensão formal por entidade. | `EntityId` (`secovi-sp`, `fiergs-rs`) e `entityPolicy`; FIERGS permanece extensão explícita sem regra inventada. | `domain/entity-policy.ts`. | Implementado; regra FIERGS ainda precisa ser definida quando solicitada. |
| Taxonomias | Arrays/labels derivados no componente, com categorias fora de ordem e nomes inconsistentes. | Tipologias, padrões, coortes e maturidade canonizados em um único domínio e ordenados. | `domain/taxonomy.ts`; testes de aliases/acentos/desconhecidos. | Implementado/testado. |
| Nulos e zeros | JSX usava `?? 0`, transformando ausência em zero e mascarando falha de fonte. | `null` é ausência; `0` é zero medido; tabelas exibem `—`; estados `ready/partial/unavailable` preservados. | `domain/cube.ts`, `domain/aggregations.ts`, `MarketSlides.tsx`; testes de ausência. | Implementado/testado. |
| Cubo granular | Contagens e médias dependiam de linhas agregadas e médias simples; dimensões não fechavam sempre. | `MarketCube` por empreendimento, IDs distintos, VGV bruto preferencial, médias ponderadas e reconciliação única para tabelas/gráficos. | `domain/cube.ts`, `domain/aggregations.ts`; 40 testes de cubo/agregações. | Implementado/testado em fixtures. |
| Proveniência | Usuário não distinguia cidade concluída, cidade falha ou registro recusado. | Modelo expõe cidades pedidas/concluídas/falhas, entidade e rejeições por política. | `PanoramaProvenance`, `report/model.ts`; testes de falha parcial/total. | Implementado; UI de falha parcial precisa ser confirmada em runtime real. |
| Layout novo de tabelas Rebrain | Não havia referência visual entregue. | Nenhuma alteração especulativa; coluna Faixa de Valor sem fonte é removida na V1. | `valueRangeAvailable: false`; `OfferTableSlide`. | V2 por decisão. |
| Exportação PPT/PPTX | Não existia exportação editável homologada. | PDF continua disponível; PPTX não foi iniciado. | Plano/mapeamento e handoffs. | V2 por decisão. |

## 3. Verificação por família de código

### 3.1 Entrada e escopo

Antes, a página mantinha UF/cidade em um único objeto escalar, oferecia trimestres hardcoded e
reutilizava o seletor de cidade única. Agora, a página usa o `GeoApiScopeEngine` para carregar
somente cidades monitoradas, permite seleção nativa múltipla, limpa cidades ao trocar UF, exige
escopo válido antes da consulta e oferece fechamentos dinâmicos.

Evidência: `pages/PanoramaSecoviFiergsPage.tsx`, `domain/quarters.ts`.

### 3.2 Registry, manifesto e exportação

Antes, `page` e identidade da referência eram o mesmo número, portanto o slide institucional 3 não
podia ocupar a posição 7 sem quebrar assets e navegação. Agora, `page` representa a posição de saída e
`referenceSlide` a identidade editorial. Navegação, sumário, deck offscreen e PDF consomem o mesmo
manifesto de 62 posições; a referência 3 está na posição 7.

Evidência: `report/manifest.ts`, `ReportPaginator.tsx`, `pdf-export.test.ts` (3/3).

### 3.3 Gráficos temporais

Antes, o primeiro tick podia desaparecer por escala automática, rótulos colidiam e a faixa de
“Residencial Vertical” ocupava altura excessiva. Agora, a janela é dinâmica, a família é aplicada a
14–19 e 23–26, a faixa foi reduzida e os labels/ticks são controlados pelo componente. O slide 40
usa a família de barras prevista pela V1.

Evidência: `ReportPaginator.tsx` e CSS da feature. A confirmação final é visual no PDF real.

### 3.4 Tabelas 31–51

Antes, os componentes calculavam linhas localmente, deixavam “Faixa de Valor”/empreendimentos como
travessões, zeravam oferta lançada/maturidade/VGV e colapsavam o horizontal em uma linha. Agora,
`model.granular` alimenta diretamente oferta, coortes, tipologias, padrões, maturidade, preços,
matrizes e VGV; cada linha traz `kind` (linha/subtotal/total), contagem distinta e nulos explícitos.

Evidência: `domain/aggregations.ts`, `report/model.ts`, `MarketSlides.tsx` e 40 testes de agregações.

### 3.5 Resumo, narrativa e mapa

Antes, o resumo podia ser interpretado como homologado junto com as análises. Agora, os slides 29,
53 e 54 são recalculados pelo modelo, mas continuam marcados como não revisados pela Juliana. O mapa
consome o cubo filtrado para o universo vertical previsto.

Evidência: `MarketSlides.tsx`, `report/model.ts`, handoff Luna. Homologação editorial continua pendente.

## 4. Comentários do estudo de exemplo — PDF Jundiaí

Esta seção faz o cruzamento individual das 28 anotações internas, mantendo a numeração do slide do
PDF. Os itens “pronto para QA” precisam ser confirmados gerando o relatório com token real; os itens
V2 não devem ser tratados como defeitos desta entrega.

| Slide | Comentário da analista | Antes observado | Agora / correção implementada | Status |
|---:|---|---|---|---|
| 2 | Ajustar Layout | Capa não alinhada à referência neutra. | Manifesto/capa recalibrados para a arte neutra. | Pronto para QA visual. |
| 3 | Esse slide precisa ser o slide 7. | Visão/missão/valores saía na posição 3. | `referenceSlide: 3` renderiza na posição 7; referência 4 ocupa a posição 3. | Implementado/testado. |
| 14 | Não está aparecendo o primeiro período do gráfico. | Primeiro trimestre podia ser ocultado/cortado. | Janela dinâmica e ticks inicial/final explícitos. | Pronto para QA visual. |
| 15 | Primeiro período; caixa de texto do residencial vertical muito grande. | Primeiro período ausente e faixa consumindo espaço. | Tick inicial garantido e faixa reduzida. | Pronto para QA visual. |
| 16 | Não está aparecendo o primeiro período do gráfico. | Mesmo corte temporal da família. | Família temporal atualizada. | Pronto para QA visual. |
| 17 | Comentário igual ao da página 15. | Primeiro período/faixa com o mesmo defeito. | Correção aplicada à família de padrão. | Pronto para QA visual. |
| 18 | Primeiro período; rótulos sobrepostos. | Tick inicial ausente e labels colidiam. | Primeiro/último tick e labels com posicionamento determinístico. | Pronto para QA visual. |
| 19 | Comentário igual ao da página 15. | Primeiro período/família de padrão. | Correção transversal aplicada. | Pronto para QA visual. |
| 23 | Todos os gráficos desta seção devem seguir os comentários da seção de lançamentos. | Vendas usava família sem os ajustes de tick/faixa/labels. | Regra transversal aplicada aos slides 23–26. | Pronto para QA visual. |
| 31 | Melhorar layout; faixa de valor e nº de empreendimentos sem nada. | Colunas exibiam travessões. | Nº de empreendimentos vem de IDs distintos; Faixa de Valor é removida porque não tem fonte. | Implementado/testado; QA visual. |
| 33 | Agregar até 2022, subtotal lançado até 2024 e total geral. | Anos apareciam individualmente desde 2000. | Coortes canônicas com “Até 2022”, anos, subtotal até 2024 e total geral. | Implementado/testado; QA visual. |
| 34 | Tipologias: 1 Dormitório, 2 Dormitórios, 3 Dormitórios, 4 ou + Dormitórios. | Labels/ordem não canônicos. | Taxonomia única e ordem canônica no modelo e componente. | Implementado/testado. |
| 35 | Mesmo ajuste de tipologias. | Gráfico herdava ordem bruta. | Gráfico consome `offerByTypology` ordenado. | Implementado/testado; QA visual. |
| 36 | Mesmos nomes exatos de tipologia. | Tabela de preço podia exibir nomes brutos. | `pricesByTypology` canonizado e ponderado. | Implementado/testado. |
| 37 | Mesmo ajuste da página 35. | Gráfico de preço com categorias fora de ordem. | Gráfico consome linhas granulares ordenadas. | Implementado/testado; QA visual. |
| 38 | Somente vertical; padrões: Compacto, Econômico, Standard, Médio, Médio-Alto, Alto, Luxo. | Mistura de segmentos e padrões/aliases adicionais. | Política Secovi + `pricesByStandard` com sete padrões canônicos. | Implementado/testado; QA visual. |
| 39 | Mesmo ajuste da página 38. | Gráfico refletia mistura/ordem bruta. | Gráfico de padrão vertical ordenado. | Implementado/testado; QA visual. |
| 40 | Gráfico de barras. | Família temporal/linha não correspondia ao comentário. | Renderização de barras para 17 períodos, com destaques. | Pronto para QA visual. |
| 41 | Mesmo padrão de ano/comentários; oferta lançada estava zero. | Matriz trazia lançada zerada. | `cohortMatrix` deriva lançada e final do cubo granular. | Implementado/testado; QA visual. |
| 42 | Mesmo comentário da página 41. | Participação dependia de matriz incompleta. | `cohortMatrixParticipation` deriva exclusivamente da matriz corrigida e fecha 100%. | Implementado/testado; QA visual. |
| 43 | Somente vertical; tudo estava zero. | Maturidade sem distribuição útil. | `maturityByStandard` somente vertical, com Planta/Construção/Pronto e ausência explícita. | Implementado/testado; QA visual. |
| 44 | Mesmo comentário da página 43. | Participação derivava de zeros. | Participação calculada das linhas granulares de maturidade. | Implementado/testado; QA visual. |
| 45 | Tipologias exatas; tudo estava zero. | Maturidade por tipologia sem valores. | `maturityByTypology` vertical, tipologias canônicas e totais do cubo. | Implementado/testado; QA visual. |
| 46 | Mesmo comentário da página 45. | Participação sem base válida. | Participação derivada dos mesmos agregados. | Implementado/testado; QA visual. |
| 48 | Mesmo padrão de agregação anual. | Coorte horizontal sem agrupamento canônico. | `cohortsHorizontal` com política Condomínio de Casas. | Implementado/testado; QA visual. |
| 49 | Abrir por padrão, somente horizontal. | Horizontal colapsado em uma linha e podia misturar universo. | `horizontalPricesByStandard`, somente universo horizontal aprovado. | Implementado/testado; QA visual. |
| 51 | Verticais primeiro, subtotal vertical, horizontais, total geral; nº de empreendimentos estava zero. | Ordem/blocos incompletos e contagem zerada. | `vgvSummary` monta blocos, subtotais, total geral e IDs distintos. | Implementado/testado; QA visual. |

## 5. O que ainda precisa ser verificado operacionalmente

1. Executar Jundiaí/1T2026 com token real e confirmar `model.provenance.rejectedByPolicy`.
2. Executar um caso com duas cidades monitoradas e confirmar soma de numeradores/denominadores.
3. Executar um fechamento posterior a 1T/26 quando a API possuir dados.
4. Gerar o PDF final de 62 páginas e comparar página a página em 1920×1080.
5. Confirmar visualmente os slides 2, 14–19, 23–26, 31, 33–46, 48, 49 e 51.
6. Obter nova validação da Juliana para as análises; o resumo continua fora da homologação desta rodada.

## 6. Fora da V1

- Novo padrão visual de tabelas Rebrain sem referência fornecida.
- Exportação PowerPoint editável.
- Alteração editorial dos slides de resumo/narrativa sem revisão da analista.
