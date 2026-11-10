# Execução G0–G4 — contratos de histórico FIERGS

Estado inicial desta execução: main `a0a6d39`; fetch0atrás/6locais à frente, sem integração nova ou envio. Alterações paralelas documentais FIERGS/estimativas/LIVE e pasta Corretor preservadas fora dos commits.

## G0 — evidência congelada e escopo

Brutos originais de27/10 em `.local-inputs/fiergs-incidente-20261027/raw/`, com manifestos/CSV/relatórios prévios preservados. Nenhuma consulta de negócio ou autenticação nova nesta execução. Fonte: chamada interna v2 já confirmada, não há migração de host ou de paginação concorrente.

Matriz crítica anterior: Porto Alegre87; Gramado+Canela9; Gramado9; Canela0; referência Canoas+Esteio+SãoLeopoldo0. Todos os recortes encerram2T2026; primeiros quatro iniciam1T2021, referência1T2023. Antes,42guardas por geração.

Varredura das linhas atéjun/2026:1.204projetosPorto,328conjunto,266referência; nenhum conflito de identidade e nenhum ID tipológico ausente. Duplicatas idênticas encontradas:2linhasPorto,3Gramado,0referência. Referência e conjunto têm capacidade final igual ao cadastro usado anteriormente; Porto apresenta uma diferença adicional18, detalhada abaixo. Script local/resultado: `scan-contract.mjs` e `contract-scan.json`.

Novo achado: Miradero,building_id63297,lançamentojun/2023, cadastroago/2026 com36unidades. Único ID tipológico87033 informa18unidades no lançamento, emjun/2026 e emago/2026, comestoque8emjunho. Não há linhas para atribuir as18restantes à fotografiajunho. Pela regra proposta a capacidade é18derivada; cadastro posterior36fica separado, não é controle compatível nem prova de alteração retroativa. Não corrigimos a base, imputamos a diferença ou afirmamos completude externa.

## G1/G2 — entrada e identidade

`building-source.ts`: valida envelope/páginas/território/IDs, registra fonte/página sem segredos, trata repetições equivalentes de empreendimentos com linhagem e rejeita conteúdos conflitantes. Erro de contrato não ativa fallback público nem repetição transitória. Paginação/total inconsistente é erro, sem coleção vazia silenciosa. Mantidos tipos, teto global, sessão e recuperação multicidades.

`building-history.ts`: `history-identity-v1`, agrupamento por projeto/ID tipológico/competência; fingerprint recursivo ordena propriedades sem arredondar valores. Remove cópias equivalentes com índices de origem; conflito, identidade ausente, medida ausente ou fotografia incompleta gera ocorrência impeditiva. Linhas futuras são excluídas antes da seleção temporal. Fixtures mínimas anonimizadas nos testes incluem três paresde3unidades e revisão127→70.

Compatibilidade: inputs diretos anteriores à v2, sem qualquer ID tipológico e sem proveniência de API, continuam representáveis como `identityMode=legacy`, sem alegação de integridade identificada. Os adaptadores internos/públicos v2 sempre declaram contrato e exigem identidade; não há fallback de produção v4 para esse modo por ausência de ID. Política Secovi de quantidade mantida; deduplicação protege sua entrada também.

## G3 — contrato temporal e decisões

`period-capacity-v1`: quantidade original preservada em `historyAudit.releaseObservedUnits`; capacidade derivada de uma fotografia comum até o fechamento em `capacityAtClosing`; cadastro/competência originais separados. O campo de compatibilidade `CubeProject.launchedUnits` representa, no FIERGS identificado, capacidade dos empreendimentos classificados por sua data de lançamento. A janela continua selecionando eventos/empreendimentos porrelease_date; não é contagem repetida de fotografias. Sua quantidade é observada até o fechamento, não retorno ao número inicial por efeito colateral. As demais regras de lançamento/VGV não são substituídas mecanicamente.

Cubos Secovi e inputs legados conservam o significado anterior de quantidade; têm origem explicitada. FIERGS não usa preço/topo futuro nem infere venda mensal como capacidade−estoque. `sold` não é alias de venda líquida mensal no contrato identificado; mede-se `sold_in_period` ou alias mensal comprovado.

