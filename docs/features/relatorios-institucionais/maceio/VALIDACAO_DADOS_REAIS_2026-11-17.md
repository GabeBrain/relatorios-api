# Maceió — bloqueios após a coleta real — 17/11/2026

## 19/11/2026 — Conciliação da sessão e dez exceções Fechado

Lucas autorizou concluir o merge interrompido entre o commit local `48c3a6d1` (17/11) e `origin/main` em `12d4f40a` (18/11), sem push. Seis conflitos resolvidos: dois documentos somados sem descartar entradas e quatro arquivos de domínio. A identidade de três pontos nos documentos foi conferida por contagem de linhas, incluindo repetições: base+(local−base)+(remoto−base), sem perda/duplicação. Entradas antigas permanecem como histórico.

Prevalecem as decisões posteriores de 18/11: Chácaras excluídas, Fechado sem de-para geral, lançamentos somente com fluxo explícito e CAGED com cópia real verificada. Removido o fallback local de lançamento por `qty` e seus testes específicos, pois contrariava a decisão posterior. Preservada a reconciliação mensal dos rankings e somadas as auditorias local de elegibilidade e remota de disponibilidade de campos/stockReconciliation; a auditoria não deriva lançamentos de quantidade.

Lucas acrescentou a confirmação **específica de dez IDs/municípios** como Condomínio de Casas, registrada em D21 de `DECISOES.md`. Classificador exige também AL/Horizontal e rótulo Fechado. Outros produtos explícitos e a exclusão de Chácaras prevalecem; demais Fechado continuam pendentes. Mensal/trimestral usam o mesmo classificador, inclusive o CSV separado que deixa de listar os casos resolvidos. Testes verificam os dez pares, ID/município/UF/segmento incorretos, ausência do rótulo, preservação de loteamento explícito e exclusão de Chácaras; nos dois modelos conferem totais/preços e a permanência de um ID não autorizado no CSV.

Validação de domínio:200testes/18arquivos Maceió aprovados. Nenhuma geração autenticada real observada nesta sessão; sem token Geobrain no ambiente. Não afirmar que todos os horizontais ou os demais bloqueios foram liberados. Produto sem classificação e diferença de estoque continuam exigindo evidência. Sem push/deploy/escrita Monday.

## 18/11/2026 — Continuação após JSON real: recorte dos rankings e auditoria v2

**Evidência recebida:** `maceio-mensal-2026-05-diagnostico.json`, geração `2026-11-18T16:03:00.749Z`, SHA-256 `62aa5ca14666fb312a4859c3308af1217655f0240a06e5fd3fa0f948ba627a9f`; CSV `maceio-monthly-2026-5-fechado-conferencia.csv`, SHA-256 `04389204489d66cb9082f35779d0cf2f35264cc4bb2d66de926bedeccdc5dec6`. Brutos permanecem fora do Git, na pasta Auditorias de Lucas. JSON:33disponíveis/27fontes/22editoriais,49fontes verticais+14horizontais completas, sem falha de coleta. Critérios INCC-DI/base maio e chácaras excluídas presentes. CSV lista10produtos apenas `Fechado`, com referência compatível; não contém identificador da geração para comprovar sozinho o pareamento exato. Lucas confirmou nesta sessão que **ainda aguarda o analista**, sem autorização de de-para.

**Bloqueios reais:**6CAGED(9–14),2rankings(25/36),2IVV por área(47/48),11quadros por estoque de Marechal Deodoro(56–60/62–64/67–69) e6horizontais(71–73/75–77). Estoque detalhado de Marechal283versus192municipal, diferença91. A auditoria bruta da capital tem878fotografias em maio,14vendas ausentes/inválidas e878lançamentos ausentes; esse total bruto inclui observações que podem ficar fora do recorte pela data de lançamento. Não confundir bruto com universo aceito nem derivar lançamento de `qty`. O OpenAPI público descreve `sold_in_period`, mas não `releases_in_period` em `TypologyHistoryResource`; a resposta interna real não forneceu esse último campo nas observações auditadas.

