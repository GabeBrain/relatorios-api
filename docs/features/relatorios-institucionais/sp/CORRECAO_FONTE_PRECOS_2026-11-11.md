# SP — preços municipais e histórico independente

Lucas priorizou preço/histórico e autorizou as correções. Base `f0d5b408`, main/origin em dia e árvore limpa na abertura, fetch atualizado. Somente SP e seus diagnósticos/documentos foram alterados; preservados Secovi/FIERGS, Fortaleza, Quanti, Corretor, acesso somente por rota e fórmula de escoamento.

## Problema e implementação

O gerado tinha média geral R$12.369,94/m², ponderando `price_private_area` pelo estoque das tipologias. O original contém uma série **Preço m² Médio** nas planilhas Excel36/37/46 embutidas, com valores de apoio distintos dos valores finais do desenho. O geral manual não é reproduzido pela média ponderada dos padrões exibidos; não fixar seu valor como alvo.

O [Manual API GeoBrain — 2](https://drive.google.com/file/d/1h0OoXLQ-9R4jRQXrlzYuBnKCnpCR5X2K/view), seções3.8.4/3.8.5, documenta `temporal-analysis-city/medium-prices` e `medium-prices-meter`. A nova camada consome `average_price` e `average_price_per_meter`, campos do contrato temporal já usado no repositório, diretamente por competência/grupo. Não faz média de padrões, não reaplica estoque a médias já agregadas e não aplica INCC.

- Série geral53 e dormitórios54/56/58/59, fechamento por padrão61/62 e colunas por dormitório63/64 passam a usar observações municipais quando a nova fonte está presente.
- 13pontos trimestrais e um anterior; fechamento de trimestre, mês efetivo na parcial e comparação anual no mesmo mês. Lacunas, duplicatas e preços inválidos ficam indisponíveis; sem interpolar ou comparar através de lacuna.
- Divergência de estoque/fotografia granular não apaga preço municipal informado. Guardas de estoque das demais análises permanecem.
- Cálculo granular original separado no JSON/insights, sem fallback silencioso após falha da fonte municipal.
- Quatro ou mais exige grupo explícito4+ou equivalente; não presumir que exatamente4inclua5ou mais. Contrato antigo sem fonte municipal conserva4exatos.

## Média geral — contrato ainda a validar

A consulta geral é feita **sem `group_by`**. O parser exige uma única observação vertical de grupo vazio/nulo, Geral, Total ou Vertical na competência. O manual simplificado não demonstra a resposta sem agrupamento; **esse retorno ainda precisa de validação autenticada**.

Se a API exigir agrupamento, devolver apenas padrões ou não informar um total, a média geral fica explicitamente indisponível. Não se inventa peso nem se substitui por um número do manual. Isso evita apresentar o cálculo de12mil como equivalente confirmado ao indicador de15mil, mas **não comprova que a chamada real retornará o agregado esperado**. O valor real de2T2026 ainda não foi corrigido/homologado por observação do agente.

## Recortes ainda candidatos

Sem MCMV55/57 continua com cálculo granular candidato por estoque positivo. MCMV/MAP dos cards ficam indisponíveis ao usar colunas municipais: o cruzamento equivalente ainda não foi demonstrado. Valores granulares anteriores permanecem separados na auditoria, sem misturar métodos no mesmo card. Os endpoints por padrão/dormitório não comprovam pesos para esses cruzamentos; não subtrair médias. Métodos distintos declarados nos insights e rodapé dos cards. Correspondência integral com o critério do analista continua pendente.

## Geração e auditoria

As oito etapas automáticas permanecem. Preços são consultados antes da coleção pesada; resultados sobrevivem à falha do detalhamento. Falha de fonte de preços permite repetir a etapa reutilizando os históricos em memória. Cancelamento/progresso real reaproveitam BrainLoadingState.

Seis fontes: R$/m² geral/padrão/dormitório no histórico e ticket geral/padrão/dormitório somente no fechamento. Histórico dividido por ano, máximo16grupos/mês, paginação conferida e limite de páginas calculado; somente SãoPaulo/SP/Vertical e até o mês conferido. Sem token/histórico bruto persistido.

`numericAudit.details.prices` reflete o exibido; `priceSource` registra método/fontes/cobertura/problemas, séries e fechamento; `granularPriceBaseline` conserva o cálculo anterior. Insights comparam valores informados e recalculados.

## Verificação

- Suíte SP:323testes/36arquivos passaram antes dos últimos casos; repetições focadas cobrem os casos adicionais de recuperação,4+, precisão numérica, paginação e classificação legada. Total330casos distintos cobertos ao concluir.
- Tipos, build e lint dirigido aprovados; avisos anteriores de Browserslist/chunks preservados.
- Edge offline:40cenários de preços,1440/390, sucesso/lacuna/vazio/erro, rede externa bloqueada; sem erros de página/overflow. Imagem de sucesso inspecionada. Artefatos ignorados em `.local-inputs/relatorios-lucas/sp/prices-2026-11-11/`; valores18–19mil são inventados para QA.
- Fluxo automático no Edge:1440/390, claro/escuro, resposta de preços deliberadamente lenta, oito etapas, insights, cancelamento/retomada, erro independente/repetição e vazio. Sete cenários aprovados, zero erros de página;91chamadas de preço **interceptadas**, nenhuma GeoBrain real. BrainLoadingState contextual, menu acessível e históricos sem recoleta preservados.

## Retomada

Gerar2T2026 no ambiente autenticado e conferir o JSON da mesma geração. Primeiro validar o retorno geral sem agrupamento; depois padrão/dormitório e histórico. Se não existir total nesse contrato, localizar o recorte agregado oficial com Edgar/analista, sem inventar pesos ou filtros. Confrontar o original preservando versões/datas. Não declarar preço real ou deploy verificados pelos testes simulados. Sem coleta longa, geração real, publicação ou escrita Monday; nova fatia local até autorização própria de push.
