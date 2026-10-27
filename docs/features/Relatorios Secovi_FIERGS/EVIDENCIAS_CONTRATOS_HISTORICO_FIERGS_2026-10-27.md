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
