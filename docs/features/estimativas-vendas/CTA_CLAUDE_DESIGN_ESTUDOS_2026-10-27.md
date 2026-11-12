# Prompt consolidado - Claude Design / Estimativas de vendas

Criado em 27/10/2026; revisão integral em 28/10/2026 por solicitação de Gabriel. Estado: proposta de experiência para protótipo, não funcionalidade implementada. Este documento substitui o briefing anterior de seis etapas. Fonte única do handoff visual; matemática e critérios científicos permanecem no [plano científico](PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md), e a saída operacional no [contrato](CONTRATO_E_VALIDACAO.md).

## Início do prompt - copiar até "Fim do prompt"

Redesenhe o fluxo de uso de **Estimativas de vendas - Rebrain**, preservando a identidade editorial, tipografia e qualidade dos gráficos aprovados no protótipo anterior. Quero uma experiência simples, rápida e profunda por descoberta progressiva. Não quero seis etapas obrigatórias, um catálogo de estudos antes de qualquer curva nem uma tela cheia de botões técnicos.

Abaixo do título, escreva: **"Transformar o histórico de um empreendimento em uma projeção de vendas compreensível, verificável e pronta para revisão."**

A experiência central é: **carregar universo > ver curvas > explorar previsão e backtest no mesmo gráfico > revisar e exportar um conjunto**. O empreendimento é o ponto de entrada; o conjunto exportado é uma entrega principal. A ciência deve estar acessível, sem exigir conhecimento técnico para navegar.

### 1. Estrutura e entrada

Uma página principal com lista de curvas; um explorador amplo; painéis auxiliares de configuração, dados e exportação. Preservar menu/shell Rebrain. Não transformar cada ação numa nova página.

Entrada territorial por região, UF, cidades ou lista de empreendimentos, com revelação progressiva. Curitiba é a primeira base implementada; os demais alcances são estados de design, não funcionalidades já comprovadas. Respeitar cidades autorizadas para o usuário. A ação principal inicial é "Carregar empreendimentosó. Depois, resumir o universo, data da consulta e período disponível numa faixa compacta, com "Alterar universo" e "Atualizar dadosó. Não carregar regiões inteiras automaticamente.

Mostrar progresso verdadeiro com identidade oficial Brain, etapa, tempo e cancelamento. Nada de espera fixa, contagem fictícia ou promessa de duração. Dados incompletos de uma consulta não podem parecer um universo completo.

### 2. Lista principal: curvas largas e compactas

Uma linha por empreendimento, empilhada verticalmente, com gráfico achatado e largo. Não usar grade de duas colunas. Exibir nome, cidade, tipo/padrão, método mostrado, estoque na data escolhida e vendas previstas no intervalo quando calculáveis. Histórico e previsão devem ser visualmente distintos mesmo na miniatura.

Clique na linha abre o explorador; seleção para exportação é uma ação separada. Navegar anterior/próximo no explorador sem voltar à lista. Ao fechar, restaurar filtros, rolagem e seleção. Usar paginação/renderização eficiente, sem montar milhares de gráficos simultaneamente.

Estados curtos: "Referência Finotti disponível", "Método exploratório", "Histórico insuficiente", "Dados a revisar", "Sem previsão disponível". Disponibilidade não é selo de confiança. Sem previsão, mostrar histórico e motivo, nunca curva inventada ou vazio inexplicado. Métodos alternativos não substituem silenciosamente Finotti.

Após a carga, mencionar "N esgotados na data escolhida", com lista acessível de nomes/IDs. Excluí-los por padrão da projeção futura e do cálculo profundo dessa projeção. **Preservar seus históricos para backtest:** um empreendimento esgotado hoje pode ter estoque na data passada escolhida. Excluí-lo de todos os testes enviesaria a amostra. Reclassificar pelo estoque na data de início da previsão, não pelo estado atual. Estoque desconhecido não significa esgotado. Não prometer economia na API quando o endpoint já devolve esses registros junto com os demais.