As42guardas anteriores de conservação continuam presentes. Nova guarda crítica de integridade do histórico e controles cadastrais individuais quando competência coincide. Controle externo incompatível fica `unavailable`, não crítico por sua ausência isolada, sem delta zero fictício. Original127/fechamento70 é distinção temporal; total70/distribuição127 da mesma fotografia continua falhando na sobrecobertura ou no controle cadastral compatível.

## G4 — auditoria, regressões e limites

Auditoria CSV recebe contratos, campos originais/derivados, competências, proveniência, índices das duplicatas e motivos de integridade, além da classe de verificação. Avisos usam a aba existente e não entram como notas explicativas no PDF/PPT. Cache/sessão de geração identificam a versão de contrato, sem trocar arbitrariamente motorv4.

Reexecução reproduzível: `scripts/diagnostics/fiergs-history-contract-replay.ts`, compilada localmente com esbuild. O fetch é substituído por leitor de arquivos e não tem fallback para rede nem lê segredos. Dezcasos: cinco recortes nos fechamentos2T2026/4T2025; saídas JSON/CSV em `.local-inputs/fiergs-incidente-20261027/after-contracts/`. Para4T2025 usa o arquivo recebido em2026, selecionando competências atédez/2025; não reproduz o banco tal como existia naquela data. Não é geração real nem PDF/PPT.

### Matriz final — 2T2026

Totais de todo o cubo elegível, não apenas dos lançamentos na janela. Base anterior usava cadastro; base nova usa capacidade da fotografia. Estoques/vendas abaixo são os mesmos antes/depois.

| Recorte | Projetos | Capacidade antes → depois | Estoque | Vendas líquidas | Delta crítico antigo → novo |
|---|---:|---:|---:|---:|---:|
| Porto Alegre | 1.204 | 111.047 → 111.029 | 8.600 | 943 | 87 → 0 |
| Gramado + Canela | 328 | 10.623 → 10.623 | 1.802 | 237 | 9 → 0 |
| Gramado | 226 | 6.804 → 6.804 | 1.372 | 165 | 9 → 0 |
| Canela | 102 | 3.819 → 3.819 | 430 | 72 | 0 → 0 |
| Canoas + Esteio + São Leopoldo | 266 | 35.616 → 35.616 | 3.371 | 554 | 0 → 0 |

A capacidade Miradero36→18 explica integralmente a diferença−18 dePorto; não representa remoção de empreendimento. Original dos quatro casosPorto continua240 e capacidadejunho153; a comparação de competências incompatíveis saiu dos operandos, sem apagar os valores originais. Auditoria identifica o controle externo indisponível;42guardas de conservação e integridade nova continuam efetivas.

Comparação por empreendimento dos cinco casos2T2026 confirmou: nenhum estoque, venda líquida, ticket, área média, preço/m² ou VGVfinal alterado. Único VGVlançado alterado: Solaris10,602→5,301milhões, efeito das três cópias removidas no lançamento. A referência de três cidades manteve todos esses campos e quantidades. Dimensões de oferta usam a fotografia compatível, em vez de misturar dormitórios do lançamento com capacidade atual.

Uma tentativa intermediária de ordenar IDs tipológicos alterava a escolha representativa de preços/VGV já existente. A comparação detectou o efeito e a ordenação entre IDs distintos foi preservada conforme fonte; nenhuma mudança desse tipo permanece na entrega. Não foi reescrita a política de preços para resolver a oferta.

### Regressão local — 4T2025

| Recorte | Projetos | Capacidade derivada | Estoque | Vendas líquidas | Falhas críticas |
|---|---:|---:|---:|---:|---:|
| Porto Alegre | 1.163 | 106.233 | 8.141 | 835 | 0 |
| Gramado + Canela | 317 | 10.342 | 2.092 | 456 | 0 |
| Gramado | 219 | 6.622 | 1.517 | 276 | 0 |
| Canela | 98 | 3.720 | 575 | 180 | 0 |
| Referência de três cidades | 263 | 35.020 | 3.992 | 709 | 0 |

