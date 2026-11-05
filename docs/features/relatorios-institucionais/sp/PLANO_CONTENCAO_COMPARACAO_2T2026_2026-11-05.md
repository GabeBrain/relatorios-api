# SP Institucional — problemas e plano de contenção

**Data:** 05/11/2026.  
**Origem:** comparação solicitada pelo usuário, executada por Codex.  
**Período:** 2T2026, encerrado em junho de 2026.  
**Estado:** diagnóstico concluído e correções locais implementadas conforme o andamento abaixo. A comparação do anexo corresponde aos dois arquivos enviados, antes dessas correções. Publicação e nova conferência com dados reais permanecem etapas separadas.

**Diretriz posterior do usuário:** descartar erros claramente humanos da elaboração manual. Inconsistências internas do original ficam fora da fila de correções e dos critérios de aceite. A meta é automatizar fórmulas e universos coerentes; não repetir números, arredondamentos ou totais manuais incorretos. Uma diferença entre extrações, sem causa comprovada, também não é automaticamente um defeito.

## Material comparado e cobertura

- **Original da analista:** `2026.06_PANORAMA_SAO_PAULO_VAP_13ago.pptx`.
- **Gerado pelo sistema:** `sp-institucional-2T2026-conferencia-editavel (1).pptx`.
- Ambos têm **85 slides**. Todos os pares foram renderizados no PowerPoint e inspecionados visualmente.
- Foram realizadas **1.021 conferências numéricas**, abrangendo séries, participações, tabelas e destaques de **55 slides**. As demais posições tiveram inspeção visual/de conteúdo; mapas não têm reconciliação de IDs ponto a ponto.
- Dessas conferências: **71 coincidem na precisão declarada**, **877 divergem** e **73 não têm valor comparável disponível**. São ocorrências por célula/período, com repetições entre destaques e gráficos; não representam 877 causas distintas nem um percentual de conclusão.
- O checklist do gerado informa 69 slides disponíveis, 8 parciais e 8 referências editoriais. Disponibilidade de fonte não comprova equivalência com a referência.
- Nenhum arquivo original foi alterado. Não houve nova consulta GeoBrain nem mudança de código do relatório nesta comparação.

## Regras confirmadas que serão preservadas

| Segmento | Padrões |
|---|---|
| Compactos | Compacto |
| MCMV | Econômico |
| Médio Padrão | Standard, Médio e Médio-Alto |
| Luxo | Alto e Luxo |

A investigação não depende de redefinir MCMV. A classificação está confirmada. É necessário conferir **em quais registros, competências e universos** ela é aplicada.

## Andamento da execução após autorização do usuário

| Frente | Estado local | Evidência / limite |
|---|---|---|
| Cenário Standard e destaque de padrões superiores (69) | Implementado | Numerador por ticket dos empreendimentos Standard, denominador Standard e metadados explícitos; três padrões no destaque, sem alterar o segmento Luxo |
| Eixos e espaços do PPTX (46/50) | Implementado | Extração preserva texto direto e spans; 17 trimestres presentes em cada slide exportado |
| Universo comum de capacidade (76–78) | Implementado como critério operacional explícito | Empreendimentos com estoque positivo na competência, incluindo tipologias esgotadas desses empreendimentos. Correspondência exata com IDs da extração antiga não comprovada |
| VGV por tipologia e totais coerentes (78) | Preservado e ajustado ao novo universo | Ausência de preço continua indisponibilizando apenas valores dependentes; soma por tipologia não foi trocada para copiar média manual |
| Quatro classes e calor de VGV nos mapas | Implementado | Calor ponderado pelo VGV em coordenadas originais, com intensidade relativa a cada visão; legenda de quatro segmentos |
| Slide 2, legendas e navegação | Implementado | Arte original com período dinâmico, dormitórios nomeados, coluna de faixas restaurada, 18 destinos internos no novo PPTX |
| Falta de fonte histórica / ponderação do preço | Ainda não resolvida por estes arquivos | Preservar lacunas; não inventar fotografias ou pesos para coincidir com números antigos |
| Diferenças entre extrações e base original INCC | Observações de reconciliação | Não são automaticamente defeitos e não geraram substituição por constantes |
| Erros humanos internos do original | Fora da fila de correção | Destaques, percentuais e totais automatizados devem consumir os mesmos dados e fórmulas |

**Validação local:** 300 testes SP / 30 arquivos aprovados; tipos, lint e build aprovados. Edge gerou os 85 slides sem novas chamadas de negócio durante a exportação. PowerPoint abriu, editou, salvou e reabriu a cópia sintética; nove páginas corrigidas foram renderizadas e as páginas 46/69/79 inspecionadas. Auditoria agregada permanece idêntica após salvamento pelo Office. Esses ensaios não são uma nova geração autenticada do relatório real do usuário.

**Fechamento técnico:** código salvo em `785cae6`, diagnóstico/documentação em `9f0ab00`. Usuário autorizou integrar os seis commits remotos sobre FIERGS, documentação e menu escuro; merge `2d6c018` concluído sem conflito. Os 126 arquivos do módulo SP permaneceram idênticos byte a byte. A conferência do documento vivo preserva a identidade de três pontos, desconsiderando somente linhas separadoras vazias. Publicação desta rodada ainda não realizada.

Após o merge, a regressão combinada passou em **302 testes / 31 arquivos**: 300 do SP e 2 da seleção FIERGS alterada pelo time. Tipos e build da base integrada também aprovados. Na última conferência do Edge, navegação por teclado e captura mobile/tema escuro incluídas; nenhuma API de negócio real consultada.

## Plano por problema

### 1. Percentual da faixa de R$ 400–500 mil usa outro denominador

**Slide:** 69. **Prioridade:** alta. **Diagnóstico:** diferença de critério comprovada.

- **Original:** 22,3% da oferta final do padrão **Standard** estaria na faixa de R$ 400–500 mil.
- **Sistema:** calcula os empreendimentos nessa faixa entre **todos os padrões** e divide pelo **estoque total**, exibindo 9,4%.
- **Evidência no código:** `buildSpMarketDetails`, campo `priceBandShare`, em `market-details.ts`.
- **Contenção:** identificar o percentual atual como cenário diferente; não compará-lo diretamente aos 22,3% da referência.
- **Correção proposta:** restringir o cenário ao universo Standard e usar a oferta Standard como denominador. Conferir se a seleção por ticket é por empreendimento ou tipologia antes de fechar o numerador.
- **Aceite:** fórmula e texto usam o mesmo universo; teste distingue Standard dos demais padrões e cobre denominador zero. A correção não deve fixar 22,3% como constante.

### 2. Destaque de padrões superiores agrega grupos diferentes

**Slide:** 69. **Prioridade:** alta. **Diagnóstico:** diferença de agregação comprovada.

- O original destaca as linhas Médio-Alto, Alto e Luxo: 6.874 / 118.362 = aproximadamente **5,8%**.
- O gerado destaca apenas Alto e Luxo: 4.616 / 127.840 = aproximadamente **3,6%**.
- **Contenção:** separar esse destaque específico do segmento **Luxo**, cujo mapeamento continua sendo Alto + Luxo.
- **Correção proposta:** reproduzir o destaque de três padrões com rótulo explícito, sem mudar a classificação dos segmentos.
- **Aceite:** soma, denominador e descrição correspondem aos padrões efetivamente destacados.

