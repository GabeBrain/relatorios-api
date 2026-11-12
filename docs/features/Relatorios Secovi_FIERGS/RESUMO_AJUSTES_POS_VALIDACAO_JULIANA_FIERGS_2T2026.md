# Resumo dos ajustes pós-validação — Panorama FIERGS 2T2026

> Atualização de 02/10/2026: no PDF `(6)`, os dados e a arte institucional de 23 anos parecem coerentes com os ajustes finos aceitos pela Juliana. A revisão identificou uma página de oferta repetida, uma contagem editorial desatualizada e categorias sem R$/m² no gráfico por padrão. O código agora remove a repetição, calcula a contagem de páginas dinamicamente e omite somente as categorias sem preço observado, registrando-as nos Avisos e na auditoria. Os Avisos ficam em aba própria, entre Relatório e Metodologia. Esta atualização ainda requer nova exportação autenticada antes do reenvio.

**Data:** 01/10/2026
**Recorte validado:** Alvorada, Cachoeirinha, Canoas, Eldorado do Sul, Esteio, Gravataí, Guaíba, Novo Hamburgo, São Leopoldo e Viamão  
**Período:** 1T2023 a 2T2026  
**Material de origem:** PowerPoint comentado enviado pela Juliana e e-mail de validação

**Regressão adicional:** FIERGS 4T2025, usada para garantir que as correções não dependam de números ou períodos fixos

## 1. Contexto recebido

No e-mail, Juliana informou que a parte inicial de lançamentos e vendas estava adequada de modo geral, mas destacou dois problemas centrais:

1. as vendas apresentadas em diferentes lâminas não fechavam entre si;
2. na análise do mercado atual, os estoques/oferta final também não fechavam.

As anotações no PowerPoint complementaram esse diagnóstico com solicitações de comparativos temporais, ajustes de nomenclatura, percentuais, rótulos, legendas, mapas e revisão do universo horizontal.

## 2. Resumo executivo do que foi corrigido

- As vendas verticais passaram a usar um único fechamento canônico de **1.091 unidades**.
- A oferta final vertical passou a usar uma única fotografia de fechamento de **5.251 unidades**.
- Padrão, tipologia, cidade e área agora fecham contra o mesmo total de vendas.
- Padrão, tipologia, área, metragem e preço agora fecham contra o mesmo total de estoque.
- Condomínios de chácaras foram excluídos transversalmente do universo FIERGS.
- Produto horizontal e coorte horizontal passaram a fechar em **129 empreendimentos, 30.476 unidades lançadas e 3.365 unidades finais**.
- Comparativos semestrais, de trimestre equivalente e de 12 meses foram incorporados.
- Comparativos contextuais agora mudam conforme o fechamento: 1T, primeiro semestre, nove meses ou ano completo.
- Percentuais, nomenclaturas, rótulos, margens, legendas e mapas foram revisados.
- O caso 4T2025 passou a reconciliar **1.524 vendas verticais**, **5.855 unidades de oferta final** e o horizontal em **121 / 28.413 / 2.840**.
- Os mapas foram comprovados por chave única: **626 empreendimentos** em 4T2025 e **648** em 2T2026.
- A exportação agora é protegida por **32 invariantes críticas** em PDF e PowerPoint.
- O manifesto oficial tem 75 lâminas de referência; a exportação ativa omite repetições editoriais e páginas sem dados, com contagem dinâmica. A nova geração visual dos dois períodos integra a etapa final de homologação.

## 3. Apontamentos, correções e comportamento esperado

### 3.1 Vendas não fechavam entre as lâminas

**O que estava fora**

O arquivo recebido apresentava quatro totais concorrentes para vendas verticais no 2T2026:

- padrão: **1.137**;
- tipologia: **1.138**;
- área útil/IVV: **1.091**;
- cidade: **2.317**.

As diferenças vinham do uso de fontes e universos distintos. O total municipal de 2.317 misturava 1.137 vendas verticais com 1.180 horizontais. A base granular apresentava o fechamento vertical auditável de 1.091. Também havia repetição de fotografias mensais e tratamento inconsistente de um distrato.

**O que foi feito**

