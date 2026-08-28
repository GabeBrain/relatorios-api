# Handoff terminal — Opus — trilha A (domínio, API e agregações) — V1 Jundiaí

**Status:** `OPUS_READY`
**Data:** 2026-08-27
**Papel:** trilha A, núcleo de dados; não commita
**Commit-base:** `d66c5e5975b35d4af7eca71018f590bf9107ffd8` (`main`)
**Rota:** `/rebrain/panorama-secovi-fiergs`
**Card:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`
**Matriz de aceite:** [`MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md`](./MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md)
**Plano executado:** [`PLAN_OPUS_CORRECOES_V1_JUNDIAI.md`](./PLAN_OPUS_CORRECOES_V1_JUNDIAI.md)
**Plano par:** [`PLAN_LUNA_CORRECOES_V1_JUNDIAI.md`](./PLAN_LUNA_CORRECOES_V1_JUNDIAI.md)

> **Declaração obrigatória:** nenhum arquivo foi staged, commitado ou enviado. Não foram executados
> `git add`, `git commit`, `git push`, `pull`, `checkout`, `reset`, `rebase`, `stash`, `clean` nem
> troca de branch. O `HEAD` permanece em `d66c5e5` e a área de staging está vazia
> (`git diff --cached --name-only` sem saída).

> **PDF-fonte preservado:** `src/features/panorama-secovi-fiergs/assets/exportados/panorama-jundiaí-1T2026 - Corrigido.pdf`
> permanece não versionado e intacto.
> SHA-256 no início e no fim da sessão: `c297e8058dc95a9a02aa056deb4c4c25d56a43ee9b1c06ba829aad1793e7054f`.

---

## 1. Sumário para quem revisa

Foi implementado o núcleo tipado de dados da V1: política de universo por entidade, taxonomias
canônicas, período dinâmico, coleta multi-cidade, cubo granular por empreendimento e as agregações
prontas dos slides 31–51. Tudo em módulos puros e testáveis sob `domain/`, consumidos por
`report/model.ts` e alimentados por `api.ts`.

- **6 módulos novos** de domínio puro (1.128 linhas), **3 suítes novas** de teste (711 linhas).
- **86 testes novos**; suíte completa em **230 testes / 27 arquivos, todos verdes**.
- **Zero erros de typecheck** em arquivos sob propriedade do Opus.
- Erros de typecheck restantes são (a) arquivos do Luna que precisam adotar o contrato `cities[]` e
  (b) dois defeitos pré-existentes — detalhados na seção 7.

**Ponto de atenção para o revisor:** `npm run typecheck` e `npm run build` **não checam nada** neste
repositório. Ver seção 7.1 — é um achado independente desta entrega e vale para o repo inteiro.

---

## 2. Arquivos criados

Todos são módulos puros, sem dependência de rede, React ou DOM.

| Arquivo | Linhas | Responsabilidade |
|---|---:|---|
| `src/features/panorama-secovi-fiergs/domain/quarters.ts` | 89 | Parser, comparação, deslocamento e geração de trimestres; janela editorial de 17 períodos; datas de `start_period`/`end_period`; opções de fechamento disponíveis. |
| `src/features/panorama-secovi-fiergs/domain/taxonomy.ts` | 124 | Canonização e ordenação de tipologias e padrões; coortes por ano; faixas de maturidade. |
| `src/features/panorama-secovi-fiergs/domain/entity-policy.ts` | 97 | Política de universo por entidade; regra `secovi-sp`; classificação de subtipo horizontal; ponto de extensão FIERGS. |
| `src/features/panorama-secovi-fiergs/domain/cube.ts` | 301 | Cubo granular por empreendimento a partir de `building-with-history`; helpers `addNullable` e `weightedAverage`; merge multi-cidade. |
| `src/features/panorama-secovi-fiergs/domain/aggregations.ts` | 428 | Linhas prontas dos slides 31–51: oferta, coortes, matriz, maturidade, preços, VGV, reconciliação. |
| `src/features/panorama-secovi-fiergs/domain/collection.ts` | 89 | Coleta multi-cidade com concorrência limitada, `AbortSignal` e proveniência de falha parcial. |
| `src/features/panorama-secovi-fiergs/__tests__/opus-domain-policy.test.ts` | 163 | 25 testes de política e taxonomias. |
| `src/features/panorama-secovi-fiergs/__tests__/opus-period-cities.test.ts` | 156 | 17 testes de período dinâmico, rótulo/slug e coleta multi-cidade. |
| `src/features/panorama-secovi-fiergs/__tests__/opus-cube-aggregations.test.ts` | 392 | 40 testes de cubo, agregações e reconciliação. |
| `docs/features/Relatorios Secovi_FIERGS/HANDOFF_OPUS_CORRECOES_V1_JUNDIAI.md` | — | Este documento. |

## 3. Arquivos alterados

| Arquivo | Δ | O que mudou |
|---|---:|---|
| `src/features/panorama-secovi-fiergs/types.ts` | +81/−6 | `PanoramaScope` passa a `cities: string[]` + `entity?`; novos `PanoramaProvenance`, `PanoramaGranularBlocks`; helpers `scopeCityLabel`/`scopeCitySlug`; `PanoramaReportModel` ganha `provenance`, `cube` e `granular`. |
| `src/features/panorama-secovi-fiergs/api.ts` | +160/−50 | Coleta multi-cidade com concorrência e cancelamento; `fetchBuildings` unificado; janela temporal derivada do fechamento; `launchRecordsFrom`/`cohortRowsFrom` tornados puros; auditoria multi-cidade; bancadas de calibração explicitamente mono-cidade. |
| `src/features/panorama-secovi-fiergs/report/model.ts` | +80/−15 | Janela editorial dinâmica; `buildGranularBlocks`; `provenanceOf`; `dataState` sensível a falha parcial; mapa alimentado pelo cubo filtrado; anotação de tipo em `status`. |
| `src/features/panorama-secovi-fiergs/__tests__/report-model.test.ts` | +93/−1 | 6 testes novos de consolidado multi-cidade, proveniência, período posterior a 1T/26 e Faixa de Valor. |
| `src/features/panorama-secovi-fiergs/reference/piracicaba-1t26.ts` | +1/−1 | Adaptação mecânica do fixture ao contrato `cities: ['Piracicaba']`. Ver seção 8.1. |

**Não foram tocados** — `pages/`, `components/`, `report/manifest.ts`, `print/panorama-print.css`,
`lib/pdf-export.ts`, `lib/pdf-print-interceptor.ts`, `export-store.ts`, `__tests__/pdf-export.test.ts`,
o plano do Luna, o mapeamento, o documento vivo e o PDF-fonte.

---

## 4. Contrato público final

### 4.1 `PanoramaScope` — recorte canônico

```ts
interface PanoramaScope {
  uf: string;
  cities: string[];   // uma cidade é um array de um item; `scope.city` não existe mais
  endQuarter: Quarter;
  entity?: EntityId;  // default 'secovi-sp'
}
```

Helpers determinísticos exportados de `types.ts`, para capa, título e nome de arquivo:

```ts
scopeCityLabel({ cities: ['Jundiaí'] })                          // 'Jundiaí'
scopeCityLabel({ cities: ['Jundiaí', 'Piracicaba'] })            // 'Jundiaí e Piracicaba'
scopeCityLabel({ cities: ['Jundiaí', 'Piracicaba', 'Campinas'] })// 'Jundiaí, Piracicaba e Campinas'
scopeCityLabel({ cities: [] })                                   // '—'

