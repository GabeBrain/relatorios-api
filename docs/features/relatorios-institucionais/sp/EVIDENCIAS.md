# Evidências do mapeamento — 15/10/2026

## 29/10/2026 — correção após respostas reais: séries determinam disponibilidade

- **Respostas recebidas em29/10:** usuário executou consultas e forneceu raiz agosto e sete linhas/paginação completa por série de setembro: vendas8.912, lançamentos7.825, estoque126.307; estoque agosto127.372. Residual+22 e deltas por grupo−189/+312/+1.007/+81/−302/+119/−1.006. Causa dos resíduos e contrato exato de líquido não demonstrados. Sem consulta autenticada pelo agente.
- **Regressão:** fixture agregada `src/features/relatorios-institucionais/sp/__tests__/fixtures/sp-september-user-2026-10-29.json`, sem credenciais/dados individuais. Replay combina setembro/agosto atuais e outros meses antigos: prova do mecanismo, não baseline trimestral pareado. Original15/10 preservado; helper da parcial explicita o recorte até agosto.
- **Resultado:**120testes/10arquivos, tipos completos, lint e build aprovados. Casos de raiz agosto/ausente com setembro disponível, prefixo comum e aviso de fontes defasadas, lacunas intermediárias, paginação, duplicatas, valores inválidos, balanço diagnóstico e releitura divergente nos históricos. Nenhuma alteração Secovi/FIERGS.
- **Visual:** `node scripts/diagnostics/sp-dynamic-closure.mjs`: Edge local1440/390 claro/escuro, raiz fixa agosto e transições1/2/3meses, alerta22/estoque126.307 preservados, overlayBrain com tempo real/resposta lenta/cancelamento, erro/vazio. Zero errosJS,18amostras simuladas e zero chamadas reais. Capturas em `.local-inputs/relatorios-lucas/sp/dynamic-closure/`, revisadas na viewport de rolagem; menu móvel recolhido pelo controle existente. GeoApiScopeEngine, Table/Alert e BrainLoadingState reutilizados.
- **Limites:** não comprova produção, aceite, contagem granular nem fechamento oficial. [Decisão](DECISOES.md) separa disponibilidade e diagnóstico. Retestar no site após publicação com sessão pessoal. Diagnóstico antigo agora simula explicitamente fontes apenas até agosto.



## 29/10/2026 — fechamento dinâmico por nova geração

- **Validação 29/10:** 115 testes SP/10 arquivos, TypeScript explícito do app, lint dirigido e build final aprovados. Diagnóstico Edge headless local cobre 1440/390 px, claro/escuro, transições de um/dois/três meses, fonte vazia/erro e resposta lenta com overlay/cronômetro/cancelamento; zero erros JS e zero chamadas reais. Setembro sintético, sem alegação de disponibilidade real. Evidência local ignorada em `.local-inputs/relatorios-lucas/sp/dynamic-closure/`; reprodução por `node scripts/diagnostics/sp-dynamic-closure.mjs`.

- Contratos: estado `quarter-closed` somente após três meses consecutivos com fontes completas, grupos equivalentes e balanços zerados. Um/dois meses permanecem parciais. Fonte inválida não vira zero nem parcial silenciosa. Testes preservam bloqueios de período alterado entre consultas, cobertura granular, exportação e homologação. A opção aditiva `cache` no cliente HTTP é usada pelo SP com `no-store`; demais consumidores mantêm o comportamento anterior.
- Ensaio visual encontrou contêiner modal sem dimensão própria; corrigido para cobrir a viewport, mantendo foco no cancelamento e Escape. Capturas finais de série fechada/um mês e overlay revisadas. Menu móvel recolhido pelo controle existente durante o QA, sem modificar o shell.
- Ambiente: Windows, base `c62e41e`, identidade Git `Codex Test`, main inicialmente limpa/0–0 após fetch. Vitest inicialmente bloqueado no sandbox ao ler diretório ancestral; verificações executadas com escalonamento aprovado, sem alterar controles globais.
- Limite: controle do navegador pessoal interrompido por não reconhecer a URL com segurança. Sem leitura da sessão, API real ou produção. Em setembro do diagnóstico, cada padrão usa lançamentos10/vendas4/estoque anterior+6 somente para provar o fluxo; não representam números de mercado.


## Envio confirmado; runtime ainda antigo — 16/10/2026

