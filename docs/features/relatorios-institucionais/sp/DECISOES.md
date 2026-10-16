# Decisões e pontos abertos — SP

## Lote de 12 detalhes — autorizado em 16/10/2026

Lucas pediu lotes de 10–12 páginas. Escolhido detalhamento de três indicadores × quatro segmentos com dados já consultados, sem novos endpoints ou ampliação de janela. Páginas 15–26 são complementares no visual do modelo, não doze slides originais homologados. Classificação SP confirmada por Lucas aplicada aos dois anos, vigência histórica a revisar. Detalhes só são publicados após lote histórico reconciliado; agrupamento mensal deve somar totais municipais e seus acumulados devem reproduzir os segmentos. Estoque final não é soma; valores ausentes não viram zero, sinais negativos são preservados e base anterior não positiva não gera porcentagem. Reuso do gráfico histórico e canvas existentes, sem nova regra de UI global ou exportação.

## Lote de três históricos — autorizado em 16/10/2026

- Lucas pediu entregas por blocos e aprovou lançamentos/vendas/oferta juntos. A ação única substitui a ação visível isolada de lançamentos; páginas12/13/14 reutilizam artes18/32/46. Nenhuma série2022–2026, preço/INCC ou coleta granular incluída.
- Duas janelas, cada uma com uma amostra oficial de raiz e três séries por Padrão. Normalmente8requests; máximo2páginas/100linhas por série, até14requests antes dos retries já limitados. Preservar filtros/autorização e cancelamento, sem seguir URLs arbitrárias. Raiz diferente da consulta municipal interrompe antes de buscar as séries daquela janela.
- O fim solicitado da janela (`windowEnd`) é separado de `rootPeriod`. Para julho/agosto2025, a raiz observada continua2026-08; não fabricar uma raiz2025. Estoque começa no mês anterior para provar os balanços das duas janelas. Extras fora da janela, meses/grupos ausentes, duplicação, valores inválidos, universo diferente ou diferenças na releitura bloqueiam o lote todo.
- Reconciliar fluxos e estoque atual por mês e padrão com o baseline municipal e conferir ambos os anos. Publicar os três resultados na tela somente após todas as fontes e verificações; falha/retry retira os resultados anteriores do lote e mantém dados municipais. Troca de escopo/identidade/trimestre cancela e invalida tudo.
- Lançamentos/vendas: soma dos meses equivalentes. Oferta: fotografia do último mês, com curva mensal exibida separadamente. Vendas negativas preservadas; base anterior zero ou negativa mostra diferença absoluta e não calcula variação percentual. Esta política não altera Secovi/FIERGS.
- Validação do provedor histórico ainda depende da sessão pessoal. Toda base2025 de QA é fictícia; não interpretar os percentuais das capturas como mercado real.

## Primeira janela histórica de lançamentos — autorizada em 15/10, retomada16/10

- Comparar os mesmos meses nos dois anos: janela atual do trimestre até o mês conferido e os meses correspondentes do ano anterior. Não buscar2022–2026 para esta fatia nem comparar parcial com trimestre anterior completo.
- Reusar transporte curto SP: uma amostra de fechamento e duas janelas `releases`, `group_by=Padrão`, SP/São Paulo/Vertical; até100linhas ×2páginas por janela, retry limitado e cancelamento. URLs de paginação nunca substituem os filtros fixos. Vendas/estoque/históricos granulares não são consultados nessa ação.
- Antes de comparar, exigir raiz idêntica à consulta municipal, meses/grupos explícitos em ambos os anos, valores inteiros não negativos, cobertura completa e releitura atual igual por mês e agregado de padrão. Falha limpa o comparativo anterior, preservando o baseline municipal; trocar escopo/identidade/trimestre invalida tudo.
- Calcular variação pela soma da janela, não média das variações mensais. Se a base anterior for zero, manter diferença absoluta mas não calcular porcentagem. A comparação da API atual não comprova a mesma fotografia usada no PPT histórico.
- Arte do slide18 reaproveitada na página12, com anos/meses explícitos, legenda de duas séries e rótulos separados. Dados2025 de QA são inventados; somente o botão autenticado poderá fornecer observações históricas reais. Nenhuma regra de segmento é retroaplicada a este comparativo total.

## Classificação confirmada por Lucas — 15/10/2026

Lucas forneceu explicitamente a correspondência abaixo, substituindo a pendência anterior. Regra `sp-institucional-segmentos-v1`, específica do piloto SP/3T2026; não é uma regra geral de enquadramento legal em MCMV nem altera outros modelos.

