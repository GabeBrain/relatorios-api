# Prompt consolidado ? Claude Design / Estimativas de vendas

Criado em 27/10/2026; revis?o integral em 28/10/2026 por solicita??o de Gabriel. Estado: proposta de experi?ncia para prot?tipo, n?o funcionalidade implementada. Este documento substitui o briefing anterior de seis etapas. Fonte ?nica do handoff visual; matem?tica e crit?rios cient?ficos permanecem no [plano cient?fico](PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md), e a sa?da operacional no [contrato](CONTRATO_E_VALIDACAO.md).

## In?cio do prompt ? copiar at? ?Fim do prompt?

Redesenhe o fluxo de uso de **Estimativas de vendas ? Rebrain**, preservando a identidade editorial, tipografia e qualidade dos gr?ficos aprovados no prot?tipo anterior. Quero uma experi?ncia simples, r?pida e profunda por descoberta progressiva. N?o quero seis etapas obrigat?rias, um cat?logo de estudos antes de qualquer curva nem uma tela cheia de bot?es t?cnicos.

Abaixo do t?tulo, escreva: **?Transformar o hist?rico de um empreendimento em uma proje??o de vendas compreens?vel, verific?vel e pronta para revis?o.?**

A experi?ncia central ?: **carregar universo ? ver curvas ? explorar previs?o e backtest no mesmo gr?fico ? revisar e exportar um conjunto**. O empreendimento ? o ponto de entrada; o conjunto exportado ? uma entrega principal. A ci?ncia deve estar acess?vel, sem exigir conhecimento t?cnico para navegar.

### 1. Estrutura e entrada

Uma p?gina principal com lista de curvas; um explorador amplo; pain?is auxiliares de configura??o, dados e exporta??o. Preservar menu/shell Rebrain. N?o transformar cada a??o numa nova p?gina.

Entrada territorial por regi?o, UF, cidades ou lista de empreendimentos, com revela??o progressiva. Curitiba ? a primeira base implementada; os demais alcances s?o estados de design, n?o funcionalidades j? comprovadas. Respeitar cidades autorizadas para o usu?rio. A a??o principal inicial ? ?Carregar empreendimentos?. Depois, resumir o universo, data da consulta e per?odo dispon?vel numa faixa compacta, com ?Alterar universo? e ?Atualizar dados?. N?o carregar regi?es inteiras automaticamente.

Mostrar progresso verdadeiro com identidade oficial Brain, etapa, tempo e cancelamento. Nada de espera fixa, contagem fict?cia ou promessa de dura??o. Dados incompletos de uma consulta n?o podem parecer um universo completo.

### 2. Lista principal: curvas largas e compactas

Uma linha por empreendimento, empilhada verticalmente, com gr?fico achatado e largo. N?o usar grade de duas colunas. Exibir nome, cidade, tipo/padr?o, m?todo mostrado, estoque na data escolhida e vendas previstas no intervalo quando calcul?veis. Hist?rico e previs?o devem ser visualmente distintos mesmo na miniatura.

Clique na linha abre o explorador; sele??o para exporta??o ? uma a??o separada. Navegar anterior/pr?ximo no explorador sem voltar ? lista. Ao fechar, restaurar filtros, rolagem e sele??o. Usar pagina??o/renderiza??o eficiente, sem montar milhares de gr?ficos simultaneamente.

Estados curtos: ?Refer?ncia Finotti dispon?vel?, ?M?todo explorat?rio?, ?Hist?rico insuficiente?, ?Dados a revisar?, ?Sem previs?o dispon?vel?. Disponibilidade n?o ? selo de confian?a. Sem previs?o, mostrar hist?rico e motivo, nunca curva inventada ou vazio inexplicado. M?todos alternativos n?o substituem silenciosamente Finotti.

Ap?s a carga, mencionar ?N esgotados na data escolhida?, com lista acess?vel de nomes/IDs. Exclu?-los por padr?o da proje??o futura e do c?lculo profundo dessa proje??o. **Preservar seus hist?ricos para backtest:** um empreendimento esgotado hoje pode ter estoque na data passada escolhida. Exclu?-lo de todos os testes enviesaria a amostra. Reclassificar pelo estoque na data de in?cio da previs?o, n?o pelo estado atual. Estoque desconhecido n?o significa esgotado. N?o prometer economia na API quando o endpoint j? devolve esses registros junto com os demais.

### 3. Controles discretos e configura??es