Os dezmodelos passaram também pela função central `panoramaExportBlockReason`, que devolveu null. Isso comprova a decisão local de liberação, não a captura física de PDF/PPT ou o comportamento publicado. Nenhuma fotografia selecionada posterior ao corte. Controle cadastral independente indisponível não aparece como match: emPorto2T2026 todos1.204cadastros são posteriores à fotografia; no conjuntoGramado/Canela18não são comparáveis. Esses limites estão em CSV/avisos, e não são nova falha crítica encoberta.

Resumo pequeno versionado, com escopos, contagens e SHA-256 dos dezCSV: `EVIDENCIA_REPLAY_CONTRATOS_FIERGS_2026-10-27.json`. Brutos e comparações detalhadas permanecem ignorados. O modo `--verify-only` do script confere hashes, liberação central e comparação dos campos preservados sem refazer a geração. AuthZustand emNode informa storage indisponível; o script usa somente token fictício offline e não consulta/autentica em servidor.

### Verificações e estado dos portões

- Suíte focada:65testes/12arquivos aprovados; depois, auditoria ampliada de1para2testes aprovada e três testes de fonte repetidos após ajuste, total66testes distintos. Guardas negativas continuam bloqueando casos artificiais inconsistentes.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: aprovado. A inferência inicial do array de objetos de fonte foi explicitada como Record<string,unknown>[], removendo os dois erros locais detectados.
- ESLint dos11arquivos de produção alterados: aprovado; diff sem erros de whitespace. Sem build/suíte extensa/API real adicionais nesta execução.
- G0–G4 validados localmente nos recortes congelados. G5 e G6 pendentes. Preset integral de dez cidades não foi recoletado/reproduzido desta captura, que cobre o incidente e a referência de três cidades; entra no ensaio humano. Fonte nova com identidade/fotografia incompleta continuará bloqueada e deve retornar com seu CSV; não há liberação universal antecipada.

## Roteiro G5 — Gabriel, após autorização de envio/publicação

1. Conferir commits/divergência, autorizar envio e publicar no Lovable. Recarregar a página e gerar novamente; contrato/sessão/queryKey novos impedem reutilizar o modelo anterior.
2. FIERGS,RS,PortoAlegre,1T2021–2T2026. Conferir ausência do bloqueio; baixar PDF,PPTespelho eAuditoriaCSV da mesma geração. Capa/nome precisam indicar o recorte real, sem substituir por preset. Conferir tabelas de capacidade e os avisos do histórico; Miradero deve ter a base derivada e o cadastro separados no CSV.
3. FIERGS,RS,Gramado+Canela,mesmajanela. Baixar os três formatos. No CSV doSolaris, verificar três remoções equivalentes se a fonte ainda repetir, capacidade9 e original9; se o backend já corrigiu, zero remoções com o mesmo resultado. Nenhum conflito deve ser resolvido silenciosamente.
4. Gerar a referência Canoas+Esteio+SãoLeopoldo,1T2023–2T2026, e o preset integral homologado. Conferir que os campos anteriormente aceitos permanecem coerentes; dados novos na origem devem ser explicados por linhagem, não pelo gabarito fixo. Repetir preset/recortes prioritários em4T2025 para a regressão real. IndividuaisGramado/Canela se houver diferença no conjunto.
5. Na auditoria, conferir `history-identity-v1`, `period-capacity-v1`, classes de verificação, cidade/UF/janela/horário e resultado crítico; `unavailable` em controle externo incomparável é esperado e não se confunde com integridade ausente. Verificar que duplicatas não dobram VGV e que vendas negativas não foram ocultadas.
6. Trazer saídas com escopo/horário e todosCSV; armazenar em `.local-inputs/`, registrar hashes e conferir páginas/valores. Se houver bloqueio, trazer o CSV e recorte exato antes de forçar nova tentativa. Não marcar encerrado ou pedir aceite com exportação ainda não conferida.

## Rascunhos G6 — não enviados

## Complemento posterior — Miradero e alertas de consistência