**Correção implementada (`f537eab9`):** rankings passam a tratar fotografias de competência anterior à data explícita de lançamento como fora do universo do empreendimento. Antes, exigiam fluxo nessas fotografias e podiam bloquear por valores nulos. Fluxo nãozero anterior ao lançamento continua bloqueado como contradição; campos ausentes em competência válida, duplicatas, bairro ausente e divergência municipal continuam bloqueados. Nenhum fluxo é inferido de capacidade/estoque.

**Conferência acionável:** erros de estoque/ranking mostram município, competência, detalhado/municipal e delta. IVV por área identifica nome do campo e quantidade de observações ausentes/inválidas por mês. Diagnóstico `auditVersion: maceio-source-audit-v2` adiciona `stockReconciliation`: totais brutos/elegíveis por data, completude, delta, duplicatas/fotografias ausentes e partições de estoque por tipo de unidade, status histórico, padrão cadastral e dormitórios. `fieldAvailability` separa propriedade ausente, nulo/branco, inválido e zero. É evidência da fonte antes das exclusões do relatório; não homologa slides nem inclui nomes/IDs/históricos individuais. O teste sintético que distribui91unidades emGarden verifica o mecanismo, **não** atribui a divergência real aGarden.

**Validação:**175testes/16arquivos Maceió aprovados, lint dirigido e build com TypeScript aprovados.4cenários Edge (mensal/trimestral, desktop/claro e mobile/escuro) com API sintética e espera deliberada: prévia, logo Brain, download/reabertura do JSON v2, contagem municipal, delta0nas fixtures e cobertura de campos verificados; nenhuma exceção de página. Evidências locais em `.local-inputs/relatorios-lucas/maceio/blockers-2026-11-18/page/`, roteiro `.local-inputs/maceio-blockers-qa.mjs`. Shared/políticas Secovi/FIERGS/SP/Fortaleza e CAGED sem diff.

**Próximo/limite:** não há token Geobrain em variáveis/arquivo pessoal de credenciais nem payload individual real acessível nesta sessão. Não foi possível reexecutar a geração autenticada ou comprovar liberação dos27slides. Após publicação autorizada, gerar novo JSON v2 para medir efeito do recorte dos rankings e identificar origem da divergência/ausências. Até lá, estoque, fluxos ausentes e10`Fechado` permanecem pendentes. Push anterior autorizou o lote já enviado; esta continuação está local, aguardando nova decisão de envio. Sem escrita Monday.

## 18/11/2026 — Decisões do analista e lista de conferência

Lucas confirmou exclusão de Condomínio de Chácara/Chácaras e INCC-DI com o analista; pediu a lista dos empreendimentos somente como `Fechado`. Implementação `38700781`: exclusão de valores e rótulos no horizontal mensal/trimestral, incluindo preços e anos; reconciliação bruta preservada antes do filtro. Categorias desconhecidas continuam bloqueadas, inclusive na distribuição anual. INCC-DI já configurado nas duas edições; confirmação registrada sem alterar séries ou fórmulas.

Lista identificada em CSV separada do JSON, preparada pelo worker existente e baixada na seção Diagnóstico da geração: nomes/IDs/municípios/campos e lançamento, somente produtos ambíguos `Fechado`, sem reclassificação, sem chácaras ou histórico bruto. Não exige estoque positivo; sinaliza coleta parcial e ausência cadastral. Zero registros numa coleta completa mostra vazio explícito e desabilita download. CSV com BOM, aspas escapadas e proteção de fórmulas. A política de diagnóstico agregado continua preservada.

