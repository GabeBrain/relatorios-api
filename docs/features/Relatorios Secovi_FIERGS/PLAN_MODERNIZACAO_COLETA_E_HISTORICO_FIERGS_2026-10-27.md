# FIERGS — modernização da coleta e do histórico tipológico

Data: 27/10/2026. Responsável pela sessão: Gabriel/Codex. Estado: plano preparado, implementação pendente de autorização pelo CTA. Publicação e aceite dos novos recortes continuam pendentes.

## 1. Objetivo e limites

Resolver o bloqueio relatado por Teresa e Juliana em Porto Alegre e Gramado + Canela, 1T2021–2T2026, usando o contrato e a organização por tipologia da implementação atual do Dashboard como referência. Preservar as regras homologadas FIERGS/Secovi, coleta multicidades, invariantes e evidências.

Não alterar Dashboard GeoBrain, Validação do Fechamento, Relatório API Excel, Corretor, Sinduscon ou dados no Geobrain. Não importar o motor de indicadores desses projetos. Não fixar IDs, municípios, quantidades ou exceções por período no runtime. Não substituir ausência por zero nem apagar vendas líquidas negativas.

Sincronização solicitada nesta rodada já realizada: `21edc3d` integrou os sete commits remotos sobre os três locais. A alteração prévia de LIVE foi guardada em stash de caminho explícito, reaplicada e comparada com a diferença original; conteúdo preservado. Outros arquivos locais paralelos não foram incluídos. Não repetir merge por inferência nem fazer push sem autorização.

## 2. O que foi confirmado antes de planejar

### 2.1 O endpoint já é o mesmo

Dashboard (`src/features/dashboard-geobrain/api.ts`), Validação (`src/features/validacao-fechamento/api.ts`) e Panorama (`src/features/panorama-secovi-fiergs/api.ts`) usam `POST https://app.geobrain.com.br/public-api/v2/building-with-history-internal`.

| Aspecto | Dashboard / Validação | Panorama atual | Decisão do plano |
|---|---|---|---|
| Escopo | `city` ou `uf`; município tem precedência | `city` e `uf` | Reproduzir precedência de consulta; validar UF/cidade autorizadas no cliente e conferir retorno |
| Transporte | Bearer, Accept e Content-Type JSON; timeout 60 s | httpRequest; timeout padrão 40 s; Content-Type só com body | Configuração explícita da chamada local, sem alterar cliente HTTP global |
| Paginação | 100 registros, primeira página e lotes de até cinco | páginas sequenciais por tipo, duas cidades e teto global de seis chamadas FIERGS | Adotar paginação limitada pelo gate global, preservando política Secovi e recuperação por cidade |
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

## 4. Portões de execução

### G0 — congelar a base e a evidência

Situação desta rodada: sincronização e comparação de chamadas concluídas; contrato alvo ainda não implementado.

- Conferir novamente branch/remotos/estado e registrar novo HEAD antes de implementação; não sobrescrever mudanças paralelas.
- Preservar as cinco gerações diagnósticas existentes e a referência anterior. Não substituir os brutos por saídas de experimentos.
- Criar evidência pequena versionada com matriz inicial: Porto Alegre crítico 87; Gramado + Canela 9; Gramado 9; Canela 0; referência Canoas/Esteio/São Leopoldo 0. Separar coleta real e reexecução congelada.
- Extrair fixtures mínimas anonimizadas dos casos reais; amostra completa e nomes de responsáveis permanecem locais.

Saída: manifesto, inventário de campos/consumidores e matriz inicial. Não prosseguir se o contrato observado divergir da descrição deste plano sem registrar a revisão.

### G1 — alinhar o transporte com a referência, mantendo segurança

Arquivos previstos: `api.ts`, novo adaptador de fonte da própria feature e `__tests__/building-source-parity.test.ts`.

- Centralizar host/rota/método/cabeçalhos/timeout e versão da fonte dentro do Panorama. Usar Bearer da sessão, sem token fixo ou autenticação própria no bundle.
- Usar `city` com precedência sobre UF na query, mas continuar exigindo uma única UF e cidades monitoradas autorizadas. Validar cidade/UF recebidas e rejeitar mistura territorial.
- Validar `data`, paginação inteira positiva e encerramento; não aceitar página ausente como coleção vazia. Conferir páginas esperadas, consumidas e conflitos/repetições de empreendimentos.
- Primeira página antes das demais; lotes paginados respeitam o gate global. Não criar cinco chamadas por cidade fora do teto. Preservar cancelamento, retries transitórios, recuperação das cidades falhas e não refazer cidades concluídas.
- Não migrar automaticamente séries `temporal-analysis-city`: Dashboard não fornece substituto equivalente para elas. Mapear seus contratos separadamente, mantendo o firewall de fontes.
- Registrar qual fonte respondeu. Fallback público existente deve passar pelo mesmo adaptador e contrato; não combinar pedaços de duas fontes silenciosamente nem usar fallback para esconder divergência de negócio.