| Segmento do PPT | Padrões da API |
|---|---|
| Compactos | Compacto |
| MCMV | Econômico |
| Médio Padrão | Standard, Médio, Médio-Alto |
| Luxo | Alto, Luxo |

Implementada em `segments.ts`, sobre a distribuição por Padrão já validada, sem nova consulta. Exige os sete padrões explícitos, sem desconhecidos/duplicados, valores inteiros válidos e igualdade dos três totais com o município. Venda negativa conserva sinal; estoque usa somente o fechamento. Divergências bloqueiam todos os valores por segmento. Nenhuma classificação foi aplicada às regras Secovi/FIERGS ou a recortes históricos ainda não validados.

## Segmentos — preparação autorizada em 15/10/2026

- Lucas informou que ainda não tem a regra de conversão dos sete padrões da API para quatro segmentos do PPT. Não foi localizada regra SP confirmada no repo; preços/nomes de padrões não comprovam enquadramento MCMV.
- Preparar artes 24/38/48 com aviso explícito, sem totais ou gráficos por segmento. Exibir separadamente os sete padrões originais com lançamentos/vendas acumulados e estoque final, aproveitando dados já validados da consulta municipal. Sem nova coleta, classificação padrão automática ou configuração de equivalências hipotéticas.
- Agregação preserva rótulos e período; compartilhada apenas dentro de SP com tipologias. Não alterar taxonomia ou políticas Secovi/FIERGS. Próximo depende de regra/fonte/vigência e validação de totais por segmento; se o recorte MCMV for granular, não prometer que um mapa simples de padrões resolva.

## Tipologias — implementação autorizada em 15/10/2026

- Reusar o transporte curto existente, optando por `group_by=Tipologia` somente na ação nova. Uma amostra para revalidar raiz, até duas páginas/100 linhas por fonte R/V/O, retry/cancelamento e escopo preservados. Nenhuma coleta automática na navegação dos slides.
- Liberar distribuições somente se meses, grupos explícitos, balanços e totais mensais/acumulados coincidirem com a conferência municipal por Padrão. Comparar estoque anterior e final; oferta por tipologia é apenas o último mês. Não preencher grupos ausentes com zero, não descartar studios/4+ nem reclassificar rótulos do provedor.
- Mudança de fechamento entre consultas exige nova conferência municipal. Falha de atualização retira a distribuição anterior e mantém apenas o baseline municipal; alteração de escopo/identidade/trimestre cancela e invalida resultados. Diferenças ficam disponíveis para inspeção.
- Gráficos usam artes dos slides 23/37/47 e uma distribuição parcial atual, sem coluna/percentuais do trimestre anterior inventados. Vendas negativas mantêm sinal; participação percentual só quando o total é positivo. Mais de 12 grupos ou rótulos acima de 40 caracteres bloqueiam o layout explicitamente.
- Testes e navegador usam distribuição inventada com totais municipais registrados, identificada como sintética nos arquivos de QA. Isso não comprova observações reais por tipologia; validar com a sessão pessoal, sem pedir token no chat. Sem exportação/homologação/coleta granular.

## Modelo visual original — correção autorizada em 15/10/2026

- Lucas confirmou que a montagem deve manter a formatação do PowerPoint. Layout genérico anterior substituído pelas artes originais da capa e slides 13/18/32/46, com títulos/rodapé/marca preservados; proporção 12192000×6858000 EMU (16:9), tipografia Tahoma nos novos dados.
- Cinco páginas locais: capa e quatro indicadores; séries dinâmicas limitadas a julho/agosto, explicitamente mensais/parciais. Sem aproveitar percentuais antigos, tempo de escoamento ou séries históricas sem reconciliação. Empreendimentos permanecem indisponíveis.
- Prévia com escala e Dialog de ampliação existentes; nenhuma consulta adicional ao navegar. Artes são imagens, dados são DOM/SVG. Isso não constitui motor de edição/exportação PPTX nem reprodução integral dos 85 slides. Proveniência em `src/features/relatorios-institucionais/sp/assets/README.md`.
- Capturas pessoais enviadas por Lucas comprovaram o retorno do botão no ambiente dele; validação automatizada usa replay interceptado, sem token pessoal.

## Conferência municipal parcial — autorizada em 15/10/2026