Por solicitação de Gabriel, nova política de interface/exportação: botão Alertas abre modal, descreve ajustes e diferenças sem rótulos de confiabilidade ou aprovação. Resultados reconciliados baixam diretamente. Divergências numéricas remanescentes podem ser revistas no modal e o usuário pode continuar o download por formato/geração; resultado das guardas e auditoria permanecem intactos. Isso substitui o bloqueio numérico absoluto da etapa anterior por uma decisão explícita de exportação, não por um match artificial. Falha de coleta municipal/proveniência continua impedindo montar um recorte completo, sem bypass de cobertura.

Diagnóstico adicional solicitado antes do modal: duas consultas autenticadas individuais, somente leitura, HTTP200, `GET https://geobrain.com.br/public-api/building/63297` e `GET https://geobrain.com.br/public-api/building-with-history/63297`. Brutos/scripts ignorados em `.local-inputs/fiergs-incidente-20261027/miradero-probe/` e `miradero-probe.mjs`.

Fato novo: o cadastro Miradero informa36unidades e o histórico agregado informaestoque16 emago/2026, mas a única tipologia retornada,87033, informa18unidades/estoque8 na mesma competência. O endpointsemhistórico também devolve somente essa tipologia18/8 e total36. Portanto não se trata apenas de comparar junho com agosto: a resposta de agosto possui divergência interna de totais. Todas as39competências históricas retornadas contêm uma linha desse únicoID,qty18; junho contém18unidades/estoque8. Não há duplicata tipológica que o consumidor possa remover para obter36.

Hipóteses ainda não comprovadas: agregação do total multiplicada porJOIN, tipologia não exposta ou diferença de universo. O fator2 é pista, não prova de causaSQL. Nenhuma origem foi corrigida, nenhuma quantidade adicional imputada; mantém-se18derivado observado emjunho, total36separado e alerta nominal. Pedido técnico pronto aoEdgar: “No building63297, competênciaago/2026, total_units36 e total_stock16 contra única tipologia87033 comqty18/stock8 nos endpointsindividuais. Conferir agregação e cobertura das tipologias do mesmo mês; qual universo produz os totais?” Não enviado pelo agente.

Implementação: `report/consistency-alerts.ts` produz alertas nominais; `ReportConsistencyAlertsDialog.tsx` reutilizaDialog/Button padrão, seçõesajustes/consistência/avisos, rolagem e fechamentoEscape/foco. Barra deRelatório contémAlertas comcontagem; abaAvisos mantida. Confirmação decontinuação vale somente para ojob atual e não altera `reconciliation.homologable`. Host reconfere cobertura com a decisão atual e distingue novas tentativas peloAbortSignal; cancelamento não reutiliza aceite nem deixa jobantigo avançar. Alertas não são inseridos nos slides/PDF/PPT.

Validação local:35testes distintos entre modal/barra/guardas/referências/chave deexportação; fluxo real da barra abre modal e inicia store ao continuar, sem renderizararquivo. Escape, fechamento, nomes/quantidades, confirmação por job, preservação da reconciliação e impossibilidade decontornar cobertura aprovados. Lintsem erros, trêsavisosFastRefreshpreexistentes doReportPaginator. Sem ensaio visual em navegador ou capturaPDF/PPT nesta fatia; validação do modal físico/teclado/foco no site integraG5. Outros motores e alterações paralelas preservados. Esta política posterior prevalece sobre o texto anterior que exigia resolver toda divergência numérica antes de qualquer download.

## Rascunhos G6 — não enviados (continuação)

### Andamento, se necessário antes do teste publicado

Oi, Juliana e Teresa!

Identificamos duplicações no histórico e diferenças entre competências que afetavam os novos recortes. Os ajustes já passaram pelas verificações locais; vamos conferir as exportações de Porto Alegre e Gramado + Canela antes de enviar a nova versão.

Atenciosamente,

### Após G5 aprovado — adaptar aos arquivos efetivamente conferidos

Oi, Juliana e Teresa!

