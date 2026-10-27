# FIERGS — modernização da coleta e do histórico tipológico

Data: 27/10/2026. Responsável pela sessão: Gabriel/Codex. Estado: plano preparado, implementação pendente de autorização pelo CTA. Publicação e aceite dos novos recortes continuam pendentes.

Revisão 2, após conversa pessoal de Gabriel com Edgar: investigar a origem no Geobrain em paralelo, sem fazer dessa investigação uma dependência para deduplicar e corrigir a comparação temporal já demonstradas. O CTA desta revisão autoriza implementar os contratos de consumo descritos abaixo; não pressupõe confirmação do backend nem publicação. Esta revisão substitui a prioridade anterior de modernizar o transporte.

## 1. Objetivo e limites

Resolver o bloqueio relatado por Teresa e Juliana em Porto Alegre e Gramado + Canela, 1T2021–2T2026, usando o contrato e a organização por tipologia da implementação atual do Dashboard como referência. Preservar as regras homologadas FIERGS/Secovi, coleta multicidades, invariantes e evidências.

Não alterar Dashboard GeoBrain, Validação do Fechamento, Relatório API Excel, Corretor, Sinduscon ou dados no Geobrain. Não importar o motor de indicadores desses projetos. Não fixar IDs, municípios, quantidades ou exceções por período no runtime. Não substituir ausência por zero nem apagar vendas líquidas negativas.

Prioridade da entrega: contratos de identidade/duplicação e de competência, indicadores afetados, auditoria e exportação. Como a rota atual já é a indicada e as chamadas comparadas continuam reproduzindo o problema, alterações de host, tipos, paralelismo, lotes de páginas ou cliente HTTP global ficam fora da correção, salvo necessidade comprovada. Evitar ampliar a entrega antes de retomar o estimador.

Sincronização solicitada nesta rodada já realizada: `21edc3d` integrou os sete commits remotos sobre os três locais. A alteração prévia de LIVE foi guardada em stash de caminho explícito, reaplicada e comparada com a diferença original; conteúdo preservado. Outros arquivos locais paralelos não foram incluídos. Não repetir merge por inferência nem fazer push sem autorização.

## 2. O que foi confirmado antes de planejar

### 2.1 O endpoint já é o mesmo

Dashboard (`src/features/dashboard-geobrain/api.ts`), Validação (`src/features/validacao-fechamento/api.ts`) e Panorama (`src/features/panorama-secovi-fiergs/api.ts`) usam `POST https://app.geobrain.com.br/public-api/v2/building-with-history-internal`.

| Aspecto | Dashboard / Validação | Panorama atual | Decisão do plano |
|---|---|---|---|
| Escopo | `city` ou `uf`; município tem precedência | `city` e `uf` | Manter o escopo territorial do Panorama e conferir retorno; ambos os formatos reproduziram a falha |
| Transporte | Bearer, Accept e Content-Type JSON; timeout 60 s | httpRequest; timeout padrão 40 s; Content-Type só com body | Rota correta já comprovada; preservar transporte, ajustar somente se necessário ao contrato |
| Paginação | 100 registros, primeira página e lotes de até cinco | páginas sequenciais por tipo, duas cidades e teto global de seis chamadas FIERGS | Preservar limites e recuperação; otimização de lotes não é requisito para resolver o incidente |
| Tipos | Comercial/Horizontal/Vertical; Excel também Hotel | Vertical/Horizontal | Manter tipos do Panorama; não acrescentar Comercial/Hotel para imitar outro produto |
| Identidade tipológica | agrupa por `typology_id`, ordena competências | agrupa diretamente por faixa de dormitórios no cubo | Preservar identidade antes de agregar dimensões editoriais |
| Duplicatas no histórico | normalização mantém as linhas | mantém e soma linhas no lançamento | Deduplicação auditável de conteúdo idêntico; conflitos explícitos |
| Valores representativos | procura último preenchido; algumas conversões usam zero | mistura cadastro atual e quantidade original | Seleção até o fechamento, nulos/zeros preservados e bases temporais separadas |
| Falhas | Validação captura erro por tipo e pode seguir com coleção parcial | recuperação e bloqueio por completude | Manter tratamento rigoroso do Panorama; não copiar captura silenciosa |