- Lucas autorizou integrar e testar julho/agosto com os dados reais já disponíveis. Sem push, exportação ou coleta longa. A conferência é parcial do trimestre; não converte dois meses em trimestre fechado.
- Novo transporte usa a mesma API pública consultada manualmente: `building-with-history` (uma amostra para a raiz) e `temporal-analysis-city/{sales,releases,stock}`. Não troca silenciosamente para v2/interna ou presume equivalência de contratos. Até duas páginas por série, duas tentativas em falhas transitórias, filtros preservados e cancelamento por ação/escopo/identidade.
- Replay real recebido: julho e agosto reconciliam, total de 24.351 unidades lançadas, 26.824 vendas e estoque de 124.706. Nenhum número real fixado no código de produto: fixture fica somente nos testes e no diagnóstico local. Datas da consulta real derivam do trimestre e da raiz amostrada, não de agosto fixo.
- `period` de um registro limita a leitura curta, mas não comprova fechamento uniforme da cidade. Resultado permanece parcial, sem contagem de empreendimentos ou exportação; coleta granular completa exige escopo/custo explícitos. Séries sem mês/padrão, duplicadas, com paginação incompleta ou balanço divergente não liberam os indicadores consolidados.
- Acesso autenticado ao novo fluxo não observado pelo agente; browser local usa respostas registradas interceptadas. Testes do contrato/transporte não equivalem a homologação do provedor ou do relatório.

## Primeira fatia G2 — autorizada em 15/10/2026

- Identidade `sp-institucional`, rota lazy e código próprio pequeno; reuso de datas/parse numérico do motor e seleção geográfica compartilhada, sem modificar consumidores/políticas Secovi/FIERGS. Página de dados com primitives/tokens existentes, sem nova exceção de frontend.
- Regra do dev da API, transmitida por Lucas: aceitar somente `typologies_history[].period <= period` da raiz. Amostra manual You Now Campo Belo: raiz agosto/2026 e duas linhas de setembro; isso comprova a ocorrência nesse registro, não a igualdade de fechamento dos 5.183 registros. Não usar `last_period` como substituto sem contrato.
- Fase atual exclusivamente com fixtures sintéticas. Sem autenticação pessoal comprovada/escopo válido, nenhuma prévia; erros de catálogo sem fallback IBGE. Nenhuma coleta de mercado ou exportação adicionada. Campos/cobertura/fechamento conflitantes impedem números definitivos.
- Operação informada por Lucas: dia 20 do mês seguinte, mais 2–3 dias para analista; setembro esperado em 22–25/10. Previsão não observada na API e não usada para liberar trimestre por calendário. Férias desde 19/10 sem trabalho ou retorno presumidos.
- Destaques do estudo são uma etapa editorial futura, sujeita a edição/aprovação humana; “recorde” exige série histórica comprovada. Não implementada geração narrativa nesta fatia.

## Histórico do mapeamento G1

- **Decisão de Lucas, 15/10:** destino é SP capital/3T2026; 2T2026 serve como referência. Aprovado mapear quatro indicadores antes de implementar. G2, coleta longa, geração real e push não autorizados.
- **Fato observado:** conector Drive acessa a pasta e o PPTX com conta Suporte Geobrain (`clientebrain@gmail.com`); não comprova acesso da conta pessoal de Lucas. Original local ignorado pelo Git, identificado por hash no catálogo.
- **Informado por Lucas:** token autenticado em `https://geobrain-relatorios.lovable.app/`. Login/catálogo/cobertura SP não observados pelo agente; token não lido nem copiado.
- **Fato no código:** lançamentos vêm do histórico por empreendimento; vendas/oferta usam séries municipais e reconciliação específica por entidade. Hoje os IDs são apenas Secovi/FIERGS; novo contrato SP permanece pendente.
- **Proposta a comprovar:** vendas do SP devem representar fluxo trimestral e oferta, fechamento. Meses acumulados não podem ser somados como fluxos; estoque antigo não pode ser excluído pela janela dos lançamentos. Zero exige cobertura comprovada.
- **Pendências críticas:** semântica de `liquid_sales` em SP; fechamento observado em setembro versus dado carregado de mês anterior; campo de estoque atual versus histórico; dados ausentes convertidos em zero em caminhos existentes; contrato de contagem por empreendimento/possíveis fases. Não corrigidos nesta rodada.
- **Limite:** comparação com dashboard exige verificar o mesmo filtro/fotografia/método. A origem operacional da pesquisa anterior à API ainda não foi comprovada. PPTX/cache não é fonte contínua nem aprovação metodológica.