**Verificação:** suíte Maceió com 165 testes/15 arquivos aprovada; rodada final de 14 testes inclui mais 2 casos de interface (lista parcial, vazio e descarte ao trocar geração). 106 regressões Secovi/FIERGS aprovadas; lint dirigido, TypeScript e build de produção aprovados. Edge headless: 12 cenários (mensal/trimestral × desktop/claro e mobile/escuro × CAGED disponível/vazio/erro), coleta deliberadamente lenta com logo Brain, download e reabertura de JSON/CSV, categoria excluída ausente nas tabelas e nenhuma exceção de página. Evidências locais ignoradas: `.local-inputs/relatorios-lucas/maceio/horizontal-policy-2026-11-18/page/`; roteiro derivado de `scripts/diagnostics/maceio-diagnostic-page-visual.mjs` em `.local-inputs/maceio-policy-qa.mjs`.

**Limites/próximo:** navegador com API sintética interceptada; sem token Geobrain nas variáveis desta sessão e sem fonte local identificada com cadastros reais de Maceió. Nenhum nome real foi inferido. Lucas autorizou push e fará a geração autenticada; conferir JSON e CSV da mesma geração após atualização do ambiente. Push não comprova deploy Lovable. CAGED e domínios paralelos sem alteração; sem escrita Monday.

## Continuação — diagnóstico (4), rankings e horizontais

Base `d2371881`, main/origin0/0após fetch. Arquivo real(4), gerado às19:59UTC:35disponíveis/25fontes/22editoriais, sem falha nas63consultas imobiliárias. Liberados23slides pelo lote anterior. Permanecem19imobiliários: rankings25/36, área47/48,11slides de oferta/preços/estado atual com divergência de Marechal Deodoro e4horizontais por produto sem correspondência. CAGED9–14fora do escopo.

Conferência visual direta das tabelas incorporadas nos dois PPTX originais: capital usa Condomínio de Casas/Loteamento Fechado;RM também usa Loteamento Aberto. Não há Sem classificação nem Chácaras no original. Ao conferir isso, Lucas determinou: **“Fechado vira loteamento fechado. Condomínio de chácaras [...] cria uma categoria a parte [...] depois eu vejo com o analista”.** Aplicados Fechado→Loteamento Fechado e Chácaras em linha própria, nas duas edições. Nenhuma autorização para classificar Econômico ou campo vazio como casas, nem para criar Sem classificação; esses casos continuam bloqueados.

Correções técnicas:

- Ranking ignora empreendimentos lançados após o fechamento e fotografias anteriores ao lançamento, evitando somar históricos retroativos de projetos futuros ou exigir vendas desses projetos.
- Lançamentos por tipologia usam fluxo mensal explícito quando disponível. Sem esse campo, usam `qty` histórico somente na competência do lançamento do empreendimento e zero fora dela. É o critério de coorte existente no institucionalSP, com reconciliação obrigatória de **cada mês** contra lançamentos municipais. Não usa quantidade cadastral atual nem diferença de estoques; fluxo explícito nulo/inválido não é substituído. Aplicado ao ranking e ao IVV por área. Vendas continuam exigindo `sold_in_period` explícito, preservando distratos.
- Erro de estoque mostra valores histórico/municipal/diferença. Auditoria acrescenta `monthly.eligibility`: estoque e fluxos elegíveis, estoque excluído por lançamento futuro/data inválida, composição por padrão/tipo da unidade/produto horizontal. Totais brutos anteriores preservados; nenhum ID/nome/endereço exportado. Isso permite localizar o desvio de Marechal sem inventar uma exclusão de unidades.

**Pendência real:** auditoria atual informa283unidades brutas do histórico e192municipais em Marechal/maio2026, mas não separa, retroativamente, os registros elegíveis já usados pelos leitores. Não afirmar que os91de diferença são todos futuros; precisa do novo JSON com elegibilidade. Reconciliação segue bloqueando divergência. Outros campos numéricos/produtos ausentes também não são preenchidos sem evidência. Sem token/controleOpera para nova coleta autenticada; após publicação autorizada, gerar mensal/trimestral e conferir o JSON. Não declarar19slides resolvidos com base em testes sintéticos.

