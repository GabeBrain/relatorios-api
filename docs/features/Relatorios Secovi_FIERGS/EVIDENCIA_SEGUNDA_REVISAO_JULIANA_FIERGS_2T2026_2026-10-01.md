# Evidência — segunda revisão da Juliana, FIERGS 2T2026

**Fonte:** PPTX `assets/panorama-fiergs-rs-2T2026.pptx` e snapshot de leitura da GeoBrain em 01/10/2026, 14h55 BRT (`.tmp/fiergs-second-review-probe.json`, gerado por `.tmp/fiergs-second-review-probe.ts`). O snapshot diagnóstico é local e não contém credenciais; a API é mutável e deve ser consultada novamente antes do PDF de homologação. **Estado:** G0 aprovado; G1/G2 em investigação nesta seção.

## G0 — baseline e escopo

- O PPTX contém 75 slides. Juliana anotou 4, 36, 37, 41, 51, 52, 54, 55, 56, 59, 60, 61, 64, 65 e 66.
- Escopo da leitura: dez cidades do preset FIERGS, 1T2023–2T2026, empreendimentos `Ativo` e `Esgotado`, fonte `building-with-history-internal` e `temporal-analysis-city`.
- O código anterior calcula 36–37 e 54–56 com `verticalOfferCube = cube` em `report/model.ts`. Portanto, a oferta lançada exibida nesses quadros é a soma histórica dos empreendimentos que ainda pertencem à fotografia de fechamento, não a coorte lançada no intervalo solicitado.

## G1 — reconciliação da Oferta Lançada, antes de alterar código

| Cidade | Projetos verticais históricos | Lançadas históricas | Projetos lançados na janela | Lançadas na janela | Oferta final vertical | Lançadas horizontais históricas | Lançadas horizontais na janela |
|---|---:|---:|---:|---:|---:|---:|---:|
| Alvorada | 24 | 925 | 13 | 760 | 188 | 294 | 294 |
| Cachoeirinha | 44 | 3.438 | 8 | 1.052 | 17 | 2.900 | 543 |
| Canoas | 150 | 20.744 | 40 | 4.870 | 1.645 | 3.110 | 722 |
| Eldorado do Sul | 4 | 22 | 0 | 0 | 2 | 3.953 | 307 |
| Esteio | 19 | 1.882 | 3 | 468 | 121 | 60 | 0 |
| Gravataí | 73 | 7.238 | 12 | 1.583 | 321 | 6.524 | 2.063 |
| Guaíba | 13 | 1.575 | 1 | 80 | 33 | 4.292 | 1.923 |
| Novo Hamburgo | 98 | 9.274 | 37 | 3.619 | 1.327 | 896 | 166 |
| São Leopoldo | 64 | 6.053 | 13 | 1.739 | 692 | 3.059 | 276 |
| Viamão | 30 | 3.770 | 7 | 1.939 | 1.068 | 5.388 | 2.108 |
| **Total 2T2026 atual** | **519** | **54.921** | **134** | **16.110** | **5.414** | **30.476** | **8.402** |

**Fato confirmado:** no snapshot anterior, o vertical era 54.761 lançadas/5.251 finais e a janela tinha 15.950 lançadas. O novo snapshot mostra o empreendimento **Nápoles, Canoas, lançado em 2T2025** alterado de **86 para 246 lançadas** e de **12 para 175 finais**. Isso explica exatamente +160 lançadas (tanto no histórico quanto na janela) e +163 finais. A contagem de projetos permanece 519/134. É uma mudança da fonte, não uma correção do código; nenhum desses valores deve ser fixado no runtime.

**Regressão 4T2025 no snapshot atual:** vertical histórico 505/53.455/6.018; coorte 1T2023–4T2025 120/14.644; horizontal histórico 121/28.413/2.840; horizontal na janela 31/6.339. As diferenças ante o snapshot anterior decorrem do mesmo Nápoles (+160/+163). Projetos e oferta final do fechamento pertencem à fotografia do trimestre; lançamentos no intervalo são outro universo.

**Residual tipológico:** o projeto Residencial Santa Bárbara, Cachoeirinha, 3T2022, tem 63 unidades históricas sem abertura tipológica. Ele está fora da janela e não deve surgir em **lançamentos da janela**. Uma falta tipológica em empreendimento lançado dentro da janela continua exigindo linha residual auditável; não existe autorização para esconder `Não classificado` globalmente.

## G2 — reconciliação da divergência de preço, antes de alterar código

A série temporal dos slides 44–47 vem de `temporal-analysis-city/medium-prices-meter?group_by=Tipologia`, ponderada no modelo pelo estoque municipal correspondente de `temporal-analysis-city/stock`. Os quadros/gráficos 51–52 vêm de `building-with-history-internal` via `pricesByTypology`, ponderados por estoque final das linhas tipológicas (com fallback para unidades lançadas). São **duas fontes/métodos diferentes**, mesmo quando a tipologia e o trimestre são iguais.

| Tipologia | Série temporal no fechamento 2T2026, novo snapshot (R$/m²) | Quadro granular, novo snapshot (R$/m²) | Estoque temporal usado como peso |
|---|---:|---:|---:|
| 1 dormitório | 11.383 | 11.869 | 623 |
| 2 dormitórios | 6.051 | 5.530 | 4.379 |
| 3 dormitórios | 9.342 | 9.053 | 410 |
| 4 ou mais | 9.469 | 7.402 | 2 |

**Prova de que não é apenas ponderação entre cidades:** Canoas, 2 dormitórios, retorna **6.674** pela fonte temporal e **6.037** pela média das linhas granulares do mesmo município; Novo Hamburgo, 1 dormitório, retorna **14.389** contra **15.858**. Há divergência já **dentro** da cidade. O snapshot diagnóstico armazena município, projeto, tipologia, trimestre, preço e peso para auditoria detalhada, sem inserir valores de referência no runtime.

**Decisão metodológica ainda não homologada:** equiparar tabelas 51–52 à série aprovada pela Juliana ou distinguir explicitamente dois indicadores exige escolha da fonte canônica. A série temporal municipal é a opção mais coerente para obter paridade com 44–47, mas não se deve chamar preço, ticket e área granulares de um conjunto único caso só o R$/m² seja temporal. Confirmar com Juliana se a auditoria do relatório novo não resolver a intenção. Até lá, não declarar o preço homologado.

## Pendências externas e de publicação

- Slide 4: solicitar à Juliana o material institucional atualizado para 23 anos; não substituir a imagem por conta própria.
- Slide 61: confirmar qual “média” ela deseja no novo consolidado horizontal (R$/m², ticket ou outra), se o material de referência não a desambiguar.
- API mutável: repetir captura e reconciliação no momento da geração do estudo; distinguir regressão de código de alteração de origem.
- GitHub indisponível no início da sessão; referências locais indicavam divergência `origin/main...main` de 11 atrás/10 à frente. Nenhum merge ou push autorizado.