### 3. Controles discretos e configurações

Na tela principal: busca, "Prever a partir de", "Prever por", "Filtrosó e "Exportar". Configurações adicionais em painel: medida exibida, unidades/percentual, agrupamento temporal, métodos para comparação e condições de análise.

Os antigos estudos viram filtros: referência Finotti, estoque antigo, histórico curto, outras condições, dados a esclarecer, com/sem previsão. Incluir cidade, tipo e padrão. Condições podem se sobrepor; suas contagens não precisam somar o total.

Filtros não mudam silenciosamente a composição da exportação. Exibir "12 selecionados / 3 fora do filtro", quando aplicável. Oferecer selecionar resultados filtrados, retirar itens e limpar seleção por ações explícitas.

Não permitir editar dados, coeficientes nem parâmetros matemáticos nesta versão. é permitido escolher datas, duração, agrupamento visual, medida e métodos. Ocultar uma parte do histórico por zoom não altera os dados usados pelo modelo.

### 4. Gráfico principal: previsão e backtest na mesma experiência

O explorador tem um gráfico grande, de largura integral, com histórico, previsão e dados posteriores sobrepostos no mesmo sistema de eixos.

- Histórico usado: traço contínuo neutro.
- Início da previsão: linha vertical arrastável com rótulo "Previsão começa aqui".
- Previsão: traço diferenciado; Finotti em verde destacado.
- Dados posteriores: linha distinta, pontos nas datas realmente disponíveis, legenda explícita.
- Faixas: apenas se houver origem e método identificados; nunca sombra decorativa com aparência de confiança.

Abaixo do gráfico, uma régua temporal com **dois controles identificados**: início da previsão e final da previsão. Cada controle tem alternativa por campo de data e teclado. Datas avançam em passos permitidos e aparecem enquanto arrastamos. Evitar alças sem nome e ambiguidades entre mover, ampliar e dar zoom.

Mover o início mantém a duração solicitada quando possível; ampliar o final altera a duração. Respeitar limites do modelo e explicar ajustes, sem alterar datas silenciosamente. Um controle separado e secundário serve ao zoom do histórico visível; não muda o protocolo do cálculo.

Ao mover o início para uma data passada com dados posteriores, entrar automaticamente em **"Comparação histórica"**. Mostrar no mesmo gráfico a previsão calculada somente com informações disponíveis até o início e a série posterior. A pessoa não precisa apertar "Executar retrospectiva". Uma ação "Voltar à previsão atual" restaura o último mês disponível e a duração anterior.

Se só parte da previsão tiver dados posteriores, marcar: "Comparação disponível até [data]; restante ainda sem resultado". Não reduzir silenciosamente o horizonte nem completar o realizado. Se não houver dados posteriores, manter projeção sem métricas de erro.

Permitir ocultar/mostrar dados posteriores e sobrepor modelos. Ocultar a linha é uma preferência visual, não muda a amostra estatística. Tooltip sincronizado mostra data, previsto, informado/observado e diferença em unidades quando comparáveis. Diferença = previsto menos observado; o significado depende da medida (estoque ou vendas).

Alternar estoque, vendas no período e vendas acumuladas somente quando os dados sustentarem essas medidas. Unidades e percentual com denominador claro. Não confundir acumulado com fluxo do período.

### 5. Tempo: flexibilidade sem inventar resolução

Oferecer mensal, trimestral e anual **quando suportados**, com indisponibilidade explicada. Diferenciar intervalo de coleta, passo da previsão e agrupamento visual.

Vendas são somadas em intervalos completos; estoque usa o saldo no final do intervalo, nunca a soma; percentuais não são somados nem promediados sem denominador. Previsões mensais podem ser agregadas para comparação trimestral; uma coleta trimestral não vira três observações mensais por interpolação. Lacunas ficam visíveis. Intervalos incompletos ficam identificados e fora da métrica correspondente.

