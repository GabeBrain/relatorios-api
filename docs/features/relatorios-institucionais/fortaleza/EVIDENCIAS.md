# Fortaleza — evidências da abertura

## 10/11/2026 — mensal46–55

[Entrega e contratos](MENSAL_SLIDES_46_55_2026-11-10.md): prévia1–55dos60originais, IVV da RM e tabelas de oferta por município/tipo/bairro; fontes existentes reutilizadas.198testes Fortaleza +16regressões, build/tipos/lint e Edge sintético. Universo/capacidade, bairro, preços/IVV candidatos, sem API real/homologação.84568dfpublicado com autorização; nova fatia local. Próximo56–60, depois revisão/exportação/homologação. Registros abaixo são históricos.


## 10/11/2026 — mensal36–45

[Entrega e contratos](MENSAL_SLIDES_36_45_2026-11-10.md): prévia1–45dos60originais, preços históricos v2 e IVV com abertura observada.170testes Fortaleza +16regressões, build/tipos/lint e Edge sintético1440/390claro/escuro. Ponderação/área de lotes e IVV candidatos, homologação pendente; nenhuma API real.9fa553epublicado com autorização; novo lote local até envio autorizado. Próximo46–55, depois56–60/exportação. Registros anteriores são históricos.


## 10/11/2026 — slides26–35

[Evidências e regras do lote](MENSAL_SLIDES_26_35_2026-11-10.md). Base3a846f0main/origin0–0, árvore limpa antes da edição.148testes Fortaleza/13arquivos +16regressões selecionadas Secovi/FIERGS aprovados; tipos/build/lint e Edge1440/390claro/escuro com provedores interceptados,25composições11–35, carregamento local e estados lento/vazio/incompleto/cancelado. Originais Office em leitura e dez renders novos inspecionados. Estoque não acumulado, VGV vendido assinado e comparativos anuais conferidos. Fonte real/INCC/homologação/exportação pendentes; novo lote local, sem push/Monday.

## 10/11/2026 — carregamento restrito ao relatório

Após push autorizado de d9b2448, usuário pediu remover o carregamento de tela inteira. Base main/origin0–0, árvore inicialmente limpa. Página usa cartão relativo depois da configuração, BrainLoadingState overlay absoluto com rolagem local e etapas/tempo/cancelamento preservados; catálogo, preparação e consulta seguem o mesmo contêiner. Reutiliza padrão do SP, sem alterar componente compartilhado, fontes ou cálculos.

Build/tipos e lint da página aprovados. Diagnóstico `fortaleza-monthly-visual.mjs` ampliado com resposta lenta: em1440/390claro/escuro comprova CSSabsolute, limites dentro do cartão e menu acessível por hit-test. Inspeção visual do screenshot desktop confirma navegação fora do véu. Sucesso, vazio/incompleto e cancelamento também passaram com fontes sintéticas; nenhuma API real ou deploy observado. Capturas locais ignoradas no diretório monthly-visual. Commit local isolado; novo push sujeito a autorização própria.

## 10/11/2026 —12/14 e lote16–25

Push autorizado1e1767econcluído; nova entrega documentada em [mensal12–25](MENSAL_SLIDES_12_25_2026-11-10.md), base main/origin1e1767e.127testes Fortaleza/12arquivos +16regressões selecionadas Secovi/FIERGS aprovados; build/tipos/lint e Edge1440/390claro/escuro, quinze lâminas11–25, estados lento/vazio/incompleto/cancelado. Originais Office em leitura e renders novos inspecionados; sobreposições monetárias/divisória21 corrigidas e rechecadas. Sem fonte GeoBrain real, exportação, homologação ou Monday. Índice outubro/2026 conferido na página pública; modalidade/base Fortaleza ainda provisórias. Nova fatia local, sem push até autorização própria.

## 10/11/2026 — continuação mensal

