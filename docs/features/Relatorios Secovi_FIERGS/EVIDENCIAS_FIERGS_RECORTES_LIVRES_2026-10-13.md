# Evidências — FIERGS recortes livres — 13/10/2026

## G0 — baseline congelada

- Base `74cc572`, main; fetch de origin confirmado. Zero atrás/três à frente, commits preexistentes Corretor `f5eff70`, `bb3326d`, `74cc572`, preservados. Insumos/plano/mapeamento locais desta frente classificados como documentação versionável.
- Modelo aceita lista de municípios; guarda municipal depende indevidamente da comparação visual. A identidade territorial passará a distinguir conjunto oficial exato de personalizado pela UF e cidades normalizadas.
- Baseline: 286 testes aprovados e uma falha preexistente em `report-reference-panels.test.tsx`, expectativa de cabeçalho `Lançada` obsoleta após o ajuste aceito da oferta da janela. Comando `npx.cmd vitest run src/features/panorama-secovi-fiergs`; nenhuma API/PDF acionada.
- Histórico de evidências 2T2026/4T2025 localizado em `.tmp/fiergs-prehomologacao-fase2-*.json`, auditorias/regressões e testes versionados. As evidências históricas não são payload completo reproduzível da base atual; regressão local usa fixtures sintéticas identificadas como tal. Ensaio real será de Gabriel no G5.
- Exportação corrente deriva do manifesto; busca não encontrou importador ativo de `pdf-print-interceptor.ts`. Preservar esse caminho inativo.

## G1 — identidade e seleção (validado localmente)

Contrato central em `scope-identity.ts`: modo/preset, UF, nomes completos, rótulos, chave territorial e slug determinístico. Outros estados autorizados são permitidos, uma UF por estudo. Seleção depende de autorização de todos os municípios, mantendo atalho regional.

Quatro testes de identidade/autorização aprovados. UF/cidade bloqueadas somente durante coleta/carregamento; troca de UF limpa cidades e sessão; alterações de recorte/período invalidam submissão. Tokens SE v0.1 copiados, raio/foco limitados aos controles, sem redesign do deck. Testes de interface e revisão TypeScript integram G4; não há geração/site verificados neste portão.

## G2 — reconciliação (validado localmente)

Agregados municipais preservados para N=1, separados do sinal visual `enabled`. Ausência de segmento/janela só admite contagem zero quando todas as cidades estão no cubo; dados nulos de empreendimentos existentes continuam indisponíveis. Resposta vazia de API não foi reclassificada como sucesso: falta evidência de contrato para relaxar coleta.

43 testes locais aprovados (modelo, guardas existentes, recortes sintéticos), incluindo períodos 2T2026 e 4T2025. Matriz sintética, por período: cidade Canoas/vertical V = lançadas 100, final 30, vendas 5; municipal 5 × canônico 5, delta 0. Horizontal ausente confirmado = 0 × 0. Preset dez cidades com um V e um H por cidade = 20 projetos, vertical lançado 1.000, horizontal lançado 500, vendas verticais 50, todas as guardas match. Janela vazia com projetos de 2022 preserva estoque histórico e reconcilia lançamentos zero. Venda -2 e estoque 0 preservados. Cidade Esteio faltante mantém bloqueio; dimensão tipológica retirada de projeto presente continua indisponível.

Esses números pertencem à fixture versionada e não à base real da Juliana. Portão numérico local aprovado antes da edição dos slides. Commit G1 `9a04d06`.

## G3 — apresentação (validado localmente)

Capa 2/título e territorial 7 derivados da identidade; mapa regional somente no conjunto oficial. Sobre o estudo 5 usa quantidade real e produtos aceitos. Legendas trimestrais e metodologia usam UF/cidades efetivas. Ranking 31 omitido em cidade única; bairro 19 preservado. Sem segmento horizontal confirmado, 62–66 saem; sem vertical confirmado, suas seções saem; divisores órfãos removidos. Todos os slides omitidos registrados em avisos/CSV.

Listas territoriais paginadas a cada 18 cidades; distribuições municipais a cada dez, mantendo o denominador global. Teste de 23 cidades comprova cobertura completa dos IDs 7/19/31. Institucionais gerais e equipe mantidos sem inventar autoria local. Mapas seguem coordenadas reais do cubo e avisam cobertura parcial. Caminhos alternativos sem texto regional indevido.

20 casos de manifesto/referências/renderização aprovados após atualização das expectativas de cidade única por ID oficial. Revisão React: primitives existentes, handlers preservam cancelamento e contexto, sem novo fetch; conjuntos e lookup de coordenadas derivados localmente. DOM de teste não comprova enquadramento visual real; revisão PDF/browser será G5. TypeScript global encontrou apenas erros de fixture preexistente do Corretor em `structure-empty-sections.test.ts`; arquivo não alterado por esta entrega. Commit G2 `21147bc`; commit paralelo Corretor `47107b2` apareceu durante a execução e foi preservado.

## G4 — arquivos, auditoria e regressão (validado localmente)