scopeCitySlug({ cities: ['Jundiaí', 'São Paulo'] })              // 'jundiai-sao-paulo' (ordem-independente)
scopeCitySlug({ cities: [] })                                    // 'sem-cidade'
```

> **Nota de integração:** o slug é ordenado alfabeticamente, portanto estável qualquer que seja a
> ordem em que o usuário selecionou os municípios. Com mais de 3 cidades, vira
> `a-b-c-e-mais-N`, para não gerar nome de arquivo impraticável.

### 4.2 `PanoramaReportModel` — chaves preservadas + acréscimos

Todas as chaves públicas anteriores foram **preservadas** (`launches`, `sales`, `stock`, `ivv`,
`ivvByTypology`, `prices`, `market`, `locations`, `source`, `dataState`, `openMethodologies`).
Acrescentadas três:

```ts
model.provenance : PanoramaProvenance      // cidades pedidas/concluídas/falhas + recusas de política
model.cube       : MarketCube              // base granular por empreendimento
model.granular   : PanoramaGranularBlocks  // linhas prontas dos slides 31–51
```

```ts
interface PanoramaProvenance {
  requestedCities: string[];
  completedCities: string[];
  failedCities: { city: string; error: string }[];
  entity: EntityId;
  rejectedByPolicy: { reason: string; count: number }[];
}
```

### 4.3 `model.granular` — linhas prontas por slide

| Campo | Tipo | Slides | Observação |
|---|---|---|---|
| `offerByStandard` | `OfferRow[]` | 31 | Vertical, ordem canônica, termina em `Total`. |
| `offerByTypology` | `OfferRow[]` | 34, 35 | Vertical, rótulos canônicos. |
| `cohortsVertical` | `OfferRow[]` | 33 | `Até 2022`, anos, `Subtotal até 2024`, `Total geral`. |
| `cohortsHorizontal` | `OfferRow[]` | 48 | Só Condomínio de Casas. |
| `cohortMatrix` | `CohortMatrix` | 41 | Ano × padrão, **com oferta lançada preenchida**. |
| `cohortMatrixParticipation` | `CohortMatrix` | 42 | Derivada exclusivamente da matriz acima. |
| `maturityByStandard` | `MaturityRow[]` | 43, 44 | Só vertical. |
| `maturityByTypology` | `MaturityRow[]` | 45, 46 | Só vertical, rótulos canônicos. |
| `pricesByStandard` | `PriceRow[]` | 38, 39 | Vertical, `Média Geral` ponderada. |
| `pricesByTypology` | `PriceRow[]` | 36, 37 | Vertical, `Média Geral` ponderada. |
| `horizontalPricesByStandard` | `PriceRow[]` | 49 | Horizontal aberto por padrão. |
| `vgv` | `VgvRow[]` | 51 | Verticais → `Subtotal vertical` → horizontais → `Subtotal horizontal` → `Total geral`. |
| `valueRangeAvailable` | `boolean` | 31 | **Sempre `false` na V1.** Ver seção 6.3. |

Toda linha carrega `kind: 'row' | 'subtotal' | 'total'`, para o Luna estilizar sem inferir pelo
rótulo. Helper `totalRowOf(rows)` exportado de `domain/aggregations.ts`.

### 4.4 Convenção de ausência — a regra mais importante

**`null` é ausência real; `0` é zero medido.** Nunca converter um em outro na apresentação.

- Somas usam `addNullable`: `null + null = null`, mas `null + 5 = 5`.
- Médias usam `weightedAverage`, que devolve `null` quando não há par (valor, peso) utilizável.
- `availability` é `null` quando a base é zero ou indisponível — nunca `NaN`, nunca `0%`.
- `CubeProject.coverage` é `'complete' | 'partial' | 'missing'`.

> **Para o Luna:** exibir `—` quando o valor for `null`, e `0` quando for `0`. Um `?? 0` no JSX
> desfaz a garantia central desta trilha.

### 4.5 Diferenças nominais em relação ao plano

O plano não fixava nomes. Os escolhidos:

| Conceito no plano | Nome implementado |
|---|---|
| "cubo granular" | `MarketCube` / `CubeProject` (`domain/cube.ts`) |
| "política tipada por entidade" | `EntityPolicy` / `entityPolicy(id)` (`domain/entity-policy.ts`) |
| "proveniência" | `model.provenance: PanoramaProvenance` |
| "linhas prontas" | `model.granular: PanoramaGranularBlocks` |
| "coortes" | `offerByCohort` + `cohortBuckets` |
| — (novo) | `scopeCityLabel` / `scopeCitySlug` em `types.ts` |

---

## 5. Matriz `OP-ID → requisito/slide → evidência → status`

| OP | Requisito / slide | Evidência (arquivo · teste) | Status |
|---|---|---|---|
| OP-1 | G-03 · universo Secovi: todos verticais | `opus-domain-policy` · "aceita todo empreendimento vertical" | ✅ |
| OP-1 | G-03 · só Cond. de Casas no horizontal | `opus-domain-policy` · "aceita no horizontal somente o subtipo canônico" | ✅ |
| OP-1 | G-03 · não inferir que Horizontal = Cond. de Casas | `opus-domain-policy` · "não infere…(rejeita PRE-002)" + "`Horizontal` sozinho é o segmento repetido" | ✅ |
| OP-1 | G-03 · exclusão de loteamento | `opus-domain-policy` · "recusa loteamento"; `opus-cube-aggregations` · "aplica a política Secovi" | ✅ |
| OP-1 | Extensão FIERGS sem inventar regra | `opus-domain-policy` · "mantém a extensão FIERGS explícita" | ✅ |
| OP-1 | Slides 34–37, 45, 46 · tipologias canônicas | `opus-domain-policy` · 4 testes de tipologia | ✅ |
| OP-1 | Slides 38, 39, 51 · sete padrões canônicos | `opus-domain-policy` · 4 testes de padrão | ✅ |
| OP-1 | Slides 33, 41, 42, 48 · agrupamento de coortes | `opus-domain-policy` · 5 testes de coorte | ✅ |
| OP-1 | Aliases, acentos e desconhecidos | `opus-domain-policy` · "canoniza…com e sem acento", "marca desconhecido explicitamente" | ✅ |
| OP-2 | G-02 · 17 trimestres até qualquer fechamento | `opus-period-cities` · "gera 17 trimestres…inclusive posterior a 1T/26" | ✅ |
| OP-2 | G-02 · transição de ano | `opus-period-cities` · "atravessa a virada de ano corretamente" | ✅ |
| OP-2 | G-02 · ordenação | `opus-period-cities` · "mantém a janela estritamente ordenada" | ✅ |
| OP-2 | G-02 · fim de limites fixos | `opus-period-cities` · "deriva start_period e end_period do fechamento" | ✅ |
| OP-2 | G-02 · trimestre futuro sem dados | `report-model` · "gera a janela editorial a partir de um fechamento posterior a 1T/26" | ✅ |
| OP-3 | G-01 · `cities[]` | `types.ts`; `opus-period-cities` · rótulo/slug | ✅ |
| OP-3 | G-01 · uma cidade | `opus-period-cities` · "coleta uma cidade e reporta ready" | ✅ |
| OP-3 | G-01 · duas cidades | `opus-period-cities` · "coleta duas cidades"; `report-model` · "soma numeradores municipais" | ✅ |
| OP-3 | G-01 · concorrência limitada | `opus-period-cities` · "respeita o limite de concorrência" | ✅ |
| OP-3 | G-01 · cancelamento | `opus-period-cities` · "cancelamento propaga exceção" + "sinal já abortado" | ✅ |
| OP-3 | G-01 · falha parcial nomeada | `opus-period-cities` · "falha parcial nomeia a cidade"; `report-model` · "expõe cidades…e cai para partial" | ✅ |
| OP-3 | G-01 · falha total | `opus-period-cities` · "falha total devolve unavailable"; `report-model` · "reporta unavailable" | ✅ |
| OP-3 | G-01 · sem colisão de IDs entre cidades | `opus-cube-aggregations` · "usa chave por cidade"; `report-model` · "soma numeradores municipais" | ✅ |
| OP-3 | G-01 · dedupe dentro da cidade | `opus-cube-aggregations` · "deduplica o mesmo building_id" | ✅ |
| OP-4 | Cubo granular completo | `opus-cube-aggregations` · "monta o empreendimento com padrão, tipologias, maturidade e cobertura" | ✅ |
| OP-4 | Contagem por IDs distintos | `opus-cube-aggregations` · slide 31 "conta empreendimentos por IDs distintos" | ✅ |
| OP-4 | VGV prefere fonte bruta e registra fórmula | `opus-cube-aggregations` · "prefere VGV bruto da API e registra a fórmula" | ✅ |
| OP-4 | Ausência ≠ zero | `opus-cube-aggregations` · "ausência de preço mantém VGV nulo", "distingue ausência de zero", "universo vazio não fabrica dados" | ✅ |
| OP-4 | Preço nunca é média simples de médias | `opus-cube-aggregations` · "média ponderada não é média simples de médias" | ✅ |
| OP-4 | Faixa de Valor sem regra autoritativa | `report-model` · "sinaliza Faixa de Valor como indisponível" | ✅ (ver 6.3) |
| OP-5 | Slide 31 · oferta por padrão | `opus-cube-aggregations` · 5 testes | ✅ |
| OP-5 | Slides 34/35 · oferta por tipologia | `opus-cube-aggregations` · 3 testes | ✅ |
| OP-5 | Slides 33/48 · coortes com subtotais | `opus-cube-aggregations` · 4 testes | ✅ |
| OP-5 | Slide 41 · **oferta lançada não zerada** | `opus-cube-aggregations` · "traz oferta lançada preenchida, e não zerada como no PDF de Jundiaí" | ✅ |
| OP-5 | Slide 42 · participação sem `NaN`, fecha 100% | `opus-cube-aggregations` · "a participação deriva da matriz corrigida" | ✅ |
| OP-5 | Slides 43–46 · **maturidade não zerada**, só vertical | `opus-cube-aggregations` · 4 testes | ✅ |
| OP-5 | Slides 36–39 · preços por padrão/tipologia | `opus-cube-aggregations` · 2 testes | ✅ |
| OP-5 | Slide 49 · horizontal aberto por padrão | `opus-cube-aggregations` · "o slide 49 abre o horizontal por padrão, sem loteamento" | ✅ |
| OP-5 | Slide 51 · **contagem não zerada**, blocos e subtotais | `opus-cube-aggregations` · 4 testes | ✅ |
| OP-5 | Reconciliação entre todas as dimensões | `opus-cube-aggregations` · "fecha no mesmo total", "a linha de total reconcilia", "o subtotal vertical reconcilia" | ✅ |
| OP-6 | Testes próprios verdes | 230/230, 27 arquivos | ✅ |
| OP-6 | Typecheck da camada própria | 0 erros em arquivos do Opus | ✅ |
| OP-6 | Falhas externas registradas | Seção 7 | ✅ |

---

## 6. Decisões de domínio que o revisor deve validar

### 6.1 `Horizontal` sozinho não é evidência de subtipo — **achado durante os testes**

A API sempre devolve `building_type: "Horizontal"`. Na primeira implementação, esse campo contava
como "texto disponível", o que tornava o estado `indefinido` inalcançável: todo horizontal sem
subtipo caía em `outro`. Ambos os caminhos recusam o registro, então o comportamento externo não
mudava — mas a distinção perdia sentido, e a premissa PRE-002 voltaria pela porta dos fundos se
alguém depois relaxasse a regra de `outro`.

Correção em `entity-policy.ts`: a constante `SEGMENT_ONLY` exclui `horizontal`, `vertical` e
`residencial horizontal/vertical` da lista de evidências. Coberto por teste dedicado.

### 6.2 Padrões colapsados para manter exatamente sete linhas (slide 38)

- `Super Luxo`, `Altíssimo` → `Luxo`
- `Especial` → `Compacto` (PRE-008, ainda `ASSUMED`)
- `MCMV`, `Popular`, `Social` → `Econômico`

**Para validar com a analista:** o mapeamento de `Especial` continua sem confirmação formal.

### 6.3 Faixa de Valor — `valueRangeAvailable: false` (slide 31)

Não há campo de faixa de valor no payload de `building-with-history` nem regra autoritativa nos
documentos. Conforme o mapeamento, a decisão é **remover a coluna na V1**, não exibir travessões.
O modelo sinaliza isso explicitamente e acrescenta uma linha em `model.openMethodologies`.

**Ação para o Luna:** remover as colunas `Faixa de Valor` de `OfferTableSlide` quando
`report.granular.valueRangeAvailable === false`.

### 6.4 Maturidade derivada da idade do empreendimento (PRE-007)

`Planta` 0–6, `Construção` 7–36, `Pronto` 37+ meses entre `release_date` e o fechamento. Continua
`OPEN`: a origem da idade não foi confirmada pela analista. Os valores deixam de ser zero, mas o
método permanece não homologado.

### 6.5 Bancadas de calibração continuam mono-cidade

`fetchLaunchCalibration` e `fetchMarketCalibration` comparam contra um gabarito **municipal**
congelado (Piracicaba). Consolidar várias cidades ali produziria comparação sem sentido. Ambas
usam `primaryCity(scope)` e lançam erro claro se o recorte estiver vazio.

---

## 7. Comandos executados e resultados

| Comando | Momento | Resultado |
|---|---|---|
| `git rev-parse HEAD` | início e fim | `d66c5e5…` nos dois |
| `sha256sum` do PDF-fonte | início e fim | `c297e805…7054f` nos dois |
| `npx tsc --noEmit` | baseline | exit 0 — **enganoso**, ver 7.1 |
| `npx vitest run` | baseline | 24 arquivos / 144 testes verdes |
| `npx tsc -p tsconfig.app.json --noEmit` | final | 0 erros em arquivos do Opus; ver 7.2 |
| `npx vitest run src/features/panorama-secovi-fiergs/` | final | 7 arquivos / 93 testes verdes |
| `npx vitest run` | final | **27 arquivos / 230 testes verdes** |
| `git diff --cached --name-only` | fim | vazio |

### 7.1 Achado independente: `npm run typecheck` e `npm run build` não checam nada

`tsconfig.json` na raiz declara `"files": []` com project references. `tsc --noEmit` nessa
configuração **compila zero arquivos e sai com código 0**. Como `package.json` define
`"typecheck": "tsc --noEmit"` e `"build": "tsc --noEmit && vite build"`, a verificação de tipos do
projeto está inerte hoje — o `vite build` roda, mas sem checagem prévia.

O typecheck real é:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

**Não corrigi** `package.json`: está fora da minha propriedade de arquivos e afeta o repositório
inteiro, não só esta feature. Recomendo tratar como item próprio, fora desta entrega.

### 7.2 Erros de typecheck restantes (nenhum em arquivo do Opus)

**a) Arquivos do Luna — esperado, é a adoção do contrato `cities[]`:**

```
components/MarketSlides.tsx        (132, 158)
components/PanoramaExportHost.tsx  (26, 36, 38, 45)
components/ReportPaginator.tsx     (31, 180, 183×2, 217×2)
components/UniverseCurationPanel.tsx (13)
pages/PanoramaSecoviFiergsPage.tsx (16, 19, 20)
```

Todos são `Property 'city' does not exist on type 'PanoramaScope'`. A correção é trocar
`report.scope.city` por `scopeCityLabel(report.scope)` (exibição) ou `scopeCitySlug(report.scope)`
(nome de arquivo). `PanoramaSecoviFiergsPage.tsx:20` tem um caso extra: `GeoScope` do
`GeoApiScopeEngine` ainda exige `city` escalar — a página precisará adaptar entre os dois contratos.

**b) Defeitos pré-existentes, não introduzidos por esta trilha e não tocados por nenhum dos dois:**

```
src/features/dashboard-geobrain/Charts.tsx(39,22)   TS2322  Element | SVGElement → SVGElement
src/features/panorama-secovi-fiergs/lib/pdf-export.ts(49,90) TS2345 requestAnimationFrame callback
```

Estavam mascarados pelo problema de 7.1. Ambos fora da minha propriedade.

**c) Em `ReportPaginator.tsx(57,82)`** há `TS2367` (comparação sem sobreposição entre
`'count' | 'sqm'` e `'percent'`) — arquivo do Luna, em alteração ativa por ele. Não toquei.

---

## 8. Limitações reais e pendências

### 8.1 Um arquivo fora da lista de propriedade

`reference/piracicaba-1t26.ts` **não consta** nem na lista do Opus nem na do Luna. Contém apenas o
fixture do gabarito congelado e quebrava a compilação por causa da mudança de `PanoramaScope`.
Alterei **uma linha**, mecanicamente:

```diff
- scope: { uf: 'SP', city: 'Piracicaba', endQuarter: '1T2026' },
+ scope: { uf: 'SP', cities: ['Piracicaba'], endQuarter: '1T2026' },
```

Sem mudança de valores, semântica ou estrutura. Registrado aqui por transparência; reverta se
preferir tratá-lo na integração.

### 8.2 Campos do payload inferidos, não confirmados contra resposta real

O cubo lê os campos por lista de candidatos (`firstNumber` / `firstText`), tolerando variações:

| Conceito | Chaves tentadas, em ordem |
|---|---|
| subtipo horizontal | `building_subtype`, `subtype`, `sub_type`, `horizontal_type`, `product_type` |
| estoque por tipologia | `typology_stock`, `stock` |
| vendas por tipologia | `liquid_sales`, `sold`, `sales` |
| área privativa | `private_area`, `area`, `average_area` |
| VGV bruto lançado | `vgv_released`, `vgv_launched`, `launch_vgv` |

**Não houve chamada autenticada à API GeoBrain nesta sessão** — os testes usam fixtures sintéticas
no formato documentado. Se a API usar outro nome para o subtipo horizontal, a política recusará
horizontais legítimos com `subtipo_horizontal_indefinido`, e isso aparecerá em
`model.provenance.rejectedByPolicy`.

> **Primeiro teste com token real deve ser:** rodar Jundiaí/1T2026 e inspecionar
> `model.provenance.rejectedByPolicy`. Se houver muitos `subtipo_horizontal_indefinido`, o nome do
> campo precisa ser acrescentado à lista em `cube.ts`. É um ajuste de uma linha.

### 8.3 Vendas por tipologia dentro do cubo

O cubo lê vendas do último snapshot do histórico. Quando ausente, deriva
`soldUnits = launchedUnits − finalUnits`. É consistente, mas não é a série temporal de vendas — os
slides 23–26 continuam usando os blocos temporais existentes (`model.sales`), inalterados.

### 8.4 Nada validado visualmente

Esta trilha não abriu preview nem gerou PDF. Toda evidência é de teste unitário sobre fixtures.
A inspeção das 62 páginas e o caso real com duas cidades pertencem à integração.

### 8.5 Fora de escopo por decisão do mapeamento

`G-04` (novo padrão de tabelas Rebrain) e `G-05` (PPTX) permanecem `V2-ADIADO`. Nada foi feito.

---

## 9. Orientações objetivas de integração

Ordem sugerida:

1. **Adotar `cities[]` nos componentes.** Trocar `report.scope.city` por
   `scopeCityLabel(report.scope)`; no nome do PDF, `scopeCitySlug(report.scope)`.
2. **Resolver a ponte com `GeoScope`** em `PanoramaSecoviFiergsPage.tsx:20` — o
   `GeoApiScopeEngine` ainda usa `city` escalar. Mapear entre os dois contratos na página.
3. **Ligar os slides ao `model.granular`.** Cada bloco da tabela em 4.3 substitui um cálculo hoje
   feito no JSX de `MarketSlides.tsx`. Não recalcular percentuais: `cohortMatrixParticipation` já
   vem pronto.
4. **Remover as colunas de Faixa de Valor** quando `granular.valueRangeAvailable === false`.
5. **Exibir `null` como `—`**, nunca como `0`. Ver 4.4.
6. **Mostrar a proveniência** quando `provenance.failedCities.length > 0`: o relatório está
   `partial` e o usuário precisa saber qual município não entrou.
7. **Usar `row.kind`** para estilizar subtotal/total, em vez de comparar rótulos.
8. **Rodar o typecheck real** (`npx tsc -p tsconfig.app.json --noEmit`) antes do commit — o script
   de `npm run typecheck` não serve, ver 7.1.

### O que eu deixei propositalmente para a integração

- Sugestão de corrigir `package.json` (fora da minha propriedade, afeta o repo inteiro).
- Os dois defeitos pré-existentes de 7.2(b).
- Atualização do documento vivo e do mapeamento — pertencem à integração.

---

## 10. Critério de pronto do Opus

- [x] propriedade de arquivos respeitada (uma exceção declarada em 8.1);
- [x] política Secovi aplicada em todas as fontes próprias;
- [x] período dinâmico e multi-cidade testados;
- [x] ausências distintas de zero;
- [x] contagens, ponderações e agregados reconciliados;
- [x] testes próprios aprovados (230/230) e falhas externas precisamente registradas;
- [x] handoff contém `OPUS_READY` e contrato final;
- [x] nenhum `git add`, commit ou push executado;
- [x] PDF-fonte preservado e não versionado.

**O Opus encerra aqui e não volta a editar.** A revisão, a integração, a validação visual das 62
páginas e o commit único combinado pertencem à trilha B.