Ajustamos o tratamento do histórico, removendo duplicações e alinhando as quantidades à competência analisada. Seguem as versões de Porto Alegre e Gramado + Canela, de1T2021a2T2026, para sua conferência.

Ficamos à disposição para novos ajustes.

Atenciosamente,

Ressalva a incluir no envio dePortoAlegre se o achado permanecer na saída real: “No Miradero, o cadastro informa36unidades, enquanto o histórico tipológico da competência informa18. O estudo utiliza essa base observada, e a diferença permanece identificada na auditoria e em verificação na origem.” Não afirmar que a base doGeobrain foi corrigida nem que todos os novos recortes já foram aceitos. Evidência explícita de aceite das revisoras continua necessária.


### Refinamento posterior ? alertas por tipo (27/10)

A lista fornecida por Gabriel repetia 18 controles cadastrais sem competência compatível. O modal agora agrupa esses controles e outras ocorrências por tipo, com detalhes expansíveis; o botão conta grupos. Diverg?ncias, exclusões por classificação (29 na geração informada), valores negativos e omissões editoriais continuam explícitos. CSV/modelo/guardas intactos. Onze testes focados aprovados, incluindo preservação de cada controle e separação entre ajustes e inconsist?ncias. Publica??o autorizada; verifica??o da nova apresentação no site pendente.


## 10/11/2026 — São Leopoldo: reabertura da paridade com o Geobrain

**Estado:** mapeamento reproduzido localmente, sem correção do produto ou aceite externo. Gabriel determinou não responder o e-mail até resolver. [Matriz numérica, verificações e hashes](EVIDENCIA_PARIDADE_GEOBRAIN_SAO_LEOPOLDO_2026-11-10.json). Dados de entrada atuais não são snapshot da geração do arquivo recebido. Insumos/scripts/pacote mínimo de perguntas em `.local-inputs/fiergs-sao-leopoldo-2026-11-10/`.

### Causas confirmadas, sem culpar a API pelo processamento