Validação:160testes/15arquivos Maceió aprovados, incluindo recorte por data, quantidade histórica de lançamento, reconciliação mensal, nulos/distratos e separação de estoque futuro. Tipos/lint dirigidos aprovados. Padrões e fluxos visuais existentes preservados; sem mudança de carregamento. SP/CAGED/outros motores intocados. Sem push/deploy/Monday neste lote.

## Atualização posterior — diagnóstico (3), decisões e correções

Recebido `maceio-mensal-2026-05-diagnostico (3).json`, gerado às19:36:20UTC:12disponíveis/48fontes/22editoriais;63consultas imobiliárias completas, zero falhas. Garden/Cobertura deixaram de bloquear após `1c63413f`, liberando7slides. Dos48pendentes,6são CAGED e42imobiliários.32têm como primeiro bloqueio Pilar; não significa que os demais dados desses slides já estejam homologados.

Decisões expressas de Lucas nesta sessão, posteriores às restrições registradas abaixo:

- **Famílias:** Compacto→Compactos; Econômico→MCMV; Standard/Médio/Médio-Alto→Médio Padrão; Alto/Luxo→Luxo. Aplicadas aos gráficos agrupados, cadastro de lançamentos e estágio por família, mensal/trimestral. Padrões desconhecidos continuam pendentes.
- **Varredura vazia:** após pedir registrar a interpretação de Pilar/Coqueiro Seco para depois, Lucas decidiu: “se não teve nada considera0então, pois se a varredura concluiu e deu0provavelmente é0mesmo”. Competências sem linhas em consulta completa contam como zero no mercado pesquisado. Não é comprovação de inexistência no município inteiro. Falhas, consultas parciais e campos nulos/inválidos dentro de linhas continuam indisponíveis. Reconciliação entre estoque granular e municipal permanece obrigatória. A decisão fica em `criteria.emptyPeriods` e os meses derivados em `sources.*.zeroMonths`; auditoria bruta conserva `null` e `missingMonths`, sem fingir resposta explícita da API.

Correções adicionais:

- Grupos numéricos por dormitórios passam a ser aceitos como os equivalentes textuais; nenhuma tipologia desconhecida é convertida.
- Produtos horizontais reconhecem rótulos explícitos em `work` e demais campos, inclusive `Condomínio de Casas/Sobrados` e `Condomínio de Chácaras`. “Fechado” isolado e padrões de preço como “Econômico” não definem produto. Chácaras permanecem em categoria própria, sem serem somadas a casas ou lotes.
- Escoamento preserva Médio-Alto como categoria própria, evitando excluir esse padrão recebido da API.
- Tabela histórica do IVV preserva os meses válidos e mostra `null` nas competências com balanço inválido, com motivo datado em advertências. Média anual considera só meses reconciliados, explicitamente. Série mensal mantém o bloqueio de balanço inválido; nenhuma quantidade é ajustada para fechar.
- Nota de preços corrigida: universo inclui Garden/Cobertura, sem a antiga descrição incorreta “somente Padrão”.

**Limites que continuam:** fluxos granulares ausentes nos slides47/48 não são inferidos de capacidade ou preço; produtos sem identificação explícita continuam pendentes; divergências reais de estoque continuam bloqueadas. Com novos primeiros bloqueios removidos, outros campos não disponíveis podem aparecer na próxima geração. Não afirmar que todos os42slides imobiliários foram liberados.

Validação headless:156testes Maceió/14arquivos aprovados, incluindo as duas edições, famílias, produtos, tipos numéricos, consultas completas vazias, erros/campos nulos, reconciliação e preservação de meses válidos do IVV. Sem token Geobrain ou acesso ao Opera para executar geração real neste ambiente. Após publicação autorizada, solicitar novo JSON mensal/trimestral; não substituir conferência real por fixture. CAGED, SP e outros motores sem alteração.

## Evidência recebida