Gate: testes do transporte, limites, timeout/cancelamento, paginação, autorização geográfica e falha parcial aprovados; universo de produto preservado. Não se espera que G1 sozinho elimine o delta 87/9.

### G2 — identidade tipológica, duplicatas e conflitos

Arquivos previstos: novo `domain/building-history.ts` (nome final pode variar), `domain/cube.ts`, tipos/auditoria e testes próprios.

- Agrupar por ID do empreendimento + ID da tipologia + competência + discriminadores comprovados no contrato; classificar registros antes da agregação editorial.
- Remover repetições com conteúdo semanticamente idêntico, usando comparação canônica independente da ordem das chaves JSON. Conservar contador, referência às linhas de origem e regra aplicada.
- Mesmo identificador e competência com conteúdos divergentes: conflito; não usar `first`, `last`, máximo ou soma indiscriminada para decidir. Discriminadores adicionais precisam de evidência de contrato.
- Não colapsar tipologias diferentes com os mesmos dormitórios ou área. Diferentes meses do mesmo ID permanecem como história.
- Preservar zero, nulo e valores negativos conforme campo; não copiar `toNum(..., 0)` ou busca do último valor positivo do Dashboard indiscriminadamente.
- Aplicar normalização uma única vez antes de qualquer soma de unidades, estoque, vendas e VGV.

Gate: Solaris passa a três linhas únicas de lançamento/soma 9, com três remoções auditadas; os conflitos intencionais das fixtures continuam bloqueados. Nenhuma exceção específica para o ID73632 no runtime. Demais números mudam somente quando houver linhagem verificável.

### G3 — coerência temporal e indicadores

Arquivos previstos: `domain/cube.ts`, `domain/aggregations.ts`, `report/model.ts`, contratos pertinentes e `domain/reconciliation.ts` apenas para explicitar operandos/comparabilidade.

- Elaborar matriz por indicador: semântica, universo, campo bruto, fotografia, total independente quando disponível, fórmula, consumidores e efeito esperado na baseline.
- Separar evento de lançamento, quantidade observada no lançamento, capacidade/oferta na fotografia de fechamento, estoque e vendas do fechamento. Um único campo `launchedUnits` não deve representar bases temporais incompatíveis sem proveniência.
- Selecionar a fotografia pelo ID tipológico até o fim do trimestre; documentar quando o mês deve ser comum ao empreendimento e quando uma tipologia pode usar observação anterior. Não carregar uma tipologia extinta para o fechamento só por possuir uma observação antiga. Ausências/defasagens exigem política explícita, não preenchimento silencioso.
- Dados após o corte não podem preencher quantidade, padrão, área ou preço de uma saída histórica. O `pick` sem limite temporal do Dashboard não deve ser transplantado.
- Preservar o significado homologado da Oferta Lançada na janela; ajustar a base dos denominadores de mercado atual sem alterar retroativamente o significado do fluxo original. Manter valores originais disponíveis para explicar diferenças.
- Confrontar os quatro projetos de Porto Alegre: capacidade e distribuição jun/2026 somam 153; lançamento original soma 240. Não tentar tornar as duas épocas numericamente iguais.
- Uma reconciliação precisa comparar universos compatíveis e, quando alegar controle independente, fontes/operandos independentes. Não definir o total como a soma das mesmas linhas e usar a igualdade resultante como prova de reconciliação externa.
- O cadastro de topo dos quatro projetos é ago/2026, posterior ao corte. A igualdade numérica com junho não comprova sua validade temporal. Se o contrato não oferecer total histórico independente, registrar a capacidade derivada e a limitação, sem declarar controle independente aprovado. Apresentar a decisão de completude/comparabilidade antes de alterar a guarda.
- Se os dados não resolverem qual base o indicador deve usar ou como validar sua completude, parar este portão e apresentar pergunta objetiva a Gabriel/Edgar com exemplo. Não concluir a migração para cumprir prazo nem liberar o PDF por tolerância.
- Revisar oferta por tipologia/padrão, coortes, disponibilidade, IVV, tempo médio, preços e VGV. Preservar casas nas análises horizontais e recortes livres/capas/arquivo por escopo real.

Gate: matriz antes/depois por cidade/empreendimento/tipologia/período/fonte, sem deltas críticos inexplicados; sem controles tautológicos ou dados futuros. Diferenças legítimas entre competências são descritas como tal; duplicação ou conflito real não vira simples aviso. Guardas coerentes continuam impedindo fixtures inconsistentes de exportar.

### G4 — auditoria e regressões locais

Arquivos previstos: `lib/fiergs-audit.ts`, tipos de reconciliação, `report/generation-notices.ts`, referências de metodologia somente se a regra documentada mudar, testes e evidências.

