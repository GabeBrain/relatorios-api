# Plano terminal — Panorama V4: ajustes finais da revisão de Juliana

**Data:** 03/set/2026

**Executor:** Luna

**Rota:** `/rebrain/panorama-secovi-fiergs`

**Recorte de homologação:** Jundiaí/SP, `1T2023` a `2T2026`

**Fonte da revisão:** `src/features/panorama-secovi-fiergs/assets/correcao_v4/panorama-jundiai-2T2026-02-set (002).pdf`

**Card:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`

> Este plano autoriza a Luna a alterar código, testes e documentação desta feature e a criar um
> commit local isolado. Não autoriza `git push`, deploy, escrita no Monday nem contato com Juliana.

---

## 1. Resultado terminal esperado

Eliminar as quatro inconsistências marcadas por Juliana sem hardcode de Jundiaí e sem trocar o
universo Secovi já homologado. Toda lâmina de fechamento deve ler uma fonte canônica única do mesmo
recorte. No PDF-âncora corrigido, os seguintes valores devem fechar:

| Fato canônico | Valor esperado no recorte-âncora |
|---|---:|
| Preço vertical no fechamento (`2T2026`) | R$ 10.240/m² |
| Oferta lançada vertical | 6.642 |
| Oferta final vertical | 1.292 |
| Oferta lançada horizontal elegível | 428 |
| Oferta final horizontal elegível | 141 |
| Oferta lançada total | 7.070 |
| Oferta final total | 1.433 |
| Disponibilidade total | 20,3% |

Esses números são a expectativa da amostra recebida, não constantes do runtime. O código deve
derivá-los do cubo e do escopo selecionado.

---

## 2. Diagnóstico fechado

### AF-01 — PDF p.38: preço de `2T2026` diverge dos slides anteriores

- A p.38 imprime **R$ 10.558/m²**.
- A tabela por padrão e a narrativa imprimem **R$ 10.240/m²**.
- `ReportPaginator.tsx::TimeChart` lê `report.prices.meter.series`, montada a partir do contrato
  temporal `medium-prices-meter` em `report/model.ts`.
- `PriceTableSlide`, `PriceChartSlide` e `NarrativeSlide` leem
  `report.granular.pricesByStandard`, calculado do `building-with-history` em
  `domain/cube.ts` + `domain/aggregations.ts`.

**Causa:** duas fontes e ponderações diferentes publicam o mesmo fato editorial no trimestre de
fechamento. Não existe hoje uma reconciliação que imponha igualdade entre o último ponto da série e
a média geral granular usada nos slides de preço corrente.

### AF-02 — PDF p.41: maturidade por padrão usa universo fora do recorte

- A p.41 imprime **22.561 lançadas / 1.414 finais**.
- O consolidado do recorte imprime **6.642 / 1.292** para o vertical.
- `buildGranularBlocks()` aplica `cubeInLaunchWindow()` a oferta, coortes, matriz e VGV, mas chama
  `maturityByStandard(cube)` com o cubo completo.

**Causa:** a correção V4 da janela foi aplicada de forma incompleta. A lâmina de maturidade inclui
empreendimentos anteriores a `1T2023`.

### AF-03 — PDF p.43: maturidade por tipologia diverge por recorte e cobertura

- A p.43 imprime **22.353 lançadas / 1.414 finais**.
- Além de ignorar `startQuarter`, `maturityByTypology()` soma `typologies[].launchedUnits`, enquanto
  a dimensão por padrão soma `project.launchedUnits` (`total_units`). Na amostra, há **208 unidades**
  presentes no total dos empreendimentos e ausentes na abertura por tipologia.

**Causa:** recorte incorreto e ausência de política explícita para cobertura incompleta das
tipologias. Forçar a soma das tipologias a igualar `total_units` esconderia dado não classificado.

### AF-04 — PDF p.51: narrativa usa cubo completo

- A narrativa imprime **23.391 lançadas / 1.561 finais**, com **1.414 vertical + 147 horizontal** e
  disponibilidade de **6,7%**.
- O resumo geral e o VGV do mesmo PDF imprimem **7.070 / 1.433**, com **1.292 vertical + 141
  horizontal** e disponibilidade de **20,3%**.
- `NarrativeSlide` soma diretamente `report.cube.projects`; `MarketSummarySlide` e
  `buildGranularBlocks().vgv` usam `cubeInLaunchWindow(report.cube, report.scope)`.

**Causa:** consumidor remanescente do cubo completo depois da introdução da janela V4.

---

## 3. Decisão de arquitetura

Criar no modelo um fechamento canônico derivado uma única vez do `launchCube` e impedir que JSX
recalcule fatos de mercado diretamente de `report.cube`. Esse fechamento deve expor, no mínimo:

- universo filtrado pelo intervalo;
- totais por segmento e total geral;
- disponibilidade;
- preço vertical corrente reconciliado;
- cobertura das aberturas por padrão e tipologia;
- origem/metodologia de cada fato.

`report.cube` continua necessário para históricos que legitimamente antecedem o início editorial,
como a base do IVV. A regra não é “filtrar tudo”: é declarar no modelo qual universo cada métrica
usa e fazer todos os consumidores do mesmo fato usarem a mesma saída.

---

## 4. Implementação em ordem terminal

### T0 — Congelar os quatro defeitos em testes vermelhos

1. Criar fixture V4 com empreendimento anterior a `1T2023`, empreendimentos dentro da janela e
   pelo menos um projeto cuja soma de `typologies_history[].qty` seja menor que `total_units`.
2. Fixar os quatro sintomas atuais: preço final divergente, maturidade fora da janela, diferença de
   cobertura por tipologia e narrativa baseada no cubo completo.
3. Não usar o PDF como parser de teste. Testar o modelo e o HTML renderizado; o PDF entra no gate
   visual final.

**Gate T0:** os novos testes falham no código atual pelas quatro razões descritas acima.

### T1 — Introduzir o fechamento canônico do recorte

1. Em `report/model.ts`, calcular `launchCube` uma única vez em `buildPanoramaReportModel()`.
2. Acrescentar a `PanoramaReportModel` um bloco nomeado, por exemplo `closingFacts`, com totais por
   segmento e total geral, disponibilidade e preço corrente.
3. Reusar `universeTotals()`/agregações puras; não duplicar `reduce()` em componentes.
4. Preservar `null` quando a fonte é incompleta. Universo vazio observado pode ser zero; ausência de
   dado não pode virar zero.

**Gate T1:** resumo, VGV e narrativa recebem os mesmos totais a partir da mesma estrutura.

### T2 — Reconciliar o preço do trimestre de fechamento

1. Definir como preço corrente autoritativo o total ponderado de
   `granular.pricesByStandard` para o vertical, pois é a mesma base usada nas tabelas, gráficos por
   padrão/tipologia e narrativa.
2. Preservar a série temporal do endpoint nos trimestres anteriores.
3. No `endQuarter`, substituir/reconciliar apenas o ponto vertical da série com o preço corrente
   canônico, registrando a origem composta no modelo. Não mutar a resposta da API.
4. Recalcular a variação do último ponto depois da reconciliação.
5. Se o granular corrente estiver indisponível, manter o temporal e marcar a cobertura; nunca
   fabricar igualdade com zero.

**Gate T2:** `2T2026` imprime R$ 10.240/m² na p.38 e nas lâminas anteriores; variação e média anual
usam o ponto reconciliado.

### T3 — Aplicar a janela às duas lâminas de maturidade

1. Em `buildGranularBlocks()`, chamar `maturityByStandard(launchCube)` e
   `maturityByTypology(launchCube)`.
2. Manter `areaBands` no cubo completo, porque seu IVV depende de estoque anterior; documentar essa
   exceção ao lado do código.
3. Garantir que maturidade por padrão feche exatamente com os totais verticais canônicos.

**Gate T3:** p.41 fecha em **6.642 lançadas / 1.292 finais** no fixture de Jundiaí e nenhum projeto
anterior a `1T2023` participa.

### T4 — Tornar explícita a cobertura por tipologia

1. Em `maturityByTypology()`, comparar os totais classificados nas tipologias com os totais do
   universo vertical do `launchCube`, por faixa de maturidade e no total.
2. Quando houver diferença positiva, criar linha editorial `Não informado`/`Sem tipologia
   informada` com o resíduo correspondente. Não distribuir proporcionalmente e não atribuir a uma
   tipologia conhecida.
3. Se a soma tipológica exceder o total do projeto, tratar como violação de contrato: estado
   parcial/indisponível com evidência técnica, em vez de resíduo negativo.
4. Aplicar a mesma linha à versão de participação para cada coluna fechar 100%.

**Gate T4:** p.43 fecha nos mesmos **6.642 / 1.292** da p.41, e as **208 unidades** antes invisíveis
aparecem como cobertura não informada no dataset-âncora, sem serem inventadas em uma tipologia.

### T5 — Migrar consumidores para os fatos canônicos

1. `MarketSummarySlide`: consumir `closingFacts`, removendo cálculo local.
2. `NarrativeSlide`: consumir `closingFacts` para oferta final, oferta lançada, segmentos e
   disponibilidade; manter top padrão/tipologia e preços vindos dos blocos canônicos.
3. `VgvSlide`/`vgvSummary`: testar igualdade com `closingFacts`; não precisa duplicar campos se a
   agregação já usa `launchCube`.
4. `TimeChart`: receber a série de preço já reconciliada pelo modelo, sem regra de negócio no JSX.

**Gate T5:** no recorte-âncora, p.27/p.49/p.51 e as tabelas de oferta/VGV fecham em **7.070
lançadas / 1.433 finais / 20,3%**, com **1.292 vertical + 141 horizontal**.

### T6 — Invariantes transversais

Adicionar uma função pura de auditoria do modelo, executada nos testes e opcionalmente registrada na
evidência de geração, com estas invariantes:

1. total geral = vertical + horizontal;
2. disponibilidade = oferta final ÷ oferta lançada;
3. total por padrão = total canônico do segmento;
4. total por tipologia + `Não informado` = total canônico do segmento;
5. maturidade por padrão = maturidade por tipologia reconciliada;
6. VGV em unidades = fechamento canônico;
7. narrativa = fechamento canônico;
8. preço do `endQuarter` = preço corrente publicado nos demais slides.

Falha de invariante não deve ser “corrigida” no componente. Deve falhar teste e deixar causa,
esperado e obtido legíveis.

### T7 — Regressão e evidência final

Executar:

1. testes direcionados de cubo, agregações, modelo e renderização;
2. regressão JG-01…JG-40 e V4;
3. `npm test`;
4. `npm run typecheck`;
5. `npm run build`;
6. Playwright dos cenários Jundiaí, Praia Grande e Baixada;
7. paridade de manifesto, preview, PDF e PPT;
8. geração autenticada de Jundiaí `1T2023–2T2026`, se houver credencial válida;
9. `npm run check:live-docs -- <base> <head>`.

Produzir uma matriz `página | fato | esperado | obtido | diferença | fonte` para p.27, p.29, p.31,
p.34, p.36–43, p.46, p.49 e p.51 do novo arquivo. Guardar artefatos em `.tmp/`; não versionar
Bearer, payload sensível, PDF/PPT gerado ou screenshots temporários.

---

## 5. Arquivos prováveis

- `src/features/panorama-secovi-fiergs/types.ts`
- `src/features/panorama-secovi-fiergs/report/model.ts`
- `src/features/panorama-secovi-fiergs/domain/aggregations.ts`
- `src/features/panorama-secovi-fiergs/components/MarketSlides.tsx`
- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`
- testes em `src/features/panorama-secovi-fiergs/__tests__/`
- `docs/projetos/LIVE_rebrain.md`