### 3. O PPTX perde os trimestres nos eixos

**Slides:** 46 e 50. **Prioridade:** alta. **Diagnóstico:** defeito de exportação comprovado.

- O gerado mostra anos repetidos, sem identificar claramente 1T, 2T, 3T e 4T.
- **Causa no código:** `spSvgTexts`, em `pptx-export.ts`, extrai somente os `tspan` quando eles existem. Nos gráficos de `SpMarketSlide`, o trimestre está no texto direto do elemento `text` e o ano no `tspan`; a primeira parte é descartada.
- **Contenção:** não usar esse eixo exportado como referência de período na conferência; consultar os períodos da auditoria embutida.
- **Correção proposta:** preservar texto direto e spans na posição medida, sem duplicar rótulos.
- **Aceite:** 17 períodos identificados corretamente, em sequência, no PPTX aberto no PowerPoint; teste com texto direto + `tspan`, texto simples e múltiplos spans. Conferir 2T2026, 4T2025 e mudança de ano.

### 4. Universo da oferta lançada inclui empreendimentos esgotados

**Slides:** 76, 77 e 78. **Prioridade:** alta. **Diagnóstico:** comportamento do sistema comprovado; universo exato do original ainda não comprovado.

- No slide 78, a oferta lançada passa de **481.204** no original para **1.025.507** no gerado; a oferta final passa de 118.362 para 127.840.
- O código soma `qty` de todos os registros da fotografia, incluindo registros com estoque zero. Os gráficos de estágio usam esse mesmo universo para oferta lançada.
- Exemplo visual: unidades de 1 dormitório prontas representam aproximadamente **24,5%** da oferta lançada no original e **53,3%** no gerado.
- **Contenção:** tratar a capacidade total reconstituída como universo diferente da referência, sem apresentar a coincidência de período como equivalência do indicador.
- **Correção proposta:** definir o universo original — por exemplo, empreendimentos em comercialização na fotografia — e aplicar uma seleção comum às capacidades, vendidos acumulados e estágios. O exemplo não é uma regra aprovada: não excluir esgotados apenas para aproximar totais.
- **Aceite:** lista de IDs incluídos/excluídos com motivo; universo idêntico entre os três slides; capacidade = vendido calculado + oferta final dentro do universo escolhido; estágios conservam o denominador. Não confundir vendido acumulado com vendas líquidas do trimestre.

### 5. VGV ofertado: preservar cálculo coerente e tratar preços ausentes

**Slide:** 78. **Prioridade:** alta para cobertura/universo. **Diagnóstico:** diferença de procedimento e lacunas comprovadas; diferença de procedimento não é, por si, erro do motor.

- Os valores do original são reproduzíveis, na precisão exibida, por **quantidade × ticket do padrão**, tanto para oferta lançada como para vendidas e oferta final.
- O gerado soma **quantidade × preço por tipologia**. A ponderação do ticket da oferta final não é necessariamente a mesma ponderação da capacidade lançada.
- No gerado, **91 tipologias sem preço** deixam VGV lançado/vendido e seus totais indisponíveis. O VGV final permanece calculável com a oferta positiva precificada.
- **Contenção:** manter “—” quando não há base completa; nunca somar valores conhecidos e apresentar o subtotal como total.
- **Ação proposta:** resolver o universo do item 4 e identificar se as tipologias sem preço pertencem a ele. Preservar a soma por tipologia quando usa quantidades e preços válidos; não trocar esse método apenas para copiar um atalho de média do arquivo manual. Totais monetários devem somar as parcelas do mesmo universo.
- **Aceite:** unidades e R$ mil claramente identificados no cabeçalho; cálculo reproduzível por padrão; totais coerentes com o método escolhido; ausência de preço não vira zero; testes distinguem capacidade, vendas acumuladas e estoque.

**Observação descartada da fila de correção:** as linhas da oferta final em VGV do original somam **R$ 92.559.199 mil**, mas o total exibido é **R$ 88.575.019 mil**. Na oferta lançada, as linhas somam R$ 360.490.878 mil e o total exibido é R$ 360.104.201 mil. A automação deve calcular totais coerentes; não depende de corrigir o arquivo manual nem de obter autorização para repetir sua inconsistência.

### 6. Preços históricos incompletos e ponderação não reconciliada

**Slides:** 53–59 e 61–64. **Prioridade:** alta. **Diagnóstico:** lacunas e valores diferentes comprovados; metodologia original ainda pendente.

- Cada série 53–59 tem **8 de 13 trimestres sem valor**, entre 2T2023 e 1T2025. O original preenche os 13.
- Primeira lacuna identificada na auditoria: empreendimento 64094 sem fotografia em junho de 2023. Há diagnósticos adicionais por competência; não se deve atribuir todos os pontos a esse único caso.
- Mesmo os cinco pontos preenchidos divergem. Média geral em junho de 2026: **R$ 15.896/m²** no original e aproximadamente **R$ 12.370/m²** no gerado.
- O código pondera preço e preço por m² pelas unidades em estoque positivo. A igualdade desse procedimento com o da analista não foi demonstrada.
- **Contenção:** conservar indisponibilidade/identificação parcial e não calcular variação sobre uma base que não foi comprovada. Separar falta de fotografia, falta de preço, reconciliação de estoque e diferença de ponderação.
- **Correção proposta:** diagnóstico por competência e recorte; recuperar a fonte realmente ausente quando disponível; conferir se a média original é por unidade, tipologia, empreendimento, área ou razão entre agregados. Manter o recorte MCMV confirmado; conferir o universo de MAP sem redefinir os quatro segmentos.
- **Aceite:** cada ponto tem denominador/pesos reproduzíveis; pontos ausentes não viram zero; preços históricos não usam a fotografia atual por conveniência; variações usam cobertura comparável; slides 53/62 e séries por dormitório são coerentes entre si.

### 7. Mapas por padrão e VGV não reproduzem todo o conteúdo original

**Slides:** 67–68, 70–71, 74–75 e 79–80. **Prioridade:** alta para conteúdo, média para enquadramento.

- Em 70–71, a referência representa quatro classes, enquanto o sistema usa sete padrões individuais.
- Em 79–80, o original tem **mapa de calor e pontos**; o gerado tem somente pontos.
- O gerado reduz a área do mapa, muda marcadores/base cartográfica e usa classes de VGV calculadas no mês. Não há IDs/camada vetorial do mapa original dentro do PPTX que permitam provar equivalência ponto a ponto.
- **Contenção:** não classificar “mapa disponível” como “mesma análise espacial do original”. Separar cobertura de coordenadas da equivalência das camadas.
- **Correção proposta:** aplicar a legenda de quatro segmentos onde correspondente; implementar a camada de calor de VGV, com pesos e escala definidos; revisar enquadramento e limites das classes.
- **Aceite:** legenda corresponde ao dado; mapa e total têm o mesmo universo; cobertura geográfica permanece identificável; valor/posição não são inventados; comparar os pares de visão ampla e aproximação. Validar carregamento, sucesso, erro e ausência de base cartográfica.

