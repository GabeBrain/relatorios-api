# FIERGS — diagnóstico do bloqueio em novos recortes — 27/10/2026

Estado: diagnóstico reproduzido com API real e proposta preparada. Nenhuma alteração no motor, integração remota, push ou publicação. PDF/PPT no navegador ainda não verificados. O aceite anterior não homologa os novos recortes.

## Conclusão

Porto Alegre e Gramado + Canela falham na mesma guarda crítica: `residual.vertical.typology.launched.negative`, mas por causas diferentes. Gramado traz duplicatas idênticas de histórico; Porto Alegre combina o total cadastral atual com quantidades tipológicas do lançamento original, anteriores a revisões registradas na própria fonte. Canela isolada e o conjunto de referência passam nas 42 guardas.

Não houve falha de coleta nesta reprodução: 150 respostas de dados HTTP 200 e cidades concluídas na primeira tentativa. Isso não prova disponibilidade em 26/10 nem substitui os CSV originais daquele incidente, não fornecidos. Retentar a mesma fonte não elimina as inconsistências reproduzidas.

## Método e comparação

Executado o mesmo `fetchPanoramaReportModel` usado pela tela, com entidade `fiergs-rs`, motor v4 e o mesmo `buildFiergsAuditCsv` do botão Auditoria CSV. Autenticação local sem expor credenciais. Respostas de negócio congeladas, sem login nem cabeçalhos secretos. A reprodução foi pelo motor/HTTP, sem automatizar o navegador publicado.

| Recorte | Janela | Execução | Projetos | Guardas aprovadas | Delta crítico |
|---|---|---|---:|---:|---:|
| Porto Alegre | 1T2021–2T2026 | API real | 1.204 | 41/42 | 87 |
| Gramado + Canela | 1T2021–2T2026 | API real | 328 | 41/42 | 9 |
| Gramado | 1T2021–2T2026 | Reexecução das respostas congeladas | 226 | 41/42 | 9 |
| Canela | 1T2021–2T2026 | Reexecução das respostas congeladas | 102 | 42/42 | 0 |
| Canoas + Esteio + São Leopoldo | 1T2023–2T2026 | API real, recorte anteriormente validado | 266 | 42/42 | 0 |

O delta mede excesso tipológico por empreendimento: esperado zero, tolerância zero, crítico. Não significa que o total agregado exibido esteja necessariamente excedido na mesma quantidade: compensações residuais podem fechar totais gerais sem resolver a inconsistência por empreendimento. A guarda está correta em impedir essa compensação silenciosa.

O recorte de referência tinha 265 projetos na evidência anterior e retornou 266 agora; a fonte evolui. Não se presume igualdade de todos os valores entre as datas.

## Gramado — causa confirmada

Empreendimento Solaris, `building_id=73632`, lançamento julho/2024, total cadastral 9. O histórico desse mês devolve seis linhas, mas apenas três conteúdos distintos; cada linha aparece duas vezes, com igualdade de todo o objeto JSON:

| Tipologia | Dormitórios | Área | Quantidade por linha | Ocorrências |
|---|---:|---:|---:|---:|
| 109859 | 2 | 56,89 | 3 | 2 |
| 109860 | 2 | 59,20 | 3 | 2 |
| 109861 | 2 | 67,11 | 3 | 2 |

O cubo soma 18 contra 9, gerando o excesso 9. As três áreas são tipologias legítimas diferentes e devem permanecer; a repetição exata de cada uma é o problema.

Experimento controlado, exclusivamente em cópias das respostas congeladas: remover somente repetições JSON idênticas faz Gramado + Canela passar de 41/42 para 42/42. Os mesmos filtros não resolvem Porto Alegre, que mantém delta 87. Nenhum arquivo de fonte, banco, API ou código de produto foi alterado pelo experimento.

## Porto Alegre — causa confirmada

`domain/cube.ts` prefere `building.total_units` para a quantidade do empreendimento, mas soma `qty` das linhas do mês original de lançamento para a quantidade tipológica. Quatro projetos possuem revisões posteriores de quantidade, sem duplicatas JSON idênticas responsáveis pelo excesso:

| Empreendimento | ID | Lançamento | Cadastro usado pelo motor | Tipologias no lançamento | Excesso | Tipologias em jun/2026 |
|---|---:|---|---:|---:|---:|---:|
| Qu4Tro Estações | 6883 | jul/2014 | 48 | 68 | 20 | 48 |
| Bela Vista Square Park | 6856 | mar/2016 | 19 | 23 | 4 | 19 |
| Own Connected Home | 6871 | mar/2016 | 70 | 127 | 57 | 70 |
| Pateo Augusta | 6775 | mar/2016 | 16 | 22 | 6 | 16 |
| Total | — | — | 153 | 240 | 87 | 153 |

Transições observadas: Qu4Tro 68 → 24 em dez/2016 → 48 em abr/2017; Bela Vista 23 → 19 em dez/2016; Own 127 → 70 em dez/2016 → 74 em fev/2017 → 70 em jun/2018; Pateo 22 → 16 em nov/2016. Todos os quatro têm estoque/vendas atuais zero na resposta usada.

