# Rebrain (Plataforma) — Documento Vivo

> **Rotação 27/10/2026:** entradas anteriores a 20/10/2026 foram movidas sem edição para [historico/LIVE_rebrain_ate_2026-10-19.md](historico/LIVE_rebrain_ate_2026-10-19.md). Este documento mantém o estado atual e o registro recente. Novas entradas seguem o `README.md` desta pasta: topo de **1. Desenvolvimentos**.


## 27/10/2026 — Estimativas: seleção e Excel candidato para Belogic — Gabriel / Codex

- **Entrega:** seleção operacional isolada, reaproveitando referências Finotti; motivos por ID/cadência, cálculo sem rateio para uma tipologia e mapa de entrada/saída. [Resultado, amostra e perguntas](../features/estimativas-vendas/ENTREGA_CANDIDATA_OPERACIONAL_2026-10-27.md). Três fontes congeladas/2.305empreendimentos, duas hipóteses de cadência:1candidato condicional,10exemplos revisáveis. Excel interno NÃO IMPORTAR; nenhum contrato externo aceito localizado.
- **Validação:**15testes novos e62existentes aprovados; leitura de retorno do Excel confere chaves, conservação, fórmulas e valores. Sem ensaio visual Excel ou importação. Nenhuma API nova ou escrita na origem.
- **Etapas/pendências:** validado localmente para revisão; bloquear importação até exemplarNicolas, granularidade/cadência/origem, política da metade, preço e reconciliação. Quatro posições consecutivas não estimadas é política conservadora proposta, não aceite operacional. Sem push/deploy/mensagens, alterações paralelas preservadas.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — referência, leitura apenas.

## 27/10/2026 — FIERGS: alertas agrupados por tipo — Gabriel / Codex

- **Mudança:** controles cadastrais agrupados em um aviso; ajustes e divergências repetidos agrupados por categoria, com detalhes recolhidos por padrão. Contagem do botão representa grupos. Nenhum número, guarda, exclusão de produto ou CSV alterado; 29 empreendimentos sem classificação continuam explicitados. Avisos críticos não são duplicados entre notificações e conferências.
- **Validação:** 11 testes focados do modal/fluxo aprovados; cenário de 18 controles verifica um grupo, preservação dos 18 detalhes e imutabilidade do relatório. Verificação de tipos e lint dirigidos antes da publicação. Sem API ou geração real; ensaio no site e exportações seguem pendentes.
- **Etapas/pendências:** ajuste editorial preparado para publicação autorizada por Gabriel; nova conferência dos recortes no site e retorno da Juliana continuam necessários.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — somente referência.

## 27/10/2026 — FIERGS: modal de alertas e diagnóstico adicional Miradero — Gabriel / Codex

- **Solicitação:** Gabriel definiu alertas objetivos e material disponível, sem rótulos de confiabilidade/aprovação; pediu diagnosticarMiradero antes. Duas consultas individuais200 confirmam divergência interna na competênciaago/2026: cadastro36/estoque16 contra única tipologia87033com18/8. Não é só diferença temporal; causa do backend ainda semprova. Brutos ignorados, nenhuma escrita na origem.
- **Mudança:** botãoAlertas noRelatório abreDialogpadrão com ajustesnominais/diferenças/avisos. Casos reconciliados baixamdireto; divergência numérica oferece continuar após leitura porjob/formato, sem alterar verificações ou auditoria. Cobertura/proveniência municipal continuam protegidas. Host trata novatentativa/cancelamento, sem reutilizar confirmação. Sem texto nos slides.
- **Evidência/estado:** [complementoMiradero/alertas e roteiro](../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_CONTRATOS_HISTORICO_FIERGS_2026-10-27.md);35testes distintos focados aprovados, lint0erros/3avisosanteriores. Validação local decomponentes/store; navegador/exportaçãofísica pendentes. Sem push/mensagens; política posterior substitui bloqueionuméricoabsoluto anterior, não fabrica reconciliação ou aceite.
- **Próximo:** publicar com autorização e testar modal/download no site com os recortes afetados/preset. ExplicarMiradero como divergência na resposta, não correção confirmada da fonte; investigaçãoEdgar permanece independente.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

## 27/10/2026 — FIERGS G4: auditoria, regressões e preparação do ensaio — Gabriel / Codex

- **Mudança:** CSV distingue original/capacidade/cadastro/competências, classes de guarda e índices de duplicatas/conflitos. Avisos dinâmicos e Metodologia/Glossário existentes explicam a origem; sem notas no PDF/PPT, CSS ou tokens novos. Query/sessão versionam os contratos para não reaproveitar modelo anterior. G0–G2 em25258d8 eG3 em67869e3.
- **Validação:**66testes distintos focados, tipos completos doapp e lint dirigido aprovados. Dezreplays locais de2T2026/4T2025, hashesCSV e decisão central de exportação conferidos; zero críticos nos recortes congelados. Estoque/vendas/preços/VGVfinal preservados; Miradero capacidade−18, SolarisVGVoriginal−5,301milhões têm linhagem. [Matriz, ressalvas, roteiroG5 e rascunhosG6](../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_CONTRATOS_HISTORICO_FIERGS_2026-10-27.md); resumo pequeno versionado e script offline reproduzível.
- **Limites/estado:** G0–G4 validados localmente, não publicação ou aceite. Sem consultaGeoBrain, PDF/PPTreal ou envio de mensagens nesta execução. Preset integral de dez cidades e exportações físicas aguardamG5; Miradero18tipologia×36cadastro posterior permanece limitação auditada, em investigação de origem conforme Gabriel. Não alegar controle externo aprovado quando indisponível.
- **Próximo:** autorização de push/publicação, Gabriel gera recortes afetados e baseline/preset e traz PDF/PPT/CSV da mesma geração. Conferir antes de enviar pedido de aceite; estimador é a próxima atividade, sem encerrar incidente por inferência. Alterações paralelas e outros motores preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

## 27/10/2026 — FIERGS G3: capacidade por competência e guardas independentes — Gabriel / Codex

- **Mudança:** cubo FIERGS identificado separa original de lançamento, capacidade derivada no fechamento e cadastro/competência. Campo de compatibilidade launchedUnits usa a capacidade dos empreendimentos classificados pela data original; não soma meses ou usa cadastro futuro. Preços/estoque/vendas mantêm a fotografia e política de representação; Secovi preserva sua base anterior.
- **Guardas:**42controles dimensionais anteriores preservados, integridade crítica adicional e confronto cadastral somente em competência compatível; controle indisponível fica explícito, sem match fabricado. Conflito de ID, medida ausente, fotografia incompleta e total70×distribuição127 na mesma competência continuam impedindo exportação.
- **Evidência:** dezreplays congelados, cinco recortes em2T2026/4T2025, sem críticos abertos. Em2T2026 estoque/vendas/preços/VGVfinal e referência266projetos preservados; Miradero36cadastroago×18tipologiajun separa18unidades, e SolarisVGVoriginal10,602→5,301milhões após remover as cópias. [Matriz e limites](../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_CONTRATOS_HISTORICO_FIERGS_2026-10-27.md).
- **Estado/próximo:** validado localmente; G4auditoria/avisos em fechamento, sem chamada de negócio nova/PDF/PPT/push. Ensaio do site/presetintegral e aceite continuam pendentes. Não equivale a correção na base Geobrain.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

## 27/10/2026 — FIERGS G0–G2: entrada validada e identidade histórica — Gabriel / Codex

- **Mudança:** `building-source.ts` valida envelope, paginação/total, território e repetição de empreendimentos; erro de contrato não dispara fallback nem retry transitório. `building-history.ts` implementa identidade/competência, deduplicação idempotente com índices de origem e detecção de conflito/incompletude; zero/nulo/venda negativa preservados. API/sessão conserva rota, concorrência e recuperação; sem mudanças nos outros motores.
- **Evidência:** [execução e matriz](../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_CONTRATOS_HISTORICO_FIERGS_2026-10-27.md), respostas congeladas originais preservadas; nenhuma chamada de negócio nova. Fixtures anonimizadas nos testes. Testes de identidade/fonte aprovados; integração temporal/auditoria em verificação na mesma sessão.
- **Estado:** validado localmente no domínio/contrato de entrada, não publicação/homologação ou PDF/PPT. Próximo concluir G3/G4 e matriz numérica, depois ensaio autorizado do site. Registro não atribui correção da origem ao backend.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

## 27/10/2026 — FIERGS: contratos de deduplicação/competência e revisão do plano — Gabriel / Codex

- **Objetivo/decisão:** Gabriel informou conversa pessoal com Edgar, que seguirá investigando a origem. Plano revisado para avançar no consumidor sem esperar esse diagnóstico; implementação ainda será acionada pelo CTA.
- **Contrato proposto:** `history-identity-v1`, remoção idempotente somente de duplicatas equivalentes com linhagem; conflito de mesmo ID/mês permanece impeditivo. `period-capacity-v1`, capacidade derivada de qty de fotografia comum até o fechamento, separada do lançamento original, sem dado futuro ou reconstrução por vendas/distratos. Origem derivada não é validação independente.
- **Escopo:** [plano revisão2 e CTA](../features/Relatorios%20Secovi_FIERGS/PLAN_MODERNIZACAO_COLETA_E_HISTORICO_FIERGS_2026-10-27.md), diagnóstico atualizado. Separar integridade, conservação dimensional e confronto externo; total70/distribuição127 na mesma competência continua crítico. Sem otimização de transporte, alterações de outros motores ou exceções municipais.
- **Estado/próximo:** preparado/documental; nenhum runtime, nova consulta ou exportação nesta revisão. Testes anteriores não são evidência de implementação futura. Próximo G0–G4 com regressões2T2026/4T2025, envio autorizado/ensaioG5, rascunhos para Teresa/Juliana e novo aceiteG6. Prioridade FIERGS→estimador preservada; sem push ou homologação antecipada.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, sem escrita.

## 27/10/2026 — FIERGS: referência Dashboard, sincronização e plano de ingestão — Gabriel / Codex

- **Ambiente/objetivo:** Rebrain/Panorama; orientação de Edgar para consultar conforme Dashboard, sem modificar o Dashboard. Gabriel pediu sincronizar, confrontar o JSON e preparar plano/CTA antes da implementação.
- **Integração:** `21edc3d` incorpora sete commits remotos de Validação/Excel sobre três locais, sem reescrever histórico. Hunk LIVE anterior guardado/reaplicado e conferido; demais mudanças locais FIERGS/estimativas/Corretor preservadas. Nenhum push. A integração supera o estado de divergência registrado na entrada anterior.
- **Evidência:** mesma rota POST interna v2 nos três motores. Quatro consultas200 no padrão Dashboard ainda reproduzem Solaris18×9 e Porto Alegre240×153. A amostra recebida tem cinco projetos de Curitiba/785linhas sem duplicatas, não os casos afetados; formato confirmado, resolução não demonstrada. Brutos/scripts e hashes em `.local-inputs/fiergs-incidente-20261027/`.
- **Plano:** [modernização de coleta e histórico G0–G6](../features/Relatorios%20Secovi_FIERGS/PLAN_MODERNIZACAO_COLETA_E_HISTORICO_FIERGS_2026-10-27.md), além do diagnóstico atualizado. Copiar contrato/identidade como referência; não importar zeros artificiais, busca futura, duplicatas preservadas ou captura silenciosa de falhas de outros produtos.
- **Validação/estado:** sete testes locais de consulta/fonte aprovados, hashes/matriz e gate documental conferidos. Preparado, não implementação do motor nem nova exportação. Próximo autorizar G0–G4, resolver coerência temporal e conflitos sem afrouxar guardas, depois publicação autorizada/ensaio humano G5 e aceite G6. Novos recortes ainda não homologados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, sem escrita.

## 27/10/2026 — FIERGS: diagnóstico do bloqueio em novos municípios — Gabriel / Codex

- **Ambiente:** Rebrain/Panorama FIERGS, incidente Teresa/Juliana de26/10. Prioridade confirmada hoje: FIERGS antes do estimador. Escopo desta rodada: diagnóstico e proposta, sem implementar ainda.
- **Evidência:** Porto Alegre e Gramado+Canela,1T2021–2T2026, reproduzidos com o coletor/modelo/CSV reais.150 respostas de dados HTTP200, cidades na primeira tentativa; guarda crítica `residual.vertical.typology.launched.negative`:87 emPorto e9 emGramado. Canela isolada e referência Canoas+Esteio+SãoLeopoldo,1T2023–2T2026,42/42 guardas aprovadas. IndividuaisGramado/Canela usam respostas congeladas da coleta conjunta.
- **Causa:** Solaris/Gramado traz três linhas históricas duplicadas exatamente; experimento offline de deduplicação faz o conjunto passar42/42. Porto mistura cadastro atual e quantidades tipológicas originais em quatro empreendimentos revisados:153×240, diferença87; tipologiasjun/2026 somam153. Não é prova de indisponibilidade passada nem justificativa para afrouxar guardas.
- **Documentação:** [diagnóstico e proposta G0–G4](../features/Relatorios%20Secovi_FIERGS/DIAGNOSTICO_EXPORTACAO_RECORTES_FIERGS_2026-10-27.md); brutos/CSV/scripts ignorados em `.local-inputs/fiergs-incidente-20261027/`.17 testes focados da reconciliação aprovados; manifesto e conferência offline aprovados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, nenhuma escrita.
- **Complemento de reprodução por ID:** GET `https://geobrain.com.br/public-api/building-with-history/73632` testado 200: um Solaris, histórico jul/2024 com seis linhas/três objetos distintos e soma 18. Os filtros query `building_id`/`id`/`building_ids` não restringiram a listagem interna nas três chamadas testadas. Evidência bruta/script no mesmo diretório ignorado; diagnóstico atualizado, sem alteração de motor ou nova geração. Commit inicial documental `3e2f5d4`; este complemento não resolve o produto.
- **Etapas/pendências:** diagnóstico validado localmente com API real; correção proposta de identidade/duplicação e coerência temporal, ainda não implementada. PDF/PPT no site não verificados, produção não corrigida e novos recortes não homologados. Git diverge7remotos/1local na abertura; nenhuma integração/push. Próximo: aprovação da proposta, implementação com regressões e exportação pareada, depois autorização para sincronizar/publicar. Alterações paralelas preservadas.
## 26/10/2026 — Validação do Fechamento: contexto para conferência na coluna Valor — Edgar / Codex

- **Ambiente/funcionalidade:** Divergências da Validação do Fechamento; Edgar / Codex.
- **O quê:** revisão dos textos frente ao Python: restauradas área/padrão nas regras de vagas e corrigida a identificação do padrão, que no anexo aparecia rotulado como M2. Valores agora incluem, conforme a regra, desvio percentual absoluto, limite de desvio/preço, quantidade de empreendimentos, preço/m² calculado, diferença e tolerância de R$ 0,01/m², status histórico, datas, critérios de cluster unitário e unidades/área usadas nas referências de garagem/Garden/Cobertura. Taxas de venda exibidas como percentuais e mediana de vendas identificada em unidades, sem acrescentar médias de outras métricas.
- **Preservado:** critérios, prioridade, agrupamentos, identidades e aprovações. Apenas o conteúdo de `value` mudou; tabela e Excel já consomem esse mesmo conteúdo. Python fornecido/gerado não foi sobrescrito nesta revisão da apresentação.
- **Evidência:** 41 testes/8 arquivos aprovados; comparador atual confirma os mesmos 52 achados entre Python e aplicação na base local Sinop/MT de 22/10. Sem nova consulta autenticada ou validação visual.
- **Etapas/Pendências:** revisão local implementada; conferência humana e publicação pendentes. Sem alterações em Supabase ou demais projetos.
- **Monday:** —

## 26/10/2026 — Validação do Fechamento: prioridade de preços e tolerância de arredondamento — Edgar / Codex

- **Ambiente/funcionalidade:** motor de Divergências da Validação do Fechamento; Edgar / Codex.
- **O quê:** habilitadas as duas regras específicas de preço baixo, preservando seus limites inclusivos (Horizontal ≤ R$ 40.000; demais tipos ≤ R$ 100.000) e desvio ≥30% da mediana. Prioridade exclusiva na mesma família/campo: preço zerado (status histórico Ativo/Esgotado/Lançado), depois preço baixo, depois desvio geral. Comparações independentes de garagem/Garden/Cobertura e demais campos não foram suprimidas. Preço/m² gravado versus calculado aceita diferença de até R$ 0,01/m², após arredondamento a duas casas e sem falso positivo de ponto flutuante.
- **Python:** criado `farol_rebrain_20261026_corrigido.py` na pasta do anexo (`validacao_geobrain`), com o original preservado; cópia de referência idêntica nesta feature. Priorização e tolerância replicadas, com datas de exibição tratadas como texto. Comparador atual em `reference/compare-current.py`; comparadores anteriores permanecem referências históricas.
- **Evidência:** testes incluem os três casos reais de arredondamento, diferença acima da tolerância, tipos de empreendimento, preço zerado e supressão do desvio genérico. Na base offline Sinop/MT salva em 22/10 (174 empreendimentos/395 tipologias), os três alertas de arredondamento desaparecem e restam 52 achados idênticos entre Python e TypeScript.
- **Etapas/Pendências:** 37 testes/8 arquivos, TypeScript e diff aprovados. Implementação local concluída; sem nova consulta autenticada ou validação visual. Publicação depende de autorização. Sem alterações em Supabase, Dashboard ou outros projetos.
- **Monday:** —

## 26/10/2026 — Validação do Fechamento: integridade cadastral do Farol — Edgar / Codex

- **Ambiente/funcionalidade:** Validação do Fechamento, motor da guia Divergências. Autor/origem: Edgar / Codex, novas regras do Python fornecido após `# Adicionado regras 26/10/2026`.
- **O quê:** seis verificações acrescentadas: área privativa zerada fora de Futuro; preço/m² gravado diferente de preço/área (divisão arredondada a duas casas, área zero resulta em zero); preço de lançamento ou período zerado para status histórico contendo Ativo/Esgotado/Lançado; quantidade lançada zerada e preços de lançamento/período diferentes apenas quando as datas coincidem. Grupo vazio para estas regras, sem agregação. Motor anterior, aprovações, interface e demais projetos preservados.
- **Conflitos excluídos:** Preço abaixo de R$ 100.000 (não Horizontal) e Preço abaixo de R$ 40.000 (Horizontal). Exigem o mesmo desvio ≥30% da mediana já validado pela regra geral; duplicariam achados nos clusters com múltiplos empreendimentos. No cluster unitário válido, a própria mediana coincide com o preço, logo o desvio não se verifica.
- **Evidência:** 31 testes/8 arquivos aprovados, incluindo dez casos de integridade e a normalização da base local Sinop/MT (174 empreendimentos/395 tipologias, salva em 22/10). Total de 55 achados, sendo três das novas regras. Comparação direta com o Python fornecido confirmou os três, sem exclusivos em nenhuma implementação. TypeScript aprovado. Comparador reproduzível em `src/features/validacao-fechamento/reference/compare-integrity.py`.
- **Etapas/Pendências:** implementação e verificação headless locais concluídas; sem consulta autenticada nova nem validação visual nesta sessão. Publicação aguarda autorização. Anexo original e referência histórica preservados, sem alteração de Supabase.
- **Monday:** —

## 26/10/2026 — Validação do Fechamento: rótulos da coluna Regra — Edgar / Codex

- **Ambiente/funcionalidade:** Divergências da Validação do Fechamento.
- **O quê:** removidos os sufixos ` - Empreendimento` e ` - Tipologia` da apresentação da coluna Regra, incluindo filtros, ordenação, cópia e Excel. Reutilizada a grade existente; critérios de validação e identificadores internos de aprovação preservados.
- **Etapas/Pendências:** ajuste local; teste do formatador e TypeScript aprovados. Validação visual e publicação pendentes. Sem alterações em outros projetos.
- **Monday:** —