O agrupamento do Dashboard não remove duplicatas de `history`; seu teste de API também preserva empreendimentos repetidos entre páginas. Alguns indicadores usam `find` por competência e outros percorrem todas as linhas. Portanto, copiar todo o normalizador/agregador pode esconder ou deslocar o problema, sem resolvê-lo.

### 2.2 Amostra de Edgar

Origem: `C:/Users/GaloD/Downloads/sample_interna.json`; cópia preservada em `.local-inputs/fiergs-incidente-20261027/sample_interna_edgar.json`. SHA-256 `3f349cd3b031d547d5ee135fdebe86617dbc479b12161ac5321d6c556c597000`, 1.136.536 bytes.

Página 60, cinco registros, total informado 1.591, 319 páginas. Contém cinco empreendimentos de Curitiba, 785 linhas históricas e nenhuma repetição JSON idêntica. Não contém Solaris nem os quatro projetos de Porto Alegre. É referência de formato, não evidência de correção dos casos afetados nem nova versão de endpoint.

### 2.3 Experimento com chamadas atuais, antes de mudar código

Quatro chamadas reais de leitura, todas HTTP 200; nenhum estudo completo gerado:

- Formato Dashboard: `?city=Gramado&type=Vertical&per_page=100&page=1`, sem UF, com Content-Type JSON. Solaris continua com seis linhas/três objetos distintos em jul/2024, soma 18 contra total 9. Fechamento jun/2026: três linhas/soma 9.
- Comparação com UF RS: mesmos resultados do Solaris. Os dois retornos informaram 218 empreendimentos verticais na cidade.
- Formato Dashboard em Porto Alegre, páginas 10 e 11: os quatro casos permanecem com quantidades originais 68/23/127/22, cadastro 48/19/70/16 e quantidades jun/2026 48/19/70/16.

Conclusão: mudar apenas URL, cabeçalho, escopo ou paginação não eliminou o problema. A indicação de Edgar ajuda na estrutura de ingestão; a alegação de que essa forma de chamada já entrega os casos corrigidos não foi confirmada. Se surgir outra rota/parâmetro/versão, incorporá-la somente após uma comparação pareada.

Brutos e scripts: `.local-inputs/fiergs-incidente-20261027/compare-dashboard-request.mjs`, `compare-dashboard-request-summary.json`, `compare-*.json` e `sample-edgar-summary.json`. Sem credenciais nos artefatos.

## 3. Contrato alvo

Criar camada interna da feature, sem acoplar Panorama aos tipos ou aos indicadores privados do Dashboard:

1. Resposta bruta paginada com origem, cidade/UF, tipo, página, total informado e versão do contrato.
2. Empreendimento identificado por UF/cidade/ID; histórico por ID tipológico, competência e demais discriminadores realmente documentados.
3. Histórico normalizado mantendo quantidade, estoque, vendas, preços, áreas, padrão e status em cada competência; nenhum preenchimento futuro para um corte anterior.
4. Fotografias explícitas de lançamento e fechamento, com proveniência e classificação de completude/conflitos.
5. Agregação por dormitórios/padrão/produto somente após resolver identidade e fotografia.

Preservar dados brutos e valores originais na auditoria. A tipologia não pode ser identificada apenas por dormitórios ou área. Sem ID, não inventar uma chave que funda tipologias distintas; a política de incompletude deve ser explícita e testada.

### 3.1 Contrato de deduplicação — `history-identity-v1`