No conjunto, não misturar calendários, medidas ou horizontes incompatíveis em um único indicador. Oferecer grupos comparáveis quando a coleta variar entre empreendimentos. Toda mudança relevante atualiza rótulos, métricas e relatório de forma coerente.

### 6. Resposta rápida e cálculos antecipados

Depois da carga, calcular primeiro disponibilidade dos métodos, curvas padrão e os itens visíveis; antecipar em segundo plano datas próximas e comparações frequentes. Cache por dados, empreendimento, versão do método, início, duração, medida e protocolo. Não tentar calcular todas as combinações possíveis antes de mostrar a primeira curva.

Interações de visualização e cálculos locais reutilizam os dados carregados, sem nova chamada à API. Na implementação real, processamento pesado ocorre fora da thread da interface, com cancelamento de resultados obsoletos. Enquanto arrasta, atualizar datas e usar resultados já calculados; se faltar cálculo, consolidar após breve pausa ou ao soltar, sem bloquear o movimento.

Durante recálculo, manter o gráfico anterior levemente opaco, pulsar apenas a camada afetada e mostrar discretamente identidade Brain com "Atualizando previsão". Não usar overlay de página inteira a cada ajuste. Identificar que a curva ainda pertence é configuração anterior até o resultado novo estar pronto; não relabelar dados antigos como novos. Desabilitar exportação/relatório afetados enquanto estiverem desatualizados. Respeitar movimento reduzido, usar aviso acessível e impedir resposta antiga de substituir resultado mais recente. Em erro, preservar último resultado identificado e permitir tentar novamente.

### 7. Card-relatório de backtest

A ação **"Resumo do teste"** aparece somente em comparação histórica. Com comparação não avaliável, mostrar estado indisponível e motivo no lugar de métricas fictícias. O resumo pode ser aberto e baixado como card curto, além do arquivo auditável.

O card mostra:

- Empreendimento ou conjunto, método e versão, medida/unidade.
- Data em que a previsão começa, horizonte solicitado e intervalo efetivamente comparado.
- **Erro médio em unidades (MAE):** tamanho médio da diferença, sem sinal.
- **Tendência do erro:** acima/abaixo do observado, usando erro assinado previsto menos observado.
- **Cobertura:** quantos empreendimentos e quantas comparações válidas, dentre os elegíveis; exclusões em ação secundária.
- Uma frase interpretativa curta, específica da medida e amostra.
- Origem do resultado posterior: coleta confirmada ou histórico informado de origem não confirmada.

Com um único ponto, dizer "Diferença neste período", não apresentar uma medição como desempenho geral. Evitar "acurácia de 95%", nota de confiança, R² como manchete e limiares arbitrários de bom/ruim. Comparar métodos nos mesmos empreendimentos, datas, intervalos e alvos; mostrar tamanho da amostra pareada. Baseline simples pode contextualizar o erro, sem anunciar vencedor universal.

Para várias datas de início, disponibilizar "Testar em outras datasó no painel, com datas explicitadas. Repetições do mesmo empreendimento não são observações independentes; não apresentar teste de significância ou confiança artificial. Preservar protocolo do motor e mostrar ponderação: no conjunto, MAE/viés primeiro por empreendimento, depois média entre empreendimentos; métrica da carteira agregada é outra leitura e pode esconder erros que se compensam. Resumir por horizonte comparável, sem juntar durações arbitrariamente.

A interpretação não deve alegar validação independente quando ela não existe. A referência Finotti disponível foi construída com dados até setembro de 2026: sua versão congelada não pode ser avaliada como previsão independente de datas anteriores que participaram do treinamento. Mostrar restrição; comparações exploratórias, se suportadas e explicitamente separadas, não geram selo de validação. Reconstruir treinamento apenas com passado é trabalho científico futuro, não uma funcionalidade fictícia do protótipo.

### 8. Ciência acessível

