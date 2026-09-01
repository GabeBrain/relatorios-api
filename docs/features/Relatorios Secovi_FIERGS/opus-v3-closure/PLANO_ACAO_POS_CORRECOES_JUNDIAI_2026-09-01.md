# Plano de ação — o que faltava depois da V3

> **Status: executado em 01/set/2026.** As etapas 1, 2, 3 e 5 estão concluídas e commitadas; a
> etapa 4 depende de acesso ao deploy e continua aberta. O registro do diagnóstico permanece abaixo,
> inalterado, e o resultado de cada etapa está na §5.


**Data:** 01/set/2026
**Base da comparação:** `panorama-jundiai-2T2026- pos correcoes.pdf` (53 páginas, gerado por Gabriel
em 01/set 19:18) contra `panorama-jundiai-2T2026 - corrigido.pdf` (57 páginas, anotado por Juliana).
**Método:** as 53 páginas foram rasterizadas e lidas uma a uma contra os requisitos JG-01…JG-40.

## Veredito em uma linha

A camada **editorial e visual** fechou. A camada de **procedência dos números não fechou**: o
firewall de fontes só protegeu os lançamentos. Vendas, estoque, IVV municipal e preços continuam
vindo dos contratos temporais **sem filtro**, e por isso loteamentos de Jundiaí seguem no relatório —
agora, pior, **rotulados como "Condomínio de Casas"**.

---

## 1. O que está correto e pode ser dado como fechado

Conferido página a página no PDF novo:

| JG | Página | Evidência observada |
|---|---:|---|
| JG-01–04 | 4, 5, 6, 8 | tipografia institucional proporcional ao resto do deck; comparativo antes/depois é gritante |
| JG-05/06 | 10, 11 | rótulo `Condomínio de Casas`, sem cinza isolado, superfície uniforme, zeros visíveis, variação com ▲/▼ |
| JG-07–12 | 12–17 | **todos** os rótulos `0` aparecem; 2T2026 presente com chip; placa branca só nos 2ºs trimestres |
| JG-19 | 25 | faixas `Até 44m²`…`Acima de 250m²` no lugar de `1,2,3,4`; IVV real (25,3% / 9,6% / 35,9%…), não zerado |
| JG-21 | 29 | oferta por padrão do cubo: 109 empreendimentos, formatação condicional completa |
| JG-22 | 31 | `Subtotal lançados após 2024` = 2025 + 2026 (17 empreend., 2.786 lançadas, 1.014 finais), **depois** de 2026 |
| JG-23/24 | 34, 36 | R$/m² com escala e sinal |
| JG-26/27/28 | 39, 40 | subtotal na matriz ano × padrão, posicionado e somando certo; Total geral 100,0% |
| JG-29/30/31 | 42, 44 | **percentuais corrigidos**: as oito colunas fecham 100% cada uma, com a legenda da regra |
| JG-32/33/34 | — | bloco horizontal **inexistente** (53 páginas contra 58); sumário coerente |
| JG-35 | 46 | ordem correta; nenhuma linha horizontal vazia criada |
| JG-37 | 49 | "2 Dormitórios", não `2` solto |
| JG-40 | 52 | encerramento sem moldura tracejada e sem "FOTO DO CONSULTOR" |

---

## 2. O que ainda falta

### P1 — Firewall de fontes incompleto · **bloqueia a entrega**

Afeta JG-13 a JG-18, JG-20, JG-36 e JG-38.

O cubo granular filtra o universo, mas apenas os **lançamentos** passam por ele
(`launchRecordsFromCube`). Vendas, estoque, IVV e preços continuam sendo lidos dos contratos
`temporal-analysis-city/*`, que devolvem `Loteamento Fechado` como se fosse um "padrão" e agregam o
horizontal inteiro no `building_type`. Consequências medidas no PDF:

| Página | O que está impresso | Por que está errado |
|---:|---|---|
| 27 | `Total Mercado Residencial Horizontal — Condomínio de Casas · 0 empreend. · 6.055 lançada · 1.045 final` | **zero empreendimentos com 6.055 unidades.** São loteamentos, e o rótulo que troquei os apresenta como condomínio de casas |
| 19, 20 | `Condomínio de Casas` vendendo 224 / 389 / 126 / 286 / 82 unidades | não existe **nenhum** condomínio de casas aceito em Jundiaí |
| 21–24 | linha amarela `Cond. de Casas` com série cheia, incluindo **−26** no 3T2025 | idem, e com valor negativo visível |
| 48 | "oferta final de **2.459** unidades, sendo 1.414 no vertical; **não há Condomínio de Casas elegível**" | as duas metades da frase se contradizem: 1.045 unidades sem dono |
| 49 | "O padrão com maior oferta final é **Loteamento Fechado**" | **JG-36 literalmente violado** — é a palavra que Juliana mandou excluir |