- Identidade mínima: UF + cidade + ID do empreendimento + ID tipológico + competência. `building_status` é conteúdo a conferir, não uma chave extra criada para legitimar dois estados conflitantes no mesmo mês.
- Conteúdo equivalente: mesmos campos e valores relevantes do objeto histórico, após normalização representacional documentada e ordenação canônica das chaves. Não arredondar quantidades/preços para fazer linhas diferentes parecerem iguais.
- Grupo equivalente: conservar uma linha e registrar todas as referências de origem, quantidade recebida/conservada/removida e versão da regra. A operação é idempotente e independe da ordem das linhas/páginas.
- Mesmo ID/mês com conteúdo diferente: conflito explícito; não somar nem escolher primeiro/último. Outros discriminadores só entram na identidade com prova do contrato, não para esconder conflitos.
- Identidade ausente ou inválida: incompletude identificada; tratar compatibilidade de fonte/versão separadamente, sem fundir tipologias por dormitórios ou atribuir IDs de produção artificiais. Fixtures antigas devem representar o contrato que estão exercitando.
- A correção na origem, se Edgar a entregar, não cria tratamento especial: fonte limpa passa com zero remoções; a proteção e a regressão do payload antigo permanecem.

### 3.2 Contrato temporal proposto — `period-capacity-v1`

Esta é uma regra explícita do consumidor a implementar com o CTA, não uma afirmação de que Edgar confirmou a semântica de todos os campos da API.

1. `releaseEvent`: data original de lançamento do empreendimento; determina a entrada na janela/coorte.
2. `releaseObservedUnits`: soma das quantidades únicas observadas na competência original de lançamento, quando disponíveis. Conservar a fotografia original; não reconstruir ou sobrescrever o passado com quantidade atual.
3. `capacityAtClosing`: soma de `qty` das linhas tipológicas únicas de uma fotografia comum do empreendimento, escolhida até o fechamento. É oferta/capacidade derivada da competência, com data e linhagem. Não é, automaticamente, o fluxo original de unidades lançadas.
4. `closingStock` e `closingNetSales`: estoque e venda líquida correspondentes ao fechamento e universo selecionados, com a política temporal vigente explicitada. Uma defasagem em relação à fotografia de capacidade deve aparecer no contrato/auditoria e ser analisada, não passar despercebida.
5. `registryTotalUnits`: valor bruto do cadastro, com sua própria competência. Serve como controle independente somente quando universo e competência forem compatíveis; cadastro posterior ao corte não preenche retroativamente o relatório.

Para capacidade, usar preferencialmente o mês de fechamento; se só houver mês anterior, selecionar a fotografia comum mais recente até o corte e registrar defasagem/completude conforme política já comprovada. Não juntar o último registro individual de cada tipologia em meses diferentes para inventar uma fotografia. Tipologia com `qty=0` permanece observada com zero; não ressuscitar sua quantidade anterior. Estado esgotado ou estoque zero não excluem automaticamente a tipologia da capacidade. Tipologias ausentes no mês não recebem carregamento automático de linhas antigas; ausência e eventual desativação precisam de evidência.

No caso comprovado de Porto Alegre, a fotografia comum de jun/2026 oferece capacidade153, enquanto a fotografia original oferece240; cada valor tem uma função e ambos devem permanecer rastreáveis. A quantidade atual/cadastro não é confrontada com a original como se fossem o mesmo universo. Esses números são evidência/fixture, nunca regra de runtime.

O significado homologado de Oferta Lançada na janela não muda por efeito colateral desta correção: mapear seus consumidores separadamente. Se um indicador precisar trocar do cadastro atual para uma base histórica, declarar a alteração, a origem e o impacto na matriz antes/depois. Não substituir todas as ocorrências de `launchedUnits` por `capacityAtClosing` mecanicamente.

### 3.3 O que vendas e distratos podem demonstrar

`sold_in_period`, `gross_sales` e `distractions` descrevem movimentação comercial, não bastam para reconstruir capacidade total histórica ou quantidade original lançada. Não assumir que `sold` represente um acumulado compatível sem contrato. Não derivar capacidade apenas de estoque atual + soma de vendas líquidas.

