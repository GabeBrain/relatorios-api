# Plano técnico — Comparações territoriais e composição anual do Panorama

Data: 05/11/2026. Estado: **G0–G6 implementados e verificados localmente; revisão final das referências concluída; portões I0–I4 concluídos localmente em06/11, I5aguarda autorização de integração/push e I6gerações humanas; G7/publicação e aceite externo pendentes**. Propósito: ampliar FIERGS/Secovi para comparar até três cidades ou grupos explícitos, preservar o consolidado aceito e incorporar a composição anual dos lançamentos. Esta é a fonte de execução desta ampliação; o inventário de referências e o contrato D01–D14 permanecem na [revisão Finoti](REVISAO_FINOTI_GRAMADO_CANELA_2026-11-03.md#referências-territoriais-recebidas-em-05112026).

## 1. Origem, baseline e limites de autorização

Gabriel confirmou alinhamento com a estratégia após analisar 15 imagens de Finoti e os panoramas4T2025 Lajeado/Vale do Taquari e RM de Porto Alegre. Finoti aceitou os ajustes anteriores; Teresa confirmou separar poucas cidades e agrupar regiões. O aceite anterior não homologa esta ampliação.

- Código publicado de referência: `e5bc2c2`, incluindo seleção manual FIERGS `c8d2abb`; diagnóstico local `5b9097e`. Revalidar SHAs e árvore ao executar.
- Fetch05/11 na preparação: origin/main `1b19e84`; árvore local `5b9097e`, **1 local/5 remotos**. Remotos são avanços SP; alterações locais de documentação, Estimativas e insumos permanecem preservadas. Não integrar árvore suja nem publicar sem autorização específica.
- Originais e hashes: `.local-inputs/finoti-comparativos-2026-11-05/manifest.json`. Inventário/páginas-alvo na revisão vinculada acima; não duplicar esse inventário aqui.
- Ler AGENTS aplicáveis e System Design antes de executar. Atualizar LIVE e acompanhamento de Gabriel conforme as fontes existentes; planejamento pessoal permanece fora do repo.
- Não alterar Corretor, Sinduscon, Dashboard, Validação de fechamento, Relatório API Excel, SP Institucional ou projetos paralelos. A integração autorizada de commits remotos não autoriza editar suas features.
- Este plano não autoriza coleta real, ampliação de credenciais, estudos reais, publicação ou mensagens externas. Priorizar snapshots/replays offline. Ausência de insumo indispensável exige explicitar a lacuna e pedir uma coleta delimitada, sem varredura automática.

## 2. Resultado e contrato funcional

### T01 — Recorte e modo de apresentação

`scope.cities` continua representando todos os municípios coletados, em uma única UF e disponíveis ao token. Não limitar coleta a três cidades. Separar apresentação em `consolidated` e `comparison`; uma unidade comparativa pode conter uma cidade ou várias.

| Seleção | Sugestão inicial | Alternativa |
|---|---|---|
| Uma cidade | Relatório municipal, sem controles de comparação inúteis | Mantém o fluxo atual |
| Duas/três cidades | Comparar por cidade, uma unidade para cada | Consolidado ou composição manual em dois/três grupos |
| Mais de três cidades | Consolidado | Comparar em dois/três grupos nomeados |

FIERGS continua entrando sem cidades e sem botão de preset. Secovi usa o mesmo contrato de apresentação, preservando suas políticas numéricas. O conjunto regional completo selecionado manualmente mantém a identificação institucional já aprovada no consolidado. No modo comparação, capa/contexto precisam deixar explícitos os territórios efetivamente comparados; não reutilizar uma arte regional como identificação de um grupo diferente.

### T02 — Partição explícita e estável

Contrato sugerido, aditivo e compatível com scopes antigos: `presentation?: { mode: 'consolidated' | 'comparison'; units?: { id: string; label: string; cities: string[] }[] }`. Ausência do campo significa consolidado nos modelos persistidos/fixtures anteriores. A sugestão inicial da tela é um comportamento novo, separado dessa compatibilidade.

- Comparação exige dois/três grupos não vazios. Cidade única não cria uma comparação fictícia.
- IDs estáveis, distintos e independentes do nome; rótulos não vazios/distintos após trim/normalização e limite editorial documentado, com validação amigável. Nomes longos cabem em até duas linhas; impedir entrada incompatível em vez de cortar silenciosamente.
- A união das cidades dos grupos deve ser exatamente a seleção; interseções vazias. Cada cidade pertence uma vez. Mesmo município com grafias equivalentes não pode duplicar uma associação.
- Cidades e UF validadas pelo mecanismo monitorado existente. Nome de grupo não define municípios automaticamente; sem composição presumida de RM, região ou Vale.
- No modo manual, manter grupos existentes quando compatíveis. Cidade nova fica identificada como não atribuída até escolha; cidade removida sai do grupo, deixando vazio explícito se necessário. Trocar UF/produto limpa grupos e resultado. Não redistribuir cidades silenciosamente.
- Renomear/reordenar/reagrupar invalida a apresentação anterior, mas preserva coletas ainda válidas. A ordem visual pertence às unidades; não muda a identidade física da coleta.

### T03 — Base, cobertura e reconciliação

Quantidades e valores monetários aditivos devem fechar entre cidade → grupo → consolidado na mesma dimensão, universo e competência. Empreendimentos usam chave estável composta do motor, não IDs numéricos sem município. Contagem de empreendimentos lançados no ano é distinta no ano, não soma cega de contagens trimestrais. Não redefinir oferta lançada/capacidade histórica para fazer gráficos novos coincidirem com PDFs antigos.

Preço, ticket, participação, disponibilidade e Índice de Velocidade de Vendas (IVV) devem ser recalculados com seus numeradores, denominadores/pesos e contratos vigentes. Não somar taxas nem usar média simples de médias municipais. A **Média das taxas** aprovada em D09 continua sendo esse indicador específico, separado da disponibilidade global. Separar lançamento original, capacidade no fechamento e controles independentes.

Cobertura é por cidade, indicador, dimensão e competência. Uma unidade composta não aparece como completa quando uma cidade não tem cobertura compatível. Cidade sem observação não é zero. Recuperação de cidades faltantes, deduplicação, negativos e alertas continuam como hoje. Não alterar política de disponibilidade de exportação/consentimento por este plano; os portões técnicos impedem declarar a implementação pronta com deltas inexplicados, não criam bloqueios novos no produto.

### T04 — Temporalidade e variações

- Fluxos: trimestre, semestre e acumulado12meses conforme o indicador existente. Distinguir ano fechado de janela anual parcial.
- Oferta final/preços: fotografia na competência; não somar estoques/preços no semestre ou em12meses. IVV mantém fórmula e política temporal vigentes.
- Comparativos carregam a unidade territorial e o intervalo de ambos os lados. Percentual somente com base positiva compatível; base zero/negativa usa valores e diferença absoluta. Sem cobertura ou ambos os lados zero, omitir comparação com aviso rastreável.
- Não consultar competências futuras para completar janela. Histórico insuficiente para12meses fica explícito; o primeiro ponto não recebe falso acumulado anual.
- Se houver fonte trimestral municipal, recompor o grupo a cada competência. Um cubo do fechamento não substitui toda a série histórica de preços/estoque.

### T05 — Apresentação e escopo por família

Sem replicar o relatório inteiro por unidade. No modo comparação, substituir a visão consolidada das famílias abaixo pela comparação equivalente, mantendo o consolidado no modelo/auditoria. O total não entra como uma quarta curva sobre os próprios componentes.

| Família | Comportamento de comparação | Controle de tamanho |
|---|---|---|
| Empreendimentos/unidades lançados; vendas; VGL/VGV em séries | Até três curvas; variações anuais e comparações trimestrais/semestrais por unidade | Uma página por família já existente, sem cópia consolidada redundante |
| Oferta final temporal; IVV temporal | Até três séries de fotografia/taxa corretamente calculadas | Sem somatório de fotografia; preservar layout próprio do IVV |
| Evolução de preços geral/por tipologia | Até três séries comparáveis com cobertura/pesos próprios | Legenda/contexto inequívocos; não confundir cores de unidade com cores de padrão |
| Oferta atual por ano, padrão e tipologia | Tabela com bloco quantidade/% por unidade | Percentuais sobre o total da própria unidade; até três blocos |
| Ticket/preço por padrão e tipologia | Barras agrupadas por unidade; médias identificadas quando aplicáveis | Não acrescentar três médias se não couberem; usar painel legível já previsto na família |
| Matriz área×tipologia e extremos de preço | Uma página por unidade | Substitui a página consolidada, máximo três por família; sem continuação da mesma tabela |
| Quadro unidades/VGL/VGV por padrão | Uma página por unidade | Mesma política de lançamento/histórico/fechamento da baseline |
| Horizontal: coortes, oferta por tipo, preços e extremos | Uma página por unidade para quadros densos; blocos lado a lado para quadros compactos | Inclui casas em condomínio conforme política de cada produto; não importar exclusões dos PDFs antigos |
| Maturidade | Consolidado do estudo na primeira entrega, identificado como tal | Exemplos também consolidam; não expandir por grupo sem necessidade comprovada |
| Composição anual por padrão | Consolidado de todo o recorte, uma página por métrica nova/aplicável | Até três famílias, não três cópias por unidade |
| Mapas/distribuições por bairro/cidade | Visão do recorte completo com identificação dos grupos onde útil | Não gerar automaticamente um mapa por unidade; preservar enquadramento territorial e números |
| Institucional, sumário e encerramento | Uma sequência por estudo | Artes atuais, incluindo23anos; não restaurar arte antiga das referências |

Uma família já removida por duplicação não deve reaparecer apenas porque ganhou um nome novo. Páginas existentes como15/19/30/54 dos exemplos não são identificadores suficientes: localizar por família/ID do manifesto real. Mostrar no sumário quais páginas são consolidadas ou específicas. A insuficiência de atividade não autoriza apagar páginas informativas: preservar D05 e os critérios de cobertura/atividade acordados. O analista continua decidindo relevância e acabamento no PPT.

### T06 — Três composições anuais

Incluir participação por padrão em **empreendimentos lançados, unidades lançadas e VGL**. Primeira implementação: colunas100% empilhadas, adequadas a anos discretos e ao contrato gráfico existente. A área100% da referência é alternativa estética futura; não precisa bloquear esta entrega. Composição anual de vendas fica fora desta rodada, por não ser exigência confirmada e exigir cuidado adicional com sinais líquidos negativos.

- Determinar anos a partir da janela selecionada. Primeiro/último ano parcial informa corte real. Não comparar ano completo com parcial como equivalente; variação anual somente com períodos compatíveis.
- Derivar quantidades/valores das fontes aprovadas e preservar pesos/classificação temporal. Cada série anual carrega numerador bruto, denominador, cobertura e percentual, não apenas número formatado.
- Reconciliar soma das categorias com o universo anual antes de normalizar. `Não classificado`/resíduo não pode desaparecer para fabricar100%. Campo ausente fica ausente, não preço zero.
- Não assumir que Econômico significa programa MCMV nem fundir sete padrões nas quatro cores do PDF sem contrato demonstrado. Usar a taxonomia autoritativa já preservada no motor. Se houver mapeamento editorial existente comprovado, reutilizar com teste de conservação; caso contrário publicar padrões canônicos e registrar diferença para a referência, sem nova regra por preço.
- Denominador positivo, dados não negativos e cobertura suficiente são pré-condições da exibição100%. Denominador zero é ausência de atividade; valor negativo ou cobertura incompleta exige decisão editorial rastreável, sem aplicar módulo, preencher com zero ou reescalar parcial como completo. Se não houver universo suficiente, manter aviso na interface/auditoria, sem página vazia ou nota técnica no PDF.
- Cada empreendimento conta uma vez no seu ano de lançamento e em uma categoria aplicável conforme contrato temporal. Não derivar composição histórica de empreendimentos apenas da classificação atual sem declarar/validar a fonte disponível.

### T07 — Aparência, exportação e rastreabilidade

Preservar D01–D14, fontes/títulos Geobrain, negativo, zeros/nulos, artes atuais e gráficos em imagem no PPT híbrido. Textos e conteúdo das tabelas permanecem editáveis; não anunciar gráfico editável nem restaurar o visual nativo rejeitado. Motor nativo preservado continua reutilizável e não vira dependência para esta mudança.

Usar primitives, tokens e BrainLoadingState existentes. No máximo três cores territoriais acessíveis da paleta já adotada, estáveis em todas as páginas; símbolos/rótulos reforçam a distinção, sem depender apenas de cor. Preservar tema claro/escuro e barra do menu já corrigida. Fontes maiores em um slide, conforme D08; não quebrar uma tabela em várias páginas para contornar layout.

Metodologia/Avisos explicam composição, cobertura e omissões; PDF/PPT recebem identificação e período essenciais, sem comentários técnicos de auditoria. CSV mantém colunas antigas e acrescenta modo, ID/nome do grupo, membros, origem/competência/base e reconciliações territoriais; preservar linhas municipais mesmo quando o material mostra grupos. Conferir consumidores antes de alterar cabeçalho.

## 3. Arquitetura e arquivos previstos

Os nomes novos abaixo são propostas; confirmar organização real no G0 e evitar duplicar abstrações existentes.

| Camada | Arquivos atuais / unidade proposta | Trabalho |
|---|---|---|
| Contratos e validação | `types.ts`, `scope-identity.ts`; novo `domain/territorial-presentation.ts` | Unidades, partição, assinatura e compatibilidade de scopes antigos |
| Coleta/cache | `api.ts`, `pages/PanoramaSecoviFiergsPage.tsx` | Separar chave de coleta da chave de projeção; reaproveitar harvests/cubos sem nova chamada por grupo |
| Modelo analítico | `report/model.ts`; novo `report/territorial-projections.ts` | Projeções por unidade usando os mesmos normalizadores/reconciliações; evitar fórmula duplicada |
| Agregação anual | `domain/aggregations.ts`, `report/editorial-contracts.ts`; módulo anual dedicado se necessário | Contagem distinta, soma/universo/cobertura e classificação por competência |
| Interface de seleção | Página e componente específico `TerritorialComparisonEditor.tsx` | Consolidado/comparação, edição explícita de nomes/membros e validação antes de gerar |
| Manifesto/renderização | `report/manifest.ts`, `report/fiergs-manifest.ts`, `components/ReportPaginator.tsx`, `MarketSlides.tsx` | IDs estáveis por família/unidade, tabelas/curvas, contagem/sumário, páginas anuais sem duplicação |
| Exportação/auditoria | `lib/fiergs-audit.ts`, `lib/export-metadata.ts`, `components/CustomFiergsCovers.tsx`, `report/presentation/*`, `lib/pptx/approved-layout.ts` | Identificação, snapshot consistente e paridade tela/PDF/PPT/CSV |
| Evidências | `__tests__/*`, `scripts/diagnostics/panorama-finoti-validation.ts` ou diagnóstico específico pequeno | Testes/replays offline, matrizes, manifests e provas de exportação |

**Separação de cache obrigatória:** `collectionKey` depende de token/sessão, produto, UF, conjunto municipal, janela e versões de fonte/contrato pertinentes. Não expor token em log/chave serializada publicamente. `presentationKey` inclui assinatura normalizada dos membros, ordem/IDs/nomes e modo. Renomear ou reagrupar apenas projeta dados coletados; não cria segunda coleta. A política de reuso ao trocar produto/período continua conservadora, com invalidação correta. Escopos antigos ficam legíveis.

Evitar construir três cópias completas recursivas do modelo, com mapas/arte/harvests duplicados. Extrair seletores/projeções puros sobre fatos municipais já preparados, mantendo dados brutos compartilhados e totais canônicos independentes. Se a fonte não retiver granularidade indispensável, registrar lacuna no G1 em vez de reconstruir a API a partir de números dos PDFs.

## 4. Portões de execução

### G0 — Base segura e contrato fechado

1. Ler instruções e documentos vinculados; registrar branch, HEAD, remotos, divergência e arquivos alterados. Comparar alterações remotas antes de assumir independência da feature.
2. Se houver árvore suja/divergência a integrar, apresentar commits/caminhos e pedir autorização. Enquanto isso, prosseguir apenas em preparação independente; não usar stash genérico incluindo insumos/segredos. Se integração autorizada, guardar caminhos explícitos, reaplicar e conferir o conteúdo original.
3. Congelar manifestos/dados canônicos de baseline antes de alterar seletores. Identificar quais snapshots cobrem2T2026,4T2025 e Canela+Gramado1T2023–3T2026; registrar cobertura real, sem trocar um período por outro.
4. Confirmar matriz T01–T07 e IDs reais das famílias. Registrar orçamento de páginas como fórmula do manifesto: substituições + expansão apenas das famílias específicas + até três novas anuais aplicáveis.

**Saída:** baseline reproduzível, mapa de arquivos e evidência do estado Git. **Aprovação:** não perder alterações paralelas, não confundir aceite anterior com aprovação desta ampliação. Commit de contrato/evidência, sem código de produto prematuro.

### G1 — Dados e reconciliação territorial antes da aparência

1. Implementar validação de partição/compatibilidade e seletores municipais; manter consolidado como controle independente.
2. Implementar projeções para contagens, lançamento, vendas, estoque, VGL/VGV, preço/ticket, disponibilidade e IVV com cobertura por competência/dimensão.
3. Produzir matriz cidade → grupo → total por métrica, período, segmento, tipologia/padrão e fonte; destacar aditivas versus ponderadas/taxas. Não testar apenas grand total: erro entre grupos pode se compensar.
4. Auditar disponibilidade anual de lançamento/classificação/preço e calendário. Separar lacuna real de zero observado; registrar candidato a família omitida pelos critérios existentes.
5. Testes: grupos equivalentes sob troca da ordem municipal, ID igual em cidades distintas, sobreposição, cidade fora do token, grupo vazio, nome repetido, ausência parcial, negativo, zero, padrão desconhecido e classificação sem competência.

**Saída:** contratos puros e matriz antes/depois; totais da baseline inalterados no consolidado. **Aprovação:** zero delta inexplicado nas métricas aditivas; taxas/pesos reproduzidos a partir de controles independentes. Não avançar ao layout com perdas territoriais abertas. Lacunas de fonte não autorizam números fixos ou classificação inventada.

### G2 — Coleta única, cache e editor de grupos

1. Adicionar modos e editor com os defaults T01, permitindo cidade versus grupo na mesma comparação. Validar associação completa e explicar erros antes da geração.
2. Separar estado de rascunho e snapshot efetivamente gerado. Reagrupar invalida resultado visível até recomposição; exportação aponta sempre para o mesmo snapshot, nunca rascunho alterado.
3. Reutilizar a sessão de coleta por chave física; cancelamento, tentativa de cidades faltantes e limpeza de UF continuam íntegros. Sem aumentar concorrência/retries por causa desta ampliação.
4. Testar mudança de modo/nome/ordem/membros sem nova chamada de rede; período/token/produto/cidades precisam invalidar o reuso quando necessário. Uma falha não pode gerar grupo aparentemente completo.
5. Conferir desktop1440 e celular390 em claro/escuro: vazio, seleção inválida, editando, carregando, erro e sucesso. Nova operação local usa BrainLoadingState quando aplicável, com cancelamento consistente.

**Saída:** editor usável sem expor complexidade interna. **Aprovação:** modo consolidado intacto, partição inequívoca, zero coleta adicional por alteração exclusivamente editorial comprovado por contadores/mocks. Não fazer teste real de API por iniciativa própria.

### G3 — Comparações temporais, preços e tabelas compactas

1. Estender séries/variações para até três unidades com legenda, nomes e cores consistentes. Reaproveitar os componentes aprovados; não desenhar gráfico de estilo diferente só no PowerPoint.
2. Adaptar tabelas compactas e preços conforme T05, participações por unidade e médias próprias. Não misturar proporções de grupos com participação do grupo no estudo.
3. Manter acumulados, comparativos equivalentes e restrições de cobertura de T04. Sem comparação semestral falsa de estoques/preços/IVV.
4. Ajustar títulos/contexto com cidade/grupo e janela verdadeira, preservando limites de nomes e layout dos quadros anuais.

**Saída:** famílias mais frequentes comparáveis em uma página. **Aprovação:** leitura clara em dois/três territórios, zeros/negativos/null sem regressão e valores iguais à matriz G1. IDs/ordem de cores não mudam ao navegar/exportar.

### G4 — Quadros específicos e horizontal

1. Expandir somente matriz área×tipologia, extremos, VGL/VGV e quadros horizontais densos por unidade. Identificador `family + unitId` distinto; não reutilizar ID de slide oficial como único identificador.
2. Adaptar sumário/paginação, referências do manifesto, avisos e auditoria para páginas geradas por unidade. Nenhuma referência perde o território quando uma unidade não possui estrutura publicável.
3. Preservar universo de oferta final positiva nos extremos e preços; casas em condomínio permanecem horizontais FIERGS, com política Secovi independente.
4. Maturidade/mapas continuam consolidados, explicitamente identificados. Não confundir mapa territorial com divisão de cálculos; não excluir empreendimento distante de indicadores.

**Saída:** desdobramento completo das famílias requeridas pelos exemplos, com limite previsível. **Aprovação:** sem triplicar relatório inteiro, duplicar horizontais ou mudar regra numérica; quadros cabem em um slide cada e todos os territórios publicáveis estão identificados.

### G5 — Três composições anuais e integração editorial

1. Implementar T06, com gráfico de colunas100% empilhadas e dados brutos/denominadores na auditoria. Reutilizar fontes de lançamento, respeitando contagem distinta/classificação temporal e unidade monetária.
2. Incluir empreendimentos, unidades e VGL somente onde universo/cobertura sustentarem a família. Se o manifesto já tem lugar equivalente, substituir/adaptar em vez de repetir.
3. Sem base MCMV específica, manter padrões canônicos e aviso da ausência de equivalência visual. Não tratar o risco já diagnosticado como autorização para equiparar Econômico ao programa.
4. Testar ano parcial, sem cobertura, total zero, preço incompleto, categorias desconhecidas, arredondamento e valores negativos. Reconciliar valores brutos antes de exibir100%; não corrigir residuais alterando categorias.

**Saída:** até três páginas novas/aprimoradas, consolidadas, com títulos e corte temporal claros. **Aprovação:** soma percentual coerente dentro da precisão de exibição e universo bruto íntegro. Lacuna de indicador é registrada, não disfarçada; família indisponível não equivale a tarefa homologada.

### G6 — Regressões e provas de exportação local

Executar apenas testes focados inicialmente; ampliar somente por falha ou dependência afetada. Sem rodar toda suíte/coleção extensa automaticamente. Comandos dirigidos incluem os testes de seleção livre, identidade, reconciliação, modelo, manifesto, referências, auditoria e PPT editável afetados, mais novos testes territoriais/anuais; executar `tsc --noEmit -p tsconfig.app.json`, lint dirigido e build na conclusão integrada. Registrar falhas externas sem alterar domínios paralelos para passar.

| Caso | Evidência mínima |
|---|---|
| Municipal consolidado | Canela4T2025 com respostas locais: prova de não regressão no menor estudo localizado |
| Duas cidades | Canela+Gramado1T2023–3T2026 com insumos exatos locais, cobrindo negativos/lacunas reais existentes |
| Três unidades | Fixture sintética mínima com cidade/cidade/grupo, nomes longos e três cores; não anunciar como estudo real |
| Cidade versus região | Lajeado versus quatro cidadesVale: fixture sintética ou snapshot efetivamente encontrado; o PDF antigo é referência visual, não fonte de fatos para o motor |
| Mais de três cidades consolidado | Preset oficial e regressões2T2026/4T2025 com fixtures/snapshots identificados, sem afirmar que conjunto de três equivale às dez |
| Secovi | Regressão offline municipal/multicidade existente; política horizontal/ponderação preservada |
| Falha/cobertura incompleta | Fixture com uma cidade incompleta em um grupo, mantendo avisos/retry/exportação da política atual |

**R1:** extrato interno de até12páginas da dupla Canela+Gramado3T2026, escolhidas por família no manifesto real: identidade/grupos, duas curvas,12meses, comparação/tabela de fechamento, preço agrupado, extremos por unidade, quadroVGV, horizontal e composição anual. CSV abrange todo o modelo, não somente páginas do extrato. Usar janela exata dos insumos; não usar4T2025/2T2026 como validação de3T2026. Não criar redução pública do estudo.

**R2:** produzir somente se R1 não cobrir um risco demonstrado: três grupos, cidade versus região, nome longo, negativo/base zero, falta de cobertura ou unidade horizontal. Usar fixture sintética identificada; até8páginas dirigidas. Não gerar outro deck inteiro por precaução. Regressões numéricas de2T2026/4T2025 são obrigatórias, mas não exigem dois PDFs completos.

Conferir tela/PDF/PPT/CSV sobre o mesmo snapshot. Renderizar todas as páginas dos extratos, inspecionar sobreposição, corte, nomes, cores, variações e legibilidade; verificar conteúdo do CSV contra G1. Abrir PPT no PowerPoint, editar título/nome e valor de célula em cópia, salvar/reabrir e verificar aparência. Os gráficos permanecem imagens aprovadas e não recalculam quando o analista edita texto. Se Office estiver indisponível, declarar essa prova pendente e fornecer o arquivo/roteiro; não simular aceite de edição.

Medir no replay: chamadas por cidade, recomposições por alteração de grupos, tempo de projeção/renderização e páginas por família. Comparar ao consolidado com os mesmos insumos; reportar observações, sem meta inventada de segundos. Confirmar que não há re-coleta/duplicação de fatos e que cancelar/repetir não mistura snapshots.

**Saída:** evidência pequena versionada com comandos/resultados/matriz/manifests/hashes; brutos, renders, scripts temporários e exportações em `.local-inputs/`. **Aprovação local:** modelos e saídas coerentes, sem perda numérica/territorial, regressões obrigatórias aprovadas e exceções reais explicitadas. Não antecipar homologação de Teresa/Finoti.

### G7 — Publicação autorizada e aceite externo

1. Apresentar commits locais isolados, divergência atualizada com cada remoto, pendências e resultados G0–G6. Pedir autorização antes de integrar árvore suja e antes do push; não herdar autorização de publicação da barra ou de entrega anterior.
2. Após autorização, integrar preservando alterações, repetir checks afetados e executar `npm run check:live-docs -- <base> <head>`. Push não é publicação verificada no Lovable.
3. Gabriel publica e gera: Canela+Gramado comparativo na janela das referências atuais; consolidado regional homologado; cidade versus grupo para validar o editor. Registrar quais casos foram efetivamente ensaiados e os arquivos retornados.
4. Conferir saída real PDF/PPT/CSV, composição dos grupos, cobertura, fontes e aparência. Resolver discrepância entre replay e site antes de anunciar a ampliação como pronta.
5. Preparar resposta curta para Teresa/Finoti, com o que mudou e os limites práticos de edição; homologação desta ampliação somente com evidência de aceite. Não enviar mensagens automaticamente.

## 5. Evidências, commits e critérios de encerramento

Atualizar neste documento o estado de cada portão, SHA, arquivos, decisões e links da evidência. Não criar uma segunda lista viva de regras ou copiar o diário pessoal para o projeto. A revisão03/11 mantém comentários/referências; este plano mantém execução. Cada portão produz commit isolado com `git add` explícito, sem incluir materiais brutos ou edições paralelas do LIVE.

Unidades sugeridas de commit: contratos/projeções; editor/cache; gráficos/tabelas compactas; famílias específicas/horizontal; composições anuais; exportação/evidências. Separar documentação quando necessário, sem alegar que todo portão precisa de código novo. Sem commit contendo alterações de Corretor, Sinduscon ou SP produzidas por esta sessão.

Encerramento exige: recorte sem cidades pré-selecionadas; grupos cobrem a seleção exatamente; dados municipais/grupos/consolidado reconciliam; três famílias anuais publicam somente com universo suficiente; relatório não é replicado integralmente; PDF/PPT mantêm aparência e identificação corretas; auditoria rastreia membros/fontes; regressões locais passam; comportamento do site é observado após publicação; aceite externo registrado separadamente. Pendências de origem ou de acabamento do analista não viram alterações silenciosas de regra.

## 6. CTA original de execução (G0–G6, histórico)

Para a próxima rodada, usar o CTA dos portõesI0–I4 no final deste documento, sem refazer a implementação já concluída.

Execute `docs/features/Relatorios Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md` pelos portões G0–G6, respeitando T01–T07 e D01–D14. Implemente consolidado ou comparação de até três cidades/grupos explícitos, reutilizando a mesma coleta, incluindo as famílias horizontais e as três composições anuais previstas. Preserve dados, alertas, contratos de cálculo, aparência aprovada do PPT híbrido e alterações paralelas; não modifique Corretor, Sinduscon ou outras features. Demonstre cidade → grupo → consolidado antes dos ajustes visuais. Execute testes focados/regressões offline2T2026/4T2025, gere primeiro R1 curto da dupla1T2023–3T2026 com insumos exatos locais e R2 somente para lacunas comprovadas; verifique PDF/CSV e edição real no PowerPoint. Não faça coletas reais/estudos reais, integre árvore suja ou faça push sem autorização. Registre evidências/decisões, crie commits isolados e apresente divergência, resultados e pendências para autorizar G7. Não antecipe homologação externa.

## Execução — G0 em05/11/2026

Ativado por Gabriel. Baseline local `d92e73f`, origin seis commits novos de SP sem sobreposição no código do Panorama; integração não efetuada nem presumida. Dois commits documentais locais anteriores, árvore paralela preservada. Desenvolvimento independente autorizado segue na base local; integração e validação pós-integração permanecem requisito pré-publicação. Onze modelos offline recompilados/aprovados antes das alterações, incluindo dupla1T2023–3T2026 exata e regressões2T2026/4T2025;37arquivos exatos já presentes. Fontes/SHAs/totais em `.local-inputs/panorama-territorial-2026-11-05/G0.json`. Sem coleta real. PróximoG1: partição e projeções numéricas; layout não iniciado.

### G1 — Reconciliação antes da interface

Contratos e projeções implementados, sem alteração visual: `territorial-presentation.ts` valida partição e separa identidade de coleta/apresentação; o mesmo construtor numérico produz as projeções, sem guardar relatórios completos recursivos. Lançamentos do cubo compartilham uma única função; fatos brutos continuam nas sessões existentes. Recomposição usa entradas privadas emWeakMap, sem rede. Tipos aditivos compatíveis com snapshots anteriores.

Onze modelos offline recompilados após a mudança, mantendo `launches/sales/stock/ivv/prices/cube/granular/closingFacts/reconciliation` iguais à baseline. Dupla exata3T2026: Gramado218empreendimentos/6172capacidade/1269estoque + Canela96/3100/302 =314/9272/1571. Matriz desta dupla:2644match,0different,2374unavailable (ausência de observação/categoria não tratada como igualdade ou zero). Linhas incluem cidade→grupo e cada grupo→seus membros, por período/segmento/padrão/tipologia e fonte. Relatórios/matrizes brutos em `.local-inputs/panorama-territorial-2026-11-05/after/`; resumoG1-summary.json. Ausência de contraparte dimensional não é nova divergência crítica nem cria novo bloqueio de exportação.

Testes focados iniciais:7territoriais aprovados e11reconciliações existentes aprovadas; tipos globais aprovados. Fixture original de seleção livre não tinha registros de lançamento, então a bancada territorial passou a construir fatos coerentes a partir de sua própria fixture antes de comparar; não alterado o comportamento da baseline/produção para fazer o teste passar. Controle adicional com pesos municipais diferentes verifica preço agregado independente. Nenhuma coleta real, interface, integração ou push. G2segue após o teste adicional de preço.

### G2 — Estado/editor/cache e integração autorizada

Merge autorizado por Gabriel e realizado em `8d3eaec`, incorporando seis commitsSP sem conflito; seis documentos locais guardados/reaplicados e stash mantido, insumos/Corretor intocados. ContratoG1 em `29d6e84`. Editor adiciona sugestão de comparação para2/3cidades, modo consolidado, nomes até60caracteres e associação explícita sem perda. Grupos manuais preservados em mudanças compatíveis, cidade nova fica sem atribuição. Resultado anterior some ao editar. Fonte coletada é reutilizada por chave física+token privado, recomposição sem API; troca de autenticação invalida a referência. Onze testes focados (8contratos/3seleção) e tipos aprovados; renomear e voltar ao consolidado comprova1coleta/2recomposições. Conferência visual e estados do navegador ficam noG6.

### G3–G5 — Comparações, quadros específicos e composição anual

Implementadas curvas até3unidades, variações por unidade com diferença absoluta em base não positiva, tabelas compactas quantidade/% por território, barras de preço e médias próprias. Grupos compostos não plotam ponto como completo quando falta observação municipal. Famílias densas (matriz, extremos, VGV e horizontal) usam projeção e cubo realmente filtrados, IDs família+unidade e paginação contínua; mapas/maturidade continuam consolidados. Uma comparação de coorte substitui a ausência do quadro duplicado removido, sem restaurar55/56 redundantes. Layout aprovado/híbrido preservado; sem voltar ao PPT nativo.

Composição anual de empreendimentos/unidades/VGL usa categoria histórica do lançamento e mesmos fatos quantitativos homologados.310/314empreendimentos verticais da fonte exata têm padrão na competência do lançamento; quatro preservados como desconhecidos, sem classificação atual imposta ao passado. Categorias canônicas, sem rotular Econômico como programaMCMV. Colunas100% somente para universo positivo/completo; anos omitidos e valores brutos ficam na auditoria/avisos. Não incluída composição de vendas. Referências antigas não são valores-alvo.

33testes focados aprovados em7arquivos, incluindo controles de estoque/preço, negativos, ausências, classe no lançamento versus futura, CSV e manifesto. Tipos aprovados. Corrigida expectativa desatualizada do teste de manifesto: já excluía documental74 emprodução, mas esperava69/70 em vez de68/69; regra de exclusão não alterada. Confirmação visual/Office e replay final ficam noG6; portões G3–G5 só serão encerrados após esse ensaio local. Sem coleta real/push.

### G6 — Evidência final local e limites de G7

[Evidência compacta versionada](EVIDENCIA_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.json), com hashes dos extratos, testes, tempos, provaOffice e cobertura. Brutos/matrizes/capturas estão em `.local-inputs/panorama-territorial-2026-11-05/`, ignorada. Não houve nova coleta nem estudo real; todas as chamadas de replay foram interceptadas para ler os insumos existentes.

- **Números:**11replays com campos canônicos iguais à baseline;30218linhas de conferência territorial:14844match,0different,15374unavailable. Ausência de observação/categoria não vira igualdade nem zero. Dupla3T2026:314empreendimentos/9272capacidade/1571oferta final, conformeG1. Recomposição19–155ms nesta máquina,0leituras adicionais de fonte; não é promessa de desempenhoAPI/produção.
- **Classificação anual:**310/314verticais têm padrão na competência do lançamento; os quatro ausentes estão fora da janela1T2023–3T2026. Portanto a composição desta janela tem0não classificados; o caso desconhecido continua coberto por teste. Famílias anuais mantêm os padrões canônicos, sem equivalência presumidaEconômico/MCMV.
- **Checks:**78testes aprovados,0falhas,1opcional antigo ignorado (compilação de snapshots; onze replays explícitos executados). Treze testes dirigidos reaprovados após o ajuste final de rótulos/recomposição. Tipos e build aprovados; lint dirigido0erros/4avisos anteriores do ReportPaginator. Advertências anteriores de Browserslist/chunks e tamanhoLIVE não corrigidas nesta feature.
- **Editor:**1440/390px, claro/escuro, partição incompleta, grupo vazio, nomes longos, associação válida e controles desabilitados na simulação conferidos emChromium; sem overflow/erroJS. A bancada isolada teve importESM incorreto na primeira tentativa, corrigido apenas no insumo local, não no app. Testes da página real verificam1coleta/2recomposições ao renomear e voltar ao consolidado.
- **R1:**12páginas, Canela+Gramado1T2023–3T2026 exato, PDF/PPT/CSV.75páginas no manifesto completo, não exportado como estudo real. Extremos por cidade, curva/12meses, tabela, preço, VGV, horizontal e composição anual incluídos. CSV5865linhas/5018conferências,0diferenças. Cabeçalhos anteriores preservados e novos campos adicionados ao final.
- **R2:**8páginas exclusivamente sintéticas para5cidades em3unidades, com cidade versus grupo, nome longo e negativo. Manifesto completo74páginas após omitir estrutura sem estoque; CSV1655linhas/1584conferências,0diferenças. Não é reprodução numérica do PDFLajeado antigo.
- **PDF/PPT:**20páginas dos extratos renderizadas e inspecionadas; sem corte de tabelas/header ou objetos fora doOffice. PowerPoint abriuR1/R2; título e valor de célula editados em cópia, salvos/reabertos com persistência. Gráficos permanecem imagens, conteúdo textual/células editável por caixas; não há recalculadora nativa de tabela nem gráfico nativo. Ajustados rótulos dos gráficos emunidade responsiva após conferir export1920px, preservando zero/negativo. Capa e metodologia mostram grupos/membros; mapas/maturidade/anuais explicitam consolidado. R1/R2finais e prova de edição estão na pasta local citada.
- **Omissões:**colunas percentuais sem denominador e categorias de preço sem observação integral não aparecem; zeros observados permanecem. Quadros específicos sem estrutura publicável geram aviso e registro, sem lâmina vazia. Não afrouxadas guardas/exportação; eventuais diferenças territoriais novas entram na política atual de consistência, com alerta/CSV.

**Portões:**G0–G6concluídos localmente. Não há deltas territoriais inexplicados; lacunas de observação seguem explícitas, sem preencher a base. Publicação/Lovable, ensaio autenticado e aceite desta ampliação continuam pendentes noG7. A aprovação da revisão anterior não é aceite da comparação nova.

**Git:**merge inicial autorizado `8d3eaec` preservou a árvore paralela; stash de segurança mantido. Chegou depois `4aed591` deSP (período atual e textos institucionais editáveis), não integrado. Apresentar commits locais/divergência e pedir autorização antes dessa integração e do push. Uma aprovação automática falhou por créditos do workspace ao tentar atualizar os extratos; ação não executada naquela tentativa. Após pedido de continuação, revisão normal autorizou a retomada; não houve contorno da aprovação.

### Roteiro de conferência no site após publicação autorizada

1. FIERGS: entrar sem cidades, selecionarGramado/Canela e1T2023–3T2026. Conferir sugestão de comparação, legendas, valores por cidade e consolidação na auditoria; baixarPDF/PPT/CSV.
2. Alterar nome/agrupamento e gerar novamente: confirmar recomposição sem refazer coleta e que exportação corresponde ao recorte efetivamente gerado. TrocarUF/entidade limpa os grupos.
3. Gerar consolidado regional completo em2T2026ou4T2025, confirmando identidade oficial e regras anteriores; não exigir comparação quando não desejada.
4. Selecionar conjunto maior e definir cidade versus grupo (ou3grupos): cada município deve estar atribuído uma vez. Conferir preços ponderados, percentuais próprios, páginas horizontais e composição anual consolidada.
5. Devolver arquivos para conferência; só depois preparar resposta externa e registrar aceite. Notas de relevância textual e eventual exclusão de página pelo analista continuam noPPT editável, sem editar números para concordar com imagens antigas.


## Revisão visual após conferência de Gabriel — 05/11/2026

O primeiro PPT territorial alterou indevidamente a composição aprovada: título corrido, quadro anual no rodapé e comparativos textuais. O retorno reabriu a conferência visual de G3/G6; a reconciliação numérica G1 permanece válida. Corrigido no próprio template compartilhado, sem recuar a separação por cidades/grupos.

- Séries temporais reutilizam `panorama-fiergs-quarterly`: título preto em blocos, qualificador verde, quadro anual no alto à direita, série à esquerda e comparativos em barras azuis à direita. Quadro anual mantém uma linha colorida por unidade. Destaques dos trimestres equivalentes acompanham a cor da série; texto preto no amarelo.
- O marcador `FiergsPointValue` foi extraído e reutilizado pelo consolidado e pelo comparativo; não há importação circular. Consolidado mantém valores e aparência anteriores. As demais famílias novas usam a mesma hierarquia de título e margens, preservando tabelas/textos editáveis e gráficos em imagem no PPT híbrido.
- R1 atualizado:12páginas, Canela+Gramado1T2023–3T2026, insumos locais exatos. R2:8páginas sintéticas para três unidades e nomes longos. Vinte páginas PDF e PowerPoint renderizadas; arquivos abrem, texto/célula editados em cópia e persistidos ao salvar/reabrir, sem objetos fora. Capturas e saídas substituídas na mesma pasta local, hashes atualizados na evidência JSON vinculada.
- CSV dos dois extratos idêntico byte a byte à rodada anterior; nenhum cálculo, coleta, cidade ou grupo alterado. Quinze testes focados passaram; tipos/lint conferidos. Comparações sem cobertura/atividade continuam omitidas, sem gerar percentuais inválidos ou inventar barras de zero.
- Estado: correção visual validada localmente, pendente da conferência de Gabriel e ensaio publicado. Sem nova coleta, integração, push ou aceite externo. Fetch:origin/main219ed1c com dois commits SP não integrados; preservar árvore paralela.

### Composição anual contínua — retorno de Gabriel em 05/11

Substituídas somente as colunas empilhadas por áreas empilhadas lineares, como na referência Finoti. Categorias, percentuais, cores, legenda e indicação de ano parcial preservados; anos sem composição publicável mantidos como lacunas, sem interpolação entre observações ausentes. Rótulos percentuais centralizados nas respectivas faixas; ajuste de alinhamento do último ano impede corte da competência parcial. Aplica-se às três métricas da composição anual. ExtratoR1 atualizado offline, sem API/integração/publicação; demais lâminas preservadas. Gabriel continuará os testes antes de decidir incorporação ao relatório publicado.


## Incorporação ao relatório publicado — revisão final e plano I0–I6 (05/11/2026)

### Resultado da revisão final

**Parecer:** a solução atual atende ao pedido central de Finoti de distinguir cidades em gráficos e algumas tabelas e à orientação de Teresa de tratar regiões agrupadas. Está suficientemente próxima das referências para avançar à incorporação, com os acabamentos e verificações abaixo. Isso é avaliação técnica da sessão, não previsão de aceite nem nova homologação externa. A aparência trimestral foi corrigida em `91e3194`; a composição anual contínua, em `3cee42b`. Gabriel considerou que a primeira melhorou e corrigiu o formato da segunda; não houve aceite de produção da ampliação.

ConectorDrive relistado nesta revisão: mesmos17IDs/nomes/tamanhos, 15PNG e doisPDFs;17hashes locais conferidos contra o manifesto original. Isso confirma o conjunto de referências preservado, não um novo download/hash dos bytes remotos. Os15PNG e as147páginas dos dois panoramas foram revisitados em pranchas; R1/R2 atuais também. A prancha finalR1 usa a página anual em áreas. Metadados da releitura e pranchas em `.local-inputs/finoti-comparativos-2026-11-05/final-review-drive-list.json` e `.local-inputs/panorama-territorial-2026-11-05/renders/*review-final-grid.jpg`.

**Fato importante:** a ampliação já está conectada à página real no código local: `PanoramaSecoviFiergsPage` usa o editor e recompõe o modelo; `panoramaManifestFor` aplica as transformações territoriais e anuais; `ReportPaginator` seleciona os componentes; os exportadores híbrido/PDF usam esse mesmo conteúdo. Não se trata de copiar slides de uma bancada isolada para outro motor. A incorporação exige encerrar os acabamentos, conferir a rota completa, integrar o remoto autorizado e publicar; não reconstruir a feature nem repetir sua coleta.

### Matriz de aderência às referências

As referências e números são de4T2025; R1 é de1T2023–3T2026. Comparar estrutura, identidade e bases, nunca obrigar os valores atuais a repetir imagens antigas. Índices abaixo apontam para os arquivos/páginas da fonte, não são números estáveis de slides futuros.

| Pedido/referência | Resultado atual | Tratativa para incorporar |
|---|---|---|
| E-mailFinoti: cidades separadas; image.png e image(2)/(4) | Curvas por cidade e variações próprias, sem somar curvas para esconder a cidade | Manter duas/três unidades explícitas e identidade consistente entre tela/PDF/PPT/CSV |
| image(1)/(3)/image[53]:12meses | Curvas e comparativos12meses por unidade | Verificar vendas e VGL/VGV além do exemplo de empreendimentos doR1 |
| Teresa: poucas cidades separadas; Lajeadop2 versus RMp2/7 | Consolidado ou2/3cidades/grupos; nomes/membros explícitos | Testar rota com uma cidade, dupla, três cidades, cidade versus grupo e região consolidada |
| Comparativo semestral nas imagens | Comparativo de trimestre e acumulado equivalente da janela/fechamento, por unidade | Manter regra contextual: em3T o acumulado é9meses; não fixar semestre por causa da referência4T2025 |
| image(5):estoque temporal | Fonte e seleção territorial implementadas como fotografia | Inspecionar esta família em extrato curto complementar; estoque não soma meses/anos |
| image(6)/image[51]; Lajeadop50–52 | Tabela única com oferta e participação dentro de cada unidade | Confirmar padrão/coorte, além da tipologia já vista; zero observado preservado |
| image(7)/image[67]; Lajeadop44/46/48 | Barras por território e médias próprias no texto | **Parcial visual:** acrescentar linhas de média por território, se observadas, com rótulo e mesma cor; preservar ponderação já conciliada |
| image(8)/(9); Lajeadop53–56 | Matrizes/extremos específicos por unidade | Manter páginas próprias apenas nas famílias densas, sem multiplicar o estudo inteiro |
| image(10)/image[27]:VGV por cidade | Quadros específicos por unidade, com fonte/cubo filtrados | Conferir as duas unidades, títulos e unidades monetárias no fluxo real |
| Lajeadop62–67:horizontal separado; RMp63–66:regional | Famílias horizontais desdobradas no comparativo; consolidado preservado | Manter condomínio de casas dentro de horizontal; testar grupo com/sem produtos, sem página vazia |
| Lajeadop15/20/26; RMp10/13/21:composição anual | Áreas100% contínuas consolidadas para empreendimentos/unidades/VGL | Conferir as três métricas, lacunas e ano único; janela anual explícita no subtítulo |
| RMp25:composição de vendas | Não implementada | Fora desta entrega: percentuais100% de vendas líquidas podem ter negativos; exige contrato próprio, não copiar gráfico antigo |
| Categorias históricas e faixas monetárias nas referências | Taxonomia autoritativa atual/histórica preservada | Não inferir MCMV pelo preço nem fundir padrões para imitar legenda antiga |
| Comentários narrativos das referências | Não gerados automaticamente | Continuam acabamento do analista noPPT, assim como remover slide pouco relevante; não inventar interpretações |
| RM mapas/maturidade/institucional | Consolidados, identidade territorial explícita e artes atuais | Manter23anos/sem documentário removido; não retornar às artes22anos dos exemplos |
| Quadro anual doR2 sem comparações válidas | Aparece com cabeçalhos e apenas traços em parte das famílias | **Correção objetiva:** não renderizar esse quadro quando não houver comparação válida; não omitir zeros da série nem a página inteira |

O limite de três unidades, barras laterais azuis por cidade e categorias canônicas são adaptações de automação/legibilidade acordadas com Gabriel, não cópia literal das imagens. Composições anuais, mapas e maturidade permanecem consolidados e identificados assim. Caso Finoti peça depois desdobrar também essas famílias, é ampliação de contrato; não presumir que toda página precisa virar comparação.

### I0 — Congelar a candidata e a fronteira com a versão live

**Estado: concluído localmente em 06/11/2026.**

AberturaHEAD`c547ab7`, origin`219ed1c`, main12locais/2remotosSP; árvore paralela preservada, sem merge. Congelados hashes dos extratos e campos canônicos de11modelos em `.local-inputs/panorama-territorial-2026-11-05/incorporation-2026-11-06/I0.json`. Versão/rota autenticada publicada não verificada nesta sessão; ensaio humano continua noI6.

1. RelerAGENTS, AGORA e esta seção; confirmar `main`, todos os remotos, `git fetch --all`, divergência e árvore. Baseline desta revisão:HEAD`3cee42b`, origin`219ed1c`,11commits locais/2remotosSP não integrados. Registrar a lista efetiva no início da execução, sem depender destes contadores históricos.
2. Preservar edições paralelas dos documentosFIERGS, Estimativas, LIVE e insumos não rastreados, incluindo Corretor; não alterar códigoSP/Sinduscon/Corretor/Dashboard/Validação/ExcelAPI. Não rebase/reset, descarte ou stash amplo da árvore.
3. Congelar hashes deR1/R2/CSV e os campos canônicos dos11replays já disponíveis. Usar a evidência JSON existente, sem novo relatório de diagnóstico paralelo. Registrar os commits da candidata e mudanças remotas; integração fica emI5, após autorização explícita.
4. Conferir o que está efetivamente publicado pela identificação da versão/commit e pelo comportamento da rota autenticada. Se o ambiente não for acessível, registrar “não verificado em produção”; origin não prova versão noLovable. Não gerar estudo real por iniciativa do agente.
5. Manter arquivos de insumo/saída em `.local-inputs/`, código/evidência pequena/plano noGit. Preservar stash de segurança da integração anterior até confirmar seu conteúdo reaplicado.

**Saída/portão:** inventário candidato versus remotos/ambiente e insumos reproduzíveis; nenhuma integração ou publicação presumida. Este passo não refaz G1 nem exige API.

### I1 — Fechar os acabamentos identificados na revisão

**Estado: implementado e validado localmente em 06/11/2026.**

Médias já ponderadas recebem linhas tracejadas e rótulos distribuídos para evitar colisão, inclusive quando próximas; barras têm largura máxima. Quadros/colunas anuais sem comparação válida foram filtrados por seletor único, com aviso agrupado `TERRITORIAL_ANNUAL_COMPARISONS_OMITTED`, também noCSV. Ano único usa faixa horizontal100%; áreas não conectam lacunas e observações anuais isoladas recebem faixa estreita/rótulo legível. Composição anual informa a janela completa. Teste com3unidades/seispainéis revelou corte, corrigido dividindo a altura disponível; hierarquia de títulos de preço preservada. Dados não foram alterados. Treze testesI1/seleção passaram, tipos/lint e navegador offline; prova de arquivos e regressão final emI3/I4.

1. **Médias visuais de preço:** em `TerritorialComparisonSlides.tsx`, usar as médias já fornecidas por `territorialPriceRows`. Inserir referência horizontal tracejada por unidade com nome/valor/unidade e cor da curva/barra. Com2/3linhas iguais/próximas, evitar rótulos sobrepostos (deslocar rótulos ou reunir nomes no mesmo nível); conservar resumo textual acessível. Média indisponível não vira zero/linha. Não recalcular por média simples das médias municipais. Garantir domínio do gráfico comportando referência válida; revisar ticket eR$/m² por padrão e tipologia e respectivas regras temporais aprovadas. Manter o mesmo gráfico em imagem noPPT híbrido.
2. **Quadro anual sem comparação:** calcular primeiro os pares anuais realmente publicáveis, com `observedComparison` e cobertura compatível. Retirar colunas de anos sem comparação para nenhuma unidade; se não restar nenhuma célula comparável, retirar apenas o quadro anual e preservar o espaço/hierarquia do cabeçalho. Não retirar valor0observado da série, esconder negativo ou gerar percentual sobre base0/negativa. Registrar a não aplicabilidade no mecanismo existente de avisos/auditoria por tipo, sem notas noPDF/PPT.
3. **Ano único na composição:** `annualCompositionPublishable` hoje aceita um único ano pronto. Área com um único ponto não representa uma faixa visível adequada. Para exatamente um ano publicável, usar uma única faixa horizontal100% por categoria, com ano/percentuais explícitos, preservando a informação e sem inventar um segundo ano. Para dois ou mais anos, manter área empilhada linear e lacunas. A ligação entre os pontos é visual: não representa observações intermediárias nem uma série mensal estimada. Se o espaço temporal tiver anos inválidos entre válidos, não conectar as áreas através deles nem normalizar ausência como0; testar DOM/SVG e exportação, não apenas o cálculo.
4. **Identificação anual:** subtítulo das três composições deve explicitar a janela efetivamente analisada e o consolidado; o gráfico já marca o ano parcial. Ajustar `ReportPaginator`/`analyticContext` pela propriedade `annualCompositionMetric`, evitando depender só de regex em título. Exemplo desta bancada:consolidadoGramado+Canela,1T2023–3T2026; não identificar a série anual apenas como3T2026.
5. **Densidade real:** conferir três unidades com seis comparativos válidos, nomes longos e rótulos próximos. O R2anterior não prova isso: vários comparativos foram corretamente omitidos por falta de atividade/cobertura. Corrigir apenas espaçamento/tamanho/alinhamento se houver sobreposição; não criar nova página automática nem redesenhar o template aprovado. Se uma página tiver só uma categoria, largura de barras legível, não barra gigante ocupando o quadro inteiro.
6. Preservar título preto/verde, quadro anual superior, barras laterais, cores estáveis por unidade, destaque de trimestre equivalente e fonteGeobrain. Respeitar SystemDesign existente, sem tokens novos. Manter textos/tabelas editáveis, sem reativar gráficos nativos no produto.

**Arquivos-alvo:** `components/TerritorialComparisonSlides.tsx`, `AnnualCompositionSlide.tsx`, `ReportPaginator.tsx`, `report/territorial-selectors.ts` somente se faltar metadado visual, `generation-notices.ts`, `editorial-contracts.ts` e `print/territorial-comparison.css`; testes focados existentes. Não modificar números do modelo para ajustar apresentação.

**Aceite:** médias visuais identificadas, quadros anuais vazios ausentes com aviso rastreável, ano único visível, lacunas não ligadas, janela correta e seis painéis sem corte. CSV/campos canônicos idênticos ao congelado, salvo metadado de aviso explicitamente esperado. Commit isolado de acabamento com evidências.

### I2 — Validar a integração da rota, do manifesto e das saídas

**Estado: concluído localmente em 06/11/2026.**

Quatro testes novos em `territorial-route.test.tsx` montam a página real, projeção real, paginator/manifesto/avisos reais e coletor simulado. Cobrem seleção inicial vazia,1/2/3cidades, conjunto maior e cidade versus grupo(1+3), partição inválida, carregamentoBrain, falha sem relatório parcial, Secovi municipal e passagem do mesmo modelo/manifesto aoPPT. Renomeação recompõe com uma única coleta, mantendo o contexto também noCSV. A integração local existente estava correta; nenhuma alteração adicional da rota/coletor foi necessária. Evidência `incorporation-2026-11-06/I2-route-tests.json`; jsdom usa entradas geográficas/Select simplificadas, sem autenticação de produção.

1. Executar a rota real doPanorama com respostas locais/mocks: seleção inicialmente vazia, UF obrigatória, cidades monitoradas, carregamentoBrain e estados vazio/erro. Confirmar que os novos componentes não dependem doHTML de bancada.
2. Preservar contrato atual de apresentação:uma cidade=municipal;2/3=sugestão de comparação individual com opção consolidado;maisde3=consolidado padrão, comparação somente após2/3grupos explícitos e válidos. Não criar limite de coleta3nem agrupamento geográfico automático. Município pertence a exatamente um grupo; nomes não definem membros.
3. Identidade física da coleta separada da editorial. Renomear/reagrupar altera resultado/identidade do arquivo e recompõe sem rede; escopo/período/token diferentes não podem reutilizar resultado inadequado. Campos de grupo desabilitados durante coleta, resultado anterior invalidado ao editar. Verificar uma coleta e múltiplas recomposições, sem buscar novamente por slide.
4. Percorrer `panoramaManifestFor` completo e a seleção usada por preview, auditoria e downloads. UsarIDs estáveis de família+unidade, nunca número fixo de página. Confirmar ordem de lançamentos/anuais/vendas/oferta/preços/horizontal/mapas, sumário contínuo, sem repetir páginas equivalentes ou deixar divisor órfão. A inserção das três composições consolidadas é intencional mesmo no modo consolidado quando houver dados publicáveis; não é regressão por aumentar3páginas. Se uma métrica não for publicável, explicar no aviso, sem espaço vazio.
5. Consolidado regional mantém indicadores, universo horizontal e artes homologadas; comparação desdobra somente famílias previstas na matriz. Não replicar o estudo inteiro por unidade. Arquivo/capa/cidades/metodologia/avisos/CSV precisam refletir o recorte gerado e seus grupos, não o preset antigo.
6. Checar FIERGS eSecovi, conformeD01, inclusive ausência deescopo.presentation em snapshots antigos. Sem migração de banco ou endpoint novo. Caso formatos locais persistidos existam, testar compatibilidade e invalidar apenas cache que comprovadamente perdeu contexto; não limpar sessão/dados sem necessidade.

**Aceite:** teste offline da página real confirma editor→coleta única→recomposição→manifesto→export com o mesmo contexto; nenhuma dependência exclusiva da bancada. Corrigir lacunas reais em commit próprio, sem reescrever integração funcional.

### I3 — Regressão proporcional e reconciliação final

**Estado: concluído localmente em 06/11/2026.**

79testes aprovados/0falhas/0ignorados em11arquivos, incluindo os4novos da rota; tipos, lint dirigido e build final de produção aprovados. Uma expectativa textual antiga diziaGeoBrain, corrigida para a grafiaGeobrain já usada/aprovada no produto; cálculo doIVV não mudou. Avisos anteriores deBrowserslist/chunks/importxlsx mantidos. Primeirobuild passou em33,97s; repetido uma vez após dois acabamentos visuais efetivamente encontrados nos extratos, final24,77s.

Onze replays exclusivamente offline, incluindoFIERGS2T2026/4T2025 e dupla exata1T2023–3T2026:9blocos canônicos por modelo idênticos ao congelado. Confirmada ausência de nova chamada de fonte na recomposição. Para conferirCSV sem confundir o formato antigo deG1(67colunas) com o já vigente(69), recompilada a candidata `c547ab7` viaoverlay de leitura dos blobsGit, sem checkout/merge/alteração da árvore; mesmos11insumos. Resultado:11CSVs semanticamente iguais, ignorando somente `gerado_em`;0linhas numéricas/removidas/alteradas e0avisos adicionais nesses recortes. O novo aviso de quadro anual omitido foi exercitado pela fixtureR2, sem adulterar dados reais. Evidências locais:I3-tests.json, I3-canonical-comparison.json, baseline-head/ e replayed/.

1. Testes focados de partição/cache/recomposição, projeções e selectors, comparativos, composição anual, avisos/manifesto e exportação híbrida. Cobrir:1/2/3unidades, município versus grupo com pesos diferentes, inválido/duplicado/semcidade,0/nulo/negativo, basepercentualnão positiva, fechamento incompleto, um ano, lacuna anual e três médias próximas.
2. Reaproveitar os11replays locais e seus insumos, obrigatoriamenteFIERGS2T2026/4T2025 e a dupla exata1T2023–3T2026. Reexecutar uma vez após os acabamentos/integração que os afetarem; não coletar novamente para repetir uma regressão. Matriz cidade→grupo→consolidado:quantidades/valores compatíveis conservados, estoque por competência, preços/IVV ponderados ou recalculados corretamente. Ausência não é igualdade nem0. Divergência crítica nova/inexplicada interrompe o portão, sem afrouxar guardas nem fixar números.
3. Comparar campos canônicos antes/depois e hashesCSV; novos avisos/metadados ou número de páginas terão diferença intencional descrita separadamente. Não comparar médias por soma de territórios. As referências4T2025 não substituem a baseline atual3T2026.
4. `npx tsc --noEmit -p tsconfig.app.json`, lint nos arquivos tocados e build de produção; um build final após as alterações/integração relevante, sem repetir build longo a cada ajusteCSS. Registrar avisos já existentes separadamente de erro novo. Testes amplos repetidos apenas se houver falha/alteração que justifique.

**Aceite:** nenhuma divergência numérica nova; testes proporcionais/tipos/build sem erro novo. Guardas e política de alertas mantidas. Registrar na evidência JSON existente testes efetivamente executados, contadores e limites; não reciclar resultado antigo como novo.

### I4 — Prova visual curta e edição real

**Estado: concluído localmente em 06/11/2026.**

Cinco extratos curtos,34páginas no total: R1exato12; R1extra12apenas das famílias antes não renderizadas; R2sintético8com3unidades ativas/seispainéis e médias próximas; anoúnico1; lacunaanual1. ArquivosPDF/PPT/CSV nos mesmos diretórios locais; nomes ehashes em `incorporation-2026-11-06/I4-exports.json` e evidênciaJSON versionada. Complemento cobre12meses de vendas/VGL/VGV, estoque/IVV, oferta por padrão/coorte, ticket/preço por tipologia e empreendimentos/VGL anuais. Não houve estudo real completo nem API.

Todos os extratos sem páginas ausentes/erroJS/overflow de tabela/cabeçalho no navegador. PDFs renderizados, PPTXML parseado e34páginas renderizadas noPowerPoint;0objetos fora,0gráficos nativos. Texto e valor de célula editados somente em cópia, salvos/reabertos com persistência. Inspeção individual final confirmou bordas dos rótulos na lacuna e título preto/verde nos tickets; apenas esses13slides foram reexportados/reconferidos após o ajuste final. Ano2024incompleto permanece branco no centro da lacuna, com teste de pixel; observação isolada2023 mantém sua faixa/rótulo, sem ligação ao dado2025. Dados deR2/estados anuais são sintéticos e não validam numericamenteLajeado.

Limites: a bancada exporta os componentes reais; teste de rotaI2confirma o caminho de integração com entradas simuladas. Autenticação/publicação/gerações reais são doI5/I6. A edição doPPT se limita a textos/células; gráficos continuam imagens, conforme contrato híbrido.

1. ReutilizarR1exato; extrato complementar apenas para lacunas demonstradas:ticket eR$/m² com médias, estoque/IVV por cidade, vendas/VGL/VGV12meses, oferta por padrão/coorte, composição de empreendimentos/VGL e subtítulo anual. Não exportar todo o estudo real para verificar um detalhe. Selecionar o menor conjunto que cubra todos os componentes distintos.
2. AmpliarR2sintético apenas com páginas de três unidades ativas/seis painéis, médias iguais/próximas, ano único e lacuna anual. Dados sintéticos ficam identificados nos insumos/evidência e jamais aparecem como estudo realLajeado. Não modificar snapshots reais para simular uma concordância com oFinoti.
3. Conferir no navegador e nos arquivosPDF/PPT:hierarquia, nomes, cores, competência, sinais, textos, quadros, fonte e margens; verificar versão1920×1080doexportador e não apenas preview960px. Capturas de cada família e verificação de objetos fora noOffice.
4. Abrir oPPT noPowerPoint, renderizar páginas alteradas, editar texto e célula em cópia, salvar/reabrir e confirmar persistência. Gráficos em imagem e tabelas em caixas editáveis permanecem contrato; não afirmar edição nativa de gráficos/fórmulas.
5. AtualizarR1/R2 e hashes no mesmo diretório local/evidência JSON, sem proliferar documentos/ativosprodutivos. Só regenerarR2se alterado ou necessário; CSV confirma o mesmo cálculo. Documentar diferença intencional de manifestação/aviso.

**Aceite:** artefatos curtos finais conferidos, nenhum corte/sobreposição nas famílias alteradas, edição real verificada e lacunas explicitadas. Parecer visual positivo local não é aceiteFinoti/Teresa.

### I5 — Integração e publicação com autorização

**Estado: aguardará autorização após I1–I4.**

1. Apresentar o que está pronto, pendências, commits próprios e divergência atualizada. `4aed591` e`219ed1c` são SPparalelo; novos commits remotos podem ter chegado. Conferir cada remoto, preservar trabalhos locais, pedir autorização antes de sincronizar árvore suja; a autorização antiga refere-se ao merge`8d3eaec`, já realizado, não a qualquer futuro merge.
2. Após autorização, integrar de forma não destrutiva, guardando/reaplicando somente os caminhos necessários. Resolver LIVE de forma somativa e conferir que as edições paralelas não foram incluídas indevidamente nos commits desta entrega. Não alterar regras/código deSP para acomodarPanorama. Em conflito funcional ou mudança de contrato, parar no ponto afetado e apresentar a decisão.
3. Reexecutar somente checks afetados e o build final se a base mudou; `npm run check:live-docs -- <base> <head>`. Registrar evidência emLIVE/plano/diário. Stash de segurança só pode ser removido após comprovar restauração, não como limpeza automática.
4. Apresentar SHAs finais a publicar e pedir autorização de push. Commit não comprova deploy. Push autorizado, conferir remoto/CI; Gabriel publica noLovable, ou autoriza ação equivalente específica. Identificar a versão publicada antes de chamar o comportamento de disponível.
5. Reversão se houver regressão:novo commit que retorna a seleção/componente/manifesto afetado à baseline identificada, preservando correções numéricas anteriores e dados coletados. Não reset/rebase de histórico publicado, não desativar invariantes para contornar falha. Caso o código esteja publicado mas ainda não conferido, registrar exatamente esse estado.

**Aceite:** SHA enviado e versão publicada identificados, sem alterações paralelas perdidas; ensaio de uso ainda separado emI6.

### I6 — Ensaio publicado de Gabriel e retorno externo

**Estado: pendente de publicação e geração humana; corresponde ao encerramento de G7.**

1. Gabriel geraGramado+Canela1T2023–3T2026 no site; confirma ausência de cidades pré-selecionadas, modo comparativo, todos os membros/cores, subtítulos e composições; entregaPDF/PPT/CSV para a sessão conferir. Não validar3T2026com outro fechamento. Uma chamada atual pode trazer atualização legítima de base: registrar competência/hash e investigar diferença, sem tentar repetir números antigos manualmente.
2. Gabriel valida um consolidado homologado2T2026ou4T2025 e, para a comparação regional, um recorte cidade versus grupo explicitamente escolhido. Secovi tem ao menos um ensaio representativo antes de anunciar suporte compartilhado em produção. Demais casos podem continuar cobertos offline; não exigir gerar todos os recortes enormes para cada edição visual.
3. Renomear/reagrupar no mesmo recorte deve recompor sem repetir coleta; mudar recorte/período refaz somente o necessário. Exportações precisam corresponder ao resultado atual. Conferir avisos/consistência sem notas técnicas dentro do material e sem divergência nova silenciosa.
4. Se o publicado divergir do local, registrar erro e evidência, corrigir/retestar a família afetada antes de anunciar a entrega; não antecipar “homologado”. Se ensaio for bloqueado por origem/cobertura, classificar a causa e não inventar valor/abrandar guarda.
5. Preparar resposta curta paraTeresa/Finoti:agora é possível separar cidades e comparar grupos nomeados; ajustes gerais automatizados ePPTeditável para acabamentos. Não dizer que todos os gráficos são editáveis ou que toda análise está desdobrada. Envio somente porGabriel. Registrar aceite explícito desta ampliação quando recebido; o aceite anterior permanece histórico.

**Aceite:** saídas autenticadas conferidas, versão e casos efetivamente testados registrados. Estado “verificado em produção” depende dessa evidência; “aceito externamente” depende do retorno humano. Nenhum horário/aceite presumido.

### Ordem, commits e limites de execução

ExecutarI0→I1→I2→I3→I4; consolidar correções e evidências antes da autorizaçãoI5. Integrar/publicar só após autorização e repetir apenas o necessário quando a base mudar. I6é acompanhado com as gerações humanas. Sugestão de commits isolados:acabamentos visuais/estados anuais; eventual ajuste de integração real; evidência/checkpointdepublicação. Não criar commit vazio para satisfazer portão. Atualizar esta seção com estado, SHA e evidência em vez de criar outro plano para o mesmo assunto.

Fora do escopo:novo motor, novas coletas reais pelo agente, reclassificaçãoMCMV, composição anual de vendas, texto interpretativo automático, reformulação institucional, gráficos nativos doPPT, UI dos demais relatórios e eliminação de trabalho editorial do analista. Se surgir necessidade real fora disso, apresentar evidência e proposta antes de ampliar.

### CTA — incorporar a candidata ao relatório live

Execute os portões I0–I4 da seção “Incorporação ao relatório publicado” de `docs/features/Relatorios Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md`, preservando T01–T07, D01–D14 e as correções visuais `91e3194`/`3cee42b`. Reutilize a implementação já conectada ao gerador; feche médias visuais, quadros anuais sem comparação, composição de ano único, janela anual e densidade de três unidades. Preserve dados/guardas, PPT híbrido e trabalhos paralelos. Valide a rota real offline, regressões2T2026/4T2025 e a dupla exata1T2023–3T2026, com extratos curtos apenas para lacunas comprovadas, PDF/CSV e edição real noPowerPoint. Não faça coletas reais nem estudos completos por conta própria. Registre evidências e commits isolados, apresente divergência/commits e peça autorização antes de integrar árvore suja ou fazer push noI5. Gabriel fará as gerações publicadas doI6; não antecipe homologação externa.


### Checkpoint de incorporação — 06/11/2026

I0–I4encerrados localmente; acabamento8058949 e prova de rota c32953a, evidências finais noJSON existente. Dados aprovados, contratos e arquivos paralelos preservados. Não houvemerge/push/publicação. I5deve apresentar lista/divergência atualizadas antes de solicitar autorização; I6mantém ensaios deGabriel e aceite externo separado. O aceite anterior deJuliana/Finoti não é homologação desta ampliação.