**Agravante que eu introduzi:** ao renomear `Residencial Horizontal` para `Condomínio de Casas`
(JG-05/JG-20), o dado de loteamento passou a se apresentar com o nome do universo aceito. Antes era
um número errado com rótulo genérico; agora é um número errado com rótulo específico. Nas páginas
alimentadas pelo cubo a troca está correta; nas alimentadas pelo contrato temporal, ela piorou.

**Prova isolada:** com um cubo que recusa o loteamento e um contrato temporal contendo
`group: 'Loteamento Fechado'`, `MarketSummarySlide` publica as unidades do loteamento sob o rótulo
`Condomínio de Casas`. Reproduzível em teste.

### P2 — Os números não fecham entre páginas · JG-38 no espírito

| Métrica | Páginas do cubo | Páginas do contrato temporal |
|---|---:|---:|
| Nº de empreendimentos | **109** (29, 46) | **45** (27) |
| Oferta lançada | **22.561** (29, 46) | **16.642** (27, 48) |
| Disponibilidade s/ O.L. | **6,3%** (29, 46) | **14,8%** (27, 48) |
| IVV do fechamento | **20,9%** (25) | **22,9%** (48) |

Juliana escreveu "preços não batem com os dados apresentados". Isto é a mesma classe de problema,
agora medida: o relatório apresenta dois universos distintos como se fossem um.

### P3 — Defeitos numéricos pontuais

1. **p25 · vendas líquidas negativas viram IVV negativo.** A faixa `201–250m²` traz `Vendas
   Líquidas = −1`, `(%) = −0,3%` e `IVV = −1,2%`. Um IVV negativo não existe como indicador. A fonte
   pode devolver venda líquida negativa (distrato maior que venda) — o relatório é que não pode
   publicá-la como taxa.
2. **p38 · soma de preço.** A faixa anual imprime `2022 · R$ 17.173/m² R$/m²`, que é a **soma** dos
   quatro trimestres de R$/m². Preço é taxa, não fluxo: somá-lo não significa nada, e o rótulo ainda
   duplica a unidade. O portão transversal da matriz diz explicitamente "taxas e preços não são
   somados".
3. **p19 · variação sem escala.** `▲ 10.010,1%` (de 2,2 para 224,8 R$ mi) é publicado como está.

### P4 — Consistência visual

1. **Caixa `VARIAÇÕES` dos gráficos (12–17, 21–24, 38)** usa a cor da **série**, não do sinal: pinta
   `−66,7%` e `−50%` de verde e não traz ▲/▼. Contradiz a regra semântica adotada em todas as
   tabelas e reintroduz "cor como único sinal", que o portão transversal proíbe.
2. **p38 · rótulos colidem:** `R$ 10.574/mR$ 10.558/m²` sobrepostos no canto superior direito.
3. **p46 · `Total geral` idêntico a `Subtotal vertical`** (109 / 22.561 / 1.414 / 374 / …). Quando o
   vertical é o único segmento, uma das duas linhas é ruído.
4. **p40 · mar de vermelho.** Participação é comparada com a fatia média (100 ÷ nº de linhas), então
   a maioria das células fica "abaixo" e vermelha. Está correto pela regra, mas comunica "ruim" onde
   só há "menor". Participação pede escala sequencial, não divergente.

### P5 — Ambiente

**O mapa não existe no PDF entregue** (53 páginas em vez de 55). Sem `VITE_MAPBOX_ACCESS_TOKEN` no
build, o manifesto suprime divisor e mapa — que é o comportamento correto e o que JG-39 autoriza,
mas o resultado prático é um Panorama **sem a lâmina de localização**. Juliana pediu que o mapa
*carregasse*, não que sumisse.

---

## 3. Plano de ação

Ordem deliberada: P1 antes de tudo, porque as demais correções incidem sobre números que ainda vão
mudar.

### Etapa 1 — Completar o firewall de fontes (P1 e P2)

**Objetivo:** nenhuma página do Panorama Secovi publica número que não tenha nascido do cubo
filtrado, ou declara explicitamente que a métrica é municipal e não segmentável.

1. Derivar do cubo, como já é feito para lançamentos, os consumidores hoje temporais:
   `MarketSummarySlide` (p27), `NarrativeSlide` (p48/49) e as séries de vendas por segmento
   (p19–p24). O cubo já tem `soldUnits`, `finalUnits`, `launchedUnits` e VGV por empreendimento.