### 8. Contagens de empreendimentos e históricos não coincidem

**Slides:** 11 e 13–17. **Prioridade:** alta. **Diagnóstico:** divergência comprovada, causa ainda não isolada.

- Total de empreendimentos em 12 meses: **560 → 574**.
- MCMV no 2T2025: **67 → 53**; no 2T2026: **70 → 72**. Isso explica aritmeticamente a mudança de crescimento de aproximadamente 4,5% para 35,8%.
- O código reconstitui contagens por `release_date` e usa `standard` da raiz do cadastro para classificar lançamentos antigos. A regra de segmento está correta; a competência do padrão aplicado precisa ser verificada.
- **Contenção:** não atribuir a divergência a distratos, que não explicam diretamente contagem de empreendimentos lançados; não presumir inclusão tardia como causa única.
- **Correção proposta:** comparação por ID com data de lançamento, padrão aplicado e motivo de inclusão; confrontar cadastro atual com a classificação usada na extração da analista. Se houver mudança temporal de padrão, definir qual fotografia deve classificar a contagem.
- **Aceite:** diferenças localizadas em registros identificáveis; duplicados não aumentam contagem; datas/escopo consistentes; critério temporal declarado e testado. Nenhuma alteração para forçar 560 ou 70 como constantes.

### 9. Séries municipais, IVV, distribuições e bairros divergem

**Slides:** 9–11, 18–25, 32–39, 46–51, 66, 69, 72–73. **Prioridade:** alta.

| Indicador | Original | Gerado |
|---|---:|---:|
| Unidades lançadas no 2T2026 | 40.179 | 42.453 |
| Unidades lançadas em 12 meses | 180.269 | 182.310 |
| Vendas MCMV no 2T2026 | 29.065 | 26.443 |
| Vendas totais em 12 meses | 160.142 | 154.087 |
| Oferta final em junho de 2026 | 118.362 | 127.840 |
| IVV do 2T2026 | 26,3% | 23,2% |

- **Contenção:** preservar as duas extrações e suas datas; não atribuir diferenças automaticamente a revisão cadastral, distratos, vendas brutas/líquidas ou filtro sem evidência.
- **Correção proposta:** comparar mensalmente o mesmo escopo/campo. Para IVV, conferir oferta inicial, lançamentos e vendas antes de mudar a fórmula. Para bairros e tipologias, a soma municipal igual não basta: conferir também as distribuições.
- **Slide 39:** o sistema suprime o percentual do Top 10 quando há vendas negativas no universo; exibe 9.513 de 38.658 unidades. É uma regra de apresentação do sistema, não ausência do endpoint. Definir se o percentual líquido assinado deve ser apresentado com contexto.
- **Aceite:** meses e filtros iguais; numerador/denominador documentados; rankings completos; variações reproduzíveis. Comparar a mesma geração sem misturar releituras da API.

### 10. INCC e valores nominais precisam ser reconciliados separadamente

**Slides:** 26–30 e 40–44. **Prioridade:** alta.

- O gerado usa INCC-DI com base em junho de 2026 nesta edição.
- A escala foi normalizada na auditoria: valores do cache original em **R$ milhões**, auditoria do gerado em **R$**. A divergência observada não é um simples fator de um milhão.
- A base de correção exata e a versão dos índices usados na edição original ainda não foram comprovadas.
- **Contenção:** não ajustar o índice para compensar divergência que já exista nos valores nominais.
- **Correção proposta:** primeiro comparar VGL/VGV nominais por mês e padrão; depois confrontar série de índices, mês-base e produto dos fatores. Preservar a política de base única até decisão documentada.
- **Aceite:** fator mensal e soma reproduzíveis; mesma base nos totais e MCMV; valores negativos de vendas preservados; sem arredondamento intermediário que altere o total.

### 11. Navegação e acabamento ainda diferem

**Slides:** 2, 6, 8, 12, 31, 45, 49, 52, 60, 65 e 81; demais slides dinâmicos com notas operacionais.

- Os **17 hyperlinks** encontrados no original não existem no PPTX gerado: oito no sumário e um em cada uma das nove divisórias.
- A arte das divisórias foi preservada, mas seus ícones de início são imagens sem ação.
- O slide 2 usa composição genérica em vez da arte de apresentação do original. O sumário e vários rodapés ainda têm textos de implementação/conferência.
- **Contenção:** registrar como pendência funcional/editorial, sem confundir com divergência de dados.
- **Correção proposta:** recuperar navegação interna, adaptar a arte do slide 2 e retirar detalhes técnicos do conteúdo final. Preservar atribuições cartográficas e notas metodológicas necessárias à interpretação.
- **Aceite:** links testados no PowerPoint; índice aponta às posições corretas; títulos, períodos, legendas e conteúdo permanecem legíveis. Artes institucionais preservadas continuam sujeitas à revisão de atualidade.

### 12. Observações do original fora da fila de correção

**Slides identificados:** 9, 20–22 e 78.

- Slide 9 cita **127.778** lançamentos MCMV em 12 meses; o gráfico 21 contém **127.788**.
- O texto do semestre cita **73,9%** MCMV. A soma dos dois trimestres dos gráficos corresponde a **59.395 / 81.202 = 73,14%**; o gráfico anual contém aproximadamente 73,85%.
- Slide 78 tem totais monetários que não coincidem com a soma das linhas, conforme item 5.
- **Tratamento definido pelo usuário:** descartar essas inconsistências da fila de implementação. Permanecem somente nesta nota para evitar sua reprodução. Não haverá tarefa para corrigir o PPTX manual nem exigência de coincidência com seus valores contraditórios.
- **Aplicação na automação:** destaques e gráficos devem consumir a mesma série; percentuais e totais devem ser derivados dessa série e das parcelas válidas, sem números fixos transcritos do original.
- **Aceite:** coerência interna do relatório automatizado. Revisão cadastral, data de extração e causas ainda desconhecidas não serão chamadas de erro humano apenas para encerrar um delta.

## Ordem de execução proposta

| Lote | Trabalho | Critério para encerrar |
|---|---|---|
| 1 | Eixos do PPTX, cenário Standard, destaque de três padrões, navegação e limpeza editorial | Correções verificadas com testes dirigidos e novo PPTX aberto no PowerPoint |
| 2 | Universo comum e fórmulas dos slides 76–78 | Seleção por ID e cálculo reproduzíveis; totais automatizados aditivos, sem copiar inconsistências manuais |
| 3 | Históricos de preços, ponderação, MAP e INCC | Fonte, pesos, índices e lacunas identificados por competência |
| 4 | Mapas, quatro classes e camada de calor | Cobertura/legendas/pesos e pares de enquadramento conferidos |
| 5 | Conferência de séries municipais, cadastros e distribuições | Cálculos reproduzíveis e escopo consistente; divergências sem causa comprovada separadas de defeitos, sem meta de copiar os valores antigos |

Os lotes não exigem refazer a coleta completa a cada ajuste visual. Reutilizar a mesma geração congelada e repetir apenas as fontes realmente necessárias.

## Verificação final antes de encerrar as correções