- Auditoria CSV deve identificar fonte/versão, fechamento, fotografia escolhida, quantidade original, capacidade no fechamento, duplicatas removidas, conflitos, incompletude e resultado da guarda, sem expor credenciais.
- Avisos dinâmicos explicam normalizações e limitações relevantes; não chamar diferença de competência de alteração desde a geração anterior. Só afirmar mudança entre gerações se houver comparação efetiva de versões.
- Conferir identidade/cache da geração: invalidar resultados anteriores quando necessário por versão do adaptador/metodologia; conservar a chave de escopo e geração. Não exigir troca arbitrária do motor v4 como forma de mascarar cache.
- Reexecutar offline Porto Alegre, conjunto, Gramado, Canela e referência. Regressões obrigatórias 2T2026 e 4T2025 com fontes congeladas/fixtures identificadas; não fabricar retrospectiva para caso sem fotografia.
- Verificar totais e dimensões, não apenas `homologable`. Cada alteração deve ter causa/linhagem. Comparar unidades/estoque/vendas/VGV/preços e totais municipais com os blocos que serão exportados.
- Testes focados: transporte/fonte, novo histórico, residual, janela lançamentos, reconciliação municipal, vendas/preços e auditoria. Depois tipos/lint dirigidos. Build completo somente se mudança integrada justificar; sem suítes longas ou API extensa por iniciativa própria.
- Evidência local passa por esquema e SHA; fixtures versionadas mínimas, sem o JSON bruto recebido. Commit por entrega, `git add` explícito; LIVE e acompanhamento/plano atualizados.

Gate: casos diagnosticados sem divergências críticas abertas ou, se houver lacuna real de contrato, impedimento declarado e exportação protegida. Testes de falha precisam comprovar que a guarda continua efetiva. G4 aprovado não significa PDF/PPT publicado ou homologação humana.

### G5 — publicação autorizada e ensaio no site

- Apresentar diferenças remotas, commits e escopo; pedir autorização antes de push/publicação. A autorização de sincronização desta rodada não autoriza envio.
- Gabriel publica e gera Porto Alegre e Gramado + Canela1T2021–2T2026; repetir os individuais para isolar se necessário. Gerar também o recorte de referência e o preset homologado; conferir fechamento4T2025 conforme roteiro de regressão.
- Receber PDF/PPT/CSV da mesma geração, guardar em `.local-inputs/` e registrar hashes/escopo/versão. Conferir habilitação dos downloads, números por dimensões e conteúdo das páginas afetadas.
- Sem novas diferenças críticas ou regressões editoriais; divergência de fonte não pode ser ignorada por ter passado no replay anterior. Se recorte falhar, retornar à evidência correspondente sem reiniciar toda a investigação.

Gate: saídas reais afetadas e baseline verificadas, sem tratar commit/build como produção conferida. Ensaio prolongado e geração real não serão executados pelo agente sem autorização específica.

### G6 — resposta e aceite

Preparar mensagem curta a Teresa/Juliana com os recortes verificados, correção de ingestão e limitações remanescentes. Não alegar que dados históricos foram corrigidos na origem se só o consumidor mudou. Novo aceite explícito cobre novos recortes; preservar o aceite anterior como histórico e não declarar homologação completa antecipadamente.

## 5. Sequência de commits e recuperação

1. Contrato de coleta/adapter e testes de transporte.
2. Identidade/deduplicação/linhagem e testes de conflitos.
3. Fotografias/consumidores/reconciliação e regressões, somente após G3 resolvido.
4. Auditoria/avisos/evidências e atualização da metodologia quando aplicável.

Não desligar guardas como rollback. Reverter somente commits da entrega, sem reset de histórico publicado nem restauração de arquivos paralelos. Se necessário, manter a geração bloqueada com diagnóstico acionável até resolver a causa. Stash de preservação da sincronização está reaplicado; não aplicar novamente.

## 6. CTA de execução

Validação da preparação, não da implementação futura: sete testes existentes aprovados em dois arquivos (`dashboard-geobrain/api.test.ts` e `panorama-secovi-fiergs/__tests__/building-source-parity.test.ts`); conferência independente dos quatro HTTP 200, hashes, matriz Porto Alegre87 e escopo da amostra aprovada. Gate documental da integração aprovado. Nenhum PDF/PPT, nova geração completa ou correção de runtime nesta rodada.

> Execute `docs/features/Relatorios Secovi_FIERGS/PLAN_MODERNIZACAO_COLETA_E_HISTORICO_FIERGS_2026-10-27.md` pelos portões G0–G4. Use o contrato e a organização por tipologia do Dashboard como referência, sem alterar Dashboard, Validação do Fechamento, Relatório API Excel, Corretor ou Sinduscon. Preserve alterações locais paralelas, a recuperação multicidades e as regras FIERGS/Secovi. Não presuma que trocar o endpoint resolve: as chamadas comparadas ainda reproduziram os dados do incidente. Implemente identidade tipológica, deduplicação auditável e coerência temporal, sem fixar números, usar dados futuros, criar controles tautológicos ou afrouxar guardas. Apresente a matriz antes/depois e pare no portão correspondente se faltar definição de contrato ou metodologia. Faça testes focados e regressões locais 2T2026/4T2025, registre evidências e crie commits isolados com git add explícito. Não execute novas coletas extensas nem gere estudos reais por conta própria. Ao concluir, apresente o estado remoto e os commits e peça autorização antes de qualquer push; farei o ensaio no site em G5 e retomaremos o aceite em G6.
