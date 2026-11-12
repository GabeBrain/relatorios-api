# Evidências — ajustes finos Juliana, FIERGS 2T2026

**Plano:** `PLAN_AJUSTES_FINOS_JULIANA_FIERGS_2T2026_2026-10-02.md`
**Entrada:** `assets/panorama-fiergs-rs-2T2026 (1).pptx`; e-mail da Juliana: “Segue para ajustes finos. De dados não identifiquei mais nenhum erro.”
**Snapshot GeoBrain:** 2026-10-02 10:49:14 UTC (`.tmp/fiergs-final-adjustments-probe-20261002.json`, não versionado).
**Status:** G0–G4 concluídos localmente em 02/10/2026; identificada e endereçada nota dinâmica de cobertura parcial do VGV; reexportação final e commits locais pendentes; sem push.

## G0 — Reconciliar universos antes de percentuais

O período da coluna Oferta Lançada é a janela 1T2023–fechamento; o denominador comparável para disponibilidade é o histórico lançado até o fechamento, na mesma dimensão; Oferta Final é a fotografia das coortes ativas/esgotadas no fechamento. Portanto, `final ÷ lançamentos da janela` não é uma razão válida para disponibilidade.

### Tipologia — FIERGS 2T2026

| Tipologia | Empreendimentos no histórico | Oferta lançada histórica | Empreendimentos/lançadas na janela | Oferta final | Disponibilidade publicada |
|---|---:|---:|---:|---:|---:|
| 1 dormitório | 79 | 3.468 | 27 / 1.336 | 623 | 18,0% |
| 2 dormitórios | 442 | 45.107 | 118 / 13.618 | 4.379 | 9,7% |
| 3 dormitórios | 157 | 6.173 | 37 / 1.156 | 410 | 6,6% |
| 4 ou mais dormitórios | 4 | 110 | 0 / 0 | 2 | 1,8% |
| Não classificado (resíduo) | — | 63 | 0 / 0 | indisponível | — |
| **Total vertical** | **519** | **54.921** | **134 / 16.110** | **5.414** | **—** |

As linhas tipológicas classificadas somam 54.858 lançadas históricas e 5.414 finais. O total histórico tem 63 unidades residuais sem classificação e sem estoque final atribuível; por isso não publicamos percentual total. As 2 unidades de 4+ pertencem à fotografia atual, embora não haja lançamento 4+ na janela: o 0 da janela e o estoque final coexistem sem contradição.

### Tipologia — FIERGS 4T2025 (regressão)

| Tipologia | Empreendimentos no histórico | Oferta lançada histórica | Empreendimentos/lançadas na janela | Oferta final | Disponibilidade publicada |
|---|---:|---:|---:|---:|---:|
| 1 dormitório | 76 | 3.119 | 24 / 987 | 503 | 16,1% |
| 2 dormitórios | 432 | 44.144 | 108 / 12.655 | 5.072 | 11,5% |
| 3 dormitórios | 151 | 6.019 | 31 / 1.002 | 442 | 7,3% |
| 4 ou mais dormitórios | 4 | 110 | 0 / 0 | 1 | 0,9% |
| Não classificado (resíduo) | — | 63 | 0 / 0 | indisponível | — |
| **Total vertical** | **505** | **53.455** | **120 / 14.644** | **6.018** | **—** |

Linhas classificadas: 53.392 lançadas históricas e 6.018 finais. O mesmo resíduo de 63 não entra como zero no numerador nem é distribuído por tipologia. Os deltas entre o final reportado por linhas tipológicas e a janela são diferenças de coorte, não ajustes manuais.

### Fatos confirmados e limites

- Confirmado no cubo: 2T2026 tem 648 projetos totais (vertical e horizontal), 132 rejeitados pela política; 4T2025 tem 626 projetos e 154 rejeitados. Lançamentos da janela vertical: 16.110 e 14.644, respectivamente.
- Confirmado no cubo: as categorias de maturidade existentes são Planta (até 6 meses), Construção (7–36 meses) e Pronto (37+ meses); elas não sustentam uma média aritmética de idade em meses. O slide mantém essas categorias e não inventa “média em meses”.
- Confirmado no snapshot: há resíduo histórico sem tipologia e final nulo. Não há base para estimar seu estoque nem para exibir disponibilidade total como se a cobertura fosse completa.
- Os números acima documentam este snapshot mutável da GeoBrain, não metas nem constantes de runtime.

## G1 — Limpeza da tabela de preços

Em `PriceTableSlide`, a linha permanece quando qualquer um entre ticket, área e R$/m² é observado (inclusive zero); somente linha com os três valores ausentes é removida. A agregação e totais permanecem inalterados. Inspeção das páginas físicas 48 dos dois PDFs confirmou que “Não classificado” sem qualquer preço/área não aparece e que os demais padrões continuam.

## G2 — Percentuais de disponibilidade

`OfferTableSlide` mantém lançamentos/projetos da janela na coluna correspondente; para FIERGS, a nova disponibilidade por linha usa `Oferta Final ÷ Oferta Lançada histórica da mesma tipologia/padrão`. O cabeçalho e a nota esclarecem os universos. Linhas sem denominador, com valor não finito ou disponibilidade fora de 0–100% exibem traço; total também exibe traço porque há resíduo não classificado. Linhas da janela sem coorte, mas com estoque final, mostram zero lançado e não perdem o estoque. Inspeção da página física 55 nos dois períodos confirmou 4+ com zero na janela e estoque final de 2 (2T2026) e 1 (4T2025), com percentuais 1,8% e 0,9% sobre o histórico, respectivamente.