- Conferir novamente os **85 slides**, incluindo suas dependências, sem aprovar um slide somente porque o checklist diz “disponível”.
- Testar **2T2026 e 4T2025**, trimestre parcial e passagem de ano, preservando seleção dinâmica de ano/trimestre.
- Abrir, editar, salvar e reabrir o PPTX no PowerPoint, com rótulos trimestrais e hyperlinks presentes.
- Conferir que os ajustes visuais/exportação não disparam novas consultas GeoBrain.
- Reexecutar regressão SP, tipos, lint e build proporcionais às alterações.
- Preservar métodos e regressões de Secovi/FIERGS e os demais relatórios.
- Submeter à conferência prática da analista os pontos de método/fonte que os dois PPTX não permitem decidir sozinhos.

## Evidências e arquivos de trabalho

O comparativo local inclui HTML autossuficiente com busca, filtros e ampliação dos 170 renders; CSV de slides; CSV numérico; JSON com valores e textos; resumo dos 85 slides. Diretório: `.local-inputs/sp-audit-2t2026/`.

O HTML foi conferido no Edge: 85 seções, 170 imagens, busca/filtro/ampliação funcionando, sem erros de página e sem requisições externas. Esses artefatos contêm a geração real do usuário e permanecem fora do Git.

- **SHA-256 do original:** `1350f82cb1d9386487ca1a9aee110fb19cf3d6ea7cb40d4a0205025802d9939b`.
- **SHA-256 do gerado:** `5f0f8e5abd3beabc82f6297bebc350cb00871b7604a855d0be64ba08213c8ccc`.
- **Base do código inspecionado:** `81ad236`, main em dia com origin após fetch.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`, somente referência; nenhuma escrita.

## Anexo ? invent?rio dos 85 slides

Este invent?rio registra a compara??o observada. Diferen?as de dados sem causa identificada n?o s?o automaticamente defeitos. Inconsist?ncias internas da elabora??o manual est?o descartadas da fila de corre??o, conforme orienta??o do usu?rio.

| Slide | Tema | Constata??o | Encaminhamento |
|---:|---|---|---|
| 1 | Capa Brain | Arte institucional visualmente equivalente; no gerado o conteúdo está rasterizado. Nomes, contatos e números conservam a edição de referência. | Não recalcular números institucionais; revisar atualidade editorial quando mudar a edição. Equivalência visual não significa objetos nativos editáveis. |
| 2 | Sobre este relatório: local, tipo e período | O original usa arte com tablet e três campos; gerado usa página branca genérica, repete período e mostra “Estrutura do relatório original”. Local/tipo/período estão corretos. | Adaptar a arte original com campos dinâmicos; retirar texto de implementação do relatório. |
| 3 | Grupo Brain e marcas | Arte institucional visualmente equivalente; no gerado o conteúdo está rasterizado. Nomes, contatos e números conservam a edição de referência. | Não recalcular números institucionais; revisar atualidade editorial quando mudar a edição. Equivalência visual não significa objetos nativos editáveis. |
| 4 | Sobre a Brain, números institucionais | Arte institucional visualmente equivalente; no gerado o conteúdo está rasterizado. Nomes, contatos e números conservam a edição de referência. | Não recalcular números institucionais; revisar atualidade editorial quando mudar a edição. Equivalência visual não significa objetos nativos editáveis. |
| 5 | GeoBrain, plataforma e números de cobertura | Arte institucional visualmente equivalente; no gerado o conteúdo está rasterizado. Nomes, contatos e números conservam a edição de referência. | Não recalcular números institucionais; revisar atualidade editorial quando mudar a edição. Equivalência visual não significa objetos nativos editáveis. |
| 6 | Sumário e navegação | Original tem8hyperlinks de seções; gerado tem lista textual de9divisórias, sem links e com texto “Estrutura do relatório original”. | Criar índice com links internos aos slides corretos; manter destaques extras identificados e limpar o rodapé operacional. |
| 7 | Perfil de São Paulo: população e consumo | Arte institucional visualmente equivalente; no gerado o conteúdo está rasterizado. Nomes, contatos e números conservam a edição de referência. | Não recalcular números institucionais; revisar atualidade editorial quando mudar a edição. Equivalência visual não significa objetos nativos editáveis. |
| 8 | Divisória: destaques do estudo | Arte e tema preservados. O original contém um link de navegação; o PPTX gerado contém apenas a imagem, sem hyperlink. | Restaurar link interno do ícone de início. No45, a retirada do marcador fixo06/2026 é intencional para suportar outros períodos. |
| 9 | Destaque: participação MCMV nos lançamentos | Original:73,9% no semestre,127.778MCMV em12meses no texto. Gerado:73,4%=60.820/82.901 e129.529MCMV. O próprio gráfico21 do original contém127.788, dez a mais que o texto9. | Manter destaques e gráficos derivados de uma série única e reproduzível. Inconsistência de transcrição do original fica fora da fila de correção; não fixar 127.778 ou 127.788 para imitar o arquivo manual. Diferenças entre extrações continuam sem causa presumida. |
| 10 | Destaque: vendas MCMV e comparação anual | MCMV2T26:29.065→26.443;2T25:20.064→20.081; alta44,9%→31,7%. Mercado12meses:160.142→154.087. Gerado separa corretamente trimestre/MCMV/mercado. | Confrontar meses e filtros das duas extrações. Nenhuma causa atribuída automaticamente a distratos, revisão de base ou bruto/líquido. |
| 11 | Destaque: recorde de lançamentos em 12 meses | Lançamentos12meses:180.269→182.310; empreendimentos:560→574. A chamada do gerado é limitada à janela consultada, sem afirmar recorde histórico universal. | Reconciliar os registros e a série mensal; não ajustar valores à mão para coincidir com a referência. |
| 12 | Divisória: lançamentos verticais | Arte e tema preservados. O original contém um link de navegação; o PPTX gerado contém apenas a imagem, sem hyperlink. | Restaurar link interno do ícone de início. No45, a retirada do marcador fixo06/2026 é intencional para suportar outros períodos. |
| 13 | Empreendimentos lançados, série trimestral | Diferenças nas séries de IDs contados por data de lançamento e no recorte Econômico/MCMV. Código usa release_date e standard da raiz atual do cadastro, inclusive para reconstituir anos antigos. | Comparar IDs entre extrações e documentar se a classificação da referência é atual ou da competência. Mapeamento de segmentos confirmado pelo usuário permanece igual; não presumir que padrão histórico resolve sem prova. |
| 14 | Empreendimentos lançados, móvel 12 meses | Diferenças nas séries de IDs contados por data de lançamento e no recorte Econômico/MCMV. Código usa release_date e standard da raiz atual do cadastro, inclusive para reconstituir anos antigos. | Comparar IDs entre extrações e documentar se a classificação da referência é atual ou da competência. Mapeamento de segmentos confirmado pelo usuário permanece igual; não presumir que padrão histórico resolve sem prova. |
| 15 | Empreendimentos lançados MCMV, trimestral | Diferenças nas séries de IDs contados por data de lançamento e no recorte Econômico/MCMV. Código usa release_date e standard da raiz atual do cadastro, inclusive para reconstituir anos antigos. | Comparar IDs entre extrações e documentar se a classificação da referência é atual ou da competência. Mapeamento de segmentos confirmado pelo usuário permanece igual; não presumir que padrão histórico resolve sem prova. |
| 16 | Empreendimentos MCMV, móvel 12 meses | Diferenças nas séries de IDs contados por data de lançamento e no recorte Econômico/MCMV. Código usa release_date e standard da raiz atual do cadastro, inclusive para reconstituir anos antigos. | Comparar IDs entre extrações e documentar se a classificação da referência é atual ou da competência. Mapeamento de segmentos confirmado pelo usuário permanece igual; não presumir que padrão histórico resolve sem prova. |
| 17 | Participação anual dos empreendimentos por segmento | Diferenças nas séries de IDs contados por data de lançamento e no recorte Econômico/MCMV. Código usa release_date e standard da raiz atual do cadastro, inclusive para reconstituir anos antigos. | Comparar IDs entre extrações e documentar se a classificação da referência é atual ou da competência. Mapeamento de segmentos confirmado pelo usuário permanece igual; não presumir que padrão histórico resolve sem prova. |
| 18 | Unidades lançadas, série trimestral | Série recalculada difere da referência; os destaques são derivados desses mesmos agregados. Janela atual é2T2026 ou12meses encerrados emjunho/2026. | Comparar extrações mensais e filtros. Separar divergência de fonte de fórmula; diferença isolada não prova revisão nem distratos. |
| 19 | Unidades lançadas, móvel 12 meses | Série recalculada difere da referência; os destaques são derivados desses mesmos agregados. Janela atual é2T2026 ou12meses encerrados emjunho/2026. | Comparar extrações mensais e filtros. Separar divergência de fonte de fórmula; diferença isolada não prova revisão nem distratos. |
| 20 | Unidades lançadas MCMV, trimestral | Série recalculada difere da referência; os destaques são derivados desses mesmos agregados. Janela atual é2T2026 ou12meses encerrados emjunho/2026. | Comparar extrações mensais e filtros. Separar divergência de fonte de fórmula; diferença isolada não prova revisão nem distratos. |
| 21 | Unidades lançadas MCMV, móvel 12 meses | Série recalculada difere da referência; os destaques são derivados desses mesmos agregados. Janela atual é2T2026 ou12meses encerrados emjunho/2026. | Comparar extrações mensais e filtros. Separar divergência de fonte de fórmula; diferença isolada não prova revisão nem distratos. |
| 22 | Participação anual das unidades lançadas por segmento | Série recalculada difere da referência; os destaques são derivados desses mesmos agregados. Janela atual é2T2026 ou12meses encerrados emjunho/2026. | Comparar extrações mensais e filtros. Separar divergência de fonte de fórmula; diferença isolada não prova revisão nem distratos. |
| 23 | Lançamentos por tipologia, comparação com mesmo trimestre anterior | Participações dos dois anos diferem, principalmente no período mais recente. Os denominadores do gerado aparecem explicitamente. | Conferir numerador/denominador da mesma extração. Em23/37/47, substituir legenda “1,2,3,4” por dormitórios completos. Retirar aviso genérico de vendas negativas dos slides de lançamento/oferta quando inaplicável. |
| 24 | Lançamentos por segmento, comparação anual | Participações dos dois anos diferem, principalmente no período mais recente. Os denominadores do gerado aparecem explicitamente. | Conferir numerador/denominador da mesma extração. Em23/37/47, substituir legenda “1,2,3,4” por dormitórios completos. Retirar aviso genérico de vendas negativas dos slides de lançamento/oferta quando inaplicável. |
| 25 | Top 10 bairros por unidades lançadas | Top10:36,9%→37,1%. Vila Anastácio sai e Vila Formosa entra; ordem e participações de outros bairros também mudam. | Comparar atribuição de bairro e unidades por empreendimento; a reconciliação total não prova a distribuição por bairro. Retirar comentário de API/cadastro da página final. |
| 26 | VGL trimestral em R$ milhões, corrigido INCC | VGL/VGV difere; escala normalizada nesta auditoria: cache original em R$milhões e snapshot em R$. Gerado usa INCC-DI atéjun/2026; base exata da edição original não foi comprovada. | Reconciliar valores nominais primeiro e depois índices/mês-base, evitando atribuir toda a diferença ao INCC. Não há erro de fator1milhão na apresentação comparada. |
| 27 | VGL corrigido INCC, móvel 12 meses | VGL/VGV difere; escala normalizada nesta auditoria: cache original em R$milhões e snapshot em R$. Gerado usa INCC-DI atéjun/2026; base exata da edição original não foi comprovada. | Reconciliar valores nominais primeiro e depois índices/mês-base, evitando atribuir toda a diferença ao INCC. Não há erro de fator1milhão na apresentação comparada. |
| 28 | VGL MCMV trimestral, corrigido INCC | VGL/VGV difere; escala normalizada nesta auditoria: cache original em R$milhões e snapshot em R$. Gerado usa INCC-DI atéjun/2026; base exata da edição original não foi comprovada. | Reconciliar valores nominais primeiro e depois índices/mês-base, evitando atribuir toda a diferença ao INCC. Não há erro de fator1milhão na apresentação comparada. |
| 29 | VGL MCMV corrigido INCC, móvel 12 meses | VGL/VGV difere; escala normalizada nesta auditoria: cache original em R$milhões e snapshot em R$. Gerado usa INCC-DI atéjun/2026; base exata da edição original não foi comprovada. | Reconciliar valores nominais primeiro e depois índices/mês-base, evitando atribuir toda a diferença ao INCC. Não há erro de fator1milhão na apresentação comparada. |
| 30 | Participação anual no VGL por segmento | VGL/VGV difere; escala normalizada nesta auditoria: cache original em R$milhões e snapshot em R$. Gerado usa INCC-DI atéjun/2026; base exata da edição original não foi comprovada. | Reconciliar valores nominais primeiro e depois índices/mês-base, evitando atribuir toda a diferença ao INCC. Não há erro de fator1milhão na apresentação comparada. |
| 31 | Divisória: vendas verticais | Arte e tema preservados. O original contém um link de navegação; o PPTX gerado contém apenas a imagem, sem hyperlink. | Restaurar link interno do ícone de início. No45, a retirada do marcador fixo06/2026 é intencional para suportar outros períodos. |
| 32 | Vendas líquidas, série trimestral | Série recalculada difere da referência; os destaques são derivados desses mesmos agregados. Janela atual é2T2026 ou12meses encerrados emjunho/2026. | Comparar extrações mensais e filtros. Separar divergência de fonte de fórmula; diferença isolada não prova revisão nem distratos. |
| 33 | Vendas líquidas, móvel 12 meses | Série recalculada difere da referência; os destaques são derivados desses mesmos agregados. Janela atual é2T2026 ou12meses encerrados emjunho/2026. | Comparar extrações mensais e filtros. Separar divergência de fonte de fórmula; diferença isolada não prova revisão nem distratos. |
| 34 | Vendas MCMV, trimestral | Série recalculada difere da referência; os destaques são derivados desses mesmos agregados. Janela atual é2T2026 ou12meses encerrados emjunho/2026. | Comparar extrações mensais e filtros. Separar divergência de fonte de fórmula; diferença isolada não prova revisão nem distratos. |
| 35 | Vendas MCMV, móvel 12 meses | Série recalculada difere da referência; os destaques são derivados desses mesmos agregados. Janela atual é2T2026 ou12meses encerrados emjunho/2026. | Comparar extrações mensais e filtros. Separar divergência de fonte de fórmula; diferença isolada não prova revisão nem distratos. |
| 36 | Participação anual das vendas por segmento | Série recalculada difere da referência; os destaques são derivados desses mesmos agregados. Janela atual é2T2026 ou12meses encerrados emjunho/2026. | Comparar extrações mensais e filtros. Separar divergência de fonte de fórmula; diferença isolada não prova revisão nem distratos. |
| 37 | Vendas por tipologia, comparação anual | Participações dos dois anos diferem, principalmente no período mais recente. Os denominadores do gerado aparecem explicitamente. | Conferir numerador/denominador da mesma extração. Em23/37/47, substituir legenda “1,2,3,4” por dormitórios completos. Retirar aviso genérico de vendas negativas dos slides de lançamento/oferta quando inaplicável. |
| 38 | Vendas por segmento, comparação anual | Participações dos dois anos diferem, principalmente no período mais recente. Os denominadores do gerado aparecem explicitamente. | Conferir numerador/denominador da mesma extração. Em23/37/47, substituir legenda “1,2,3,4” por dormitórios completos. Retirar aviso genérico de vendas negativas dos slides de lançamento/oferta quando inaplicável. |
| 39 | Top 10 bairros por vendas líquidas | Original mostra percentuais e26,9%noTop10. Gerado mostra unidades,9.513/38.658 e percentual “—”. A regra suprime percentuais quando existem vendas negativas no universo, mesmo com total positivo. | Confirmar apresentação de participação em vendas líquidas com sinal; não chamar a ausência de percentual de falha da API. Ranking também muda: saem Jaguaré/SantoAmaro e entram VilaPrudente/ArturAlvim. |
| 40 | VGV vendido trimestral, corrigido INCC | VGL/VGV difere; escala normalizada nesta auditoria: cache original em R$milhões e snapshot em R$. Gerado usa INCC-DI atéjun/2026; base exata da edição original não foi comprovada. | Reconciliar valores nominais primeiro e depois índices/mês-base, evitando atribuir toda a diferença ao INCC. Não há erro de fator1milhão na apresentação comparada. |
| 41 | VGV vendido corrigido INCC, móvel 12 meses | VGL/VGV difere; escala normalizada nesta auditoria: cache original em R$milhões e snapshot em R$. Gerado usa INCC-DI atéjun/2026; base exata da edição original não foi comprovada. | Reconciliar valores nominais primeiro e depois índices/mês-base, evitando atribuir toda a diferença ao INCC. Não há erro de fator1milhão na apresentação comparada. |
| 42 | VGV vendido MCMV trimestral, corrigido INCC | VGL/VGV difere; escala normalizada nesta auditoria: cache original em R$milhões e snapshot em R$. Gerado usa INCC-DI atéjun/2026; base exata da edição original não foi comprovada. | Reconciliar valores nominais primeiro e depois índices/mês-base, evitando atribuir toda a diferença ao INCC. Não há erro de fator1milhão na apresentação comparada. |
| 43 | VGV vendido MCMV corrigido INCC, móvel 12 meses | VGL/VGV difere; escala normalizada nesta auditoria: cache original em R$milhões e snapshot em R$. Gerado usa INCC-DI atéjun/2026; base exata da edição original não foi comprovada. | Reconciliar valores nominais primeiro e depois índices/mês-base, evitando atribuir toda a diferença ao INCC. Não há erro de fator1milhão na apresentação comparada. |
| 44 | Participação anual no VGV vendido por segmento | VGL/VGV difere; escala normalizada nesta auditoria: cache original em R$milhões e snapshot em R$. Gerado usa INCC-DI atéjun/2026; base exata da edição original não foi comprovada. | Reconciliar valores nominais primeiro e depois índices/mês-base, evitando atribuir toda a diferença ao INCC. Não há erro de fator1milhão na apresentação comparada. |
| 45 | Divisória: oferta | Arte e tema preservados. O original contém um link de navegação; o PPTX gerado contém apenas a imagem, sem hyperlink. | Restaurar link interno do ícone de início. No45, a retirada do marcador fixo06/2026 é intencional para suportar outros períodos. |
| 46 | Oferta final histórica e escoamento por padrão | Final:118.362→127.840; escoamento médio9→10meses arredondados no desenho. No PPTX gerado o eixo mostra apenas anos repetidos, perdendo o trimestre. | Corrigir extrator SVG que descarta o texto direto quando existe tspan. Restaurar rótulos trimestrais/destaques anuais; reconciliar estoque e regra de escoamento sem confundir dado com exportação. |
| 47 | Oferta por tipologia, comparação anual | Participações dos dois anos diferem, principalmente no período mais recente. Os denominadores do gerado aparecem explicitamente. | Conferir numerador/denominador da mesma extração. Em23/37/47, substituir legenda “1,2,3,4” por dormitórios completos. Retirar aviso genérico de vendas negativas dos slides de lançamento/oferta quando inaplicável. |
| 48 | Oferta por segmento, comparação anual | Participações dos dois anos diferem, principalmente no período mais recente. Os denominadores do gerado aparecem explicitamente. | Conferir numerador/denominador da mesma extração. Em23/37/47, substituir legenda “1,2,3,4” por dormitórios completos. Retirar aviso genérico de vendas negativas dos slides de lançamento/oferta quando inaplicável. |
| 49 | Divisória: VSO/IVV | Arte e tema preservados. O original contém um link de navegação; o PPTX gerado contém apenas a imagem, sem hyperlink. | Restaurar link interno do ícone de início. No45, a retirada do marcador fixo06/2026 é intencional para suportar outros períodos. |
| 50 | IVV, série trimestral | IVV2T26:26,330704%→23,218297%. Gerado calcula38.658/(124.045+42.453). Começa2T2022; original começa2T2023. O PPTX gerado perde o trimestre nos rótulos e exibe anos repetidos. | Corrigir exportação do eixo e preservar janela editorial adequada. Reconciliar estoques/fluxos antes de concluir diferença de fórmula do IVV. |
| 51 | IVV por área útil, tabela MCMV/demais padrões | Original total:inicial120.458,final118.362,lançamentos40.179,vendas42.275,IVV26,3%. Gerado:124.045,127.840,42.453,38.658,23,2%. Faixas e recortes MCMV/DPA existem nos dois. | Comparar fotografia e fluxos por faixa; a regra de intervalos contínuos do sistema precisa ser confrontada com a aplicação da analista, sem inventar arredondamento. |
| 52 | Divisória: evolução dos preços | Arte e tema preservados. O original contém um link de navegação; o PPTX gerado contém apenas a imagem, sem hyperlink. | Restaurar link interno do ícone de início. No45, a retirada do marcador fixo06/2026 é intencional para suportar outros períodos. |
| 53 | Evolução R$/m², média geral | Gerado tem8de13trimestres sem preço (2T2023–1T2025); original preenche todos. O5pontos restantes também divergem. Primeira lacuna reportada:64094sem fotografia emjun/2023; há outros problemas por competência. | Tratar lacunas por causa/competência sem preencher zero. Confirmar ponderação usada pela analista antes de recalcular médias; não assumir que só a atualização da base explica a diferença. |
| 54 | Evolução R$/m², 1 dormitório | Gerado tem8de13trimestres sem preço (2T2023–1T2025); original preenche todos. O5pontos restantes também divergem. Primeira lacuna reportada:64094sem fotografia emjun/2023; há outros problemas por competência. | Tratar lacunas por causa/competência sem preencher zero. Confirmar ponderação usada pela analista antes de recalcular médias; não assumir que só a atualização da base explica a diferença. |
| 55 | Evolução R$/m², 1 dormitório sem MCMV | Gerado tem8de13trimestres sem preço (2T2023–1T2025); original preenche todos. O5pontos restantes também divergem. Primeira lacuna reportada:64094sem fotografia emjun/2023; há outros problemas por competência. | Tratar lacunas por causa/competência sem preencher zero. Confirmar ponderação usada pela analista antes de recalcular médias; não assumir que só a atualização da base explica a diferença. |
| 56 | Evolução R$/m², 2 dormitórios | Gerado tem8de13trimestres sem preço (2T2023–1T2025); original preenche todos. O5pontos restantes também divergem. Primeira lacuna reportada:64094sem fotografia emjun/2023; há outros problemas por competência. | Tratar lacunas por causa/competência sem preencher zero. Confirmar ponderação usada pela analista antes de recalcular médias; não assumir que só a atualização da base explica a diferença. |
| 57 | Evolução R$/m², 2 dormitórios sem MCMV | Gerado tem8de13trimestres sem preço (2T2023–1T2025); original preenche todos. O5pontos restantes também divergem. Primeira lacuna reportada:64094sem fotografia emjun/2023; há outros problemas por competência. | Tratar lacunas por causa/competência sem preencher zero. Confirmar ponderação usada pela analista antes de recalcular médias; não assumir que só a atualização da base explica a diferença. |
| 58 | Evolução R$/m², 3 dormitórios | Gerado tem8de13trimestres sem preço (2T2023–1T2025); original preenche todos. O5pontos restantes também divergem. Primeira lacuna reportada:64094sem fotografia emjun/2023; há outros problemas por competência. | Tratar lacunas por causa/competência sem preencher zero. Confirmar ponderação usada pela analista antes de recalcular médias; não assumir que só a atualização da base explica a diferença. |
| 59 | Evolução R$/m², 4 dormitórios | Gerado tem8de13trimestres sem preço (2T2023–1T2025); original preenche todos. O5pontos restantes também divergem. Primeira lacuna reportada:64094sem fotografia emjun/2023; há outros problemas por competência. | Tratar lacunas por causa/competência sem preencher zero. Confirmar ponderação usada pela analista antes de recalcular médias; não assumir que só a atualização da base explica a diferença. |
| 60 | Divisória: preços por tipologia e padrão | Arte e tema preservados. O original contém um link de navegação; o PPTX gerado contém apenas a imagem, sem hyperlink. | Restaurar link interno do ícone de início. No45, a retirada do marcador fixo06/2026 é intencional para suportar outros períodos. |
| 61 | Ticket médio por sete padrões e média geral | Todos os grupos/dormitórios principais têm valores diferentes. Gerado pondera preço e R$/m² pelas unidades em estoque positivo. No original a metodologia não está explícita. | Reconstruir médias com pesos documentados. MAP no gerado significa todos os padrões exceto Econômico; original descreve Médio e Alto Padrão, portanto seu universo precisa ser confirmado, sem alterar o mapeamento MCMV. |
| 62 | R$/m² por sete padrões e média geral | Todos os grupos/dormitórios principais têm valores diferentes. Gerado pondera preço e R$/m² pelas unidades em estoque positivo. No original a metodologia não está explícita. | Reconstruir médias com pesos documentados. MAP no gerado significa todos os padrões exceto Econômico; original descreve Médio e Alto Padrão, portanto seu universo precisa ser confirmado, sem alterar o mapeamento MCMV. |
| 63 | Ticket por dormitório, com recortes MCMV/MAP | Todos os grupos/dormitórios principais têm valores diferentes. Gerado pondera preço e R$/m² pelas unidades em estoque positivo. No original a metodologia não está explícita. | Reconstruir médias com pesos documentados. MAP no gerado significa todos os padrões exceto Econômico; original descreve Médio e Alto Padrão, portanto seu universo precisa ser confirmado, sem alterar o mapeamento MCMV. |
| 64 | R$/m² por dormitório, com recortes MCMV/MAP | Todos os grupos/dormitórios principais têm valores diferentes. Gerado pondera preço e R$/m² pelas unidades em estoque positivo. No original a metodologia não está explícita. | Reconstruir médias com pesos documentados. MAP no gerado significa todos os padrões exceto Econômico; original descreve Médio e Alto Padrão, portanto seu universo precisa ser confirmado, sem alterar o mapeamento MCMV. |
| 65 | Divisória: estado atual do mercado | Arte e tema preservados. O original contém um link de navegação; o PPTX gerado contém apenas a imagem, sem hyperlink. | Restaurar link interno do ícone de início. No45, a retirada do marcador fixo06/2026 é intencional para suportar outros períodos. |
| 66 | Estoque por ano de lançamento e idade da oferta | Total118.362→127.840; participação de2025–2026:72,6%→73,6%. Categorias por ano preservadas, contagens diferentes. | Confrontar IDs/fotografia/data de lançamento; retirar explicações de reconstrução cadastral da página de relatório. |
| 67 | Mapa de estoque, visão ampla | Mapa visualmente diferente: área útil menor, círculos em vez de marcadores e base cartográfica mais clara. Gerado declara2.013empreendimentos geocodificados e127.840unidades; o original é imagem sem IDs exportáveis. | Revisar enquadramento, legenda e área do mapa. Não afirmar equivalência ponto a ponto sem a camada/IDs original. Rodapés técnicos devem ficar no diagnóstico. |
| 68 | Mapa de estoque, aproximação | Mapa visualmente diferente: área útil menor, círculos em vez de marcadores e base cartográfica mais clara. Gerado declara2.013empreendimentos geocodificados e127.840unidades; o original é imagem sem IDs exportáveis. | Revisar enquadramento, legenda e área do mapa. Não afirmar equivalência ponto a ponto sem a camada/IDs original. Rodapés técnicos devem ficar no diagnóstico. |
| 69 | Tabela de estoque por padrão, MCMV e faixa 4 | Original:faixaR$400–500mil representa22,3%da oferta Standard. Código calcula essa faixa sobre TODOS os padrões e divide pelo estoque TOTAL:9,4%. Original destaca Médio-Alto+Alto+Luxo=5,8%; gerado Alto+Luxo=3,6%. A coluna de faixas de valor foi removida. | Corrigir recorte/denominador do cenário Standard. Manter distinção entre destaque de três padrões e segmento Luxo de dois padrões. Recuperar coluna de faixas como convenção da referência, sem tratá-la como legislação atual. |
| 70 | Mapa por padrão, visão ampla | Mapa visualmente diferente: área útil menor, círculos em vez de marcadores e base cartográfica mais clara. Gerado declara2.013empreendimentos geocodificados e127.840unidades; o original é imagem sem IDs exportáveis. Original usa4classes (Compacto/Econômico/Médio/Luxo), gerado7padrões individuais. | Revisar enquadramento, legenda e área do mapa. Não afirmar equivalência ponto a ponto sem a camada/IDs original. Rodapés técnicos devem ficar no diagnóstico. Aplicar os4segmentos confirmados na representação correspondente, com legenda consistente. |
| 71 | Mapa por padrão, aproximação | Mapa visualmente diferente: área útil menor, círculos em vez de marcadores e base cartográfica mais clara. Gerado declara2.013empreendimentos geocodificados e127.840unidades; o original é imagem sem IDs exportáveis. Original usa4classes (Compacto/Econômico/Médio/Luxo), gerado7padrões individuais. | Revisar enquadramento, legenda e área do mapa. Não afirmar equivalência ponto a ponto sem a camada/IDs original. Rodapés técnicos devem ficar no diagnóstico. Aplicar os4segmentos confirmados na representação correspondente, com legenda consistente. |
| 72 | Tabela de estoque por dormitório e destaques | Total118.362→127.840;1dorm38.025→41.619;2dorm67.295→72.795. Participação conjunta89,0%→89,5%. | Conferir classificações e fotografia; não atribuir aumento apenas a entradas tardias sem comparar os registros. |
| 73 | Estoque cruzado por dormitório e metragem | Totais por dormitório e várias faixas mudam. Até39m²:69,5%→70,5%. Gerado usa intervalos contínuos sem arredondar a metragem. | Reconciliar células e limites, com especial atenção a áreas fracionárias. Código não mostra que a analista utilizou a mesma regra de faixa. |
| 74 | Mapa por R$/m², visão ampla | Mapa visualmente diferente: área útil menor, círculos em vez de marcadores e base cartográfica mais clara. Gerado declara2.013empreendimentos geocodificados e127.840unidades; o original é imagem sem IDs exportáveis. | Revisar enquadramento, legenda e área do mapa. Não afirmar equivalência ponto a ponto sem a camada/IDs original. Rodapés técnicos devem ficar no diagnóstico. |
| 75 | Mapa por R$/m², aproximação | Mapa visualmente diferente: área útil menor, círculos em vez de marcadores e base cartográfica mais clara. Gerado declara2.013empreendimentos geocodificados e127.840unidades; o original é imagem sem IDs exportáveis. | Revisar enquadramento, legenda e área do mapa. Não afirmar equivalência ponto a ponto sem a camada/IDs original. Rodapés técnicos devem ficar no diagnóstico. |
| 76 | Oferta lançada/final por estágio e tipologia | Oferta lançada no gerado usa qty de todos os registros da fotografia, incluindo estoque zero; original apresenta composição diferente. Ex.:1dorm Pronto na oferta lançada24,5%→53,3%. Oferta final também muda, mas em menor escala. | Definir o universo de empreendimentos da oferta lançada na referência e reaplicá-lo à capacidade. Incluir esgotados é comportamento comprovado do código; retirar todos eles ainda depende de confirmar o universo original. Não tratar essas barras como vendas mensais. |
| 77 | Oferta lançada/final por estágio e segmento | Oferta lançada no gerado usa qty de todos os registros da fotografia, incluindo estoque zero; original apresenta composição diferente. Ex.:1dorm Pronto na oferta lançada24,5%→53,3%. Oferta final também muda, mas em menor escala. | Definir o universo de empreendimentos da oferta lançada na referência e reaplicá-lo à capacidade. Incluir esgotados é comportamento comprovado do código; retirar todos eles ainda depende de confirmar o universo original. Não tratar essas barras como vendas mensais. |
| 78 | Tabela VGV ofertado/disponível por padrão | Oferta lançada481.204→1.025.507; vendido362.842→897.667; final118.362→127.840. No original, VGV por padrão é reproduzível por quantidade×ticket daquele padrão. Gerado soma quantidade×preço por tipologia e91tipologias sem preço tornam VGV lançado/vendido “—”. A própria referência não é aditiva: VGV final das linhas soma R$ 92.559.199 mil, enquanto o total exibido é R$ 88.575.019 mil. | Validar universo de capacidade e cobertura dos preços. Preservar soma por tipologia quando coerente e derivar totais das parcelas; não substituir esse método para copiar o atalho manual de médias ou totais não aditivos. Não preencher preço ausente com zero. Identificar R$ mil no cabeçalho. |
| 79 | Mapa por VGV da oferta final, visão ampla | Mapa visualmente diferente: área útil menor, círculos em vez de marcadores e base cartográfica mais clara. Gerado declara2.013empreendimentos geocodificados e127.840unidades; o original é imagem sem IDs exportáveis. Original contém mapa de calor; gerado apenas pontos. Limites das classes também mudam. | Revisar enquadramento, legenda e área do mapa. Não afirmar equivalência ponto a ponto sem a camada/IDs original. Rodapés técnicos devem ficar no diagnóstico. Implementar a camada de calor e definir escala comparável; pontos sozinhos não reproduzem o conteúdo original. |
| 80 | Mapa por VGV da oferta final, aproximação | Mapa visualmente diferente: área útil menor, círculos em vez de marcadores e base cartográfica mais clara. Gerado declara2.013empreendimentos geocodificados e127.840unidades; o original é imagem sem IDs exportáveis. Original contém mapa de calor; gerado apenas pontos. Limites das classes também mudam. | Revisar enquadramento, legenda e área do mapa. Não afirmar equivalência ponto a ponto sem a camada/IDs original. Rodapés técnicos devem ficar no diagnóstico. Implementar a camada de calor e definir escala comparável; pontos sozinhos não reproduzem o conteúdo original. |
| 81 | Divisória: consultores | Arte e tema preservados. O original contém um link de navegação; o PPTX gerado contém apenas a imagem, sem hyperlink. | Restaurar link interno do ícone de início. No45, a retirada do marcador fixo06/2026 é intencional para suportar outros períodos. |
| 82 | Equipe técnica nominal e fotos | Arte institucional visualmente equivalente; no gerado o conteúdo está rasterizado. Nomes, contatos e números conservam a edição de referência. | Não recalcular números institucionais; revisar atualidade editorial quando mudar a edição. Equivalência visual não significa objetos nativos editáveis. |
| 83 | Consultoria, pessoas e fotos | Arte institucional visualmente equivalente; no gerado o conteúdo está rasterizado. Nomes, contatos e números conservam a edição de referência. | Não recalcular números institucionais; revisar atualidade editorial quando mudar a edição. Equivalência visual não significa objetos nativos editáveis. |
| 84 | Imprensa e veículos | Arte institucional visualmente equivalente; no gerado o conteúdo está rasterizado. Nomes, contatos e números conservam a edição de referência. | Não recalcular números institucionais; revisar atualidade editorial quando mudar a edição. Equivalência visual não significa objetos nativos editáveis. |
| 85 | Encerramento e contato Brain | Arte institucional visualmente equivalente; no gerado o conteúdo está rasterizado. Nomes, contatos e números conservam a edição de referência. | Não recalcular números institucionais; revisar atualidade editorial quando mudar a edição. Equivalência visual não significa objetos nativos editáveis. |