## 26/10/2026 — Validação do Fechamento: medianas e faixas de área nos clusters — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/validacao-fechamento` — regras de Divergências.
- **O quê:** adotado o Python anexo atualizado: último registro por tipologia antes dos agrupamentos, cluster sem período, CEP ausente convertido a 00000, desvios de preço pela mediana com ao menos dois empreendimentos e regras isoladas de baixo preço somente em cluster unitário. Preço/m² compara o campo da API com a mediana de `price/private_area`. Regras antigas de desvio de área removidas; estoque compara percentuais vendidos e vendas comparam taxas. Mensagens alinhadas aos cálculos efetivos. Para padrões contendo loteamento, a dimensão dormitórios passa a ser a faixa de área privativa.
- **Faixas:** algoritmo isolado na Validação reproduz o Dashboard, sem alterações naquele projeto: por cidade/tipo, uma última área positiva por tipologia, até seis faixas por posições empíricas, cortes arredondados para dois algarismos significativos, limite inferior inclusivo e superior exclusivo. Python anexo em `validacao_geobrain` atualizado e cópia idêntica mantida em `src/features/validacao-fechamento/reference/`.
- **Evidência:** teste offline da base Sinop/MT salva em 22/10/2026 (174 empreendimentos, 395 tipologias). Python e TypeScript coincidem nas 52 divergências e nos clusters usados. Excel gerado e reaberto com 52 registros. Sem consulta autenticada à API.
- **Monday:** —
- **Etapas/Pendências:** implementação local e comparação automatizada concluídas; validação autenticada/visual e publicação pendentes de aceite. Nenhuma alteração de Supabase nesta entrega.

## 23/10/2026 — Relatório API Excel: ajuda contextual nos campos — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — 2. Configurar relatório.
- **O quê:** ícone de informação ao lado dos 11 campos, com tooltip por hover ou foco. Explica filtros, períodos, layouts e fórmulas; textos de cálculo monetário, média e escala acompanham a seleção atual. Reutiliza Tooltip/Label do design system, sem modificar primitives compartilhados ou regras de processamento.
- **AELO, análise somente:** endpoint principal confirmado no código como POST `https://app.geobrain.com.br/public-api/v2/building-with-history-internal`, com tipo Horizontal, UF, status e paginação. Catálogo geográfico usa endpoint separado. Nenhuma alteração ou consulta real ao AELO.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; base `38c10a8`.
- **Monday:** —
- **Validação:** TypeScript, lint dirigido, build, quatro testes em dois arquivos e diff sem erros. Navegador com API simulada em 1440/390 px e temas claro/escuro: 11 tooltips, hover, foco, conteúdo dinâmico e posicionamento dentro da janela; quatro chamadas de coleta preservadas, sem processamento automático ou erro de página. Evidências locais ignoradas em `.local-inputs/api-excel-check/verify-tooltips.cjs` e capturas associadas. AELO/Dashboard intactos.
- **Etapas/Pendências:** implementação e verificação local concluídas; aceite com API autenticada e publicação pendentes. Sem push nesta entrega.

## 23/10/2026 — Relatório API Excel: filtro de padrão e médias por tipologia Padrão — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Configurar relatório.
- **O quê:** Padrão adicionado após Status do Empreendimento, com o mesmo combobox múltiplo. Opções de `data.standard` limitadas aos `building_type` selecionados; escolhas explícitas incompatíveis removidas ao trocar tipos. Sem padrão compatível escolhido, geração bloqueada até nova seleção. Dados cadastrais apenas; nenhuma agregação automática ou chamada extra de API.
- **Preço Médio Empreendimento:** as três fórmulas existentes incluem todas as tipologias válidas (Garden/Cobertura preservados). Rótulo ponderado por quantidade renomeado para Ponderado pela oferta lançada, mantendo peso `qty`. Acrescentadas as mesmas três fórmulas somente para `type_of_typology` Padrão/Padrao, com normalização de acentos/caixa/espaços. Restringe a média, sem excluir linhas de outras tipologias; sem Padrão válido, média vazia, sem fallback. Seleção continua aplicada somente em Gerar relatório.
- **AELO, apenas informativo:** usa soma de `sold_in_period`; distratos estimados por estoque atual − anterior + vendas, com total vazio se algum intervalo for incalculável/negativo; coluna chamada Vendas líquidas repete `sold_in_period`, sem subtração. Não usa gross_sales/distractions. Conferência detalhada em `docs/features/relatorio-api-excel.md`; AELO e agregação compartilhada intactos.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; base `5daefda`.
- **Monday:** —
- **Validação:** TypeScript, lint dirigido e build aprovados. 62 testes em seis arquivos, incluindo padrões/tipos, seis médias, normalização Padrão/Padrao, preservação de Garden/Cobertura, agrupamentos mensal/trimestral, ausência de Padrão e regressões AELO/trimestres. Navegador 1440/390 px, claro/escuro, com rede externa interceptada: opção Padrão após Status, opções Alto/Econômico conforme Hotel/Vertical, remoção de padrão incompatível e bloqueio até selecionar, seis opções de média, três versões restritas produzindo 150.000 nas duas linhas (incluindo Garden) e versão geral preservando 163.500. Gerações/filtros não fizeram novas requisições; downloads reabertos nas três escalas. Sem erro de página/overflow da janela; mobile com menu recolhido. Evidências locais ignoradas em `.local-inputs/api-excel-check/verify-standards-average.cjs` e arquivos associados.
- **Etapas/Pendências:** ajustes locais concluídos; API autenticada/aceite com dados reais e publicação ainda pendentes. Padrões reutilizados: ReportMultiSelect, Select/Popover/Command Brain e geração explícita existente; carregamento deliberadamente lento, sucesso, vazio de seleção, rascunho, erro e download verificados. Nenhuma escrita Monday ou push nesta entrega.

## 22/10/2026 — Estimativas: auditoria das bases IVV e envio autorizado — Gabriel / Codex