1. **Oferta Lançada e universo:** a janela1T2020–3T2026 reproduz exatamente32projetos/4.591unidades do relatório: Compacto220, Econômico3.359, Standard992, Médio20; tipologias296/4.048/247. No mesmo histórico, status **Ativo por planta no fechamento**, sem restringir data original, reproduz integralmente o Geobrain:220/1.918/735/50=2.923 e tipologias260/2.374/289. Delta1.668=1.441Econômico inativo najanela+297Standard inativo najanela−40Standard ativo anterior àjanela−30Médio ativo anterior àjanela. Logo não era somente remover esgotados: também havia ativo anterior àjanela excluído da Oferta Lançada da seção de mercado. Estoque positivo não é sinônimo de statusAtivo: há plantasAtivas momentaneamente semestoque. As séries históricas de lançamentos não devem perder esgotados nem mudar retrospectivamente para o universo ativo.
2. **Vendas e oferta anterior:** APIe histórico têm202vendas em agosto+168emsetembro=370no trimestre. `reconcileFiergsClosingSales` troca o fluxo pelo `soldUnits` do cubo, que usa `latestEntries` (últimomês). A lâmina porárea reproduz696/891/480/168/14,2857%, enquanto fatos porplanta reproduzem **todas as faixas** do Geobrain e totais781/891/480/370/29,3418%. Oferta anterior deve vir da fotografia anterior porID; não reconstruir de um fluxo incompleto nem usar piso emzero para esconder quebra de balanço. Guardar identidade781+480−370=891. Mensagens históricas que chamavam todas as observações mensais de fotografias acumuladas não autorizam descartar o fluxo deste caso; provar semântica/cadência nos controles anteriores antes de generalizar.
3. **Área e negativos:** o cubo agrupa plantas distintas por dormitórios antes de escolher área/preço. ExemploAllegro83637: duas plantas2dormitórios com65,60e58,14m² eestoques6e18. Herdar aprimeiraárea distribui unidades nafaixaerrada. Calcular cada fato porplanta antesdeagrupar. Geobrain tem−1venda/IVV−5% em100–150m²; o código local desloca a venda para151–200m² e suprime IVVnegativo. Negativo é observado; a fórmula líquida−1/20×100=−5%, sem zerar nem excluir a linha. A regra local de suprimir taxa negativa conflita com a referência e precisa ser reconciliada explicitamente no contrato de IVV.
4. **Preço, ticket e área:** `cube.ts` soma estoques das plantas da mesma tipologia, mas retém primeiropreço/área via`??`; depois pondera peloestoque somado. Além disso, `aggregations.ts` usa estoque/fallbackquantidade e inclui Garden/Cobertura. Os endpoints atuais são reproduzidos por plantas **Padrão, estoque>0**, ticketΣ(qty×price)/Σqty e preço-m²Σ(qty×price)/Σ(qty×private_area). Não equivale à média dos preços/m² nem ponderação por estoque. Reproduzimos todos os11grupos atuais disponíveis:4padrõesverticais,3tipologiasverticais e4gruposhorizontais. Total de ticket335.505,2775 também coincide com o print. Preço geral e área geral ainda não foram conciliados ao print, conforme lacunas abaixo; não escolher fórmula para forçar coincidência.
5. **Série e média anual:** `reconcileClosingPrice` substitui o pontovertical final pelo preço do cubo, propagando a média inadequada à série temporal. A faixa anual do`ReportPaginator` calcula`row.total` (agregado dos segmentos), embora as barras sejam verticais; mistura universos no título “residencial vertical”, além de preservar`total` anterior àsubstituição do fechamento. Corrigir por contrato de série/segmento/competência, mantendo ausência comoausência. Esta incompatibilidade é confirmada por código; não pretendemos decompor cada valor anual dos prints sem o payload original.
6. **Horizontal:**25projetos recebidos,16aceitos/9rejeitados; o cubo mantém603unidades deestoque contra729observadas. As126excluídas são120BuritiGardenPremium89337+5LeSei75795+1LasRocas16842. LeSei tem`work=Condomínio de Casas/Sobrados`, campo explícito ignorado pelo classificador: correção do adaptador, sem exceção porID. Buriti/LasRocas têm`work=Standard/Médio`, sem subtipo inequívoco; precisam fonte autoritativa, não inferência pelo nome. Há seis esgotados rejeitados adicionais que podem afetar histórico. Não chamar grupos socioeconômicos de produtos sem provar a classificação. Loteamentos e condomínios mantêm contratos distintos, e Secovi continua com seu universo próprio.

### Lacunas reais para o provedor e o snapshot original

- Print mostra Econômico5.577/m² e2dormitórios5.965/m²; aAPIatual retorna5.564,0214 e6.025,4323, ambos reproduzidos das plantas. Não há prova de atualização, nem autorização para chamar a API de errada: exigir resposta/exportação datada e filtros da comparação. O relatório também tem valores granulares que diferem do replay atual, sem snapshot para atribuir todos os deltas históricos porID.
- Total6.603/m²/área48m² não foi reproduzido. Agregar globalmente as plantas usadas na regra degrupo dá6.742,5344/m² e49,7595m²; o ticket335.505,2775 coincide. Solicitar fórmula e denominadores do total no Geobrain; não somar ou tirar média das médias dos grupos.
- Contrato/campo estável de produto dos horizontais89337/16842 e dos rejeitados históricos. JSONmínimo com campos eURLs exatas preparado localmente, sem segredos. Só a ausência deste campo pode exigir aprimoramento dafonte; LeSei é corrigível localmente. Prints específicos do horizontal não vieram nesta rodada; há diagnósticoAPI×cubo, sem afirmar coincidência com imagens não recebidas.

### Verificação e sequência de implementação

Oito chamadas delimitadas deSãoLeopoldo: quatro iniciais+quatro complementares, HTTP200/páginaúnica, sem outras cidades ou estudo real. Históricos de90projetos/177plantas: nenhuma duplicata ou conflito nesta amostra. O diagnóstico executou81asserçõesoffline, todas aprovadas, sobre oferta ativa, decomposição deuniversos,10faixas, fluxos/estoque e11gruposdepreço. Não é regressão de implementação; runtime inalterado.