Push `07ca8bb..00b5599` confirmado pelo Git, refs 0/0 e árvore limpa. Depois do envio, a rota pública retornou HTTP 200 com `index-v7U-Wb1K.js`, sem literal da rota SP e sem chunk SpInstitutionalPage: não é publicação desta entrega. Nenhuma consulta de mercado executada. GitHub status pending/sem checks de deploy; acesso à aba específica Lovable solicitado após revisão automática bloquear inspeção de janela não relacionada. Não contornar o bloqueio nem afirmar publicação por plausibilidade.

## Pós-merge para publicação — 16/10/2026

Merge autorizado `c5b1d6a`, sem conflitos, mantém `103e3df` e os quatro commits remotos até `07ca8bb`. LIVE e decisões conferidos por identidade de três pontos, sem linhas perdidas/extras. 108 testes SP e build pós-merge aprovados (3473 módulos), check-live-docs aprovado. Publicação ainda a conferir: antes do push o domínio servia `index-v7U-Wb1K.js`, sem rota/chunk SP; HTTP 200 na rota sozinho não prova atualização. Nenhuma alteração autoral nos motores de Gabriel.

## Vinte complementos e acesso por rota — 16/10/2026

108 testes em 10 arquivos, tipagem, lint do escopo e build local aprovados. Dezoito cenários Edge offline aprovados, zero chamadas reais/erros, 16 requests mockados no ensaio inteiro. Testes verificam reconciliação por padrão/mês/janela, seis quadros, bloqueio em ausência/divergência, preservação de negativos, ausência de porcentagem com total não positivo, navegação das 20 páginas e retirada em invalidação. Menu e busca global não oferecem SP; rota direta carrega, sem afrouxar autenticação.

Revisadas as 20 capturas em `.local-inputs/relatorios-lucas/sp/template-review-1792181464193/`: `slide-{27..40}-pattern-synthetic-2025.png` e `slide-{41..46}-table.png`. Todo 2025 e as distribuições por tipologia do diagnóstico são fictícios; os totais municipais/padrões 2026 reproduzem respostas fornecidas por Lucas. Isso não é validação de dados históricos reais ou homologação do relatório. Build anterior à integração remota; build pós-merge/publicação ainda pendentes.

## Doze detalhes por segmento — 16/10/2026

Build final pós-merge aprovado (3466 módulos); tipagem e lint finais sem erros. Constante de navegação movida para o domínio de segmentos para manter Fast Refresh. Checkpoint não libera exportação nem homologação.

103 testes SP/9 arquivos aprovados. Verificam soma dos segmentos por mês e janela, oferta somente no último mês, doze rotas de navegação do canvas, classificação, base negativa e retirada de detalhes em falha. Tipagem e ESLint do escopo aprovados. Dezesseis cenários Edge offline aprovados, 16 requests mockados no ensaio inteiro, zero chamadas de mercado e zero erros de página. As doze capturas `slide-{15..26}-segment-detail-synthetic-2025.png` foram revisadas em `.local-inputs/relatorios-lucas/sp/template-review-1792171153214/`; asserção de não sobreposição dos rótulos passou. Todo 2025 é fictício, não observação do provedor. Navegação não acrescenta chamadas; mesmos limites de paginação, abort e janela existentes. Dados reais e vigência histórica da classificação permanecem pendentes da revisão humana.

Merge `c4ac909`, autorizado por Lucas, preserva os 21 commits locais e os dois remotos de Gabriel (`15e5efc`, `e36c591`, Corretor). Conflito em FRONTEND_DECISIONS resolvido preservando integralmente as duas entradas; LIVE recebeu ambos os lados. `check:live-docs` pós-merge aprovado. Nenhuma alteração autoral no código do Corretor.

## Comparativos por segmento — 16/10/2026

100 testes SP, tipagem/lint/build aprovados. Quinze cenários Edge offline aprovados, 16 requests mockados no ensaio inteiro (nenhum adicional para segmentos), zero chamadas reais/erros. Capturas 9/10/11 revisadas em `.local-inputs/relatorios-lucas/sp/template-review-1792162365508/slide-{9,10,11}-segment-history-synthetic-2025.png`: barras, rótulos e rodapé sem sobreposição. Todos os valores 2025 são fictícios; não representam resultados de mercado. Primeira tentativa visual corrigiu um seletor do diagnóstico; ensaio final completo aprovado. Regra de Lucas aplicada aos dois anos, vigência histórica ainda requer revisão humana; retorno real não observado pelo agente.