[Implementação, fontes e validações desta fatia](MENSAL_LANCAMENTOS_2026-11-10.md). Base03d3301, main/origin0–0 após fetch, Windows/Codex Test. PPTX mensal recuperado pelo Drive e SHA256 conferido; Office somente leitura. Novos11/13/15, coleta mensal limitada e seleção mensal padrão.105testes distintos aprovados após correção/rechecagem de uma asserção de mensagem duplicada; tipos/build/lint e Edge1440/390claro/escuro com fontes interceptadas. Sem API real, exportação nova, homologação ou Monday. Commit local; publicação separada.

## 09/11/2026 — envio da base e slides iniciais

`git push origin main` autorizado por Lucas enviou `c78a7c1`/`574087e`/`5439ffe`; fetch confirmou 0/0. Não houve observação do deploy. Na sequência, composição dos dez slides iniciais em ambos os modelos, detalhada em [SLIDES_01_10](SLIDES_01_10_2026-11-09.md). PowerPoint leu os originais sem salvar; vinte fundos nativos e posições medidas, conteúdos variáveis removidos dos fundos.

63 testes Fortaleza, tipos completos e lint dirigido aprovados; build concluído. Edge local/rede externa bloqueada cobre sete grupos de cenários municipais, navegação dos dez slides mensal/trimestral e uma/cinco cidades, 1440/390 e claro/escuro. Comparação contra vinte renders PowerPoint: nenhum corte nos controles, slide 8 idêntico, diferenças remanescentes em textos/gráficos dinâmicos de 0,45–6,48% dos pixels com delta de canal >20. Não significa 100% nem aceite visual. Capturas/controles com cifras antigas ficam apenas em `.local-inputs/relatorios-lucas/fortaleza/`, ignorado.

Nenhuma chamada real GeoBrain, coleta longa, geração/exportação real ou escrita Monday. Novo lote ainda local; roteiro de retomada e fontes pendentes no contrato. SP/FIERGS e domínios paralelos sem edições.

## 09/11/2026 — núcleo municipal e sequência automática

- **Pedido/escopo:** Lucas autorizou iniciar dados, reforçou SP/FIERGS como referências e pediu seleção Mensal/Trimestral com referência própria e progresso automático. Implementado localmente em `api.ts`, `market.ts`, `useFortalezaMarket.ts`, painéis de etapas/dados e página existente; [contrato completo](NUCLEO_VERTICAL_2026-11-09.md).
- **Git:** base `574087e`, main limpa na abertura; fetch atualizado 0/2 antes desta entrega, dois commits anteriores desde 09/11 14h41 preservados. Retomada após fechamento acidental confirmou edições/testes salvos e novo fetch 0/2; nenhum merge/reset/push.
- **Fonte:** integração de consulta sob ação explícita, sem coleta de mercado no carregamento; usa contrato municipal já presente em SP e auxiliares de retry/coleção do Panorama. Nenhuma leitura de token pessoal, API real ou estudo real nesta rodada. Sanitização/proveniência sem credenciais.
- **Validação:** 49 testes Fortaleza aprovados, incluindo paginação, recorte, grupos, fluxos/estoque, negativos, missing/zero, cancelamento, reuso só do mesmo recorte, invalidação por sessão e conclusão honesta das etapas. Regressão ampla anterior ao último refinamento:807aprovados/1falha existente firewall-fontes/Panorama/2ignorados; 2 testes adicionais do hook validados no foco de49. Falha alheia registrada, sem editar código/fixtures de SP/Panorama.
- **Visual:** diagnóstico `scripts/diagnostics/fortaleza-market-visual.mjs` usa somente localhost e respostas sintéticas; lento, sucesso, vazio, ausência, erro, diferenças compensadas, cancelamento e recuperação de Aquiraz sem recolher quatro cidades. Validação mensal/trimestral/ano e etapas sem novo clique. Capturas locais1440/390 claro/escuro com rolagem local das tabelas. Diagnóstico da base mantém ausência em menu/painel. Servidor local encerrado com janela foi reiniciado; não foi falha do app/API.
- **Entrega:** build/tipos/lint e documentação viva no fechamento, commit isolado `feat(relatorios): integrate Fortaleza vertical preview pipeline`; hash final reportado. Rota sem entrada no painel/menu preservada. Sem exportação, deploy, Monday, homologação ou relatório completo presumidos. Próximo: validação autenticada e reconciliação com a origem/granular.