Na tela principal: busca, ?Prever a partir de?, ?Prever por?, ?Filtros? e ?Exportar?. Configura??es adicionais em painel: medida exibida, unidades/percentual, agrupamento temporal, m?todos para compara??o e condi??es de an?lise.

Os antigos estudos viram filtros: refer?ncia Finotti, estoque antigo, hist?rico curto, outras condi??es, dados a esclarecer, com/sem previs?o. Incluir cidade, tipo e padr?o. Condi??es podem se sobrepor; suas contagens n?o precisam somar o total.

Filtros n?o mudam silenciosamente a composi??o da exporta??o. Exibir ?12 selecionados ? 3 fora do filtro?, quando aplic?vel. Oferecer selecionar resultados filtrados, retirar itens e limpar sele??o por a??es expl?citas.

N?o permitir editar dados, coeficientes nem par?metros matem?ticos nesta vers?o. ? permitido escolher datas, dura??o, agrupamento visual, medida e m?todos. Ocultar uma parte do hist?rico por zoom n?o altera os dados usados pelo modelo.

### 4. Gr?fico principal: previs?o e backtest na mesma experi?ncia

O explorador tem um gr?fico grande, de largura integral, com hist?rico, previs?o e dados posteriores sobrepostos no mesmo sistema de eixos.

- Hist?rico usado: tra?o cont?nuo neutro.
- In?cio da previs?o: linha vertical arrast?vel com r?tulo ?Previs?o come?a aqui?.
- Previs?o: tra?o diferenciado; Finotti em verde destacado.
- Dados posteriores: linha distinta, pontos nas datas realmente dispon?veis, legenda expl?cita.
- Faixas: apenas se houver origem e m?todo identificados; nunca sombra decorativa com apar?ncia de confian?a.

Abaixo do gr?fico, uma r?gua temporal com **dois controles identificados**: in?cio da previs?o e final da previs?o. Cada controle tem alternativa por campo de data e teclado. Datas avan?am em passos permitidos e aparecem enquanto arrastamos. Evitar al?as sem nome e ambiguidades entre mover, ampliar e dar zoom.

Mover o in?cio mant?m a dura??o solicitada quando poss?vel; ampliar o final altera a dura??o. Respeitar limites do modelo e explicar ajustes, sem alterar datas silenciosamente. Um controle separado e secund?rio serve ao zoom do hist?rico vis?vel; n?o muda o protocolo do c?lculo.

Ao mover o in?cio para uma data passada com dados posteriores, entrar automaticamente em **?Compara??o hist?rica?**. Mostrar no mesmo gr?fico a previs?o calculada somente com informa??es dispon?veis at? o in?cio e a s?rie posterior. A pessoa n?o precisa apertar ?Executar retrospectiva?. Uma a??o ?Voltar ? previs?o atual? restaura o ?ltimo m?s dispon?vel e a dura??o anterior.

Se s? parte da previs?o tiver dados posteriores, marcar: ?Compara??o dispon?vel at? [data]; restante ainda sem resultado?. N?o reduzir silenciosamente o horizonte nem completar o realizado. Se n?o houver dados posteriores, manter proje??o sem m?tricas de erro.

Permitir ocultar/mostrar dados posteriores e sobrepor modelos. Ocultar a linha ? uma prefer?ncia visual, n?o muda a amostra estat?stica. Tooltip sincronizado mostra data, previsto, informado/observado e diferen?a em unidades quando compar?veis. Diferen?a = previsto menos observado; o significado depende da medida (estoque ou vendas).

Alternar estoque, vendas no per?odo e vendas acumuladas somente quando os dados sustentarem essas medidas. Unidades e percentual com denominador claro. N?o confundir acumulado com fluxo do per?odo.

### 5. Tempo: flexibilidade sem inventar resolu??o

Oferecer mensal, trimestral e anual **quando suportados**, com indisponibilidade explicada. Diferenciar intervalo de coleta, passo da previs?o e agrupamento visual.

Vendas s?o somadas em intervalos completos; estoque usa o saldo no final do intervalo, nunca a soma; percentuais n?o s?o somados nem promediados sem denominador. Previs?es mensais podem ser agregadas para compara??o trimestral; uma coleta trimestral n?o vira tr?s observa??es mensais por interpola??o. Lacunas ficam vis?veis. Intervalos incompletos ficam identificados e fora da m?trica correspondente.

