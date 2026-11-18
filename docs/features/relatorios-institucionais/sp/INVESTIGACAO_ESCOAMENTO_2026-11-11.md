# SP — por que o escoamento diverge

Investigação solicitada por Lucas em 11/11/2026. Nenhuma fórmula de produção alterada. Os números abaixo pertencem aos dois artefatos fornecidos; não são uma nova extração da API.

## Conclusão e grau de certeza

O sistema calcula meses corretamente para a regra implementada: estoque final dividido pela média mensal de vendas da janela selecionada. Em 2T2026, a janela tem três meses. Essa regra foi implementada como critério candidato em 29/10, com metodologia ainda pendente de homologação — não foi comprovada como reprodução da regra do analista.

No original há evidência numérica direta de média móvel de **12 meses**: Econômico/MCMV, Compacto, Standard e mercado reproduzem os decimais do gráfico com valores encontrados nas planilhas de apoio embutidas. Alto também reproduz combinando os três trimestres anteriores do original com as 158 vendas atuais observadas na auditoria do gerado. A planilha do gráfico de escoamento contém valores colados, sem fórmulas; a cadeia nominal por empreendimento ainda não foi recuperada.

Há três diferenças independentes: janela/ritmo de vendas, dados das extrações e arredondamento. Não é conversão de trimestres para meses; ambos os desenhos estão em meses.

## Fontes efetivamente consultadas