2. Para o que **não** for derivável do cubo — IVV municipal e preços médios municipais são taxas
   agregadas pela API, sem abertura por empreendimento — manter o contrato temporal, mas:
   - restringir a leitura ao segmento **Vertical**;
   - nunca rotular o resultado como `Condomínio de Casas`;
   - declarar a fonte e o recorte na própria lâmina.
3. Filtrar `byGroup`/`groupSeries` por rótulo de produto horizontal antes de qualquer consumo
   editorial, reusando `classifyHorizontalLabel`: um grupo cujo rótulo é produto excluído não pode
   virar "padrão" em tabela nem em narrativa.
4. **Teste de regressão obrigatório:** montar o modelo com cubo que recusa o loteamento **e**
   contrato temporal contendo `group: 'Loteamento Fechado'`, e afirmar que nenhuma lâmina publica o
   rótulo nem as unidades correspondentes. É a prova que faltou na entrega anterior — os fixtures
   usavam contratos temporais vazios ou limpos, e por isso o furo passou.
5. Reconciliar as quatro métricas de P2 e falhar o build se divergirem além da tolerância.

### Etapa 2 — Defeitos numéricos (P3)

1. Venda líquida negativa: preservar o valor observado na coluna de vendas (é um fato da fonte),
   mas **não** derivar taxa a partir dele — IVV vira `null`/indisponível quando a base ou o
   numerador é negativo. Teste com venda negativa.
2. Faixa anual do gráfico de preço: trocar soma por **média ponderada do período** e corrigir o
   rótulo duplicado. Generalizar: a faixa anual soma quando a unidade é fluxo (contagem, VGV) e
   pondera quando é taxa (R$/m²).
3. Variação com denominador muito pequeno: manter o valor, mas marcar visualmente como fora de
   escala acima de um limite, para não dominar a leitura.

### Etapa 3 — Consistência visual (P4)

1. Levar a regra de `conditional-format` para a caixa `VARIAÇÕES` dos gráficos: sinal por valor,
   ▲/▼ e texto acessível; a cor da série passa a ser só identificação da linha.
2. Resolver a colisão de rótulos no gráfico de barras.
3. Suprimir `Subtotal vertical` quando ele for idêntico ao `Total geral`.
4. Trocar a referência da participação: escala sequencial pela magnitude, sem julgar acima/abaixo da
   média.

### Etapa 4 — Ambiente (P5)

Configurar `VITE_MAPBOX_ACCESS_TOKEN` no build do Lovable e regerar Jundiaí — o deck deve passar de
53 para 55 páginas, com divisor e mapa. Sem isso, decidir **com a Juliana** se o Panorama sai sem a
lâmina de localização; é decisão de produto, não técnica.

### Etapa 5 — Reverificação

Regerar Jundiaí e Praia Grande e repetir esta comparação página a página, com duas assertivas
automatizadas sobre o deck inteiro, nos três cenários:

- busca textual negativa por `loteamento` — hoje ela existe na spec, mas os fixtures não continham
  loteamento nos contratos temporais, então não exercitava o caminho que falhou;
- reconciliação cruzada das quatro métricas de P2 entre as páginas que as publicam.

---

## 4. Estimativa

| Etapa | Esforço | Risco |
|---|---|---|
| 1 — firewall de fontes | alto — mexe no modelo e em cinco lâminas | alto: muda números que a analista já viu |
| 2 — defeitos numéricos | baixo | baixo |
| 3 — consistência visual | médio | baixo |
| 4 — token do mapa | trivial | nenhum, mas depende de acesso ao deploy |
| 5 — reverificação | médio | — |

**Recomendação:** não levar este PDF à Juliana ainda. As páginas 19, 20, 21–24, 27, 48 e 49
apresentam loteamento como Condomínio de Casas, que é justamente a correção mais repetida do retorno
dela — e o texto da p49 traz a palavra que ela mandou excluir. A Etapa 1 sozinha resolve a maior
parte disso e deve vir antes de qualquer nova rodada de homologação.


---

## 5. Execução — o que foi feito

### Etapa 1 · Firewall de fontes — **concluída**

`report/model.ts` ganhou `firewallTemporalBlock`, aplicado a **todos** os blocos temporais quando o
motor é V3:

- grupos cujo rótulo é produto horizontal fora da política (`Loteamento Fechado`, `Terreno`, …) são
  removidos de `byGroup` e `groupSeries`, reusando `classifyHorizontalLabel`. É o que impedia o
  rótulo de virar "padrão" em tabela e em narrativa;