A identidade venda líquida = venda bruta − distratos só é um controle quando campos, sinal, competência e universo forem compatíveis e sua semântica estiver comprovada. A equação estoque final = estoque inicial − venda líquida só fecha isoladamente se não houver entradas de oferta, reclassificações, revisões ou outras movimentações. Sem esses requisitos, registrar a diferença e a limitação; não ajustar quantidades para fechar o balanço.

### 3.4 Guardas: conservação, integridade e controle externo

Separar explicitamente três verificações: (a) integridade da fonte/identidade/fotografia; (b) conservação dimensional das linhas normalizadas até as tabelas e totais; (c) confronto com total independente, quando disponível e compatível. A derivação da capacidade permite cálculos do relatório sem, por si só, exigir resposta do backend; não permite declarar (c) aprovado por definição.

Conservação dimensional é uma verificação válida de transformação, mas deve ser rotulada como tal. Total independente ausente é limitação auditada, não delta zero inventado; sua indisponibilidade, isoladamente, não torna incorreto um indicador cujo contrato documentado é derivado. Conflito, fotografia incompleta, mistura de competências, sobrecobertura dentro do mesmo universo ou divergência contra controle independente compatível permanecem críticos. Não remover linhas críticas ou converter falhas reais em informativos apenas para obter exportação habilitada. A mudança dos operandos da guarda temporal deve vir acompanhada de testes que distinguem os dois casos.

Avisos na tela/auditoria devem distinguir: duplicatas equivalentes removidas; quantidades diferentes entre competências; fonte de total derivada; controle externo indisponível; conflito impeditivo. Não escrever que houve mudança desde a geração anterior sem comparação entre gerações.

## 4. Portões de execução

### G0 — congelar a base e a evidência

Situação desta rodada: sincronização e comparação de chamadas concluídas; contrato alvo ainda não implementado.

- Conferir novamente branch/remotos/estado e registrar novo HEAD antes de implementação; não sobrescrever mudanças paralelas.
- Preservar as cinco gerações diagnósticas existentes e a referência anterior. Não substituir os brutos por saídas de experimentos.
- Criar evidência pequena versionada com matriz inicial: Porto Alegre crítico 87; Gramado + Canela 9; Gramado 9; Canela 0; referência Canoas/Esteio/São Leopoldo 0. Separar coleta real e reexecução congelada.
- Extrair fixtures mínimas anonimizadas dos casos reais; amostra completa e nomes de responsáveis permanecem locais.

Saída: manifesto, inventário de campos/consumidores e matriz inicial. Não prosseguir se o contrato observado divergir da descrição deste plano sem registrar a revisão.

### G1 — estabilizar o contrato de entrada, mantendo a chamada correta

Arquivos previstos: `api.ts`, novo adaptador de fonte da própria feature e `__tests__/building-source-parity.test.ts`.

- Preservar host/rota/método, autenticação da sessão e política de concorrência já válidos; registrar versão de fonte e adaptar somente o necessário para normalizar a resposta. Sem token fixo ou autenticação própria no bundle.
- Continuar exigindo uma única UF e cidades monitoradas autorizadas. Validar cidade/UF recebidas e rejeitar mistura territorial. Trocar city+uf por city apenas não é condição da correção; a comparação já demonstrou a duplicação nas duas formas.
- Validar `data`, paginação inteira positiva e encerramento; não aceitar página ausente como coleção vazia. Conferir páginas esperadas, consumidas e conflitos/repetições de empreendimentos.
- Preservar a paginação e o gate global. Não incluir otimização de lotes nesta entrega. Preservar cancelamento, retries transitórios, recuperação das cidades falhas e não refazer cidades concluídas.
- Não migrar automaticamente séries `temporal-analysis-city`: Dashboard não fornece substituto equivalente para elas. Mapear seus contratos separadamente, mantendo o firewall de fontes.
- Registrar qual fonte respondeu. Fallback público existente deve passar pelo mesmo adaptador e contrato; não combinar pedaços de duas fontes silenciosamente nem usar fallback para esconder divergência de negócio.

Gate: testes focados do contrato de entrada, limites, paginação, cancelamento e falha parcial aprovados; universo de produto preservado. Não se espera que G1 sozinho elimine o delta 87/9. Não reabrir a busca por um endpoint alternativo sem evidência nova.