- Foi definida a última fotografia granular por empreendimento e tipologia como fonte canônica do fechamento vertical.
- O slide por cidade deixou de somar o segmento horizontal sob um título vertical.
- Padrão e tipologia passaram a receber o mesmo fechamento reconciliado.
- O distrato de `−1` unidade em quatro dormitórios foi preservado, sem ser descartado.
- Foram adicionadas guardas que bloqueiam a exportação se qualquer uma das quatro dimensões divergir.

**Novo comportamento esperado**

Os slides de vendas por padrão, tipologia, cidade e área devem apresentar total de **1.091 unidades**, sempre com delta zero entre as dimensões.

### 3.2 Oferta final/estoque não fechava

**O que estava fora**

O arquivo apresentava três totais de estoque vertical:

- série temporal: **5.459**;
- algumas dimensões por tipologia/padrão: **4.562**;
- área, metragem e demais blocos granulares: **5.251**.

A série temporal acumulava fotografias mensais que não deveriam ser somadas, enquanto o caminho dimensional antigo deixava parte das unidades fora.

**O que foi feito**

- A oferta final passou a usar a última fotografia granular válida por empreendimento/tipologia.
- Padrão, tipologia e área foram reconciliados contra o mesmo total.
- Os slides de área, tipologia, metragem e faixa de preço passaram a compartilhar esse universo.
- A exportação é bloqueada se as dimensões críticas não fecharem.

**Novo comportamento esperado**

Todos os blocos de mercado atual devem fechar em **5.251 unidades de oferta final vertical**.

### 3.3 Inclusão das variações solicitadas

**O que estava fora**

Os slides 11, 14, 22, 26 e 33 não apresentavam o mesmo padrão de comparação temporal usado como referência no slide 9.

**O que foi feito**

- Foi criada uma regra única de comparação entre períodos equivalentes.
- As variações passaram a indicar claramente os períodos comparados e o percentual calculado.
- Denominador zero e período ausente são exibidos como indisponíveis, nunca como zero ou infinito.

**Novo comportamento esperado**

Os slides indicados mostram comparações equivalentes, como `2T2025 × 2T2026`, com variação rastreável e tratamento seguro de dados ausentes.

### 3.4 Comparativo por semestre

**O que estava fora**

Os slides 15, 16, 27, 28, 35 e 39 não traziam a leitura do primeiro semestre atual contra o primeiro semestre anterior.

**O que foi feito**

- Foi incorporado o comparativo `1S2025 × 1S2026`.
- Para indicadores de fluxo, o semestre corresponde à soma de 1T e 2T.
- Para estoque e IVV, o semestre usa a fotografia do fechamento do 2T, sem somar snapshots.
- O acumulado móvel de 12 meses continua identificado como 12 meses; ele não é renomeado como semestre.

**Novo comportamento esperado**

Os seis slides exibem uma comparação semestral metodologicamente consistente, separada da leitura de 12 meses.

### 3.5 Percentuais fechavam em 99,9%

**O que estava fora**

Nos slides 25 e 30, o arredondamento independente das categorias fazia a soma visual resultar em 99,9%.

**O que foi feito**

Foi implementado um rateio determinístico do resíduo de décimos. O ajuste atua somente no percentual apresentado e não altera valores absolutos ou totais da fonte.

**Novo comportamento esperado**

As participações publicadas fecham visualmente em **100,0%**, inclusive quando existe distrato negativo.

### 3.6 Nomenclatura de dormitórios

**O que estava fora**

O slide 29 exibia categorias numéricas ou grafias inconsistentes, como `2`, sem explicitar que se tratava de dormitórios.

**O que foi feito**

As grafias foram canonizadas para:

- 1 Dormitório;
- 2 Dormitórios;
- 3 Dormitórios;
- 4 ou + Dormitórios.

**Novo comportamento esperado**

As tipologias são exibidas com nomenclatura completa e consistente em todas as lâminas relacionadas.

### 3.7 Legenda e margens no ranking por cidade

**O que estava fora**

No slide 31, a legenda/marcação disputava espaço com o gráfico e prejudicava a leitura.

**O que foi feito**

- A legenda redundante foi removida.
- O ranking recebeu margens e espaçamentos específicos.
- Total, barras, valores e participações foram preservados.