"Como foi calculado" abre explicação curta e, por expansão, fórmula, símbolos, parâmetros somente leitura, fonte, condições e limitações. Manter referência original separada de métodos exploratórios.

Distinguir reprodução do método, comparação com histórico informado e avaliação com coleta confirmada. A flag atual do cadastro não prova origem de todos os meses. Não chamar histórico desconhecido de "real comprovado". Não inferir periodicidade oficial só pela aparência das datas.

Faixas originais da referência e faixas calibradas localmente são diferentes. Só mostrar cada uma com seu rótulo, origem e disponibilidade. Na ausência, informar discretamente "Sem faixa calibrada para esta análise". Preservar motores horizontal/vertical, domínio e limites; não inventar fórmula para desbloquear casos.

### 9. Conjunto: seleção, comparação e processamento

Seleção por território, filtros, IDs ou escolha manual. Ação explícita **"Selecionar todos com referência Finotti disponível"**, acompanhada da quantidade. Pode ser a opção sugerida para preparar um conjunto, mas disponibilidade matemática não prova elegibilidade operacional de importação.

"Comparar seleção" oferece sobreposição e carteira. Sobreposição evidencia curvas individuais; carteira soma projeções individuais compatíveis. Não aplicar uma única fórmula ao conjunto, nem tratar previsão ausente como zero. Se algum integrante estiver indisponível, mostrar subconjunto analisado e cobertura; não rotular soma parcial como total completo.

A comparação histórica também funciona para conjuntos, no mesmo gráfico agregado e com acesso aos componentes. Mostrar tanto erro agregado da carteira quanto resumo de erros individuais de forma progressiva, explicando que erros podem se compensar. Conjunto congelado durante cada comparação; não trocar membros para melhorar a curva. Mostrar grupos de método/tipo quando necessário.

### 10. Exportação acompanhada da análise do conjunto

"Exportar" sempre acessível, com revisão antes de baixar. Escopo: empreendimento atual, seleção, resultado filtrado ou universo carregado; cidade/conjunto de cidades via escopo territorial. Períodos e medida explicitados. Uma alteração de filtro não modifica uma seleção já formada.

Painel de revisão mostra: universo consultado, selecionados, incluídos, excluídos com motivos, esgotados na data de previsão, métodos e versões aplicados, intervalos gerados, existência de backtest e sua cobertura. Não afirmar que cada previsão exportada foi validada porque algum teste foi executado no conjunto.

O pacote deve combinar:

1. **Novas linhas estimadas**, no formato candidato previsto pelo contrato do projeto, preservando IDs, datas, tipologias quando resolvidas, unidades e identificação de estimativa.
2. **Histórico utilizado**, separado das novas linhas.
3. **Resumo do processamento do conjunto**, curto e legível: métodos, contagens, exclusões e card(s) dos backtests efetivamente realizados; quando não houve teste, dizer isso.
4. **Rastreabilidade**, com protocolo, versões, identificação dos dados e resultados detalhados que sustentam o resumo.

Não inventar distribuição por tipologia, preço, distratos, campos ou arredondamentos. Resultados experimentais ficam separados do lote operacional. A referência Finotti disponível não basta para liberar um lote: regras de seleção, cadência, origem e granularidade continuam valendo.

Não existe ainda contrato homologado de importação Belogic. Usar "Arquivo candidato para revisão", não "Pronto para importar" nem botão de envio ao Geobrain. Não inventar o layout de 26 colunas no design; representar integração com o contrato existente. Preservar acesso à jornada operacional já implementada.

### 11. Dados e conferência

"Dados e metodologia" permanece acessível sem etapa final obrigatória. Reunir fonte, datas, qualidade, exclusões e evidências. Conferência opcional por Excel informa filtros necessários e oferece https://app.geobrain.com.br/analise-temporal-excel . Exportação de análise não é contrato de importação. Mostrar equivalente tabular dos gráficos.

### 12. Visual, acessibilidade e estados