### G2 — identidade tipológica, duplicatas e conflitos

Arquivos previstos: novo `domain/building-history.ts` (nome final pode variar), `domain/cube.ts`, tipos/auditoria e testes próprios.

- Agrupar por ID do empreendimento + ID da tipologia + competência + discriminadores comprovados no contrato; classificar registros antes da agregação editorial.
- Remover repetições com conteúdo semanticamente idêntico, usando comparação canônica independente da ordem das chaves JSON. Conservar contador, referência às linhas de origem e regra aplicada.
- Mesmo identificador e competência com conteúdos divergentes: conflito; não usar `first`, `last`, máximo ou soma indiscriminada para decidir. Discriminadores adicionais precisam de evidência de contrato.
- Não colapsar tipologias diferentes com os mesmos dormitórios ou área. Diferentes meses do mesmo ID permanecem como história.
- Preservar zero, nulo e valores negativos conforme campo; não copiar `toNum(..., 0)` ou busca do último valor positivo do Dashboard indiscriminadamente.
- Aplicar normalização uma única vez antes de qualquer soma de unidades, estoque, vendas e VGV.
- Implementar integralmente `history-identity-v1` e sua auditoria. Testar que a fonte corrigida e a mesma fonte repetida produzem o mesmo resultado normalizado, sem ignorar registros diferentes.

Gate: Solaris passa a três linhas únicas de lançamento/soma 9, com três remoções auditadas; os conflitos intencionais das fixtures continuam bloqueados. Nenhuma exceção específica para o ID73632 no runtime. Demais números mudam somente quando houver linhagem verificável.

### G3 — coerência temporal e indicadores

Arquivos previstos: `domain/cube.ts`, `domain/aggregations.ts`, `report/model.ts`, contratos pertinentes e `domain/reconciliation.ts` apenas para explicitar operandos/comparabilidade.

- Elaborar matriz por indicador: semântica, universo, campo bruto, fotografia, total independente quando disponível, fórmula, consumidores e efeito esperado na baseline.
- Separar evento de lançamento, quantidade observada no lançamento, capacidade/oferta na fotografia de fechamento, estoque e vendas do fechamento. Um único campo `launchedUnits` não deve representar bases temporais incompatíveis sem proveniência.
- Implementar `period-capacity-v1`: capacidade de uma fotografia comum do empreendimento até o corte, identidade tipológica preservada e competência registrada. Não compor capacidade com o último valor isolado de cada ID em meses diferentes. Não carregar uma tipologia extinta para o fechamento só por possuir uma observação antiga. Ausências/defasagens exigem política explícita, não preenchimento silencioso.
- Dados após o corte não podem preencher quantidade, padrão, área ou preço de uma saída histórica. O `pick` sem limite temporal do Dashboard não deve ser transplantado.
- Preservar o significado homologado da Oferta Lançada na janela; ajustar a base dos denominadores de mercado atual sem alterar retroativamente o significado do fluxo original. Manter valores originais disponíveis para explicar diferenças.
- Confrontar os quatro projetos de Porto Alegre: capacidade e distribuição jun/2026 somam 153; lançamento original soma 240. Não tentar tornar as duas épocas numericamente iguais.
- Uma reconciliação precisa comparar universos compatíveis e, quando alegar controle independente, fontes/operandos independentes. Não definir o total como a soma das mesmas linhas e usar a igualdade resultante como prova de reconciliação externa.
- O cadastro de topo dos quatro projetos é ago/2026, posterior ao corte. A igualdade numérica com junho não comprova sua validade temporal. Usar a capacidade derivada identificada no contrato, sem declarar controle externo aprovado. Implementar as três classes de guardas da seção3.4 e sua comparabilidade, sem suprimir integridade ou conservação.
- A ausência de resposta de Edgar sobre a causa interna não impede aplicar os contratos propostos. Se faltar fotografia/qty/identidade ou houver conflito que inviabilize um cálculo específico, manter esse impedimento, concluir os demais trabalhos independentes e apresentar evidência objetiva. Perguntas de causa ficam em paralelo; não esperar genericamente por backend para começar. Não concluir a migração para cumprir prazo nem liberar o PDF por tolerância.
- Revisar oferta por tipologia/padrão, coortes, disponibilidade, IVV, tempo médio, preços e VGV. Preservar casas nas análises horizontais e recortes livres/capas/arquivo por escopo real.