No conjunto, n?o misturar calend?rios, medidas ou horizontes incompat?veis em um ?nico indicador. Oferecer grupos compar?veis quando a coleta variar entre empreendimentos. Toda mudan?a relevante atualiza r?tulos, m?tricas e relat?rio de forma coerente.

### 6. Resposta r?pida e c?lculos antecipados

Depois da carga, calcular primeiro disponibilidade dos m?todos, curvas padr?o e os itens vis?veis; antecipar em segundo plano datas pr?ximas e compara??es frequentes. Cache por dados, empreendimento, vers?o do m?todo, in?cio, dura??o, medida e protocolo. N?o tentar calcular todas as combina??es poss?veis antes de mostrar a primeira curva.

Intera??es de visualiza??o e c?lculos locais reutilizam os dados carregados, sem nova chamada ? API. Na implementa??o real, processamento pesado ocorre fora da thread da interface, com cancelamento de resultados obsoletos. Enquanto arrasta, atualizar datas e usar resultados j? calculados; se faltar c?lculo, consolidar ap?s breve pausa ou ao soltar, sem bloquear o movimento.

Durante rec?lculo, manter o gr?fico anterior levemente opaco, pulsar apenas a camada afetada e mostrar discretamente identidade Brain com ?Atualizando previs?o?. N?o usar overlay de p?gina inteira a cada ajuste. Identificar que a curva ainda pertence ? configura??o anterior at? o resultado novo estar pronto; n?o relabelar dados antigos como novos. Desabilitar exporta??o/relat?rio afetados enquanto estiverem desatualizados. Respeitar movimento reduzido, usar aviso acess?vel e impedir resposta antiga de substituir resultado mais recente. Em erro, preservar ?ltimo resultado identificado e permitir tentar novamente.

### 7. Card-relat?rio de backtest

A a??o **?Resumo do teste?** aparece somente em compara??o hist?rica. Com compara??o n?o avali?vel, mostrar estado indispon?vel e motivo no lugar de m?tricas fict?cias. O resumo pode ser aberto e baixado como card curto, al?m do arquivo audit?vel.

O card mostra:

- Empreendimento ou conjunto, m?todo e vers?o, medida/unidade.
- Data em que a previs?o come?a, horizonte solicitado e intervalo efetivamente comparado.
- **Erro m?dio em unidades (MAE):** tamanho m?dio da diferen?a, sem sinal.
- **Tend?ncia do erro:** acima/abaixo do observado, usando erro assinado previsto menos observado.
- **Cobertura:** quantos empreendimentos e quantas compara??es v?lidas, dentre os eleg?veis; exclus?es em a??o secund?ria.
- Uma frase interpretativa curta, espec?fica da medida e amostra.
- Origem do resultado posterior: coleta confirmada ou hist?rico informado de origem n?o confirmada.

Com um ?nico ponto, dizer ?Diferen?a neste per?odo?, n?o apresentar uma medi??o como desempenho geral. Evitar ?acur?cia de 95%?, nota de confian?a, R? como manchete e limiares arbitr?rios de bom/ruim. Comparar m?todos nos mesmos empreendimentos, datas, intervalos e alvos; mostrar tamanho da amostra pareada. Baseline simples pode contextualizar o erro, sem anunciar vencedor universal.

Para v?rias datas de in?cio, disponibilizar ?Testar em outras datas? no painel, com datas explicitadas. Repeti??es do mesmo empreendimento n?o s?o observa??es independentes; n?o apresentar teste de signific?ncia ou confian?a artificial. Preservar protocolo do motor e mostrar pondera??o: no conjunto, MAE/vi?s primeiro por empreendimento, depois m?dia entre empreendimentos; m?trica da carteira agregada ? outra leitura e pode esconder erros que se compensam. Resumir por horizonte compar?vel, sem juntar dura??es arbitrariamente.

A interpreta??o n?o deve alegar valida??o independente quando ela n?o existe. A refer?ncia Finotti dispon?vel foi constru?da com dados at? setembro de 2026: sua vers?o congelada n?o pode ser avaliada como previs?o independente de datas anteriores que participaram do treinamento. Mostrar restri??o; compara??es explorat?rias, se suportadas e explicitamente separadas, n?o geram selo de valida??o. Reconstruir treinamento apenas com passado ? trabalho cient?fico futuro, n?o uma funcionalidade fict?cia do prot?tipo.

### 8. Ci?ncia acess?vel