- [Original SP junho/2T2026 no Drive](https://drive.google.com/file/d/1WhyrfFEoFeA9dam9w_F8CYWm8y1VotMB/view): metadados e conteúdo original consultados. 36.846.886 bytes, modificado em 13/08/2026. A cópia local recuperada do RAR tem SHA256 `1350f82cb1d9386487ca1a9aee110fb19cf3d6ea7cb40d4a0205025802d9939b`, igual ao catálogo do handoff. Não foi calculado um novo hash dos bytes baixados do Drive nesta investigação.
- Slides originais 32–35 (vendas trimestrais/móveis), 46 (oferta/escoamento), 69 (estoque por padrão) e Excel `ppt/embeddings/Planilha_do_Microsoft_Excel32.xlsx`, ligado ao gráfico de escoamento. Valores do Excel conferem com o cache do gráfico; nenhuma fórmula encontrada nessa planilha.
- PPTX gerado/anotado de Lucas: auditoria customXml da geração de 05/11/2026 às 19:22:37.971Z. SHA256 `6e9eaa58d7a91dfa909f3faec4a5cfb4d3dc7b114cd19cbdba18bca843403832`.
- [SP maio no Drive](https://drive.google.com/file/d/1j6YrCJi9yVQpdnmdq4bJTdbH9eDXintW/view): texto lido; também identifica escoamento em meses, sem declarar ali a janela do denominador.
- [QA GeoBrain](https://docs.google.com/spreadsheets/d/1lRL86Yr5E24iAm1XtAXrSIFpXZx0Nx-551cdLGaSBck/edit): orienta exportar a visão do mapa por tipologia e calcular velocidade atual; não especifica janela de 3 ou 12 meses e não constitui memória de cálculo do slide SP. Busca por escoamento no Drive e leitura dos feedbacks não localizaram a fórmula original do slide nem a base nominal por padrão.
- [Publicação Brain/CBIC de 2T2026](https://www.brain.srv.br/conteudos/post/vendas-crescem-e-minha-casa-minha-vida-amplia-participacao-no-mercado-imobiliario-no-2o-trimestre-de-2026): declara média dos últimos 12 meses para o indicador nacional. Corrobora a existência dessa metodologia na Brain, mas não homologa automaticamente o relatório municipal SP.
- Código: `stock-series.ts::spSellout` e `SpMarketSlide.tsx`; critérios e ressalvas em EVIDENCIAS e auditoria de 05/11. Dados brutos e credenciais permanecem fora do Git.

## Alto: explicação dos 42 contra 14

Sistema: estoque **2.205**, vendas **158 no trimestre**, média **52,67/mês**. `2.205 / (158 / 3) = 41,8671`, exibido como **42** por arredondamento para cima.

Original: estoque **2.201**, valor nativo do escoamento **14,177134**, exibido como **14**. A planilha de apoio Excel24 contém **707, 500 e 498** vendas nos três trimestres anteriores, na linha legada Luxo correspondente ao Alto atual. Somando as **158** vendas do trimestre atual observadas na auditoria do sistema, obtêm-se **1.863** em 12 meses: `2.201 / (1.863 / 12) = 14,1771336554`, igual ao original na precisão armazenada. Portanto há reprodução com dados observados, além da inversão algébrica. Limite: a célula atual dessa planilha de apoio ainda guarda **190**, não 158; o original contém versões diferentes dos dados dentro de um mesmo arquivo.

O estoque só difere em quatro unidades; substituí-lo sozinho produz 41,79 meses com as vendas do sistema. A discrepância vem essencialmente do denominador: média anual 155,25/mês contra média trimestral 52,67/mês. A comprovação por empreendimento ainda exige a base usada pelo analista, com competência, filtros e classificação. A proximidade de 42 com três vezes 14 não autoriza dividir o indicador por três: `2.205 / 158` mede trimestres quando 158 são vendas trimestrais.

## Prova da janela de 12 meses e limite dessa prova

No original, vendas MCMV dos quatro últimos trimestres: **22.590 + 29.225 + 25.557 + 29.065 = 106.437**. O slide de acumulado móvel também contém 106.437. Estoque Econômico: **62.520**.

`62.520 / (106.437 / 12) = 7,04867668198`, igual ao valor do gráfico original **7,0486767** na precisão armazenada. Usar apenas o trimestre daria **6,4531**, portanto não reproduziria o original.

O mercado geral exibido tem **118.362** de estoque e **160.142** vendas móveis: a conta daria **8,8692785**, não os **8,8347889** guardados no gráfico. A inspeção adicional das 51 planilhas embutidas encontrou a origem dessa diferença: na Excel34, os estoques da coluna de apoio M11:M17 somam **117.767**; na Excel24, C21 guarda **42.092** vendas atuais, contra 42.275 do gráfico principal. Somadas aos três trimestres anteriores (36.052 + 42.175 + 39.640), dão **159.959** vendas móveis.

`117.767 / (159.959 / 12) = 8,83478891466`: reproduz o escoamento original. Logo, o indicador usa números de apoio diferentes dos totais finais exibidos, ambos existentes no próprio PPTX. Isso comprova a coexistência de versões; a causa operacional dessa diferença não está documentada.

Também reproduzidos integralmente com dados das planilhas originais:

| Item | Estoque de apoio | Vendas móveis de apoio | Meses recalculados / cache original |
|---|---:|---:|---:|
| Compacto | 20.753 | 23.735 | 10,492353065 / 10,492353 |
| Standard | 20.025 | 17.548 | 13,693868247 / 13,693868 |
| Econômico | 62.520 | 106.437 | 7,048676682 / 7,0486767 |
| Mercado | 117.767 | 159.959 | 8,834788915 / 8,8347889 |

Compacto e Standard usam estoque da Excel34, coluna M; vendas móveis = 3T2025 + 4T2025 da Excel24, colunas J/K, mais o primeiro semestre de 2026 da Excel22, coluna H. Os estoques de 21.060 e 20.313 na tabela final são outros valores. Portanto, a inversão com a tabela final gera falsos denominadores fracionários. Para Médio/Médio-Alto e Alto/Luxo há diferenças pequenas entre distribuições das planilhas de apoio e do escoamento; não declarar conciliação individual completa nem explicar isso como revisão/distrato/reclassificação sem evidência nominal.

## Todos os padrões

| Padrão | Estoque sistema / original | Média mensal sistema | Média mensal implícita no original | Meses sistema / original, exibidos |
|---|---:|---:|---:|---:|
| Luxo | 2.411 / 2.302 | 128,00 | 156,58 | 19 / 15 |
| Alto | 2.205 / 2.201 | 52,67 | 155,25 | 42 / 14 |
| Médio-Alto | 2.403 / 2.371 | 171,67 | 226,33 | 14 / 10 |
| Médio | 7.774 / 7.595 | 536,67 | 481,75 | 15 / 16 |
| Standard | 21.740 / 20.313 | 1.296,67 | 1.483,36 | 17 / 14 |
| Econômico | 68.986 / 62.520 | 8.814,33 | 8.869,75 | 8 / 7 |
| Compacto | 22.321 / 21.060 | 1.886,00 | 2.007,18 | 12 / 10 |
| Mercado | 127.840 / 118.362 | 12.886,00 | 13.397,26 | 10 / 9 |

As médias originais nesta tabela são inversões algébricas com o estoque da **tabela final**; não representam a base efetiva em Compacto, Standard e mercado, identificada acima. Original arredonda ao inteiro mais próximo; sistema usa teto. Exemplo: Médio-Alto original 10,4757 → 10; com teto seria 11. O arredondamento explica parcelas pequenas, nunca 42 → 14.

## Retomada

1. Reconciliar os 12 meses encerrados em junho/2026 por padrão, com estoque da mesma competência e classificação, preservando a distinção entre fonte municipal e detalhamento por tipologia. Não trocar fontes só porque o total municipal coincide.
2. Obter a memória/base nominal do analista para resolver as distribuições individuais restantes e identificar qual atualização gerou cada versão. As fontes embutidas já reproduzem Econômico, Compacto, Standard, total e Alto (este último com a contagem atual da auditoria do sistema); não contêm a trilha por empreendimento nem a fórmula original do escoamento.
3. Proposta candidata: estoque do fechamento dividido pela média mensal dos últimos 12 meses, independente de relatório mensal/trimestral, e arredondamento igual ao original. Somente implementar após fechar contrato e cobertura; não preencher ausência com zero nem fixar 14/9 manualmente.

Conferência reproduzível: `scripts/diagnostics/sp-reference-sellout-audit.py --manual <original.pptx> --generated <anotado.pptx> --out <json>`. Resultado versionado em `CONFERENCIA_ESCOAMENTO_ARTEFATOS_2026-11-11.json`, com hashes, valores exatos, comparação Excel/cache e asserções dos acumulados e do caso Econômico. Sem nova consulta GeoBrain, coleta longa, geração real, publicação, mensagem ao analista ou escrita no Monday.