Próximo: camada atômica compartilhada porID/competência, com lançamento original/capacidade histórica/ofertaativa separados; fluxo trimestral independente de fotografias, preços por contribuições primitivas e universo documentado; classificador lê campos autoritativos; tabela/gráfico/CSV/territórios usam os mesmos seletores. Preservar nulos/zeros/negativos/deduplicação/futuro e políticas porentidade. Portões: reconciliação deSãoLeopoldo, fechar lacunas deorigem/total, regressõesoffline2T2026/4T2025 e recortes livres, depois ensaio realPDF/PPT/CSV no site, sem antecipar homologação. Não alterar números, criar exceções municipais, “ajustar” pesos até bater ou filtrar esgotados das séries históricas.

Git profissional GabeBrain/keyring verificado; fetch mostrou9commits remotosSP/Fortaleza,0locais, semdiferença no códigoPanorama analisado. Árvoreparalela preservada; não houve merge/push/publicação nesta etapa. A integração permanece dependente de autorização por estar suja.


## 10/11/2026 — Implementação da paridade e verificação para publicação

**Estado atual:** ajustes implementados e validados offline; push autorizado por Gabriel. Publicação no Lovable, geração no site e aceite externo continuam distintos e pendentes. O e-mail não foi enviado. Esta seção substitui o estado de “diagnóstico sem implementação” da seção anterior; a origem e as constatações anteriores permanecem rastreáveis.

### Contrato aplicado

- `market-observations.ts` mantém fatos primitivos por planta e competência. `CubeProject.launchedUnits` e `historyAudit` continuam preservando capacidade histórica e lançamento original; uma visão separada calcula oferta ativa, sem substituir os fluxos de lançamentos pela população atual. Status Ativo com estoque momentaneamente zero continua na oferta ativa. Status desconhecido não vira zero.
- `cube.ts` calcula vendas trimestrais a partir das observações deduplicadas, mantendo zeros e distratos. Fotografias anteriores e finais são independentes e não somam meses. Geometria e preços não são reduzidos ao primeiro exemplar de dormitórios.
- **Achado adicional comprovado:** pré-vendas de plantas com status explícito Futuro reaparecem no ingresso em comercialização. Porto Alegre tinha5 dessas unidades em2T2026 e172 em4T2025. Removê-las apenas dos indicadores de mercado comercializado, sem apagar observações, fecha os controles de estoque e fluxo. A regra é por status observado, sem exceção municipal ou temporal. No lançamento do trimestre, a oferta anterior de mercado é zero, mesmo havendo cadastro Futuro anterior; não somar esse cadastro ao lançamento.
- `aggregations.ts` e os seletores usam plantas antes de agrupar por área, padrão ou dormitórios. Preços FIERGS identificados: plantas Padrão com estoque positivo, ticket por quantidade e R$/m² pela razão entre valor e área ponderados. A série inteira é recalculada por competência com os mesmos denominadores, inclusive para grupos de cidades; não há média de médias municipais. O agregador foi otimizado por buckets e snapshots em memória, sem novas chamadas.
- Tabelas por produto, coortes, maturidade, matriz de área, faixas de preço, narrativa e marcadores de preço consomem as bases adequadas. A seção de mercado usa oferta ativa; VGV/lançamentos da janela mantêm seu contrato separado e seus rótulos explícitos. Marcador sem preço elegível é omitido no mapa de preço e registrado nos avisos; zero observado não é apagado.
- IVV por área mantém valores líquidos negativos sobre base observada positiva; oferta anterior ausente não é reconstruída por identidade nem preenchida com zero. No fechamento agregado, base granular anterior completa prevalece; sem ela, permanece a fonte temporal com aviso de cobertura. O balanço de estoque/fluxo é um controle independente adicional, sem remover ou afrouxar guardas existentes.
- O adaptador lê o produto explícito em `work`, preservando os filtros de cada entidade e as exclusões autoritativas. Le Sei é recuperado por esse campo, sem regra por ID. Buriti Garden Premium e Las Rocas permanecem sem classificação autoritativa:121 unidades de estoque observadas fora dos produtos classificados; oito rejeitados incluem seis esgotados históricos. Quantidades e rótulos brutos dessas rejeições agora constam nos avisos e no CSV.
- Metodologia/Fórmulas/Avisos/Auditoria descrevem o contrato. CSV inclui observações primitivas e status, sem segredos ou imputações; cache do relatório foi versionado para não reaproveitar modelo antigo. Secovi conserva sua política numérica; o suporte a campo explícito de produto não libera loteamentos em Secovi.