?Como foi calculado? abre explica??o curta e, por expans?o, f?rmula, s?mbolos, par?metros somente leitura, fonte, condi??es e limita??es. Manter refer?ncia original separada de m?todos explorat?rios.

Distinguir reprodu??o do m?todo, compara??o com hist?rico informado e avalia??o com coleta confirmada. A flag atual do cadastro n?o prova origem de todos os meses. N?o chamar hist?rico desconhecido de ?real comprovado?. N?o inferir periodicidade oficial s? pela apar?ncia das datas.

Faixas originais da refer?ncia e faixas calibradas localmente s?o diferentes. S? mostrar cada uma com seu r?tulo, origem e disponibilidade. Na aus?ncia, informar discretamente ?Sem faixa calibrada para esta an?lise?. Preservar motores horizontal/vertical, dom?nio e limites; n?o inventar f?rmula para desbloquear casos.

### 9. Conjunto: sele??o, compara??o e processamento

Sele??o por territ?rio, filtros, IDs ou escolha manual. A??o expl?cita **?Selecionar todos com refer?ncia Finotti dispon?vel?**, acompanhada da quantidade. Pode ser a op??o sugerida para preparar um conjunto, mas disponibilidade matem?tica n?o prova elegibilidade operacional de importa??o.

?Comparar sele??o? oferece sobreposi??o e carteira. Sobreposi??o evidencia curvas individuais; carteira soma proje??es individuais compat?veis. N?o aplicar uma ?nica f?rmula ao conjunto, nem tratar previs?o ausente como zero. Se algum integrante estiver indispon?vel, mostrar subconjunto analisado e cobertura; n?o rotular soma parcial como total completo.

A compara??o hist?rica tamb?m funciona para conjuntos, no mesmo gr?fico agregado e com acesso aos componentes. Mostrar tanto erro agregado da carteira quanto resumo de erros individuais de forma progressiva, explicando que erros podem se compensar. Conjunto congelado durante cada compara??o; n?o trocar membros para melhorar a curva. Mostrar grupos de m?todo/tipo quando necess?rio.

### 10. Exporta??o acompanhada da an?lise do conjunto

?Exportar? sempre acess?vel, com revis?o antes de baixar. Escopo: empreendimento atual, sele??o, resultado filtrado ou universo carregado; cidade/conjunto de cidades via escopo territorial. Per?odos e medida explicitados. Uma altera??o de filtro n?o modifica uma sele??o j? formada.

Painel de revis?o mostra: universo consultado, selecionados, inclu?dos, exclu?dos com motivos, esgotados na data de previs?o, m?todos e vers?es aplicados, intervalos gerados, exist?ncia de backtest e sua cobertura. N?o afirmar que cada previs?o exportada foi validada porque algum teste foi executado no conjunto.

O pacote deve combinar:

1. **Novas linhas estimadas**, no formato candidato previsto pelo contrato do projeto, preservando IDs, datas, tipologias quando resolvidas, unidades e identifica??o de estimativa.
2. **Hist?rico utilizado**, separado das novas linhas.
3. **Resumo do processamento do conjunto**, curto e leg?vel: m?todos, contagens, exclus?es e card(s) dos backtests efetivamente realizados; quando n?o houve teste, dizer isso.
4. **Rastreabilidade**, com protocolo, vers?es, identifica??o dos dados e resultados detalhados que sustentam o resumo.

N?o inventar distribui??o por tipologia, pre?o, distratos, campos ou arredondamentos. Resultados experimentais ficam separados do lote operacional. A refer?ncia Finotti dispon?vel n?o basta para liberar um lote: regras de sele??o, cad?ncia, origem e granularidade continuam valendo.

N?o existe ainda contrato homologado de importa??o Belogic. Usar ?Arquivo candidato para revis?o?, n?o ?Pronto para importar? nem bot?o de envio ao Geobrain. N?o inventar o layout de 26 colunas no design; representar integra??o com o contrato existente. Preservar acesso ? jornada operacional j? implementada.

### 11. Dados e confer?ncia

?Dados e metodologia? permanece acess?vel sem etapa final obrigat?ria. Reunir fonte, datas, qualidade, exclus?es e evid?ncias. Confer?ncia opcional por Excel informa filtros necess?rios e oferece https://app.geobrain.com.br/analise-temporal-excel . Exporta??o de an?lise n?o ? contrato de importa??o. Mostrar equivalente tabular dos gr?ficos.

### 12. Visual, acessibilidade e estados