**Novo comportamento esperado**

O ranking por cidade é exibido sem sobreposição e fecha em **1.091 unidades**.

### 3.8 Slide anual de IVV por área útil

**O que estava fora**

O slide 41 não deixava claro o método e podia sugerir uma informação anual que a fonte disponível não sustentava.

**O que foi feito**

Foi mantida a posição no relatório com um estado executivo de indisponibilidade. O trimestre de fechamento não é repetido ou multiplicado para simular uma janela anual.

**Novo comportamento esperado**

O slide comunica claramente que o indicador anual por faixa de área está indisponível até existir composição histórica auditável para os quatro trimestres.

### 3.9 Rótulos do gráfico de preço por m²

**O que estava fora**

No slide 43, a quantidade e a posição dos rótulos geravam colisões e dificultavam a leitura.

**O que foi feito**

- Todos os 14 trimestres passaram a exibir valor e, a partir do segundo, variação contra o período anterior.
- Valor e variação foram separados verticalmente e receberam tratamento de contraste.
- Os rótulos do eixo foram compactados; o primeiro trimestre não exibe variação artificial.

**Novo comportamento esperado**

O gráfico apresenta todos os valores trimestrais e suas variações sem colisão crítica, mantendo clara a leitura do fechamento.

### 3.10 Exclusão de condomínios de chácaras

**O que estava fora**

O universo horizontal incluía condomínios de chácaras, embora a orientação fosse desconsiderá-los.

**O que foi feito**

- As diferentes grafias de chácaras passaram a ser rejeitadas na entrada temporal e granular.
- O filtro foi aplicado antes das agregações, afetando produto, coorte, preço e totais.

**Novo comportamento esperado**

Nenhum condomínio de chácaras aparece nos números ou derivados do Panorama FIERGS. A guarda final confirmou **zero** projetos desse tipo no runtime.

### 3.11 Produto horizontal e coorte não fechavam

**O que estava fora**

Na validação integrada, o produto horizontal usava o universo completo, mas a coorte era cortada em 1T2023, eliminando a linha `Até 2022`. Isso produzia:

- produto completo: **129 / 30.476 / 3.365**;
- coorte cortada: **39 / 8.402 / 2.482**.

**O que foi feito**

As lâminas horizontais de fotografia e coorte passaram a usar o cubo ativo completo. A janela `1T2023–2T2026` continua válida para séries temporais, mas não elimina empreendimentos anteriores da fotografia de mercado.

**Novo comportamento esperado**

Produto e coorte fecham em **129 empreendimentos, 30.476 unidades lançadas e 3.365 unidades finais**, incluindo a faixa `Até 2022`.

### 3.12 Média dos loteamentos

**O que estava fora**

A média podia incorporar casas/sobrados ou chácaras, alterando o conceito solicitado.

**O que foi feito**

A linha `Média dos loteamentos` passou a considerar somente loteamentos abertos e fechados.

**Novo comportamento esperado**

Casas/sobrados e chácaras não participam da média dos loteamentos.

### 3.13 Zoom, enquadramento e legendas dos mapas

**O que estava fora**

Os mapas 67–69 apresentavam enquadramento amplo, poucos elementos de leitura e ausência de legendas completas.

**O que foi feito**

- Bounds calculados a partir dos pontos válidos.
- Padding cartográfico e limite de zoom.
- Mosaico limitado para evitar mapas excessivamente grandes.
- Cores por padrão e escalas específicas para estoque e R$/m².
- Coordenadas inválidas continuam fora do mapa.
- Cada marcador passou a usar a chave canônica do empreendimento, impedindo duplicidade por tipologia ou snapshot.
- Os três mapas passaram a compartilhar exatamente a mesma coleção de empreendimentos georreferenciados.

**Novo comportamento esperado**

As dez cidades e os empreendimentos válidos aparecem enquadrados em zoom 9, com legendas correspondentes a padrão, estoque e preço por m². Em 4T2025, `626 = 505 verticais + 121 horizontais`; em 2T2026, `648 = 519 verticais + 129 horizontais`.

### 3.14 Regressão multiperíodo de vendas e estoque

**O que estava fora**