- a componente horizontal das séries é zerada e o total passa a igualar o vertical: **o contrato
  municipal é lido como Vertical**, e o horizontal do Panorama vem do cubo;
- `model.horizontalSeries` declara se a série horizontal é atribuível — `true` só quando o universo
  aceito é vazio, caso em que zero é o valor verdadeiro e não um zero fabricado.

Páginas reconstruídas sobre o cubo:

| Página | Antes | Depois |
|---|---|---|
| 27 · resumo geral | `0 empreend. · 6.055 lançada · 1.045 final` | `0 · 0 · 0` — zeros verdadeiros, com a fonte declarada no rodapé |
| 48/49 · narrativa | "o padrão com maior oferta final é **Loteamento Fechado**" | "…é **Econômico**", lido de `granular.offerByStandard` |
| 19/20 · vendas | `Condomínio de Casas` vendendo 224 / 389 / 126 / 286 / 82 | `0` em todos os trimestres |
| 21–24 · séries | linha `Cond. de Casas` com loteamento, incluindo −26 | linha zerada; com condomínio aceito, some e o motivo é impresso |

Reconciliação: o resumo geral, a oferta por padrão e o VGV geral passam a publicar os mesmos
empreendimentos, oferta lançada e oferta final — as quatro divergências da §2 desapareceram.

**Teste de regressão** (`__tests__/firewall-fontes.test.tsx`, 10 casos): o fixture **contém**
`Loteamento Fechado` no contrato municipal, que é justamente o caminho que os fixtures anteriores
não exercitavam. Assertivas sobre o deck inteiro montado, não sobre o componente isolado.

### Etapa 2 · Defeitos numéricos — **concluída**

- **IVV com venda negativa:** a venda líquida negativa continua impressa na sua coluna, porque é um
  fato da fonte, mas deixou de gerar taxa. `−1,2%` de IVV virou `—`.
- **Soma de preço:** a faixa anual do gráfico passou a ponderar quando a unidade é taxa e somar
  quando é fluxo. `2022 · R$ 17.173/m² R$/m²` virou `2022 · R$ 6.330/m² · média do ano`, sem a
  unidade duplicada.

### Etapa 3 · Consistência visual — **concluída**

- a caixa `VARIAÇÕES` dos gráficos passou a usar a regra semântica: `−66,7%` não é mais verde, e
  todo valor carrega ▲/▼ e texto acessível. A cor da série voltou a ser só identificação da linha;
- rótulos do gráfico de barras ficaram compactos (`8.378` em vez de `R$ 8.378/m²`), acabando com a
  sobreposição — a unidade já está no título e na legenda;
- `Subtotal vertical` deixa de ser criado quando não há horizontal aceito, porque repetiria célula a
  célula o `Total geral`;
- participação deixou de ser comparada com a fatia média: sem referência, a barra comunica
  magnitude. Acabou o mar de vermelho que dizia "ruim" onde só havia "menor".

### Etapa 4 · Token do mapa — **aberta**

Depende de configurar `VITE_MAPBOX_ACCESS_TOKEN` no build do Lovable, fora do alcance daqui. Com o
token, o deck vai de 53 para 55 páginas. Sem ele, o comportamento atual (suprimir divisor e mapa)
é o que JG-39 autoriza, mas o Panorama sai sem a lâmina de localização — **decisão de produto a
tomar com a Juliana.**

### Etapa 5 · Reverificação — **concluída**

Os três cenários foram regerados com o contrato municipal contendo loteamento. Todos passam, com
paridade preservada:

| Cenário | Manifesto | Preview | PDF | PPT |
|---|---:|---:|---:|---:|
| Jundiaí | 55 | 55 | 55 | 55 |
| Praia Grande | 58 | 58 | 58 | 58 |
| Baixada | 61 | 61 | 61 | 61 |

Gates: **182 testes da feature, 318 no repositório**, `tsc --noEmit` limpo, `npm run build`
aprovado.

## 6. O que ainda depende de decisão humana

1. **Token do Mapbox** (Etapa 4) — ou o Panorama sai sem mapa.
2. **Regerar Jundiaí no ambiente real** e reconferir: as correções foram validadas com API
   interceptada; o PDF que a Juliana vai ver precisa vir de uma geração autenticada.
3. **Falha de `group_by=Padrão`** nos contratos municipais, medida nas três coletas autenticadas e
   ainda não diagnosticada — pergunta aberta para a manutenção da API.
