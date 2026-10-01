# Evidência — segunda revisão da Juliana, FIERGS 2T2026

**Fonte:** PPTX `assets/panorama-fiergs-rs-2T2026.pptx` e snapshot de leitura da GeoBrain em 01/10/2026, 14h55 BRT (`.tmp/fiergs-second-review-probe.json`, gerado por `.tmp/fiergs-second-review-probe.ts`). O snapshot diagnóstico é local e não contém credenciais; a API é mutável e deve ser consultada novamente antes do PDF de homologação. **Estado:** G0 aprovado; implementação G1–G3 verificada por testes, aguardando conferência dos novos arquivos exportados e decisões externas G4.

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

**Implementação local G1:** `buildGranularBlocks` mantém as dimensões integrais para reconciliar vendas/estoque e acrescenta `launchWindow` derivado do mesmo cubo, sem exceções de trimestre. Os slides 36–37, 54–56 e 64 passam a usar contagem/lançamentos da janela e oferta final de fechamento, com legenda dos dois universos; disponibilidade global misturada é omitida. O slide 63 permanece uma fotografia horizontal histórica, conforme a própria solicitação de usar sua estrutura no 61; a decisão de mudar esse universo fica para a Juliana. A guarda de exportação verifica separadamente padrões, tipologias, maturidade e coortes da janela. O slide 61 foi substituído por fotografia dos três produtos horizontais, sem confundir histórico com janela. O resumo global, quando exibido em outras páginas, continua explicitamente histórico e não é usado como total de lançamentos da janela. `tsc --noEmit` e testes da feature passaram. **Limite:** a aceitação editorial do universo horizontal histórico e da média do 61 ainda depende da Juliana.

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

**Implementação local G2:** nos slides 51–52, cada R$/m² por tipologia consome o mesmo fechamento temporal de 44–47; o total de R$/m² consome a evolução geral, não uma recomposição dos grupos com cobertura diferente. Ticket e área permanecem granulares, e a legenda explicita a distinção entre fontes. Sem linha temporal observada, o valor aparece como ausente; não há fallback silencioso para o número granular discrepante. Nos slides 65–66, o agregado `Média Loteamentos` usa apenas lotes abertos e fechados; a linha de Condomínio de Casas continua individual, mas não entra no denominador. A escolha da fonte temporal como referência para comparar os slides é técnica/provisória até aceite de Juliana.

## G3 — composição, numeração e pendências editoriais

- O slide oficial 41 só entra no manifesto quando uma matriz anual por área trouxer linhas e total completos; o contrato atual não a oferece, então a página não é exportada. A fonte trimestral não é reaproveitada como anual.
- Os slides oficiais 59–60 saíram do manifesto de preview, PDF e PPT. Os IDs oficiais remanescentes seguem no modelo; a página visível é renumerada de 1 a 72 (ou 73, se houver fonte anual completa).
- O antigo 61 foi substituído por três produtos horizontais, sem padrão. Quantidade de empreendimentos, lançada e final são derivadas do cubo. A coluna “Média” fica `—` com nota de pendência até Juliana especificar o indicador; não é considerada homologada.
- O slide 4 mantém temporariamente o asset antigo com “22 anos” até Juliana enviar a arte vigente; **não enviar essa versão como institucionalmente final**.

## G5 — verificações locais

- `vitest run src/features/panorama-secovi-fiergs`: **32 arquivos, 264 testes aprovados** após as alterações principais; três arquivos focais, **51 testes**, passaram depois da nomenclatura final de `Média Loteamentos`.
- `tsc --noEmit -p tsconfig.app.json`: aprovado. `vite build`: aprovado. Avisos já conhecidos: Browserslist desatualizado, chunks grandes e medidas zero do Recharts em JSDOM.
- A bancada `.tmp/fiergs-second-review-export.spec.ts` passou em **11,8 minutos** no app local autenticado. Gerou, em `.tmp/fiergs-second-review-regression/`, `panorama-fiergs-rs-2T2026.pdf` (72 páginas, 12,4 MB), `panorama-fiergs-rs-4T2025.pdf` (72 páginas, 12,3 MB), CSV de auditoria, capturas de oferta/preços/horizontal e transcrição do preview de ambos os recortes. Os dois PDFs são rasterizados e não possuem camada de texto extraível; por isso a leitura numérica usa capturas, transcrição do preview e CSV.
- Auditoria real: **39 verificações em cada período, nenhuma divergência crítica**. As cinco guardas de lançamentos por padrão, tipologia, maturidade e coorte horizontal têm delta zero em ambos. No preview 2T2026, oferta lançada vertical na janela **16.110**/134 empreendimentos e final vertical **5.414**; em 4T2025, **14.644**/120 e final **6.018**. A mutação do Nápoles explica a diferença ante os valores do PPTX enviado.
- Capturas inspecionadas: quadro de R$/m² de 2T2026 em `2T2026-precos.png`, quadro horizontal em `2T2026-horizontal.png` e preço 4T2025 em `4T2025-precos.png`. Não há página anual indisponível, nem as antigas 59–60. A captura do slide 61 mostra explicitamente a média pendente, sem número inventado.
- **Limite de correspondência de artefato:** após a exportação, a legenda explicativa de preço foi refinada para distinguir o total geral reconciliado das médias tipológicas temporais; isso muda apenas texto, não indicadores. Os PDFs locais comprovam os cálculos, a paginação e a renderização anteriores a essa última redação. Regenerar o arquivo publicado após sincronização para conferir o texto final e solicitar o aceite da Juliana.

## Pendências externas e de publicação

- Slide 4: solicitar à Juliana o material institucional atualizado para 23 anos; não substituir a imagem por conta própria.
- Slide 61: confirmar qual “média” ela deseja no novo consolidado horizontal (R$/m², ticket ou outra), se o material de referência não a desambiguar.
- API mutável: repetir captura e reconciliação no momento da geração do estudo; distinguir regressão de código de alteração de origem.
- GitHub indisponível no início da sessão; referências locais indicavam divergência `origin/main...main` de 11 atrás/10 à frente. Nenhum merge ou push autorizado.