Ao gerar o fechamento 4T2025, reapareceram dois deltas:

- vendas verticais: **1.524 × 1.517**, diferença de 7;
- oferta final vertical: **5.855 × 5.448**, diferença de 407.

O filtro da data inicial dos lançamentos estava sendo aplicado também à fotografia de mercado atual. Assim, empreendimentos lançados antes de 1T2021, mas ainda com vendas ou estoque no fechamento, desapareciam de algumas dimensões.

**O que foi feito**

- Séries de lançamentos continuam respeitando a janela selecionada.
- Vendas, estoque, coorte, maturidade e preço do mercado atual FIERGS passaram a usar a fotografia completa do fechamento.
- As 407 unidades foram decompostas em 22 empreendimentos e 24 linhas tipológicas, sem alteração manual.
- 4T2025 e 2T2026 foram transformados em regressões obrigatórias do mesmo algoritmo.

**Novo comportamento esperado**

No 4T2025, todas as dimensões verticais fecham em **1.524 vendas** e **5.855 unidades finais**. No 2T2026, permanecem reconciliadas em **1.091 vendas** e **5.251 unidades finais**.

### 3.15 Consolidado horizontal multiperíodo

**O que estava fora**

Em 4T2025, produto e coorte apresentavam o universo completo, mas o consolidado mantinha apenas os projetos lançados dentro da janela:

- consolidado cortado: **58 / 11.563 / 2.364**;
- universo completo: **121 / 28.413 / 2.840**.

**O que foi feito**

Os 63 empreendimentos removidos apenas pelo filtro temporal foram identificados por chave. Eles explicam integralmente a diferença de 16.850 unidades lançadas e 476 finais. Produto, coorte, preços e consolidado agora usam o mesmo universo horizontal de fechamento.

**Novo comportamento esperado**

- 4T2025: **121 empreendimentos, 28.413 lançadas e 2.840 finais**;
- 2T2026: **129 empreendimentos, 30.476 lançadas e 3.365 finais**.

### 3.16 Comparativos contextuais conforme o fechamento

**O que estava fora**

A regra anterior ativava o primeiro semestre para qualquer trimestre maior ou igual a 2. Por isso, um relatório encerrado em 4T2025 continuava destacando `1S2024 × 1S2025`.

**O que foi feito**

- 1T compara o trimestre equivalente;
- 2T compara o primeiro semestre;
- 3T compara nove meses;
- 4T compara o ano completo.

Fluxos são acumulados somente quando todos os trimestres existem. Estoque e IVV usam a fotografia do trimestre final. Ausência não vira zero.

**Novo comportamento esperado**

O 4T2025 apresenta `COMPARATIVO ANUAL — 2024 × 2025`; o 2T2026 preserva `COMPARATIVO 1º SEMESTRE — 1S2025 × 1S2026`.

### 3.17 Bloqueio multiperíodo de exportação

**O que foi feito**

A decisão de exportar foi centralizada e passou a ser consultada nos botões, no início do job e imediatamente antes da captura. PDF e PPT são bloqueados diante de qualquer invariante crítica divergente ou indisponível, inclusive se um manifesto trouxer `homologable: true` de forma inconsistente.

**Novo comportamento esperado**

Somente relatórios com todas as 32 invariantes em `match` podem gerar PDF ou PowerPoint. O CSV de auditoria permanece disponível para investigar o bloqueio.

### 3.18 Confirmação visual pós-publicação

O PDF final `panorama-fiergs-rs-2T2026 (2).pdf` foi auditado integralmente após a publicação:

- 75 de 75 páginas íntegras;
- comparativos trimestrais, semestrais e de 12 meses legíveis;
- vendas verticais reconciliadas em 1.091;
- oferta final vertical reconciliada em 5.251;
- oferta lançada vertical fechando em 54.761, com 63 unidades rastreadas em `Não classificado`;
- dez cidades no ranking, inclusive Eldorado do Sul com zero observado;
- 648 empreendimentos preservados em cada mapa;
- nenhuma divergência crítica ou sobreposição bloqueante identificada.

O material está pronto para homologação funcional da Juliana. Permanece apenas a limitação operacional já comunicada: durante a exportação, a aba precisa continuar visível até o download terminar.