### Verificação

São Leopoldo3T2026, com as oito respostas reais já congeladas: oferta ativa**2.923**, estoque**891**, vendas trimestrais**370**, oferta anterior**781**, lançamentos do trimestre**480**, IVV**29,3418%**; todas as dez faixas de área e as aberturas de oferta por padrão/tipologia conferidas. O balanço781+480−370=891 fecha. Tabelas de preço e série final compartilham os mesmos valores; total da fórmula demonstrada é6742,5344/m², ticket335505,2775 e área49,7595m². São valores calculados, não constantes do runtime.

Onze replays offline: Porto Alegre, Gramado, Canela, conjunto Gramado+Canela e Canoas+Esteio+São Leopoldo em2T2026/4T2025; controle exato Canela+Gramado em3T2026. **Zero divergências críticas e zero diferenças no controle independente de estoque/fluxo nos11casos.** As comparações cadastrais independentes sem competência compatível permanecem indisponíveis, não são falsamente homologadas. Verificador da otimização confirma equivalência das séries de preço antes/depois da alteração de desempenho. O tipo “homologable” do modelo é guarda interna, não aceite de Juliana/Finoti.

Suíte da feature: **478 testes aprovados, dois opcionais preexistentes ignorados;14 testes novos de contrato.** Tipos e build aprovados; lint sem erros, com avisos FastRefresh já existentes. Os testes que inicialmente apontaram legenda antiga e termo de produto indevido no texto Secovi foram corrigidos sem alterar suas exclusões. O teste adicional cobre pré-lançamento Futuro e a ausência de fotografia anterior de uma planta que não pode ser escondida pela cobertura de outra.

Extrato interno de13lâminas gerado pelo código do produto em PDF/PPT, sem novas consultas. Navegador local sem erros; PDF16:9 conferido; PowerPoint abriu13lâminas com zero objetos fora da página. Edição de cabeçalho nativo de tabela salva e reaberta numa cópia descartável, sem modificar o arquivo original ou os números. A faixa amarela que deslocava sob o subtítulo no PPT foi ancorada na geometria real do DOM, mantendo gráficos em imagem e textos/células editáveis. Arquivo de teste de edição está claramente identificado “NAO-ENVIAR”.

Artefatos: `.local-inputs/fiergs-sao-leopoldo-2026-11-10/`; `implemented-summary.json`, `implemented-audit.csv`, `regressions/summary.json`, `regressions/verified-current.json`, logs, extrato PDF/PPT, PNGs Office e provas de edição. A matriz versionada ligada acima traz números, controles e hashes.

### Ressalvas para a resposta e próximo ensaio

1. Ainda falta comprovar a fórmula do total**6.603/m² e48m²** dos prints. A fórmula demonstrada nas plantas atuais resulta**6.743/m² e50m²** após arredondamento. Não foram alterados pesos para forçar coincidência.
2. Econômico**5.577** e2dormitórios**5.965** nas capturas diferem da API atual**5.564/6.025**, que é reproduzida pelo motor corrigido. Sem payload datado original não atribuir a diferença a atualização, rota ou falha específica da API.
3. Campo autoritativo de produto dos dois horizontais ativos pendentes. O estoque excluído é explícito; não afirmar que todo o horizontal coincide com o Geobrain.

Publicar no Lovable após o push e gerar São Leopoldo,1T2020–3T2026, com CSV/PDF/PPT. Conferir oferta/vendas/faixas e preços, os121deestoque em classificação, e repetir um recorte anterior. A resposta deve anunciar correções comprovadas e essas ressalvas; não declarar homologação encerrada. Nenhuma mensagem externa foi enviada pelo agente.