Novo arquivo `maceio-mensal-2026-05-diagnostico (1).json`, gerado às18:23:53UTC:5disponíveis/55fontes/0critérios/22editoriais. **As49fontes verticais e14horizontais estão completas, sem falhaHTTP/contrato.** Cadastro/lançamentos dos7municípios também completos. Assim, as correções de transporte de `2cea2276` foram observadas na coleta real; isso não prova a validade dos indicadores.

Bloqueios atuais:

- Pilar e Coqueiro Seco: todas as séries verticais e histórico detalhado vazios, apesar de paginação completa. Rio Largo tem séries vazias e1registro detalhado. Não converter essas situações automaticamente em zero.
- Outros municípios apresentam quantidades de linhas muito diferentes na janela de65meses, exigindo cobertura por competência.
- Slide17: correspondência entre padrões da API e famílias do original ainda não identificada.
- Slides41/47–60/62–69: código exige literalmente `type_of_typology == Padrão` no histórico ou cadastro da tipologia; demais valores, inclusive ausentes, bloqueiam o slide inteiro. O diagnóstico anterior não incluía os rótulos efetivos desse campo.
- Slide42: grupo/competência inválido no estoque por tipologia; o JSON não distingue grupo vazio de rótulo desconhecido.
- Slide46: balanço municipal divergente em2021-03; não é falha de transporte e não deve ser escondido.
- Slides71/73/75/77: produto horizontal não identificado; necessário conferir campos reais antes de mapear categoria.

## Esclarecimento do usuário e decisão ainda aberta

Ao ser perguntado sobre inclusão de tipologias diferentes, Lucas respondeu **“Defina tipologia diferente”**. Isso **não autoriza** mudar universo. Esclarecido: é o campo `type_of_typology`, diferente de dormitórios e padrão de preço; chamar qualquer valor diferente de Padrão de “especial” foi impreciso, pois os valores reais não constam do JSON. Nenhuma tipologia foi incluída/excluída por nova regra neste lote; guardas e números permanecem inalterados.

## Auditoria agregada preparada

O JSON passa a incluir, por fonte, somente evidência agregada permitida:

- grupos recebidos, meses observados e ausentes;
- somas mensais de estoque, vendas, lançamentos e capacidade, com contagem de valores ausentes; mês sem linhas permanece `null`, zero explícito permanece0;
- rótulos/contagens de `type_of_typology` no histórico e no cadastro, padrões/famílias e campos candidatos de produto horizontal;
- primeira/última competência de lançamento e quantidade de datas inválidas, sem IDs, nomes, endereços ou linhas individuais.

Usa os dados já presentes na geração; não faz nova consulta nem grava no backend. Permite identificar os valores concretos necessários para reparar correspondências e cobertura sem adivinhação. O arquivo recebido não permite retroativamente calcular essa auditoria: não contém os registros individuais. Após publicação autorizada, um novo diagnóstico da geração é necessário.

Lucas pediu deixar esse estilo detalhado como padrão. Aplicado automaticamente aos dois modelos de Maceió, com `auditVersion` e `collection` (fontes solicitadas, concluídas, falhas e vazios completos) separados da situação dos slides. [Convenção de diagnóstico](../../../architecture/REPORT_DIAGNOSTIC_STANDARD.md) passa a orientar criação/evolução dos demais diagnósticos, sem migrar os outros motores ou suas regras neste lote.

Limite: auditoria ainda local; sem tokenGeobrain ou controle Opera, não há nova coleta real pelo agente. Resolver classificações/meses continua pendente de evidência agregada real; não registrar a tarefa de fontes como concluída. CAGED continua fora do escopo.

Validação local:10testes de auditoria/diagnóstico/exportação aprovados, incluindo contagens/rótulos reais da fixture, ausência versus zero, transporte completo vazio versus validação pendente, privacidade e cancelamento/retry. Tipos/lint e build final aprovados. Não foi observado download com essa auditoria na geração real do usuário; precisa de publicação autorizada e novo diagnóstico. O fluxo visual de exportação existente foi preservado.

**Monday:** [Panorama Maceió / SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406169) — `13149406169`. Sem escrita.