## 09/11/2026 — revisão dos originais e base somente por rota

- **Autorização:** Lucas pediu conferir referências/preparar base, podendo usar FIERGS/SP, com acesso somente por rota e sem painel. Push recusado nesta sessão; nenhuma publicação realizada.
- **Git inicial:** main `c78a7c1`, origin `ecbc34f`, fetch atualizado 0/1 e árvore limpa. Os três commits locais antigos haviam sido retirados da main por pedido de Lucas; Fortaleza preservada. Esta rodada acrescenta commit isolado identificado por `feat(relatorios): prepare Fortaleza route-only foundation`.
- **Material:** dois PPTX brutos obtidos pelo Drive; SHA/tamanho/dimensões/contagem real e inspeção amostral em [revisão dos originais](REVISAO_REFERENCIAS_2026-11-09.md). Todos os XMLs de slides inventariados; 12 renders Office locais, seis inspecionados visualmente. Não afirmar QA integral de 149 páginas nem aprovação de números/metodologia.
- **Runtime novo:** configuração geográfica e mensal/trimestral, composição local auditável de 60/89 posições e referências/metodologia. Fontes/editoriais pendentes; sem cálculo, coleta de mercado ou exportação. Rotas/AppLayout alterados somente para registro lazy e comportamento mobile desta rota. Home, menu e catálogo de ferramentas sem item Fortaleza.
- **Padrão reutilizado:** página/seleção e estrutura de SP, contrato de manifesto/proveniência Panorama, GeoApiScopeEngine, BrainLoadingState overlay/tempo real/cancelamento, Select/Tabs/Alert/Button e tokens existentes. Sem novo primitive/token ou desvio de lazy; desenho final dos slides Fortaleza ainda não implementado.
- **Dependências:** typecheck inicialmente encontrou `tus-js-client` ausente, já declarado no projeto. Dependências alinhadas via `npm.cmd ci --ignore-scripts --no-audit --no-fund`. `package.json` e `package-lock.json` permaneceram idênticos ao remoto; nenhum arquivo Corretor/SP/Panorama alterado.
- **Testes offline:** 11 testes novos Fortaleza aprovados (escopo autorizado, conjunto completo, janelas mensais/trimestrais, bissexto, cancelamento, proveniência e nenhuma métrica fictícia). Regressão conjunta: 296 SP, 463 Panorama e 1 GeoApiScopeEngine aprovados; 2 Panorama ignorados e **1 falha** em `firewall-fontes.test.tsx` / “nenhuma lâmina do deck publica o rótulo de loteamento”. Total 771 aprovados/1 falha/2 ignorados em 94 arquivos. Falha repetida isoladamente no teste existente; código/fixtures Panorama idênticos ao remoto. Não alterar política alheia para limpar a suite. Rodada focada adicional incluindo AppLayout: 24 aprovados/mesma falha Panorama.
- **Tipos/lint/build:** `npm.cmd run build` (inclui `tsc --noEmit -p tsconfig.app.json`) aprovado; lint dos arquivos novos/alterados aprovado. Nova checagem final de tipos/lint após ajuste mobile também aprovada. Build não é deploy nem ensaio autenticado.
- **Navegador:** `node scripts/diagnostics/fortaleza-base-visual.mjs` aprovado no Edge headless com somente localhost/catalogo sintético, toda rede externa interceptada. Sete grupos de cenário: sem login; catálogo deliberadamente lento com identidade Brain; estrutura trimestral/mensal e invalidação ao trocar; referências e ausência de link Home/menu; erro403/retry; catálogo vazio sem fallback; conjunto incompleto bloqueado. Capturas 1440/390 claro/escuro revisadas, sem overflow de página/conteúdo; mobile compacto conforme padrão já existente. Zero chamadas de mercado no ensaio. Capturas e JSON brutos ignorados em `.local-inputs/relatorios-lucas/fortaleza/ui/`.
- **Limites:** tokens/acesso pessoal a API/Rebrain/Lovable/Mapbox não aferidos. Não houve coleta GeoBrain, geração real, exportação, push, deploy, homologação ou escrita Monday. Só os originais de referência foram renderizados no Office, sem modificar os PPTX.
- **Retomada:** abrir `/rebrain/relatorios-institucionais/fortaleza` no Vite local; seguir PLAN e comprovar o contrato mensal antes de implementar os indicadores. Hash final da entrega e contadores reportados no fechamento.