Não há necessidade prevista de novo componente visual, token, rota ou decisão em
`FRONTEND_DECISIONS.md`. Reutilizar as tabelas, gráficos, estados e estilo institucional existentes.

---

## 6. Critérios de rejeição

A entrega não está pronta se:

- fizer hardcode dos números de Jundiaí;
- apenas trocar textos no JSX sem corrigir o modelo;
- cortar o histórico inteiro para consertar o IVV;
- distribuir unidades sem tipologia entre categorias conhecidas;
- substituir dado ausente por zero;
- deixar p.41 e p.43 com totais diferentes;
- deixar o último preço temporal diferente da média corrente publicada;
- atualizar snapshot visual para aceitar divergência;
- alterar o universo horizontal/loteamentos já homologado;
- fazer push, deploy ou escrever no Monday sem autorização.

---

## 7. Sinal terminal da Luna

```text
LUNA_READY_FOR_GABRIEL
AF-01 preço 2T2026 reconciliado com preço corrente: PASS
AF-02 maturidade por padrão dentro de 1T2023–2T2026: PASS
AF-03 tipologia + não informado fecha com padrão: PASS
AF-04 narrativa fecha com resumo e VGV: PASS
Jundiaí: 7.070 lançadas / 1.433 finais / 20,3%: PASS
Preview/PDF/PPT: paridade PASS
Testes/typecheck/build: PASS
Commit: <hash>
Push/deploy/Monday: não realizados; aguardando autorização
```

Após esse sinal e eventual publicação autorizada, Gabriel gera um novo PDF autenticado e o traz
para comparação página a página com esta revisão de Juliana.