- Preset exato conserva `panorama-fiergs-rs-2T2026.pdf` e `auditoria-fiergs-2t2026.csv`. Cidade única: exemplo `panorama-fiergs-pr-curitiba-1T2023-2T2026.pdf`; PPT usa mesma identidade. Conjunto maior usa prefixo municipal, quantidade e identificador estável do conjunto completo para não colidir pelo prefixo. Ordem das cidades não muda o nome.
- CSV acrescenta registro de escopo e contexto em todas as linhas: geração, UF, modo, preset, cidades, início/fim. Rejeições e omissões continuam presentes. Rótulos desconhecidos geram aviso, sem nova heurística ou alteração da política aceita; a auditoria histórica (2) contém 131 rejeições por subtipo indefinido, portanto esses itens não foram reclassificados nem silenciosamente adicionados.
- UI testada localmente com mocks do catálogo/API: preset → cidade única → conjunto → preset; troca RS→PR limpa seleção; seleção parcialmente não autorizada não chama coleta; resultado anterior desaparece e sessão é substituída. Isso não prova disponibilidade real de Curitiba no token de Gabriel.
- `npx.cmd vitest run src/features/panorama-secovi-fiergs --silent`: **38 arquivos, 313 testes aprovados**. Inclui contratos Secovi, guardas FIERGS, regressões sintéticas 2T2026/4T2025, zero/negativo, sem horizontal/vertical, janela vazia, cidade faltante, produto desconhecido e mapas sem coordenadas. Nenhuma chamada à API real ou estudo gerado nesta sessão.
- `npx.cmd tsc --noEmit -p .local-inputs/fiergs-recortes-livres/tsconfig.json`: aprovado; configuração local estende app, inclui a feature e tipos jest-dom. `npx.cmd tsc --noEmit -p tsconfig.app.json`: falha externa, fixtures `IrSlide` incompletas em `src/features/corretor/lib/audit/__tests__/structure-empty-sections.test.ts`, já presentes em `f5eff70` e preservadas. Não declarar typecheck global aprovado.
- `npm.cmd run build`: aprovado, Vite em 20,24 s; warnings existentes de Browserslist, chunks grandes e xlsx com import estático/dinâmico. O `tsc` desse script usa o tsconfig raiz de referências e não substitui a checagem app acima.
- Tokens SE copiados sem alteração, SHA-256 origem/cópia `0802b707b8c511e3367b1e4a235cea6a268edb9ac8f217a2beb965fc30874eac`. Revisão React influenciou a associação label/trigger, handlers de invalidação e uso de Set para cobertura dos mapas. Tema/claro/escuro e layout real não verificados em browser; G5 permanece pendente.
- Commit editorial G3 `a552cba`. G4 será commit isolado de exportação, auditoria, testes e fechamento documental. Checagem de docs vivos registrada após commit.

## G5/G6 — pendentes

### Ensaio recebido — capas a refinar

Gabriel trouxe três PDFs (preset 69 páginas, Canoas 68, conjunto 69) e um CSV do conjunto. Revisão visual de todas as páginas por miniaturas e ampliação dos pontos suspeitos; CSV do conjunto fecha 42 guardas, 265 projetos e três cidades concluídas. Os CSVs do preset/Canoas não foram recebidos. Capas personalizadas desequilibradas e placeholder sem preço de 4 dormitórios em Canoas impediram encerrar revisão editorial. [Plano e execução do refinamento](PLAN_REFINAMENTO_CAPAS_CUSTOMIZADAS_FIERGS_2026-10-13.md): ajustes locais, 327 testes e 81 verificações Chromium; publicação e nova saída ainda pendentes. Não declarar G5 integralmente concluído por apenas um CSV.

### Continuação — publicação autorizada

Gabriel autorizou nesta conversa o envio dos oito commits listados no fechamento, incluindo os quatro do Corretor. Novo fetch confirmou 0/8 e documentação compatível; árvore limpa. Código da ampliação em `e634eb8`. Esta rodada inclui um commit documental de registro da autorização e roteiro G5; envio sem rebase/force e confirmação posterior pela comparação main/origin. Deploy e geração reais permanecem a verificar.

Ensaio de Gabriel: após publicar/atualizar o site, usar modelo FIERGS, RS, janela 1T2023–2T2026, e gerar PDF + Auditoria CSV de (1) preset FIERGS RS completo, (2) Canoas isolada, (3) Canoas + Esteio + São Leopoldo, desde que disponíveis no catálogo. O preset deve manter capa/mapa regional; os dois personalizados devem identificar recorte/UF, sem mapa das dez cidades. Conferir download liberado, avisos e nomes distintos. Guardar os insumos novos em `.local-inputs/fiergs-recortes-livres/` e informar caminhos para análise. Não há novo aceite ou e-mail nesta rodada.

Fechamento: `npm.cmd run check:live-docs -- origin/main HEAD` aprovado. Fetch final confirmou `0/8`: quatro commits FIERGS (seleção, reconciliação, apresentação e exportação/regressão), quatro Corretor (`f5eff70`, `bb3326d`, `74cc572`, `47107b2`). Árvore do repositório limpa no fechamento; nenhum commit FIERGS contém alteração em Corretor ou Sinduscon. Push da main enviaria também os commits paralelos; autorização ainda não recebida.

Sem push/deploy/e-mail. Antes de publicar, apresentar os commits paralelos na main e pedir autorização sobre o histórico a enviar. Após publicação autorizada, Gabriel gera preset, cidade isolada e conjunto com auditorias para conferir dados/arte; só depois anunciar a capacidade à Juliana. O aceite anterior permanece encerrado.
