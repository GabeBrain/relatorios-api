# Plano de correção do Modelo 02 — panoramas regionais de imprensa

Proposta de 26/11/2026. O objetivo é que a prévia e o PowerPoint sejam reconhecíveis como a edição trimestral do panorama original de cada região. Cada quadro deve ocupar sua posição editorial e apresentar os dados da competência escolhida.

## 1. Mapear a sequência das cinco regiões

Usar os cinco PPTX de 4T2025 vinculados no [catálogo de referências](README.md#referências-verificadas). São 53 slides no Sul, 55 no Sudeste, 66 no Nordeste, 54 no Norte e 52 no Centro-Oeste. Adotar o Sul como piloto porque há também uma exportação real de 3T2026 para comparação. Ela tem 88 páginas, sete delas de municípios analisados. O original Sul concentra os municípios em uma página. O arquivo gerado contém zero gráficos nativos do PowerPoint, contra 19 no original Sul.

Antes de redesenhar, produzir uma matriz por região, com uma linha por slide original. Registrar número e título, miniatura, função editorial, fonte dos valores, tipo de gráfico ou tabela, quadro correspondente no sistema e ação prevista. Inspecionar visualmente também os slides compostos por imagens. Identificar pelo conteúdo quais tratam da Brain, estudos, GeoBrain, documentário e Anuário.

Gerar a sequência a partir dessa matriz, mantendo a ordem relativa de todos os slides incluídos. Registrar as exclusões explícitas do documentário e do Anuário de Cases de Sucesso. Quando uma continuação for necessária, colocá-la imediatamente após o slide de origem. Conservar o número da referência no diagnóstico e usar a sequência física na navegação e na exportação.

## 2. Recuperar a abertura e os destaques

Reproduzir a capa específica de cada região e reinserir as páginas sobre a Brain, seus estudos e o GeoBrain na posição original. Aproveitar as artes institucionais e conferir contatos, números e afirmações datadas antes de reutilizá-los em uma nova competência.

No Sul, usar como marcos de conferência a abertura do comparativo regional (original 10), cidades analisadas (11), metodologia (12), divisória de destaques (13), resumo geral (14–15) e destaques geral, MCMV e luxo (16–18). Recompor o quadro de cidades em blocos por UF, medindo a legibilidade antes de abrir outra página. Identificar a fonte e a data-base da população e o denominador de participação. Se faltarem, registrar a pendência no diagnóstico. Para o resumo, gerar as frases a partir dos indicadores e comparações efetivamente disponíveis no período.

## 3. Reconstruir os layouts de indicadores

| Referência Sul | Trabalho previsto | Conferência |
|---|---|---|
| 19–24, lançamentos | Reproduzir a divisória, séries trimestrais, composição por padrão, VGL e quadro por estado, nessa ordem. | Comparar tipo de gráfico, cores das séries, períodos, variações, unidade e posição da fonte. |
| 25 em diante, vendas e demais análises | Aplicar o mesmo levantamento aos quadros de vendas, estoque, preços e rankings. Respeitar as diferenças de conteúdo entre regiões, inclusive os quadros de valorização do Norte e Centro-Oeste. | Conferir cada quadro com a linha correspondente na matriz regional. |
| Localização e encerramento | Reproduzir a composição da referência por capital. Abrir continuações para a mesma capital quando necessárias à leitura e manter a contracapa em sua posição. | Conferir capitais, quantidade de empreendimentos com coordenadas, continuações e legibilidade dos pontos. |

Extrair dos originais tipografia, dimensões, alinhamentos, legendas, cores por categoria e rodapés por família de slide. No gerador, cada quadro passa a declarar a apresentação prevista no material de referência. Hoje uma lacuna na série pode transformar o gráfico inteiro em tabela. A série deve conservar seu gráfico e indicar a competência ausente, distinguindo ausência de zero.

## 4. Alinhar cálculo, prévia e exportação

Revisar em `calculate.ts` os períodos e comparativos usados por cada quadro. Nos acumulados parciais, comparar intervalos equivalentes. Manter a rastreabilidade da API, das correções por INCC-DI e das ressalvas no diagnóstico e no CSV. Os números da referência servem para conferir o método quando a competência e a cobertura coincidirem.

Fazer `ReportSlide.tsx` e a exportação em `Exports.tsx` consumirem a mesma sequência, séries, rótulos e regras de paginação. Usar gráficos nativos no PPTX para que o analista possa selecionar **Editar Dados**. Tabelas e textos devem continuar editáveis. Aplicar as artes originais a fundos e elementos institucionais. Manter os controles de navegação e carregamento compartilhados do sistema.

## 5. Validar e estender às demais regiões

1. Gerar o Sul 3T2026 pela rota habitual. Montar pares de imagens de referência e saída para abertura institucional, cidades, destaques, série trimestral, padrões, comparativo estadual e mapa. Conferir tanto a prévia quanto o PPTX renderizado.
2. Verificar todas as posições contra a matriz. Explicar diferenças na quantidade final de páginas por exclusão autorizada ou continuação. Conferir se o leitor chega ao quadro de lançamentos depois dos destaques e se os mapas continuam no bloco final.
3. Abrir o PPTX e editar uma série, uma tabela e um título. Conferir a correspondência entre valores exibidos, dados do gráfico e CSV. Exercitar competência com lacuna e capital com mapa em mais de uma página.
4. Aplicar os layouts conferidos ao Nordeste, Norte, Sudeste e Centro-Oeste seguindo a matriz de cada região. Gerar e comparar um PPTX por região, inclusive seus quadros exclusivos. Registrar para homologação os slides conferidos e eventuais pendências de conteúdo ou fonte.

O aceite visual exige que a mesma informação seja encontrada na mesma sequência e com a mesma leitura gráfica da referência regional. A contagem de páginas por si só não demonstra essa equivalência.


## Execução em 26/11/2026

Implementação, matrizes regionais, decisões do usuário, evidências e limites registrados em [EXECUCAO_2026-11-26.md](EXECUCAO_2026-11-26.md). Nome alterado para **Institucionais Imprensa**. Homologação visual/numeral pelo analista e publicação desta correção seguem separadas da validação sintética autorizada.
