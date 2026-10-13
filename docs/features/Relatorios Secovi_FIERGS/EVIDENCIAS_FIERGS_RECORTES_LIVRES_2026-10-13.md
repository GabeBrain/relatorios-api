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