Gate: matriz antes/depois por cidade/empreendimento/tipologia/período/fonte, sem deltas críticos inexplicados; sem controles tautológicos ou dados futuros. Diferenças legítimas entre competências são descritas como tal; duplicação ou conflito real não vira simples aviso. Guardas coerentes continuam impedindo fixtures inconsistentes de exportar.

### G4 — auditoria e regressões locais

Arquivos previstos: `lib/fiergs-audit.ts`, tipos de reconciliação, `report/generation-notices.ts`, referências de metodologia somente se a regra documentada mudar, testes e evidências.

- Auditoria CSV deve identificar fonte/versão, fechamento, fotografia escolhida, quantidade original, capacidade no fechamento, duplicatas removidas, conflitos, incompletude e resultado da guarda, sem expor credenciais.
- Identificar `source_integrity`, `dimensional_conservation` e `independent_comparison`, ou equivalentes legíveis, sem chamar validação externa indisponível de match. Incluir as versões dos dois contratos e a decisão de comparabilidade.
- Avisos dinâmicos explicam normalizações e limitações relevantes; não chamar diferença de competência de alteração desde a geração anterior. Só afirmar mudança entre gerações se houver comparação efetiva de versões.
- Conferir identidade/cache da geração: invalidar resultados anteriores quando necessário por versão do adaptador/metodologia; conservar a chave de escopo e geração. Não exigir troca arbitrária do motor v4 como forma de mascarar cache.
- Reexecutar offline Porto Alegre, conjunto, Gramado, Canela e referência. Regressões obrigatórias 2T2026 e 4T2025 com fontes congeladas/fixtures identificadas; não fabricar retrospectiva para caso sem fotografia.
- Verificar totais e dimensões, não apenas `homologable`. Cada alteração deve ter causa/linhagem. Comparar unidades/estoque/vendas/VGV/preços e totais municipais com os blocos que serão exportados.
- Testes focados: transporte/fonte, novo histórico, residual, janela lançamentos, reconciliação municipal, vendas/preços e auditoria. Depois tipos/lint dirigidos. Build completo somente se mudança integrada justificar; sem suítes longas ou API extensa por iniciativa própria.
- Incluir casos específicos: original127/fechamento70 válido quando as competências estão separadas; total70/distribuição127 na mesma competência e universo que continua bloqueado; duplicata equivalente que não dobra unidades; mesmoID/mês com valores conflitantes que bloqueia; tipologia que zera sem herdar quantidade antiga; fotografia ausente/incompleta; cadastro futuro; distratos/venda líquida negativa sem reconstrução artificial da capacidade. Guardas não podem passar apenas pela alteração da referência esperada do teste.
- Evidência local passa por esquema e SHA; fixtures versionadas mínimas, sem o JSON bruto recebido. Commit por entrega, `git add` explícito; LIVE e acompanhamento/plano atualizados.

Gate: casos diagnosticados sem divergências críticas abertas ou, se houver lacuna real de contrato, impedimento declarado e exportação protegida. Testes de falha precisam comprovar que a guarda continua efetiva. G4 aprovado não significa PDF/PPT publicado ou homologação humana.

### G5 — publicação autorizada e ensaio no site

