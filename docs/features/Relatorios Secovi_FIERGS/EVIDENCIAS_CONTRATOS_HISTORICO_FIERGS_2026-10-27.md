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

Validação e matriz finais serão completadas após as últimas verificações. G5(publicação/ensaio do site) e G6(aceite) não estão aprovados por testes locais.