## 4. Controles adicionados

Além das correções visíveis, foram incorporados controles para evitar regressões:

- 32 guardas críticas de reconciliação antes da exportação;
- auditoria CSV com fonte, fórmula, universo, período, totais e delta;
- testes de fluxo mensal versus trimestral;
- testes de snapshot de estoque;
- testes de dimensões não classificadas;
- testes de exclusão de chácaras;
- testes de produto versus coorte horizontal;
- testes de percentuais, nomenclaturas, mapas e 75 posições do relatório;
- validação do mesmo manifesto no preview, PDF e PowerPoint.
- revalidação no host imediatamente antes da captura de PDF/PPT;
- regressões autenticadas de 4T2025 e 2T2026;
- deduplicação dos mapas por chave canônica.

## 5. Resultado técnico atual

- **4T2025:** 32 de 32 invariantes críticas aprovadas com delta zero.
- **2T2026:** 32 de 32 invariantes críticas aprovadas com delta zero.
- **Testes FIERGS:** 263 de 263 aprovados.
- **Build de produção:** aprovado.
- **Contrato editorial:** 75 páginas preservadas.
- **TypeScript:** aprovado sem erros no projeto.

## 6. Material técnico preparado para homologação

- código reconciliado e publicado no repositório;
- CSV de auditoria e reconciliação;
- matriz comentário × correção × evidência;
- registro técnico das decisões e dos testes executados.

O PDF pós-publicação de 2T2026 foi gerado e inspecionado integralmente. O PowerPoint e o smoke visual de 4T2025 permanecem como verificações recomendadas de formato/período, sem divergência numérica crítica aberta.

## 7. Situação para encerramento

Não há divergência numérica ou visual crítica aberta no PDF pós-publicação. O material está pronto para o aceite funcional/editorial da Juliana. O slide 41 permanece explicitamente indisponível enquanto não houver uma fonte histórica auditável por faixa de área; isso é uma decisão metodológica, não uma falha de geração.

## 8. Limitação operacional conhecida da exportação

A geração atual de PDF e PowerPoint rasteriza as 75 páginas no navegador. Embora o host de exportação sobreviva à navegação entre telas internas da plataforma, navegadores como o Chrome podem reduzir ou suspender o processamento quando a aba fica oculta. Nessa situação, o avanço das páginas pode pausar e voltar somente quando o usuário retorna à aba.

Até a implementação futura de um worker de exportação no servidor, a orientação operacional é manter a aba do Panorama visível e ativa até o início do download. Essa limitação não altera os cálculos nem o conteúdo do relatório, mas afeta o tempo e a continuidade da geração do arquivo.

## 9. Texto curto sugerido para o anúncio

> Olá, Juliana! Concluímos uma nova rodada de ajustes do Panorama FIERGS com base nas suas observações. Reconciliamos vendas e estoque em todas as dimensões, generalizamos a regra para diferentes fechamentos, alinhamos produto, coorte e consolidado horizontal, adaptamos os comparativos para trimestre, semestre, nove meses ou ano completo e tornamos os mapas auditáveis por empreendimento único. No 2T2026, o relatório fecha em 1.091 vendas verticais, 5.251 unidades finais e 129 empreendimentos horizontais; o 4T2025 também foi validado como regressão, com 1.524 vendas, 5.855 unidades finais e 121 empreendimentos horizontais. PDF e PowerPoint agora só são liberados quando as 32 verificações críticas fecham sem divergência. Seguem os novos arquivos e a auditoria para sua validação visual final.
# Complemento pré-homologação final — 01/10/2026

Após a primeira republicação, a auditoria final identificou 63 unidades lançadas sem abertura tipológica. A origem foi comprovada no empreendimento Residencial Santa Bárbara (`building_id 63001`), em Cachoeirinha: 63 lançadas, nenhuma linha tipológica e estoque/vendas ausentes.

As últimas adaptações foram:

- inclusão derivada do residual em `Não classificado`, sem fixar 63 no runtime;
- guardas sobre as linhas visíveis de lançadas, finais e vendidas, com bloqueio de PDF/PPT;
- distinção entre sobrecobertura negativa e distrato legítimo;
- ranking municipal com as dez cidades, incluindo Eldorado do Sul com zero;
- mapas com enquadramento mais fechado, marcadores menores e separação determinística de coordenadas coincidentes, preservando todas as 648 chaves;
- metadados internos com preset, período, território, motor e build opcional;
- orientação para manter a aba visível durante a captura.

O resultado técnico esperado em 2T2026 é: 1.091 vendas verticais, 54.761 unidades lançadas, 5.251 unidades finais, horizontal `129 / 30.476 / 3.365`, 648 empreendimentos nos mapas e 32 invariantes críticas compatíveis. A regressão 4T2025 permanece em 1.524 vendas, 5.855 finais e horizontal `121 / 28.413 / 2.840`.

O PDF pós-deploy foi inspecionado nas 75 páginas, incluindo as páginas 31, 36, 59 e 67–69. O pacote está liberado para homologação funcional da Juliana; a verificação do PPT continua recomendada caso esse formato também seja entregue.

## Complemento — segunda revisão da Juliana, 01/10/2026

Este complemento **substitui o status de homologação acima**: a segunda revisão apontou Oferta Lançada, preços e mudanças editoriais adicionais. Os números antigos descrevem snapshots anteriores da GeoBrain, não metas fixas do runtime.

- Lançamentos nos slides 36–37, 54–56 e 64 passam a respeitar 1T2023–fechamento, enquanto a oferta final continua sendo a fotografia do mercado atual. O histórico permanece auditável, mas não é apresentado como lançamento da janela. Em 2T2026 a fonte atual retornou 134 empreendimentos/16.110 lançadas/5.414 finais; em 4T2025, 120/14.644/6.018. O empreendimento Nápoles, em Canoas, mudou na origem desde o PPTX enviado (+160 lançadas e +163 finais), explicando os novos totais sem ajuste manual.
- Preço por m² nos slides 51–52 passa a usar a série temporal dos gráficos de evolução por tipologia; a média geral usa a série geral reconciliada. Ticket e área permanecem granulares, com legenda de fontes distintas. Nos 65–66, `Média Loteamentos` exclui Condomínio de Casas.
- A página anual 41 é omitida sem fonte anual completa; 59–60 são removidas. O antigo 61 vira um quadro horizontal com Casas, Loteamento Aberto e Fechado. A coluna de média permanece `—` até Juliana definir qual indicador quer. O material institucional do slide 4 continua pendente de arte atualizada (23 anos).
- Estudos locais 2T2026 e 4T2025 gerados em PDF, 72 páginas cada, com CSV de auditoria: 39 verificações por período e nenhuma divergência crítica. Há capturas e matriz metodológica em `EVIDENCIA_SEGUNDA_REVISAO_JULIANA_FIERGS_2T2026_2026-10-01.md`. Esses estudos são **locais, não publicados**; a última redação da legenda de preço foi refinada após a captura e requer nova exportação publicada.

**Status para próxima comunicação:** correções técnicas verificadas localmente, mas ainda não anunciar homologação final. Pedir a arte institucional vigente, confirmar a média pretendida no 61 e submeter o método de preço temporal à Juliana. Sincronização autorizada após a revisão técnica.

## Complemento pós-publicação — média do quadro horizontal

O PDF `panorama-fiergs-rs-2T2026 (3).pdf` confirmou as correções numéricas e de preço nas páginas inspecionadas, mas ainda exibia “22 anos” na página institucional e “—” na média horizontal. Por decisão editorial do usuário, a coluna passa a mostrar **unidades lançadas por empreendimento** (`oferta lançada histórica ÷ número de empreendimentos`), identificada no próprio quadro. Não é uma média de preço. A versão publicada desse PDF antecede esta alteração; gerar outra após o deploy para conferência da Juliana. O usuário tratará a arte de 23 anos com o marketing; nenhum asset foi alterado.

Na comunicação à Juliana, explicitar que 16.110 lançamentos no snapshot atual, contra 15.950 no arquivo comentado, refletem +160 unidades do empreendimento Nápoles em Canoas na fonte. Pedir novo teste das correções técnicas, sem apresentar a página institucional como final.