O cadastro de topo informa período ago/2026 e atualização set/2026. A igualdade com as tipologias de jun/2026 nestes quatro casos está comprovada, mas não autoriza tratar qualquer cadastro atual como uma fotografia de junho. Também não foi demonstrado o motivo operacional das revisões; não se atribui erro ao analista ou à API por inferência.

Embora anteriores à janela selecionada, esses empreendimentos compõem o cubo histórico e denominadores de disponibilidade/mercado atual. Excluí-los por data ou tolerar o residual eliminaria a proteção sem resolver a mistura temporal.

## Proposta de resolução e portões

### G0 — congelar e explicar (concluído nesta sessão)

Escopos, respostas, CSV, matriz por empreendimento/tipologia/período e comparação de referência registrados. Originais preservados; nenhuma liberação artificial de exportação.

### G1 — normalizar duplicatas com identidade e linhagem

Deduplicar linhas históricas semanticamente idênticas dentro de empreendimento, tipologia, período e contexto necessário. Preservar áreas/tipologias distintas e vendas negativas. Mesma identidade com conteúdos divergentes deve ser conflito explícito, nunca seleção silenciosa da primeira linha. Registrar quantidade de duplicatas removidas, origem e conflitos na auditoria. Aplicação genérica, sem IDs ou municípios fixos.

### G2 — separar bases temporais antes de alterar indicadores

Separar fluxo do lançamento original, capacidade/oferta histórica válida no fechamento e estoque/vendas do fechamento. Nas análises de mercado atual, total e distribuição tipológica devem vir da mesma fotografia válida até o fechamento; manter a semântica do lançamento original separada. Documentar qual campo e qual fotografia alimentam cada indicador antes de mudar consumidores.

O histórico oferece fotografias compatíveis em jun/2026 para os quatro casos: a correção é viável sem editar números. Ainda exige implementar a seleção temporal e sua linhagem, não apenas trocar a soma. Se faltar fotografia compatível ou houver conflito, manter a inconsistência explícita e a proteção adequada. Não usar máximo, rateio, truncamento, tolerância ampliada ou exceção por período/município.

Revisar efeitos em oferta por tipologia/padrão, maturidade, disponibilidade, preços e VGV. Não basta fazer `homologable=true`: cada denominador precisa conservar o universo correto.

### G3 — testes e reexecuções congeladas

Cobrir duplicata exata, conflito de identidade, mesma quantidade de dormitórios com áreas diferentes, revisões tipológicas, cadastro posterior ao corte, fotografia ausente, zeros/nulos e vendas negativas. Reexecutar os cinco casos congelados; preservar regressões FIERGS 2T2026/4T2025 e política Secovi. Testes focados antes de nova coleta longa.

### G4 — geração/exportação e publicação autorizada

Após implementação aprovada, conferir CSV sem invariantes críticas abertas e PDF/PPT dos casos afetados e referência, incluindo botão de exportação e conteúdo. Não realizado nesta etapa de diagnóstico. Conferir divergência antes de integração/push, pedir autorização e só então publicar. Novo aceite humano de Juliana permanece necessário; aprovação anterior não cobre automaticamente os novos recortes.

## Arquivos envolvidos e evidências

Pontos de implementação propostos, ainda inalterados: `api.ts`, `domain/cube.ts`, `domain/reconciliation.ts`, `domain/aggregations.ts`, `report/model.ts` e auditoria/testes da feature. A guarda de excesso tipológico deve permanecer ativa; a normalização e a escolha temporal precisam antecedê-la.

Brutos locais ignorados: `.local-inputs/fiergs-incidente-20261027/`. Contém `reproduce.ts`, bundle local, `raw/`, `manifest.json`, `requests-live.json`, relatórios JSON, resumos, Auditorias CSV, rastreamento das linhas e evolução temporal. Reexecuções usam `--replay`; experimento de duplicatas exige `--experiment-exact-dedup` em modo replay. Não inclui autenticação nem credenciais nos registros.

SHA-256 dos CSV:

- Porto Alegre: `49a797107324e43088fa164ffc9fb239a5ffb8e9c5edf7288ae1140291946590`.
- Gramado + Canela: `ef55d21cc6a692503f1ae56533c77a61df7e0c4a6ba9479f57d2bab24698e435`.
- Gramado: `b1e69c9b249214c1573cd7ea186517d5a87049350b51043fc096f4881a0aca9c`.
- Canela: `636a2bbad44fba05e062c0f9d23710fec0de20eae1d4db09dc3b9ed8e4191c05`.
- Referência: `95e8c2e84edadfa2ab910ed1a7b29c687887c9231f8f0dced9996fdde5adb77e`.

Validações: `summarize.mjs` aprovou contagens, deltas, coletas, fotografias dos cinco empreendimentos e experimento de duplicatas. `npx.cmd vitest run src/features/panorama-secovi-fiergs/__tests__/reconciliation-guards.test.ts --silent`: 17 testes aprovados. Não houve build completo, suíte extensa nem geração PDF/PPT.

Git na abertura: main `622b34b`, origin/main com sete commits exclusivos e main com um exclusivo; fetch conferido. Nenhuma diferença remota no motor Panorama, transporte HTTP ou autenticação consultados. As mudanças remotas são de outras funcionalidades e não foram integradas. Alterações locais prévias FIERGS/estimativas/LIVE/Corretor preservadas. Este documento não declara produção corrigida.