Preservar visual editorial aprovado e tokens Geobrain anexados sem alterar. Archivo e JetBrains Mono no conte?do novo; manter shell. Gr?ficos largos, explica??es ao lado quando couberem e abaixo no celular. Uma a??o principal por contexto; matem?tica acess?vel por expans?o, sem apar?ncia de Markdown cru. N?o copiar identidade Apple.

Projetar 1440, 768 e 390px, claro/escuro, teclado, foco, Esc, retorno do foco, labels e movimento reduzido. Cor nunca ? o ?nico sinal. Evitar ?compet?ncia?, ?posi??o? e ?corte?; preferir data, per?odo, estoque e in?cio da previs?o.

Cobrir consulta vazia, erro, sem acesso, cancelamento, atualiza??o parcial, c?lculo pendente, sem m?todo, sem dados posteriores, compara??o parcial, cad?ncia incompat?vel, origem desconhecida, refer?ncia impedida por treinamento, conjunto parcialmente avali?vel, esgotado atual que era ativo no passado e exporta??o com exclus?es.

### 13. Entrega e aceite do prot?tipo

Entregar ZIP naveg?vel com index.html, CSS/JS/assets, tokens originais, dados sint?ticos separados e README. Funcionamento b?sico sem depend?ncias remotas. Identificar dados fict?cios; n?o inserir credenciais, API real ou dados privados. N?o implementar matem?tica de produ??o nem inventar valida??o estat?stica. Todos os n?meros exibidos no prot?tipo devem ser coerentes com seus dados demonstrativos.

README: mapa de intera??es, estados, regras das al?as temporais, medidas/agrega??es, componentes, decis?es, limita??es, itens demonstrativos e integra??o React. Informar altera??es feitas durante revis?o com Gabriel.

Demonstrar de ponta a ponta:

1. Carregar universo e ver lista de curvas sem escolher estudo.
2. Abrir empreendimento, mover in?cio para o passado, ampliar previs?o, ver previs?o e hist?rico posterior juntos.
3. Mostrar compara??o parcial e atualiza??o local sem apagar o gr?fico.
4. Abrir card-relat?rio coerente com datas e medida atuais.
5. Comparar m?todos dispon?veis e explicar um indispon?vel.
6. Selecionar todos com refer?ncia Finotti, revisar composi??o e baixar pacote demonstrativo com resumo do conjunto.
7. Encontrar um esgotado atual no backtest de quando ainda tinha estoque.
8. Voltar ? proje??o atual, preservando contexto da navega??o.

**Crit?rio central:** depois da carga, o usu?rio j? v? curvas. O backtest nasce do movimento no tempo dentro do gr?fico. A exporta??o representa um conjunto revisado e leva consigo uma s?ntese honesta do processamento.

## Fim do prompt

## Anexos recomendados

Enviar quatro prints: abertura/lista atual com shell; detalhe com curva grande e f?rmula; controles/resultados da retrospectiva atual; sele??o/exporta??o e confer?ncia. Anexar tokens can?nicos de `System Design/`, ativo oficial Brain e prot?tipo anterior aprovado. Slides Finotti apenas como refer?ncia de comunica??o, n?o prova de m?tricas. Este prompt ? autocontido; n?o ? necess?rio anexar todo o hist?rico da conversa.

## CTA curto para Claude Design

?Execute o prompt consolidado deste documento, preservando o visual aprovado e reorganizando a experi?ncia em lista de curvas, explorador temporal com backtest e exporta??o de conjuntos com resumo. Entregue um ZIP naveg?vel e README; priorize demonstrar as oito intera??es de aceite. N?o invente valida??o estat?stica, API real ou contrato de importa??o.?

## CTA para retorno ao reposit?rio ? somente ap?s aprova??o do ZIP

?Leia AGENTS aplic?veis, este briefing e o plano cient?fico. Inventarie o ZIP aprovado, registre hash/origem em .local-inputs e confronte suas intera??es com os contratos existentes. Proponha a divis?o de implementa??o e, ap?s autoriza??o de execu??o, adapte os componentes aceitos preservando motores Finotti e jornada operacional. Valide al?as temporais, aus?ncia de vazamento de futuro, agrega??o temporal, cache/cancelamento, m?tricas pareadas, sele??o/exporta??o e estados acess?veis. N?o substitua c?lculos reais por dados do prot?tipo. Atualize documenta??o e acompanhamento. N?o fa?a push nem deploy sem autoriza??o.?