## Lote de históricos — 16/10/2026

Tipagem SP, ESLint do escopo e build final aprovados; git diff --check sem erros.

99 testes SP/9arquivos aprovados: balanços de ambos os anos, igualdade de releitura, fluxos versus estoque final, bases zero/negativas, ausência/duplicação, fechamento/escopo alterado, limite de consulta, cancelamento/retry e bloqueio conjunto das três páginas. Quinze cenários Edge aprovados,16requests mockados para todo o ensaio (8do lote histórico), zero rede real/erros de página. Tipologia e todo2025 de QA são fictícios; município2026 reproduz dados fornecidos por Lucas.

Capturas revisadas de lançamentos/vendas/oferta e diálogo ampliado em `.local-inputs/relatorios-lucas/sp/template-review-1792161598576/` (`slide-{12,13,14}-synthetic-2025.png`, `batch-expanded-synthetic-2025.png`). Sem sobreposição dos rótulos e sem overflow nos temas claro/escuro em1440/390px. Um ensaio anterior foi reiniciado após recarregamento durante edição de teste; o resultado final acima foi executado com arquivos estáveis. Respostas reais históricas permanecem pendentes, sem token pessoal acessado.

## Retomada do comparativo curto — 16/10/2026

**Validação final:** `0c6e3c2` salva a entrega; `1ca206a` integra os remotos autorizados. Build e tipagem SP pós-merge aprovados; lint aprovado na retomada. Quinze cenários Edge refeitos, zero chamadas reais e zero erros de página; asserção de não sobreposição e captura final revisadas em `.local-inputs/relatorios-lucas/sp/template-review-1792160752992/`. Nenhum valor2025 deixa de ser fictício por passar nesses testes. Este resultado substitui a pendência de build final do registro abaixo.

83 testes SP aprovados com os arquivos recuperados da interrupção. Histórico atual nos testes reproduz julho/agosto recebidos; base2025 é fictícia (10.000/mês, somente QA), portanto +21,8% não é um resultado de mercado. Diagnóstico Edge anterior finalizou15cenários,11requests mockados para todas as ações da página, zero chamadas reais e zero erros; a ação histórica acrescenta uma amostra e duas janelas. Captura local de revisão: `.local-inputs/relatorios-lucas/sp/template-review-1792095410752/slide-12-synthetic-2025.png`. Alteração final separou os rótulos das duas séries; asserção de não sobreposição passou. Build final pós-integração ainda a registrar; não tratar build anterior ao ajuste como prova da versão final.

## Segmentos com regra fornecida por Lucas — 15/10

Sobre os padrões municipais recebidos e conferidos, sem nova chamada de API:

| Segmento | Lançamentos julho/agosto | Vendas julho/agosto | Oferta agosto |
|---|---:|---:|---:|
| Compactos | 1.735 | 3.561 | 20.926 |
| MCMV | 20.328 | 18.808 | 66.570 |
| Médio Padrão | 1.958 | 4.028 | 32.640 |
| Luxo | 330 | 427 | 4.570 |
| Total | 24.351 | 26.824 | 124.706 |

69 testes SP, tipagem/lint e 14 cenários Edge aprovados; capturas dos três gráficos revisadas. Testes de segmento usam os padrões reais registrados; os de tipologia continuam com distribuição sintética explicitamente separada. Zero chamadas de mercado pelo agente. Ainda falta Lucas observar estes três slides atualizados na própria sessão; não é aceite do estudo integral.

## Capturas pessoais de tipologia e preparação dos segmentos — 15/10

Lucas apresentou os três slides com dados reais julho/agosto na própria sessão: lançamentos por dormitórios 1/2/3/4 = 7.196/16.192/752/211 (24.351); vendas = 9.274/16.114/1.088/348 (26.824); oferta agosto = 38.999/72.736/9.559/3.412 (124.706). Somas conferidas por leitura das capturas; não é nova coleta pelo agente, validação de todo o provedor ou homologação do estudo completo. Os testes de distribuição continuam sintéticos.

Lucas informou não possuir ainda a regra sete padrões→quatro segmentos. Artes originais 24/38/48 preparadas com aviso de classificação pendente; sem valores inferidos. Consulta municipal existente preserva os padrões originais para inspeção, sem novos endpoints/requests. Busca nas regras SP e taxonomia do motor não demonstrou uma regra institucional reutilizável; nenhuma regra Secovi/FIERGS foi transplantada.