- **Ambiente:** Rebrain/Estimativas. Gabriel pediu conferir os arquivos enviados por Edgar antes de publicar `a2480df` e autorizou push se as premissas fossem corroboradas.
- **Resultado:** cinco bases,475.058 linhas, uma aba/26 campos e granularidade tipologia×mês. Horizontal de18 cidades, sem Curitiba; filtros publicados reproduziram366 projetos/15.164 meses. API real Cuiabá:6.727 chaves comuns/166 projetos, quantidade/estoque/venda líquida iguais nas20.181 comparações; zero diferenças.72 chaves exclusivas Excel e243 API impedem afirmar completude idêntica.98.563 linhas marcadas estimadas reforçam separar fonte reportada de observação comprovada. Nenhum ajuste de motor necessário.
- **Evidência:** `docs/features/estimativas-vendas/AUDITORIA_BASES_EDGAR_2026-10-22.md`, JSON de hashes/contagens/paridade e três scripts diagnósticos. Brutos ignorados; não foi adicionado importador IVV à interface. Conferidor atual continua Análise Temporal Excel/Colunas.
- **Integração:** merge `3e87e6d` preserva `1709128`/`0e7bc71` de Edgar sobre períodos/variação anual do Resumo email.114 testes/13 arquivos e tipos completos aprovados; build integrado conferido antes do envio. Alterações paralelas FIERGS/Corretor fora do commit. Monday: [Estimativas](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`, sem escrita.
- **Estado/próximo:** validado localmente, envio autorizado; usuário publicará no Lovable e testará a ferramenta. Git não comprova produção. Linhagem histórica API, teste independente posterior ao treino e contrato de retorno continuam pendentes. A auditoria valida estrutura e conjunto comum, não acurácia ou recalibração integral.

## 22/10/2026 — Estimativas: referência Finotti completa e gráficos automáticos em Goiânia — Gabriel / Codex

- **Ambiente/funcionalidade:** `/rebrain/estimativas-vendas`, bancada local de comparação.
- **Mudança:** Drive fornecido por Gabriel destravou cauda/faixas horizontais e modelo vertical por30 comparáveis; 22 casos originais reproduzidos. Transporte com até8 chamadas simultâneas, seleção inicial completa, modelos preparados em cache, gráficos de histórico mesmo sem projeção, recorte compacto, metodologia em Dialog e modelos/modos em botões. Referência Finotti ou ritmo de estoque identificados separadamente. Logo Brain obrigatória em AGENTS/CLAUDE, no campo geográfico compartilhado e no carregamento bloqueante com foco/Escape/cancelamento. Menu móvel da ferramenta reutiliza o comportamento existente; grade responde à largura útil, sem mudar tokens.
- **Evidência:** página local usando API real, sem respostas simuladas:641 cadastros/7 páginas200,640 projeções automáticas,12 cartões iniciais,16,18s até gráficos e zero erro de página.185 têm suporte Finotti; os demais usam ritmo recente quando disponível.108 testes integrados/11 arquivos, tipos completos, lint dirigido e build; oito ensaios responsivos com snapshot separado da medição real. Fontes, hashes, reprodução e limites em `docs/features/estimativas-vendas/REFERENCIAS_FINOTTI_DRIVE_2026-10-22.md` e evidência JSON associada.
- **Monday:** [Estimativas de vendas por empreendimento](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; somente referência, sem escrita.
- **Estado/pendências:** validado localmente; nenhuma precisão observada ou cobertura local de faixas comprovada. Treino até setembro/2026 bloqueia retrospectiva independente anterior para os parâmetros de referência. Origem por período, calibração independente, comercial e retorno Geobrain seguem pendentes. Fontes brutas ignoradas e artefato derivado de inferência versionado com IDs anônimos. Alterações FIERGS/Corretor paralelas preservadas. Revisão atual sem push/deploy; próxima etapa é revisão/publicação autorizada e teste no ambiente publicado.
## 22/10/2026 — Validação do Fechamento: variação anual do Resumo email por visualização — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/validacao-fechamento` — Resumo email.
- **O quê:** complemento solicitado: cálculo, cabeçalho e dica da variação anual agora usam o período atual e o mesmo período do ano anterior conforme Ano, Trimestre ou Mês/ano. Acumulados e variação acumulada permanecem mensais, com o mesmo corte já existente.
- **Evidência:** seis testes de agregação/renderização aprovados; conferem percentuais distintos por visualização e a conservação da variação acumulada. Sem consulta autenticada ou verificação visual no navegador.
- **Monday:** —
- **Etapas/Pendências:** implementação local concluída; publicação depende de autorização de envio.

## 22/10/2026 — Validação do Fechamento: períodos do Resumo email por visualização — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/validacao-fechamento` — Resumo email.
- **O quê:** somente as três colunas de períodos passam a acompanhar Ano, Trimestre ou Mês/ano. Em trimestre, mostram mesmo trimestre do ano anterior, trimestre anterior e trimestre atual; em ano, ano anterior, ano anterior e ano atual. A agregação anual/trimestral reutiliza o motor de Resumo. O comportamento mensal permanece igual.
- **Preservado:** cálculos, cabeçalhos e barras das variações anuais mensais, acumulados de janeiro até o último mês selecionado e variação acumulada; nenhum ajuste nas demais guias ou na API.
- **Evidência:** três testes direcionados cobrem as granularidades, a passagem de ano e a igualdade dos cálculos preservados. Validação visual autenticada não executada nesta sessão.
- **Monday:** —
- **Etapas/Pendências:** implementação local concluída; publicação depende de autorização de envio.

## 22/10/2026 — Relatório API Excel: publicação autorizada do conjunto local — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Relatórios Automatizados.
- **Autorização:** usuário autorizou o push nesta sessão, superando a orientação anterior de manter o conjunto local. Pacote preparado para sincronizar a mesma `main` em `origin` e `upstream`, sem reescrever histórico.
- **Commits:** `841e173` (Hotel/métricas reais/média), `670f3d3` (geração explícita/filtros/cadastro), `3ed0152` (competências pt-BR/escala VGV), `2526863` (comboboxes múltiplos/grade); merge autorizado `1b3e0b0` preserva `6c4ccf6` de Gabriel.
- **Evidência:** fetch de ambos os remotes sem novidade ou divergência; documentação viva compatível com o pacote contra cada remote. Build, TypeScript, lint, testes e navegador com dados fictícios registrados nas entradas específicas abaixo; nenhuma alteração de runtime adicional nesta anotação.
- **Monday:** —
- **Etapas/Pendências:** conjunto local validado e envio autorizado; consulta autenticada à API, aceite com dados reais e deploy continuam sem confirmação nesta sessão. Arquivo local de auditoria permanece fora dos commits.

## 22/10/2026 — Relatório API Excel: filtros múltiplos e grade uniforme — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — 2. Configurar relatório.
- **O quê:** Município convertido em seleção múltipla; Tipo Empreendimento e Status do Empreendimento passam ao mesmo componente local Popover/Command, com busca, marcação, selecionar todos, limpar e resumo. A lista permanece aberta ao alternar opções. Os três campos iniciam a configuração na ordem pedida; todos os controles seguem uma única grade de três colunas no desktop e uma coluna em telas menores.
- **Regra local:** municípios escolhidos combinados por OU, todos selecionados após a carga; lista vazia significa nenhum, sem fallback para todos. O motor mantém comportamento sem restrição somente quando o filtro municipal é omitido. Limpar qualquer filtro principal bloqueia geração até nova seleção. Mantidos Hotel, aplicação somente em Gerar relatório e bloqueio do download desatualizado; nenhuma nova consulta provocada pelos filtros.
- **Escopo:** `src/pages/RelatorioApiExcel.tsx`, componente local `ReportMultiSelect.tsx`, condição municipal/teste do motor e documentação. Sem alterações no AELO, Dashboard ou primitives compartilhados.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; evolução de `3ed0152`.
- **Monday:** —
- **Validação:** TypeScript, lint dirigido e build aprovados; suíte anterior de 44 testes aprovada e novo cenário de seleção municipal múltipla/vazia aprovado com os 36 testes do motor (45 cenários distintos no total). Navegador em 1440/390 px, claro/escuro, com API simulada: seleção de dois municípios, dois tipos e dois status sem fechar a lista, seleção vazia bloqueando geração, ordem e alinhamento dos três filtros medidos por bounding boxes, nenhum cabeçalho antes de Gerar e quatro chamadas de coleta mantidas. Downloads reabertos nas três escalas de VGV, sem erro de página ou overflow da janela; mobile com menu recolhido. Evidências locais ignoradas em `.local-inputs/api-excel-check/verify-multiselect.cjs` e arquivos associados.
- **Etapas/Pendências:** ajuste local concluído; consulta autenticada/aceite com dados reais pendentes. Padrão visual Brain reutilizado; estados nenhum/um/vários/todos selecionados, configuração, geração, rascunho e erro de coleta verificados. Mantido sem push conforme determinação anterior.

## 22/10/2026 — Relatório API Excel: competências pt-BR e escala do VGV — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Relatórios Automatizados.
- **O quê:** Data inicial/final usam calendário local de mês/ano, com dia fixo 01, texto pt-BR e armazenamento ISO. O filtro incide em `typologies_history[].period` e inclui todos os dias dos meses escolhidos, inclusive o mês final e fevereiro bissexto. Não filtra `release_date`. Datas vazias continuam inferidas somente em Gerar relatório; resumo em pt-BR.
- **VGV:** adicionado Visualização do VGV em Configurar relatório: Padrão (inicial, valor calculado), Milhar (/1.000) e Milhão (/1.000.000). Mesma escala na prévia, gráfico e Excel; preços/quantidades/áreas/percentuais intactos. Valores de base em reais preservados; conversão única sem arredondar o quociente numérico, formato visual de duas casas. Escala faz parte da geração; alterar a opção bloqueia download até gerar novamente.
- **Escopo:** somente componente mensal local, motor/página/testes e documentação do Relatório API Excel. Nenhuma mudança no AELO, Dashboard ou módulos compartilhados. Padrões reutilizados: Popover, Button, Input, Label e Select Brain; não há seletor diário nativo nem novo primitive global.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; evolução de `670f3d3`.
- **Monday:** —
- **Validação:** 44 testes em quatro arquivos aprovados, incluindo calendário pt-BR/dia 01/limpeza/ano inválido, recorte mensal completo nos dois agrupamentos e fevereiro bissexto, escala nas duas estruturas de Excel reaberto, valores negativos, preços preservados e nenhuma mutação no cálculo. TypeScript, lint dirigido e build aprovados. Navegador 1440/390 px, claro/escuro, com API simulada: datas `01/02/2026` incluem fechamento de 28/02; Excel baixado/reaberto nas três escalas com VGV de 18.000.000, 18.000 e 18, preço médio 163.500 preservado, sem novas consultas durante filtros/gerações e sem erros de página/overflow da janela. Mobile com menu recolhido. Evidências locais ignoradas em `.local-inputs/api-excel-check/verify-month-scale.cjs` e arquivos associados.
- **Etapas/Pendências:** implementação e validação local concluídas; consulta autenticada/aceite com dados reais pendentes. Carga/configuração, calendário, geração, sucesso, rascunho, bloqueio de download e erro de coleta verificados. Mantido local, sem push conforme determinação anterior do usuário.

## 22/10/2026 — Relatório API Excel: geração sob comando e cadastro ampliado — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Relatórios Automatizados.
- **O quê:** coleta guarda o JSON bruto e não percorre/agrega históricos automaticamente. Gerar relatório, à esquerda de Baixar Excel, é a única chamada ao motor. Configurações/seleção ficam como rascunho; mudanças não recalculam e bloqueiam download até nova geração. Resultado anterior continua identificado na prévia. Limites de datas vazios são inferidos somente ao gerar; processamento duplicado bloqueado e BrainLoadingState informa a operação.
- **Filtros/colunas:** Município com busca e Tipo Empreendimento locais, incluindo Hotel preservado. Seleção mostra nomes de campos sem mês/trimestre e os expande apenas ao gerar horizontal; mantém seleção ao trocar visão/layout. Gráficos reutilizam a geração, sem uma segunda chamada ao motor para distribuição.
- **Cadastro:** Incorporadoras concatena todos os nomes; Data de Lançamento, Data de Entrega, Unidades por Tipologia, Padrão/Tipo e Região/Região Administrativa separados. Adicionados Tipologia, Quartos e Garagem nas posições solicitadas. Preço de Lançamento usa `price` do registro da tipologia na data exata de `release_date`; sem correspondência fica vazio. M² Lançado = quantidade × área da posição final; R$/m² Lançado = preço ÷ área do registro exato de lançamento. Regras completas em `docs/features/relatorio-api-excel.md`.
- **Integração autorizada:** `1b3e0b0` integra `upstream/main` (`6c4ccf6`, Gabriel, Estimativas/guia frontend) sem conflitos e sem perda/duplicação no documento vivo, conferido pela identidade de três pontos. Preservado `841e173`, anterior e ainda local. Alterações desta entrega exclusivas ao relatório, testes e documentação.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; merge `1b3e0b0`; evolução de `841e173`.
- **Monday:** —
- **Validação:** build, TypeScript e lint dirigido aprovados; 39 testes em cinco arquivos (36 próprios e três de integração menu/seleção Estimativas). Teste do componente observa zero chamadas a buildReport/dateBounds na coleta, após carga e ao editar seleções, exatamente uma por clique de geração, bloqueio de Excel desatualizado e seleção por campo. Motor cobre filtros, ordem/mapeamento cadastral, incorporadoras, lançamento exato e sem fallback. Navegador 1440/390 px, claro/escuro, com API simulada: coleta completa incluindo Hotel, seleção sem datas, filtro municipal, geração explícita, rascunho sem recálculo, nova geração e download reaberto com quatro colunas/duas linhas, média de 163.500 e VGV de 18/12 milhões. Sem erros de página/overflow da janela; mobile com menu recolhido. Evidência local ignorada: `.local-inputs/api-excel-check/verify-manual.cjs` e arquivos associados.
- **Etapas/Pendências:** implementação e validação local concluídas; consulta autenticada/aceite com dados reais ainda pendentes. Padrões reutilizados: Select, Popover/Command, Checkbox, campos Brain, GeoApiScopeEngine e BrainLoadingState. Estados de carga, configuração, geração, sucesso, erro, rascunho e exportação bloqueada verificados. Usuário determinou manter local, sem push nesta sessão; nenhum envio realizado.

## 22/10/2026 — Relatório API Excel: Hotel, vendas reais e seletor de preço médio — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Relatórios Automatizados.
- **O quê:** Hotel incluído exclusivamente no coletor deste relatório. Séries mensais/trimestrais com 12 métricas na ordem solicitada: Vendas Brutas, Distratos, Vendas Líquidas, Estoque, Preço Atual, Preço Médio Empreendimento, Preço m², VGV Lançado, VGV Vendas Brutas, VGV Distratos, VGV Vendas Líquidas e VGV Estoque. Preços e VGV Lançado deixam de ter resumo fixo duplicado; horizontal pivota as mesmas séries usadas no tabular.
- **Regras:** Vendas Brutas = soma de `gross_sales`; Distratos = soma de `distractions`; Vendas Líquidas = diferença, preservando negativos. Sem fallback para `sold_in_period` nem estimativa de distratos; ausência em um fechamento impede total parcial. VGV brutas/distratos usam os campos próprios e o modo monetário escolhido; VGV líquido é a diferença. Preços históricos usam o último fechamento de cada período.
- **Novo filtro:** Preço Médio Empreendimento por média simples (padrão), ponderada por `qty` ou ponderada por estoque. Última posição de cada tipologia por mês/trimestre, cálculo por registro de empreendimento; preço ausente e pesos ausentes/não positivos excluídos, sem base válida fica vazio. Média repetida nas linhas de tipologia do empreendimento; gráfico conta cada registro de empreendimento uma vez, sem somar preços.
- **Escopo:** somente `src/features/relatorio-api-excel/`, `src/pages/RelatorioApiExcel.tsx` e documentação. Filtros continuam posteriores a todas as respostas da API, incluindo Hotel. Dashboard e AELO intactos.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; evolução de `794f8fe`.
- **Monday:** —
- **Validação:** TypeScript, lint dirigido, build e 28 testes próprios aprovados. Cobertura: Hotel/espera pela última resposta, novos campos, líquido negativo, ausência de fallback, 12 métricas ordenadas e paridade mensal/trimestral entre layouts, três médias, pesos inválidos, preços nos gráficos e Excel reaberto. Navegador 1440/390 px, claro/escuro, com dados fictícios/rede externa interceptada: troca de média sem novas requisições; ponderação por estoque exportada em quatro colunas/duas linhas, média 163.500 e VGV lançados de 18/12 milhões, reabertos do download. Sem erros de página ou overflow da janela; mobile com menu recolhido. Evidência local ignorada em `.local-inputs/api-excel-check/verify-temporal.cjs` e arquivos associados.
- **Etapas/Pendências:** implementação e validação local concluídas; consulta autenticada/aceite com dados reais e publicação pendentes. Padrões reutilizados: Select/Checkbox/Input/Tabs Brain, GeoApiScopeEngine e motor puro após coleta. Estados de carregamento, sucesso, erro e seleção vazia verificados no navegador; ausências e lacunas verificadas nos testes. Nenhum push automático nesta entrega.

## 22/10/2026 — Integração do Relatório API Excel com a main do time — Edgar / Codex

- **Ambiente/funcionalidade:** Rebrain — Relatório API Excel e integração das Estimativas de Vendas recebidas de Gabriel.
- **O quê:** merge autorizado de `upstream/main` (`c0b7be8`) na `main`, preservando as duas entregas, rotas, menus e histórico publicado. Sem alterações adicionais de regra no relatório, AELO ou Dashboard durante a integração.
- **Commits:** `ff6ae69` (cópia), `794f8fe` (configuração do relatório), `73e6a58` (merge com 14 commits do time).
- **Evidência:** merge automático sem conflitos; documento vivo conferido pela identidade base + (local − base) + (upstream − base), sem perda ou duplicação de linhas não vazias. Build, TypeScript, 39 testes em oito arquivos (relatório, AELO, consulta Dashboard, Estimativas e menu) e checagem dos documentos vivos contra ambos os remotes aprovados. A consulta autenticada e o deploy continuam sem verificação nesta integração.
- **Autor/origem:** Edgar / Codex para o relatório e a integração; Gabriel para os commits recebidos de Estimativas de Vendas.
- **Monday:** —
- **Etapas/Pendências:** integração local concluída; envio da `main` a `origin` e `upstream` autorizado nesta sessão. Aceite do relatório com dados reais permanece pendente.

## 22/10/2026 — Relatório API Excel: coleta completa e exportação configurável — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Relatórios Automatizados.
- **O quê:** removidos catálogo de cidades e filtros de loteamentos AELO. Contrato de consulta copiado do Dashboard (Comercial/Horizontal/Vertical, POST interno v2, páginas de 100, lotes de cinco, timeout 60 s e registros repetidos preservados), mantendo dados brutos. Todas as respostas precisam terminar antes de habilitar filtros; erro/cancelamento não libera planilha parcial.
- **Relatório:** mensal por padrão ou trimestral; datas inclusivas e status locais; seleção individual de colunas; layout em colunas ou tabular; preço atual ou preço do período. Conforme definição do usuário, VGV Lançado histórico = quantidade × preço do último fechamento de cada mês/trimestre. Vendas somam o fluxo; estoque conserva a última posição. Prévia e gráficos usam o motor do relatório.
- **Arquivos:** `src/pages/RelatorioApiExcel.tsx`, `src/features/relatorio-api-excel/`, somente a entrada deste relatório em `Home.tsx`/`CommandPalette.tsx` e `docs/features/relatorio-api-excel.md`. Nenhuma alteração no AELO ou Dashboard.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; evolução da cópia `ff6ae69`.
- **Monday:** —
- **Validação:** build, typecheck e lint dirigido aprovados; 24 testes aprovados (17 próprios, sete de regressão AELO/consulta Dashboard). Excel criado e reaberto headless nos dois layouts. Navegador em 1440/390 px, claro/escuro, com API simulada e rede externa interceptada: espera pela última resposta, filtros sem nova consulta, seleção de três colunas, download tabular reaberto com VGV de 18 milhões, gráficos e bloqueio após erro. Sem erros de página ou overflow da janela; celular com menu recolhido pelo controle existente. Evidências locais ignoradas em `.local-inputs/api-excel-check/`.
- **Etapas/Pendências:** implementação e validação local concluídas. Consulta autenticada à API e aceite com dados reais pendentes; nenhum acesso real à API nesta sessão. Publicação depende de autorização. Padrões reutilizados: GeoApiScopeSelector/useGeoApiScope, BrainLoadingState, primitives Brain, rota lazy existente. Estados observados: escopo/carregamento/sucesso/erro; vazio, datas inválidas, ausência de valores e exportação sem colunas cobertos pelo motor.

## 22/10/2026 ? Relatório API Excel ? Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` ? Relatórios Automatizados.
- **O quê:** cópia independente do AELO com nome próprio, rota lazy, menu, busca, início e nome de arquivo Excel; preservados filtros AELO, coleta, tabelas e gráficos.
- **Regras/layout:** `docs/features/relatorio-api-excel.md` documenta VGV, colunas, formatos e limitações herdadas.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada.
- **Monday:** ?
- **Etapas/Pendências:** implementação local concluída; 12 testes existentes de percentuais/agregação e typecheck aprovados. Consulta autenticada e interface em navegador (desktop/mobile, claro/escuro) pendentes; publicação depende de autorização. Padrões reutilizados: página AELO, primitives Brain e GeoApiScopeSelector; estados de carregamento, vazio, erro, escopo e sucesso preservados por cópia.

## 22/10/2026 — Validação do Fechamento: migration aplicada manualmente no Supabase — Edgar / Codex

- **Ambiente/funcionalidade:** aprovações de divergências da Validação do Fechamento.
- **Estado:** migration `20261022090000_validacao_fechamento_exclusao_administrativa.sql` aplicada manualmente pelo usuário no SQL Editor do projeto `mxinpvcqzbfbzjodhgtz`.
- **Evidência informada pelo usuário:** consulta de permissões retornou `usuario = postgres` e `aplicacao_pode_excluir = false`. Nenhuma exclusão de aprovação foi necessária para essa verificação.
- **Etapas/Pendências:** aplicação manual do SQL concluída. O registro de `20261022090000` no histórico remoto do CLI permanece pendente: CLI sem autenticação e checkout sem vínculo. Antes de futuro `db push`, conferir o histórico e registrar a versão como aplicada, sem executar novamente o SQL. Esta anotação documenta a aplicação manual; não altera o histórico remoto.
- **Monday:** —

## 22/10/2026 — Validação do Fechamento: regras Farol por cluster — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/validacao-fechamento` — guia Divergências.
- **O quê:** motor substituído pelas regras ativas do Python Farol de 21/10/2026. Backup das regras anteriores em `src/features/validacao-fechamento/backups/validation-rules-20261022.ts`. Cluster: cidade, tipo, tipologia, padrão atual, dormitórios, CEP5, período e ano de lançamento. Preço/área usam média ponderada; vendas usam mediana. Garagem compara com as unidades sem vagas do mesmo cluster; área abaixo de 10 exige menos de três empreendimentos. Python corrigido e comparador disponíveis em `src/features/validacao-fechamento/reference/`.
- **Evidência:** base local de Sinop/MT de 19/10/2026, 174 empreendimentos e 395 tipologias no último período; Python e TypeScript produzem as mesmas 123 divergências por empreendimento/tipologia/período/campo/regra/categoria: Estoque 32, Preço 67, Metragem 23, Vagas 1. Excel gerado e reaberto headless com 123 registros. Sem nova consulta autenticada à API.
- **Supabase:** migration `20261022090000_validacao_fechamento_exclusao_administrativa.sql` permite DELETE somente ao administrador SQL `postgres`, mantém bloqueio de UPDATE e revoga DELETE de anon/authenticated/service_role. O botão Aprovar e a Edge Function seguem sem operação de exclusão.
- **Monday:** —
- **Etapas/Pendências:** implementação e comparação local concluídas; aplicar a nova migration no Supabase para habilitar exclusão administrativa. SQL remoto e interface autenticada não verificados nesta sessão. Backup não é importado pelo app.

## 22/10/2026 — Corretor e Sugestão: tema escuro com superfícies contínuas

Gabriel solicitou suavizar as mudanças bruscas de cor e faixas brancas. Causa: cards recebiam aliases escuros, mas rodapés usavam Papel claro fixo; a triagem em portal não herdava o escopo da página. CSS local agora reutiliza superfícies/bordas semânticas da plataforma e tokens Geobrain para texto acinzentado, rodapés e cabeçalhos próximos ao card, mapa menos luminoso, seleção/hover discretos e verde suave nos materiais enviados. Inclui resultados da Sugestão e triagem em tela cheia. Estado selecionado dos botões de decisão exposto por aria-pressed, sem mudar a ação ou persistência.

**Estado/evidência:** validado localmente; `styles/projects.css` e duas propriedades acessíveis em `CorretorV3Page.tsx`. Compilação/TypeScript e lint dirigidos aprovados; prévia isolada com card extraído do código real, VizSwitch, RecommendationResult, StudyQuickReview, Button e carregamento Brain, dados fictícios/rede externa bloqueada, em1440/390px e claro/escuro. Sem erros de página ou overflow móvel; tokens canônicos idênticos à fundação. Evidências pequenas e capturas em `.local-inputs/dark-interface-20261022/` (ignoradas). Sem suíte de regressão nesta rodada, IA ou banco remoto. Etapa de publicação depende do Publish do frontend e aceite real; nenhuma migration ou atualização de Edge necessária. Alterações FIERGS locais preservadas fora deste envio.

## 22/10/2026 — Remoção da trava excessiva na retomada

Validação final:392aprovados/2ignorados,56arquivos aprovados; tipos/lint/Deno/build24,67s aprovados. Novo cenário testa o controlador real transpilado com banco/fetch simulados, além da preservação de histórico/decisões na cobertura. Sem avaliação paga ou confirmação de produção nesta rodada.

Gabriel rejeitou conferência técnica como requisito. Causa: recuperação86de30f bloqueava toda execução com unknown/reserva; requisito criado pelo agente, sem nova avaliação humana de negócio. Status/start agora permitem outras etapas se não há running, preservando reserva/orçamento e bloqueando apenas o hash unknown no claim. Completed reapresentado, novos lotes seguem controle existente. Cobertura automática atualiza pendências sem sobrescrever decisões e guarda evidência anterior. Cenários do controlador real com banco/rede simulados comprovam retomada, skip unknown sem provedor, replay e novo lote; CI ampliado. [Causa, escopo e publicação](../features/corretor-vocacionais/DIAGNOSTICO_INTERRUPCAO_IMAGENS_ROLANDIA_2026-10-22.md). Sem IA/migration/banco remoto; publicar somente controlador com reviewer.ts e frontend. Não confundir remoção da trava com resolução da falha original ou análise completa real.

## 22/10/2026 — Recuperação de revisão incompleta sem ocultar resultados

Fechamento local deste complemento:380testes aprovados/2ignorados,54arquivos aprovados,19,97s; tipos/lint/Deno/build e prévia isolada aprovados. Não equivale a conclusão do estudo Rolândia ou runtime atualizado; aguardando publicação manual e reconciliação da leitura desconhecida.

Gabriel autorizou push36ebc7a/8c2f799 (CI técnico/documental aprovado) e pediu fallback/retomada. Implementada bancada parcial com achados/evidências/triagem, acesso à preparação e consulta review_status somente leitura por owner/documento/versão. Running/unknown/reserva bloqueiam continuação no frontend e start; completed/cache reaproveitados quando retomada segura. Fonte/localização/ata e decisões humanas preservadas, entrega exige snapshot completo. Tipos/lint/Deno/build42,39s e prévia local1440/390 claro/escuro aprovados, sem IA/banco/deploy. [Detalhes e limites](../features/corretor-vocacionais/DIAGNOSTICO_INTERRUPCAO_IMAGENS_ROLANDIA_2026-10-22.md). Etapa validada localmente; próximo publicar quatro funções com dois shared e frontend, nenhuma migration nova. O unknown real continua exigindo reconciliação; análise não foi concluída pelo agente.

## 22/10/2026 — Rolândia: lote unknown confirmado, exceção original ausente

SQL fornecido por Gabriel confirma um unknown de analyze-table-image, execução5ef5c1a9, gasto confirmado0,0360202USD/reserva0,2280224USD. Catch da folha descartava a exceção; logs recebidos só Boot/Shutdown sem motivo/correlação, insuficientes para confirmar timeout. Preparados códigos/fases/status/request-id seguros nas três folhas/shared e status/razão técnica no controlador, sem retry, liberação de reserva, IA ou banco.37 testes focados e369/2ignorados na suíte, tipos/Deno/lint aprovados. [Evidências, limites e publicação](../features/corretor-vocacionais/DIAGNOSTICO_INTERRUPCAO_IMAGENS_ROLANDIA_2026-10-22.md). Etapa validada localmente, sem resolver causa histórica por inferência; próximo publicar quatro funções com shared/frontend e reconciliar lote por evidência administrativa. Nenhuma migration nova; não reenviar estudo para descobrir erro.

## 22/10/2026 — Rolândia: duas imagens pendentes tratadas como pausa

Leitura REST do estudo ativoedda49da confirma13Excel,12DET/8texto/2visão e ausência de relatório;37 chamadas Luna com stop contabilizadas. Aviso image-not-read identifica s4/s45: retorno não confirmado e lote bloqueado, causa privada ainda a conferir. Código somava falha de imagem a pausa manual; corrigida comunicação/contagem e aviso persistente sem declarar conclusão ou refazer IA.363 testes/2ignorados, tipos/lint aprovados; consulta SQL só leitura preparada para execução5ef5c1a9. [Diagnóstico e limites](../features/corretor-vocacionais/DIAGNOSTICO_INTERRUPCAO_IMAGENS_ROLANDIA_2026-10-22.md). Sem nova migration/Edge/alteração remota; correção frontend local, causa específica dos lotes não resolvida por suposição. Arquivos alheios preservados.

## 21/10/2026 — Causa real ATA e recuperação sem repetir essa leitura

Gabriel trouxe SQL e JSON do lote novo: três listas null previstas no prompt rejeitadas pelo validador, não truncamento/recusa. Corrigida representação antes da validação e no replay seguro de lote completed, preservando resposta/consumo original e sem nova IA na ata. Retomada ignora só horário de reextração Excel, mantendo dados/snapshot/hash; ata multi-estudo não escolhe cidade.33 testes locais/checagens estáticas aprovados; sem escrita remota/processamento/deploy. Carregamento Brain local00e0bb5 continua incluído no envio pendente. [Evidências e publicação](../features/corretor-vocacionais/CARREGAMENTO_BRAIN_E_FALHA_ATA_2026-10-21.md): folha ATA+shared → controlador+shared → frontend, sem migration nova. Retomar estudo existente/materiais iguais, sem excluir; passos seguintes ainda requerem execução normal. Não homologado integralmente em produção.

## 21/10/2026 — Logo Brain nas etapas e diagnóstico da resposta recusada

Gabriel relatou nova falha após chamada real na ata e pediu carregamento padronizado. Sincronizado af04ed9 (edição manual do controlador) preservando locais. Logo opaca/preenchida e etapa aplicada no Corretor/Sugestão, documentos, execução, histórico/materiais/PDF; redução de movimento, contadores confirmados e pausa mantidos. Agora erro informa avaliação interrompida/documentos preservados. Tipo/lint/Deno/build e prévia desktop/mobile isolada aprovados, sem IA ou testes nesta rodada. Causa exata de produção ainda não lida: mensagem antiga mistura truncamento/recusa/JSON/schema; hipótese null versus listas na ata documentada. Adicionados motivos/field paths privados sem relaxar validação ou retry, consulta SQL somente leitura e [resultado/limites](../features/corretor-vocacionais/CARREGAMENTO_BRAIN_E_FALHA_ATA_2026-10-21.md). Próximo conferir lote real e publicar frontend/três folhas com shared; sem migration nova ou push nesta etapa.

## 21/10/2026 — Reconciliação Rolândia confirmada pelo retorno Lovable

Gabriel forneceu confirmação administrativa: três tentativas3b975f4f/a059b088/ef9c3c41 reconferidas e marcadas failed, sem lotes/gastos/reservas/ia_passes, exclusão ou IA. IDs completos no diagnóstico. Supera a pendência de reconciliação abaixo; não substitui homologação da correção. Código local f345adb/c9bd1c6, sem envio ou nova publicação nesta etapa. Próximo enviar correção, publicar corretor-execution+shared e frontend e conferir início real; nenhuma migration adicional.

## 21/10/2026 — Correção local de início/retomada incompleta

Retorno Lovable recebido por Gabriel: três prepared sem lotes/gasto/reserva e com reviewProfileId Luna sem snapshot; quatro funções publicadas, sem start real de homologação. Corrigidos rejeição de retomada moderna sem snapshot (legado válido preservado), retenção de id antes de validar perfil, causa HTTP operacional, erro persistente no topo da preparação e navegação somente após sucesso. Sem nova migration, IA, alteração remota ou reconciliação das órfãs. Checagens estáticas locais; próximo enviar commit e republicar controlador com shared + frontend, reconciliar tentativas e homologar. [Diagnóstico atualizado](../features/corretor-vocacionais/DIAGNOSTICO_INICIO_ROLANDIA_2026-10-21.md).

## 21/10/2026 — Reteste Rolândia: início falhou, registro preservado

Gabriel relatou retorno à preparação e bloqueio de exclusão após publicar. REST somente leitura confirma estudo5b389531 e fonte13planilhas persistidos, sem relatório, três DET. Exclusão rejeita execução prepared/running; hipótese principal controlador antigo sem reviewProfileId, com janela comprovada de órfã no cliente e navegação no finally apagando contexto do erro. CORS/recusa400 operacionais; versão das funções/consumo ainda não acessíveis administrativamente. [Diagnóstico e verificação única Lovable](../features/corretor-vocacionais/DIAGNOSTICO_INICIO_ROLANDIA_2026-10-21.md). Sem IA, deploy, limpeza ou correção aplicada; não declarar resolvido.

## 21/10/2026 — Material para reteste manual separado

Gabriel informou migration/publicação concluídas e pediu pacote de teste. Preparado Rolândia em `.local-inputs/testes/TESTE_LUNA_ROLANDIA_2026-10-21/`, 78 slides e 13 Excel. Só título interno do PPTX alterado, hash próprio para novo cadastro sem substituir avaliação antiga; demais entradas e Excel preservados, manifesto local. Cache por perfil pode ser compartilhado, reenvio da mesma cópia reconhece o mesmo teste. Sem IA ou consulta ao banco; produção informada pelo usuário, qualidade real pendente. Proveniência no pacote de publicação. Nenhum push adicional solicitado nesta preparação.

## 21/10/2026 — Revisor: push autorizado e CI aprovado

Gabriel autorizou expressamente incluir os dois commits Finotti anteriores. Enviados `30ab046`, `a199e7e`, `829f862` e `fe5c7f9` à main. [CI técnico do último SHA aprovado](https://github.com/GabeBrain/relatorios-api/actions/runs/39693170276), junto de documentação viva e contrato do protocolo. Alterações locais FIERGS e referência de interface preservadas fora do envio. Estado publicado no Git e validado localmente/CI; backend correto ainda sem acesso administrativo, migration/deploy e lotes reais R6/R8 pendentes no pacote único. US$0 gasto sob teto global US$3; nenhum email enviado. Próximo: aplicar o pacote e retomar a verificação real antes do convite à Amanda.

## 21/10/2026 — Revisor: fechamento local, envio ainda condicionado

Principal no commit local829f862, com retenção de falhas/metadados e proteção contra sobrescrever finish confirmado complementadas.25 testes focados/Deno aprovados; PostgreSQL13verificações. Suíte355 e dez passes da entrega mantidos. Decisão sobre os dois commits Finotti de saída solicitada antes do push; FIERGS local excluído do commit. Backend correto segue sem acesso administrativo, US$0 gasto, sem deploy/email. [Resultado e pacote de retomada](../features/corretor-vocacionais/RESULTADO_REVISAO_REGRAS_LUNA_2026-10-21.md); estado validado localmente, CI remoto e produção pendentes.

## 21/10/2026 — Revisor Luna/high e Guajajaras preparados para publicação

Gabriel/sessão: R0–R5 locais implementados, regras/evidências confrontadas, novas execuções de texto/ata/visão em Luna/high com flag/snapshot, cache/retomadas legadas, materiais, decisões e Sugestão preservados. JSON inválido não vira ausência de erro; consumo confirmado/raciocínio/perfil e teto global de validação US$3 protegidos na migration aditiva. Suíte355/2 ignorados, dez passes com deltas intencionais exatos sem apagar baseline, PostgreSQL12checks, tipos/Deno/lint/build e percurso isolado PPTX+11Excel aprovados. Corrigido evento de teclado na triagem; aparência/tokens preservados.

Estado validado localmente. Backend mxinpvcqzbfbzjodhgtz indisponível no conector e CLI; sem migration remota, deploy ou testes pagos (US$0). R6/R8 e convite de reteste aguardam publicação e verificação real. Dois commits locais Finotti fora do escopo de envio, demais arquivos FIERGS preservados. [Resultado, matriz e evidências](../features/corretor-vocacionais/RESULTADO_REVISAO_REGRAS_LUNA_2026-10-21.md) e [pacote único de publicação](../features/corretor-vocacionais/PUBLICACAO_REVISOR_LUNA_2026-10-21.md). Email preparado, não enviado; Git não comprova produção.

## 21/10/2026 — Plano do revisor Luna/high e reteste de Amanda

Preparado por pedido de Gabriel `PLAN_REVISAO_REGRAS_LUNA_RETESTE_AMANDA_2026-10-21.md`: matriz das regras existentes, ajustes pequenos demonstrados, texto/ata/visão Luna/high com legado/cache/consumo preservados, dez passes, CI, validação real limitada, publicação e resposta pronta para Amanda. Teto de ensaio proposto US$5, autorizado somente no CTA; não gasto nesta preparação. Email distingue Sugestão de análise e Revisar estudo, pede arquivo ainda sem marcações para reteste e fica condicionado à verificação de produção. Backend/acessos e dois commits locais Finotti não autorizados por inferência; handoff único se publicação exigir usuário. Estado preparado, sem implementação, testes, SQL remoto, IA paga, commit/push ou envio de email.

## 21/10/2026 — Diagnóstico Guajajaras/BH sem nova geração

A pedido de Gabriel, ampliada a leitura do PPTX enviado: marcações vermelhas em25 slides, embora sem comentários nativos. Correção da constatação inicial: há revisão humana no arquivo, mas não se comprovou ser o mesmo relatório anexo ao email ou a autoria de cada caixa. Extração real local do código atual:137slides,124 incluídos/13 excluídos,26.173caracteres;47 tabelas nativas são41 legendas e6 rodapés. Dados PNG ausentes na sugestão; SVG de30/70 existe no IR mas não entra no pedido; recados de revisão sobrevivem ao filtro. Divergências de renda/propriedade/verticalização, cabeçalho63 e categoria de garagem66 mapeadas, distinguindo soma32 atual correta e amostra108 atual de1.815 da nota antiga sobre30.

Consulta REST pública somente leitura não localizou caso/arquivo Guajajaras; estudo Quanti VBE homônimo não foi confundido. Código histórico d58f64c guardava sugestão somente em estado React; persistência entrou em bb0f22a/16out, sem comprovar runtime do uso antigo. Email direto indisponível por reautenticação. Matriz completa dos25 slides e13 diagnósticos/proposta P0–P3 em `DIAGNOSTICO_GUAJAJARAS_AMANDA_2026-10-21.md`. Evidência reproduzível por script local de cobertura. Estado: diagnóstico documental/extração local, correções propostas e ainda não implementadas. Sem suíte, IA paga, escrita remota, deploy, contato com Amanda ou push; dois commits locais Finotti e demais alterações alheias preservados. Próximo: P0/P1, fonte limpa e reconciliação antes de nova geração.

**Destilação posterior,21/10:** Gabriel pediu reduzir a frente a um passo de melhoria do revisor. Seção 0 do diagnóstico Guajajaras consolida preocupações numéricas, briefing, comparáveis, amostra, situação dos concorrentes e legibilidade, distinguindo marcações do estudo de omissões da IA não comprovadas. Próximo: confrontar candidatos com regras/resultados existentes no Corretor e escolher a menor correção; cobertura medida na Sugestão não comprova lacuna igual no revisor. Sem nova implementação, execução ou push; plano amplo permanece opção, não escopo aprovado.

## Motor / arquitetura atual (base zero — 2026-07-08)

Hub interno da Brain para relatórios e QA de dados do mercado imobiliário.
Stack: **React 18 + TS + Vite**, Tailwind + shadcn/ui, Zustand, React Query, React Router;
backend **Supabase** (Postgres + Edge Functions em Deno).

### Infra compartilhada (plataforma) — `RUNTIME`
- **Auth global** — [`src/store/auth-store.ts`](../../src/store/auth-store.ts) + `AuthBlock`: login POST `/auth/login`, token com TTL 180 min (Zustand persist + localStorage).
- **Shell/navegação** — `AppLayout` (sidebar por área de trabalho, reorg. de 05/jul/2026), busca global **Ctrl+K**, rotas legadas redirecionam para as novas.
- **HTTP client** — [`src/lib/http-client.ts`](../../src/lib/http-client.ts): wrapper de requisições com métricas (latência, bytes, headers).
- **Integração Supabase** — [`src/integrations/supabase/client.ts`](../../src/integrations/supabase/client.ts) (chave anon pública por design; segredos de backend ficam nos secrets do Supabase).
- **Log de atividade** — [`src/lib/activity-log.ts`](../../src/lib/activity-log.ts) + Edge Function [`supabase/functions/log-activity/`](../../supabase/functions/log-activity/): registra ações na tabela `activity_log` capturando IP (x-forwarded-for), escrita via service role.

### Features sobre a plataforma
- **Corretor \| Estudos Vocacionais** — `/auditoria` — `RUNTIME`. Motor de auditoria de estudos
  vocacionais: extrator PPTX→IR ([`docs/.../ir_extractor.py`](../features/corretor-vocacionais/ir_extractor.py), IR v1),
  análise via OpenAI ([`src/features/corretor/lib/openai-analyzer.ts`](../../src/features/corretor/lib/openai-analyzer.ts) + Edge Function [`analyze-slide`](../../supabase/functions/analyze-slide/) que protege a `OPENAI_API_KEY`),
  calculadora de custo, gerador de relatório e revisão com veredito (bug real × falso positivo). **Detalhes no doc vivo próprio.**
- **Relatórios — Secovi** — `/rebrain/secovi` — `RUNTIME`. Geração de relatórios de mercado com
  export Excel ([`src/pages/TestesArquitetura.tsx`](../../src/pages/TestesArquitetura.tsx)); planilhas de referência (Barretos) em [`docs/features/relatorios-secovi/`](../features/relatorios-secovi/).
- **API Explorer** — `/apis/explorer` — `RUNTIME`. Documentação OpenAPI + console de requisições
  unificados. Motor: [`src/lib/openapi-engine.ts`](../../src/lib/openapi-engine.ts) (engine OpenAPI 3.0 portada de `Testes API/src/api_docs.py`) + [`use-openapi-docs.ts`](../../src/hooks/use-openapi-docs.ts).
- **Qualidade — CID Validação de Base** — `PLANEJADA/POC`. Base no notebook [`docs/features/cid-validacao/Validacao_Dados_CID.ipynb`](../features/cid-validacao/Validacao_Dados_CID.ipynb). CID em standby (ver memória do projeto).
- **Qualidade — Piemonte (VGV / Release Price)** — validação de qualidade de dados.

### Legado (congelado, não bundlado)
- **Mapa** (`/mapa`) e **Assistente** (`/assistente`) — aposentados; cascas informativas.
  Código preservado em [`src/legacy/mapa/`](../../src/legacy/mapa/); fontes documentadas em `DATA_SOURCES.md`.

**O que já está pronto:** auth + shell + navegação, HTTP client, integração Supabase, log de
atividade (com Edge Function), Corretor em runtime, Relatórios Secovi com export Excel, API
Explorer com engine OpenAPI. Migração Streamlit→React V1 concluída (ver [`../architecture/migration-paridade-v1.md`](../architecture/migration-paridade-v1.md)).

---

## 1. Desenvolvimentos

### 2026-10-29 — SP Institucional: comparativos, bairros, vendas e VGL corrigido — Codex

- **Ambiente/funcionalidade:** Rebrain, `/rebrain/relatorios-institucionais/sp`. Base `26bcfb6`, main limpa e único origin em 0/0 após fetch. Autoria Codex/Codex Test, a pedido do usuário; commit desta entrega identificado no histórico Git pelo título desta entrada.
- **Mudança:** quinze conteúdos nas posições originais 23–30 e 32–38: comparativos anuais por tipologia/segmento de lançamentos/vendas, Top 10 bairros, cinco tendências de vendas e cinco de VGL corrigido. Meses equivalentes, vendas negativas preservadas, ranking com denominador municipal integral e soma cadastral reconciliada. Mantém as 85 posições, com outros conteúdos ainda pendentes.
- **INCC:** usuário confirmou INCC-DI e delegou escolha de base após receber diferenças da planilha. Critério adotado: último mês municipal disponível como base única para todos os anos e recortes, inclusive MCMV; corrigir cada mês antes de somar. Snapshot público SindusconPR/FGV de jan/2021 a set/2026 com proveniência/hash, sem copiar índices divergentes ou bases abril/março da planilha. Falta de nominal/índice deixa apenas VGL indisponível. Não há sincronização automática de novos índices; atualizar o snapshot quando publicados. [Contrato e evidências](../features/relatorios-institucionais/sp/DECISOES.md).
- **Desempenho/UX:** bairros reutilizam `/building`; VGL reutiliza `releases`; vendas usam série municipal paginada e tipologias consultam duas janelas. Consultas independentes com BrainLoadingState, tempo, cancelamento e retry; municipal permanece acessível. GeoApiScopeEngine e rota lazy preservados; Secovi/FIERGS não alterados.
- **Validação/limites:** 173 testes SP, tipos completos do app, lint e build aprovados. QA Edge local com tráfego externo bloqueado verifica 1440/390, claro/escuro, parcial de um/dois meses, trimestre completo, erro/vazio/cancelamento e páginas originais. Fontes locais monetárias/bairros/tipologias são sintéticas; API autenticada e aceite do analista não observados. Revisão da base INCC, cobertura histórica real, publicação observável, demais conteúdos e exportação seguem pendentes.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, sem escrita.

### 2026-10-29 — SP: estrutura original85 e dez slides analíticos13–22 — Codex
- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp`, autoria Codex/Codex Test, baseeb2b666, main limpa/origin0/0apósfetch. Usuário pediu10slides e exigiu mesma estrutura original.
- **Estrutura:** navegação preserva85posições/títulos do inventário, pendentes explícitos; remove sequência própria de complementos. Slide2apresentação,13empreendimentos; capítulos/sumário e23/24,37/38,47/48nas posições corretas.85posições não significam85conteúdos finalizados.
- **Lote13–22:** empreendimentos e unidades, cinco cada: trimestral,12meses,trimestralMCMV,12mesesMCMV,participaçãoanual.17trimestres e37pontos móveis; anualdesde2021, mês/ano/trimestre parcial explícitos, variações em pares anuais consecutivos e meses equivalentes, basezero sem percentual. Empreendimentos reutilizam cadastro completo, unidades usam série releasesjan2021…throughMonth, até6páginas100 com validação de grupos/meses/valores/releitura. Guardas desconhecidas bloqueiam recorte, sem zero inventado ou política FIERGS transplantada.
- **UX/padrão:** artes/gráficos SVG e primitives existentes, rota lazy/GeoApiScopeEngine preservados. Consulta de unidades independente com Brain`operation`, progresso/tempo/cancelamento/retry; não bloqueia municipal/contagem. Atualizações mesclam resultados e descartam escopo/token/geração antigos.
- **Validação/limites:**149testes SP na rodada, tipos/lint aprovados e comparações consecutivas retestadas; build final e QA Edge1440/390 claro/escuro com os dez gráficos aprovados, zero errosJS/chamadas reais; [evidências](../features/relatorios-institucionais/sp/EVIDENCIAS.md). Fontes simuladas; sem APIreal/aceite. Reconstituição pelo cadastro atual e vigência histórica dos segmentos explicitamente em revisão.
- **Arquivos/commit:** móduloSP, diagnóstico dinâmico, mapa/matriz/plano/decisões/evidências/status; entrega sobre`eb2b666`, commit desta entrada.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência, sem escrita.
- **Etapas/pendências:** estrutura corrigida e10componentes implementados; validar cobertura/classificação históricas reais e revisar slides. Preços/INCC, IVV, mapas, curva completa de vendas/oferta, editorial e exportação/homologação integral continuam abertos.

### 2026-10-29 — SP: cadastro sem históricos e contagem sem bloquear municipal — Codex
- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp`, desempenho da geração; identidade Codex Test. Usuário relatou4:24na página15/52 da coleta de5751424 e autorizou corrigir.
- **Mudança:** contagem usa GET`/public-api/building`, cujo contrato local inclui ID/data/tipo/território sem históricos mensais; após primeira página, até3em paralelo. Primitivas de integridade Panorama preservadas, sem alterar seus motores. Mesmos meses municipais e contagem de IDs, sem filtros de lançamento inventados ou cache silencioso.
- **Fluxo:** municipal aparece antes, contagem automática em BrainLoadingState`operation` com progresso/tempo real/cancelamento próprios. Retry só de empreendimentos; falha/cancelamento mantém municipal. Controle independente e atualizações funcionais evitam dados antigos ou perda de históricos/tipologias.
- **Evidência/limites:** 138testes SP, tipos/lint/build e diagnóstico Edge local1440/390 claro/escuro aprovados, conforme [evidências](../features/relatorios-institucionais/sp/EVIDENCIAS.md). Sem consulta autenticada ou promessa de segundos; duração e cobertura do cadastro real precisam de reteste. Contrato revisto em `src/assets/openapi/api-geobrain.json`. Documentos do piloto/handoff atualizados, entrega sobre5751424, commit desta entrada.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência, sem escrita.
- **Etapas/pendências:** espera municipal pela coleta longa removida; retestar tempo/cobertura real no site. Contrato líquido, preços/INCC, IVV, exportação/homologação seguem abertos. Supera endpoint interno pesado para contagem SP, sem transferir políticas FIERGS.

### 2026-10-29 — SP: contagem paginada de empreendimentos no slide 2 — Codex
- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp` — coleta granular e contagem de empreendimentos lançados; autoria Codex, identidade Git Codex Test. Implementação/publicação autorizadas pelo usuário.
- **O quê:** adapta as primitivas `readBuildingPage`/`insertBuilding` do Secovi/FIERGS à fonte interna v2, somente São Paulo/SP vertical, todas as páginas e sem excluir status. Conta IDs distintos por data de lançamento no mesmo período municipal disponível; total e evolução mensal no slide 2. Raiz não limita competência, tipologias/unidades não multiplicam empreendimentos. Sem alterar motores/políticas dos Panoramas.
- **Guardas/UX:** total e paginação estáveis, IDs distintos, conflito/território/tipo/datas inválidos ou fonte vazia bloqueiam apenas a contagem. Totais municipais preservados em falha granular; nova geração refaz consulta sem cache. Reutilizados GeoApiScopeEngine, overlay Brain com tempo real/cancelamento e progresso por página, Alert/Table e gráfico mensal existente.
- **Validação:** 134 testes SP aprovados, lint dirigido e Edge headless local1440/390 claro/escuro; duas páginas, transições de1/2/3meses, erro granular preservando municipal, lento/cancelamento e erro/vazio municipal. Zero erros JS/chamadas reais; contagens sintéticas. [Evidências](../features/relatorios-institucionais/sp/EVIDENCIAS.md); tipos completos do app e build final aprovados.
- **Arquivos/commits:** `sp/projects.ts`, testes e página/slides SP, diagnóstico dinâmico e plano/decisões/evidências/status; entrega sobre base `795ee04`, commit desta entrada.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência, nenhuma escrita.
- **Impacto em Etapas/Pendências:** implementação do slide2 concluída localmente; conferir acesso à fonte interna e contagem real após publicação com sessão pessoal. Preços/INCC, IVV, contrato líquido, exportação/homologação integral continuam pendentes.

### 2026-10-29 — SP: disponibilidade municipal independente da raiz e balanço diagnóstico — Codex
- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp` — correção após o teste autenticado do usuário; autoria Codex, identidade Git `Codex Test`.
- **Evidência recebida:** usuário consultou a API e forneceu raiz `2026-08-01`, históricos com setembro e respostas completas de `sales`, `releases` e `stock` por Padrão. Setembro: 7.825 lançamentos, 8.912 vendas líquidas e 126.307 estoque; agosto: 127.372 estoque. Balanço residual +22, com diferenças maiores por grupo; causa não demonstrada. Disponibilidade confirmada pelas respostas fornecidas, não por consulta autenticada do agente.
- **Mudança:** solicita a janela trimestral completa e descobre o prefixo consecutivo comum das três séries, sem corte pelo `period` de uma amostra. Um/dois meses produzem parcial; três, trimestre completo nas séries. Raiz continua só contexto territorial. Balanços total/por grupo viram diagnóstico explícito sem alterar números ou inferir distratos. Histórico conserva meses equivalentes e bloqueio por releitura/dimensão divergente; diferenças de balanço são separadas dessas guardas.
- **Guardas preservadas:** catálogo/escopo autorizado, limite de duas páginas por fonte, retry/cancelamento, sem cache HTTP, cobertura/paginação, lacunas intermediárias, grupos incompatíveis, duplicatas, valores inválidos, negativo líquido observado e estoque do último mês. Sem fallback para zero ou liberação de coleta/exportação integral. Slide 2 segue dependente da coleta granular.
- **Referência revisada:** normalização temporal e reconciliação do Panorama Secovi/FIERGS. Reaproveitado o princípio de distinguir fluxo/fotografia e separar diagnósticos de integridade; nenhuma política de vendas granulares FIERGS foi transplantada ou alterada.
- **Arquivos:** módulo SP, diagnósticos locais em `scripts/diagnostics/sp-*.mjs`, fixture agregada recebida em 29/10 e plano/decisões/evidências/status do piloto.
- **Validação:** 120 testes SP/10 arquivos, tipos completos do app, lint dirigido e build aprovados. Edge headless local 1440/390, claro/escuro: raiz fixa em agosto, transições de um/dois/três meses, setembro preservado e alerta +22; carregamento lento Brain com tempo real/cancelamento, erro e vazio. Zero erros JS/chamadas reais. Replay combina setembro/agosto recebidos hoje com outros meses de fixtures anteriores: comprova mecanismo, não baseline trimestral pareado nem causa dos resíduos.
- **Commits:** commit desta entrada; base `97caa21`.
- **Monday:** [SP — Institucional mensal/trimestral](https://brain381753.monday.com/boards/18398638577/pulses/13149411648) — `13149411648`; referência apenas, sem escrita.
- **Etapas/Pendências:** correção validada localmente; aceite da versão publicada permanece pendente. Retestar geração no site após envio/publicação. Contagem granular, contrato exato de `liquid_sales`, preços/INCC, IVV, exportação e homologação integral continuam abertos. Sem confirmação de produção nesta evidência.

### 2026-10-29 — SP Institucional: fechamento dinâmico a cada geração — Codex
- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp` — cobertura temporal da prévia municipal; autoria Codex, identidade Git `Codex Test`, solicitação do usuário nesta sessão.
- **O quê:** releitura do fechamento sem cache HTTP em cada geração; um/dois meses consecutivos reconciliados mantêm parcial, três produzem `quarter-closed`. Rótulos da página/slides e liberação de tipologias, segmentos, quadros e históricos reconhecem ambos os estados. Nova geração retira detalhes anteriores; consultas bloqueantes usam overlay Brain com tempo real e cancelamento por botão/Escape. Nenhuma consulta agendada ou ampliação granular.
- **Guardas:** mês ausente, grupo incompatível, duplicata, paginação incompleta ou balanço divergente impedem publicação dos indicadores. Estoque usa apenas o último mês; vendas negativas preservadas. Trimestre municipal fechado não equivale à homologação/exportação ou cobertura granular do estudo.
- **Arquivos:** `src/features/relatorios-institucionais/sp/`, opção aditiva de cache em `src/lib/http-client.ts`, diagnóstico `scripts/diagnostics/sp-dynamic-closure.mjs` e plano/status do piloto.
- **Commits:** commit desta entrada; base `c62e41e`.
- **Monday:** [SP — Institucional mensal/trimestral](https://brain381753.monday.com/boards/18398638577/pulses/13149411648) — `13149411648`; somente referência, sem escrita.

- **Validação 29/10:** 115 testes SP/10 arquivos, TypeScript explícito do app, lint dirigido e build final aprovados. Diagnóstico Edge headless local cobre 1440/390 px, claro/escuro, transições de um/dois/três meses, fonte vazia/erro e resposta lenta com overlay/cronômetro/cancelamento; zero erros JS e zero chamadas reais. Setembro sintético, sem alegação de disponibilidade real. Evidência local ignorada em `.local-inputs/relatorios-lucas/sp/dynamic-closure/`; reprodução por `node scripts/diagnostics/sp-dynamic-closure.mjs`.
- **Limites:** setembro real não confirmado; controle do navegador pessoal interrompido por não determinar a URL com segurança. QA headless local usa setembro sintético. Sem push/deploy nesta entrega; etapa validada localmente, próximo publicar com autorização e conferir o retorno autenticado.

### 29/10/2026 — Estimativas: prévia da base exportável

- **Entrega:** modal ampliado com até50linhas e as13colunas atuais do Excel analítico, inspirado no `BasePreviewPanel` das coletas Quanti (somente leitura). Cabeçalhos arrastáveis, alternativa Alt+setas/menu, ocultar/restaurar e restaurar padrão. Excel completo usa exatamente as colunas visíveis na ordem escolhida; prévia não limita a quantidade exportada. Pacote de evidências acompanha a configuração no CSV analítico/manifesto, preservando histórico e arquivo candidato de26colunas.
- **Contratos:** sem edição de células, cálculos ou novos filtros de linha. Tipos/precisão/IDs preservados; ao menos uma coluna obrigatória. `leia_me` registra layout/omissões e mantém estado não homologado. Nenhuma confirmação de formato final Nicolas/Belogic. [Fonte vigente, seção13](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md).
- **Validação:**122Vitest/20arquivos,31da experiência/11arquivos, tipos/lint/build aprovados. Chromium local1440claro/escuro e390: arraste real/teclado, ocultar/restaurar, XLSX reaberto72linhas/12colunas e comparação célula a célula com as50linhas da prévia; zero errosJS/overflow do modal ou novas chamadas na personalização. IDs em texto, booleanos, nulos e precisão conferidos. Fontes sintéticas; sem nova API real. [Evidência](../features/estimativas-vendas/EVIDENCIAS_PREVIA_EXPORTACAO_2026-10-29.json). Capturas revisadas; servidor local anterior estava encerrado e foi iniciado novo preview do build antes dos ensaios. Navegador conectado indisponível, usado Chromium headless local.
- **Estado/próximo:** validado localmente, implementação destinada àmain conforme autorização vigente da frente; publicação/aceite desta revisão pendentes. Motores e alterações paralelas preservados. Próximo: conferir prévia no site e aguardar o contrato final externo para adaptar a saída.
- **Monday:** [Estimativas de vendas por empreendimento](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; somente referência, sem escrita.

### 28/10/2026 — Estimativas: ações compactas e rótulos aprovados pelo usuário

- **Entrega:** comparar/baixar/marcar/configurar reunidos junto ao cabeçalho das curvas, removendo a faixa vazia. Sem preenchimento amarelo/verde no hover; destaque breve apenas nas letras, respeitando movimento reduzido. Nome de navegação `Estimativas aprovadas` solicitado por Gabriel; o conjunto calculável e a identificação técnica Finotti permanecem, sem nova homologação ou validação estatística. [Fonte](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md), refinamento seção12.
- **Validação:**28testes da experiência/9arquivos, tipos/lint/build aprovados; três cenários de navegador1440 claro/escuro e390, transparência/sombra dos botões verificadas, seis jornadas completas/backtest/comparação/Excel24linhas preservadas. Zero errosJS/overflow horizontal ou chamadas adicionais. Dados sintéticos, sem nova API real; [evidência](../features/estimativas-vendas/EVIDENCIAS_MAPA_CURVAS_2026-10-28.json) `compactActions`. Retomada após bloqueio temporário da revisão automática por limite de uso, sem contornar a revisão.
- **Estado/próximo:** validado localmente, envio conforme autorização vigente; nova publicação/aceite no site pendentes. Alterações paralelas preservadas e contratos científicos/operacionais intactos.
- **Aceite posterior em28/10:** Gabriel informou nesta conversa que conferiu em produção e está ótimo por ora, após envio `9d14f2a`. Verificado em produção pelo usuário; não houve nova inspeção do agente nem confirmação do hash servido. Frente encerrada por ora. Retomar quando houver comprovação do formato final de saída para Nicolas/Belogic; aceite da interface não homologa importação ou precisão estatística.
- **Monday:** [Estimativas de vendas por empreendimento](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; somente referência.

### 28/10/2026 — Estimativas: ajustes laterais, galerias e carrossel estável

- **Entrega:** conceito aprovado por Gabriel implementado: Sheet direito agrupa projeção/disponibilidade/tipo/cidade/apresentação e informações do universo. Busca/curvas/ações no centro, marcar todos como link discreto. Comparação orienta escolher dois ou mais e informa `Comparar N curvas`. Controles mini/detalhado e nome/vendas alternáveis e empilhados. Outros/esgotados em grid paginado amplo, busca e cantos12px locais; sem `Incluir esgotados`. [Plano vigente, seção12](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md).
- **Transição:** detalhe permanece montado; quadro publicado associa hash/ID/data/duração/métodos/versões. Nome, valores e curva continuam juntos e opacos até o próximo resultado correto. Respostas atrasadas/divergentes descartadas, até dois vizinhos preparados em cache, prioridade do detalhe preservada. Exportação/controles desabilitados enquanto pendente, setas e identidade Brain disponíveis; movimento reduzido respeitado. Motores e dados matemáticos intactos.
- **Validação:**119Vitest/18arquivos, tipos/lint/build aprovados. Novos testes de A→B→C atrasado, duração, identidade divergente e galeria. Navegador local1440 claro/escuro e390 com cálculo atrasado400ms, paginação12/4itens e seleção orientada aprovados, sem errosJS/overflow ou consultas extras. Seis jornadas completas/Excel24linhas e replay Maragogi com13pontos preservados. [Evidência](../features/estimativas-vendas/EVIDENCIAS_MAPA_CURVAS_2026-10-28.json), campo `settingsAndBuffer`. Capturas revisadas visualmente; dados sintéticos e replay, sem nova coleta autenticada.
- **Estado/próximo:** validado localmente; envio conforme autorização vigente da frente. Publicação e aceite da revisão no site pendentes. Contratos Belogic, origem/cadência por período, preço/rateio/reconciliação e precisão independente permanecem abertos; nenhuma homologação de importação. Alterações paralelas preservadas.
- **Envio:** implementação `b0757b2` enviada a origin/main em28/10; main/origin0–0 conferido. Git enviado não significa publicação nem verificação no site.
- **Monday:** [Estimativas de vendas por empreendimento](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; somente referência, sem escrita.

### 28/10/2026 — Estimativas: exploração direta, carrossel e histórico Maragogi

- **Entrega:** clique abre curva; modo Comparação explícito seleciona. Ações/contagem acima dos cards, barra inferior retirada, comparar habilitado com dois ou mais itens e pulso reduzível. Download coletivo conserva revisão explícita. Detalhe com gráfico dominante, histórico completo e controles abertos; método/dados/backtest em vistas próprias. Setas laterais seguem a ordenação efetiva do mapa. [Plano vigente, seção11](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md).
- **Diagnóstico real:** duas consultas autenticadas somente leitura HTTP200 retornaram25cadastros de Maragogi. Max Tulum — BlocoB tem13registros válidos2023-10–2026-09, principalmente trimestrais. A linha mensal sem pontos escondia observações isoladas. Pontos agora visíveis, guia pontilhado somente visual, meses vazios continuam nulos; nenhuma imputaçāo, regra de cadência ou alteração do motor. Projeção atual segue após último registro; datas anteriores apenas no backtest.
- **Validação:**115Vitest/16arquivos, tipos/lint/build aprovados. Replay do snapshot real1440/390 renderiza13pontos, valida carrossel ordenado, modo comparação e ausência da barra inferior; desktop principal sem rolagem, celular com rolagem vertical por legibilidade. Quatro regressões de mosaico e seis jornadas completas/Excel24linhas também aprovadas; sem errosJS ou overflow horizontal. [Evidência](../features/estimativas-vendas/EVIDENCIAS_MAPA_CURVAS_2026-10-28.json), campo `directExploration`. Primeiro ensaio contou pontos antes do cálculo terminar; instrumentação passou a aguardar o gráfico e a nova corrida completou.
- **Estado/próximo:** validado localmente; envio àmain conforme autorização vigente. Publicação e aceite desta revisão no site pendentes. Cadência/origem oficiais, precisão independente e contrato de importação permanecem abertos. Materiais privados ignorados; alterações paralelas preservadas.
- **Monday:** [Estimativas de vendas por empreendimento](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; somente referência, sem escrita.

### 28/10/2026 — Estimativas: controles abertos e exploração dentro do card

- **Pedido/entrega:** Gabriel testou o mapa e pediu menos caixas e expanders. Resumo aberto e grupos de busca, duração, disponibilidade e tipo expostos; cidade só quando necessário. Listas extensas de outros/esgotados usam Dialog. Mapa sem moldura, ações com estado sublinhado e cards arredondados localmente em8px, conforme solicitação explícita; tokens globais intactos.
- **Interação:** card contém botões irmãos para selecionar e explorar, sem aninhamento; abrir curva preserva seleção e fechar devolve foco ao acionador. Cor, hachura, motores e contratos preservados. Detalhes no refinamento editorial da seção10 do [plano](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md).
- **Evidência:**23testes da experiência, tipos/lint/build e quatro cenários de mosaico +seis de jornada completa aprovados em Chromium local, com dados sintéticos. Sem errosJS/overflow ou chamadas extras; Excel24linhas reaberto. [Registro](../features/estimativas-vendas/EVIDENCIAS_MAPA_CURVAS_2026-10-28.json), campo `editorialRefinement`.
- **Estado/próximo:** validado localmente, entrega destinada àmain conforme autorização de envio vigente. Publicação e aceite desta revisão em produção pendentes; sem nova API autenticada, alteração de motores ou homologação de importação. Alterações paralelas preservadas.

### 28/10/2026 — Estimativas: mapa mini/detalhado implementado

- **Entrega:** mosaico inicial com miniaturas SVG percentuais, modos mini/detalhado, faixa de inspeção e lista alternativa. Seleção compartilhada, destaque oliva, Finotti primeiro, ordenação por nome/vendas, paginação 500/60. Cor significa unidades previstas, hachura ausência de referência; eixos comuns e lacunas preservadas. Motores, detalhe/backtest e Excel reutilizados.
- **Execução:** resumos no worker em blocos de16, cache e prioridade inferior às interações; não faz novas chamadas à API para mudar filtros/vistas. Plano técnico na seção10 do [fluxo essencial](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md); [evidência](../features/estimativas-vendas/EVIDENCIAS_MAPA_CURVAS_2026-10-28.json).
- **Validação:** 114Vitest/16arquivos,15Node operacionais, tipos/lint/build aprovados. Chromium local com146/478/501cadastros sintéticos e regressão completa1440/768/390 claro/escuro, seleção, detalhe/backtest, comparação e Excel24linhas; sem errosJS/overflow ou consultas extras. Ajuste de contraste conferido visualmente. Tokens intactos. Nenhuma nova leitura autenticada de base real nesta revisão.
- **Estado:** implementação `8ae89a3` enviada a origin/main em 28/10 por autorização de Gabriel; main/origin 0–0 conferido após o envio. Publicação e produção não verificadas; contratos externos e precisão independente continuam pendentes. Alterações paralelas preservadas.
### 28/10 — Estimativas: simplificação após grill de uso — Gabriel / Codex

- **Mudança:** entrada só com território hierárquico (vários estados/cidades), sem banner/IDs/modalidades. Finotti primeiro, card selecionável com destaque oliva, exploração separada e origem no último dado de cada empreendimento. Períodos disponíveis com anterior/próximo substituem calendários/sliders. Comparação padrão em percentual/tempo relativo, detalhe em acumulado de unidades e Excel direto após revisão.
- **Código:** retiradas as jornadas UI Preparar lote/Estudos científicos e seus componentes exclusivos, por decisão explícita de Gabriel. Motores, políticas e testes de cálculo preservados. Origem/cadência/importação continuam sem semântica inventada.
- **Validação:** 109 testes da feature e 15 contratos operacionais; tipos/lint/build e matriz Chromium local 1440/768/390 claro/escuro, Excel reaberto com origens diferentes, sem consulta adicional na exploração. [Decisões e evidências](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md#9-simplificação-após-grill--decisões-e-execução-em-2810). Sem nova consulta autenticada nesta revisão e sem push/deploy.
- **Envio autorizado em 28/10:** Gabriel autorizou o push da simplificação `a2b73d8`, acompanhada de `c9366a7` (tipagem de teste Excel). Fetch conferido sem novidades e gate documental aprovado. Publicação da nova revisão e verificação de produção ainda não confirmadas.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`, referência somente.

### 28/10 — Estimativas: fluxo essencial V1 e integração da main — Gabriel / Codex

- **Entrega:** universo autorizado → curvas → exploração temporal/backtest → seleção/carteira → pacote revisável. ZIP v2 usado seletivamente; matemática demonstrativa rejeitada. Worker persistente/cache limitado, gráficos largos, seleção independente de filtros e card curto de teste. Estudos científicos e operação anteriores preservados.
- **Arquivos/contrato:** [plano técnico e evidências](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md). ZIP/CSV/HTML/JSON e XLSX candidato com 26 colunas apenas para tipologia única/períodos novos; nenhuma linha homologada. Origem, cadência, preço, rateio e reconciliação externos continuam pendentes.
- **Integração:** merge autorizado `86b716e`, com três commits remotos de Excel/MCMV/garagem; alterações paralelas preservadas. V1 validada localmente, sem push/deploy. Registros verificáveis e resultados finais ficam no plano da feature.
- **Commit da implementação:** `d683df3`. Gate `check:live-docs origin/main HEAD` aprovado; tamanho LIVE permanece com aviso, e ensaio de rotação não encontrou entradas anteriores a21/10 elegíveis. Nenhuma entrada histórica foi descartada.
- **Sincronização para envio autorizado em 28/10:** merge `d1be35e` incorpora cinco commits novos do Edgar até `bc04d51` (Relatório API Excel); 81 testes desse módulo e build integrado aprovados. Conferência de três versões do LIVE: nenhuma linha não vazia perdida. Push autorizado por Gabriel; publicação e comportamento no site ainda precisam de conferência.
- **Validação:** 113 testes do estimador, 15 operacionais e 57 de Excel integrado aprovados; tipos/build/lint conferidos. API real local: 1.996 empreendimentos/21 páginas200, 76,17s carga e 78,06s primeira curva; 20 interações p50 95,80ms/p95 546,42ms, sem nova consulta de histórico ou erro JS. Pacote real reaberto com 26 colunas/12 linhas candidatas, IDs texto e campos pendentes vazios; nenhuma linha importável. Matriz visual e fonte de cada evidência no plano.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; referência somente, sem escrita.
### 28/10 — Relatório API Excel: totais históricos por empreendimento — Edgar / Codex

- **Mudança exclusiva:** oito métricas disponíveis Por empreendimento: estoque, distratos, vendas brutas/líquidas e respectivos VGVs. Soma todas as tipologias observadas por período, incluindo Garden/Cobertura; trimestre soma fluxos e última posição de estoque por tipologia. VGV preserva preços próprios/regras atual-período e escala só na exportação. Campo ausente em fechamento deixa total vazio; tipologia sem fechamento não contribui. Mesma tipologia repetida idêntica não duplica total; divergência bloqueia. Cadastro/unidades totais/médias/MCMV não somados; Por tipologia intacto.
- **Validação:**81 testes em seis arquivos aprovados; mensal/trimestral nos dois modos monetários e layouts, escala XLSX reaberto, zero/saldo negativo, lacunas, campo ausente e duplicação/conflito. Tipos/lint/build aprovados. Navegador1440/390 claro/escuro com API simulada: duas tipologias geram uma linha, estoque25, vendas9, distratos2, VGV estoque10.400.000 na escala padrão, prévia/download com quatro chamadas de coleta e zero erro de página. Evidência local ignorada verify-building-totals.cjs em .local-inputs/api-excel-check. Sem consulta autenticada ou alteração no coletor/AELO/Dashboard.
- **Etapas/Pendências:** implementação local, publicação/aceite real dependem de autorização; base d027157, commit desta entrada. Fetch sem novidades; quatro commits anteriores preservados. Sem push/Monday.
- **Monday:** —

### 28/10 — Relatório API Excel: nível explícito e colunas compatíveis — Edgar / Codex

- **Mudança exclusiva:** seletor Nível do relatório com Por empreendimento/Por tipologia (padrão), reutilizando Select e ReportFieldLabel/Tooltip Brain. Substitui agrupamento automático por campos. Motor agrupa por ID/período ou ID antes da projeção; não exige exportar ID. Seleção apenas exporta, removendo campos incompatíveis ao trocar nível e invalidando download. Por empreendimento oferece só cadastro, total de unidades, médias e MCMV; campos específicos e métricas de tipologia não constam nem no motor/Excel. Nome do arquivo informa nível.
- **Validação:**74 testes em cinco arquivos; motor nos dois layouts, período oculto, ID não exportado, seleção todas, ausências, conflitos, preservação dos dados, reabertura XLSX e interface alternando nível sem consulta extra. Tipos/lint/build aprovados. Navegador1440/390 claro/escuro com API simulada: tipologia padrão, mudança de nível, remoção dos campos incompatíveis, download invalidado/regerado, prévia e XLSX com uma linha/30unidades sem soma, nome identificando nível, quatro chamadas de coleta e zero erro de página. Evidência local ignorada verify-level.cjs/capturas em .local-inputs/api-excel-check. Sem API autenticada/aceite real. Padrões de carregamento existentes preservados.
- **Etapas/Pendências:** implementação local, publicação/aceite real pendentes; base1d6ad7e, commit desta entrada. Fetch de ambos sem novidades, três commits locais anteriores preservados. AELO/Dashboard/coletor intactos; sem push/Monday.
- **Monday:** —

### 28/10 — Relatório API Excel: agrupamento por seleção de cadastro — Edgar / Codex

- **Mudança exclusiva:** selecionar ID Empreendimento com campos apenas de empreendimento agrupa por ID/período no tabular e ID no horizontal. Campos de tipologia/métricas de vendas/estoque mantêm detalhe. Ocultar Período não elimina meses distintos. Médias/totais não são somados; lacunas usam valor disponível do mesmo grupo; valores preenchidos conflitantes bloqueiam com orientação. Regra descrita em Selecionar colunas, aplicada só ao gerar, prévia/XLSX iguais.
- **Validação:**64 testes de motor/MCMV aprovados; casos agrupados e detalhados nos dois layouts, períodos ocultos, duas identidades, lacunas, conflitos, preservação dos brutos e XLSX reaberto. Tipos/lint dirigidos. Sem consulta autenticada/regeneração integral de Campinas ou novo ensaio visual.
- **Etapas/Pendências:** implementação local concluída; publicação depende de autorização. Base4053ca4; commit desta entrada. Fetch desta etapa recusado pelo ambiente: comparações usam últimas referências disponíveis; sem push, merge ou alegação de remotes atualizados. Auditoria local preservada.
- **Monday:** —

### 28/10 — Relatório API Excel: preço usado na Faixa MCMV — Edgar / Codex

- **Mudança exclusiva:** campo selecionável Preço Médio para Faixa MCMV após Faixa MCMV, com o mesmo resultado quantity-standard passado ao classificador. Tabular usa período da linha; horizontal conserva posição final e série histórica. Não altera fórmula/limites/elegibilidade. Reais com duas casas em prévia/XLSX, sem escala VGV; sem base válida fica vazio.
- **Validação:** testes dos dois layouts com janeiro100.000/fevereiro275.000, exclusão de Garden, independência da média geral/escala VGV, seleção e XLSX reaberto com valor numérico e duas casas. Tipos/lint dirigidos; sem API autenticada ou ensaio visual novo.
- **Etapas/Pendências:** implementado localmente, publicação aguarda autorização; base66cce08, commit desta entrada. Sem push/Monday. AELO/Dashboard intactos.
- **Monday:** —

### 28/10 — Relatório API Excel: unidades totais e conferência da base MCMV — Edgar / Codex

- **Análise:** confirmado que MCMV atual e histórico usam quantity-standard: soma price×qty / soma qty somente tipologias Padrão, excluindo Garden/Cobertura. Mantida regra anterior até confirmação explícita de incluir todas as tipologias.
- **Mudança exclusiva:** coluna selecionável Unidades Totais do Empreendimento após Unidades por Tipologia, usando data.total_units cadastral (campo também mapeado no Dashboard, sem alterá-lo). Repetido por linha, sem somar históricos/tipologias e sem fallback quando ausente.
- **Validação:** testes de prévia e reabertura XLSX nos dois layouts para número/texto numérico, zero e ausências; tipos/lint dirigidos. Sem consulta autenticada. AELO/Dashboard e fórmula MCMV intactos.
- **Etapas/Pendências:** coluna implementada localmente; confirmação de eventual mudança da média MCMV para todas as tipologias e publicação pendentes. Base1a82104; commit desta entrada. Sem push/Monday.
- **Monday:** —

### 28/10 — Relatório API Excel: Garagem textual — Edgar / Codex

- **Correção:** Garagem passa a preservar o texto de typologies_history[].garage no último fechamento da tipologia até o corte. Removida a conversão numérica que descartava descrições como “1 vaga” e “1 a 2 vagas”. Nulo/ausente permanece vazio; zero é conservado como texto. Sem mudança de API, histórico, AELO ou Dashboard.
- **Validação:** teste de prévia e XLSX reaberto nos dois layouts com descrições, espaços, zero e ausências; tipos e lint dirigidos. Consulta autenticada não executada; a correção usa o contrato textual confirmado pelo usuário.
- **Etapas/Pendências:** correção local, publicação aguarda autorização; base079bdcd, commit desta entrada. Sem push/Monday.
- **Monday:** —

### 28/10 — Relatório API Excel: histórico desde lançamento e Faixa MCMV por período — Edgar / Codex

- **Diagnóstico:** planilha Campinas fornecida com132.427 linhas/151 períodos/877 pares empreendimento-tipologia.82.118 linhas anteriores ao lançamento e22.081 posteriores com todas as métricas vazias; preços presentes em28.228. O tabular cruzava todos os períodos globais com todas as tipologias. Exemplo Midtown Aquidaban: lançado ago/2014, exportado desde mai/2002. Sem payload bruto não se atribui cada lacuna à API.
- **Mudança exclusiva:** histórico a partir do mês de release_date, inclusive em trimestre parcial; períodos anteriores excluídos da coleta local de históricos/limites, sem alterar requisições. Tabular só emite períodos com fechamento; horizontal mantém união de períodos com lacunas vazias. Não inventa preços/vendas/estoques nem preenche ausência com zero.
- **MCMV:** campo imediatamente após Padrão. Tabular calcula por mês/trimestre, ponderação quantity-standard exclusiva; horizontal conserva faixa final e acrescenta série histórica no mesmo bloco após Padrão. Seleção Faixa MCMV expande períodos somente na geração. Tetos do JSON original2026 também usados no histórico, sem afirmar tetos normativos passados. Regras e ausência de lançamento descritas na interface/doc da feature. Atualização por upload/Supabase cancelada permanece ausente.
- **Validação/limites:**64 testes em cinco arquivos, tipos/lint/build aprovados; limites MCMV, mudança de faixa mensal, trimestre de lançamento, seleção, exportação e reabertura XLSX. Navegador desktop1440/claro com rede simulada: coluna selecionável, descrição MCMV, hover/foco e quatro chamadas de coleta, sem erro de página. Ensaio de vários temas/larguras interrompido por timeout de hover; smoke desktop repetido aprovado. Mobile/escuro desta revisão e consulta autenticada/regeneração integral de Campinas com dados brutos não concluídos. Padrões de seleção/descrições existentes reutilizados, sem alterar carregamento ou componentes compartilhados. AELO/Dashboard intactos.
- **Etapas/Pendências:** ajuste local concluído, aguarda publicação autorizada e nova geração pelo usuário. Base0e01278; commit desta entrada. Sem push/Monday. Auditoria local preservada.
- **Monday:** —

### 28/10 — Relatório API Excel: Faixa MCMV — Edgar / Codex

- **Mudança:** nova coluna fixa selecionável Faixa MCMV, exclusiva de Vertical Econômico/Standard; acrescenta o sufixo da faixa e preserva Padrão. Média exclusiva ponderada pela oferta lançada somente tipologias Padrão, na última posição até o mês final, independente das opções gerais de média, visão e VGV. Calculado somente em Gerar relatório após coleta completa. Coletor/AELO/Dashboard intactos.
- **Fonte:** planilha municipal fornecida, 5.571 chaves únicas UF/cidade, tetos positivos. Faixa2 até teto; Faixa3 até400.000; Faixa4 de400.000,01 até600.000, conforme confirmação. Sem teto conhecido, elegibilidade ou média válida: vazio. Tabela derivada/SHA-256 e regras em docs/features/relatorio-api-excel.md; descrições na seção2 da interface.
- **Validação:** 61 testes em cinco arquivos, incluindo limites em centavos, correspondência municipal, média exclusiva, ausência de Padrão, corte temporal e reabertura XLSX nos dois layouts. TypeScript, lint dirigido e build aprovados. Navegador com rede simulada; consulta autenticada e aceite com dados reais não executados.
- **Etapas/Pendências:** implementação local concluída; publicação aguarda autorização. Base atualizada por fast-forward para7cacaf8, preservando auditoria local. Padrões de seleção de colunas e descrições existentes reutilizados; sem novo controle/carregamento. Sem push/Monday.
- **Monday:** —

### 27/10 — Estimativas: protótipo Claude Design adaptado — Gabriel/sessão
- Estado: validado localmente; push autorizado por Gabriel. [Fonte, decisões e limites](../features/estimativas-vendas/PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md#10-adaptação-do-zip-claude-design-e-envio-autorizado--2710).
- Jornada em etapas, período/timeline, amostra/métodos, cartões/proporções/sobreposição, níveis de evidência, explicações dos gráficos, painel de ajustes e premissas recolhidas após cálculo. Dados/motores/guardas e Preparar lote preservados.
- ZIP original ignorado; textura de marca incorporada. Tokens SE intactos; não transportar cálculos, limites, cores/tokens ou backend fictícios do protótipo.98testes/tipos/lint/build e QA responsiva do preview; nenhuma nova alegação estatística. Publicação/site ainda exigem conferência após envio.
- Monday: [Estimativas de vendas](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`. Nenhuma escrita.

### 27/10 — Bancada científica Curitiba local — Gabriel/sessão
- Estado: validado localmente, sem push/deploy. [Execução, testes e limites](../features/estimativas-vendas/PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md#9-execução-local-em-2710--evidência-e-limites); evidência agregada vinculada ali, brutos ignorados.
- Entrada por estudos/condições, retrospectiva em worker, métricas pareadas, gráficos amplos, detalhe/equação, carteira/sobreposição e ZIP de evidências. Preparar lote e motores Finotti preservados; Excel opcional reutilizado. Sem edição de parâmetros ou ampliação silenciosa do domínio.
- API Curitiba: 1.996 empreendimentos/413.279 linhas, 21 páginas200; 37 horizontais/347 verticais nas condições consideradas, 186 estoques antigos e 1.313 esgotados (grupos podem se sobrepor). Comparação com estoque reportado, não coleta comprovada ou validação independente Finotti.
- 98 Vitest + 15 Node, tipos/lint/build; Chromium390/768/1440 claro/escuro e preview compilado; API real na UI, zero erroJS e zero consulta adicional na análise/exportação. Preview com API real: carga76,27s/cálculo19,40s numa medição; contagens37/347 confirmadas no ZIP.
- Próximo: ZIP/aceite visual, proveniência/cadência e protocolo independente antes de ajustar modelos ou calibrar faixas. Contrato/importação/reconciliação continuam pendentes.
- Monday: [Estimativas de vendas](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`. Nenhuma escrita.

### 27/10 — Plano da bancada científica Curitiba e handoff visual — Gabriel/sessão
- Estado: preparado; documentação local, sem nova UI, consulta Curitiba, backtest, push ou deploy.
- Plano/CTA técnico: [bancada científica](../features/estimativas-vendas/PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md). Briefing/CTA Claude Design vinculado pela baseline; contratos e testes de temporalidade, amostra comum, origem e estados de interface definidos.
- Próximo: prototipação por Gabriel/Claude Design; implementação local via CTA, preservando operação. Homologação/importação e cadência/origem continuam pendentes.
- Monday: [Estimativas de vendas](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) ? `13096757074`. Nenhuma escrita no Monday.

### 27/10/2026 — Estimativas: explicar curvas de Rio Branco com dados reais — Gabriel / Codex

- **Diagnóstico:** [exemplos e limites das contagens](../features/estimativas-vendas/BASELINE_OPERACIONAL_E_PLANO_2026-10-27.md#explicação-com-rio-branco--reprodução2710). Consulta somenteleitura reproduz29/23coleta/4pendência/2semmodelo e11resultados da referência;5jáesgotados/6comestoque. Coleta não impede cálculo. ExemplosEcovillage/PortalViaVerde/Orquídeas/BosquePrimavera/IlhaDeCreta/SwissPark documentados; sem extrapolar coeficientes ou inferir tipo pelo nome.
- **Evidência/estado:** script `estimativas-rio-branco-explain.mjs`, replay e hashes na baseline;2respostas200, mesmoscontratos e motores da página. Diagnóstico validado localmente, não precisão comercial. Nenhuma interface/regra alterada ou escrita naAPI.
- **Pendências:** melhorar comunicação de suporte matemático versus decisãooperacional e distinguir esgotados na contagem; origem/cadência/granularidade continuam abertas. Sem push/deploy desta revisão.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — referência, sem escrita.
### 27/10/2026 — Estimativas: primeira jornada após o grill — Gabriel / Codex

- **Entrega:** [premissas confirmadas e fatia local](../features/estimativas-vendas/BASELINE_OPERACIONAL_E_PLANO_2026-10-27.md#decisões-de-experiência-confirmadas-no-grill--continuação2710). Entradas região/UF/cidades/IDs autorizados, dois tipos juntos, resumo/lista, proposta com Incluir/Retirar, filtros independentes e detalhe amplo. Comparação de métodos sem edição de entradas/parâmetros, sem fallback automático; inventário de situações por frequência. Conferência Excel existente em diálogo próprio.
- **Evidência:** 70 testesVitest, tipos/lint/build; quatro percursos locais390/1440 claro/escuro com fontes sintéticas, foco/Escape/paginação/download/composição e Brain sem overflow/erro. Scripts estimativas-operational-browser/live em diagnostics; fontes/capturas ignoradas. Consulta real e limites registrados na baseline.
- **Etapas/pendências:** preparado/validado localmente conforme evidência, sem push/deploy. Referência calculável não é aprovação operacional; cadência/origem por competência, equivalência da preparação, granularidade, partição da metade, preço e saídaIVV ainda impedem lote importável. CSV/JSON são conferência, não retornoBelogic. Próximo revisão humana da jornada e completar contratos, sem inventar nova modelagem.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — leitura/referência, nenhuma escrita.

### 2026-10-22 — Finotti: API confirmada e plano do dossiê/simulador — Gabriel / Codex
- **Ambiente/funcionalidade:** Rebrain/SID, Estimativas de vendas; diagnóstico somente leitura, sem interface ou backtest real.
- **O quê/por quê:** autenticação local e histórico horizontal Geobrain confirmados em Fortaleza e Blumenau. Auditoria agregada identifica campos, reconciliação brutas−distratos, meses negativos, rótulos de produto e ausência de flag observado/estimado por competência na resposta. Gabriel/Codex passam a conduzir implementação/dossiê; Edgar apoia esclarecimento de acesso/contrato em paralelo, conforme direção de Gabriel.
- **Evidência/estado:** [plano e números da sondagem](../features/estimativas-vendas/PLANO_API_DOSSIE_SIMULADOR_2026-10-22.md), `scripts/diagnostics/estimativas-api-audit.mjs`; HTTP 200 para cidades monitoradas/histórico, 43 empreendimentos e 2.965 linhas em Fortaleza, 38 e 1.754 em Blumenau. Estado **preparado** para retrospectiva; nenhum mês tratado como gabarito observado sem linhagem confirmada.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; leitura de referência, sem escrita.
- **Impacto em Etapas/Pendências:** fonte API viável; próximo adaptar payload bruto sem trocar nulo por zero, fechar origem por período, revisar vendas negativas, rodar comparação pareada e só então habilitar simulador de teste. Push/deploy não feitos nesta sessão.

**Complemento documental de22/10 — Gabriel/sessão, estado preparado.** Diego encaminhou resposta de Evandro: `bases.estimation` é a única flag da base/período estimado; `bases.ivv_batch_id` rastreia atualizações IVV em lote. A API sondada não mostra a flag por linha mensal, portanto o histórico continua sem gabarito confirmado. Gabriel buscará exportação real para confrontar esquema e API; enquanto isso, pediu primeira página editorial funcional só com leitura da API, empreendimento isolado/carteira, gráfico interativo e responsivo, explicação recolhível e exportação **de revisão**. [Plano de implementação e CTA](../features/estimativas-vendas/PLANO_PAGINA_EDITORIAL_API_2026-10-22.md); nenhuma UI ou upload executado neste complemento. Monday de referência acima, sem escrita.

**Auditoria posterior de22/10 — mesma frente, estado preparado.** Exportação real da Análise Temporal Geobrain tem seis abas agregadas/84 competências e não contém ID/flag da base; `NaN` em linhas de variação e zeros sem prova de coleta mensal. Segunda exportação recebida contém cadastro de204 empreendimentos **verticais**, sem histórico ou flag. Manual Linkages explica a tela, ficha individual e download detalhado do Mapa, mas não fornece contrato de retorno. API autorizada retornou Guarapuava29 horizontais/1.167 linhas; Guaratuba não consta nas355 cidades do token e retornou HTTP422. Brutos preservados em `.local-inputs/` com hashes; [auditoria](../features/estimativas-vendas/AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md), plano e CTA atualizados para paridade apenas com recorte idêntico e próxima amostra horizontal por competência. Sem UI/backtest homologado/push/deploy ou escrita Monday.

### 2026-10-21 — Estimativas Finotti: motor horizontal e ensaio de corte — Gabriel / Codex
- **Ambiente/funcionalidade:** Rebrain/SID, código local em `src/features/estimativas-vendas/`, sem rota ou integração Geobrain.
- **O quê/por quê:** coeficientes do slide 7 versionados à parte do motor puro; caso fechado 300/150/6 reproduzido (`k=0,632035`, 65,84% no mês 12, 75,04% no 18, cruzamento de 95% no 61 e contagem ilustrativa até 67). Ensaio em memória congela origem e compara curva com médias de 3/12 meses, omitindo cauda e extrapolação da métrica.
- **Evidência/estado:** [reprodução e handoff](../features/estimativas-vendas/REPRODUCAO_E_HANDOFF.md), testes focados de matemática e corte, tipagem e lint locais; nenhum dado real processado, nenhuma regra da cauda mensal ou banda inventada. Estado validado localmente apenas para a reprodução matemática; teste retrospectivo real pendente.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; sem escrita.
- **Impacto em Etapas/Pendências:** M1 parcial e estrutura de M2 preparados; próximo obter MD/código e exportação/retorno Geobrain com Edgar, confirmar domínio/cauda/bandas e avaliar um recorte observado. Push/deploy pendentes de autorização.

### 2026-10-21 — Estimativas de vendas Finotti: pacote técnico inicial — Gabriel / Codex
- **Ambiente/funcionalidade:** Rebrain/SID, futura feature Estimativas de vendas; status PLANEJADA, sem motor/rota runtime.
- **O quê/por quê:** contexto da reunião19/10, email21/10, equação horizontal, coeficientes, dados dos slides, regras históricas Monday, contrato candidato e roteiro de validação reunidos para conversa técnica dedicada. Rebrain é o destino do exercício; Edgar conduz/Gabriel apoia, integração Geobrain posterior.
- **Arquivos:** [índice](../features/estimativas-vendas/README.md), [manifesto](../features/estimativas-vendas/MANIFESTO.md), fontes, contrato/validação e CTA. PPTX copiado com hash verificado para `.local-inputs/estimativas-vendas/2026-10-21/`, ignorada; original preservado.
- **Evidência/estado:** dez slides e caches de quatro gráficos extraídos, links internos/manifesto verificados. Somente preparação documental; MD/código original, bandas, vertical, contrato oficial e teste retrospectivo real pendentes. Nenhuma UI, matemática executada, base real processada, escrita Monday, banco ou deploy. Commit isolado desta entrada e pacote; hash consultável pelo histórico da pasta.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; leitura apenas.
- **Impacto em Etapas/Pendências:** documentação inicial preparada; implementação e homologação não iniciadas. Próximo: recuperar insumos/contrato e reproduzir o caso fechado300/150/6 com as limitações descritas.

### 2026-10-21 — Empresas: fallback mensal com competência explícita — Gabriel / Codex
- **Mudança:** proxy BigQuery passa a informar disponibilidade e vínculos entre estabelecimentos e empresas; materializador tenta até seis competências em ordem decrescente e publica somente carga íntegra. Cargas já publicadas são preservadas. Interface e exportações mostram a competência efetiva e aviso quando anterior ao alvo; rechecagem da fonte em até 24 horas.
- **Evidência/estado:** código em `supabase/functions/empresas-*`, `src/features/empresas-empregados/` e `Sistema-Quanti/Sistema Novo/gcp/bigquery-proxy/`; testes focados, tipagem e build locais. Acesso de julho a maio/2026 sem linhas visíveis e abril disponível em consulta agregada de São Paulo (2.702.140 estabelecimentos com vínculo); sem materialização remota nesta etapa. Estado validado localmente; deploy do Cloud Run antes das três Edge Functions e Publish frontend, seguido de teste em São Paulo e cidade já publicada, pendentes.
- **Monday:** [reBrain — Empresas e Empregados](https://brain381753.monday.com/boards/18398428946/pulses/12880655319) — `12880655319`; sem escrita no card.

### Validação do Fechamento — multi-cidade, resumo por cidade e % de fechamento
- **Multi-cidade:** novo `use-vf-data.ts` consulta até **10 municípios** da UF selecionada em
  paralelo e mescla tudo em uma base única deduplicada por `building_id`; falhas por cidade são
  reportadas sem derrubar as demais.
- **Header:** `VFCityMultiSelect` (UF + multi-seleção de municípios monitorados, sem fallback IBGE)
  e novo filtro **"Cidades carregadas"** (seleção única, `Todas` por padrão).
- **Nova guia "Resumo por cidade":** repete a tabela Resumo em um bloco por cidade carregada.
- **Nova medida "% de fechamento":** representatividade de `building_id` distintos com
  `typologies_history.period` no último período do bucket sobre o total de empreendimentos,
  renderizada como medidor 0–100%.
- **Ícones (i):** cada medida do Resumo exibe popover com a regra de cálculo (`METRICS[].info`).


## 2. Etapas

**29/10 — SP, segundo lote:** implementados localmente 23–30 e 32–38, incluindo INCC-DI com base única no mês disponível; 173 testes aprovados. Soma ao lote 13–22 e preserva 85 posições. Revisar cobertura real, classificação histórica e critério INCC com analista; publicação observada e exportação integral continuam pendentes.

**29/10 — SP, correção após teste e coleta granular:** setembro confirmado nas três séries por respostas do usuário, apesar da raiz de agosto. Descoberta do período pelas séries; diferença de balanço diagnóstica. Contagem do cadastro leve implementada sem bloquear municipal; agora no slide13original. Reteste publicado/cobertura real pendentes; raiz não limita séries.

**29/10 — SP Institucional:** estrutura original85restaurada, com pendentes explícitos; lote analítico13–22implementado localmente, usando cadastro existente e série municipal de unidades.149testes e QA local; validar cobertura histórica/classificação/valores reais.85posições não são85conteúdos prontos. Publicação verificada/exportação/homologação integral permanecem pendentes.

**29/10 — Estimativas:** Gabriel reabriu a frente para prévia configurável no modal:50linhas, ordem/ocultação aplicadas ao Excel completo. Implementada e validada localmente (122testes), publicação/aceite desta revisão pendentes. Interface anterior aceita em produção por Gabriel em28/10 após envio`9d14f2a`. Fonte/limites na seção13 do plano essencial. Contrato final de saída Nicolas/Belogic, importação e avaliação independente continuam abertos.

**22/10 — Estimativas de vendas Finotti:** reprodução matemática local e acesso API somente leitura confirmados; [plano do dossiê](../features/estimativas-vendas/PLANO_API_DOSSIE_SIMULADOR_2026-10-22.md), [auditoria das exportações](../features/estimativas-vendas/AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md) e [plano da página editorial](../features/estimativas-vendas/PLANO_PAGINA_EDITORIAL_API_2026-10-22.md) definem fontes, recortes, carteira e interface. Guarapuava/Maringá conciliou 72 empreendimentos/124 tipologias horizontais e oito trimestres com a API/Série Histórica. Curitiba ampliou a evidência: 371 empreendimentos/693 tipologias horizontais, 14.154 vendas e 14.154 estoques numéricos comparáveis iguais à API em 11/2024–09/2026. A API preenche posições `-` do Excel, e um vertical exportado falta na API; completude não é idêntica. `bases.estimation` foi confirmado para a base/período por mensagem encaminhada, mas a linhagem ainda não aparece por competência na série API nem no Excel. Contrato oficial, retrospectiva observada, cauda mensal, bandas, UI e retorno continuam pendentes. A página horizontal poderá usar API direta, com auditoria de cobertura separada. Sem runtime publicado nesta etapa.

**22/10 — direção visual/funcional adicional de Gabriel, ainda preparada:** a primeira página API terá editorial amplo inspirado nas capturas dos slides Finotti, gráficos grandes, laboratório da equação e conferência **opcional** por Excel já na interface. O usuário verá os filtros necessários e o [exportador Análise Temporal Excel](https://app.geobrain.com.br/analise-temporal-excel); o arquivo será lido localmente para paridade por ID/competência, sem substituir a API nem enviar dados. [Plano](../features/estimativas-vendas/PLANO_PAGINA_EDITORIAL_API_2026-10-22.md) e [CTA](../features/estimativas-vendas/CTA_IMPLEMENTACAO_PAGINA_API.md) atualizados. Nenhuma tela ou teste estatístico real entregue neste refinamento.

**15/10 — Corretor F1–F6:** preparação/revisão validadas localmente; registro de execução e prévias têm limites de ativação/infraestrutura no resultado F1–F6. A2/A3/F3 servidor não encerradas.

| # | Etapa | Status |
|---|---|---|
| 1 | Migração Streamlit → React V1 (paridade) | ✅ |
| 2 | Reorganização de navegação por área de trabalho | ✅ |
| 3 | Auth global + shell + busca Ctrl+K | ✅ |
| 4 | Log de atividade (front + Edge Function) | ✅ |
| 5 | Corretor Vocacionais em runtime (auditoria + veredito) | ✅ |
| 6 | Corretor v2 — IR versionado/validado | ✅ (entregável 1; validado também nos 2 estudos reais) |
| 6.0 | Corretor v2 — Fase 0: mineração da taxonomia das notas (catálogo + gabarito) | ✅ (`taxonomia_notas.md`) |
| 6a | Corretor v2 — Fase A: regras DET sobre o IR dos estudos reais (custo zero) | ✅ (81 achados; `rules_ir.py` + `achados_fase_a.md`) |
| 6b | Corretor v2 — Fase B: calibração da seção canônica com a analista | 🔲 |
| 6c | Corretor v2 — Fase C: **extração de visão dos números** presos em imagem (caminho crítico) + ata, com cache | 🟡 (piloto validado: 48 checagens OK; falta edge function + 28 imagens do gabarito) |
| 6d | Corretor v2 — Fase D: catálogo de regras derivado das notas, validado contra o gabarito (recall/precisão) | 🔲 |
| 6e | Corretor v2 — Fase E: interface v2 (21 tipos, visualizações, veredito, export, PPTX→IR, mapas, thumbnails) | 🟡 (no ar: **upload de .pptx** + fixtures + recall/export + RADII/mapa + thumbnails c/ poda; falta gráficos no extrator, visão nível 2 dos mapas, TEMPORAL_WINDOW sobre IR) |
| 6f | Corretor v2 — estratégia de testes do fluxo do analista | 🟡 (design ✅ + slice 1 worklist ✅; slices 2-4 absorvidos pela v3) |
| 6g | Corretor v2 — repensar a interface de ponta a ponta | 🟡 (absorvido pela v3 — ver `DESIGN_corretor_v3.md`) |
| 6h | **Corretor v5** — fluxo operacional unificado | 🟡 **Implementação FECHADA e revisada** (14/jul): WS0–WS5 ✅ no código + revisão de código aprovada (v0.42 do LIVE do Corretor, com pendências P1–P7 e roadmap). Restante: verificar migrations v5 (`relatorio` ✅), deploy `analyze-table-image` (cache v7), homologação real Marka/Itajaí/GO (recall ≥90%, FP ≤15%). WS-F (file watch) = futuro. **Homologação real começou em 22–24/jul** com 4 estudos de analistas (Rolândia/Daniele + Housi/Beatriz e Finoti): 102 achados, ~100% FP nos triados → sprint de 28/jul derrubou Rolândia de 17 achados para 1 (v0.44–0.49, 78 testes verdes). |
| 7 | Relatórios Secovi (export Excel) | 🟡 (correção trimestral implementada e testada em 04/ago; aguarda homologação manual da exportação) |
| 7a | **Panorama Secovi/FIERGS** — automatização do deck trimestral | 🟡 (retorno horizontal de 06/10: contingência por produto auditado para sete condomínios aplicada no código; falta conferir PDF/CSV 2T2026 da nova versão e obter aceite. Homologação aberta. PPT editável segue para V3.) |
| 8 | API Explorer (OpenAPI + console) | ✅ |
| 9 | Qualidade CID / Piemonte | 🟡 (CID em standby) |
| 10 | Atualizador VGV V1 — operação client-side | 🟡 (motor, UI padronizada, mapa urbano, testes e build ✅; homologação pelo setor usuário pendente) |

---

## 3. Pendências

- [ ] **SP — segundo lote e INCC:** validar no site os comparativos 23/24/37/38, ranking 25, vendas 32–36 e VGL 26–30; confirmar a base comum com o analista e nominais históricos `vgv_release`. Atualizar snapshot de índices após set/2026; falta de índice bloqueia só VGL. Testes sintéticos não são aceite de mercado. Demais posições originais, oferta histórica, IVV, mapas, editorial e exportação ainda exigem implementação/revisão.

- [ ] **SP Institucional — validação publicada:** conferir a ordem original de 85 posições e os lotes 13–30/32–38, séries municipais desde 2021, cobertura do cadastro por ID/data, padrão/classificação histórica e parciais; dados locais inventados não são aceite. Contagem anteschamada2agora13original, sem bloquear municipal. Medir tempo real; diferença municipal+22/contrato líquido continuam em aberto. Preços, IVV, mapas, curva trimestral completa de oferta, editorial e exportação/homologação integral seguem pendentes; VGL/INCC e vendas longas implementados no segundo lote, aguardando revisão real.

- **Estimativas:** conferir a nova prévia de exportação em produção e aguardar comprovação do formato final de saída Nicolas/Belogic. Interface anterior aceita em28/10; revisão29/10 validada somente localmente. Origem/duração por período, contrato de importação, preço, rateio, reconciliação e avaliação independente permanecem abertos, sem homologação pelo aceite da página.

- [ ] **Estimativas de vendas Finotti:** concluir contrato de retorno/aceite operacional e avaliação independente. Página API, conferência opcional Excel, motores horizontal/vertical e reprodução de caudas/faixas já avançaram; estado vigente no [plano essencial](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md), sem manter o plano editorial antigo como lista de implementação pendente. Obter origem histórica por período e periodicidade real; comparações com saldos reportados não comprovam coleta observada. Regras de alternância/coleta, granularidade, preço e reconciliação continuam externas. Sem homologação de importação.

- [ ] **Corretor v0.73:** revisar/publicar lote de fluxo contínuo, ativar migration/Edge/frontend e conferir produção. Conversão automática hospedada e recuperação da execução em outro navegador permanecem abertas; sem IA paga sem lote/orçamento.

- [ ] **FIERGS — retorno de 06/10:** após publicar a contingência auditada, conferir o PDF/CSV 2T2026 gerado por Gabriel: os sete condomínios devem aparecer nas páginas 55/57/59/60 sem alterar loteamentos, preços ou outros totais indevidamente. A consulta ao payload bruto atual continua pendente por timeout, e o aceite explícito da Juliana ainda falta. A página 55 foi mantida com vertical e subtotal; confirmar essa interpretação de “Desconsiderar” se ela esperar exclusão integral.

- [ ] **Plataforma Rebrain — governança de custo BigQuery:** implantar o plano de labels comuns,
  auditoria de produto, agregação administrativa de `INFORMATION_SCHEMA.JOBS_BY_PROJECT`, exportação
  de Cloud Billing, orçamento/alertas e painel interno por feature. A telemetria de jobs não deve
  ser consultada a cada abertura de página. Detalhe em
  [`PLAN_BIGQUERY_COST_OBSERVABILITY.md`](../architecture/PLAN_BIGQUERY_COST_OBSERVABILITY.md).
- [ ] **Empresas e Empregados — Histórico de Empregados, Fase 2:** remuneração, setores e ocupações
  históricos; comparação municipal; e qualquer pré-carga/batch nacional. Permanecem fora da V1 de
  vínculos anuais e só avançam após *dry run*, teto de bytes, política de cache/retenção e revisão
  metodológica por recorte. Detalhe em
  [`PLAN_POS_TESTE_EMPREGADOS_UX_HISTORICO_2026-09-04.md`](../features/empresas-empregados/PLAN_POS_TESTE_EMPREGADOS_UX_HISTORICO_2026-09-04.md).
- [ ] Atualizador VGV V1: homologar a interface padronizada e o mapa urbano de `/atualizador-vgv` em desktop/mobile e nos temas claro/escuro.
- [ ] Atualizador VGV: definir rotina de atualização das séries INCC-DI, IPCA e IGP-DI (assets atuais até 01/2026).
- [ ] **API Explorer — publicar proxy Socio:** executar `supabase functions deploy socio-proxy --project-ref mxinpvcqzbfbzjodhgtz` com uma conta que tenha acesso ao projeto e, em seguida, redeployar o front-end Lovable.

- [ ] **Relatório Secovi — homologar vendas trimestrais:** correção implementada e coberta por testes;
  gerar o Excel no ambiente da área e conferir a Rubi (`4T2025 = 49 + 300 = 349`, `1T2026 = 100`,
  `2T2026 = 18`, estoque `189`). Plano e roteiro:
  [`PLAN_correcao_agregacao_vendas_trimestrais.md`](../features/relatorios-secovi/PLAN_correcao_agregacao_vendas_trimestrais.md).
- [ ] **Panorama — avaliar impressão nativa vetorial:** o CSS `@media print` já existe e daria PDF instantâneo, mas os gráficos usam `ResponsiveContainer` do recharts, que mede via JS e não é remedido na mídia de impressão; exige verificação lâmina a lâmina antes de considerar.
- [ ] **Panorama — remover `lib/pdf-print-interceptor.ts`:** arquivo morto (nenhum import) que ainda sobrescreve `window.print` e intercepta cliques com a estratégia de popup já abandonada em 19/ago.
- [ ] **Panorama Secovi/FIERGS — executar correções da V1 de Jundiaí:** executar em paralelo [`PLAN_OPUS_CORRECOES_V1_JUNDIAI.md`](../features/Relatorios%20Secovi_FIERGS/PLAN_OPUS_CORRECOES_V1_JUNDIAI.md) e [`PLAN_LUNA_CORRECOES_V1_JUNDIAI.md`](../features/Relatorios%20Secovi_FIERGS/PLAN_LUNA_CORRECOES_V1_JUNDIAI.md); o Luna integra após `OPUS_READY`, cobrindo os 28 comentários, multi-cidade, período após 1T/26, universo Secovi e novo PDF de 62 páginas. Matriz de aceite em [`MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md`](../features/Relatorios%20Secovi_FIERGS/MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md).
- [ ] **Panorama V3 — PPT editável:** o PPT espelho já está disponível na V2 como uma imagem 16:9 por lâmina; a reconstrução de textos, tabelas e gráficos em objetos nativos do PowerPoint requer escopo próprio e não bloqueia a homologação atual.
- [ ] **Panorama V2 — reativar mapa de empreendimentos:** cadastrar `VITE_MAPBOX_ACCESS_TOKEN` no ambiente publicado, restringir o token aos domínios da aplicação e homologar preview/PDF antes de reintroduzir o slide 56.
- [ ] **Panorama V2 — avaliar retorno da abertura de praça:** a referência 4 foi retirada porque a arte estática não recebe o nome do recorte; só reintroduzir com composição dinâmica aprovada.
- [ ] **Panorama — fechar metodologia com os analistas:** critério oficial de **VGV lançado**
  (estimativa via `building-with-history`) e de **% MCMV** (proxy por padrão Econômico / teto de preço).
- [ ] Panorama — confirmar que o token Secovi cobre o histórico desde 1T/22 (dado pontual 4T/21) nas cidades-alvo.
- [ ] Corretor v2: fases restantes da estratégia de testes (ver `DESIGN_corretor_v2.md`) — A/C/E já andaram; falta **Fase B** (calibração de seção) e **Fase D** (catálogo validado contra o gabarito).
- [ ] Corretor v2: calibrar dicionário de seção canônica com a analista (item 2 do plano; agora com os 2 estudos reais como base) — ver doc vivo do Corretor.
- [ ] Alinhar com o time o formato dos artefatos por estudo: slides sempre em **PPTX** (não PDF) e ata sempre em **DOCX separado** (nunca print no slide 1). Vale a partir dos próximos estudos; os 2 atuais seguem com ata em imagem (Fase C).
- [ ] **Gabriel → time de analistas (médio prazo, semanas):** propor tabelas nativas no PPT com os argumentos de `fase_c_visao.md`/`custos_visao_reais.md`; **plano B**: pré-análise dos Excels de trabalho (origem dos prints) — bater os números direto na fonte antes da colagem no PPT. Decisão do gestor (09/jul): até lá, **imagem é o padrão**.
- [ ] Fase E (foco atual): reorganizar a interface do corretor — relatório por seção→tipo de erro→achado, visualização de erros sobre a thumbnail, custo estimado antes de rodar IA.
- [ ] Expandir o enum de tipos de erro (`analysis-store.ts`) para o catálogo da rubrica + tipos evidenciados pelas atas reais (`ATA_COVERAGE` etc.).
- [ ] Coverage 90: publicar `analyze-table-image` (contrato `locais_visiveis`/`unidades`/`tem_fonte`, cache v6), medir o
  harness no IR real do Marka (`CORRETOR_CALIBRATION_IR`) e calibrar Marka, Itajaí e GO (meta: >=90% recall, <=15% FP). A versão atual usa cache v7 e inclui teste Brumadinho/Curitiba.
- [ ] Corretor v5: verificar migrations `20260713160000` e `20260713180000` (`20260713170000`
  aplicada e confirmada); homologar portão da Ata, relatório, triagem, drop/cache e calibradora no Supabase real.
- [ ] Corretor v5 — pendências da revisão final (P1–P7, detalhe na v0.42 do LIVE do Corretor): segue aberto
  **P1** (candidatas de visão sem filtro de seção → monitorar custo/estudo na homologação).
  ✅ **P2 resolvido em 28/jul** (CH-2: validação IBGE + UF + escopo de seção, v0.44 do LIVE do Corretor).
- [x] ~~Corretor — 2 decisões de produto do Gabriel~~ **tomadas em 31/jul**: (A) exclusão declarada → “Verificar”;
  (B) comentário no arquivo final → avisa e pede confirmação. Ambas implementadas (v0.50 do LIVE do Corretor).
- [x] ~~Corretor — fila de 28/jul~~: (1) tabela paginada ✅, (2) CH-6 exclusão declarada ✅,
  (3) `LEFTOVER_NOTE` → “Comunicação da revisão” ✅ (31/jul). Segue adiada a **(4) plausibilidade de tipo por
  coluna** — mesmo tema do teste A/B de modelo (caso s61 do Toledo: `479,9` é % somada numa coluna de contagem).
- [ ] **Corretor — validar a v0.50 no estudo do Toledo** (`study_id = 17062ca6-9814-43b4-a6bf-9f61e0c7db1e`):
  reabrir e medir os 39 achados → esperado cair para a ordem de 1–7 (as 32 notas viram 1 item de comunicação;
  os 6 de soma passam pela paginação/CH-6). É o aceite real das três regras novas.
- [ ] **Corretor — deploy pendente:** `supabase functions deploy analyze-ata-image` (prompt + normalização de
  cidade/UF mudaram; `ATA_CACHE_SCHEMA` 6 → 7 força releitura).
- [ ] **Corretor — Housi v2 (Lucas Finoti) não recebido:** destrava FN-1 (verticalização cross-slide s33 × s32)
  e FN-2 (taxa 0,9% × 1,7%) — exigem o passo novo de "memória do estudo" (valores-âncora por métrica).
- [ ] Corretor — teste A/B de modelo de visão (caso-âncora: s45 da Rolândia, cidade inferida dos bairros).
- [ ] Definir se `/corretor/calibracao` permanece visível a todos os usuários internos ou exige papel específico.
- [ ] Gabriel → analista A&R: obter fórmula oficial de projeção e validar falsos positivos do checklist estrutural/fonte.
- [ ] CID: retomar validação de base quando sair do standby.
- [ ] Dívidas de segurança conhecidas — ver [`../architecture/SECURITY_NOTES.md`](../architecture/SECURITY_NOTES.md) (vulns npm, log por IP, `.env` versionado por design).
- [ ] Apontamentos Juliana: etapas 4–6 pendentes (ver memória do projeto).
> **Panorama V2 · correção visual integral concluída · 31/ago/2026:** fundos 16:9 foram exportados e validados dos PPTs locais (capa Baixada Santista; conteúdo, divisória, equipe e fechamentos institucionais), e passaram a ser aplicados pelo mesmo `Sheet` no preview e PDF. A referência 1/capa vermelha e a 4/abertura legada foram retiradas; não há mais rodapé global nem compressão de equipe/consultor. Cidades continuam linha a linha na capa e o trimestre mantém espaçamento da última linha. A coleta exibe percentual por **11 chamadas concluídas por cidade** + consolidação/prévia e ETA apenas após duas observações; a exportação usa ETA observado por página. QA Playwright com API fixture capturou capa, sumário, divisória, tabela, equipe e consultor e gerou PDF de **59 páginas**; build e testes de contrato passaram. Pendente apenas a homologação autenticada com dados produtivos/multicidades. **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — 12517501135.
> **Panorama V2 · refinamento pós-homologação · 31/ago/2026:** o ETA deixou de recalcular a cada segundo: ele agora é atualizado só após uma nova unidade real concluída e é limitado ao menor valor observado, portanto não cresce durante uma chamada lenta. A superfície clara foi reexportada sem a barra vermelha decorativa; sumário, estáticos, tabelas e gráficos não carregam mais esse traço. Equipe passou a grade central 2×3, com os três perfis fixos maiores e segunda linha vazia para pessoas variáveis. Os três fechamentos usam a lâmina final do estudo Baixada Santista. Build e QA Playwright de preview/PDF passaram. **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — 12517501135.
### 2026-09-22 — Panorama: fonte granular interna com fallback público — Gabriel + Codex

- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — aquisição granular dos Panoramas Secovi-SP e FIERGS.
- **O quê:** bancada autenticada no recorte FIERGS — RM Porto Alegre confirmou as 11 cidades em `monitored-cities`, 2.048 IDs idênticos e 258.557 registros históricos nas rotas interna e pública v2. A rota interna passa a ser a fonte granular padrão, filtrando Ativo/Esgotado e normalizando `number_bedroom` (`0` como ausência; demais valores como texto); a pública v2 permanece como fallback com três tentativas e o contrato legado continua restrito ao motor V2. Falha de todas as fontes interrompe a cidade, sem produzir zeros.
- **Evidência:** rota pública exigiu 73 tentativas para 55 páginas por falhas transitórias de infraestrutura; a interna concluiu 34 páginas em 34 chamadas. Todos os campos compartilhados usados pelo motor coincidiram; a interna adiciona campos operacionais. A última repetição integral após a normalização final ficou pendente porque o ambiente de aprovação esgotou créditos, sem nova chamada à GeoBrain.
- **Verificação:** 8 testes direcionados e typecheck aprovados. Na suíte global, 353/354 testes passaram; restaram somente um timeout de 5 s no template real do Sinduscon e a suíte do compilador Sinduscon sem `@pdf-lib/fontkit` instalado. O build também chegou a 1.888 módulos e parou exclusivamente nessa mesma dependência ausente, fora da feature Panorama.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{api.ts,__tests__/building-source-parity.test.ts}`.
- **Monday:** [DESAFIO - Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`.
- **Impacto em Etapas/Pendências:** aquisição granular padronizada antes da validação dos motores; continuam pendentes a robustez/rate limit das séries temporais e a reconciliação numérica do fechamento FIERGS 4T2025 contra o deck.
### 2026-09-30 — FIERGS-RS: baseline pós-teste explica quatro totais de vendas — Gabriel Hxg + Codex
- **Ambiente/funcionalidade:** Panorama de Mercado — reconciliação metodológica do recorte FIERGS 2T2026.
- **O quê:** uma bancada autenticada e reproduzível congelou o recorte das dez cidades e explicou integralmente os totais apontados pela Juliana. `2.317` soma indevidamente `1.137` verticais e `1.180` horizontais; `1.138` descarta uma venda líquida negativa de quatro dormitórios; e o excesso de `46` entre `1.137` e `1.091` vem da soma de fotografias acumuladas em Canoas (`41`) e Novo Hamburgo (`5`). O total tecnicamente recomendado é `1.091`, derivado da última fotografia granular por empreendimento/tipologia.
- **Por quê:** concluir as Fases 0 e 1 antes de alterar o runtime e impedir correção arbitrária de números ou avanço prematuro para ajustes visuais.
- **Arquivos:** `scripts/fiergs-sales-reconciliation.mts`, `docs/features/Relatorios Secovi_FIERGS/{PLAN_POS_TESTE_JULIANA_FIERGS_2T2026_2026-09-30.md,EVIDENCIA_FASES_0_1_VENDAS_FIERGS_2T2026_2026-09-30.md}`.
- **Commits:** `290a5e2`.
- **Verificação:** consulta autenticada das dez cidades; repetição focal de Canoas/Novo Hamburgo; 64 testes focais e typecheck aprovados.
- **Impacto em Etapas/Pendências:** portão A passou tecnicamente; a mudança estrutural permanece bloqueada no checkpoint para aprovação da fonte canônica antes das Fases 2–4. Nenhum componente de produção foi alterado.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.

### 2026-09-30 — FIERGS-RS: clareza visual e mapas da Etapa 6 — Gabriel Hxg + Codex
- **Ambiente/funcionalidade:** Panorama de Mercado — lâminas editoriais e mapas FIERGS.
- **O quê:** percentuais fecham em 100,0% por rateio determinístico; dormitórios usam nomenclatura completa; ranking municipal ganhou margens próprias; o slide 41 declara indisponibilidade anual auditável; o gráfico de R$/m² reduz colisões; mapas calculam bounds/zoom e exibem legendas por padrão, estoque e R$/m².
- **Verificação:** `235/235` testes da feature, `tsconfig.app.json` e build de produção aprovados; proporção 16:9 coberta pela regressão existente.
- **Impacto em Etapas/Pendências:** Fase 6 concluída tecnicamente. A inspeção humana dos novos PDF/PPT permanece na Fase 8; a próxima frente de implementação é a Fase 7.

### 2026-09-30 — FIERGS-RS: pacote de homologação 2T2026 — Gabriel Hxg + Codex
- **Ambiente/funcionalidade:** Panorama de Mercado — validação integrada FIERGS no build de produção.
- **O quê:** o navegador autenticado encontrou uma diferença entre produto horizontal completo e coorte cortada em `1T2023`; o bloco FIERGS passou a preservar a coorte `Até 2022`. A guarda final aprovou 11/11 invariantes e gerou CSV, PPTX e PDF com 75 páginas.
- **Evidência:** vendas `1.091`, estoque `5.251`, horizontal `129 / 30.476 / 3.365`, chácaras `0`; `236/236` testes FIERGS e build aprovados.
- **Impacto em Etapas/Pendências:** Fases 7 e 8 concluídas tecnicamente. O pacote está pronto para Juliana; promoção depende do aceite externo.

### 2026-10-02 — Panorama FIERGS: ajustes finos da Juliana
- **Ambiente/funcionalidade:** Relatórios Automatizados → Panorama de Mercado FIERGS-RS.
- **O que:** disponibilidade por tipologia/padrão usa oferta final sobre lançamentos históricos da mesma dimensão; lançamento da janela permanece claramente separado. IDs oficiais de tempo/maturidade (59–60) e VGV (61) foram restaurados; ID 63 consolida o horizontal por produto e preserva disponibilidade e média de lançamentos por empreendimento. Linha de preço sem qualquer indicador observado é ocultada.
- **Decisões:** 63 unidades não classificadas tornam o total de disponibilidade indisponível; não são redistribuídas. Categorias de maturidade existentes não equivalem a média de idade em meses. A página institucional de 22 anos não foi alterada.
- **Verificação:** 32 arquivos/266 testes Vitest aprovados; build de produção aprovado; PDFs/PPTs 2T2026 e 4T2025 (74 páginas/slides cada); CSVs de 819 linhas com 39 invariantes críticas em `match` e sem deltas. Capturas das páginas tocadas e nota VGV de cobertura parcial inspecionadas; artefatos em `.tmp/fiergs-final-adjustments-regression-20261002/`.
- **Arquivos:** componentes e manifesto em `src/features/panorama-secovi-fiergs/`; resumo e evidência na pasta de documentos FIERGS.
- **Commit/push:** implementação local `a95e039`; documentação/evidências em commit separado. Nenhum push sem autorização do usuário. A página institucional de 22 anos continua para o marketing.

### 2026-10-02 — Panorama FIERGS: revisão do PDF (6) e aba Avisos — Codex
- **O quê:** revisão das 70 páginas do PDF gerado; páginas físicas 34/51 idênticas, lâmina “Sobre o estudo” com contagem antiga e categorias sem R$/m² no gráfico por padrão. O manifesto remove a cópia oficial 56; a contagem fica dinâmica; categorias sem preço são omitidas do gráfico, mas zeros observados permanecem. Omissões entram nos Avisos e auditoria. Avisos passa a aba própria entre Relatório e Metodologia; Relatório mantém apenas páginas e controles.
- **Verificação:** testes de manifesto/renderização aprovados; TypeScript global segue bloqueado exclusivamente por fixtures preexistentes em `src/features/corretor/lib/audit/__tests__/structure-empty-sections.test.ts`. PDF novo após esta alteração e regressão autenticada de 4T2025 ainda pendentes.
- **Evidência:** `docs/features/Relatorios Secovi_FIERGS/EVIDENCIA_REVISAO_PDF_6_ABA_AVISOS_2026-10-02.md`.

### 2026-10-02 — Panorama FIERGS: sumário e cabeçalho anual — Codex
- **O quê:** o sumário do PDF passa a incluir IVV e preços (páginas antes ausentes) e a ordenar VGV antes do horizontal pela paginação real. O cabeçalho “Variações anuais” fica alinhado à tabela, cujas colunas passam a ocupar a largura disponível conforme a quantidade de comparações.
- **Verificação:** regressão do manifesto cobre integralmente as 69 páginas e a ordem das seções; 14 testes focados aprovados. Nova exportação autenticada ainda necessária para aceite visual.

### 2026-10-06 — Sinduscon: quadros mensais e revisão de usos comerciais — Codex
- **Ambiente/funcionalidade:** Sinduscon Curitiba, Liberados e CVCO.
- **O quê:** agregações mensais por pavimento nas folhas 04/07; áreas por zona separadas das unidades nas folhas 05/08; restauração de totais mensais ausentes. Uso exclusivamente comercial com quantidade residencial ao menos três vezes maior que a não residencial segue para revisão humana, preservando ambas.
- **Impacto em Etapas/Pendências:** regenerar a tabulação a partir da base acumulada antes do relatório, pois as novas agregações exigem quatro novas tabelas de dados. Reprocessar o arquivo bruto de agosto para recuperar quantidades excluídas pela regra anterior. Arquivos enviados no navegador não possuem logs centrais de processamento.
- **Monday:** —


**22/10/2026 — Gabriel/sessão, estimativas Finotti, estado preparado localmente.** Rota editorial /rebrain/estimativas-vendas com consulta paginada Horizontal, seleção de empreendimento/carteira, projeção conservadora e laboratório; conferência opcional do Excel no navegador separada do cálculo. Typecheck, ESLint, 10 testes focados e build aprovados localmente. Sem backtest observado por falta de bases.estimation mensal. Teste autenticado da página, paridade das fixtures na nova interface e inspeção visual ainda pendentes; nenhum push/deploy. [Pacote técnico](../features/estimativas-vendas/README.md).


**22/10 — Gabriel/sessão, Estimativas: correção após teste de usuário.** Seleção de três empreendimentos mostrou 0 elegíveis e gráfico vazio. Adaptador de elegibilidade ignora fase Futuro ao definir produto e origem da curva; motivos de exclusão aparecem no seletor e junto ao gráfico. Domínio 1–48 meses e ausência/negativos preservados. 11 testes focados, tipos e lint aprovados localmente. Reteste dos IDs da captura pendente; sem alegação de acurácia observada. [Registro técnico](../features/estimativas-vendas/README.md).


**22/10 — Gabriel/sessão, navegação Estimativas de Vendas.** Ferramenta saiu da pasta Relatórios Automatizados e ganhou grupo próprio acima de Área Quanti; item Simulador de Vendas mantém aviso em implementação e a mesma rota. Typecheck, lint e teste do menu aprovados localmente. Próximo confirmar posição no site publicado.


**22/10 — correção do menu Estimativas, Gabriel/sessão:** por pedido do usuário, Estimativas de Vendas virou link lateral direto acima de Banco Quanti, sem submenu Simulador de Vendas. Rota e aviso em implementação preservados. Dois testes de menu, tipos e lint aprovados; publicação e conferência visual pendentes.


**22/10 — Gabriel/sessão, curva Finotti em Rio Branco.** Diagnóstico API: 21 empreendimentos, 13 horizontais com lacunas; regra anterior impedia todas as curvas. Motor agora ancora a curva em estoque por tipologia no corte apenas quando conciliado com vendas acumuladas, mantendo médias 3/12 ausentes sem cadência mensal adequada. Ecovillage 52093 é caso local avaliável (348/276 no mês39); proveniência mensal desconhecida, sem backtest. 13 testes, tipos/lint aprovados. [Evidência](../features/estimativas-vendas/README.md).

**22/10 — Gabriel/sessão, seleção Curitiba e carregamento Brain.** Consulta real de 371 empreendimentos em quatro páginas; filtro e corte em 09/2026 identificam 22 elegíveis. A lista agora expõe os 371, permite busca por ID/nome e filtro opcional de elegibilidade. Texto explica que o corte define a origem da previsão. `BrainLoadingState` cobre consulta e Excel da ferramenta e o fallback lazy compartilhado; demais operações Rebrain seguem para revisão individual. Ensaio local autenticado confirmou curva 1/1 para ID 87338; 16 testes focados, tipos/lint/build aprovados. Estado validado localmente, sem publicação nem retrospectivo comprovado nesta evidência. [Detalhe](../features/estimativas-vendas/README.md).


**22/10 — Gabriel/sessão, plano de expansão das estimativas.** Preparado plano de seis etapas para modelos por tipo, tratamento de dados incompletos, retrospectiva independente e sombra de previsão calibrada. Cobertura total do catálogo não equivale a previsão identificável para todos; cenários manuais permanecem explícitos. Evidência: docs/features/estimativas-vendas/PLANO_EXPANSAO_MODELOS_E_FAIXAS_2026-10-22.md. Estado preparado; próximos passos: inventário de tipo/idade/periodicidade e motor retrospectivo. Sem implementação, testes novos, push ou publicação nesta etapa.

## 22/10/2026 — Estimativas: bancada multiempreendimento local — Gabriel/sessão

**Desenvolvimento:** grade paginada de 12 gráficos, carteira de todos os membros, sobreposição de cinco, detalhe acessível, Horizontal/Vertical, Excel opcional, modelos versionados e retrospectiva. Fontes, contrato, motores, ajuste, calibração e interface separados. Cenário manual cobre hipóteses sem dados; comercial/mistos aguardam contrato da API.

**Etapa/evidência:** validado localmente; 37 testes focados, tipos explícitos da aplicação, lint e build. Oito ensaios de viewport/tema sem overflow/erro e com foco restaurado. Ensaio autenticado local e Excel Curitiba: 28.308 iguais/0 diferentes/181 exclusivos. Auditoria de 2.257 cadastros em três recortes, com snapshots ignorados e agregados versionados. [Dossiê](../features/estimativas-vendas/RESULTADO_EXPANSAO_LOCAL_2026-10-22.md).

**Pendências:** faixas reais não promovidas por cobertura/composição inadequadas; origem mensal, cadência, idade/revisões e contrato comercial continuam abertos. Próximo revisar localmente e esclarecer fonte; sem push ou deploy nesta etapa, conforme Gabriel. Alterações FIERGS/Corretor preservadas. Não equivale a acurácia observada ou ferramenta ampliada publicada.

**Fechamento da mesma entrega em22/10:** merge local5a02fb9 integrou seis commits remotos API Excel ao60d4989, sem conflitos;82testes/11arquivos e build passaram. TypeScript explícito identificou opção exact incompatível em getByRole/queryByRole nos dois testes novos API Excel; corrigida somente a chamada de teste, mantendo produto. Tipos completos e quatro testes afetados revalidados. Sem push/deploy; FIERGS e referência Corretor continuam locais preservados.

## 27/10/2026 — Consolidação operacional do estimador
Gabriel/sessão preparou baseline e inventário em docs/features/estimativas-vendas/BASELINE_OPERACIONAL_E_PLANO_2026-10-27.md. E-mails, estudos de preço e regrasMonday reconciliados. Estado preparado; contratoExcel, origem porcompetência e preço pendentes. Próximo: seleção e amostra revisável. Sem alteração de produto/importação.
Monday: [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — 13096757074. Nenhuma escrita no card.