## 09/11/2026 — G1 documental, Lucas / Codex

- Git: origin `https://github.com/GabeBrain/relatorios-api.git`, sem upstream. Main limpa, fetch executado; `origin/main...main = 0/3`, base `ad5f7e2`. Preservados commits locais `6af631a` (14/10), `49c3715` (04/11) e `ad5f7e2` (09/11). Sem pull necessário, reset/rebase/merge ou push.
- Identidade Git: lucas / lucas@example.com; usuário se identifica como Lucas. Não inferir conta/permissão externa pelo Git config.
- Preflight padrão executado: Node v24.19.0, node_modules/package-lock presentes, somente existência de env, sem valores. Git via subprocessos Node não verificado no sandbox; comandos diretos confirmaram origem/branch/status/contadores. Não confundir `expectedOrigin=false` do diagnóstico indisponível com origem incorreta.
- Leitura: AGENTS, índice e referências do handoff, área permanente, plano/matriz e código de SP. Usuário informou SP concluído; pendências históricas em documentos não foram usadas para desfazer sua declaração nem afirmar homologação nova.
- Drive: fetch legível dos IDs abaixo retornou conteúdo não vazio, MIME PowerPoint e parent `139aKOxC4clvhHe0uXsRJ8lhdIK5cdaYA`. Isso comprova leitura pelo conector desta sessão, não login pessoal no navegador, write ou publicação.
- Junho: `1R9U4ZrrfYLoDHo47C3J0FO5fT6SNxtX0`, modified_time `2026-07-28T14:38:59.000Z`; julho: `10-lrnOUhSIN0Yju2fqA88F3uLmp4TT8a`, modified_time `2026-08-26T14:23:06.000Z`. URLs/nomes no catálogo original. Datas são metadados retornados, não competência da API.
- Resultado: 89 e 60 blocos de texto delimitados por form feed, respectivamente, inventariados como **blocos de extração**, sem chamar isso de total real de slides. Não foi obtido PPTX bruto nesta rodada, portanto hash binário/caches/números em imagem e revisão visual permanecem pendentes.
- Matriz inicial separa município/segmento/período/fonte candidata e estado. Cálculos/deltas não executados permanecem vazios. Totais de referência, quando presentes, são transcrição textual histórica e não fixtures de runtime.
- Nenhuma coleta GeoBrain, login Rebrain/Lovable, exportação real ou escrita Monday; runtime SP/Panorama e demais domínios intactos.
- Validação proporcional: integridade de 23 colunas da matriz, catálogo e links locais, diff/check-live-docs no fechamento. Sem suite de produto/build porque só documentação mudou. Leitura textual é diagnóstico headless; próxima revisão usa PPTX original/caches e renderização para comprovar estrutura e gráficos, não mocks como prova de API/aceite.
- Commit desta rodada: `docs(relatorios): map Fortaleza sources and initial contracts`; hash e contadores reportados no fechamento, sem push automático.