**Base inspecionada:** `bffb3c6`, merge autorizado por Lucas de `d360b35` com `416488d`, mantendo ambos. LIVE validado por multiconjunto de linhas não vazias: base + (local − base) + (remoto − base), zero linhas faltantes/extras. Sem mudança autoral em código de produto.

**Referência:** [PPTX SP 2T2026](https://docs.google.com/presentation/d/1WhyrfFEoFeA9dam9w_F8CYWm8y1VotMB/edit), nome/ID/parent confirmados via Drive; hash e tamanho no [catálogo único](../../../handoffs/lucas-relatorios-2026-10-14/fontes/modelos.json). Bruto em `.local-inputs/relatorios-lucas/sp/2026.06_PANORAMA_SAO_PAULO_VAP_13ago.pptx`, ignorado pelo Git. Download autenticado obtido pelo conector e materializado via PowerShell após bloqueio de rede no ambiente padrão; nenhum bearer URL/segredo versionado.

**Inspeção headless:** ZIP/XML, ordem de `ppt/presentation.xml` + relacionamentos (85 slides); caches nativos dos gráficos, categoria exata `2T26`:

| Slide / parte | Cache | Valor histórico observado |
|---|---|---:|
| 13 / `ppt/slides/slide13.xml` | `ppt/charts/chart1.xml` | 119 empreendimentos |
| 18 / `ppt/slides/slide18.xml` | `ppt/charts/chart6.xml` | 40.179 unidades lançadas |
| 32 / `ppt/slides/slide32.xml` | `ppt/charts/chart19.xml` | 42.275 unidades vendidas |
| 46 / `ppt/slides/slide46.xml` | `ppt/charts/chart32.xml` | 118.362 unidades de oferta final |

Valores de cache desta versão são gabarito histórico candidato, não validação visual ou da API. Há outras lâminas com títulos semelhantes/subconjuntos; não misturadas com os quatro gráficos selecionados. A natureza líquida das vendas precisa ser confrontada com o método da fonte. Totais calculados/deltas seguem vazios na matriz porque nenhuma consulta de dados foi feita.

**Rastreio de código** (caminhos em `src/features/panorama-secovi-fiergs/`):

- `api.ts`: `fetchPanoramaBuildings` prioriza `POST https://app.geobrain.com.br/public-api/v2/building-with-history-internal`, fallback público `https://api.geobrain.com.br/public-api/v2/building-with-history`; status Ativo/Esgotado, paginação. `temporalRows` usa `GET https://geobrain.com.br/public-api/temporal-analysis-city/{sales|stock}`, `city`, `uf`, `start_period`, `end_period`, `group_by` Padrão/Tipologia. Consulta atual pede Vertical/Horizontal; SP precisará limitar universo vertical explicitamente.
- `domain/cube.ts` / `buildCityCube`: chave UF/cidade/ID, `release_date`, `total_units` (fallback soma `qty` no mês de lançamento), histórico até o fechamento. Estoque prefere campo superior `stock`/`final_stock`, depois tipologias da última fotografia; data do campo superior requer prova. `soldUnits` pode cair em lançado − estoque, o que não comprova fluxo trimestral.
- `lib/launches.ts` / `buildLaunchModel`, `api.ts` / `launchRecordsFromCube`: agregam lançamentos por trimestre. Existem conversões `null → 0`; não presumir ausência resolvida no novo contrato.
- `domain/temporal-normalization.ts`: fluxo dá precedência a total trimestral, senão mantém meses para soma; snapshot carrega última observação até o fechamento, inclusive trimestre anterior. Por isso “3T” na saída não comprova observação de setembro: conferir `temporal_observed_period`.
- `report/model.ts`: `reconcileFiergsClosingSales/Stock` substituem fechamento **somente FIERGS** pelo granular. `domain/reconciliation.ts` retorna lista vazia para outras entidades. Novo SP precisa guardas próprias, sem desativar as existentes. `buildGranularBlocks` diferencia janela de lançamentos e universo histórico conforme entidade.

**Verificação:** 26 testes/4 arquivos aprovados em `vitest run` com os alvos `launches.test.ts`, `temporal-normalization.test.ts`, `fiergs-sales-reconciliation.test.ts` e `reconciliation-guards.test.ts`. Primeira tentativa bloqueada pelo sandbox (`Cannot read directory ../../..` antes de carregar configuração); repetição com permissão de ambiente passou. Warning preexistente de Browserslist desatualizado, sem instalar/atualizar pacotes. Não equivale à suíte completa 2T2026/4T2025 ou a teste com dados atuais de SP.

API de dados, dashboard, ensaio real, build/deploy e aceite humano não executados. G1 parcial, sem reconciliação numérica. Matriz/cache/hash/links e check:live-docs conferidos no fechamento; commit local identificável pelo histórico deste arquivo.

## Continuação autorizada — cobertura e balanço histórico

- **Acesso:** inventário do navegador retornou zero browsers/apps; abrir o site pelo navegador integrado retornou `Browser is not available: iab`. Nenhuma sessão/token do site foi acessada. Verificação sanitizada: `GEOBRAIN_TOKEN`, `GEOBRAIN_EMAIL` e `GEOBRAIN_PASSWORD` ausentes no processo e não declarados em `.env`. `.env.local` não existia na última checagem e é ignorado pelo Git (`git check-ignore .env.local`). Sem requisições à API de dados. Alternativa: Lucas configurar seu token pessoal como `GEOBRAIN_TOKEN` nesse arquivo local, sem enviá-lo pelo chat/Git; então executar diagnóstico delimitado, sem geração.
- **Balanço interno do PPTX:** caches dos gráficos 6 (lançamentos), 19 (vendas), 32 (estoque). No 2T26, **120.458 + 40.179 − 42.275 = 118.362**, delta zero. Relação entre fotografias consecutivas conferida em 16 trimestres: 10 fecham e seis têm delta `estoque final − (anterior + lançamentos − vendas)`: 3T22 −32, 4T22 −21, 1T23 −2, 3T23 +110, 1T24 +1, 2T25 −9. Causas não demonstradas; não corrigir números nem assumir arredondamento. Todos os quatro intervalos 3T25–2T26 fecham.
- **Limite da conclusão:** coerência interna do gabarito no 2T26 apoia a hipótese de fluxo, mas não comprova semântica dos campos da API, atualização da base ou cobertura do 3T26. Ainda não há reconciliação PPTX × API ou resultado 3T. G1 permanece parcial, G2 não iniciado, push continua não autorizado por Lucas.

## Primeira fatia G2 local — 15/10/2026

- **Autorização/base:** Lucas aprovou a primeira estrutura SP e o merge de oito commits Gabriel/Lovable. `e29460d` preserva `aa69e53` e `c81798f`; sem edição autoral em Corretor/Quanti/Secovi/FIERGS. LIVE do merge conferido pela identidade aditiva de linhas não vazias, preservando as entradas.
- **Runtime novo:** rota lazy `/rebrain/relatorios-institucionais/sp`, menu/busca, seletor geográfico compartilhado e prévia explícita com fixtures inteiramente sintéticas. Identidade própria; regra da raiz, quatro contagens, cobertura, duplicidade e balanços críticos. `origin: fixture` impede tratar a estrutura como transporte real. Sem exportador, chamada de mercado, IA ou publicação.
- **Consultas manuais trazidas por Lucas:** julho/agosto fecham entre unidades lançadas/vendas/estoque; setembro retorna estoque 56.806 contra 124.028 esperado, diferença −67.222. API dev orientou corte pela raiz. São resultados recebidos do usuário, sem execução autenticada pelo agente; não equivalem a causa demonstrada de toda a divergência. Brutos não versionados; teste usa números fictícios independentes.
- **Testes:** `vitest run src/features/relatorios-institucionais/sp src/features/panorama-secovi-fiergs src/features/shared/geo-api-scope-engine src/components/layout/AppLayout.test.tsx`: **351/351, 43 arquivos**, incluindo regressões 2T2026/4T2025, 16 testes do contrato SP e seis da página. Warnings preexistentes de Recharts/jsdom, Router e Browserslist. Sem alteração de expectativas dos consumidores antigos.
- **Tipos/lint/build:** `tsc --noEmit -p tsconfig.sp-institutional.json` aprovado; configuração isolada versionada inclui módulo SP, dependências transitivas e setup de testes. ESLint nos TS/TSX tocados e `npm.cmd run build` aprovados. **Typecheck global app falha em três arquivos paralelos do Corretor:** `PdfSlide.tsx` (`isEvalSupported`), `materials.ts` (`onSuccess`), `CorretorV3Page.tsx` (`setWorkspaceTab`); não editados. Build do tsconfig raiz não substitui essa checagem. Dependências alinhadas por `npm.cmd ci --ignore-scripts`, sem alteração de lockfile.
- **UI real local:** `node scripts/diagnostics/sp-institutional-preview.mjs --channel=msedge`: oito verificações aprovadas, zero erros de página, zero chamadas de mercado; login e catálogo simulados, demais acessos externos bloqueados. Desktop 1440/mobile 390, claro/escuro (celular com menu recolhido), troca de escopo e falha de catálogo; capturas revisadas visualmente. Primeiro Chromium indisponível; usado Edge instalado. Ajustados apenas os seletores/espera da animação no teste. Capturas/JSON em `.local-inputs/relatorios-lucas/sp/`, sem envio dos brutos.
- **Estados:** sem login/escopo, catálogo carregando/falha, outra cidade, prévia preparando/erro com retry, vazio, trimestre aberto, prévia reconciliada e invalidação por troca de identidade/recorte. Padrão de página de dados e primitives existentes, sem novo token/componente compartilhado. Navegador pessoal/produção não verificados.
- **Retomada:** previsão humana de setembro 22–25/10, após início das férias 19/10; sem agendamento. Próxima fatia exige contrato/transporte real e confirmação do `period` oficial, depois páginas/gráficos/exportação/aceite separados. Push continua não autorizado.

## Conferência curta julho/agosto — 15/10/2026

- **Base:** `387ce41`, merge autorizado de `48949a7` com `8c64a5d`, árvore limpa na abertura; fetch origin confirmado, 0 atrás/7 à frente. Novas mudanças restritas ao módulo SP/diagnóstico/documentação; sem edição de Corretor ou Secovi/FIERGS.
- **Proveniência:** contagens das três respostas completas executadas e fornecidas por Lucas, mais raiz agosto da amostra. Fixture mínima `src/features/relatorios-institucionais/sp/__tests__/fixtures/sp-municipal-2026.json`, sem tokens, nomes/IDs ou VGV não utilizado. Dados de setembro preservados no teste para provar exclusão, nunca importados pelo código de produto. Não há nova chamada autenticada pelo agente.
- **Balanços reproduzidos:** julho `127.179 + 13.413 − 11.773 = 128.819`; agosto `128.819 + 10.938 − 15.051 = 124.706`. Parcial: 24.351 lançadas e 26.824 vendas. Empreendimentos não calculados. Se setembro for admitido artificialmente, o teste detecta delta −67.222 e bloqueia consolidação; não ajusta números para fechar.
- **Transporte/UI:** `api.ts` faz uma amostra `per_page=1` e até duas páginas de 100 por série municipal, sem seguir URLs retornadas que possam perder filtros. Normalmente quatro requisições neste caso. Retry transitório de duas tentativas, AbortController, progresso/tempo decorrido reais com BrainLoadingState e cancelamento. Mês final limitado à raiz e trimestre. A UI separa consulta real de fixture, mostra parcial/escopo/cobertura, tabela mensal e empreendimento indisponível. Sem histórico longo, cache persistente ou exportação.
- **Verificação automatizada:** 41 testes SP (16 domínio inicial, oito replay temporal, nove transporte, oito página); suíte SP + Secovi/FIERGS + GeoApiScopeEngine **369/369 em 44 arquivos**. Cobrem paginação preservando escopo, teto curto, troca de total, erros de autenticação sem retry, falhas transitórias, cancelamento, grupos/meses faltantes, vendas negativas e setembro excluído. `tsc -p tsconfig.sp-institutional.json`, ESLint e build aprovados. Tipagem app global ainda falha nos três arquivos paralelos do Corretor já identificados; sem correções nessa frente.
- **UI local:** diagnóstico Edge com rede real bloqueada, replay de quatro requisições interceptadas; dez cenários aprovados, sem erros de página. Desktop/mobile, claro/escuro, teclado, troca real/exemplo, escopo e falha de catálogo. Capturas `sp-partial-*` e `ui-results.json` na pasta local ignorada. Isso verifica a apresentação/integração com respostas recebidas, não acesso pessoal ao provedor.
- **Falta observar:** novo botão com sessão pessoal e retorno atual da API, uniformidade de fechamento na cidade e coleta/reconciliação granular. Não houve publicação ou novo aceite. Pausa desde 19/10 mantida; 22–25/10 é previsão humana de setembro, não liberação automática.