## G3 — Restauração e redundância editorial

- IDs oficiais 59 e 60 voltam ao manifesto, como tempo/maturidade por tipologia e por padrão. Não se declara média contínua em meses; são estágios/faixas de idade já agregados pelo cubo.
- ID oficial 61 volta a renderizar `VgvSlide`, com subtotal vertical, horizontal e total do cubo. Não é duplicado dentro do consolidado horizontal. A inspeção das páginas físicas 60 confirmou a hierarquia e o rótulo “Vendas líquidas”; o cubo contém grupos horizontais com -3 unidades líquidas em 2T2026 e -2 em 4T2025, exibidas com sinal da fonte e sem normalização manual.
- O ID oficial 63 é o único quadro consolidado horizontal por produto e mantém disponibilidade e média de unidades lançadas por empreendimento. A página paralela anterior de oferta horizontal deixa de ser roteada, sem descartar a disponibilidade.
- A página oficial 41 continua condicionada à fonte anual completa; logo, os IDs retornados geram 74 páginas (75 do deck menos a 41 dispensada). Numeração exibida recalculada pelo manifesto.

## VGV — reconciliação do snapshot

Valores monetários em R$ milhões, da agregação granular por empreendimento:

| Segmento | Projetos | Lançadas históricas | Finais | Vendidas | VGV lançado | VGV final/disponível | VGV vendido |
|---|---:|---:|---:|---:|---:|---:|---:|
| Vertical | 519 | 54.921 | 5.414 | 1.091 | 14.597,043 | 1.147,717 | 13.449,326 |
| Horizontal | 129 | 30.476 | 3.365 | 779 | 6.478,765 | 726,285 | 5.752,480 |
| **Total** | **648** | **85.397** | **8.779** | **1.870** | **21.075,807** | **1.874,002** | **19.201,806** |

O VGV continua sendo fotografia/histórico agregado do cubo da fonte, não foi reescalado à janela editorial. A conferência aritmética e visual da exportação acompanha G4.

| Regressão 4T2025 | Projetos | Lançadas históricas | Finais | Vendas líquidas | VGV lançado | VGV final/disponível | VGV vendido |
|---|---:|---:|---:|---:|---:|---:|---:|
| Vertical | 505 | 53.455 | 6.018 | 1.524 | 14.099,7 | 1.170,8 | 12.929,0 |
| Horizontal | 121 | 28.413 | 2.840 | 978 | 5.982,1 | 551,1 | 5.431,0 |
| **Total** | **626** | **81.868** | **8.858** | **2.502** | **20.081,9** | **1.721,9** | **18.360,0** |

Inspeção da tabela por padrão encontrou valores líquidos negativos em alguns grupos horizontais (`−3` em 2T2026 e `−2` em 4T2025). O campo do cubo mantém sinal e representa vendas líquidas agregadas; não se inferiu a causa transacional nem se converteu o sinal em zero. Por isso o cabeçalho é “Vendas líquidas” e a nota informa que o sinal da fonte é preservado. A ressalva fica visível para a homologação.

O CSV confirmou cobertura incompleta em um empreendimento vertical (`Residencial Santa Bárbara`, Cachoeirinha): 63 unidades lançadas, sem oferta final atribuível e sem VGV lançado/final nos dois fechamentos. O quadro conserva esse empreendimento/unidades na contagem do cubo, mas VGV sem base fica como traço; os agregados VGV somam apenas valores observados. Foi incluída nota dinâmica que informa a quantidade de projetos/unidades sem VGV e declara que não há imputação. A disponibilidade total também permanece suprimida pela mesma lacuna dimensional/de estoque.

## Decisões, arquivos e testes

- Código alterado: `components/MarketSlides.tsx`, `components/ReportPaginator.tsx`, `report/fiergs-manifest.ts`, `report/manifest.ts`; testes `__tests__/final-adjustments.test.ts`, `__tests__/fiergs-editorial-blocks.test.tsx`, `__tests__/fiergs-manifest.test.ts`.
- Nenhuma alteração em `src/features/corretor` ou `src/features/corretor/referencia_ajustes/`.
- Vitest FIERGS: 32 arquivos, 266 testes aprovados. `npm run build` (`tsc --noEmit && vite build`): aprovado; avisos não bloqueantes de `caniuse-lite` desatualizado, chunks grandes e dimensões de gráficos em JSDOM.
- Regressões locais finais: `.tmp/fiergs-final-adjustments-regression-20261002/`. PDFs 2T2026 e 4T2025 têm 74 páginas cada; PPT espelhos, 74 slides cada; auditorias CSV, 819 linhas cada, 39 invariantes críticas `match`, zero deltas críticos. Capturas das páginas 48, 55, 58, 59, 60 e 62 dos dois períodos revisadas; o texto exportado confirma cobertura dinâmica do VGV e ausência de imputação. `git diff --check` aprovado. Artefatos locais, não publicados.
- Ressalva editorial: arte institucional ainda mostra 22 anos e permanece para alinhamento com marketing. O leitor deve homologar percentuais históricos e categorias de maturidade; não se declara média aritmética em meses porque a fonte só sustenta as faixas indicadas.
- **Commits locais:** implementação/testes `a95e039`; documentação/evidências será registrada em commit separado. `main` já continha o commit local do plano `e7a0fe5`; sem push.