Preservar visual editorial aprovado e tokens Geobrain anexados sem alterar. Archivo e JetBrains Mono no conteúdo novo; manter shell. Gráficos largos, explicações ao lado quando couberem e abaixo no celular. Uma ação principal por contexto; matemática acessível por expansão, sem aparência de Markdown cru. Não copiar identidade Apple.

Projetar 1440, 768 e 390px, claro/escuro, teclado, foco, Esc, retorno do foco, labels e movimento reduzido. Cor nunca é o único sinal. Evitar "competência", "posição" e "corte"; preferir data, período, estoque e início da previsão.

Cobrir consulta vazia, erro, sem acesso, cancelamento, atualização parcial, cálculo pendente, sem método, sem dados posteriores, comparação parcial, cadência incompatível, origem desconhecida, referência impedida por treinamento, conjunto parcialmente avaliável, esgotado atual que era ativo no passado e exportação com exclusões.

### 13. Entrega e aceite do protótipo

Entregar ZIP navegável com index.html, CSS/JS/assets, tokens originais, dados sintéticos separados e README. Funcionamento básico sem dependências remotas. Identificar dados fictícios; não inserir credenciais, API real ou dados privados. Não implementar matemática de produção nem inventar validação estatística. Todos os números exibidos no protótipo devem ser coerentes com seus dados demonstrativos.

README: mapa de interações, estados, regras das alças temporais, medidas/agregações, componentes, decisões, limitações, itens demonstrativos e integração React. Informar alterações feitas durante revisão com Gabriel.

Demonstrar de ponta a ponta:

1. Carregar universo e ver lista de curvas sem escolher estudo.
2. Abrir empreendimento, mover início para o passado, ampliar previsão, ver previsão e histórico posterior juntos.
3. Mostrar comparação parcial e atualização local sem apagar o gráfico.
4. Abrir card-relatório coerente com datas e medida atuais.
5. Comparar métodos disponíveis e explicar um indisponível.
6. Selecionar todos com referência Finotti, revisar composição e baixar pacote demonstrativo com resumo do conjunto.
7. Encontrar um esgotado atual no backtest de quando ainda tinha estoque.
8. Voltar à projeção atual, preservando contexto da navegação.

**Critério central:** depois da carga, o usuário já vê curvas. O backtest nasce do movimento no tempo dentro do gráfico. A exportação representa um conjunto revisado e leva consigo uma síntese honesta do processamento.

## Fim do prompt

## Anexos recomendados

Enviar quatro prints: abertura/lista atual com shell; detalhe com curva grande e fórmula; controles/resultados da retrospectiva atual; seleção/exportação e conferência. Anexar tokens canônicos de `System Design/`, ativo oficial Brain e protótipo anterior aprovado. Slides Finotti apenas como referência de comunicação, não prova de métricas. Este prompt é autocontido; não é necessário anexar todo o histórico da conversa.

## CTA curto para Claude Design

"Execute o prompt consolidado deste documento, preservando o visual aprovado e reorganizando a experiência em lista de curvas, explorador temporal com backtest e exportação de conjuntos com resumo. Entregue um ZIP navegável e README; priorize demonstrar as oito interações de aceite. Não invente validação estatística, API real ou contrato de importação."

## CTA para retorno ao repositório - somente após aprovação do ZIP

"Leia AGENTS aplicáveis, este briefing e o plano científico. Inventarie o ZIP aprovado, registre hash/origem em .local-inputs e confronte suas interações com os contratos existentes. Proponha a divisão de implementação e, após autorização de execução, adapte os componentes aceitos preservando motores Finotti e jornada operacional. Valide alças temporais, ausência de vazamento de futuro, agregação temporal, cache/cancelamento, métricas pareadas, seleção/exportação e estados acessíveis. Não substitua cálculos reais por dados do protótipo. Atualize documentação e acompanhamento. Não faça push nem deploy sem autorização."