## Complemento — ajustes finos recebidos em 02/10/2026

Juliana informou que não identificou novos erros de dados e pediu ajustes finos no PPTX. A disponibilidade no quadro de oferta agora é definida por tipologia/padrão como **estoque final ÷ lançamentos históricos da mesma dimensão**; a coluna de lançamentos continua representando a janela editorial. Não calculamos percentual global porque há 63 lançamentos residuais sem classificação/estoque final atribuível. `4+ dormitórios` preserva o estoque final com zero lançamento na janela.

Os IDs oficiais de maturidade por tipologia e padrão (59–60) e VGV (61) são restaurados. O ID 63 concentra o consolidado horizontal por produto com disponibilidade e média de lançamentos por empreendimento, evitando manter um segundo quadro redundante. A tabela de preços remove somente linhas com ticket, área e R$/m² todos ausentes. Evidência numérica e técnica em `EVIDENCIA_AJUSTES_FINOS_JULIANA_FIERGS_2T2026_2026-10-02.md`.

Foi identificado no CSV um empreendimento vertical sem VGV lançado/final (Residencial Santa Bárbara, Cachoeirinha; 63 unidades lançadas e estoque final não atribuível). Os totais VGV apresentam apenas valores observados, sem imputação, e agora trazem nota de cobertura dinâmica. Valores negativos de vendas líquidas por grupo são preservados com o sinal da fonte e não foram zerados.

Validação final: 32 arquivos/266 testes Vitest aprovados; `npm run build` aprovado; PDFs e PPT espelho de 2T2026 e 4T2025 gerados localmente com 74 páginas/slides cada. Os dois CSVs têm 819 linhas e 39 invariantes críticas em `match`, sem deltas. Páginas 48, 55, 58, 59, 60 e 62 revisadas. Implementação/testes em commit local `a95e039`; a documentação/evidência desta etapa fica em commit separado. Arte institucional de 22 anos segue pendente com marketing. Nenhum push/publicação foi feito; aguarda autorização para sincronização.

## Rodada editorial e metodológica — 02/10/2026

O plano `PLAN_HOMOLOGACAO_FINAL_EDITORIAL_METODOLOGIA_FIERGS_2T2026_2026-10-02.md` foi executado localmente até a integração de manifesto, avisos e novas referências do app. Quatro cópias exatas foram retiradas (IDs oficiais 18, 30, 54 e 55); saídas sem série publicável e colunas monetárias inteiramente sem observação passam a ser omitidas quando o modelo confirma a ausência. O CSV e o painel compartilham códigos; zeros, vendas líquidas negativas, percentuais fora da faixa de referência e divergências não são apagados.

As abas Relatório, Metodologia, Glossário e Fórmulas estão implementadas, com fórmulas e políticas por entidade. Exportação PDF/PPT oculta as notas explicativas; avisos de cobertura ficam no app e na auditoria. A arte institucional permanece pendente até confirmação do Diego.

**Estado de homologação:** evidências G0–G3 registradas; G4 está sob verificação visual e G6 ainda depende da geração autenticada dos PDFs/PPTs e CSVs FIERGS 2T2026 e 4T2025. O navegador local não tinha sessão autenticada, portanto os relatórios atualizados ainda não foram gerados nem aprovados visualmente. Não declarar homologação final. Commits locais desta rodada: `dcc6cc9`, `c5d2474`, `e76345c`; nenhum push.

### Complemento — atualização da arte institucional

Em 02/10/2026, a página “Sobre a Brain” do estudo FIERGS foi substituída pela lâmina correspondente de `Slides-Institucionais-Brain-2026.pptx`: 23 anos de empresa, 1.000 cidades, 9.200 estudos, 50.000 entrevistas anuais e R$ 380 bi em VGV pesquisados. A nova imagem foi conferida em 1920 × 1080. As demais páginas não foram trocadas por não haver uma substituição visual direta confirmada; o deck candidato permanece local e não versionado. Gerar novamente os PDFs/PPTs de 2T2026 e 4T2025 para conferir a incorporação. Evidência em `EVIDENCIA_G5_ARTE_INSTITUCIONAL_BRAIN_23_ANOS_2026-10-02.md`.
