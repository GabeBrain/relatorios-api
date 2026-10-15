# Evidências do mapeamento — 15/10/2026

**Base inspecionada:** `bffb3c6`, merge autorizado por Lucas de `d360b35` com `416488d`, mantendo ambos. LIVE validado por multiconjunto de linhas não vazias: base + (local − base) + (remoto − base), zero linhas faltantes/extras. Sem mudança autoral em código de produto.

**Referência:** [PPTX SP 2T2026](https://docs.google.com/presentation/d/1WhyrfFEoFeA9dam9w_F8CYWm8y1VotMB/edit), nome/ID/parent confirmados via Drive; hash e tamanho no [catálogo único](../../../handoffs/lucas-relatorios-2026-10-14/fontes/modelos.json). Bruto em `.local-inputs/relatorios-lucas/sp/2026.06_PANORAMA_SAO_PAULO_VAP_13ago.pptx`, ignorado pelo Git. Download autenticado obtido pelo conector e materializado via PowerShell após bloqueio de rede no ambiente padrão; nenhum bearer URL/segredo versionado.

**Inspeção headless:** ZIP/XML, ordem de `ppt/presentation.xml` + relacionamentos (85 slides); caches nativos dos gráficos, categoria exata `2T26`:

| Slide / parte | Cache | Valor histórico observado |
|---|---|---:|
| 13 / `ppt/slides/slide13.xml` | `ppt/charts/chart1.xml` | 119 empreendimentos |
| 18 / `ppt/slides/slide18.xml` | `ppt/charts/chart6.xml` | 40.179 unidades lançadas |
| 32 / `ppt/slides/slide32.xml` | `ppt/charts/chart19.xml` | 42.275 unidades vendidas |
| 46 / `ppt/slides/slide46.xml` | `ppt/charts/chart32.xml` | 118.362 unidades de oferta final |

Valores de cache desta versão são gabarito histórico candidato, não validação visual ou da API. Há outras lâminas com títulos semelhantes/subconjuntos; não misturadas com os quatro gráficos selecionados. A natureza líquida das vendas precisa ser confrontada com o método da fonte. Totais calculados/deltas seguem vazios na matriz porque nenhuma consulta de dados foi feita.

**Rastreio de código** (caminhos em `src/features/panorama-secovi-fiergs/`):

- `api.ts`: `fetchPanoramaBuildings` prioriza `POST https://app.geobrain.com.br/public-api/v2/building-with-history-internal`, fallback público `https://api.geobrain.com.br/public-api/v2/building-with-history`; status Ativo/Esgotado, paginação. `temporalRows` usa `GET https://geobrain.com.br/public-api/temporal-analysis-city/{sales|stock}`, `city`, `uf`, `start_period`, `end_period`, `group_by` Padrão/Tipologia. Consulta atual pede Vertical/Horizontal; SP precisará limitar universo vertical explicitamente.
- `domain/cube.ts` / `buildCityCube`: chave UF/cidade/ID, `release_date`, `total_units` (fallback soma `qty` no mês de lançamento), histórico até o fechamento. Estoque prefere campo superior `stock`/`final_stock`, depois tipologias da última fotografia; data do campo superior requer prova. `soldUnits` pode cair em lançado − estoque, o que não comprova fluxo trimestral.
- `lib/launches.ts` / `buildLaunchModel`, `api.ts` / `launchRecordsFromCube`: agregam lançamentos por trimestre. Existem conversões `null → 0`; não presumir ausência resolvida no novo contrato.
- `domain/temporal-normalization.ts`: fluxo dá precedência a total trimestral, senão mantém meses para soma; snapshot carrega última observação até o fechamento, inclusive trimestre anterior. Por isso “3T” na saída não comprova observação de setembro: conferir `temporal_observed_period`.
- `report/model.ts`: `reconcileFiergsClosingSales/Stock` substituem fechamento **somente FIERGS** pelo granular. `domain/reconciliation.ts` retorna lista vazia para outras entidades. Novo SP precisa guardas próprias, sem desativar as existentes. `buildGranularBlocks` diferencia janela de lançamentos e universo histórico conforme entidade.

**Verificação:** 26 testes/4 arquivos aprovados em `vitest run` com os alvos `launches.test.ts`, `temporal-normalization.test.ts`, `fiergs-sales-reconciliation.test.ts` e `reconciliation-guards.test.ts`. Primeira tentativa bloqueada pelo sandbox (`Cannot read directory ../../..` antes de carregar configuração); repetição com permissão de ambiente passou. Warning preexistente de Browserslist desatualizado, sem instalar/atualizar pacotes. Não equivale à suíte completa 2T2026/4T2025 ou a teste com dados atuais de SP.

API de dados, dashboard, ensaio real, build/deploy e aceite humano não executados. G1 parcial, sem reconciliação numérica. Matriz/cache/hash/links e check:live-docs conferidos no fechamento; commit local identificável pelo histórico deste arquivo.