- Apresentar diferenças remotas, commits e escopo; pedir autorização antes de push/publicação. A autorização de sincronização desta rodada não autoriza envio.
- Gabriel publica e gera Porto Alegre e Gramado + Canela1T2021–2T2026; repetir os individuais para isolar se necessário. Gerar também o recorte de referência e o preset homologado; conferir fechamento4T2025 conforme roteiro de regressão.
- Receber PDF/PPT/CSV da mesma geração, guardar em `.local-inputs/` e registrar hashes/escopo/versão. Conferir habilitação dos downloads, números por dimensões e conteúdo das páginas afetadas.
- Sem novas diferenças críticas ou regressões editoriais; divergência de fonte não pode ser ignorada por ter passado no replay anterior. Se recorte falhar, retornar à evidência correspondente sem reiniciar toda a investigação.

Gate: saídas reais afetadas e baseline verificadas, sem tratar commit/build como produção conferida. Ensaio prolongado e geração real não serão executados pelo agente sem autorização específica.

### G6 — resposta e aceite

Preparar mensagem curta a Teresa/Juliana com os recortes verificados, correção de ingestão e limitações remanescentes. Não alegar que dados históricos foram corrigidos na origem se só o consumidor mudou. Produzir rascunhos prontos para Gabriel enviar, sem ferramenta de envio. Antes de G5, comunicar andamento sem dizer corrigido; depois de exportações reais verificadas, pedir conferência dos novos recortes. Novo aceite explícito cobre novos recortes; preservar o aceite anterior como histórico e não declarar homologação completa antecipadamente. Com a fatia entregue/pendências explícitas, registrar o próximo passo e liberar a retomada do estimador, sem aguardar indefinidamente diagnóstico interno do backend.

## 5. Sequência de commits e recuperação

1. Contrato de entrada/adapter mínimo e testes de fonte, sem otimização de transporte.
2. Identidade/deduplicação/linhagem e testes de conflitos.
3. Fotografias/consumidores/reconciliação e regressões, somente após G3 resolvido.
4. Auditoria/avisos/evidências e atualização da metodologia quando aplicável.

Não desligar guardas como rollback. Reverter somente commits da entrega, sem reset de histórico publicado nem restauração de arquivos paralelos. Se necessário, manter a geração bloqueada com diagnóstico acionável até resolver a causa. Stash de preservação da sincronização está reaplicado; não aplicar novamente.

## 6. CTA de execução

Validação da preparação, não da implementação futura: sete testes existentes aprovados em dois arquivos (`dashboard-geobrain/api.test.ts` e `panorama-secovi-fiergs/__tests__/building-source-parity.test.ts`); conferência independente dos quatro HTTP 200, hashes, matriz Porto Alegre87 e escopo da amostra aprovada. Gate documental da integração aprovado. Nenhum PDF/PPT, nova geração completa ou correção de runtime nesta rodada.

> Execute a revisão2 de `docs/features/Relatorios Secovi_FIERGS/PLAN_MODERNIZACAO_COLETA_E_HISTORICO_FIERGS_2026-10-27.md` pelos portões G0–G4. Implemente `history-identity-v1` e `period-capacity-v1`: deduplicação auditável por identidade/conteúdo, conflitos explícitos e capacidade derivada de uma fotografia tipológica comum até o fechamento, separada do lançamento original. Não reconstrua capacidade por vendas/distratos nem use cadastro futuro. Diferencie integridade, conservação dimensional e controle independente; preserve bloqueios de falhas reais, sem fabricar igualdade ou fixar números. Mantenha a chamada atual, os limites/recuperação multicidades e as regras homologadas; não altere Dashboard, Validação, Relatório API Excel, Corretor ou Sinduscon. Preserve mudanças paralelas, apresente a matriz antes/depois, faça testes focados e regressões locais2T2026/4T2025, registre evidências e commits isolados com git add explícito. Não espere o diagnóstico interno de Edgar para avançar no que os dados já resolvem; isole e informe lacunas reais restantes. Sem coletas extensas, estudos reais ou push por iniciativa própria. Ao terminar, apresente commits/divergência e peça autorização de envio; prepare o roteiro G5 de ensaio no site e os rascunhos G6 para Teresa/Juliana, sem declarar homologação antecipadamente. Depois da entrega e do registro das pendências, retomaremos o estimador.
